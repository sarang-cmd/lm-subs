/**
 * MAIN-world passive `batchexecute` observer (`src/page/inject.js` -> `extension/page.js`).
 *
 * Runs at `document_start` in NotebookLM's `MAIN` world so it can passively observe
 * `/_/LabsTailwindUi/data/batchexecute` responses over both `XMLHttpRequest` (used by
 * Angular/Closure RPC clients) and `window.fetch` without modifying or delaying traffic.
 *
 * Security invariants:
 * - Has zero access to `chrome.storage` or user API keys.
 * - Never mutates outgoing requests or incoming responses.
 * - Emits structured metadata to the isolated content script restricted to `location.origin`.
 */

import { PAGE_MESSAGE } from "../config/selectors.js";
import {
  isBatchExecuteUrl,
  parseBatchExecuteRequest,
  parseBatchExecuteResponse,
} from "../lib/batchexecute.js";

const GUARD_FLAG = "__notebooklmSubtitlesMainHooked__";

export function installMainWorldObserver(win = globalThis) {
  if (!win || win[GUARD_FLAG]) return;
  win[GUARD_FLAG] = true;

  let rpcOverrides = {};

  win.addEventListener("message", (event) => {
    if (event.source !== win) return;
    const msg = event.data;
    if (
      msg &&
      msg.source === PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT &&
      msg.type === PAGE_MESSAGE.SYNC_RPC_OVERRIDES &&
      msg.rpcOverrides &&
      typeof msg.rpcOverrides === "object"
    ) {
      rpcOverrides = { ...msg.rpcOverrides };
    }
  });

  function emitPayload(payload) {
    try {
      const targetOrigin =
        win.location && win.location.origin && win.location.origin !== "null"
          ? win.location.origin
          : "*";
      win.postMessage(
        {
          source: PAGE_MESSAGE.BRIDGE_SOURCE_PAGE,
          type: PAGE_MESSAGE.BATCH_ARTIFACTS,
          payload,
        },
        targetOrigin
      );
    } catch {
      // Never disrupt host page
    }
  }

  function inspectTransaction(requestBody, responseText) {
    try {
      const reqMeta = parseBatchExecuteRequest(requestBody, rpcOverrides);
      const artifacts = responseText
        ? parseBatchExecuteResponse(responseText, rpcOverrides).map((art) => ({
            ...art,
            notebookId: reqMeta?.notebookId || null,
          }))
        : [];

      const isCreateVideoRequest = Boolean(reqMeta?.isVideoCreate);
      if (isCreateVideoRequest || artifacts.length > 0) {
        emitPayload({
          isCreateVideoRequest,
          notebookId: reqMeta?.notebookId || null,
          artifacts,
          observedAt: Date.now(),
        });
      }
    } catch {
      // Ignore malformed / unrelated payloads
    }
  }

  // 1. Passive `window.fetch` observer
  if (typeof win.fetch === "function") {
    const nativeFetch = win.fetch;
    win.fetch = function patchedFetch(input, init) {
      let url = "";
      let reqBody = "";
      try {
        url = typeof input === "string" ? input : input?.url || "";
        if (isBatchExecuteUrl(url) && init?.body) {
          reqBody = init.body;
        }
      } catch {
        url = "";
      }

      const promise = Reflect.apply(nativeFetch, this, arguments);
      if (isBatchExecuteUrl(url)) {
        promise
          .then((res) => {
            if (!res || typeof res.clone !== "function") return;
            return res
              .clone()
              .text()
              .then((text) => inspectTransaction(reqBody, text));
          })
          .catch(() => {});
      }
      return promise;
    };
  }

  // 2. Passive `XMLHttpRequest` observer (Angular / Closure `XhrIo` default transport)
  const XHR = win.XMLHttpRequest;
  if (XHR && XHR.prototype) {
    const nativeOpen = XHR.prototype.open;
    const nativeSend = XHR.prototype.send;
    const metaMap = new WeakMap();

    XHR.prototype.open = function patchedOpen(_method, url) {
      try {
        const urlStr = typeof url === "string" ? url : String(url || "");
        if (isBatchExecuteUrl(urlStr)) {
          metaMap.set(this, { url: urlStr, body: "" });
        }
      } catch {
        // Ignore
      }
      return Reflect.apply(nativeOpen, this, arguments);
    };

    XHR.prototype.send = function patchedSend(body) {
      const meta = metaMap.get(this);
      if (meta) {
        meta.body = body || "";
        this.addEventListener(
          "load",
          () => {
            try {
              if (
                (!this.responseType || this.responseType === "text") &&
                typeof this.responseText === "string"
              ) {
                inspectTransaction(meta.body, this.responseText);
              }
            } catch {
              // Ignore
            }
          },
          { once: true }
        );
      }
      return Reflect.apply(nativeSend, this, arguments);
    };
  }
}

if (typeof window !== "undefined") {
  installMainWorldObserver(window);
}

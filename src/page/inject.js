/**
 * MAIN-world passive `batchexecute` observer & first-party audio extractor
 * (`src/page/inject.js` -> `extension/page.js`).
 *
 * Runs at `document_start` in NotebookLM's `MAIN` world so it can:
 * 1. Passively observe `/_/LabsTailwindUi/data/batchexecute` responses over both
 *    `XMLHttpRequest` and `window.fetch` without modifying or delaying traffic.
 * 2. Perform first-party media fetch (carrying NotebookLM's exact `Origin`, `Referer`,
 *    and partitioned Google session cookies, plus `blob:` URL support) and strip the
 *    compact `.m4a` / `.wav` audio track locally before transferring only the slim
 *    audio bytes to the isolated content script.
 *
 * Security invariants:
 * - Has zero access to `chrome.storage` or user API keys.
 * - Enforces `isTrustedGoogleMediaUrl()` before any HTTPS media fetch.
 * - Restricts `postMessage` communication to `window.location.origin`.
 */

import { PAGE_MESSAGE } from "../config/selectors.js";
import {
  extractAudioTrackFromMp4,
  slicePcmIntoWavChunks,
  validateMediaPayload,
} from "../lib/audio-extract.js";
import {
  deriveGoogleMediaVariants,
  isBatchExecuteUrl,
  isTrustedGoogleMediaUrl,
  parseBatchExecuteRequest,
  parseBatchExecuteResponse,
} from "../lib/batchexecute.js";

const GUARD_FLAG = "__notebooklmSubtitlesMainHooked__";
const MAX_INLINE_M4A_BYTES = 20 * 1024 * 1024;
const MAX_WAV_CHUNK_BYTES = 14 * 1024 * 1024;

export function installMainWorldObserver(win = globalThis) {
  if (!win || win[GUARD_FLAG]) return;
  win[GUARD_FLAG] = true;

  let rpcOverrides = {};
  const nativeFetch =
    typeof win.fetch === "function" ? win.fetch.bind(win) : null;

  // Bounded ring buffer (max 4) of large media Blobs passed to `URL.createObjectURL`
  const trackedMediaBlobs = new Map();
  if (win.URL && typeof win.URL.createObjectURL === "function") {
    const origCreateObjectURL = win.URL.createObjectURL.bind(win.URL);
    win.URL.createObjectURL = function patchedCreateObjectURL(obj) {
      const url = origCreateObjectURL(obj);
      try {
        if (
          typeof Blob !== "undefined" &&
          obj instanceof Blob &&
          (obj.size > 65536 ||
            /^(?:video|audio)\//i.test(obj.type || ""))
        ) {
          if (trackedMediaBlobs.size >= 4) {
            const oldestKey = trackedMediaBlobs.keys().next().value;
            trackedMediaBlobs.delete(oldestKey);
          }
          trackedMediaBlobs.set(url, obj);
        }
      } catch {
        // Ignore MediaSource or non-Blob objects
      }
      return url;
    };
  }

  function getTargetOrigin() {
    return win.location &&
      win.location.origin &&
      win.location.origin !== "null"
      ? win.location.origin
      : "*";
  }

  function postToContent(type, payload, transfer = []) {
    try {
      win.postMessage(
        {
          source: PAGE_MESSAGE.BRIDGE_SOURCE_PAGE,
          type,
          payload,
        },
        getTargetOrigin(),
        transfer
      );
    } catch {
      // Never disrupt host page
    }
  }

  /**
   * Scans browser Resource Timing entries for recently loaded Google media streams
   * (useful when the extension was installed/reloaded after `gArtLc` ran).
   */
  function discoverPerformanceMediaUrls() {
    const found = [];
    try {
      const entries = win.performance?.getEntriesByType?.("resource") || [];
      for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i];
        const url = e?.name || "";
        if (!isTrustedGoogleMediaUrl(url)) continue;
        const looksLikeMedia =
          e.initiatorType === "video" ||
          e.initiatorType === "media" ||
          /\/notebooklm\/|videoplayback|=m(?:18|22|140)/i.test(url);
        if (looksLikeMedia && !found.includes(url)) {
          found.push(url);
        }
      }
    } catch {
      // Ignore
    }
    return found;
  }

  async function decodeBytesToWavChunks(mediaBytes) {
    const AudioCtx = win.AudioContext || win.webkitAudioContext;
    const OfflineCtx = win.OfflineAudioContext || win.webkitOfflineAudioContext;
    if (!AudioCtx || !OfflineCtx) {
      throw new Error("WebAudio decoder unavailable in this browser context.");
    }

    const ctx = new AudioCtx();
    let decoded;
    try {
      const copy = mediaBytes.buffer.slice(
        mediaBytes.byteOffset,
        mediaBytes.byteOffset + mediaBytes.byteLength
      );
      decoded = await ctx.decodeAudioData(copy);
    } finally {
      try {
        await ctx.close();
      } catch {
        // Ignore
      }
    }

    // Use 16 kHz mono for <= 10 min, 12 kHz mono for > 10 min to keep chunks compact
    const sampleRate = decoded.duration > 600 ? 12000 : 16000;
    const totalSamples = Math.max(1, Math.ceil(decoded.duration * sampleRate));
    const offline = new OfflineCtx(1, totalSamples, sampleRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    const pcm = rendered.getChannelData(0);

    return slicePcmIntoWavChunks(pcm, sampleRate, MAX_WAV_CHUNK_BYTES);
  }

  async function fetchSingleCandidateInPage(url) {
    if (typeof url !== "string" || !url) {
      throw new Error("Empty media URL");
    }

    if (url.startsWith("blob:")) {
      const tracked = trackedMediaBlobs.get(url);
      if (tracked) {
        const buf = new Uint8Array(await tracked.arrayBuffer());
        return {
          bytes: validateMediaPayload(buf, tracked.type || "video/mp4"),
          contentType: tracked.type || "video/mp4",
        };
      }
      if (!nativeFetch) throw new Error("fetch unavailable");
      const blobRes = await nativeFetch(url);
      if (!blobRes.ok) throw new Error(`blob HTTP ${blobRes.status}`);
      const ct = blobRes.headers?.get?.("content-type") || "video/mp4";
      const buf = new Uint8Array(await blobRes.arrayBuffer());
      return {
        bytes: validateMediaPayload(buf, ct),
        contentType: ct,
      };
    }

    if (!isTrustedGoogleMediaUrl(url)) {
      throw new Error("Untrusted media URL");
    }
    if (!nativeFetch) {
      throw new Error("fetch unavailable");
    }

    // Try with first-party Google cookies first; retry with `credentials: "omit"`
    // if the CDN responds with wildcard `Access-Control-Allow-Origin: *`.
    let lastErr = null;
    for (const credentialsMode of ["include", "omit"]) {
      try {
        const res = await nativeFetch(url, {
          method: "GET",
          credentials: credentialsMode,
        });
        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status}`);
          continue;
        }
        const ct = res.headers?.get?.("content-type") || "";
        const buf = new Uint8Array(await res.arrayBuffer());
        return {
          bytes: validateMediaPayload(buf, ct),
          contentType: ct,
        };
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr || new Error("In-page media fetch failed");
  }

  async function handleExtractAudioRequest({
    requestId,
    candidateUrls = [],
    videoCurrentSrc = "",
  } = {}) {
    const discoveredMediaUrls = discoverPerformanceMediaUrls();
    const expanded = [];
    const pushUrl = (u) => {
      if (typeof u === "string" && u && !expanded.includes(u)) {
        expanded.push(u);
      }
    };

    if (videoCurrentSrc && videoCurrentSrc.startsWith("blob:")) {
      pushUrl(videoCurrentSrc);
    }
    for (const u of candidateUrls) {
      for (const v of deriveGoogleMediaVariants(u)) pushUrl(v);
      pushUrl(u);
    }
    if (videoCurrentSrc && isTrustedGoogleMediaUrl(videoCurrentSrc)) {
      for (const v of deriveGoogleMediaVariants(videoCurrentSrc)) pushUrl(v);
      pushUrl(videoCurrentSrc);
    }
    for (const u of discoveredMediaUrls) {
      for (const v of deriveGoogleMediaVariants(u)) pushUrl(v);
      pushUrl(u);
    }

    let downloaded = null;
    let lastError = "No downloadable media stream matched in page.";

    for (const url of expanded) {
      try {
        downloaded = await fetchSingleCandidateInPage(url);
        break;
      } catch (err) {
        let host = "media";
        try {
          host = new URL(url).hostname || "media";
        } catch {
          host = url.startsWith("blob:") ? "blob" : "media";
        }
        lastError = `${host}: ${err?.message || String(err)}`;
      }
    }

    if (!downloaded) {
      postToContent(PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE, {
        requestId,
        ok: false,
        error: lastError,
        discoveredMediaUrls,
      });
      return;
    }

    const originalBytes = downloaded.bytes.byteLength;

    try {
      // Fast path: lossless ISO-BMFF `.mp4` -> `.m4a` audio-track remuxing (~12 ms)
      const extracted = extractAudioTrackFromMp4(downloaded.bytes);
      if (
        extracted &&
        extracted.bytes &&
        extracted.extractedBytes <= MAX_INLINE_M4A_BYTES
      ) {
        const cleanCopy = extracted.bytes.slice();
        postToContent(
          PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE,
          {
            requestId,
            ok: true,
            originalBytes,
            extractedBytes: cleanCopy.byteLength,
            chunks: [
              {
                buffer: cleanCopy.buffer,
                mimeType: "audio/mp4",
                fileName: "overview-audio.m4a",
                startOffsetSec: 0,
                durationSec: null,
              },
            ],
          },
          [cleanCopy.buffer]
        );
        return;
      }

      // Universal fallback: WebAudio decode -> 16 kHz / 12 kHz mono `.wav` chunks
      // Handles fragmented MP4 (`fmp4`), WebM/Opus, and >20 MB long recordings!
      const wavChunks = await decodeBytesToWavChunks(downloaded.bytes);
      const transferList = [];
      let totalExtracted = 0;
      const serializedChunks = wavChunks.map((ch) => {
        const cleanCopy = ch.bytes.slice();
        totalExtracted += cleanCopy.byteLength;
        transferList.push(cleanCopy.buffer);
        return {
          buffer: cleanCopy.buffer,
          mimeType: ch.mimeType,
          fileName: ch.fileName,
          startOffsetSec: ch.startOffsetSec,
          durationSec: ch.durationSec,
        };
      });

      postToContent(
        PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE,
        {
          requestId,
          ok: true,
          originalBytes,
          extractedBytes: totalExtracted,
          chunks: serializedChunks,
        },
        transferList
      );
    } catch (err) {
      postToContent(PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE, {
        requestId,
        ok: false,
        error: `Audio decode error: ${err?.message || String(err)}`,
        discoveredMediaUrls,
      });
    }
  }

  win.addEventListener("message", (event) => {
    if (event.source !== win) return;
    const msg = event.data;
    if (!msg || msg.source !== PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT) return;

    if (
      msg.type === PAGE_MESSAGE.SYNC_RPC_OVERRIDES &&
      msg.rpcOverrides &&
      typeof msg.rpcOverrides === "object"
    ) {
      rpcOverrides = { ...msg.rpcOverrides };
      return;
    }

    if (msg.type === PAGE_MESSAGE.EXTRACT_AUDIO_REQUEST) {
      handleExtractAudioRequest(msg.payload);
    }
  });

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
        postToContent(PAGE_MESSAGE.BATCH_ARTIFACTS, {
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
    const origFetch = win.fetch;
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

      const promise = Reflect.apply(origFetch, this, arguments);
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

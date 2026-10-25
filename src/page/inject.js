/**
 * MAIN-world passive `batchexecute` & SSR `AF_initDataCallback` observer
 * (`src/page/inject.js` -> `extension/page.js`).
 *
 * Runs at `document_start` in NotebookLM's `MAIN` world so it can:
 * 1. Passively observe `/_/LabsTailwindUi/data/batchexecute` responses over both
 *    `XMLHttpRequest` and `window.fetch` without modifying or delaying traffic.
 * 2. Scan inline Google Boq `AF_initDataCallback({...})` SSR hydration scripts so
 *    existing Studio Video Overviews are captured even when `notebook.google.com`
 *    does not issue a `gArtLc` XHR on tab refresh (`Ctrl+R`).
 * 3. Buffer all discovered artifacts & RPC diagnostics in memory and replay them
 *    on `REQUEST_PAGE_STATE` so `content.js` never misses early boot events.
 * 4. Extract audio from in-memory `blob:` URLs (`URL.createObjectURL`) without
 *    triggering cross-origin Google CDN CORS console errors.
 *
 * Security invariants:
 * - Zero access to `chrome.storage` or user API keys.
 * - Enforces `isTrustedGoogleMediaUrl()` before any HTTPS media fetch.
 * - Restricts `postMessage` communication to `window.location.origin`.
 */

import { PAGE_MESSAGE } from "../config/selectors.js";
import {
  extractAudioTrackFromMp4,
  resolveAvoidedVideoBytes,
  slicePcmIntoWavChunks,
  validateMediaPayload,
} from "../lib/audio-extract.js";
import {
  deriveGoogleMediaVariants,
  extractRpcIdsFromUrl,
  isBatchExecuteUrl,
  isThumbnailOrManifestUrl,
  isTrustedGoogleMediaUrl,
  parseAfInitDataPayloads,
  parseBatchExecuteRequest,
  parseBatchExecuteResponse,
  summarizeMediaUrlForDebug,
} from "../lib/batchexecute.js";

const GUARD_FLAG = "__notebooklmSubtitlesMainHooked__";
const MAX_INLINE_M4A_BYTES = 20 * 1024 * 1024;
const MAX_WAV_CHUNK_BYTES = 14 * 1024 * 1024;
const MAX_RPC_TRACE = 30;

export function installMainWorldObserver(win = globalThis) {
  if (!win || win[GUARD_FLAG]) return;
  win[GUARD_FLAG] = true;

  let rpcOverrides = {};
  let ssrScanned = false;
  const bufferedArtifacts = new Map();
  const rpcTrace = [];
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
          (obj.size > 65536 || /^(?:video|audio)\//i.test(obj.type || ""))
        ) {
          if (trackedMediaBlobs.size >= 4) {
            const oldestKey = trackedMediaBlobs.keys().next().value;
            trackedMediaBlobs.delete(oldestKey);
          }
          trackedMediaBlobs.set(url, obj);
          emitPageDebug(
            "blob.created",
            `Captured media Blob (${Math.round(obj.size / 1024)} KB, ${obj.type || "unknown"})`
          );
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

  function emitPageDebug(event, detail, extra = null) {
    postToContent(PAGE_MESSAGE.PAGE_DEBUG_EVENT, {
      ts: new Date().toISOString(),
      layer: "PAGE",
      event,
      detail,
      extra,
    });
  }

  function recordArtifacts(artifacts = []) {
    for (const art of artifacts) {
      if (art?.artifactId) {
        bufferedArtifacts.set(art.artifactId, art);
      }
    }
  }

  /**
   * Scans inline Google Boq `AF_initDataCallback({...})` `<script>` tags so
   * SSR-hydrated Video Overviews are captured even when zero `gArtLc` XHRs fire.
   */
  function scanSsrInitDataScripts() {
    try {
      const doc = win.document;
      if (!doc?.querySelectorAll) return [];
      const scripts = doc.querySelectorAll("script");
      if (!scripts || scripts.length === 0) return [];

      const texts = [];
      for (const s of scripts) {
        const txt = s.textContent || "";
        if (txt.includes("AF_initDataCallback")) {
          texts.push(txt);
        }
      }
      ssrScanned = true;
      if (texts.length === 0) return [];

      const found = parseAfInitDataPayloads(texts);
      if (found.length > 0) {
        recordArtifacts(found);
        emitPageDebug(
          "ssr.af_init_data",
          `Found ${found.length} Video Overview(s) in SSR AF_initDataCallback scripts`
        );
        postToContent(PAGE_MESSAGE.BATCH_ARTIFACTS, {
          isCreateVideoRequest: false,
          notebookId: null,
          artifacts: found,
          observedAt: Date.now(),
        });
      }
      return found;
    } catch {
      return [];
    }
  }

  /**
   * Scans browser Resource Timing entries for real audio/video streams,
   * explicitly excluding Studio card thumbnails (`initiatorType === "img"`, `=s512...`).
   */
  function discoverPerformanceMediaUrls() {
    const found = [];
    try {
      const entries = win.performance?.getEntriesByType?.("resource") || [];
      for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i];
        const url = e?.name || "";
        if (!isTrustedGoogleMediaUrl(url)) continue;
        if (e.initiatorType === "img" || e.initiatorType === "css") continue;

        const isExplicitVideoInitiator =
          e.initiatorType === "video" ||
          e.initiatorType === "audio" ||
          e.initiatorType === "media";
        const isPlayableStreamPattern =
          /videoplayback|=m(?:18|22|37|140)(?:-dv)?(?:$|\?)/i.test(url);

        if (
          (isExplicitVideoInitiator || isPlayableStreamPattern) &&
          !isThumbnailOrManifestUrl(url) &&
          !found.includes(url)
        ) {
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

  async function fetchSingleCandidateInPage(url, { blobOnly = false } = {}) {
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
      if (blobOnly) {
        throw new Error("MediaSource blob stream is not backed by a standalone Blob");
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

    if (blobOnly) {
      throw new Error("Deferring HTTPS Google CDN fetch to Service Worker");
    }

    if (!isTrustedGoogleMediaUrl(url)) {
      throw new Error("Untrusted media URL");
    }
    if (!nativeFetch) {
      throw new Error("fetch unavailable");
    }

    let lastErr = null;
    for (const credentialsMode of ["include", "omit"]) {
      const controller =
        typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller
        ? setTimeout(() => controller.abort(), 4500)
        : null;
      try {
        const fetchInit = {
          method: "GET",
          credentials: credentialsMode,
        };
        if (controller) fetchInit.signal = controller.signal;
        const res = await nativeFetch(url, fetchInit);
        if (timer) clearTimeout(timer);
        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status}`);
          try {
            await res.body?.cancel?.();
          } catch {
            // Ignore
          }
          if (res.status === 400 || res.status === 404 || res.status === 410) {
            break;
          }
          continue;
        }
        const ct = res.headers?.get?.("content-type") || "";
        if (/text\/html/i.test(ct)) {
          lastErr = new Error("HTML login redirect");
          try {
            await res.body?.cancel?.();
          } catch {
            // Ignore
          }
          continue;
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        return {
          bytes: validateMediaPayload(buf, ct),
          contentType: ct,
          url,
        };
      } catch (err) {
        if (timer) clearTimeout(timer);
        lastErr = err;
      }
    }

    throw lastErr || new Error("In-page media fetch failed");
  }

  async function handleExtractAudioRequest({
    requestId,
    candidateUrls = [],
    videoCurrentSrc = "",
    blobOnly = false,
    durationSeconds = 0,
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

    if (!blobOnly) {
      for (const u of candidateUrls) {
        for (const v of deriveGoogleMediaVariants(u)) pushUrl(v);
        if (!isThumbnailOrManifestUrl(u)) pushUrl(u);
      }
      if (videoCurrentSrc && isTrustedGoogleMediaUrl(videoCurrentSrc)) {
        for (const v of deriveGoogleMediaVariants(videoCurrentSrc)) pushUrl(v);
        if (!isThumbnailOrManifestUrl(videoCurrentSrc)) pushUrl(videoCurrentSrc);
      }
      for (const u of discoveredMediaUrls) {
        for (const v of deriveGoogleMediaVariants(u)) pushUrl(v);
        pushUrl(u);
      }
    }

    let downloaded = null;
    let lastError = blobOnly
      ? "Deferred HTTPS CDN download to Service Worker."
      : "No downloadable media stream matched in page.";

    const deadFifeSuffixes = new Set();
    for (const url of expanded) {
      const fifeSuffixMatch = url.match(/\/([A-Za-z0-9_-]{16,})(=[A-Za-z0-9_,.-]+)$/);
      const fifeKey = fifeSuffixMatch
        ? `${fifeSuffixMatch[1]}${fifeSuffixMatch[2]}`
        : "";
      if (fifeKey && deadFifeSuffixes.has(fifeKey)) {
        continue;
      }
      try {
        downloaded = await fetchSingleCandidateInPage(url, { blobOnly });
        break;
      } catch (err) {
        const msg = err?.message || String(err);
        lastError = msg;
        if (fifeKey && /HTTP (?:400|404|410)\b/.test(msg)) {
          deadFifeSuffixes.add(fifeKey);
        }
      }
    }

    if (!downloaded) {
      postToContent(PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE, {
        requestId,
        ok: false,
        deferred: Boolean(blobOnly),
        error: lastError,
        discoveredMediaUrls,
      });
      return;
    }

    const rawDownloadedBytes = downloaded.bytes.byteLength;

    try {
      const extracted = extractAudioTrackFromMp4(downloaded.bytes);
      if (
        extracted &&
        extracted.bytes &&
        extracted.extractedBytes <= MAX_INLINE_M4A_BYTES
      ) {
        const cleanCopy = extracted.bytes.slice();
        const byteStats = resolveAvoidedVideoBytes({
          originalBytes: rawDownloadedBytes,
          extractedBytes: cleanCopy.byteLength,
          durationSeconds,
        });
        postToContent(
          PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE,
          {
            requestId,
            ok: true,
            originalBytes: byteStats.originalBytes,
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

      // FAST PATH B: Fragmented pure-audio stream (`=m140` / `audio/*`) skips slow PCM WAV decode
      const isAlreadyPureAudio =
        /^audio\//i.test(downloaded.contentType || "") ||
        /=m140(?:-dv)?(?:$|\?)|mime=audio/i.test(downloaded.url || "");
      if (isAlreadyPureAudio && rawDownloadedBytes <= MAX_INLINE_M4A_BYTES) {
        const cleanCopy = downloaded.bytes.slice();
        const normalizedMime = /^audio\/(?:webm|mpeg|ogg|wav)/i.test(
          downloaded.contentType || ""
        )
          ? downloaded.contentType.split(";")[0].trim().toLowerCase()
          : "audio/mp4";
        const ext =
          normalizedMime === "audio/webm"
            ? "webm"
            : normalizedMime === "audio/mpeg"
              ? "mp3"
              : "m4a";
        const byteStats = resolveAvoidedVideoBytes({
          originalBytes: rawDownloadedBytes,
          extractedBytes: cleanCopy.byteLength,
          durationSeconds,
        });
        postToContent(
          PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE,
          {
            requestId,
            ok: true,
            originalBytes: byteStats.originalBytes,
            extractedBytes: cleanCopy.byteLength,
            chunks: [
              {
                buffer: cleanCopy.buffer,
                mimeType: normalizedMime,
                fileName: `overview-audio.${ext}`,
                startOffsetSec: 0,
                durationSec: null,
              },
            ],
          },
          [cleanCopy.buffer]
        );
        return;
      }

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
          originalBytes: rawDownloadedBytes,
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

  function sendStateSnapshotToContent() {
    if (!ssrScanned) {
      scanSsrInitDataScripts();
    }
    postToContent(PAGE_MESSAGE.PAGE_STATE_SNAPSHOT, {
      artifacts: [...bufferedArtifacts.values()],
      rpcTrace: [...rpcTrace],
      discoveredMediaUrls: discoverPerformanceMediaUrls(),
      ssrScanned,
      observedAt: Date.now(),
    });
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

    if (msg.type === PAGE_MESSAGE.REQUEST_PAGE_STATE) {
      sendStateSnapshotToContent();
      return;
    }

    if (msg.type === PAGE_MESSAGE.EXTRACT_AUDIO_REQUEST) {
      handleExtractAudioRequest(msg.payload);
    }
  });

  function inspectTransaction(url, requestBody, responseText, transport = "xhr") {
    try {
      const rpcIds = extractRpcIdsFromUrl(url);
      const reqMeta = parseBatchExecuteRequest(requestBody, rpcOverrides);
      const artifacts = responseText
        ? parseBatchExecuteResponse(responseText, rpcOverrides).map((art) => ({
            ...art,
            notebookId: reqMeta?.notebookId || null,
          }))
        : [];

      if (artifacts.length > 0) {
        recordArtifacts(artifacts);
      }

      const traceEntry = {
        ts: new Date().toISOString(),
        transport,
        rpcIds,
        isCreateVideo: Boolean(reqMeta?.isVideoCreate),
        videoCount: artifacts.length,
        statuses: artifacts.map((a) => `${a.artifactId.slice(0, 8)}:${a.status}`),
      };
      rpcTrace.push(traceEntry);
      if (rpcTrace.length > MAX_RPC_TRACE) rpcTrace.shift();

      if (reqMeta?.isVideoCreate || artifacts.length > 0 || rpcIds.includes("gArtLc") || rpcIds.includes("R7cb6c")) {
        emitPageDebug(
          "rpc.batchexecute",
          `${transport.toUpperCase()} rpcids=[${rpcIds.join(",") || "?"}] -> ${artifacts.length} video artifact(s)`
        );
      }

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
              .then((text) => inspectTransaction(url, reqBody, text, "fetch"));
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
                inspectTransaction(meta.url, meta.body, this.responseText, "xhr");
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

  // 3. Passive `HTMLMediaElement.prototype.play` hook so even `<video>` elements
  //    mounted inside Shadow DOMs notify `content.js` immediately on playback.
  const MediaProto = win.HTMLMediaElement?.prototype;
  if (MediaProto && typeof MediaProto.play === "function") {
    const origPlay = MediaProto.play;
    MediaProto.play = function patchedPlay() {
      try {
        if (this?.tagName === "VIDEO") {
          const src = this.currentSrc || this.src || "";
          emitPageDebug(
            "video.play",
            `<video>.play() src=${summarizeMediaUrlForDebug(src)} dur=${
              Number.isFinite(this.duration) ? Math.round(this.duration) + "s" : "?"
            }`,
            {
              currentSrc: isTrustedGoogleMediaUrl(src) ? src : "",
              isBlob: src.startsWith("blob:"),
            }
          );
        }
      } catch {
        // Ignore
      }
      return Reflect.apply(origPlay, this, arguments);
    };
  }

  // 4. Scan SSR `AF_initDataCallback` scripts as soon as the HTML document finishes parsing
  if (win.document) {
    if (win.document.readyState === "loading") {
      win.addEventListener?.("DOMContentLoaded", () => scanSsrInitDataScripts(), {
        once: true,
      });
    } else {
      scanSsrInitDataScripts();
    }
  }
}

if (typeof window !== "undefined") {
  installMainWorldObserver(window);
}

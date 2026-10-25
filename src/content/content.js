/**
 * Content Script Coordinator (`src/content/content.js` -> `extension/content.js`).
 *
 * Runs at `document_start` in Chrome's isolated world on `notebook.google.com` and
 * `notebooklm.google.com`:
 * 1. Attaches its `window.postMessage` bridge listener synchronously at `document_start`
 *    and performs a `REQUEST_PAGE_STATE` handshake with `page.js` so zero early
 *    `batchexecute` RPCs or SSR `AF_initDataCallback` rows are missed on refresh (`Ctrl+R`).
 * 2. Discovers `<video>` elements across light DOM, open Shadow DOMs, and capture-phase
 *    media events (`play`, `loadedmetadata`, `canplay`) inside Angular Material `Lot dialog`.
 * 3. Uses `page.js` only for in-memory `blob:` extraction (`blobOnly: true`) + `STAGE_AUDIO_CHUNK`,
 *    and routes all Google CDN media downloads directly to `service-worker.js` (`ENSURE_SUBTITLES`),
 *    avoiding cross-origin CORS failures and stalls.
 * 4. Powers the live Shadow-DOM `DebugDrawer` and centralized diagnostic timeline when
 *    `settings.debugMode` is enabled.
 */

import {
  DOM_SELECTORS,
  KEEPALIVE_PORT_NAME,
  MESSAGE_NAMESPACE,
  NOTEBOOK_URL_ID_REGEX,
  PAGE_MESSAGE,
  RUNTIME_MESSAGE,
} from "../config/selectors.js";
import { slicePcmIntoWavChunks } from "../lib/audio-extract.js";
import {
  extractMediaToken,
  isNotebookLmHost,
  isThumbnailOrManifestUrl,
  isTrustedGoogleMediaUrl,
  summarizeMediaUrlForDebug,
} from "../lib/batchexecute.js";
import {
  resolveSubtitleCacheKey,
  shouldGenerateSubtitles,
} from "../lib/decide.js";
import {
  DEFAULT_SETTINGS,
  getSettings,
  sanitizeDebugMessage,
  saveSettings,
} from "../lib/storage.js";
import { DebugDrawer } from "./debug-drawer.js";
import { VideoSubtitleController } from "./player-overlay.js";
import { createToastManager } from "./toast.js";

const GUARD_FLAG = "__notebooklmSubtitlesContentLoaded__";
const BLOB_EXTRACT_TIMEOUT_MS = 4000;
const MAX_WAV_CHUNK_BYTES = 14 * 1024 * 1024;

function uint8ToBase64(bytes) {
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += CHUNK) {
    s += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(bytes.byteLength, i + CHUNK))
    );
  }
  return btoa(s);
}

function base64ToUint8(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function waitForBody(doc, callback) {
  if (doc?.body) {
    callback();
    return;
  }
  const check = () => {
    if (doc?.body) {
      doc.removeEventListener?.("DOMContentLoaded", check);
      callback();
    }
  };
  doc?.addEventListener?.("DOMContentLoaded", check);
  setTimeout(check, 250);
}

/**
 * Recursively collects `<video>` elements across light DOM and open ShadowRoots
 * (up to depth 6) so custom Web Component players inside `Lot dialog` are discovered.
 */
export function collectVideosDeep(root, out = [], depth = 0) {
  if (!root || depth > 6) return out;

  try {
    if (root.tagName === "VIDEO" && !out.includes(root)) {
      out.push(root);
    }
    if (typeof root.querySelectorAll === "function") {
      const videos = root.querySelectorAll(DOM_SELECTORS.VIDEO_ELEMENT);
      for (const v of videos) {
        if (!out.includes(v)) out.push(v);
      }
      const allEls = root.querySelectorAll("*");
      for (const el of allEls) {
        if (el.shadowRoot) {
          collectVideosDeep(el.shadowRoot, out, depth + 1);
        }
      }
    }
  } catch {
    // Ignore detached nodes
  }

  return out;
}

export async function initContentCoordinator({
  win = globalThis.window,
  doc = globalThis.document,
  runtime = globalThis.chrome?.runtime,
  storage = globalThis.chrome?.storage,
} = {}) {
  if (!win || !doc || !runtime) return null;
  if (!isNotebookLmHost(win.location?.hostname || "")) return null;
  if (win[GUARD_FLAG]) return win[GUARD_FLAG];

  const artifactsById = new Map();
  const artifactsByToken = new Map();
  const pendingGeneratedVideoIds = new Set();
  const cachedKeys = new Set();
  const inFlightKeys = new Set();
  const exhaustedKeys = new Set();
  const controllers = new Map(); // HTMLVideoElement -> { video, controller, artifactId, cacheKey, inFlight }
  const pendingPageRequests = new Map();
  let pageReqSeq = 1;
  let createIntentTimestamp = 0;
  let lastActiveVideo = null;
  let permissionsOk = true;
  let settings = { ...DEFAULT_SETTINGS };

  let toast = null;
  let debugDrawer = null;
  const localDebugBuffer = [];
  let keepalivePort = null;
  let keepaliveTimer = null;

  function sendRuntimeMessage(message) {
    return new Promise((resolve) => {
      try {
        runtime.sendMessage(message, (res) => {
          const err = globalThis.chrome?.runtime?.lastError;
          if (err) {
            resolve({ ok: false, error: err.message });
            return;
          }
          resolve(res || { ok: false, error: "No response from background worker" });
        });
      } catch (err) {
        resolve({ ok: false, error: err?.message || String(err) });
      }
    });
  }

  function startKeepalive() {
    if (keepalivePort || !runtime?.connect) return;
    try {
      keepalivePort = runtime.connect({ name: KEEPALIVE_PORT_NAME });
      keepalivePort.onDisconnect.addListener(() => {
        keepalivePort = null;
        if (keepaliveTimer) {
          clearInterval(keepaliveTimer);
          keepaliveTimer = null;
        }
      });
      keepaliveTimer = setInterval(() => {
        try {
          keepalivePort?.postMessage({ ping: Date.now() });
        } catch {
          // Ignore
        }
      }, 20000);
    } catch {
      // Ignore
    }
  }

  function stopKeepaliveIfIdle() {
    if (inFlightKeys.size > 0) return;
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
    if (keepalivePort) {
      try {
        keepalivePort.disconnect();
      } catch {
        // Ignore
      }
      keepalivePort = null;
    }
  }

  function recordDebug(layer, event, detail, level = "info") {
    const entry = {
      ts: new Date().toISOString(),
      layer,
      event,
      detail: sanitizeDebugMessage(detail),
      level,
    };
    localDebugBuffer.push(entry);
    if (localDebugBuffer.length > 80) localDebugBuffer.shift();

    if (debugDrawer) {
      debugDrawer.pushEntry(entry);
      debugDrawer.updateSummary({
        artifacts: artifactsById.size,
        videos: controllers.size,
        permissionsOk,
      });
    }

    if (settings.debugMode) {
      sendRuntimeMessage({
        type: RUNTIME_MESSAGE.APPEND_DEBUG_LOG,
        entry,
      }).catch(() => {});
    }
  }

  function syncDebugDrawerLifecycle() {
    if (!settings.debugMode) {
      if (debugDrawer) {
        debugDrawer.destroy();
        debugDrawer = null;
      }
      return;
    }

    waitForBody(doc, () => {
      if (!settings.debugMode || debugDrawer) return;
      debugDrawer = new DebugDrawer({
        doc,
        onForceScan: () => {
          recordDebug("CONTENT", "manual.scan", "Manual scan & state replay requested");
          requestPageStateSnapshot();
          scanForVideos();
          const target = pickTargetVideoEntry();
          if (target) {
            ensureSubtitlesForEntry(target, { force: true, trigger: "manual" });
          } else {
            recordDebug(
              "CONTENT",
              "manual.scan",
              "No active <video> element in DOM yet — open a Studio Video Overview player",
              "error"
            );
          }
        },
        onCopyReport: async () => {
          const res = await sendRuntimeMessage({
            type: RUNTIME_MESSAGE.GET_DEBUG_REPORT,
            tabContext: buildTabDiagnosticSnapshot(),
          });
          const text =
            res?.reportText || JSON.stringify(buildTabDiagnosticSnapshot(), null, 2);
          try {
            await win.navigator?.clipboard?.writeText(text);
            return true;
          } catch {
            return false;
          }
        },
        onClear: () => {
          localDebugBuffer.length = 0;
          sendRuntimeMessage({ type: RUNTIME_MESSAGE.CLEAR_DEBUG_LOGS }).catch(
            () => {}
          );
        },
      });
      debugDrawer.mount();
      debugDrawer.setEntries(localDebugBuffer);
      debugDrawer.updateSummary({
        artifacts: artifactsById.size,
        videos: controllers.size,
        status: pickTargetVideoEntry()?.controller?.statusState || "idle",
        permissionsOk,
      });
    });
  }

  function ensureToast() {
    if (!toast && doc.body) {
      toast = createToastManager(doc);
    }
    return toast;
  }

  function showToast(
    title,
    detail = "",
    kind = "info",
    durationMs = 3800,
    extra = {}
  ) {
    if (!settings.showToast || !settings.enabled) return;
    waitForBody(doc, () => {
      ensureToast()?.show({
        title,
        detail,
        kind,
        durationMs,
        actionLabel: extra?.actionLabel || "",
        onAction: extra?.onAction || null,
      });
    });
  }

  function playCompletionChime() {
    if (!settings.soundAlerts || !settings.enabled) return;
    try {
      const AudioCtx = win.AudioContext || win.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.055, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.21);
      });
      setTimeout(() => {
        ctx.close?.().catch?.(() => {});
      }, 600);
    } catch {
      // Ignore autoplay / audio context restrictions
    }
  }

  function fireTabDesktopNotification(title, body) {
    if (!settings.desktopNotifications || !settings.enabled) return;
    if (!doc.hidden) return;
    try {
      const Notif = win.Notification;
      if (Notif && Notif.permission === "granted") {
        new Notif(String(title || "LM Subs"), {
          body: String(body || ""),
        });
      }
    } catch {
      // Ignore restricted notification context
    }
  }

  function hideToast() {
    toast?.hide?.();
  }

  function getPostOrigin() {
    return win.location?.origin && win.location.origin !== "null"
      ? win.location.origin
      : "*";
  }

  function syncRpcOverridesToPage() {
    try {
      win.postMessage(
        {
          source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
          type: PAGE_MESSAGE.SYNC_RPC_OVERRIDES,
          rpcOverrides: settings.rpcOverrides || {},
        },
        getPostOrigin()
      );
    } catch {
      // Ignore
    }
  }

  function requestPageStateSnapshot() {
    try {
      win.postMessage(
        {
          source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
          type: PAGE_MESSAGE.REQUEST_PAGE_STATE,
        },
        getPostOrigin()
      );
    } catch {
      // Ignore
    }
  }

  function requestPageBlobExtraction({ videoCurrentSrc }) {
    return new Promise((resolve) => {
      const requestId = `extract_${Date.now()}_${pageReqSeq++}`;
      const timer = setTimeout(() => {
        pendingPageRequests.delete(requestId);
        resolve({
          ok: false,
          error: "Timed out reading in-memory Blob stream.",
        });
      }, BLOB_EXTRACT_TIMEOUT_MS);

      pendingPageRequests.set(requestId, { resolve, timer });
      try {
        win.postMessage(
          {
            source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
            type: PAGE_MESSAGE.EXTRACT_AUDIO_REQUEST,
            payload: {
              requestId,
              candidateUrls: [],
              videoCurrentSrc,
              blobOnly: true,
            },
          },
          getPostOrigin()
        );
      } catch (err) {
        clearTimeout(timer);
        pendingPageRequests.delete(requestId);
        resolve({ ok: false, error: err?.message || String(err) });
      }
    });
  }

  function getNotebookIdFromUrl() {
    const match = (win.location?.pathname || "").match(NOTEBOOK_URL_ID_REGEX);
    return match ? match[1] : null;
  }

  function getNotebookTitleFallback() {
    return (doc.title || "NotebookLM Video Overview")
      .replace(/\s*[-–|]\s*(?:NotebookLM|Gemini Notebook).*$/i, "")
      .trim() || "NotebookLM Video Overview";
  }

  function isLikelySilentCardPreviewVideo(video) {
    try {
      const src = video.currentSrc || video.src || "";
      if (src && isThumbnailOrManifestUrl(src)) {
        const insideDialog = Boolean(
          video.closest?.(
            '[role="dialog"], .cdk-overlay-container, mat-dialog-container'
          )
        );
        if (!insideDialog) return true;
      }
      if (
        video.muted &&
        video.loop &&
        video.videoWidth > 0 &&
        video.videoWidth <= 520 &&
        !video.controls
      ) {
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  }

  function matchArtifactForVideo(video) {
    const src = video.currentSrc || video.src || "";
    const token = extractMediaToken(src);
    if (token && artifactsByToken.has(token)) {
      return artifactsByToken.get(token);
    }

    const readyList = [...artifactsById.values()].filter(
      (a) =>
        a.status === "ready" &&
        (a.mediaUrl || a.progressiveUrl || a.mediaVariants?.length)
    );

    if (readyList.length === 1) {
      return readyList[0];
    }

    if (Number.isFinite(video.duration) && video.duration > 0) {
      let best = null;
      let bestDiff = Infinity;
      for (const art of readyList) {
        if (typeof art.durationSeconds === "number") {
          const diff = Math.abs(art.durationSeconds - video.duration);
          if (diff < 3.0 && diff < bestDiff) {
            best = art;
            bestDiff = diff;
          }
        }
      }
      if (best) return best;
    }

    return readyList[readyList.length - 1] || null;
  }

  function discoverResourceTimingMediaUrls() {
    const urls = [];
    try {
      const entries = win.performance?.getEntriesByType?.("resource") || [];
      for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i];
        const url = e?.name || "";
        if (!isTrustedGoogleMediaUrl(url)) continue;
        if (e.initiatorType === "img" || e.initiatorType === "css") continue;
        if (isThumbnailOrManifestUrl(url)) continue;

        if (
          e.initiatorType === "video" ||
          e.initiatorType === "audio" ||
          e.initiatorType === "media" ||
          /videoplayback|=m(?:18|22|37|140)(?:-dv)?(?:$|\?)/i.test(url)
        ) {
          if (!urls.includes(url)) urls.push(url);
        }
      }
    } catch {
      // Ignore
    }
    return urls;
  }

  async function stageBlobChunksToServiceWorker(blobResult) {
    const stagedJobId = `blob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const totalChunks = blobResult.chunks.length;
    for (let i = 0; i < totalChunks; i++) {
      const ch = blobResult.chunks[i];
      const bytes = new Uint8Array(ch.buffer);
      const res = await sendRuntimeMessage({
        type: RUNTIME_MESSAGE.STAGE_AUDIO_CHUNK,
        stagedJobId,
        index: i,
        totalChunks,
        originalBytes: blobResult.originalBytes,
        extractedBytes: blobResult.extractedBytes,
        chunk: {
          base64: uint8ToBase64(bytes),
          mimeType: ch.mimeType,
          fileName: ch.fileName,
          startOffsetSec: ch.startOffsetSec,
          durationSec: ch.durationSec,
        },
      });
      if (!res?.ok) {
        return null;
      }
    }
    return stagedJobId;
  }

  async function decodeBase64MediaToWavFallback(base64Media) {
    const AudioCtx = win.AudioContext || win.webkitAudioContext;
    const OfflineCtx = win.OfflineAudioContext || win.webkitOfflineAudioContext;
    if (!AudioCtx || !OfflineCtx) {
      throw new Error("WebAudio unavailable for WAV fallback.");
    }
    const raw = base64ToUint8(base64Media);
    const ctx = new AudioCtx();
    let decoded;
    try {
      const copy = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
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
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    const wavChunks = slicePcmIntoWavChunks(
      rendered.getChannelData(0),
      sampleRate,
      MAX_WAV_CHUNK_BYTES
    );
    return wavChunks.map((c) => ({
      base64: uint8ToBase64(c.bytes),
      mimeType: c.mimeType,
      fileName: c.fileName,
      startOffsetSec: c.startOffsetSec,
      durationSec: c.durationSec,
    }));
  }

  async function ensureSubtitlesForEntry(
    entry,
    { force = false, trigger = "player_open" } = {}
  ) {
    if (!entry || entry.inFlight) return;
    const { video, controller } = entry;
    lastActiveVideo = video;

    let artifact = matchArtifactForVideo(video);
    if (!artifact) {
      requestPageStateSnapshot();
      artifact = matchArtifactForVideo(video);
    }

    const rawSrc = video.currentSrc || video.src || "";
    const timingUrls = discoverResourceTimingMediaUrls();

    const mediaVariants = [];
    const pushVariant = (u) => {
      if (
        typeof u === "string" &&
        isTrustedGoogleMediaUrl(u) &&
        !mediaVariants.includes(u)
      ) {
        mediaVariants.push(u);
      }
    };

    if (artifact?.directAudioUrl) pushVariant(artifact.directAudioUrl);
    if (Array.isArray(artifact?.mediaVariants)) {
      for (const v of artifact.mediaVariants) pushVariant(v);
    }
    if (artifact?.progressiveUrl && !isThumbnailOrManifestUrl(artifact.progressiveUrl)) {
      pushVariant(artifact.progressiveUrl);
    }
    if (artifact?.mediaUrl && !isThumbnailOrManifestUrl(artifact.mediaUrl)) {
      pushVariant(artifact.mediaUrl);
    }
    if (isTrustedGoogleMediaUrl(rawSrc) && !isThumbnailOrManifestUrl(rawSrc)) {
      pushVariant(rawSrc);
    }
    for (const u of timingUrls) pushVariant(u);

    const primaryMediaUrl =
      mediaVariants[0] ||
      artifact?.progressiveUrl ||
      artifact?.mediaUrl ||
      (isTrustedGoogleMediaUrl(rawSrc) ? rawSrc : "") ||
      (rawSrc.startsWith("blob:") ? rawSrc : "");

    const isBlobSrc = rawSrc.startsWith("blob:");

    if (!primaryMediaUrl) {
      recordDebug(
        "CONTENT",
        "ensure.waiting_url",
        `Waiting for media URL (artifacts=${artifactsById.size}, src=${summarizeMediaUrlForDebug(rawSrc)})`
      );
      return;
    }

    const artifactId = artifact?.artifactId || null;
    const mediaToken =
      artifact?.mediaToken || extractMediaToken(primaryMediaUrl) || null;
    const title = artifact?.title || getNotebookTitleFallback();
    const isNewlyGenerated = Boolean(
      artifactId && pendingGeneratedVideoIds.has(artifactId)
    );
    const effectiveTrigger = force
      ? "manual"
      : isNewlyGenerated
        ? "generate"
        : trigger;

    const decision = shouldGenerateSubtitles({
      settings,
      trigger: effectiveTrigger,
      force,
      status: "ready",
      title,
      artifactId:
        artifactId ||
        (!mediaToken && isBlobSrc
          ? `blob_${Math.round((video.duration || 1) * 10)}`
          : null),
      mediaToken,
      mediaUrl: primaryMediaUrl,
      cachedKeys,
      inFlightKeys,
      exhaustedKeys,
    });

    if (!decision.allow) {
      // If cached in memory/SW, make sure this `<video>` controller has the cues mounted!
      if (decision.reason === "already_cached" && controller.cues.length === 0) {
        const cached = await sendRuntimeMessage({
          type: RUNTIME_MESSAGE.GET_CACHED_SUBTITLES,
          cacheKey: decision.cacheKey,
          artifactId,
          mediaToken,
        });
        if (cached?.ok && cached.entry?.cues?.length > 0) {
          controller.setCues(cached.entry.cues, {
            title: cached.entry.title || title,
            language: cached.entry.language || "en",
          });
          recordDebug(
            "CONTENT",
            "ensure.cache_mount",
            `Mounted ${cached.entry.cues.length} cached cues on <video>`,
            "ok"
          );
          return;
        }
      }
      recordDebug(
        "CONTENT",
        "ensure.skipped",
        `Decision gate skipped (${decision.reason}) for "${title.slice(0, 38)}"`
      );
      return;
    }

    const cacheKey = decision.cacheKey;
    entry.inFlight = true;
    entry.artifactId = artifactId;
    entry.cacheKey = cacheKey;
    inFlightKeys.add(cacheKey);
    startKeepalive();

    controller.setStatus("working", "Generating subtitles…");
    debugDrawer?.updateSummary({ status: "working" });

    recordDebug(
      "CONTENT",
      "ensure.start",
      `Pipeline started for "${title.slice(0, 34)}" (key=${cacheKey.slice(
        0,
        22
      )}, variants=${mediaVariants.length}, blob=${isBlobSrc})`
    );

    try {
      // 1. Check LRU cache in Service Worker first unless forced
      if (!force) {
        const cachedRes = await sendRuntimeMessage({
          type: RUNTIME_MESSAGE.GET_CACHED_SUBTITLES,
          cacheKey,
          artifactId,
          mediaToken,
        });
        if (cachedRes?.ok && cachedRes.entry?.cues?.length > 0) {
          cachedKeys.add(cacheKey);
          controller.setCues(cachedRes.entry.cues, {
            title: cachedRes.entry.title || title,
            language: cachedRes.entry.language || artifact?.language || "en",
          });
          debugDrawer?.updateSummary({
            status: `ready (${cachedRes.entry.cues.length} cached)`,
          });
          recordDebug(
            "CONTENT",
            "ensure.cache_hit",
            `Loaded ${cachedRes.entry.cues.length} cached cues (${cachedRes.entry.provider})`,
            "ok"
          );
          showToast(
            "Loaded cached subtitles",
            `${cachedRes.entry.cues.length} cues · ${title}`,
            "success",
            2600
          );
          return;
        }
      }

      showToast(
        "Extracting audio from Video Overview…",
        title,
        "working",
        0
      );

      // 2. If `<video>` uses an in-memory `blob:` URL created via `URL.createObjectURL(Blob)`,
      //    extract audio directly in `page.js` and stage via `STAGE_AUDIO_CHUNK`.
      let stagedJobId = null;
      if (isBlobSrc) {
        const blobResult = await requestPageBlobExtraction({
          videoCurrentSrc: rawSrc,
        });
        if (
          blobResult?.ok &&
          Array.isArray(blobResult.chunks) &&
          blobResult.chunks.length > 0
        ) {
          stagedJobId = await stageBlobChunksToServiceWorker(blobResult);
          if (stagedJobId) {
            recordDebug(
              "CONTENT",
              "blob.staged",
              `Staged ${Math.round((blobResult.extractedBytes || 0) / 1024)} KB in-memory audio to Service Worker`,
              "ok"
            );
          }
        }
      }

      // 3. Dispatch `ENSURE_SUBTITLES` to Service Worker
      recordDebug(
        "CONTENT",
        "ensure.sw_dispatch",
        `Sending ENSURE_SUBTITLES to Service Worker (variants=${mediaVariants.length}, staged=${Boolean(
          stagedJobId
        )})`
      );

      const res = await sendRuntimeMessage({
        type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
        stagedJobId,
        force: Boolean(force),
        artifact: {
          cacheKey,
          artifactId,
          notebookId: artifact?.notebookId || getNotebookIdFromUrl(),
          mediaToken,
          title,
          language: artifact?.language || null,
          mediaUrl: primaryMediaUrl,
          progressiveUrl:
            (artifact?.progressiveUrl &&
              !isThumbnailOrManifestUrl(artifact.progressiveUrl) &&
              artifact.progressiveUrl) ||
            primaryMediaUrl,
          mediaVariants,
          durationSeconds:
            artifact?.durationSeconds ||
            (Number.isFinite(video.duration) ? video.duration : null),
        },
      });

      if (!res?.ok || !res.entry?.cues?.length) {
        if (res?.missingPermissions) {
          permissionsOk = false;
          debugDrawer?.updateSummary({ permissionsOk: false });
        }
        exhaustedKeys.add(cacheKey);
        throw new Error(res?.error || "Subtitle generation failed.");
      }

      const saved = res.entry;
      cachedKeys.add(cacheKey);
      exhaustedKeys.delete(cacheKey);
      if (artifactId) pendingGeneratedVideoIds.delete(artifactId);

      controller.setCues(saved.cues, {
        title: saved.title || title,
        language: saved.language || artifact?.language || "en",
      });
      debugDrawer?.updateSummary({ status: `ready (${saved.cues.length} cues)` });

      const ratioDetail =
        saved.extractedBytes && saved.originalBytes
          ? ` · ${(saved.extractedBytes / 1048576).toFixed(1)} MB audio`
          : "";
      recordDebug(
        "CONTENT",
        "ensure.ok",
        `Rendered ${saved.cues.length} cues via ${saved.provider || "AI"}${ratioDetail}`,
        "ok"
      );

      showToast(
        res.cached
          ? `Loaded cached subtitles (${saved.cues.length} cues)`
          : `Subtitles ready (${saved.cues.length} cues)`,
        `${saved.provider || "AI"}${ratioDetail} · ${saved.title || title}`,
        "success",
        5200,
        {
          actionLabel: "Transcript",
          onAction: () => controller.toggleTranscriptDrawer(true),
        }
      );
      if (!res.cached) {
        playCompletionChime();
        fireTabDesktopNotification(
          `Subtitles ready: ${saved.title || title}`,
          `${saved.cues.length} cues generated via ${saved.provider || "AI"}.`
        );
      }
    } catch (err) {
      const msg = err?.message || String(err);
      controller.setStatus("error", "Subtitle error");
      debugDrawer?.updateSummary({ status: "error" });
      recordDebug("CONTENT", "ensure.error", msg, "error");
      showToast("Subtitle generation failed", msg, "error", 6200);
    } finally {
      entry.inFlight = false;
      inFlightKeys.delete(cacheKey);
      stopKeepaliveIfIdle();
    }
  }

  function bindVideoElement(video) {
    if (!video || controllers.has(video)) return controllers.get(video) || null;
    if (isLikelySilentCardPreviewVideo(video)) {
      return null;
    }

    const entry = {
      video,
      controller: null,
      artifactId: null,
      cacheKey: null,
      inFlight: false,
    };

    const controller = new VideoSubtitleController(video, {
      doc,
      initialFontSize: settings.fontSize,
      initialCaptionStyle: settings.captionStyle,
      initialOffsetSec: settings.subtitleOffsetSec,
      onRequestGenerate: ({ force } = {}) => {
        ensureSubtitlesForEntry(entry, {
          force: Boolean(force),
          trigger: "manual",
        });
      },
      onFontSizeChange: (fontSize) => {
        settings.fontSize = fontSize;
        saveSettings({ fontSize }).catch(() => {});
      },
      onCaptionStyleChange: (captionStyle) => {
        settings.captionStyle = captionStyle;
        saveSettings({ captionStyle }).catch(() => {});
      },
      onOffsetChange: (subtitleOffsetSec) => {
        settings.subtitleOffsetSec = subtitleOffsetSec;
        saveSettings({ subtitleOffsetSec }).catch(() => {});
      },
      onImportSubtitles: (cues, fileName) => {
        const artifact = matchArtifactForVideo(video);
        const mediaUrl =
          artifact?.mediaUrl || video.currentSrc || video.src || "";
        const mediaToken = artifact?.mediaToken || extractMediaToken(mediaUrl);
        const cacheKey =
          resolveSubtitleCacheKey({
            artifactId: artifact?.artifactId,
            mediaToken,
            mediaUrl,
          }) || `import:${fileName}`;

        sendRuntimeMessage({
          type: RUNTIME_MESSAGE.SAVE_IMPORTED_SUBTITLES,
          entry: {
            cacheKey,
            artifactId: artifact?.artifactId || null,
            mediaToken: mediaToken || null,
            title: artifact?.title || getNotebookTitleFallback(),
            language: artifact?.language || "en",
            provider: "imported",
            model: fileName,
            cues,
          },
        });
        cachedKeys.add(cacheKey);
        showToast(
          `Imported ${cues.length} cues`,
          fileName,
          "success",
          3200
        );
      },
    });

    entry.controller = controller;
    controllers.set(video, entry);
    lastActiveVideo = video;

    recordDebug(
      "CONTENT",
      "video.bound",
      `Bound <video> overlay (mounted=${Boolean(
        controller.host
      )}, src=${summarizeMediaUrlForDebug(video.currentSrc || video.src || "")})`
    );

    const onMediaReady = () => {
      lastActiveVideo = video;
      controller._ensureMounted?.();
      ensureSubtitlesForEntry(entry, { force: false, trigger: "player_open" });
    };

    video.addEventListener("loadedmetadata", onMediaReady);
    video.addEventListener("play", onMediaReady);

    if (video.readyState >= 1 || video.currentSrc || video.src) {
      ensureSubtitlesForEntry(entry, { force: false, trigger: "player_open" });
    }

    return entry;
  }

  function scanForVideos() {
    for (const [video, entry] of controllers.entries()) {
      if (!video.isConnected) {
        entry.controller.destroy();
        controllers.delete(video);
      } else {
        entry.controller._ensureMounted?.();
      }
    }

    const videos = collectVideosDeep(doc);
    for (const video of videos) {
      bindVideoElement(video);
    }
  }

  function ingestArtifactsList(artifacts = [], isCreateVideoRequest = false) {
    if (isCreateVideoRequest) {
      createIntentTimestamp = Date.now();
      showToast(
        "Video Overview queued",
        "Subtitles will generate automatically as soon as rendering finishes.",
        "info",
        4000
      );
    }

    if (!Array.isArray(artifacts) || artifacts.length === 0) return;

    let newlyReadyCount = 0;
    for (const art of artifacts) {
      if (!art?.artifactId) continue;
      const previous = artifactsById.get(art.artifactId);

      if (
        art.status === "initializing" ||
        art.status === "processing" ||
        (isCreateVideoRequest && !previous) ||
        Date.now() - createIntentTimestamp < 45_000
      ) {
        pendingGeneratedVideoIds.add(art.artifactId);
      }

      artifactsById.set(art.artifactId, art);
      if (art.mediaToken) {
        artifactsByToken.set(art.mediaToken, art);
      }

      if (
        art.status === "ready" &&
        (art.mediaUrl || art.progressiveUrl || art.mediaVariants?.length) &&
        previous?.status !== "ready"
      ) {
        newlyReadyCount++;
        recordDebug(
          "CONTENT",
          "artifact.ready",
          `Artifact ${art.artifactId.slice(0, 8)} ready ("${(
            art.title || "Untitled"
          ).slice(0, 34)}") variants=${art.mediaVariants?.length || 0}`,
          "ok"
        );
      }
    }

    if (debugDrawer) {
      debugDrawer.updateSummary({
        artifacts: artifactsById.size,
        videos: controllers.size,
      });
    }

    if (newlyReadyCount > 0) {
      for (const entry of controllers.values()) {
        if (entry.controller.cues.length === 0 && !entry.inFlight) {
          ensureSubtitlesForEntry(entry, {
            force: false,
            trigger: "player_open",
          });
        }
      }
    }

    // Background prewarm when a newly generated Video Overview transitions to `ready`
    for (const art of artifacts) {
      if (
        art.status === "ready" &&
        (art.mediaUrl || art.progressiveUrl || art.mediaVariants?.length) &&
        pendingGeneratedVideoIds.has(art.artifactId)
      ) {
        const primaryUrl =
          art.mediaVariants?.[0] || art.progressiveUrl || art.mediaUrl;
        const decision = shouldGenerateSubtitles({
          settings,
          trigger: "generate",
          force: false,
          status: "ready",
          title: art.title || getNotebookTitleFallback(),
          artifactId: art.artifactId,
          mediaToken: art.mediaToken,
          mediaUrl: primaryUrl,
          cachedKeys,
          inFlightKeys,
          exhaustedKeys,
        });
        if (decision.allow) {
          pendingGeneratedVideoIds.delete(art.artifactId);
          inFlightKeys.add(decision.cacheKey);
          startKeepalive();
          showToast(
            "Video Overview ready — generating subtitles…",
            art.title || "Untitled",
            "working",
            4500
          );
          sendRuntimeMessage({
            type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
            force: false,
            artifact: {
              cacheKey: decision.cacheKey,
              artifactId: art.artifactId,
              notebookId: art.notebookId || getNotebookIdFromUrl(),
              mediaToken: art.mediaToken,
              title: art.title || getNotebookTitleFallback(),
              language: art.language || null,
              mediaUrl: primaryUrl,
              progressiveUrl: art.progressiveUrl || primaryUrl,
              mediaVariants: art.mediaVariants || [],
              durationSeconds: art.durationSeconds || null,
            },
          })
            .then((res) => {
              if (res?.ok && res.entry?.cues?.length > 0) {
                cachedKeys.add(decision.cacheKey);
                showToast(
                  `Subtitles ready (${res.entry.cues.length} cues)`,
                  `Open "${art.title || "Video Overview"}" to watch with CC`,
                  "success",
                  4500
                );
                scanForVideos();
              }
            })
            .finally(() => {
              inFlightKeys.delete(decision.cacheKey);
              stopKeepaliveIfIdle();
            });
        }
      }
    }
  }

  function pickTargetVideoEntry() {
    if (lastActiveVideo && controllers.has(lastActiveVideo)) {
      return controllers.get(lastActiveVideo);
    }
    return [...controllers.values()].pop() || null;
  }

  function buildTabDiagnosticSnapshot() {
    const videos = [];
    for (const [video, entry] of controllers.entries()) {
      videos.push({
        connected: Boolean(video.isConnected),
        overlayMounted: Boolean(entry.controller?.host?.isConnected),
        status: entry.controller?.statusState || "idle",
        cueCount: entry.controller?.cues?.length || 0,
        duration: Number.isFinite(video.duration)
          ? Math.round(video.duration * 10) / 10
          : null,
        readyState: video.readyState,
        srcSummary: summarizeMediaUrlForDebug(video.currentSrc || video.src || ""),
      });
    }
    const artifacts = [...artifactsById.values()].map((a) => ({
      id: a.artifactId?.slice(0, 12),
      status: a.status,
      origin: a.origin || "rpc",
      variantCount: a.mediaVariants?.length || 0,
      mediaSummary: summarizeMediaUrlForDebug(
        a.mediaVariants?.[0] || a.progressiveUrl || a.mediaUrl || ""
      ),
    }));
    return {
      host: win.location?.hostname || "",
      pathname: win.location?.pathname || "",
      artifactCount: artifacts.length,
      videoCount: videos.length,
      permissionsOk,
      artifacts,
      videos,
    };
  }

  // 1. Attach `window.postMessage` listener IMMEDIATELY (synchronous at `document_start`)
  win.addEventListener("message", (event) => {
    if (event.source !== win) return;
    const msg = event.data;
    if (!msg || msg.source !== PAGE_MESSAGE.BRIDGE_SOURCE_PAGE) return;

    if (msg.type === PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE) {
      const reqId = msg.payload?.requestId;
      const pending = reqId ? pendingPageRequests.get(reqId) : null;
      if (pending) {
        clearTimeout(pending.timer);
        pendingPageRequests.delete(reqId);
        pending.resolve(msg.payload);
      }
      return;
    }

    if (msg.type === PAGE_MESSAGE.PAGE_DEBUG_EVENT) {
      const p = msg.payload || {};
      recordDebug(p.layer || "PAGE", p.event || "event", p.detail || "");
      if (p.event === "video.play") {
        scanForVideos();
      }
      return;
    }

    if (msg.type === PAGE_MESSAGE.PAGE_STATE_SNAPSHOT) {
      const snap = msg.payload || {};
      if (Array.isArray(snap.artifacts) && snap.artifacts.length > 0) {
        ingestArtifactsList(snap.artifacts, false);
      }
      recordDebug(
        "PAGE",
        "state.snapshot",
        `Synced ${snap.artifacts?.length || 0} artifact(s), ${
          snap.rpcTrace?.length || 0
        } RPC(s), ssrScanned=${Boolean(snap.ssrScanned)}`
      );
      return;
    }

    if (msg.type === PAGE_MESSAGE.BATCH_ARTIFACTS) {
      ingestArtifactsList(
        msg.payload?.artifacts || [],
        Boolean(msg.payload?.isCreateVideoRequest)
      );
    }
  });

  // 2. Capture-phase media event listeners on `doc` catch `<video>` playback even inside
  //    open Shadow DOMs (`event.composedPath()[0]`) inside Angular Material `Lot dialog`.
  const handleCapturedMediaEvent = (event) => {
    try {
      const path =
        typeof event.composedPath === "function" ? event.composedPath() : [];
      const candidate = path[0] || event.target;
      if (candidate && candidate.tagName === "VIDEO") {
        const entry = bindVideoElement(candidate);
        if (entry && (event.type === "play" || event.type === "loadedmetadata")) {
          ensureSubtitlesForEntry(entry, {
            force: false,
            trigger: "player_open",
          });
        }
      }
    } catch {
      // Ignore
    }
  };
  for (const mediaEvt of ["loadedmetadata", "canplay", "play"]) {
    doc.addEventListener?.(mediaEvt, handleCapturedMediaEvent, true);
  }

  // 3. Player keyboard shortcuts (`C`, `T`, `[`, `]`, `\`, `-`, `=`, `+`, `B`, `?`)
  doc.addEventListener?.("keydown", (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    for (const node of path) {
      const tag = (node?.tagName || "").toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        node?.isContentEditable
      ) {
        return;
      }
    }
    const active = pickTargetVideoEntry();
    if (!active) return;

    const key = e.key;
    if (key === "c" || key === "C") {
      active.controller.toggleSubtitles();
    } else if (key === "t" || key === "T") {
      active.controller.toggleTranscriptDrawer();
    } else if (key === "[") {
      active.controller.adjustOffset(-0.25);
    } else if (key === "]") {
      active.controller.adjustOffset(0.25);
    } else if (key === "\\") {
      active.controller.resetOffset();
    } else if (key === "-") {
      active.controller.stepFontSize(-1);
    } else if (key === "=" || key === "+") {
      active.controller.stepFontSize(1);
    } else if (key === "b" || key === "B") {
      active.controller.cycleCaptionStyle();
    } else if (key === "?") {
      active.controller.toggleShortcutsHelp();
    }
  });

  // 4. Listen for Popup / Options / Service Worker runtime messages (`msg.type`)
  runtime.onMessage?.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== "string") return false;
    if (!msg.type.startsWith(MESSAGE_NAMESPACE)) return false;

    if (msg.type === RUNTIME_MESSAGE.SUBTITLES_READY) {
      playCompletionChime();
      fireTabDesktopNotification(
        `Subtitles ready: ${msg.title || "Video Overview"}`,
        `${msg.cueCount || 0} cues generated via ${msg.provider || "AI"}.`
      );
      return false;
    }

    if (msg.type === RUNTIME_MESSAGE.SUBTITLES_PROGRESS) {
      const active = pickTargetVideoEntry();
      if (active && active.inFlight) {
        active.controller.setStatus("working", msg.label || "Transcribing…");
      }
      if (msg.label) {
        showToast(msg.label, msg.detail || "", "working", 0);
      }
      return false;
    }

    if (msg.type === RUNTIME_MESSAGE.SUBTITLES_PARTIAL && Array.isArray(msg.cues)) {
      const active = pickTargetVideoEntry();
      if (active && msg.cues.length > 0) {
        active.controller.setCues(msg.cues, {
          title: msg.title || active.controller.title || "Video Overview",
          language: msg.language || "en",
        });
      }
      showToast(
        `Live captions active (${msg.completedChunks}/${msg.totalChunks} segments)`,
        `${msg.cues.length} cues mounted while remaining audio transcribes`,
        "working",
        0
      );
      return false;
    }

    if (msg.type === RUNTIME_MESSAGE.DECODE_WAV_FALLBACK && msg.base64Media) {
      decodeBase64MediaToWavFallback(msg.base64Media)
        .then((chunks) => sendResponse({ ok: true, chunks }))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.GET_ACTIVE_TAB_STATE) {
      requestPageStateSnapshot();
      scanForVideos();
      const target = pickTargetVideoEntry();
      const allArts = [...artifactsById.values()];
      const readyArts = allArts.filter((a) => a.status === "ready");
      const generatingArts = allArts.filter(
        (a) => a.status === "initializing" || a.status === "processing"
      );
      const matched = target ? matchArtifactForVideo(target.video) : readyArts[readyArts.length - 1] || null;

      const hasLiveCues = Boolean(target && target.controller.cues.length > 0);
      sendResponse({
        ok: true,
        hasVideoElement: controllers.size > 0,
        videoCount: controllers.size,
        readyArtifactCount: readyArts.length,
        generatingCount: generatingArts.length,
        hasSubtitles: hasLiveCues,
        activeArtifact: matched
          ? { artifactId: matched.artifactId, title: matched.title }
          : target
            ? { title: target.controller.title || getNotebookTitleFallback() }
            : null,
        activeSubtitles: hasLiveCues
          ? {
              title:
                matched?.title ||
                target.controller.title ||
                getNotebookTitleFallback(),
              language: target.controller.language || "en",
              cues: target.controller.getExportCues(),
            }
          : null,
        diagnostics: buildTabDiagnosticSnapshot(),
      });
      return false;
    }

    if (msg.type === RUNTIME_MESSAGE.TRIGGER_ACTIVE_VIDEO) {
      requestPageStateSnapshot();
      scanForVideos();
      const target = pickTargetVideoEntry();
      if (!target) {
        // If no `<video>` element is open yet, check if a ready Studio Video Overview exists to pre-caption!
        const readyArt = [...artifactsById.values()]
          .filter((a) => a.status === "ready" && (a.mediaUrl || a.progressiveUrl || a.mediaVariants?.length))
          .pop();
        if (!readyArt) {
          sendResponse({
            ok: false,
            error: "Open a Video Overview in NotebookLM Studio first, then click Generate.",
          });
          return false;
        }
        const primaryUrl =
          readyArt.mediaVariants?.[0] || readyArt.progressiveUrl || readyArt.mediaUrl;
        const cacheKey = resolveSubtitleCacheKey({
          artifactId: readyArt.artifactId,
          mediaToken: readyArt.mediaToken,
          mediaUrl: primaryUrl,
        });
        showToast(
          "Generating subtitles in background…",
          readyArt.title || "Video Overview",
          "working",
          0
        );
        sendRuntimeMessage({
          type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
          force: Boolean(msg.force),
          artifact: {
            cacheKey,
            artifactId: readyArt.artifactId,
            notebookId: readyArt.notebookId || getNotebookIdFromUrl(),
            mediaToken: readyArt.mediaToken,
            title: readyArt.title || getNotebookTitleFallback(),
            language: readyArt.language || null,
            mediaUrl: primaryUrl,
            progressiveUrl: readyArt.progressiveUrl || primaryUrl,
            mediaVariants: readyArt.mediaVariants || [],
            durationSeconds: readyArt.durationSeconds || null,
          },
        }).then((res) => {
          if (res?.ok && res.entry?.cues?.length > 0) {
            cachedKeys.add(cacheKey);
            showToast(
              `Subtitles ready (${res.entry.cues.length} cues)`,
              `Open "${readyArt.title || "Video Overview"}" to watch with CC`,
              "success",
              4500
            );
          } else {
            showToast(
              "Subtitle generation failed",
              res?.error || "Failed",
              "error",
              6000
            );
          }
        });
        sendResponse({
          ok: true,
          title: readyArt.title || getNotebookTitleFallback(),
        });
        return false;
      }

      const matched = matchArtifactForVideo(target.video);
      const title =
        matched?.title || target.controller.title || getNotebookTitleFallback();
      ensureSubtitlesForEntry(target, {
        force: Boolean(msg.force),
        trigger: "manual",
      });
      sendResponse({
        ok: true,
        title,
        cueCount: target.controller.cues.length,
      });
      return false;
    }

    return false;
  });

  // 5. React live to Settings changes (including toggling Debug Mode without page reload)
  try {
    storage?.onChanged?.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes?.settings?.newValue) return;
      settings = { ...settings, ...changes.settings.newValue };
      syncRpcOverridesToPage();
      syncDebugDrawerLifecycle();
      for (const entry of controllers.values()) {
        entry.controller.setSettings({
          fontSize: settings.fontSize,
          captionStyle: settings.captionStyle,
          subtitleOffsetSec: settings.subtitleOffsetSec,
        });
      }
    });
  } catch {
    // Ignore restricted context
  }

  // 6. Load initial settings safely (`try/catch` guards restricted storage contexts)
  try {
    settings = await getSettings();
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }

  syncRpcOverridesToPage();
  syncDebugDrawerLifecycle();
  recordDebug(
    "CONTENT",
    "coordinator.ready",
    `Initialized on ${win.location?.hostname}${win.location?.pathname || ""}`
  );

  // Request buffered state immediately AND again once DOM finishes loading
  requestPageStateSnapshot();
  if (doc.readyState === "loading") {
    doc.addEventListener?.(
      "DOMContentLoaded",
      () => {
        requestPageStateSnapshot();
        scanForVideos();
      },
      { once: true }
    );
  }

  // 7. Attach MutationObserver once `documentElement` exists
  const attachObserver = () => {
    const rootNode = doc.body || doc.documentElement;
    if (!rootNode || typeof MutationObserver === "undefined") {
      scanForVideos();
      return null;
    }
    let scanScheduled = false;
    const obs = new MutationObserver(() => {
      if (scanScheduled) return;
      scanScheduled = true;
      setTimeout(() => {
        scanScheduled = false;
        scanForVideos();
      }, 60);
    });
    obs.observe(rootNode, { childList: true, subtree: true });
    scanForVideos();
    return obs;
  };

  let observer = attachObserver();
  if (!observer && doc.readyState === "loading") {
    doc.addEventListener?.(
      "DOMContentLoaded",
      () => {
        observer = attachObserver();
      },
      { once: true }
    );
  }

  const api = {
    scanForVideos,
    controllers,
    artifactsById,
    requestPageStateSnapshot,
    getDiagnostics: buildTabDiagnosticSnapshot,
    hideToast,
    destroy() {
      observer?.disconnect();
      debugDrawer?.destroy();
      for (const entry of controllers.values()) {
        entry.controller.destroy();
      }
      controllers.clear();
    },
  };

  win[GUARD_FLAG] = api;
  return api;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  initContentCoordinator().catch(() => {});
}

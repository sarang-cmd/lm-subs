/**
 * Isolated-World Content Script Coordinator (`src/content/content.js` -> `extension/content.js`).
 *
 * Bridges:
 * 1. `page.js` (`MAIN` world observer & first-party audio extractor) -> artifact metadata + compact audio
 * 2. `<video>` DOM lifecycle (`MutationObserver` + media events) -> `VideoSubtitleController`
 * 3. `service-worker.js` (`STAGE_AUDIO_CHUNK`, `ENSURE_SUBTITLES`, keepalive port, settings updates)
 *
 * Security invariants:
 * - Never accesses raw API keys (secret key reads live strictly in the Service Worker).
 * - Validates `event.source === window` and `event.origin === location.origin` on bridge messages.
 */

import {
  DOM_SELECTORS,
  KEEPALIVE_PORT_NAME,
  NOTEBOOK_URL_ID_REGEX,
  PAGE_MESSAGE,
  RUNTIME_MESSAGE,
} from "../config/selectors.js";
import { slicePcmIntoWavChunks } from "../lib/audio-extract.js";
import {
  extractMediaToken,
  isTrustedGoogleMediaUrl,
} from "../lib/batchexecute.js";
import {
  resolveSubtitleCacheKey,
  shouldGenerateSubtitles,
} from "../lib/decide.js";
import {
  DEFAULT_SETTINGS,
  getCachedKeysList,
  getSettings,
  saveSettings,
} from "../lib/storage.js";
import { VideoSubtitleController } from "./player-overlay.js";
import { createToastManager } from "./toast.js";

const MAX_AUTO_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1800;
const PAGE_EXTRACT_TIMEOUT_MS = 90000;

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

export function initContentCoordinator({
  win = globalThis.window,
  doc = globalThis.document,
  runtime = globalThis.chrome?.runtime,
  storageArea = globalThis.chrome?.storage?.local,
} = {}) {
  if (!win || !doc || win.__notebooklmSubtitlesContentActive__) return null;
  win.__notebooklmSubtitlesContentActive__ = true;

  const toast = createToastManager(doc);
  const artifactsById = new Map();
  const artifactsByToken = new Map();
  const generatingArtifactIds = new Set();
  const inFlightKeys = new Set();
  const exhaustedKeys = new Set();
  const retryCounts = new Map();
  const controllers = new WeakMap();
  const trackedVideos = new Set();
  const pendingPageExtractions = new Map();

  let awaitingCreatedArtifact = false;
  let cachedKeysSet = new Set();
  let currentSettings = { ...DEFAULT_SETTINGS };
  let extractReqSeq = 0;

  function currentNotebookId() {
    const m = String(win.location?.pathname || "").match(NOTEBOOK_URL_ID_REGEX);
    return m ? m[1] : null;
  }

  function syncRpcOverridesToPage() {
    if (!currentSettings.rpcOverrides) return;
    try {
      win.postMessage(
        {
          source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
          type: PAGE_MESSAGE.SYNC_RPC_OVERRIDES,
          rpcOverrides: currentSettings.rpcOverrides,
        },
        win.location.origin
      );
    } catch {
      // Ignore
    }
  }

  function sendRuntimeMessage(message) {
    if (!runtime?.sendMessage) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        runtime.sendMessage(message, (res) => {
          if (runtime.lastError) {
            resolve({ ok: false, error: runtime.lastError.message });
            return;
          }
          resolve(res || null);
        });
      } catch (err) {
        resolve({ ok: false, error: err?.message || String(err) });
      }
    });
  }

  /**
   * Opens a heartbeat port to keep the MV3 Service Worker alive across multi-minute
   * Video Overview downloads & transcriptions (`08:24`+ videos).
   */
  function openKeepaliveHeartbeat() {
    if (!runtime?.connect) return () => {};
    let port = null;
    let timer = null;
    try {
      port = runtime.connect({ name: KEEPALIVE_PORT_NAME });
      port.onDisconnect?.addListener(() => {
        port = null;
      });
      timer = setInterval(() => {
        try {
          port?.postMessage({ ping: Date.now() });
        } catch {
          // Ignore disconnected port
        }
      }, 15000);
    } catch {
      // Non-fatal in test mocks
    }
    return () => {
      if (timer) clearInterval(timer);
      try {
        port?.disconnect();
      } catch {
        // Ignore
      }
    };
  }

  /**
   * Requests first-party media fetch + `.m4a`/`.wav` audio extraction from `page.js`
   * (`MAIN` world), preserving NotebookLM's `Origin`, `Referer`, and partitioned cookies.
   */
  function requestPageAudioExtraction({ candidateUrls = [], videoCurrentSrc = "" } = {}) {
    if (!win?.postMessage || !win.location?.origin || win.location.origin === "null") {
      return Promise.resolve({ ok: false, error: "Page bridge unavailable" });
    }

    const requestId = `req_${Date.now()}_${++extractReqSeq}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingPageExtractions.delete(requestId);
        resolve({ ok: false, error: "In-page extraction timed out" });
      }, PAGE_EXTRACT_TIMEOUT_MS);

      pendingPageExtractions.set(requestId, (result) => {
        clearTimeout(timer);
        resolve(result);
      });

      try {
        win.postMessage(
          {
            source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
            type: PAGE_MESSAGE.EXTRACT_AUDIO_REQUEST,
            payload: {
              requestId,
              candidateUrls,
              videoCurrentSrc,
            },
          },
          win.location.origin
        );
      } catch (err) {
        clearTimeout(timer);
        pendingPageExtractions.delete(requestId);
        resolve({ ok: false, error: err?.message || String(err) });
      }
    });
  }

  function discoverResourceTimingMediaUrl() {
    try {
      const entries = win.performance?.getEntriesByType?.("resource") || [];
      for (let i = entries.length - 1; i >= 0; i--) {
        const url = entries[i]?.name || "";
        if (
          isTrustedGoogleMediaUrl(url) &&
          (entries[i].initiatorType === "video" ||
            /\/notebooklm\/|videoplayback|=m(?:18|22|140)/i.test(url))
        ) {
          return url;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  function inferTitleNearVideo(video) {
    const dialog = video?.closest?.('[role="dialog"], .video-player, [class*="video"]');
    const heading = dialog?.querySelector?.("h1, h2, h3, .artifact-title, [class*='title']");
    const rawHeading = heading?.textContent?.trim();
    if (rawHeading && rawHeading.length >= 3 && rawHeading.length <= 140) {
      return rawHeading;
    }
    const cleanDocTitle = doc.title
      ?.replace(/\s*[-–|]\s*(?:NotebookLM|Gemini Notebook).*$/i, "")
      .trim();
    return cleanDocTitle || "Video Overview";
  }

  async function refreshLocalState() {
    try {
      const [settings, keys] = await Promise.all([
        getSettings(storageArea),
        getCachedKeysList(storageArea),
      ]);
      currentSettings = settings;
      cachedKeysSet = new Set(keys);
      syncRpcOverridesToPage();
      for (const video of trackedVideos) {
        controllers.get(video)?.setSettings({
          fontSize: currentSettings.fontSize,
          subtitleOffsetSec: currentSettings.subtitleOffsetSec,
        });
      }
    } catch {
      // Storage unavailable during extension reload
    }
  }

  function showToastIfEnabled(opts) {
    if (!currentSettings.showToast && opts?.kind !== "error") return;
    toast.show(opts);
  }

  /**
   * Resolves the best artifact metadata for a `<video>` element.
   */
  function resolveArtifactForVideo(video) {
    const src = video?.currentSrc || video?.src || "";
    const token = extractMediaToken(src);
    if (token && artifactsByToken.has(token)) {
      return { ...artifactsByToken.get(token), videoCurrentSrc: src };
    }

    const notebookId = currentNotebookId();
    const readyCandidates = [...artifactsById.values()].filter(
      (a) =>
        a.status === "ready" &&
        a.mediaUrl &&
        (!notebookId || !a.notebookId || a.notebookId === notebookId)
    );

    if (readyCandidates.length === 1) {
      return { ...readyCandidates[0], videoCurrentSrc: src };
    }

    if (readyCandidates.length > 1) {
      const container =
        video.closest('[role="dialog"], .video-player, [class*="video"]') ||
        doc.body;
      const containerText = (container?.textContent || "").toLowerCase();
      for (const candidate of readyCandidates) {
        if (
          candidate.title &&
          containerText.includes(candidate.title.toLowerCase())
        ) {
          return { ...candidate, videoCurrentSrc: src };
        }
      }
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const byDuration = readyCandidates.find(
          (c) =>
            c.durationSeconds &&
            Math.abs(c.durationSeconds - video.duration) <= 3
        );
        if (byDuration) return { ...byDuration, videoCurrentSrc: src };
      }
      return { ...readyCandidates[0], videoCurrentSrc: src };
    }

    // Fallback when extension was loaded/reloaded on an already-open NotebookLM tab
    const perfUrl = discoverResourceTimingMediaUrl();
    const bestUrl = isTrustedGoogleMediaUrl(src)
      ? src
      : perfUrl || (src.startsWith("blob:") ? src : "");

    if (bestUrl) {
      const title = inferTitleNearVideo(video);
      const dur = Number.isFinite(video.duration) ? Math.round(video.duration) : 0;
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40);
      const fallbackToken = extractMediaToken(bestUrl);
      return {
        artifactId: fallbackToken
          ? null
          : `dom:${notebookId || "nb"}:${slug || "video"}:${dur}`,
        notebookId,
        title,
        typeCode: 3,
        status: "ready",
        language: null,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        mediaUrl: bestUrl,
        progressiveUrl: isTrustedGoogleMediaUrl(src) ? src : perfUrl,
        mediaToken: fallbackToken,
        mediaVariants: [bestUrl, perfUrl].filter(Boolean),
        videoCurrentSrc: src,
      };
    }

    return null;
  }

  function findControllersMatching({ cacheKey, artifactId, mediaToken }) {
    const matched = [];
    for (const video of trackedVideos) {
      if (!doc.contains(video)) {
        trackedVideos.delete(video);
        continue;
      }
      const ctrl = controllers.get(video);
      if (!ctrl) continue;
      const art = resolveArtifactForVideo(video);
      const vKey = resolveSubtitleCacheKey({
        artifactId: art?.artifactId,
        mediaToken: art?.mediaToken || extractMediaToken(video.currentSrc || video.src),
        mediaUrl: art?.mediaUrl || video.currentSrc || video.src,
      });
      if (
        (cacheKey && vKey === cacheKey) ||
        (artifactId && art?.artifactId === artifactId) ||
        (mediaToken && art?.mediaToken === mediaToken)
      ) {
        matched.push(ctrl);
      }
    }
    return matched;
  }

  /**
   * Stages pre-extracted audio chunks to the Service Worker one chunk at a time
   * so multi-chunk recordings never approach Chrome's 64 MB single-message IPC cap.
   */
  async function stageExtractedChunksToWorker(pageExtraction) {
    const stagedJobId = `stage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    for (let i = 0; i < pageExtraction.chunks.length; i++) {
      const ch = pageExtraction.chunks[i];
      const bytes = new Uint8Array(ch.buffer);
      const res = await sendRuntimeMessage({
        type: RUNTIME_MESSAGE.STAGE_AUDIO_CHUNK,
        stagedJobId,
        index: i,
        totalChunks: pageExtraction.chunks.length,
        originalBytes: pageExtraction.originalBytes,
        extractedBytes: pageExtraction.extractedBytes,
        chunk: {
          base64: uint8ToBase64(bytes),
          mimeType: ch.mimeType,
          fileName: ch.fileName,
          startOffsetSec: ch.startOffsetSec || 0,
          durationSec: ch.durationSec || null,
        },
      });
      if (!res?.ok) {
        return null;
      }
    }
    return stagedJobId;
  }

  async function requestSubtitlesForArtifact(
    artifact,
    { trigger = "player_open", force = false } = {}
  ) {
    if (!artifact) return;

    const cacheKey = resolveSubtitleCacheKey({
      artifactId: artifact.artifactId,
      mediaToken: artifact.mediaToken,
      mediaUrl: artifact.mediaUrl,
    });

    // 1. Check cache first unless forced regeneration
    if (!force && cacheKey) {
      const cachedRes = await sendRuntimeMessage({
        type: RUNTIME_MESSAGE.GET_CACHED_SUBTITLES,
        cacheKey,
        artifactId: artifact.artifactId,
        mediaToken: artifact.mediaToken,
      });
      if (cachedRes?.ok && cachedRes.entry?.cues?.length > 0) {
        cachedKeysSet.add(cacheKey);
        applyCuesToMatchingPlayers(cachedRes.entry);
        return;
      }
    }

    // 2. Evaluate pure decision gate
    const decision = shouldGenerateSubtitles({
      settings: currentSettings,
      trigger,
      force,
      typeCode: artifact.typeCode ?? 3,
      status: artifact.status || "ready",
      title: artifact.title || "",
      artifactId: artifact.artifactId,
      mediaToken: artifact.mediaToken,
      mediaUrl: artifact.mediaUrl,
      cachedKeys: cachedKeysSet,
      inFlightKeys,
      exhaustedKeys,
    });

    if (!decision.allow || !decision.cacheKey) {
      return;
    }

    const key = decision.cacheKey;
    inFlightKeys.add(key);

    const matchingCtrls = findControllersMatching({
      cacheKey: key,
      artifactId: artifact.artifactId,
      mediaToken: artifact.mediaToken,
    });
    for (const c of matchingCtrls) {
      c.setStatus("working", "Extracting audio…");
    }

    showToastIfEnabled({
      title: "Generating Video Overview subtitles…",
      detail: artifact.title || "Extracting compact audio track",
      kind: "working",
      durationMs: 0,
    });

    const closeKeepalive = openKeepaliveHeartbeat();
    let response = null;

    try {
      // Layer 1: First-party in-page fetch + `.m4a`/`.wav` slimming (carries exact Google session & Referer)
      const candidateUrls = [
        artifact.progressiveUrl,
        artifact.mediaUrl,
        ...(Array.isArray(artifact.mediaVariants) ? artifact.mediaVariants : []),
      ].filter(Boolean);

      const pageAudio = await requestPageAudioExtraction({
        candidateUrls,
        videoCurrentSrc: artifact.videoCurrentSrc || "",
      });

      let stagedJobId = null;
      let mergedArtifact = {
        ...artifact,
        cacheKey: key,
        notebookId: artifact.notebookId || currentNotebookId(),
      };

      if (pageAudio?.ok && Array.isArray(pageAudio.chunks) && pageAudio.chunks.length > 0) {
        const origMb = (pageAudio.originalBytes / 1048576).toFixed(1);
        const extMb = (pageAudio.extractedBytes / 1048576).toFixed(1);
        for (const c of matchingCtrls) {
          c.setStatus("working", "Transcribing…");
        }
        showToastIfEnabled({
          title: "Audio extracted · Transcribing…",
          detail: `${origMb} MB video -> ${extMb} MB audio`,
          kind: "working",
          durationMs: 0,
        });
        stagedJobId = await stageExtractedChunksToWorker(pageAudio);
      } else if (Array.isArray(pageAudio?.discoveredMediaUrls) && pageAudio.discoveredMediaUrls.length > 0) {
        const extra = pageAudio.discoveredMediaUrls;
        if (!isTrustedGoogleMediaUrl(mergedArtifact.mediaUrl) && extra[0]) {
          mergedArtifact.mediaUrl = extra[0];
        }
        mergedArtifact.mediaVariants = [
          ...(mergedArtifact.mediaVariants || []),
          ...extra,
        ];
      }

      // Layer 2: Dispatch to Service Worker (transcribes staged audio or performs CORS-bypass fetch)
      response = await sendRuntimeMessage({
        type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
        force,
        stagedJobId,
        pageFetchError: pageAudio?.ok ? null : pageAudio?.error || null,
        artifact: mergedArtifact,
      });
    } finally {
      closeKeepalive();
      inFlightKeys.delete(key);
    }

    if (response?.ok && response.entry?.cues?.length > 0) {
      retryCounts.delete(key);
      exhaustedKeys.delete(key);
      cachedKeysSet.add(key);
      applyCuesToMatchingPlayers(response.entry);

      const providerBadge = response.entry.failoverUsed
        ? `${response.entry.provider} (failover)`
        : response.entry.provider;
      showToastIfEnabled({
        title: `Subtitles ready · ${response.entry.cues.length} cues`,
        detail: `Transcribed via ${providerBadge}`,
        kind: "success",
        durationMs: 4200,
      });
      return;
    }

    const errMsg = response?.error || "Subtitle generation failed.";
    const prevRetries = retryCounts.get(key) || 0;
    const isNonRetryableError =
      /no stt api key|missing api key|401|403|reload this notebooklm tab/i.test(
        errMsg
      );

    if (!force && !isNonRetryableError && prevRetries < MAX_AUTO_RETRIES) {
      const nextAttempt = prevRetries + 1;
      retryCounts.set(key, nextAttempt);
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, prevRetries);
      for (const c of matchingCtrls) {
        c.setStatus("working", `Retrying (${nextAttempt}/${MAX_AUTO_RETRIES})…`);
      }
      setTimeout(() => {
        requestSubtitlesForArtifact(artifact, { trigger, force: false });
      }, delayMs);
      return;
    }

    exhaustedKeys.add(key);
    for (const c of matchingCtrls) {
      c.setStatus("error", "Subtitle error");
    }
    showToastIfEnabled({
      title: "Could not generate subtitles",
      detail: errMsg,
      kind: "error",
      durationMs: 7500,
    });
  }

  function applyCuesToMatchingPlayers(entry) {
    if (!entry?.cues?.length) return;
    const matched = findControllersMatching({
      cacheKey: entry.cacheKey,
      artifactId: entry.artifactId,
      mediaToken: entry.mediaToken,
    });
    for (const ctrl of matched) {
      ctrl.setCues(entry.cues, {
        title: entry.title,
        language: entry.language,
      });
    }
  }

  function attachControllerToVideo(video) {
    if (!video || controllers.has(video)) return;
    trackedVideos.add(video);

    const ctrl = new VideoSubtitleController(video, {
      doc,
      initialFontSize: currentSettings.fontSize,
      initialOffsetSec: currentSettings.subtitleOffsetSec,
      onRequestGenerate: ({ force } = {}) => {
        const art = resolveArtifactForVideo(video);
        if (!art) {
          showToastIfEnabled({
            title: "Waiting for Video Overview stream",
            detail: "Press Play once so NotebookLM loads the video source.",
            kind: "info",
            durationMs: 4000,
          });
          return;
        }
        requestSubtitlesForArtifact(art, {
          trigger: "manual",
          force: Boolean(force),
        });
      },
      onOffsetChange: (offsetSec) => {
        currentSettings.subtitleOffsetSec = offsetSec;
        saveSettings({ subtitleOffsetSec: offsetSec }, storageArea).catch(() => {});
      },
      onFontSizeChange: (fontSize) => {
        currentSettings.fontSize = fontSize;
        saveSettings({ fontSize }, storageArea).catch(() => {});
      },
      onImportSubtitles: (cues, fileName) => {
        const art = resolveArtifactForVideo(video);
        const cacheKey =
          resolveSubtitleCacheKey({
            artifactId: art?.artifactId,
            mediaToken: art?.mediaToken,
            mediaUrl: art?.mediaUrl || video.currentSrc || video.src,
          }) || `import:${Date.now()}`;
        sendRuntimeMessage({
          type: RUNTIME_MESSAGE.SAVE_IMPORTED_SUBTITLES,
          entry: {
            cacheKey,
            artifactId: art?.artifactId || null,
            notebookId: art?.notebookId || currentNotebookId(),
            mediaToken: art?.mediaToken || null,
            title: art?.title || fileName.replace(/\.(srt|vtt)$/i, ""),
            provider: "imported",
            model: fileName,
            cues,
          },
        });
        showToastIfEnabled({
          title: `Imported ${cues.length} subtitle cues`,
          detail: fileName,
          kind: "success",
        });
      },
    });

    controllers.set(video, ctrl);

    const tryBindVideo = () => {
      const art = resolveArtifactForVideo(video);
      if (art) {
        requestSubtitlesForArtifact(art, { trigger: "player_open", force: false });
      }
    };

    video.addEventListener("loadedmetadata", tryBindVideo);
    video.addEventListener("play", tryBindVideo, { once: true });
    if (video.readyState >= 1 || video.currentSrc || video.src) {
      tryBindVideo();
    }
  }

  function scanForVideos(root = doc) {
    if (!root?.querySelectorAll) return;
    const videos = root.querySelectorAll(DOM_SELECTORS.VIDEO_ELEMENT);
    for (const v of videos) {
      attachControllerToVideo(v);
    }
  }

  function handleBatchexecuteMessage(payload) {
    if (!payload || typeof payload !== "object") return;

    if (payload.isCreateVideoRequest) {
      awaitingCreatedArtifact = true;
      showToastIfEnabled({
        title: "Video Overview requested",
        detail: "Subtitles will be generated automatically as soon as video rendering finishes.",
        kind: "working",
        durationMs: 5000,
      });
    }

    const artifacts = Array.isArray(payload.artifacts) ? payload.artifacts : [];
    for (const art of artifacts) {
      if (!art?.artifactId) continue;
      const previous = artifactsById.get(art.artifactId);
      artifactsById.set(art.artifactId, art);
      if (art.mediaToken) {
        artifactsByToken.set(art.mediaToken, art);
      }

      if (
        art.status === "processing" ||
        art.status === "initializing" ||
        art.status === "initialized"
      ) {
        generatingArtifactIds.add(art.artifactId);
        awaitingCreatedArtifact = false;
        continue;
      }

      if (art.status === "ready" && art.mediaUrl) {
        const wasGenerating =
          generatingArtifactIds.has(art.artifactId) ||
          (awaitingCreatedArtifact && !previous);
        generatingArtifactIds.delete(art.artifactId);
        if (wasGenerating) {
          awaitingCreatedArtifact = false;
          requestSubtitlesForArtifact(art, { trigger: "generate", force: false });
        } else {
          for (const video of trackedVideos) {
            const resolved = resolveArtifactForVideo(video);
            if (resolved && resolved.artifactId === art.artifactId) {
              requestSubtitlesForArtifact(resolved, {
                trigger: "player_open",
                force: false,
              });
            }
          }
        }
      }
    }
  }

  // Listen to MAIN-world bridge messages
  win.addEventListener("message", (event) => {
    if (event.source !== win) return;
    if (
      win.location?.origin &&
      win.location.origin !== "null" &&
      event.origin !== win.location.origin
    ) {
      return;
    }
    const msg = event.data;
    if (!msg || msg.source !== PAGE_MESSAGE.BRIDGE_SOURCE_PAGE) return;

    if (msg.type === PAGE_MESSAGE.BATCH_ARTIFACTS) {
      handleBatchexecuteMessage(msg.payload);
      return;
    }

    if (msg.type === PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE) {
      const resolver = pendingPageExtractions.get(msg.payload?.requestId);
      if (resolver) {
        pendingPageExtractions.delete(msg.payload.requestId);
        resolver(msg.payload);
      }
    }
  });

  // Listen to Service Worker progress & popup manual triggers
  runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== "string") return false;

    if (msg.type === RUNTIME_MESSAGE.SUBTITLES_PROGRESS) {
      const matched = findControllersMatching({
        cacheKey: msg.cacheKey,
        artifactId: msg.artifactId,
        mediaToken: msg.mediaToken,
      });
      for (const c of matched) {
        c.setStatus("working", msg.label || "Transcribing…");
      }
      if (msg.label) {
        showToastIfEnabled({
          title: msg.label,
          detail: msg.detail || "",
          kind: "working",
          durationMs: 0,
        });
      }
      sendResponse?.({ ok: true });
      return false;
    }

    if (msg.type === RUNTIME_MESSAGE.SUBTITLES_READY && msg.entry) {
      cachedKeysSet.add(msg.entry.cacheKey);
      applyCuesToMatchingPlayers(msg.entry);
      sendResponse?.({ ok: true });
      return false;
    }

    if (msg.type === RUNTIME_MESSAGE.GET_ACTIVE_TAB_STATE) {
      const activeVideos = [...trackedVideos].filter((v) => doc.contains(v));
      const primaryVideo = activeVideos[0] || null;
      const art = primaryVideo
        ? resolveArtifactForVideo(primaryVideo)
        : [...artifactsById.values()].find((a) => a.status === "ready") || null;
      sendResponse?.({
        ok: true,
        hasVideoElement: activeVideos.length > 0,
        readyArtifactCount: [...artifactsById.values()].filter(
          (a) => a.status === "ready"
        ).length,
        generatingCount: generatingArtifactIds.size,
        activeArtifact: art,
      });
      return false;
    }

    if (msg.type === RUNTIME_MESSAGE.TRIGGER_ACTIVE_VIDEO) {
      const activeVideos = [...trackedVideos].filter((v) => doc.contains(v));
      const primaryVideo = activeVideos[0] || null;
      const art = primaryVideo
        ? resolveArtifactForVideo(primaryVideo)
        : [...artifactsById.values()].find((a) => a.status === "ready") || null;

      if (!art) {
        sendResponse?.({
          ok: false,
          error:
            "No ready Video Overview found on this tab yet. Open or generate a Video Overview in Studio first.",
        });
        return false;
      }

      requestSubtitlesForArtifact(art, {
        trigger: "manual",
        force: Boolean(msg.force),
      });
      sendResponse?.({ ok: true, started: true, title: art.title });
      return false;
    }

    if (msg.type === "NOTEBOOKLM_SUBTITLES_DECODE_WAV_FALLBACK" && msg.base64Media) {
      (async () => {
        try {
          const bin = atob(msg.base64Media);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const AudioCtx = win.AudioContext || win.webkitAudioContext;
          const ctx = new AudioCtx();
          const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
          await ctx.close();
          const targetRate = decoded.duration > 600 ? 12000 : 16000;
          const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
          const offline = new win.OfflineAudioContext(1, length, targetRate);
          const src = offline.createBufferSource();
          src.buffer = decoded;
          src.connect(offline.destination);
          src.start(0);
          const rendered = await offline.startRendering();
          const samples = rendered.getChannelData(0);
          const wavChunks = slicePcmIntoWavChunks(samples, targetRate, 14 * 1024 * 1024);
          const encodedChunks = wavChunks.map((ch, idx) => ({
            base64: uint8ToBase64(ch.bytes),
            mimeType: "audio/wav",
            fileName: ch.fileName || `chunk-${idx + 1}.wav`,
            startOffsetSec: ch.startOffsetSec,
            durationSec: ch.durationSec,
          }));
          sendResponse?.({ ok: true, chunks: encodedChunks });
        } catch (err) {
          sendResponse?.({ ok: false, error: err?.message || String(err) });
        }
      })();
      return true;
    }

    return false;
  });

  globalThis.chrome?.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName === "local" && (changes.settings || changes.subtitleCache)) {
      refreshLocalState();
    }
  });

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === "VIDEO") {
          attachControllerToVideo(node);
        } else if (node.querySelectorAll) {
          scanForVideos(node);
        }
      }
    }
  });

  const start = async () => {
    await refreshLocalState();
    scanForVideos(doc);
    if (doc.documentElement) {
      observer.observe(doc.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  };

  start();

  return {
    handleBatchexecuteMessage,
    scanForVideos,
    artifactsById,
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  initContentCoordinator();
}

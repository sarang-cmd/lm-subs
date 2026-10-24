/**
 * Isolated-World Content Script Coordinator (`src/content/content.js` -> `extension/content.js`).
 *
 * Bridges:
 * 1. `page.js` (`MAIN` world `batchexecute` observer) -> artifact metadata (`artifactId`, CDN URLs, language)
 * 2. `<video>` DOM lifecycle (`MutationObserver` + media events) -> `VideoSubtitleController`
 * 3. `service-worker.js` (`ENSURE_SUBTITLES`, `SAVE_IMPORTED_SUBTITLES`, settings updates)
 *
 * Security invariants:
 * - Never accesses raw API keys (secret key reads live strictly in the Service Worker).
 * - Validates `event.source === window` and `event.origin === location.origin` on bridge messages.
 */

import {
  DOM_SELECTORS,
  NOTEBOOK_URL_ID_REGEX,
  PAGE_MESSAGE,
  RUNTIME_MESSAGE,
} from "../config/selectors.js";
import {
  encodeMonoWav16Bit,
  slicePcmIntoWavChunks,
} from "../lib/audio-extract.js";
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

  let awaitingCreatedArtifact = false;
  let cachedKeysSet = new Set();
  let currentSettings = { ...DEFAULT_SETTINGS };

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
      return artifactsByToken.get(token);
    }

    // If MSE `blob:` URL is active, match against ready Video Overviews in the current notebook
    const notebookId = currentNotebookId();
    const readyCandidates = [...artifactsById.values()].filter(
      (a) =>
        a.status === "ready" &&
        a.mediaUrl &&
        (!notebookId || !a.notebookId || a.notebookId === notebookId)
    );

    if (readyCandidates.length === 1) {
      return readyCandidates[0];
    }

    if (readyCandidates.length > 1) {
      // Try matching visible dialog / player title text
      const container =
        video.closest('[role="dialog"], .video-player, [class*="video"]') ||
        doc.body;
      const containerText = (container?.textContent || "").toLowerCase();
      for (const candidate of readyCandidates) {
        if (
          candidate.title &&
          containerText.includes(candidate.title.toLowerCase())
        ) {
          return candidate;
        }
      }
      // Fall back to duration match if video duration is known
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const byDuration = readyCandidates.find(
          (c) =>
            c.durationSeconds &&
            Math.abs(c.durationSeconds - video.duration) <= 3
        );
        if (byDuration) return byDuration;
      }
      return readyCandidates[0];
    }

    // Direct Google CDN URL on `<video src="https://lh3.googleusercontent.com/...">`
    if (isTrustedGoogleMediaUrl(src)) {
      return {
        artifactId: null,
        notebookId,
        title: doc.title?.replace(/\s*-\s*NotebookLM.*$/i, "") || "Video Overview",
        typeCode: 3,
        status: "ready",
        language: null,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        mediaUrl: src,
        mediaToken: token,
        audioVariantUrls: [],
        videoVariantUrls: [src],
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

    const response = await sendRuntimeMessage({
      type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
      force,
      artifact: {
        ...artifact,
        cacheKey: key,
        notebookId: artifact.notebookId || currentNotebookId(),
      },
    });

    inFlightKeys.delete(key);

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
    const isAuthOrConfigError = /no stt api key|missing api key|401|403/i.test(errMsg);

    if (!force && !isAuthOrConfigError && prevRetries < MAX_AUTO_RETRIES) {
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
      durationMs: 6500,
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
          // Newly generated Video Overview just finished -> transcribe right away!
          requestSubtitlesForArtifact(art, { trigger: "generate", force: false });
        } else {
          // Existing Video Overview -> bind if its `<video>` is already mounted in DOM
          for (const video of trackedVideos) {
            const resolved = resolveArtifactForVideo(video);
            if (resolved && resolved.artifactId === art.artifactId) {
              requestSubtitlesForArtifact(art, {
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
    if (
      msg &&
      msg.source === PAGE_MESSAGE.BRIDGE_SOURCE_PAGE &&
      msg.type === PAGE_MESSAGE.BATCH_ARTIFACTS
    ) {
      handleBatchexecuteMessage(msg.payload);
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
      // Browser WebAudio 16kHz mono fallback for non-MP4 or oversized containers
      (async () => {
        try {
          const bin = atob(msg.base64Media);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const AudioCtx = win.AudioContext || win.webkitAudioContext;
          const ctx = new AudioCtx();
          const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
          await ctx.close();
          const targetRate = 16000;
          const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
          const offline = new win.OfflineAudioContext(1, length, targetRate);
          const src = offline.createBufferSource();
          src.buffer = decoded;
          src.connect(offline.destination);
          src.start(0);
          const rendered = await offline.startRendering();
          const samples = rendered.getChannelData(0);
          const wavChunks = slicePcmIntoWavChunks(samples, targetRate);
          // Encode chunks back to base64
          const encodedChunks = wavChunks.map((ch, idx) => {
            let s = "";
            const CHUNK = 0x8000;
            for (let i = 0; i < ch.bytes.length; i += CHUNK) {
              s += String.fromCharCode.apply(
                null,
                ch.bytes.subarray(i, i + CHUNK)
              );
            }
            return {
              base64: btoa(s),
              mimeType: "audio/wav",
              fileName: ch.fileName || `chunk-${idx + 1}.wav`,
              startOffsetSec: ch.startOffsetSec,
              durationSec: ch.durationSec,
            };
          });
          sendResponse?.({ ok: true, chunks: encodedChunks });
        } catch (err) {
          sendResponse?.({ ok: false, error: err?.message || String(err) });
        }
      })();
      return true;
    }

    return false;
  });

  // React to settings updates from Popup / Options immediately
  globalThis.chrome?.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName === "local" && (changes.settings || changes.subtitleCache)) {
      refreshLocalState();
    }
  });

  // Observe DOM for dynamically mounted NotebookLM `<video>` players
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

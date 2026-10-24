/**
 * Manifest V3 Background Service Worker (`src/background/service-worker.js` -> `extension/background.js`).
 *
 * Security & architecture invariants:
 * - This is the ONLY module in the extension permitted to call `getApiKey` / `getSecretApiKeysMap`.
 * - Enforces `isTrustedGoogleMediaUrl()` SSRF validation before authenticated media downloads.
 * - Strips video tracks client-side via `extractAudioTrackFromMp4()` so only compact `.m4a`
 *   audio (or 16 kHz mono `.wav`) is ever sent to the user's chosen STT provider.
 */

import { MESSAGE_NAMESPACE, RUNTIME_MESSAGE } from "../config/selectors.js";
import {
  createTestSpeechCadenceWav,
  extractAudioTrackFromMp4,
  validateMediaPayload,
} from "../lib/audio-extract.js";
import {
  deriveGoogleMediaVariants,
  extractMediaToken,
  isTrustedGoogleMediaUrl,
} from "../lib/batchexecute.js";
import { resolveSubtitleCacheKey } from "../lib/decide.js";
import {
  getProviderOriginPattern,
  getProviderSpec,
  redactSecrets,
  transcribeSingleChunk,
  transcribeWithQueue,
} from "../lib/providers/index.js";
import {
  findCachedSubtitles,
  getApiKey,
  getModelForProvider,
  getSecretApiKeysMap,
  getSettings,
  saveCachedSubtitles,
  setLastStatus,
} from "../lib/storage.js";

function base64ToUint8(b64) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function uint8ToBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
  }
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

function formatMegabytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createRuntimeDispatcher({
  storageArea = globalThis.chrome?.storage?.local,
  fetchImpl = globalThis.fetch,
  tabsApi = globalThis.chrome?.tabs,
  permissionsApi = globalThis.chrome?.permissions,
} = {}) {
  const inFlightPromises = new Map();

  function notifyTabProgress(tabId, payload) {
    if (!tabId || !tabsApi?.sendMessage) return;
    try {
      tabsApi.sendMessage(
        tabId,
        {
          type: RUNTIME_MESSAGE.SUBTITLES_PROGRESS,
          ...payload,
        },
        () => {
          // Ignore chrome.runtime.lastError if tab closed
          void globalThis.chrome?.runtime?.lastError;
        }
      );
    } catch {
      // Ignore
    }
  }

  async function checkProviderOriginPermission(providerId, customBaseUrl = "") {
    if (!permissionsApi?.contains) return true;
    const origin = getProviderOriginPattern(providerId, customBaseUrl);
    if (!origin) return true;
    try {
      return await permissionsApi.contains({ origins: [origin] });
    } catch {
      return true;
    }
  }

  /**
   * Downloads media from NotebookLM's Google CDN (`lh3.googleusercontent.com`)
   * using user session cookies, trying compact audio-only variants first (`=m140-dv`)
   * and falling back to progressive MP4 (`=m18` / `=m22-dv`) with local ISO-BMFF
   * `soun`-track extraction.
   */
  async function fetchAndExtractCompactAudio(artifact, tabId) {
    const rawCandidates = [
      ...deriveGoogleMediaVariants(artifact.mediaUrl),
      ...(Array.isArray(artifact.mediaVariants) ? artifact.mediaVariants : []),
      artifact.progressiveUrl,
      artifact.mediaUrl,
    ].filter(Boolean);

    const allCandidateUrls = [...new Set(rawCandidates)].filter((u) =>
      isTrustedGoogleMediaUrl(u)
    );

    if (allCandidateUrls.length === 0) {
      throw new Error(
        "Untrusted or missing NotebookLM media URL. Refusing network download."
      );
    }

    let downloadedBytes = null;
    let downloadedContentType = "";
    let lastDownloadErr = "Failed to fetch Video Overview media stream.";

    for (const candidateUrl of allCandidateUrls) {
      try {
        const res = await fetchImpl(candidateUrl, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          lastDownloadErr = `Media CDN returned HTTP ${res.status}`;
          continue;
        }
        const ct = res.headers?.get?.("content-type") || "";
        const buf = new Uint8Array(await res.arrayBuffer());
        downloadedBytes = validateMediaPayload(buf, ct);
        downloadedContentType = ct.toLowerCase();
        break;
      } catch (err) {
        lastDownloadErr = err?.message || String(err);
      }
    }

    if (!downloadedBytes) {
      throw new Error(lastDownloadErr);
    }

    const originalBytes = downloadedBytes.byteLength;

    // Pure-JS lossless ISO-BMFF audio-track extraction (`mp4` -> `.m4a` `soun` track)
    const extracted = extractAudioTrackFromMp4(downloadedBytes);
    if (extracted && extracted.bytes) {
      notifyTabProgress(tabId, {
        cacheKey: artifact.cacheKey,
        artifactId: artifact.artifactId,
        mediaToken: artifact.mediaToken,
        label: "Audio extracted · Transcribing…",
        detail: `${formatMegabytes(originalBytes)} video -> ${formatMegabytes(
          extracted.extractedBytes
        )} .m4a`,
      });
      return {
        originalBytes,
        extractedBytes: extracted.extractedBytes,
        durationSeconds: artifact.durationSeconds || null,
        chunks: [
          {
            bytes: extracted.bytes,
            mimeType: extracted.mimeType || "audio/mp4",
            fileName: extracted.fileName || "overview-audio.m4a",
            startOffsetSec: 0,
            durationSec: artifact.durationSeconds || null,
          },
        ],
      };
    }

    {
      // If already a compact non-MP4 audio file (e.g., WebM/WAV), pass directly or decode via tab WebAudio
      if (originalBytes <= 23 * 1024 * 1024) {
        const isWebm = downloadedContentType.includes("webm");
        const isWav = downloadedContentType.includes("wav");
        return {
          originalBytes,
          extractedBytes: originalBytes,
          durationSeconds: artifact.durationSeconds || null,
          chunks: [
            {
              bytes: downloadedBytes,
              mimeType: isWav
                ? "audio/wav"
                : isWebm
                  ? "audio/webm"
                  : "audio/mp4",
              fileName: isWav
                ? "overview-audio.wav"
                : isWebm
                  ? "overview-audio.webm"
                  : "overview-audio.m4a",
              startOffsetSec: 0,
              durationSec: artifact.durationSeconds || null,
            },
          ],
        };
      }

      // Oversized non-MP4 container -> request 16kHz mono WAV chunking from content script WebAudio
      if (tabId && tabsApi?.sendMessage) {
        const decodedRes = await new Promise((resolve) => {
          tabsApi.sendMessage(
            tabId,
            {
              type: "NOTEBOOKLM_SUBTITLES_DECODE_WAV_FALLBACK",
              base64Media: uint8ToBase64(downloadedBytes),
            },
            (resp) => resolve(resp || null)
          );
        });
        if (decodedRes?.ok && Array.isArray(decodedRes.chunks) && decodedRes.chunks.length > 0) {
          const chunks = decodedRes.chunks.map((c) => ({
            bytes: base64ToUint8(c.base64),
            mimeType: c.mimeType,
            fileName: c.fileName,
            startOffsetSec: c.startOffsetSec,
            durationSec: c.durationSec,
          }));
          const extractedBytes = chunks.reduce((acc, c) => acc + c.bytes.byteLength, 0);
          return {
            originalBytes,
            extractedBytes,
            durationSeconds: artifact.durationSeconds || null,
            chunks,
          };
        }
      }

      throw new Error(
        "Unable to extract compact audio from media container."
      );
    }
  }

  async function handleEnsureSubtitles(msg, sender) {
    const artifact = msg?.artifact;
    if (!artifact || typeof artifact !== "object") {
      return { ok: false, error: "Missing Video Overview metadata." };
    }

    const mediaToken =
      artifact.mediaToken || extractMediaToken(artifact.mediaUrl);
    const cacheKey =
      artifact.cacheKey ||
      resolveSubtitleCacheKey({
        artifactId: artifact.artifactId,
        mediaToken,
        mediaUrl: artifact.mediaUrl,
      });

    if (!cacheKey) {
      return { ok: false, error: "Missing Video Overview identifier." };
    }

    if (!msg.force) {
      const existing = await findCachedSubtitles(
        { cacheKey, artifactId: artifact.artifactId, mediaToken },
        storageArea
      );
      if (existing) {
        return { ok: true, cached: true, entry: existing };
      }
    }

    if (inFlightPromises.has(cacheKey)) {
      return inFlightPromises.get(cacheKey);
    }

    const tabId = sender?.tab?.id || null;

    const jobPromise = (async () => {
      const [settings, secretKeysMap] = await Promise.all([
        getSettings(storageArea),
        getSecretApiKeysMap(storageArea),
      ]);

      // Build ordered candidate queue, filtering to providers with granted host permission
      const candidates = [];
      for (const providerId of settings.queueOrder) {
        const spec = getProviderSpec(providerId);
        const apiKey = secretKeysMap[providerId] || "";
        const enabledCustom =
          providerId === "custom" &&
          (settings.customEnabled || Boolean(settings.customBaseUrl));

        if (spec.requiresKey && !apiKey) continue;
        if (!spec.requiresKey && !enabledCustom) continue;

        const hasPerm = await checkProviderOriginPermission(
          providerId,
          settings.customBaseUrl
        );
        if (!hasPerm) continue;

        candidates.push({
          providerId,
          model: getModelForProvider(settings, providerId),
          apiKey,
          customBaseUrl: settings.customBaseUrl || "",
          enabledInQueue: true,
        });
      }

      if (candidates.length === 0) {
        const noKeyMsg =
          "No STT API key configured (or host permission not granted). Open the Subtitles for NotebookLM popup and save a free Groq or Mistral key.";
        await setLastStatus(
          {
            state: "error",
            title: artifact.title || "Video Overview",
            message: noKeyMsg,
          },
          storageArea
        );
        return { ok: false, error: noKeyMsg };
      }

      await setLastStatus(
        {
          state: "working",
          title: artifact.title || "Video Overview",
          message: `Extracting audio & transcribing via ${getProviderSpec(candidates[0].providerId).name}…`,
        },
        storageArea
      );

      notifyTabProgress(tabId, {
        cacheKey,
        artifactId: artifact.artifactId,
        mediaToken,
        label: "Downloading & extracting audio track…",
        detail: artifact.title || "",
      });

      const audioBundle = await fetchAndExtractCompactAudio(
        { ...artifact, cacheKey, mediaToken },
        tabId
      );

      const language =
        settings.languageHint && settings.languageHint !== "auto"
          ? settings.languageHint
          : artifact.language || null;

      const txResult = await transcribeWithQueue({
        chunks: audioBundle.chunks,
        candidates,
        language,
        translateTo: settings.translateTo || "original",
        fetchImpl,
      });

      if (!txResult.cues || txResult.cues.length === 0) {
        throw new Error(
          `${txResult.providerName} returned 0 subtitle cues for this audio.`
        );
      }

      const savedEntry = await saveCachedSubtitles(
        {
          cacheKey,
          artifactId: artifact.artifactId || null,
          notebookId: artifact.notebookId || null,
          mediaToken: mediaToken || null,
          title: artifact.title || "NotebookLM Video Overview",
          language: language || "en",
          provider: txResult.provider,
          model: txResult.model,
          failoverUsed: txResult.failoverUsed,
          durationSeconds: audioBundle.durationSeconds,
          extractedBytes: audioBundle.extractedBytes,
          originalBytes: audioBundle.originalBytes,
          latencyMs: txResult.latencyMs,
          cues: txResult.cues,
        },
        storageArea
      );

      await setLastStatus(
        {
          state: "success",
          title: savedEntry.title,
          provider: txResult.provider,
          model: txResult.model,
          failoverUsed: txResult.failoverUsed,
          cueCount: savedEntry.cueCount,
          extractedBytes: audioBundle.extractedBytes,
          originalBytes: audioBundle.originalBytes,
          latencyMs: txResult.latencyMs,
          message: `Generated ${savedEntry.cueCount} cues via ${txResult.providerName}`,
        },
        storageArea
      );

      return { ok: true, cached: false, entry: savedEntry };
    })()
      .catch(async (err) => {
        const secretsMap = await getSecretApiKeysMap(storageArea).catch(() => ({}));
        const safeError = redactSecrets(
          err?.message || String(err),
          Object.values(secretsMap)
        );
        await setLastStatus(
          {
            state: "error",
            title: artifact.title || "Video Overview",
            message: safeError,
          },
          storageArea
        ).catch(() => {});
        return { ok: false, error: safeError };
      })
      .finally(() => {
        inFlightPromises.delete(cacheKey);
      });

    inFlightPromises.set(cacheKey, jobPromise);
    return jobPromise;
  }

  async function handleTestProvider(msg) {
    const providerId = msg?.providerId || "groq";
    const spec = getProviderSpec(providerId);
    const settings = await getSettings(storageArea);
    const savedKey = await getApiKey(providerId, storageArea);
    const apiKey =
      typeof msg?.unsavedApiKey === "string" && msg.unsavedApiKey.trim()
        ? msg.unsavedApiKey.trim()
        : savedKey;

    if (spec.requiresKey && !apiKey) {
      return {
        ok: false,
        error: `Enter or save a ${spec.name} API key first.`,
      };
    }

    const model =
      (typeof msg?.model === "string" && msg.model.trim()) ||
      getModelForProvider(settings, providerId);
    const customBaseUrl =
      typeof msg?.customBaseUrl === "string"
        ? msg.customBaseUrl.trim()
        : settings.customBaseUrl;

    const testWav = createTestSpeechCadenceWav();
    const startedAt = Date.now();

    try {
      await transcribeSingleChunk({
        providerId,
        model,
        apiKey,
        customBaseUrl,
        audioBytes: testWav,
        mimeType: "audio/wav",
        fileName: "connection-test.wav",
        language: "en",
        timeoutMs: 25000,
        fetchImpl,
      });

      return {
        ok: true,
        provider: spec.id,
        providerName: spec.name,
        model,
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      return {
        ok: false,
        error: redactSecrets(err?.message || String(err), [apiKey]),
      };
    }
  }

  return function onRuntimeMessage(msg, sender, sendResponse) {
    if (
      !msg ||
      typeof msg.type !== "string" ||
      !msg.type.startsWith(MESSAGE_NAMESPACE)
    ) {
      return false;
    }

    if (msg.type === RUNTIME_MESSAGE.GET_CACHED_SUBTITLES) {
      findCachedSubtitles(
        {
          cacheKey: msg.cacheKey,
          artifactId: msg.artifactId,
          mediaToken: msg.mediaToken,
        },
        storageArea
      )
        .then((entry) => sendResponse({ ok: true, entry }))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.ENSURE_SUBTITLES) {
      handleEnsureSubtitles(msg, sender)
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.SAVE_IMPORTED_SUBTITLES && msg.entry) {
      saveCachedSubtitles(msg.entry, storageArea)
        .then((saved) => sendResponse({ ok: true, entry: saved }))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.TEST_PROVIDER) {
      handleTestProvider(msg)
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    return false;
  };
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(createRuntimeDispatcher());
}

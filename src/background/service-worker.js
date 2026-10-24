/**
 * Manifest V3 Background Service Worker (`src/background/service-worker.js` -> `extension/background.js`).
 *
 * Security & architecture invariants:
 * - This is the ONLY module in the extension permitted to call `getApiKey` / `getSecretApiKeysMap`.
 * - Enforces `isTrustedGoogleMediaUrl()` SSRF validation before authenticated media downloads.
 * - Accepts compact audio pre-extracted in-page (`STAGE_AUDIO_CHUNK`) OR falls back to
 *   Service-Worker CORS-bypass download + `extractAudioTrackFromMp4()` (`credentials: "include"` -> `"omit"`).
 * - Maintains an MV3 keepalive port handler so 8–30+ minute Video Overviews never idle-timeout.
 */

import {
  KEEPALIVE_PORT_NAME,
  MESSAGE_NAMESPACE,
  RUNTIME_MESSAGE,
} from "../config/selectors.js";
import {
  createTestSpeechCadenceWav,
  extractAudioTrackFromMp4,
  inspectMp4Tracks,
  validateMediaPayload,
} from "../lib/audio-extract.js";
import {
  deriveGoogleMediaVariants,
  extractMediaToken,
  isThumbnailOrManifestUrl,
  isTrustedGoogleMediaUrl,
  summarizeMediaUrlForDebug,
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
  clearDebugLogs,
  findCachedSubtitles,
  getApiKey,
  getDebugLogs,
  getLastStatus,
  getModelForProvider,
  getSavedKeyPresenceMap,
  getSecretApiKeysMap,
  getSettings,
  MAX_DEBUG_LOGS,
  sanitizeDebugMessage,
  saveCachedSubtitles,
  saveDebugLogs,
  setLastStatus,
} from "../lib/storage.js";

const STAGED_AUDIO_TTL_MS = 5 * 60 * 1000;
const MAX_SINGLE_M4A_FOR_ALL_PROVIDERS = 22 * 1024 * 1024;
const MAX_SAFE_IPC_DECODE_BYTES = 38 * 1024 * 1024;

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
  const stagedAudioJobs = new Map();
  const memoryDebugLogs = [];
  let debugLogsHydrated = false;

  const REQUIRED_GOOGLE_ORIGINS = [
    "https://*.googleusercontent.com/*",
    "https://*.google.com/*",
    "https://*.googlevideo.com/*",
  ];

  async function ensureDebugLogsHydrated() {
    if (debugLogsHydrated) return;
    debugLogsHydrated = true;
    const saved = await getDebugLogs(storageArea);
    for (const item of saved) {
      memoryDebugLogs.push(item);
    }
    while (memoryDebugLogs.length > MAX_DEBUG_LOGS) {
      memoryDebugLogs.shift();
    }
  }

  async function appendDebugEntry(entry, extraSecrets = []) {
    await ensureDebugLogsHydrated();
    const safeDetail = redactSecrets(
      sanitizeDebugMessage(entry?.detail || ""),
      extraSecrets
    );
    const normalized = {
      ts: entry?.ts || new Date().toISOString(),
      layer: String(entry?.layer || "SW").slice(0, 12),
      event: String(entry?.event || "log").slice(0, 48),
      detail: safeDetail,
      level: entry?.level || "info",
    };
    memoryDebugLogs.push(normalized);
    while (memoryDebugLogs.length > MAX_DEBUG_LOGS) {
      memoryDebugLogs.shift();
    }
    await saveDebugLogs(memoryDebugLogs, storageArea);
    return normalized;
  }

  async function checkGoogleHostPermissions() {
    if (!permissionsApi?.contains) {
      return { ok: true, missingOrigins: [] };
    }
    const missingOrigins = [];
    for (const origin of REQUIRED_GOOGLE_ORIGINS) {
      try {
        const has = await permissionsApi.contains({ origins: [origin] });
        if (!has) missingOrigins.push(origin);
      } catch {
        // Ignore unsupported pattern in mock
      }
    }
    return {
      ok: missingOrigins.length === 0,
      missingOrigins,
    };
  }

  function sweepExpiredStagedAudio() {
    const now = Date.now();
    for (const [id, record] of stagedAudioJobs.entries()) {
      if (now - record.createdAt > STAGED_AUDIO_TTL_MS) {
        stagedAudioJobs.delete(id);
      }
    }
  }

  function handleStageAudioChunk(msg) {
    sweepExpiredStagedAudio();
    const {
      stagedJobId,
      index,
      totalChunks,
      originalBytes,
      extractedBytes,
      chunk,
    } = msg || {};

    if (!stagedJobId || !chunk?.base64 || !Number.isInteger(index)) {
      return { ok: false, error: "Invalid staged audio chunk." };
    }

    let job = stagedAudioJobs.get(stagedJobId);
    if (!job) {
      job = {
        createdAt: Date.now(),
        totalChunks: Number(totalChunks) || 1,
        originalBytes: Number(originalBytes) || 0,
        extractedBytes: Number(extractedBytes) || 0,
        parts: new Array(Number(totalChunks) || 1),
      };
      stagedAudioJobs.set(stagedJobId, job);
    }

    job.parts[index] = {
      bytes: base64ToUint8(chunk.base64),
      mimeType: chunk.mimeType || "audio/mp4",
      fileName: chunk.fileName || `chunk-${index + 1}.m4a`,
      startOffsetSec: Number(chunk.startOffsetSec) || 0,
      durationSec: chunk.durationSec || null,
    };

    return { ok: true };
  }

  function consumeStagedAudioJob(stagedJobId) {
    if (!stagedJobId || !stagedAudioJobs.has(stagedJobId)) return null;
    const job = stagedAudioJobs.get(stagedJobId);
    stagedAudioJobs.delete(stagedJobId);
    const chunks = job.parts.filter(Boolean);
    if (chunks.length === 0) return null;
    const computedBytes = chunks.reduce((acc, c) => acc + c.bytes.byteLength, 0);
    return {
      originalBytes: job.originalBytes || computedBytes,
      extractedBytes: job.extractedBytes || computedBytes,
      durationSeconds: null,
      chunks,
    };
  }

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
          void globalThis.chrome?.runtime?.lastError;
        }
      );
    } catch {
      // Ignore
    }
  }

  async function checkProviderOriginPermission(providerId, customBaseUrl = "") {
    // Standard HTTPS providers are declared in `manifest.json` `host_permissions`.
    if (providerId !== "custom") return true;
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
   * Layer 2 fallback: Downloads media from Google's CDN inside the Service Worker
   * (bypassing page CORS via MV3 `host_permissions`), trying `{ credentials: "include" }`
   * first and retrying `{ credentials: "omit" }` if a redirected CDN sets wildcard CORS.
   */
  async function fetchAndExtractCompactAudio(artifact, tabId, pageFetchError = null) {
    const seedUrl = artifact.progressiveUrl || artifact.mediaUrl;
    const rawCandidates = [
      ...deriveGoogleMediaVariants(seedUrl),
      ...deriveGoogleMediaVariants(artifact.mediaUrl),
      ...(Array.isArray(artifact.mediaVariants) ? artifact.mediaVariants : []),
      artifact.progressiveUrl,
      artifact.mediaUrl,
    ].filter(Boolean);

    const allCandidateUrls = [...new Set(rawCandidates)].filter(
      (u) => isTrustedGoogleMediaUrl(u) && !isThumbnailOrManifestUrl(u)
    );

    if (allCandidateUrls.length === 0) {
      if (String(artifact.mediaUrl || "").startsWith("blob:")) {
        throw new Error(
          "Reload this NotebookLM tab once (Ctrl+R / Cmd+R) so the extension can capture the Video Overview media stream."
        );
      }
      throw new Error(
        "Untrusted or missing NotebookLM media URL. Refusing network download."
      );
    }

    await appendDebugEntry({
      layer: "SW",
      event: "media.candidates",
      detail: `Trying ${allCandidateUrls.length} Google CDN URL(s); first=${summarizeMediaUrlForDebug(
        allCandidateUrls[0]
      )}`,
    });

    let downloadedBytes = null;
    let downloadedContentType = "";
    let lastDownloadErr = pageFetchError || "Failed to fetch Video Overview stream.";

    for (const candidateUrl of allCandidateUrls) {
      let hostLabel = "googleusercontent.com";
      try {
        hostLabel = new URL(candidateUrl).hostname;
      } catch {
        // Ignore
      }

      let skipCandidateVariant = false;
      for (const credentialsMode of ["include", "omit"]) {
        try {
          const res = await fetchImpl(candidateUrl, {
            method: "GET",
            credentials: credentialsMode,
          });
          if (!res.ok) {
            lastDownloadErr = `Media CDN (${hostLabel}) returned HTTP ${res.status}`;
            await appendDebugEntry({
              layer: "SW",
              event: "media.http_status",
              detail: `${summarizeMediaUrlForDebug(candidateUrl)} [${credentialsMode}] -> HTTP ${res.status}`,
            });
            if (res.status === 404 || res.status === 400) {
              break; // Variant doesn't exist; skip straight to next URL variant
            }
            continue;
          }
          const ct = res.headers?.get?.("content-type") || "";
          const buf = new Uint8Array(await res.arrayBuffer());
          const validated = validateMediaPayload(buf, ct);

          // Reject silent video-only preview thumbnails (e.g., `=s512-mm,22` card loops)
          const trackInfo = inspectMp4Tracks(validated);
          if (
            trackInfo.isMp4 &&
            trackInfo.hasVideo &&
            !trackInfo.hasAudio &&
            !trackInfo.isFragmented
          ) {
            lastDownloadErr = `Skipped silent video-only preview stream (${summarizeMediaUrlForDebug(
              candidateUrl
            )})`;
            await appendDebugEntry({
              layer: "SW",
              event: "media.skip_silent",
              detail: `${summarizeMediaUrlForDebug(candidateUrl)} has vide track only (0 soun tracks, ${
                validated.byteLength
              } B) — advancing to next stream`,
            });
            skipCandidateVariant = true;
            break;
          }

          downloadedBytes = validated;
          downloadedContentType = ct.toLowerCase();
          await appendDebugEntry({
            layer: "SW",
            event: "media.downloaded",
            detail: `Downloaded ${formatMegabytes(validated.byteLength)} (${
              ct || "binary"
            }) from ${summarizeMediaUrlForDebug(candidateUrl)} [${credentialsMode}]`,
            level: "ok",
          });
          break;
        } catch (err) {
          lastDownloadErr = `Media stream download failed (${hostLabel}): ${
            err?.message || String(err)
          }`;
          await appendDebugEntry({
            layer: "SW",
            event: "media.fetch_err",
            detail: `${summarizeMediaUrlForDebug(candidateUrl)} [${credentialsMode}] -> ${
              err?.message || String(err)
            }`,
          });
        }
      }

      if (skipCandidateVariant) continue;
      if (downloadedBytes) break;
    }

    if (!downloadedBytes) {
      const permCheck = await checkGoogleHostPermissions();
      if (!permCheck.ok) {
        const permErr = new Error(
          `Chrome withheld Google CDN host permissions (${permCheck.missingOrigins.join(
            ", "
          )}). Open the extension popup and click "Grant Google Media Access".`
        );
        permErr.missingPermissions = true;
        throw permErr;
      }
      throw new Error(lastDownloadErr);
    }

    const originalBytes = downloadedBytes.byteLength;

    // Pure-JS lossless ISO-BMFF audio-track extraction (`mp4` -> `.m4a` `soun` track)
    const extracted = extractAudioTrackFromMp4(downloadedBytes);
    if (
      extracted &&
      extracted.bytes &&
      extracted.extractedBytes <= MAX_SINGLE_M4A_FOR_ALL_PROVIDERS
    ) {
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

    // If extracted `.m4a` is >22 MB, decode the compact `.m4a` (not the huge video!) into <=14 MB WAV chunks
    const decodeSourceBytes =
      extracted && extracted.bytes ? extracted.bytes : downloadedBytes;

    if (
      tabId &&
      tabsApi?.sendMessage &&
      decodeSourceBytes.byteLength <= MAX_SAFE_IPC_DECODE_BYTES
    ) {
      const decodedRes = await new Promise((resolve) => {
        tabsApi.sendMessage(
          tabId,
          {
            type: "NOTEBOOKLM_SUBTITLES_DECODE_WAV_FALLBACK",
            base64Media: uint8ToBase64(decodeSourceBytes),
          },
          (resp) => {
            void globalThis.chrome?.runtime?.lastError;
            resolve(resp || null);
          }
        );
      });
      if (
        decodedRes?.ok &&
        Array.isArray(decodedRes.chunks) &&
        decodedRes.chunks.length > 0
      ) {
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

    // If extracted `.m4a` exists (even if >22 MB, e.g. for Mistral 48 MB / Deepgram 50 MB), return it
    if (extracted && extracted.bytes) {
      return {
        originalBytes,
        extractedBytes: extracted.extractedBytes,
        durationSeconds: artifact.durationSeconds || null,
        chunks: [
          {
            bytes: extracted.bytes,
            mimeType: "audio/mp4",
            fileName: "overview-audio.m4a",
            startOffsetSec: 0,
            durationSec: artifact.durationSeconds || null,
          },
        ],
      };
    }

    if (originalBytes <= MAX_SINGLE_M4A_FOR_ALL_PROVIDERS) {
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

    throw new Error(
      "Unable to extract compact audio from media container. Try refreshing your NotebookLM tab."
    );
  }

  async function handleEnsureSubtitles(msg, sender) {
    const artifact = msg?.artifact;
    if (!artifact || typeof artifact !== "object") {
      return { ok: false, error: "Missing Video Overview metadata." };
    }

    const stagedAudio = consumeStagedAudioJob(msg.stagedJobId);
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
          "No STT API key configured yet. Open the Subtitles for NotebookLM popup and save a free Groq or Mistral key.";
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
          message: `Transcribing via ${getProviderSpec(candidates[0].providerId).name}…`,
        },
        storageArea
      );

      let audioBundle = stagedAudio;
      if (!audioBundle) {
        notifyTabProgress(tabId, {
          cacheKey,
          artifactId: artifact.artifactId,
          mediaToken,
          label: "Downloading & extracting audio track…",
          detail: artifact.title || "",
        });

        audioBundle = await fetchAndExtractCompactAudio(
          { ...artifact, cacheKey, mediaToken },
          tabId,
          msg.pageFetchError || null
        );
      } else {
        notifyTabProgress(tabId, {
          cacheKey,
          artifactId: artifact.artifactId,
          mediaToken,
          label: `Transcribing via ${getProviderSpec(candidates[0].providerId).name}…`,
          detail: `${formatMegabytes(audioBundle.originalBytes)} video -> ${formatMegabytes(
            audioBundle.extractedBytes
          )} audio`,
        });
      }

      const language =
        settings.languageHint && settings.languageHint !== "auto"
          ? settings.languageHint
          : artifact.language || null;

      await appendDebugEntry({
        layer: "STT",
        event: "stt.dispatch",
        detail: `Sending ${audioBundle.chunks.length} audio chunk(s) (${formatMegabytes(
          audioBundle.extractedBytes
        )}) to queue [${candidates.map((c) => c.providerId).join(" -> ")}]`,
      });

      const txResult = await transcribeWithQueue({
        chunks: audioBundle.chunks,
        candidates,
        language,
        translateTo: settings.translateTo || "original",
        timeoutMs: 180000,
        fetchImpl,
      });

      if (!txResult.cues || txResult.cues.length === 0) {
        throw new Error(
          `${txResult.providerName} returned 0 subtitle cues for this audio.`
        );
      }

      await appendDebugEntry({
        layer: "STT",
        event: "stt.ok",
        detail: `${txResult.providerName} (${txResult.model}) returned ${txResult.cues.length} cues in ${txResult.latencyMs} ms`,
        level: "ok",
      });

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
          durationSeconds:
            audioBundle.durationSeconds || artifact.durationSeconds || null,
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
        const allSecrets = Object.values(secretsMap);
        const safeError = redactSecrets(err?.message || String(err), allSecrets);
        await appendDebugEntry(
          {
            layer: "SW",
            event: "pipeline.error",
            detail: safeError,
            level: "error",
          },
          allSecrets
        ).catch(() => {});
        await setLastStatus(
          {
            state: "error",
            title: artifact.title || "Video Overview",
            message: safeError,
          },
          storageArea
        ).catch(() => {});
        return {
          ok: false,
          error: safeError,
          missingPermissions: Boolean(err?.missingPermissions),
        };
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

    if (msg.type === RUNTIME_MESSAGE.STAGE_AUDIO_CHUNK) {
      try {
        sendResponse(handleStageAudioChunk(msg));
      } catch (err) {
        sendResponse({ ok: false, error: err?.message || String(err) });
      }
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

    if (msg.type === RUNTIME_MESSAGE.APPEND_DEBUG_LOG && msg.entry) {
      getSecretApiKeysMap(storageArea)
        .catch(() => ({}))
        .then((secretsMap) =>
          appendDebugEntry(msg.entry, Object.values(secretsMap))
        )
        .then((saved) => sendResponse({ ok: true, entry: saved }))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.CLEAR_DEBUG_LOGS) {
      memoryDebugLogs.length = 0;
      clearDebugLogs(storageArea)
        .then(() => sendResponse({ ok: true }))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.GET_DEBUG_REPORT) {
      (async () => {
        await ensureDebugLogsHydrated();
        const [settings, presenceMap, lastStatus, permCheck] = await Promise.all([
          getSettings(storageArea),
          getSavedKeyPresenceMap(storageArea),
          getLastStatus(storageArea),
          checkGoogleHostPermissions(),
        ]);
        const configuredProviders = Object.entries(presenceMap)
          .filter(([, has]) => Boolean(has))
          .map(([id]) => id);
        const manifestVersion =
          globalThis.chrome?.runtime?.getManifest?.()?.version || "0.1.2";

        const reportObj = {
          generatedAt: new Date().toISOString(),
          extensionVersion: manifestVersion,
          permissionsOk: permCheck.ok,
          missingOrigins: permCheck.missingOrigins,
          settingsSummary: {
            enabled: settings.enabled,
            debugMode: settings.debugMode,
            autoOnGenerate: settings.autoOnGenerate,
            autoOnExistingVideos: settings.autoOnExistingVideos,
            primaryProvider: settings.primaryProvider,
            configuredProviders,
            queueOrder: settings.queueOrder.slice(0, 6),
          },
          lastStatus,
          tabContext: msg.tabContext || null,
          logs: [...memoryDebugLogs],
        };

        const lines = [
          `# Subtitles for NotebookLM — Diagnostic Report (v${manifestVersion})`,
          `Generated: ${reportObj.generatedAt}`,
          `Google CDN Permissions: ${
            permCheck.ok ? "GRANTED" : `MISSING (${permCheck.missingOrigins.join(", ")})`
          }`,
          `Enabled: ${settings.enabled} | Debug Mode: ${settings.debugMode} | Primary: ${settings.primaryProvider}`,
          `Configured Providers (keys redacted): ${
            configuredProviders.length > 0 ? configuredProviders.join(", ") : "(none)"
          }`,
          `Last Status: ${
            lastStatus
              ? `[${lastStatus.state}] ${lastStatus.title || ""} — ${lastStatus.message || ""}`
              : "(none)"
          }`,
        ];

        if (msg.tabContext) {
          lines.push(
            `Tab Snapshot: host=${msg.tabContext.host}${msg.tabContext.pathname || ""} | artifacts=${
              msg.tabContext.artifactCount
            } | boundVideos=${msg.tabContext.videoCount}`
          );
          if (Array.isArray(msg.tabContext.artifacts) && msg.tabContext.artifacts.length > 0) {
            for (const a of msg.tabContext.artifacts) {
              lines.push(
                `  - Artifact ${a.id} [${a.status}] (${a.origin}) variants=${a.variantCount} ${a.mediaSummary}`
              );
            }
          }
          if (Array.isArray(msg.tabContext.videos) && msg.tabContext.videos.length > 0) {
            for (const v of msg.tabContext.videos) {
              lines.push(
                `  - <video> overlayMounted=${v.overlayMounted} status=${v.status} cues=${v.cueCount} dur=${v.duration}s src=${v.srcSummary}`
              );
            }
          }
        }

        lines.push("", "## Chronological Pipeline Logs");
        if (memoryDebugLogs.length === 0) {
          lines.push("(no debug events recorded yet)");
        } else {
          for (const l of memoryDebugLogs) {
            lines.push(
              `${l.ts} [${l.layer}] ${l.event}: ${l.detail}`
            );
          }
        }

        return {
          ok: true,
          permissionsOk: permCheck.ok,
          missingOrigins: permCheck.missingOrigins,
          logs: reportObj.logs,
          reportJson: reportObj,
          reportText: lines.join("\n"),
        };
      })()
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
  chrome.runtime.onConnect?.addListener((port) => {
    if (port?.name !== KEEPALIVE_PORT_NAME) return;
    port.onMessage.addListener(() => {
      try {
        port.postMessage({ pong: Date.now() });
      } catch {
        // Ignore
      }
    });
  });
}

/**
 * Manifest V3 Background Service Worker (`src/background/service-worker.js` -> `extension/background.js`).
 *
 * Security & speed invariants (`LM Subs v0.2.1`):
 * - This is the ONLY module in the extension permitted to call `getApiKey`, `getSecretApiKeysMap`,
 *   or `getSecretCloudSyncToken`.
 * - Enforces `isTrustedGoogleMediaUrl()` SSRF validation before authenticated media downloads.
 * - Eliminates multi-minute latency via:
 *   1. Instant local + Neon Postgres subtitle lookup before media download
 *   2. Pure-audio `=m140` 0 ms fast-path (never inflates fragmented `.m4a` into 40+ MB `.wav` over IPC)
 *   3. HTTP `206` Range `soun`-chunk-only extraction when CDN only offers >16 MB HD video MP4s
 *   4. Segment-only STT timestamps + 3x concurrent multi-chunk transcription + progressive live cues
 * - Syncs settings, AES-256-GCM encrypted API keys, and subtitles with Neon Lakebase Postgres.
 */

import {
  ALARM_NAMES,
  EXTERNAL_MESSAGE,
  HOSTED_CLOUD_URL,
  KEEPALIVE_PORT_NAME,
  MESSAGE_NAMESPACE,
  RUNTIME_MESSAGE,
} from "../config/selectors.js";
import {
  createTestSpeechCadenceWav,
  extractAudioTrackFromMp4,
  extractAudioViaHttpRange,
  inspectMp4Tracks,
  resolveAvoidedVideoBytes,
  validateMediaPayload,
} from "../lib/audio-extract.js";
import {
  deriveGoogleMediaVariants,
  extractMediaToken,
  isThumbnailOrManifestUrl,
  isTrustedGoogleMediaUrl,
  summarizeMediaUrlForDebug,
} from "../lib/batchexecute.js";
import { resolveExtensionLogoUrl } from "../lib/brand-logo.js";
import { resolveSubtitleCacheKey } from "../lib/decide.js";
import {
  getProviderOriginPattern,
  getProviderSpec,
  redactSecrets,
  transcribeSingleChunk,
  transcribeWithQueue,
} from "../lib/providers/index.js";
import {
  appendNotification,
  clearDebugLogs,
  clearNotifications,
  findCachedSubtitles,
  getApiKey,
  getCloudSyncProfile,
  getDebugLogs,
  getLastStatus,
  getModelForProvider,
  getNotifications,
  getSavedKeyPresenceMap,
  getSecretApiKeysMap,
  getSecretCloudSyncToken,
  getSettings,
  getSetupState,
  getSubtitleCacheList,
  getUpdateStatus,
  markNotificationsRead,
  MAX_DEBUG_LOGS,
  mergeCloudSubtitlesIntoCache,
  mergeSecretApiKeysFromCloud,
  normalizeSyncServerUrl,
  sanitizeDebugMessage,
  saveCachedSubtitles,
  saveCloudSyncProfile,
  saveDebugLogs,
  saveSettings,
  saveSetupState,
  saveUpdateStatus,
  setApiKey,
  setLastStatus,
  setSecretCloudSyncToken,
} from "../lib/storage.js";
import { normalizeAndSortCues } from "../lib/subtitles.js";
import {
  applyUpdateToDirectoryHandle,
  inspectLinkedDirPermission,
  isRemoteReleaseNewer,
  loadLinkedExtensionDirHandle,
} from "../lib/unpacked-updater.js";

const STAGED_AUDIO_TTL_MS = 5 * 60 * 1000;
const MAX_SINGLE_M4A_FOR_ALL_PROVIDERS = 22 * 1024 * 1024;
const MAX_SAFE_IPC_DECODE_BYTES = 38 * 1024 * 1024;
const RANGE_EXTRACTION_THRESHOLD_BYTES = 3 * 1024 * 1024;
const MEDIA_HEADER_TIMEOUT_MS = 4500;

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
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(
      "base64"
    );
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
  actionApi = globalThis.chrome?.action,
  notificationsApi = globalThis.chrome?.notifications,
  alarmsApi = globalThis.chrome?.alarms,
  runtimeApi = globalThis.chrome?.runtime,
  dirHandleLoader = loadLinkedExtensionDirHandle,
} = {}) {
  const inFlightPromises = new Map();
  const stagedAudioJobs = new Map();
  const memoryDebugLogs = [];
  let debugLogsHydrated = false;

  async function syncToolbarBadge({ transientState = null } = {}) {
    if (!actionApi?.setBadgeText) return;
    try {
      const [settings, notifications, updateStatus] = await Promise.all([
        getSettings(storageArea),
        getNotifications(storageArea),
        getUpdateStatus(storageArea),
      ]);
      if (!settings.badgeAlerts) {
        await actionApi.setBadgeText({ text: "" });
        return;
      }
      if (transientState === "working") {
        await actionApi.setBadgeBackgroundColor?.({ color: "#0055D4" });
        await actionApi.setBadgeText({ text: "..." });
        return;
      }
      if (transientState === "error") {
        await actionApi.setBadgeBackgroundColor?.({ color: "#B42318" });
        await actionApi.setBadgeText({ text: "!" });
        return;
      }
      if (updateStatus?.updateAvailable) {
        await actionApi.setBadgeBackgroundColor?.({ color: "#0055D4" });
        await actionApi.setBadgeText({ text: "UPD" });
        return;
      }
      const unread = notifications.filter((n) => n && !n.read);
      if (unread.length === 0) {
        await actionApi.setBadgeText({ text: "" });
        return;
      }
      const newestKind = unread[0]?.kind || "info";
      const badgeColor =
        newestKind === "error"
          ? "#B42318"
          : newestKind === "ready"
            ? "#166534"
            : "#0055D4";
      await actionApi.setBadgeBackgroundColor?.({ color: badgeColor });
      await actionApi.setBadgeText({
        text: unread.length > 99 ? "99+" : String(unread.length),
      });
    } catch {
      // Ignore badge API errors in headless environments
    }
  }

  async function fireDesktopAlertIfPermitted({ id, title, body, silent = false }) {
    if (!notificationsApi?.create) return false;
    try {
      if (permissionsApi?.contains) {
        const granted = await new Promise((resolve) => {
          try {
            const maybe = permissionsApi.contains(
              { permissions: ["notifications"] },
              (res) => resolve(Boolean(res))
            );
            if (maybe && typeof maybe.then === "function") {
              maybe.then((r) => resolve(Boolean(r))).catch(() => resolve(false));
            }
          } catch {
            resolve(false);
          }
        });
        if (!granted) return false;
      }

      const iconUrl = resolveExtensionLogoUrl(runtimeApi, 128);
      await new Promise((resolve) => {
        try {
          const maybe = notificationsApi.create(
            id || `lmsubs_${Date.now()}`,
            {
              type: "basic",
              iconUrl,
              title: String(title || "LM Subs"),
              message: String(body || ""),
              silent: Boolean(silent),
            },
            () => {
              void globalThis.chrome?.runtime?.lastError;
              resolve(true);
            }
          );
          if (maybe && typeof maybe.then === "function") {
            maybe.then(() => resolve(true)).catch(() => resolve(false));
          } else if (notificationsApi.create.length < 3) {
            resolve(true);
          }
        } catch {
          resolve(false);
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  async function emitExtensionNotification({
    kind = "info",
    title = "LM Subs",
    body = "",
    cacheKey = null,
    provider = null,
    fireDesktop = false,
    quiet = false,
  } = {}) {
    const settings = await getSettings(storageArea);
    if (kind === "failover" && !settings.notifyOnFailover) {
      return null;
    }
    if (kind === "sync" && !settings.notifyOnSync) {
      return null;
    }
    const { notification } = await appendNotification(
      {
        kind,
        title,
        body,
        cacheKey,
        provider,
        read: Boolean(quiet),
      },
      storageArea
    );
    await syncToolbarBadge();
    if (!quiet && kind !== "sync" && fireDesktop && settings.desktopNotifications) {
      await fireDesktopAlertIfPermitted({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        silent: !settings.soundAlerts,
      });
    }
    return notification;
  }

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

  function notifyTabMessage(tabId, message) {
    if (!tabId || !tabsApi?.sendMessage) return;
    try {
      tabsApi.sendMessage(tabId, message, () => {
        void globalThis.chrome?.runtime?.lastError;
      });
    } catch {
      // Ignore
    }
  }

  function notifyTabProgress(tabId, payload) {
    notifyTabMessage(tabId, {
      type: RUNTIME_MESSAGE.SUBTITLES_PROGRESS,
      ...payload,
    });
  }

  async function broadcastUpdatedSubtitlesToTabs(entries) {
    if (!Array.isArray(entries) || entries.length === 0 || !tabsApi?.query) return;
    try {
      const urls = [
        "https://notebooklm.google.com/*",
        "https://notebook.google.com/*",
        "https://notebook.cloud.google.com/*",
      ];
      const tabs = await new Promise((resolve) => {
        try {
          const maybe = tabsApi.query({ url: urls }, (res) =>
            resolve(Array.isArray(res) ? res : [])
          );
          if (maybe && typeof maybe.then === "function") {
            maybe
              .then((res) => resolve(Array.isArray(res) ? res : []))
              .catch(() => resolve([]));
          } else if (tabsApi.query.length < 2) {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
      for (const tab of tabs) {
        if (tab?.id) {
          notifyTabMessage(tab.id, {
            type: RUNTIME_MESSAGE.SUBTITLES_UPDATED,
            entries,
          });
        }
      }
    } catch {
      // Ignore tab broadcast errors
    }
  }

  async function checkProviderOriginPermission(providerId, customBaseUrl = "") {
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

  // =========================================================================
  // Neon Lakebase Cloud Sync Helpers
  // =========================================================================

  async function callSyncApi(
    serverUrl,
    path,
    { method = "GET", token = "", body = null, timeoutMs = 10000 } = {}
  ) {
    const primaryBase = normalizeSyncServerUrl(serverUrl);
    const basesToTry = [primaryBase];
    if (primaryBase === "https://lm-subs.vercel.app") {
      basesToTry.push("http://localhost:4173");
    }

    let lastErr = null;
    for (const base of basesToTry) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const headers = {};
      if (body !== null) headers["Content-Type"] = "application/json";
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetchImpl(`${base}${path}`, {
          method,
          headers,
          body: body !== null ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          const errMsg = json?.error || `Cloud service returned HTTP ${res.status}`;
          const err = new Error(errMsg);
          err.status = res.status;
          err.resolvedBase = base;
          throw err;
        }
        json._resolvedBase = base;
        return json;
      } catch (err) {
        lastErr = err;
        // Only try localhost fallback on network failure or 404 from unconfigured preview domain
        if (err?.status && err.status !== 404 && err.status < 500) {
          break;
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr || new Error("Could not reach LM Subs cloud service.");
  }

  async function fetchCloudSubtitleIfAvailable({ cacheKey, artifactId, mediaToken }) {
    try {
      const [profile, token] = await Promise.all([
        getCloudSyncProfile(storageArea),
        getSecretCloudSyncToken(storageArea),
      ]);
      if (!profile.connected || !token || !profile.syncPreferences?.syncTranscripts) {
        return null;
      }

      const qs = new URLSearchParams();
      if (cacheKey) qs.set("cacheKey", cacheKey);
      if (artifactId) qs.set("artifactId", artifactId);
      if (mediaToken) qs.set("mediaToken", mediaToken);

      const res = await callSyncApi(
        profile.serverUrl,
        `/api/sync/subtitle?${qs.toString()}`,
        { token, timeoutMs: 3500 }
      );
      if (res?.entry?.cues?.length > 0) {
        return res.entry;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function runBidirectionalCloudSync({
    deletedProviders = [],
    deletedCacheKeys = [],
    pushOnly = false,
    silentNotification = false,
  } = {}) {
    const [profile, token] = await Promise.all([
      getCloudSyncProfile(storageArea),
      getSecretCloudSyncToken(storageArea),
    ]);
    if (!token) {
      throw new Error("Sign in to your LM Subs account first.");
    }

    const syncPrefs = profile.syncPreferences || {
      syncApiKeys: true,
      syncTranscripts: true,
      syncSettings: true,
    };

    const [localSettings, localKeys, localSubtitles] = await Promise.all([
      getSettings(storageArea),
      getSecretApiKeysMap(storageArea),
      getSubtitleCacheList(storageArea),
    ]);

    // 1. Push only the categories the user explicitly opted into
    const pushRes = await callSyncApi(profile.serverUrl, "/api/sync/push", {
      method: "POST",
      token,
      body: {
        syncPreferences: syncPrefs,
        ...(syncPrefs.syncSettings ? { settings: localSettings } : {}),
        ...(syncPrefs.syncApiKeys ? { apiKeys: localKeys } : {}),
        deletedProviders,
        deletedCacheKeys,
        ...(syncPrefs.syncTranscripts
          ? { subtitles: localSubtitles.slice(0, 35) }
          : {}),
      },
      timeoutMs: 12000,
    });

    const activeServerUrl = pushRes._resolvedBase || profile.serverUrl;

    if (pushOnly) {
      const updated = await saveCloudSyncProfile(
        {
          serverUrl: activeServerUrl,
          connected: true,
          syncPreferences: pushRes.summary?.syncPreferences || syncPrefs,
          keyHints: pushRes.summary?.keyHints || profile.keyHints,
          subtitleCount: pushRes.summary?.subtitleCount ?? profile.subtitleCount,
          lastSyncedAt: pushRes.syncedAt || new Date().toISOString(),
        },
        storageArea
      );
      return { ok: true, profile: updated };
    }

    // 2. Pull merged settings, decrypted API keys, and subtitles for opted-in categories
    const pullRes = await callSyncApi(
      activeServerUrl,
      `/api/sync/pull?includeSecrets=${syncPrefs.syncApiKeys ? "1" : "0"}`,
      {
        method: "GET",
        token,
        timeoutMs: 12000,
      }
    );

    const mergedPrefs = pullRes.syncPreferences || syncPrefs;

    if (
      mergedPrefs.syncSettings &&
      pullRes.settings &&
      typeof pullRes.settings === "object"
    ) {
      await saveSettings(pullRes.settings, storageArea);
    }
    if (
      mergedPrefs.syncApiKeys &&
      pullRes.apiKeys &&
      typeof pullRes.apiKeys === "object"
    ) {
      await mergeSecretApiKeysFromCloud(pullRes.apiKeys, storageArea);
    }
    let mergeResult = { addedEntries: [], updatedEntries: [] };
    if (
      mergedPrefs.syncTranscripts &&
      Array.isArray(pullRes.subtitles) &&
      pullRes.subtitles.length > 0
    ) {
      mergeResult =
        (await mergeCloudSubtitlesIntoCache(pullRes.subtitles, storageArea)) || {
          addedEntries: [],
          updatedEntries: [],
        };
      const changedEntries = [
        ...mergeResult.addedEntries,
        ...mergeResult.updatedEntries,
      ];
      if (changedEntries.length > 0) {
        await broadcastUpdatedSubtitlesToTabs(changedEntries);
      }
    }

    const updatedProfile = await saveCloudSyncProfile(
      {
        serverUrl: activeServerUrl,
        connected: true,
        syncPreferences: mergedPrefs,
        user: pullRes.user || profile.user,
        keyHints: pullRes.keyHints || {},
        subtitleCount: Array.isArray(pullRes.subtitles)
          ? pullRes.subtitles.length
          : 0,
        lastSyncedAt: pullRes.syncedAt || new Date().toISOString(),
      },
      storageArea
    );

    await appendDebugEntry(
      {
        layer: "SYNC",
        event: "neon.sync_ok",
        detail: `Synced ${Object.keys(pullRes.keyHints || {}).length} encrypted key(s) & ${
          pullRes.subtitles?.length || 0
        } subtitle(s) with hosted Postgres`,
        level: "ok",
      },
      [token, ...Object.values(pullRes.apiKeys || {})]
    );

    const changedCount =
      mergeResult.addedEntries.length + mergeResult.updatedEntries.length;
    if (!silentNotification || changedCount > 0) {
      await emitExtensionNotification({
        kind: "sync",
        title:
          changedCount > 0
            ? `Synced ${changedCount} updated transcript${
                changedCount === 1 ? "" : "s"
              }`
            : "Cloud sync completed",
        body: `${updatedProfile.subtitleCount} transcript(s) and ${
          Object.keys(updatedProfile.keyHints || {}).length
        } encrypted key(s) synced.`,
        fireDesktop: false,
        quiet: Boolean(silentNotification),
      }).catch(() => {});
    }

    return { ok: true, profile: updatedProfile, mergeResult };
  }

  async function resolveLocalExtensionBuildMeta() {
    const manifestVersion = runtimeApi?.getManifest?.()?.version || "0.2.5";
    let buildId = "";
    try {
      if (runtimeApi?.getURL) {
        const metaUrl = runtimeApi.getURL("build-meta.json");
        if (metaUrl && metaUrl.startsWith("chrome-extension://")) {
          const res = await fetchImpl(metaUrl, { cache: "no-store" });
          if (res?.ok) {
            const json = await res.json();
            if (typeof json?.buildId === "string") {
              buildId = json.buildId;
            }
          }
        }
      }
    } catch {
      // Ignore missing build-meta.json in test runners
    }
    return { version: manifestVersion, buildId };
  }

  async function fetchRemoteReleaseMeta(serverBase) {
    const base = normalizeSyncServerUrl(serverBase || HOSTED_CLOUD_URL);
    for (const candidate of [`${base}/releases/latest.json`, `${base}/api/version`]) {
      try {
        const res = await fetchImpl(candidate, { cache: "no-store" });
        if (!res?.ok) continue;
        const json = await res.json();
        if (json?.version) {
          return {
            version: String(json.version),
            buildId: String(json.buildId || ""),
            zipUrl: String(json.zipUrl || "/releases/lm-subs-latest.zip"),
            zipSha256: String(json.zipSha256 || ""),
            serverBase: base,
          };
        }
      } catch {
        // Try fallback endpoint
      }
    }
    throw new Error("Could not reach LM Subs release server.");
  }

  async function applyUnpackedUpdateNow({
    zipUrl = "",
    zipSha256 = "",
    targetVersion = "",
    targetBuildId = "",
  } = {}) {
    const [profile, prevStatus] = await Promise.all([
      getCloudSyncProfile(storageArea),
      getUpdateStatus(storageArea),
    ]);
    const dirHandle = await dirHandleLoader().catch(() => null);
    if (!dirHandle) {
      throw new Error(
        "Link your unzipped lm-subs folder once so updates can be written directly."
      );
    }

    const base = normalizeSyncServerUrl(profile?.serverUrl || HOSTED_CLOUD_URL);
    const rawZipUrl = zipUrl || prevStatus.zipUrl || "/releases/lm-subs-latest.zip";
    const resolvedZipUrl = /^https?:\/\//i.test(rawZipUrl)
      ? rawZipUrl
      : `${base}${rawZipUrl.startsWith("/") ? "" : "/"}${rawZipUrl}`;
    const expectedSha = zipSha256 || prevStatus.zipSha256 || "";

    const res = await fetchImpl(resolvedZipUrl, { cache: "no-store" });
    if (!res?.ok) {
      throw new Error(`Failed to download update package (HTTP ${res?.status || 0}).`);
    }
    const zipBytes = new Uint8Array(await res.arrayBuffer());
    const applied = await applyUpdateToDirectoryHandle(dirHandle, zipBytes, {
      expectedSha256: expectedSha,
      requestPermission: false,
    });

    const newVer = applied.version || targetVersion || prevStatus.latestVersion;
    const newBuild = targetBuildId || prevStatus.latestBuildId || "";
    const releaseKey = `${newVer}:${newBuild}`;

    const nextStatus = await saveUpdateStatus(
      {
        updateAvailable: false,
        currentVersion: newVer,
        currentBuildId: newBuild,
        latestVersion: newVer,
        latestBuildId: newBuild,
        notifiedReleaseKey: releaseKey,
        checkedAt: new Date().toISOString(),
        autoAppliedAt: new Date().toISOString(),
        linkedFolderName: applied.folderName || "lm-subs",
      },
      storageArea
    );

    await emitExtensionNotification({
      kind: "update",
      title: `LM Subs updated automatically (v${newVer})`,
      body: `Wrote ${applied.writtenFiles} verified files into ${applied.folderName} and reloaded.`,
      fireDesktop: true,
    }).catch(() => {});

    if (runtimeApi?.reload) {
      if (runtimeApi.reload.length === 0 && typeof setTimeout === "function") {
        setTimeout(() => {
          try {
            runtimeApi.reload();
          } catch {
            // Ignore reload errors
          }
        }, 120);
      } else {
        runtimeApi.reload();
      }
    }

    return { ok: true, applied: true, status: nextStatus };
  }

  async function checkExtensionUpdate({ attemptAutoApply = true } = {}) {
    const [settings, profile, prevStatus, localMeta, dirHandle] =
      await Promise.all([
        getSettings(storageArea),
        getCloudSyncProfile(storageArea),
        getUpdateStatus(storageArea),
        resolveLocalExtensionBuildMeta(),
        dirHandleLoader().catch(() => null),
      ]);

    const dirInfo = await inspectLinkedDirPermission(dirHandle);
    const remote = await fetchRemoteReleaseMeta(
      profile?.serverUrl || HOSTED_CLOUD_URL
    );

    const newer = isRemoteReleaseNewer({
      localVersion: localMeta.version,
      localBuildId: localMeta.buildId,
      remoteVersion: remote.version,
      remoteBuildId: remote.buildId,
    });

    const resolvedZipUrl = /^https?:\/\//i.test(remote.zipUrl)
      ? remote.zipUrl
      : `${remote.serverBase}${remote.zipUrl.startsWith("/") ? "" : "/"}${
          remote.zipUrl
        }`;

    if (!newer) {
      const upToDate = await saveUpdateStatus(
        {
          updateAvailable: false,
          currentVersion: localMeta.version,
          currentBuildId: localMeta.buildId,
          latestVersion: remote.version,
          latestBuildId: remote.buildId,
          zipUrl: resolvedZipUrl,
          zipSha256: remote.zipSha256,
          checkedAt: new Date().toISOString(),
          linkedFolderName: dirInfo.folderName,
        },
        storageArea
      );
      await syncToolbarBadge();
      return {
        ok: true,
        updateAvailable: false,
        autoApplied: false,
        status: upToDate,
        folderPermission: dirInfo.permission,
      };
    }

    // Attempt zero-click automatic in-place update when unpacked folder has readwrite permission
    if (
      attemptAutoApply &&
      settings.autoUpdateExtension &&
      dirInfo.linked &&
      dirInfo.permission === "granted" &&
      inFlightPromises.size === 0
    ) {
      try {
        const appliedRes = await applyUnpackedUpdateNow({
          zipUrl: resolvedZipUrl,
          zipSha256: remote.zipSha256,
          targetVersion: remote.version,
          targetBuildId: remote.buildId,
        });
        return {
          ok: true,
          updateAvailable: false,
          autoApplied: true,
          status: appliedRes.status,
          folderPermission: dirInfo.permission,
        };
      } catch {
        // Fall through to automatic notification + toolbar badge
      }
    }

    const releaseKey = `${remote.version}:${remote.buildId}`;
    const shouldNotify = prevStatus.notifiedReleaseKey !== releaseKey;
    const nextStatus = await saveUpdateStatus(
      {
        updateAvailable: true,
        currentVersion: localMeta.version,
        currentBuildId: localMeta.buildId,
        latestVersion: remote.version,
        latestBuildId: remote.buildId,
        zipUrl: resolvedZipUrl,
        zipSha256: remote.zipSha256,
        notifiedReleaseKey: releaseKey,
        checkedAt: new Date().toISOString(),
        linkedFolderName: dirInfo.folderName,
      },
      storageArea
    );

    if (shouldNotify) {
      await emitExtensionNotification({
        kind: "update",
        title: `Update available: LM Subs v${remote.version}`,
        body: dirInfo.linked
          ? "Click LM Subs in your toolbar to apply the update and reload."
          : "Open LM Subs to link your folder for one-click auto-updates or download the release.",
        fireDesktop: true,
      }).catch(() => {});
    } else {
      await syncToolbarBadge();
    }

    return {
      ok: true,
      updateAvailable: true,
      autoApplied: false,
      status: nextStatus,
      folderPermission: dirInfo.permission,
    };
  }

  async function runAutomaticBackgroundCloudPoll() {
    const [settings, profile, token] = await Promise.all([
      getSettings(storageArea),
      getCloudSyncProfile(storageArea),
      getSecretCloudSyncToken(storageArea),
    ]);
    if (!settings.autoBackgroundSync || !profile.connected || !token) {
      return { ok: true, skipped: true };
    }

    const syncRes = await runBidirectionalCloudSync({
      silentNotification: true,
    });

    // Pull unread cloud notifications and fire automatic desktop alerts for new items
    try {
      const notifRes = await callSyncApi(profile.serverUrl, "/api/notifications", {
        method: "GET",
        token,
        timeoutMs: 8000,
      });
      if (Array.isArray(notifRes?.notifications) && notifRes.notifications.length > 0) {
        const existingLocal = await getNotifications(storageArea);
        const existingIds = new Set(existingLocal.map((n) => n.id));
        for (const item of [...notifRes.notifications].reverse()) {
          const cloudKey = `cloud_${item.id}`;
          if (existingIds.has(cloudKey) || existingIds.has(item.id)) continue;
          await appendNotification(
            {
              id: cloudKey,
              kind: item.kind || "info",
              title: item.title || "LM Subs",
              body: item.body || "",
              cacheKey: item.cacheKey || null,
              read: true,
              createdAt: item.createdAt,
            },
            storageArea
          );
        }
        await syncToolbarBadge();
      }
    } catch {
      // Ignore transient offline errors during background polling
    }

    return { ok: true, skipped: false, syncRes };
  }

  async function handleSyncSignup(msg) {
    const serverUrl = normalizeSyncServerUrl(msg?.serverUrl);
    const email = String(msg?.email || "").trim().toLowerCase();
    const password = String(msg?.password || "");
    const name = String(msg?.name || "").trim();

    const res = await callSyncApi(serverUrl, "/api/auth/signup", {
      method: "POST",
      body: {
        email,
        password,
        name,
        deviceLabel: "chrome-extension",
      },
    });

    await setSecretCloudSyncToken(res.token, storageArea);
    await saveCloudSyncProfile(
      {
        serverUrl,
        connected: true,
        user: res.user,
        keyHints: res.summary?.keyHints || {},
        subtitleCount: res.summary?.subtitleCount || 0,
        lastSyncedAt: new Date().toISOString(),
      },
      storageArea
    );

    return runBidirectionalCloudSync();
  }

  async function handleSyncSignin(msg) {
    const serverUrl = normalizeSyncServerUrl(msg?.serverUrl);
    const pastedToken = String(msg?.token || "").trim();

    if (pastedToken) {
      // Direct Extension Token / Neon Auth JWT connection
      const meRes = await callSyncApi(serverUrl, "/api/auth/me", {
        method: "GET",
        token: pastedToken,
      });
      await setSecretCloudSyncToken(pastedToken, storageArea);
      await saveCloudSyncProfile(
        {
          serverUrl,
          connected: true,
          user: meRes.user,
          keyHints: meRes.summary?.keyHints || {},
          subtitleCount: meRes.summary?.subtitleCount || 0,
          lastSyncedAt: new Date().toISOString(),
        },
        storageArea
      );
      return runBidirectionalCloudSync();
    }

    const email = String(msg?.email || "").trim().toLowerCase();
    const password = String(msg?.password || "");

    const res = await callSyncApi(serverUrl, "/api/auth/signin", {
      method: "POST",
      body: {
        email,
        password,
        deviceLabel: "chrome-extension",
      },
    });

    await setSecretCloudSyncToken(res.token, storageArea);
    await saveCloudSyncProfile(
      {
        serverUrl,
        connected: true,
        user: res.user,
        keyHints: res.summary?.keyHints || {},
        subtitleCount: res.summary?.subtitleCount || 0,
        lastSyncedAt: new Date().toISOString(),
      },
      storageArea
    );

    // Pull existing cloud keys/settings first so a fresh install gets keys before pushing
    const pullRes = await callSyncApi(
      serverUrl,
      "/api/sync/pull?includeSecrets=1",
      { method: "GET", token: res.token, timeoutMs: 12000 }
    );
    if (pullRes.settings && typeof pullRes.settings === "object") {
      await saveSettings(pullRes.settings, storageArea);
    }
    if (pullRes.apiKeys && typeof pullRes.apiKeys === "object") {
      await mergeSecretApiKeysFromCloud(pullRes.apiKeys, storageArea);
    }
    if (Array.isArray(pullRes.subtitles) && pullRes.subtitles.length > 0) {
      await mergeCloudSubtitlesIntoCache(pullRes.subtitles, storageArea);
    }

    return runBidirectionalCloudSync();
  }

  async function handleSyncEmailSendCode(msg) {
    const profile = await getCloudSyncProfile(storageArea);
    const serverUrl = normalizeSyncServerUrl(msg?.serverUrl || profile.serverUrl);
    const email = String(msg?.email || "").trim().toLowerCase();
    const res = await callSyncApi(serverUrl, "/api/auth/email/send-code", {
      method: "POST",
      body: { email },
    });
    if (res._resolvedBase) {
      await saveCloudSyncProfile({ serverUrl: res._resolvedBase }, storageArea);
    }
    return {
      ok: true,
      delivery: res.delivery || "email",
      previewCode: res.previewCode || null,
      expiresInSec: res.expiresInSec || 600,
    };
  }

  async function handleSyncEmailVerifyCode(msg) {
    const profile = await getCloudSyncProfile(storageArea);
    const serverUrl = normalizeSyncServerUrl(msg?.serverUrl || profile.serverUrl);
    const email = String(msg?.email || "").trim().toLowerCase();
    const code = String(msg?.code || "").trim();

    const res = await callSyncApi(serverUrl, "/api/auth/email/verify-code", {
      method: "POST",
      body: {
        email,
        code,
        deviceLabel: "chrome-extension",
      },
    });

    const activeBase = res._resolvedBase || serverUrl;
    await setSecretCloudSyncToken(res.token, storageArea);
    await saveCloudSyncProfile(
      {
        serverUrl: activeBase,
        connected: true,
        syncPreferences:
          res.summary?.syncPreferences || profile.syncPreferences,
        user: res.user,
        keyHints: res.summary?.keyHints || {},
        subtitleCount: res.summary?.subtitleCount || 0,
        lastSyncedAt: new Date().toISOString(),
      },
      storageArea
    );

    const pullRes = await callSyncApi(
      activeBase,
      `/api/sync/pull?includeSecrets=${
        (res.summary?.syncPreferences?.syncApiKeys ?? true) ? "1" : "0"
      }`,
      { method: "GET", token: res.token, timeoutMs: 12000 }
    );
    if (pullRes.settings && typeof pullRes.settings === "object") {
      await saveSettings(pullRes.settings, storageArea);
    }
    if (pullRes.apiKeys && typeof pullRes.apiKeys === "object") {
      await mergeSecretApiKeysFromCloud(pullRes.apiKeys, storageArea);
    }
    if (Array.isArray(pullRes.subtitles) && pullRes.subtitles.length > 0) {
      await mergeCloudSubtitlesIntoCache(pullRes.subtitles, storageArea);
    }

    return runBidirectionalCloudSync();
  }

  async function handleSyncSavePreferences(msg) {
    const profile = await saveCloudSyncProfile(
      {
        ...(typeof msg?.autoSync === "boolean" ? { autoSync: msg.autoSync } : {}),
        ...(msg?.syncPreferences ? { syncPreferences: msg.syncPreferences } : {}),
      },
      storageArea
    );
    const token = await getSecretCloudSyncToken(storageArea);
    if (profile.connected && token) {
      const res = await callSyncApi(profile.serverUrl, "/api/sync/preferences", {
        method: "PUT",
        token,
        body: {
          syncPreferences: profile.syncPreferences,
          purgeDisabled: Boolean(msg?.purgeDisabled),
        },
      });
      const updated = await saveCloudSyncProfile(
        {
          syncPreferences: res.syncPreferences || profile.syncPreferences,
          keyHints: res.summary?.keyHints || {},
          subtitleCount: res.summary?.subtitleCount ?? profile.subtitleCount,
        },
        storageArea
      );
      if (profile.autoSync) {
        return runBidirectionalCloudSync({ pushOnly: true });
      }
      return { ok: true, profile: updated };
    }
    return { ok: true, profile };
  }

  async function handleSyncGetStats() {
    const [profile, token] = await Promise.all([
      getCloudSyncProfile(storageArea),
      getSecretCloudSyncToken(storageArea),
    ]);
    if (!profile.connected || !token) {
      return { ok: false, error: "Sign in to view cloud statistics." };
    }
    return callSyncApi(profile.serverUrl, "/api/stats", {
      method: "GET",
      token,
      timeoutMs: 8000,
    });
  }

  async function handleSyncSignout() {
    const [profile, token] = await Promise.all([
      getCloudSyncProfile(storageArea),
      getSecretCloudSyncToken(storageArea),
    ]);
    if (token) {
      await callSyncApi(profile.serverUrl, "/api/auth/signout", {
        method: "POST",
        token,
        timeoutMs: 4000,
      }).catch(() => {});
    }
    await setSecretCloudSyncToken("", storageArea);
    const cleared = await saveCloudSyncProfile(
      {
        connected: false,
        user: null,
        keyHints: {},
        subtitleCount: 0,
      },
      storageArea
    );
    return { ok: true, profile: cleared };
  }

  // =========================================================================
  // Fast Audio Acquisition & Extraction Pipeline
  // =========================================================================

  async function fetchAndExtractCompactAudio(artifact, tabId, pageFetchError = null) {
    const seedUrl = artifact.progressiveUrl || artifact.mediaUrl;
    const rawCandidates = [
      ...deriveGoogleMediaVariants(seedUrl),
      ...deriveGoogleMediaVariants(artifact.mediaUrl),
      ...(Array.isArray(artifact.mediaVariants) ? artifact.mediaVariants : []),
      artifact.progressiveUrl,
      artifact.mediaUrl,
    ].filter(Boolean);

    // Ensure pure-audio `=m140` variants are always probed before any `=m18` / `=m22` video URLs
    const audioFirstCandidates = [
      ...rawCandidates.filter((u) => /=m140(?:-dv)?(?:$|\?)/i.test(u)),
      ...rawCandidates.filter((u) => !/=m140(?:-dv)?(?:$|\?)/i.test(u)),
    ];

    const allCandidateUrls = [...new Set(audioFirstCandidates)].filter(
      (u) => isTrustedGoogleMediaUrl(u) && !isThumbnailOrManifestUrl(u)
    );

    if (allCandidateUrls.length === 0) {
      if (String(artifact.mediaUrl || "").startsWith("blob:")) {
        throw new Error(
          "Reload this NotebookLM tab once (Ctrl+R / Cmd+R) so LM Subs can capture the Video Overview stream."
        );
      }
      throw new Error(
        "Untrusted or missing NotebookLM media URL. Refusing network download."
      );
    }

    await appendDebugEntry({
      layer: "SW",
      event: "media.candidates",
      detail: `Probing ${allCandidateUrls.length} Google stream(s); first=${summarizeMediaUrlForDebug(
        allCandidateUrls[0]
      )}`,
    });

    let downloadedBytes = null;
    let downloadedContentType = "";
    let downloadedTrackInfo = null;
    let lastDownloadErr = pageFetchError || "Failed to fetch Video Overview stream.";
    const deadFifeSuffixes = new Set();

    for (const candidateUrl of allCandidateUrls) {
      const fifeSuffixMatch = candidateUrl.match(
        /\/([A-Za-z0-9_-]{16,})(=[A-Za-z0-9_,.-]+)$/
      );
      const fifeKey = fifeSuffixMatch
        ? `${fifeSuffixMatch[1]}${fifeSuffixMatch[2]}`
        : "";
      if (fifeKey && deadFifeSuffixes.has(fifeKey)) {
        continue;
      }

      let hostLabel = "googleusercontent.com";
      try {
        hostLabel = new URL(candidateUrl).hostname;
      } catch {
        // Ignore
      }

      let skipCandidateVariant = false;
      for (const credentialsMode of ["include", "omit"]) {
        const headerAbort = new AbortController();
        const headerTimer = setTimeout(
          () => headerAbort.abort(),
          MEDIA_HEADER_TIMEOUT_MS
        );
        try {
          const res = await fetchImpl(candidateUrl, {
            method: "GET",
            credentials: credentialsMode,
            signal: headerAbort.signal,
          });
          clearTimeout(headerTimer);

          if (!res.ok) {
            lastDownloadErr = `Media CDN (${hostLabel}) returned HTTP ${res.status}`;
            try {
              await res.body?.cancel?.();
            } catch {
              // Ignore
            }
            await appendDebugEntry({
              layer: "SW",
              event: "media.http_status",
              detail: `${summarizeMediaUrlForDebug(candidateUrl)} [${credentialsMode}] -> HTTP ${res.status}`,
            });
            if (res.status === 404 || res.status === 400 || res.status === 410) {
              if (fifeKey) deadFifeSuffixes.add(fifeKey);
              break;
            }
            continue;
          }

          const ct = (res.headers?.get?.("content-type") || "").toLowerCase();
          if (ct.includes("text/html")) {
            lastDownloadErr = `Media CDN (${hostLabel}) returned HTML redirect`;
            try {
              await res.body?.cancel?.();
            } catch {
              // Ignore
            }
            continue;
          }
          const contentLen = Number(res.headers?.get?.("content-length") || 0);

          // FAST PATH A: If this is a (>=3 MB) video MP4 (`=m22` / `=m18`), cancel the
          // full-video GET stream immediately and pull ONLY the `soun` track via HTTP 206 Range!
          if (
            contentLen > RANGE_EXTRACTION_THRESHOLD_BYTES &&
            ct.includes("video/mp4")
          ) {
            try {
              await res.body?.cancel?.();
            } catch {
              // Ignore
            }
            headerAbort.abort();
            notifyTabProgress(tabId, {
              cacheKey: artifact.cacheKey,
              artifactId: artifact.artifactId,
              mediaToken: artifact.mediaToken,
              label: "Streaming audio track via HTTP Range…",
              detail: `Skipping ${formatMegabytes(contentLen)} video frames`,
            });

            const ranged = await extractAudioViaHttpRange({
              url: candidateUrl,
              credentials: credentialsMode,
              totalBytes: contentLen,
              fetchImpl,
            });

            if (
              ranged &&
              ranged.bytes &&
              ranged.extractedBytes <= MAX_SINGLE_M4A_FOR_ALL_PROVIDERS
            ) {
              await appendDebugEntry({
                layer: "SW",
                event: "media.range_extracted",
                detail: `HTTP Range extracted ${formatMegabytes(
                  ranged.extractedBytes
                )} .m4a (downloaded ${formatMegabytes(
                  ranged.downloadedBytes
                )} of ${formatMegabytes(contentLen)} MP4)`,
                level: "ok",
              });
              return {
                originalBytes: contentLen,
                extractedBytes: ranged.extractedBytes,
                durationSeconds: artifact.durationSeconds || null,
                chunks: [
                  {
                    bytes: ranged.bytes,
                    mimeType: "audio/mp4",
                    fileName: "overview-audio.m4a",
                    startOffsetSec: 0,
                    durationSec: artifact.durationSeconds || null,
                  },
                ],
              };
            }

            // Re-open stream if server did not support HTTP 206 Range
            const fallbackRes = await fetchImpl(candidateUrl, {
              method: "GET",
              credentials: credentialsMode,
            });
            if (!fallbackRes.ok) continue;
            const fullBuf = new Uint8Array(await fallbackRes.arrayBuffer());
            downloadedBytes = validateMediaPayload(fullBuf, ct);
            downloadedContentType = ct;
            downloadedTrackInfo = inspectMp4Tracks(downloadedBytes);
            break;
          }

          const buf = new Uint8Array(await res.arrayBuffer());
          const validated = validateMediaPayload(buf, ct);

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
              detail: `${summarizeMediaUrlForDebug(candidateUrl)} has vide track only (0 soun tracks) — advancing`,
            });
            skipCandidateVariant = true;
            break;
          }

          downloadedBytes = validated;
          downloadedContentType = ct;
          downloadedTrackInfo = trackInfo;
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
          clearTimeout(headerTimer);
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
          )}). Open the LM Subs popup and click "Grant Google Media Access".`
        );
        permErr.missingPermissions = true;
        throw permErr;
      }
      throw new Error(lastDownloadErr);
    }

    const originalBytes = downloadedBytes.byteLength;
    const isAlreadyPureAudio =
      downloadedContentType.startsWith("audio/") ||
      (downloadedTrackInfo?.isMp4 && !downloadedTrackInfo.hasVideo);

    // FAST PATH B: Already pure audio (`=m140` DASH `.m4a`, `.webm`, `.wav`, `.mp3`, `.ogg`) <= 22 MB!
    // Never waste 2-4 minutes inflating compact AAC into 45 MB uncompressed WAV over IPC!
    if (isAlreadyPureAudio && originalBytes <= MAX_SINGLE_M4A_FOR_ALL_PROVIDERS) {
      const isWebm = downloadedContentType.includes("webm");
      const isWav = downloadedContentType.includes("wav");
      const isMp3 =
        downloadedContentType.includes("mpeg") ||
        downloadedContentType.includes("mp3");
      const isOgg = downloadedContentType.includes("ogg");
      const byteStats = resolveAvoidedVideoBytes({
        originalBytes,
        extractedBytes: originalBytes,
        durationSeconds: artifact.durationSeconds || 0,
      });
      notifyTabProgress(tabId, {
        cacheKey: artifact.cacheKey,
        artifactId: artifact.artifactId,
        mediaToken: artifact.mediaToken,
        label: "Audio stream ready · Transcribing…",
        detail: `${formatMegabytes(originalBytes)} direct audio`,
      });
      const resolvedMime = isWav
        ? "audio/wav"
        : isWebm
          ? "audio/webm"
          : isMp3
            ? "audio/mpeg"
            : isOgg
              ? "audio/ogg"
              : "audio/mp4";
      const resolvedExt = isWav
        ? "wav"
        : isWebm
          ? "webm"
          : isMp3
            ? "mp3"
            : isOgg
              ? "ogg"
              : "m4a";
      return {
        originalBytes: byteStats.originalBytes,
        extractedBytes: originalBytes,
        durationSeconds: artifact.durationSeconds || null,
        chunks: [
          {
            bytes: downloadedBytes,
            mimeType: resolvedMime,
            fileName: `overview-audio.${resolvedExt}`,
            startOffsetSec: 0,
            durationSec: artifact.durationSeconds || null,
          },
        ],
      };
    }

    // FAST PATH C: Lossless ISO-BMFF audio-track remux (`mp4` -> `.m4a` `soun` track)
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

    // Long-recording fallback (>22 MB pure audio): decode into <=14 MB WAV chunks for parallel upload
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
            type: RUNTIME_MESSAGE.DECODE_WAV_FALLBACK,
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
      return {
        originalBytes,
        extractedBytes: originalBytes,
        durationSeconds: artifact.durationSeconds || null,
        chunks: [
          {
            bytes: downloadedBytes,
            mimeType: "audio/mp4",
            fileName: "overview-audio.m4a",
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

      // Check Neon Lakebase Cloud Cache before downloading any media!
      const cloudEntry = await fetchCloudSubtitleIfAvailable({
        cacheKey,
        artifactId: artifact.artifactId,
        mediaToken,
      });
      if (cloudEntry) {
        const hydrated = await saveCachedSubtitles(cloudEntry, storageArea);
        await appendDebugEntry({
          layer: "SYNC",
          event: "neon.cache_hit",
          detail: `Loaded ${hydrated.cueCount} cues from Neon Postgres in 1 round-trip`,
          level: "ok",
        });
        return { ok: true, cached: true, cloudCached: true, entry: hydrated };
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
          "No STT API key configured yet. Open LM Subs and add a free Groq or Mistral key (or sign in to Neon Sync).";
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
      await syncToolbarBadge({ transientState: "working" });

      let audioBundle = stagedAudio;
      if (!audioBundle) {
        notifyTabProgress(tabId, {
          cacheKey,
          artifactId: artifact.artifactId,
          mediaToken,
          label: "Fetching compact audio stream…",
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
          detail: `${formatMegabytes(audioBundle.originalBytes)} -> ${formatMegabytes(
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
        detail: `Sending ${audioBundle.chunks.length} chunk(s) (${formatMegabytes(
          audioBundle.extractedBytes
        )}) to [${candidates.map((c) => c.providerId).join(" -> ")}]`,
      });

      const txResult = await transcribeWithQueue({
        chunks: audioBundle.chunks,
        candidates,
        language,
        translateTo: settings.translateTo || "original",
        timeoutMs: 90000,
        chunkConcurrency: 3,
        onPartialCues: (partial) => {
          notifyTabMessage(tabId, {
            type: RUNTIME_MESSAGE.SUBTITLES_PARTIAL,
            cacheKey,
            artifactId: artifact.artifactId,
            mediaToken,
            title: artifact.title || "Video Overview",
            language: language || "en",
            completedChunks: partial.completedChunks,
            totalChunks: partial.totalChunks,
            cues: partial.cues,
          });
        },
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

      const resolvedDurationSec =
        audioBundle.durationSeconds || artifact.durationSeconds || null;
      const finalByteStats = resolveAvoidedVideoBytes({
        originalBytes: audioBundle.originalBytes,
        extractedBytes: audioBundle.extractedBytes,
        durationSeconds: resolvedDurationSec || 0,
        cues: txResult.cues,
      });

      const savedEntry = await saveCachedSubtitles(
        {
          cacheKey,
          artifactId: artifact.artifactId || null,
          notebookId: artifact.notebookId || null,
          mediaToken: mediaToken || null,
          title: artifact.title || "Video Overview",
          language: language || "en",
          provider: txResult.provider,
          model: txResult.model,
          failoverUsed: txResult.failoverUsed,
          durationSeconds: resolvedDurationSec,
          extractedBytes: finalByteStats.extractedBytes,
          originalBytes: finalByteStats.originalBytes,
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
          extractedBytes: finalByteStats.extractedBytes,
          originalBytes: finalByteStats.originalBytes,
          latencyMs: txResult.latencyMs,
          message: `${savedEntry.cueCount} cues · ${(txResult.latencyMs / 1000).toFixed(1)}s via ${txResult.providerName}`,
        },
        storageArea
      );

      if (txResult.failoverUsed) {
        await emitExtensionNotification({
          kind: "failover",
          title: `Switched to ${txResult.providerName}`,
          body: `Primary provider hit a limit or timeout on "${savedEntry.title}". Completed via ${txResult.providerName}.`,
          cacheKey: savedEntry.cacheKey,
          provider: txResult.provider,
          fireDesktop: false,
        }).catch(() => {});
      }

      await emitExtensionNotification({
        kind: "ready",
        title: `Subtitles ready: ${savedEntry.title}`,
        body: `${savedEntry.cueCount} cues generated in ${(txResult.latencyMs / 1000).toFixed(1)}s via ${txResult.providerName}.`,
        cacheKey: savedEntry.cacheKey,
        provider: txResult.provider,
        fireDesktop: true,
      }).catch(() => {});

      const readyMsg = {
        type: RUNTIME_MESSAGE.SUBTITLES_READY,
        cacheKey: savedEntry.cacheKey,
        artifactId: savedEntry.artifactId,
        title: savedEntry.title,
        cueCount: savedEntry.cueCount,
        provider: txResult.providerName,
      };
      notifyTabMessage(tabId, readyMsg);
      try {
        runtimeApi?.sendMessage?.(readyMsg, () => {
          void globalThis.chrome?.runtime?.lastError;
        });
      } catch {
        // Ignore when no extension popup/options page is open
      }

      // Push new subtitle transcript to Neon Postgres in background when connected
      getCloudSyncProfile(storageArea)
        .then((prof) => {
          if (prof.connected && prof.autoSync) {
            return runBidirectionalCloudSync({ pushOnly: true });
          }
          return null;
        })
        .catch(() => {});

      return { ok: true, cached: false, entry: savedEntry };
    })()
      .catch(async (err) => {
        const [secretsMap, syncTok] = await Promise.all([
          getSecretApiKeysMap(storageArea).catch(() => ({})),
          getSecretCloudSyncToken(storageArea).catch(() => ""),
        ]);
        const allSecrets = [...Object.values(secretsMap), syncTok].filter(Boolean);
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
        await emitExtensionNotification({
          kind: "error",
          title: `Subtitle error: ${artifact.title || "Video Overview"}`,
          body: safeError,
          cacheKey,
          fireDesktop: true,
        }).catch(() => {});
        await syncToolbarBadge({ transientState: "error" });
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
        .then((saved) => {
          getCloudSyncProfile(storageArea)
            .then((prof) => {
              if (prof.connected && prof.autoSync) {
                return runBidirectionalCloudSync({ pushOnly: true });
              }
              return null;
            })
            .catch(() => {});
          sendResponse({ ok: true, entry: saved });
        })
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.UPDATE_CACHED_SUBTITLES) {
      (async () => {
        if (!msg.cacheKey) {
          return { ok: false, error: "cacheKey is required." };
        }
        const existing = await findCachedSubtitles(
          { cacheKey: msg.cacheKey },
          storageArea
        );
        if (!existing) {
          return { ok: false, error: "Transcript not found in local cache." };
        }
        const cleanedCues = normalizeAndSortCues(msg.cues || []);
        if (cleanedCues.length === 0) {
          return { ok: false, error: "Transcript must keep at least one valid cue." };
        }
        const saved = await saveCachedSubtitles(
          {
            ...existing,
            title:
              typeof msg.title === "string" && msg.title.trim()
                ? msg.title.trim()
                : existing.title,
            cues: cleanedCues,
          },
          storageArea
        );
        await broadcastUpdatedSubtitlesToTabs([saved]);
        await emitExtensionNotification({
          kind: "edit",
          title: `Saved cue edits: ${saved.title}`,
          body: `Updated ${saved.cueCount} synchronized cues.`,
          cacheKey: saved.cacheKey,
          fireDesktop: false,
        }).catch(() => {});
        getCloudSyncProfile(storageArea)
          .then((prof) => {
            if (prof.connected && prof.autoSync) {
              return runBidirectionalCloudSync({ pushOnly: true });
            }
            return null;
          })
          .catch(() => {});
        return { ok: true, entry: saved };
      })()
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.GET_NOTIFICATIONS) {
      getNotifications(storageArea)
        .then((notifications) => {
          const unreadCount = notifications.filter((n) => !n.read).length;
          sendResponse({ ok: true, unreadCount, notifications });
        })
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.MARK_NOTIFICATIONS_READ) {
      markNotificationsRead({ id: msg.id || null }, storageArea)
        .then(async (notifications) => {
          await syncToolbarBadge();
          const unreadCount = notifications.filter((n) => !n.read).length;
          sendResponse({ ok: true, unreadCount, notifications });
        })
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.CLEAR_NOTIFICATIONS) {
      clearNotifications(storageArea)
        .then(async () => {
          await syncToolbarBadge();
          sendResponse({ ok: true, unreadCount: 0, notifications: [] });
        })
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.TEST_DESKTOP_NOTIFICATION) {
      (async () => {
        const created = await emitExtensionNotification({
          kind: "ready",
          title: "LM Subs desktop alerts active",
          body: "You will receive an alert when background Video Overviews finish captioning.",
          fireDesktop: false,
        });
        const osDispatched = await fireDesktopAlertIfPermitted({
          id: `test_${Date.now()}`,
          title: "LM Subs desktop alerts active",
          body: "Background Video Overview alerts are ready.",
        });
        return { ok: true, notification: created, osDispatched };
      })()
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.GET_UPDATE_STATUS) {
      Promise.all([
        getUpdateStatus(storageArea),
        dirHandleLoader().catch(() => null),
      ])
        .then(async ([status, dirHandle]) => {
          const dirInfo = await inspectLinkedDirPermission(dirHandle);
          sendResponse({
            ok: true,
            status: {
              ...status,
              linkedFolderName: dirInfo.folderName || status.linkedFolderName || "",
            },
            folderLinked: dirInfo.linked,
            folderPermission: dirInfo.permission,
          });
        })
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.CHECK_FOR_UPDATES) {
      checkExtensionUpdate({
        attemptAutoApply: msg.attemptAutoApply !== false,
      })
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.APPLY_UNPACKED_UPDATE) {
      applyUnpackedUpdateNow({
        zipUrl: msg.zipUrl || "",
        zipSha256: msg.zipSha256 || "",
        targetVersion: msg.targetVersion || "",
        targetBuildId: msg.targetBuildId || "",
      })
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({
            ok: false,
            code: err?.code || "",
            error: err?.message || String(err),
          })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK) {
      Promise.all([
        runAutomaticBackgroundCloudPoll().catch((err) => ({
          ok: false,
          error: err?.message || String(err),
        })),
        msg.includeUpdateCheck
          ? checkExtensionUpdate({ attemptAutoApply: true }).catch(() => null)
          : Promise.resolve(null),
      ])
        .then(([syncOut, updateOut]) =>
          sendResponse({ ok: true, sync: syncOut, update: updateOut })
        )
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

    // Neon Cloud Sync runtime actions
    if (msg.type === RUNTIME_MESSAGE.SYNC_STATUS) {
      getCloudSyncProfile(storageArea)
        .then((profile) => sendResponse({ ok: true, profile }))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.SYNC_SIGNUP) {
      handleSyncSignup(msg)
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.SYNC_SIGNIN) {
      handleSyncSignin(msg)
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.SYNC_EMAIL_SEND_CODE) {
      handleSyncEmailSendCode(msg)
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.SYNC_EMAIL_VERIFY_CODE) {
      handleSyncEmailVerifyCode(msg)
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.SYNC_SAVE_PREFERENCES) {
      handleSyncSavePreferences(msg)
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.SYNC_GET_STATS) {
      handleSyncGetStats()
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.SYNC_SIGNOUT) {
      handleSyncSignout()
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.SYNC_NOW) {
      runBidirectionalCloudSync({
        deletedProviders: Array.isArray(msg.deletedProviders)
          ? msg.deletedProviders
          : [],
        deletedCacheKeys: Array.isArray(msg.deletedCacheKeys)
          ? msg.deletedCacheKeys
          : [],
        pushOnly: Boolean(msg.pushOnly),
      })
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === RUNTIME_MESSAGE.APPEND_DEBUG_LOG && msg.entry) {
      Promise.all([
        getSecretApiKeysMap(storageArea).catch(() => ({})),
        getSecretCloudSyncToken(storageArea).catch(() => ""),
      ])
        .then(([secretsMap, syncTok]) =>
          appendDebugEntry(
            msg.entry,
            [...Object.values(secretsMap), syncTok].filter(Boolean)
          )
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
        const [settings, presenceMap, lastStatus, permCheck, syncProfile] =
          await Promise.all([
            getSettings(storageArea),
            getSavedKeyPresenceMap(storageArea),
            getLastStatus(storageArea),
            checkGoogleHostPermissions(),
            getCloudSyncProfile(storageArea),
          ]);
        const configuredProviders = Object.entries(presenceMap)
          .filter(([, has]) => Boolean(has))
          .map(([id]) => id);
        const manifestVersion =
          runtimeApi?.getManifest?.()?.version || "0.2.5";

        const reportObj = {
          generatedAt: new Date().toISOString(),
          extensionVersion: manifestVersion,
          permissionsOk: permCheck.ok,
          missingOrigins: permCheck.missingOrigins,
          neonSync: {
            connected: syncProfile.connected,
            serverUrl: syncProfile.serverUrl,
            lastSyncedAt: syncProfile.lastSyncedAt,
          },
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
          `# LM Subs — Diagnostic Report (v${manifestVersion})`,
          `Generated: ${reportObj.generatedAt}`,
          `Google CDN Permissions: ${
            permCheck.ok
              ? "GRANTED"
              : `MISSING (${permCheck.missingOrigins.join(", ")})`
          }`,
          `Neon Cloud Sync: ${
            syncProfile.connected
              ? `CONNECTED (${syncProfile.serverUrl})`
              : "OFFLINE"
          }`,
          `Enabled: ${settings.enabled} | Debug Mode: ${settings.debugMode} | Primary: ${settings.primaryProvider}`,
          `Configured Providers (keys redacted): ${
            configuredProviders.length > 0
              ? configuredProviders.join(", ")
              : "(none)"
          }`,
          `Last Status: ${
            lastStatus
              ? `[${lastStatus.state}] ${lastStatus.title || ""} — ${
                  lastStatus.message || ""
                }`
              : "(none)"
          }`,
        ];

        if (msg.tabContext) {
          lines.push(
            `Tab Snapshot: host=${msg.tabContext.host}${
              msg.tabContext.pathname || ""
            } | artifacts=${msg.tabContext.artifactCount} | boundVideos=${
              msg.tabContext.videoCount
            }`
          );
          if (
            Array.isArray(msg.tabContext.artifacts) &&
            msg.tabContext.artifacts.length > 0
          ) {
            for (const a of msg.tabContext.artifacts) {
              lines.push(
                `  - Artifact ${a.id} [${a.status}] (${a.origin}) variants=${a.variantCount} ${a.mediaSummary}`
              );
            }
          }
          if (
            Array.isArray(msg.tabContext.videos) &&
            msg.tabContext.videos.length > 0
          ) {
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
            lines.push(`${l.ts} [${l.layer}] ${l.event}: ${l.detail}`);
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

export function isAllowedExternalWebSender(sender) {
  const raw = String(sender?.origin || sender?.url || "").trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (
      parsed.protocol === "http:" &&
      (host === "localhost" || host === "127.0.0.1")
    ) {
      return true;
    }
    if (
      parsed.protocol === "https:" &&
      (host === "lm-subs.vercel.app" || host.endsWith(".vercel.app"))
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function createExternalMessageDispatcher(
  runtimeDispatcher,
  {
    storageArea = globalThis.chrome?.storage?.local,
    runtimeApi = globalThis.chrome?.runtime,
  } = {}
) {
  const invokeInternal = (msg) =>
    new Promise((resolve) => {
      runtimeDispatcher(msg, {}, (res) => resolve(res));
    });

  async function buildSafeHandshakePayload() {
    const [settings, presenceMap, cloudProfile, setupState] = await Promise.all([
      getSettings(storageArea),
      getSavedKeyPresenceMap(storageArea),
      getCloudSyncProfile(storageArea),
      getSetupState(storageArea),
    ]);
    const configuredProviders = Object.entries(presenceMap || {})
      .filter(([, present]) => Boolean(present))
      .map(([id]) => id);
    return {
      ok: true,
      extensionId: runtimeApi?.id || "",
      version: runtimeApi?.getManifest?.()?.version || "0.2.5",
      configuredProviders,
      primaryProvider: settings.primaryProvider,
      settings: {
        enabled: Boolean(settings.enabled),
        autoOnGenerate: Boolean(settings.autoOnGenerate),
        autoOnExistingVideos: Boolean(settings.autoOnExistingVideos),
        autoOnAudioOverviews: Boolean(settings.autoOnAudioOverviews),
        karaokeHighlight: Boolean(settings.karaokeHighlight),
        karaokeDelayMs: Number(settings.karaokeDelayMs) || 0,
        soundAlerts: Boolean(settings.soundAlerts),
        desktopNotifications: Boolean(settings.desktopNotifications),
      },
      cloudLinked: Boolean(cloudProfile?.connected),
      cloudEmail: cloudProfile?.user?.email || null,
      setupState,
    };
  }

  return (msg, sender, sendResponse) => {
    if (!isAllowedExternalWebSender(sender)) {
      sendResponse({ ok: false, error: "Untrusted web origin." });
      return false;
    }
    if (!msg || typeof msg.type !== "string") {
      sendResponse({ ok: false, error: "Invalid external message." });
      return false;
    }

    if (msg.type === EXTERNAL_MESSAGE.WEB_HANDSHAKE) {
      buildSafeHandshakePayload()
        .then((payload) => sendResponse(payload))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === EXTERNAL_MESSAGE.WEB_SAVE_PROVIDER_KEY) {
      (async () => {
        const providerId = String(msg.provider || "").trim().toLowerCase();
        const spec = getProviderSpec(providerId);
        if (!spec) {
          throw new Error("Unsupported speech-to-text provider.");
        }
        const rawKey = String(msg.apiKey || "").trim();
        if (!rawKey) {
          throw new Error("Enter an API key first.");
        }
        await setApiKey(providerId, rawKey, storageArea);
        if (msg.makePrimary !== false) {
          await saveSettings({ primaryProvider: providerId }, storageArea);
        }
        return buildSafeHandshakePayload();
      })()
        .then((payload) => sendResponse(payload))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === EXTERNAL_MESSAGE.WEB_UPDATE_SETUP_PREFS) {
      (async () => {
        const prefs = msg.preferences || {};
        const patch = {};
        for (const boolKey of [
          "enabled",
          "autoOnGenerate",
          "autoOnExistingVideos",
          "autoOnAudioOverviews",
          "karaokeHighlight",
          "soundAlerts",
          "desktopNotifications",
        ]) {
          if (typeof prefs[boolKey] === "boolean") {
            patch[boolKey] = prefs[boolKey];
          }
        }
        if (Number.isFinite(Number(prefs.karaokeDelayMs))) {
          patch.karaokeDelayMs = Math.max(
            -1500,
            Math.min(3000, Math.round(Number(prefs.karaokeDelayMs)))
          );
        }
        if (typeof prefs.primaryProvider === "string" && getProviderSpec(prefs.primaryProvider)) {
          patch.primaryProvider = prefs.primaryProvider;
        }
        if (Object.keys(patch).length > 0) {
          await saveSettings(patch, storageArea);
        }
        if (msg.completedSetup) {
          await saveSetupState(
            { completedAt: new Date().toISOString() },
            storageArea
          );
        }
        return buildSafeHandshakePayload();
      })()
        .then((payload) => sendResponse(payload))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    if (msg.type === EXTERNAL_MESSAGE.WEB_CONNECT_CLOUD_TOKEN) {
      (async () => {
        const rawToken = String(msg.token || "").trim();
        if (!rawToken) {
          throw new Error("Missing cloud session token.");
        }
        let serverUrl = HOSTED_CLOUD_URL;
        try {
          const parsed = new URL(sender?.origin || sender?.url || HOSTED_CLOUD_URL);
          serverUrl = parsed.origin;
        } catch {
          serverUrl = HOSTED_CLOUD_URL;
        }
        const res = await invokeInternal({
          type: RUNTIME_MESSAGE.SYNC_SIGNIN,
          token: rawToken,
          serverUrl,
        });
        if (!res?.ok) {
          throw new Error(res?.error || "Could not link cloud account.");
        }
        return buildSafeHandshakePayload();
      })()
        .then((payload) => sendResponse(payload))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || String(err) })
        );
      return true;
    }

    sendResponse({ ok: false, error: "Unsupported external action." });
    return false;
  };
}

export function installBackgroundAutomation(
  dispatcher,
  {
    alarmsApi = globalThis.chrome?.alarms,
    runtimeApi = globalThis.chrome?.runtime,
    notificationsApi = globalThis.chrome?.notifications,
    tabsApi = globalThis.chrome?.tabs,
    storageArea = globalThis.chrome?.storage?.local,
    welcomeBaseUrl = HOSTED_CLOUD_URL,
  } = {}
) {
  const invoke = (msg) =>
    new Promise((resolve) => {
      dispatcher(msg, {}, (res) => resolve(res));
    });

  const scheduleAlarms = () => {
    try {
      alarmsApi?.create?.(ALARM_NAMES.UPDATE_CHECK, {
        delayInMinutes: 1,
        periodInMinutes: 15,
      });
      alarmsApi?.create?.(ALARM_NAMES.CLOUD_SYNC, {
        delayInMinutes: 1,
        periodInMinutes: 5,
      });
    } catch {
      // Ignore unsupported alarm environments
    }
  };

  scheduleAlarms();

  alarmsApi?.onAlarm?.addListener?.((alarm) => {
    if (!alarm?.name) return;
    if (alarm.name === ALARM_NAMES.UPDATE_CHECK) {
      invoke({ type: RUNTIME_MESSAGE.CHECK_FOR_UPDATES }).catch(() => {});
    } else if (alarm.name === ALARM_NAMES.CLOUD_SYNC) {
      invoke({ type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK }).catch(() => {});
    }
  });

  runtimeApi?.onStartup?.addListener?.(() => {
    scheduleAlarms();
    invoke({
      type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK,
      includeUpdateCheck: true,
    }).catch(() => {});
  });

  runtimeApi?.onInstalled?.addListener?.((details) => {
    scheduleAlarms();
    if (details?.reason === "install") {
      const nowIso = new Date().toISOString();
      const extId = runtimeApi?.id || "";
      const ver = runtimeApi?.getManifest?.()?.version || "0.2.5";
      const base = normalizeSyncServerUrl(welcomeBaseUrl || HOSTED_CLOUD_URL);
      const qs = new URLSearchParams({ installed: "1", v: ver });
      if (extId) qs.set("extId", extId);
      const welcomeUrl = `${base}/welcome?${qs.toString()}`;
      saveSetupState(
        { installedAt: nowIso, welcomeOpenedAt: nowIso },
        storageArea
      ).catch(() => {});
      try {
        tabsApi?.create?.({ url: welcomeUrl, active: true });
      } catch {
        // Ignore headless environment without tabs API
      }
    }
    invoke({
      type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK,
      includeUpdateCheck: true,
    }).catch(() => {});
  });

  // Automatically reload CRX / Web Store builds as soon as idle
  runtimeApi?.onUpdateAvailable?.addListener?.(() => {
    try {
      runtimeApi.reload?.();
    } catch {
      // Ignore
    }
  });

  notificationsApi?.onClicked?.addListener?.(() => {
    try {
      runtimeApi?.openOptionsPage?.();
    } catch {
      // Ignore
    }
  });
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  const liveDispatcher = createRuntimeDispatcher();
  chrome.runtime.onMessage.addListener(liveDispatcher);
  const liveExternalDispatcher = createExternalMessageDispatcher(liveDispatcher);
  chrome.runtime.onMessageExternal?.addListener?.(liveExternalDispatcher);
  installBackgroundAutomation(liveDispatcher);
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

/**
 * `chrome.storage.local` state, BYOK key isolation, and LRU Subtitle Cache.
 *
 * Security invariants:
 * - `getApiKey()` and `getSecretApiKeysMap()` MUST ONLY be called inside
 *   `src/background/service-worker.js`.
 * - `popup.js` and `options.js` only ever receive boolean presence flags via
 *   `getSavedKeyPresenceMap()`, plus `setApiKey()` and `clearApiKey()`.
 */

import { DEFAULT_QUEUE_ORDER, getProviderSpec } from "./providers/registry.js";

export const STORAGE_KEYS = Object.freeze({
  SETTINGS: "settings",
  API_KEYS: "apiKeys",
  SUBTITLE_CACHE: "subtitleCache",
  HISTORY: "subtitleHistory",
  LAST_STATUS: "lastStatus",
  DEBUG_LOGS: "debugLogs",
});

export const MAX_CACHE_ENTRIES = 35;
export const MAX_HISTORY_ENTRIES = 60;
export const MAX_DEBUG_LOGS = 120;

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  debugMode: false,
  autoOnGenerate: true,
  autoOnExistingVideos: true,
  primaryProvider: "groq",
  queueOrder: [...DEFAULT_QUEUE_ORDER],
  providerModels: {},
  customBaseUrl: "",
  customEnabled: false,
  languageHint: "auto",
  translateTo: "original",
  fontSize: "medium", // "small" | "medium" | "large" | "xlarge"
  subtitleOffsetSec: 0,
  showToast: true,
  excludePatterns: [],
  rpcOverrides: {},
});

function resolveStorage(storageArea) {
  const area = storageArea || globalThis.chrome?.storage?.local;
  if (!area) {
    throw new Error("chrome.storage.local is unavailable in this context");
  }
  return area;
}

function normalizeQueueOrder(rawOrder) {
  const out = [];
  if (Array.isArray(rawOrder)) {
    for (const id of rawOrder) {
      if (typeof id === "string" && DEFAULT_QUEUE_ORDER.includes(id) && !out.includes(id)) {
        out.push(id);
      }
    }
  }
  for (const id of DEFAULT_QUEUE_ORDER) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export async function getSettings(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.SETTINGS);
  const saved = raw?.[STORAGE_KEYS.SETTINGS];
  if (!saved || typeof saved !== "object") {
    return {
      ...DEFAULT_SETTINGS,
      queueOrder: [...DEFAULT_QUEUE_ORDER],
      providerModels: {},
      excludePatterns: [],
      rpcOverrides: {},
    };
  }

  const queueOrder = normalizeQueueOrder(saved.queueOrder);
  const primaryProvider =
    typeof saved.primaryProvider === "string" &&
    DEFAULT_QUEUE_ORDER.includes(saved.primaryProvider)
      ? saved.primaryProvider
      : queueOrder[0] || "groq";

  const providerModels = {};
  if (saved.providerModels && typeof saved.providerModels === "object") {
    for (const [k, v] of Object.entries(saved.providerModels)) {
      if (typeof v === "string" && v.trim()) {
        providerModels[k] = v.trim();
      }
    }
  }

  const rpcOverrides = {};
  if (saved.rpcOverrides && typeof saved.rpcOverrides === "object") {
    for (const [k, v] of Object.entries(saved.rpcOverrides)) {
      if (typeof v === "string" && v.trim()) {
        rpcOverrides[k] = v.trim();
      }
    }
  }

  return {
    enabled:
      typeof saved.enabled === "boolean"
        ? saved.enabled
        : DEFAULT_SETTINGS.enabled,
    debugMode:
      typeof saved.debugMode === "boolean"
        ? saved.debugMode
        : DEFAULT_SETTINGS.debugMode,
    autoOnGenerate:
      typeof saved.autoOnGenerate === "boolean"
        ? saved.autoOnGenerate
        : DEFAULT_SETTINGS.autoOnGenerate,
    autoOnExistingVideos:
      typeof saved.autoOnExistingVideos === "boolean"
        ? saved.autoOnExistingVideos
        : DEFAULT_SETTINGS.autoOnExistingVideos,
    primaryProvider,
    queueOrder,
    providerModels,
    customBaseUrl:
      typeof saved.customBaseUrl === "string" ? saved.customBaseUrl.trim() : "",
    customEnabled: Boolean(saved.customEnabled),
    languageHint:
      typeof saved.languageHint === "string" && saved.languageHint
        ? saved.languageHint
        : "auto",
    translateTo:
      typeof saved.translateTo === "string" && saved.translateTo
        ? saved.translateTo
        : "original",
    fontSize: ["small", "medium", "large", "xlarge"].includes(saved.fontSize)
      ? saved.fontSize
      : "medium",
    subtitleOffsetSec: Number.isFinite(Number(saved.subtitleOffsetSec))
      ? Math.max(-10, Math.min(10, Number(saved.subtitleOffsetSec)))
      : 0,
    showToast:
      typeof saved.showToast === "boolean"
        ? saved.showToast
        : DEFAULT_SETTINGS.showToast,
    excludePatterns: Array.isArray(saved.excludePatterns)
      ? saved.excludePatterns.map((s) => String(s).trim()).filter(Boolean)
      : [],
    rpcOverrides,
  };
}

export async function saveSettings(partial, storageArea) {
  const store = resolveStorage(storageArea);
  const current = await getSettings(store);
  const next = {
    ...current,
    ...partial,
  };

  if (partial?.queueOrder) {
    next.queueOrder = normalizeQueueOrder(partial.queueOrder);
  }
  if (
    partial?.primaryProvider &&
    DEFAULT_QUEUE_ORDER.includes(partial.primaryProvider)
  ) {
    next.primaryProvider = partial.primaryProvider;
    // Promote primary provider to top of queue if user explicitly selected it in quick popup
    if (!partial.queueOrder) {
      next.queueOrder = normalizeQueueOrder([
        partial.primaryProvider,
        ...next.queueOrder,
      ]);
    }
  } else if (next.queueOrder.length > 0) {
    next.primaryProvider = next.queueOrder[0];
  }

  if (Array.isArray(partial?.excludePatterns)) {
    next.excludePatterns = partial.excludePatterns
      .map((s) => String(s).trim())
      .filter(Boolean);
  }

  await store.set({ [STORAGE_KEYS.SETTINGS]: next });
  return next;
}

export function getModelForProvider(settings, providerId) {
  const saved = settings?.providerModels?.[providerId];
  if (typeof saved === "string" && saved.trim()) return saved.trim();
  return getProviderSpec(providerId).defaultModel;
}

/**
 * RESTRICTED: Call ONLY inside `src/background/service-worker.js`.
 */
export async function getSecretApiKeysMap(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.API_KEYS);
  const map = raw?.[STORAGE_KEYS.API_KEYS];
  if (!map || typeof map !== "object") return {};
  const clean = {};
  for (const [k, v] of Object.entries(map)) {
    if (typeof v === "string" && v.trim()) {
      clean[k] = v.trim();
    }
  }
  return clean;
}

/**
 * RESTRICTED: Call ONLY inside `src/background/service-worker.js`.
 */
export async function getApiKey(providerId, storageArea) {
  const map = await getSecretApiKeysMap(storageArea);
  return map[providerId] || "";
}

/**
 * Safe boolean map (`{ groq: true, mistral: false, ... }`) for Popup & Options UI.
 */
export async function getSavedKeyPresenceMap(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.API_KEYS);
  const map = raw?.[STORAGE_KEYS.API_KEYS] || {};
  const presence = {};
  for (const id of DEFAULT_QUEUE_ORDER) {
    presence[id] = typeof map[id] === "string" && map[id].trim().length > 0;
  }
  return presence;
}

export async function hasApiKey(providerId, storageArea) {
  const presence = await getSavedKeyPresenceMap(storageArea);
  return Boolean(presence[providerId]);
}

export async function setApiKey(providerId, apiKey, storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.API_KEYS);
  const current =
    raw?.[STORAGE_KEYS.API_KEYS] && typeof raw[STORAGE_KEYS.API_KEYS] === "object"
      ? { ...raw[STORAGE_KEYS.API_KEYS] }
      : {};

  const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
  if (trimmed) {
    current[providerId] = trimmed;
  } else {
    delete current[providerId];
  }
  await store.set({ [STORAGE_KEYS.API_KEYS]: current });
}

export async function clearApiKey(providerId, storageArea) {
  return setApiKey(providerId, "", storageArea);
}

/**
 * Reads the LRU subtitle transcript cache array (newest first).
 */
export async function getSubtitleCacheList(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.SUBTITLE_CACHE);
  const list = raw?.[STORAGE_KEYS.SUBTITLE_CACHE];
  return Array.isArray(list) ? list : [];
}

/**
 * Looks up a cached subtitle entry by `cacheKey`, `artifactId`, or `mediaToken`.
 */
export async function findCachedSubtitles(
  { cacheKey, artifactId, mediaToken } = {},
  storageArea
) {
  const list = await getSubtitleCacheList(storageArea);
  for (const item of list) {
    if (!item || !Array.isArray(item.cues) || item.cues.length === 0) continue;
    if (cacheKey && item.cacheKey === cacheKey) return item;
    if (artifactId && item.artifactId === artifactId) return item;
    if (mediaToken && item.mediaToken === mediaToken) return item;
  }
  return null;
}

export async function getCachedKeysList(storageArea) {
  const list = await getSubtitleCacheList(storageArea);
  const keys = [];
  for (const item of list) {
    if (item?.cacheKey) keys.push(item.cacheKey);
    if (item?.artifactId) keys.push(`artifact:${item.artifactId}`);
    if (item?.mediaToken) keys.push(`token:${item.mediaToken}`);
  }
  return [...new Set(keys)];
}

/**
 * Saves generated or imported subtitles to the local LRU cache & appends to history.
 */
export async function saveCachedSubtitles(entry, storageArea) {
  const store = resolveStorage(storageArea);
  const [list, history] = await Promise.all([
    getSubtitleCacheList(store),
    getHistory(store),
  ]);

  const nowIso = new Date().toISOString();
  const record = {
    cacheKey: entry.cacheKey,
    artifactId: entry.artifactId || null,
    notebookId: entry.notebookId || null,
    mediaToken: entry.mediaToken || null,
    title: entry.title || "NotebookLM Video Overview",
    language: entry.language || "auto",
    provider: entry.provider || "manual",
    model: entry.model || "",
    failoverUsed: Boolean(entry.failoverUsed),
    cueCount: Array.isArray(entry.cues) ? entry.cues.length : 0,
    durationSeconds: entry.durationSeconds || null,
    extractedBytes: entry.extractedBytes || null,
    originalBytes: entry.originalBytes || null,
    latencyMs: entry.latencyMs || null,
    cues: Array.isArray(entry.cues) ? entry.cues : [],
    createdAt: nowIso,
  };

  const filtered = list.filter((it) => {
    if (record.cacheKey && it.cacheKey === record.cacheKey) return false;
    if (record.artifactId && it.artifactId === record.artifactId) return false;
    if (record.mediaToken && it.mediaToken === record.mediaToken) return false;
    return true;
  });

  const nextCache = [record, ...filtered].slice(0, MAX_CACHE_ENTRIES);

  const summaryRow = {
    cacheKey: record.cacheKey,
    artifactId: record.artifactId,
    notebookId: record.notebookId,
    title: record.title,
    provider: record.provider,
    model: record.model,
    failoverUsed: record.failoverUsed,
    cueCount: record.cueCount,
    extractedBytes: record.extractedBytes,
    originalBytes: record.originalBytes,
    latencyMs: record.latencyMs,
    createdAt: nowIso,
  };

  const nextHistory = [
    summaryRow,
    ...history.filter((h) => h.cacheKey !== record.cacheKey),
  ].slice(0, MAX_HISTORY_ENTRIES);

  await store.set({
    [STORAGE_KEYS.SUBTITLE_CACHE]: nextCache,
    [STORAGE_KEYS.HISTORY]: nextHistory,
  });

  return record;
}

export async function deleteCachedSubtitles(cacheKey, storageArea) {
  const store = resolveStorage(storageArea);
  const [list, history] = await Promise.all([
    getSubtitleCacheList(store),
    getHistory(store),
  ]);
  await store.set({
    [STORAGE_KEYS.SUBTITLE_CACHE]: list.filter((it) => it.cacheKey !== cacheKey),
    [STORAGE_KEYS.HISTORY]: history.filter((h) => h.cacheKey !== cacheKey),
  });
}

export async function clearAllCachedSubtitles(storageArea) {
  const store = resolveStorage(storageArea);
  await store.set({
    [STORAGE_KEYS.SUBTITLE_CACHE]: [],
    [STORAGE_KEYS.HISTORY]: [],
  });
}

export async function getHistory(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.HISTORY);
  const list = raw?.[STORAGE_KEYS.HISTORY];
  return Array.isArray(list) ? list : [];
}

export async function getLastStatus(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.LAST_STATUS);
  return raw?.[STORAGE_KEYS.LAST_STATUS] || null;
}

export async function setLastStatus(status, storageArea) {
  const store = resolveStorage(storageArea);
  const next = {
    ...status,
    updatedAt: new Date().toISOString(),
  };
  await store.set({ [STORAGE_KEYS.LAST_STATUS]: next });
  return next;
}

export function sanitizeDebugMessage(text) {
  if (typeof text !== "string") return String(text ?? "");
  return text
    .replace(/\b(?:gsk_|sk-|AIza|hf_|xi-)[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9._:-]+/gi, "Bearer [REDACTED]")
    .slice(0, 600);
}

export async function getDebugLogs(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.DEBUG_LOGS);
    const list = raw?.[STORAGE_KEYS.DEBUG_LOGS];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveDebugLogs(logs, storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const trimmed = Array.isArray(logs) ? logs.slice(-MAX_DEBUG_LOGS) : [];
    await store.set({ [STORAGE_KEYS.DEBUG_LOGS]: trimmed });
    return trimmed;
  } catch {
    return [];
  }
}

export async function clearDebugLogs(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    await store.set({ [STORAGE_KEYS.DEBUG_LOGS]: [] });
  } catch {
    // Ignore
  }
}

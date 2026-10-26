/**
 * `chrome.storage.local` state, BYOK key isolation, and LRU Subtitle Cache.
 *
 * Security invariants:
 * - `getApiKey()` and `getSecretApiKeysMap()` MUST ONLY be called inside
 *   `src/background/service-worker.js`.
 * - `popup.js` and `options.js` only ever receive boolean presence flags via
 *   `getSavedKeyPresenceMap()`, plus `setApiKey()` and `clearApiKey()`.
 */

import { HOSTED_CLOUD_URL } from "../config/selectors.js";
import { DEFAULT_QUEUE_ORDER, getProviderSpec } from "./providers/registry.js";

export const STORAGE_KEYS = Object.freeze({
  SETTINGS: "settings",
  API_KEYS: "apiKeys",
  SUBTITLE_CACHE: "subtitleCache",
  HISTORY: "subtitleHistory",
  LAST_STATUS: "lastStatus",
  DEBUG_LOGS: "debugLogs",
  NOTIFICATIONS: "notifications",
  UPDATE_STATUS: "updateStatus",
  CLOUD_SYNC_PROFILE: "cloudSyncProfile",
  CLOUD_SYNC_SECRET: "cloudSyncSecret",
  SETUP_STATE: "setupState",
  NOTEBOOKLM_STATS: "notebooklmStats",
});

export const MAX_CACHE_ENTRIES = 35;
export const MAX_HISTORY_ENTRIES = 60;
export const MAX_DEBUG_LOGS = 120;
export const MAX_NOTIFICATIONS = 50;

export const CAPTION_FONT_SIZES = Object.freeze([
  "small",
  "medium",
  "large",
  "xlarge",
  "xxlarge",
]);
export const CAPTION_STYLES = Object.freeze([
  "classic",
  "contrast",
  "minimal",
  "cinema",
  "paper",
  "amber",
]);
export const CAPTION_FONT_FAMILIES = Object.freeze([
  "sans",
  "serif",
  "mono",
  "dyslexic",
]);
export const CAPTION_COLORS = Object.freeze([
  "white",
  "yellow",
  "cyan",
  "green",
  "ink",
]);
export const CAPTION_POSITIONS = Object.freeze(["bottom", "raised", "top"]);
export const CAPTION_WIDTHS = Object.freeze(["compact", "balanced", "wide"]);
export const PLAYBAR_DOCK_MODES = Object.freeze(["native", "hover", "always"]);
export const NOTIFICATION_SOUND_PRESETS = Object.freeze([
  "chime",
  "marimba",
  "bell",
  "pulse",
  "soft-pop",
  "none",
]);
export const PLAYBACK_SPEEDS = Object.freeze([
  0.5,
  0.75,
  1,
  1.25,
  1.5,
  1.75,
  2,
  2.5,
]);

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  debugMode: false,
  autoOnGenerate: true,
  autoOnExistingVideos: true,
  autoOnAudioOverviews: true,
  primaryProvider: "groq",
  queueOrder: [...DEFAULT_QUEUE_ORDER],
  providerModels: {},
  customBaseUrl: "",
  customEnabled: false,
  languageHint: "auto",
  translateTo: "original",
  fontSize: "medium", // "small" | "medium" | "large" | "xlarge" | "xxlarge"
  captionStyle: "classic", // "classic" | "contrast" | "minimal" | "cinema" | "paper" | "amber"
  captionFontFamily: "sans", // "sans" | "serif" | "mono" | "dyslexic"
  captionColor: "white", // "white" | "yellow" | "cyan" | "green" | "ink"
  captionBgOpacity: 88, // 0..100
  captionPosition: "bottom", // "bottom" | "raised" | "top"
  captionMaxWidth: "balanced", // "compact" | "balanced" | "wide"
  karaokeHighlight: true,
  karaokeDelayMs: 0, // -1500..3000 ms delay applied to word-by-word highlight
  showSpeakerLabels: true,
  pauseOnCaptionHover: false,
  clickCaptionToCopy: true,
  defaultPlaybackSpeed: 1,
  subtitleOffsetSec: 0,
  fineGrainedControls: false,
  dynamicCaptionScaling: true,
  captionScaleFactor: 100, // 50..200 (%)
  captionMinFontPx: 10, // 8..18 (px)
  captionMaxFontPx: 42, // 20..64 (px)
  captionPaddingY: 7, // 2..20 (px)
  captionPaddingX: 15, // 6..40 (px)
  captionBorderRadius: 7, // 0..32 (px)
  captionLineHeight: 142, // 115..185 (%)
  captionBottomOffsetPx: 54, // 24..180 (px)
  captionTextStrokePx: 0, // 0..3 (px)
  karaokeHighlightOpacity: 48, // 15..95 (%)
  upcomingWordOpacity: 64, // 25..100 (%)
  playBarDockMode: "native", // "native" | "hover" | "always"
  hoverFadeDelayMs: 2200, // 400..6000 (ms)
  keepSubtitlesInPiP: true,
  skipSilenceEnabled: false,
  skipSilenceGapSec: 1.6, // 0.6..5.0 (s)
  skipSilenceRate: 2.2, // 1.4..3.0 (x)
  audioBoostPercent: 100, // 100..250 (%)
  showToast: true,
  desktopNotifications: true,
  soundAlerts: true,
  notificationSoundPreset: "chime",
  notificationSoundVolume: 75,
  badgeAlerts: true,
  notifyOnFailover: true,
  notifyOnSync: false,
  autoUpdateExtension: true,
  autoBackgroundSync: true,
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
    autoOnAudioOverviews:
      typeof saved.autoOnAudioOverviews === "boolean"
        ? saved.autoOnAudioOverviews
        : DEFAULT_SETTINGS.autoOnAudioOverviews,
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
    fontSize: CAPTION_FONT_SIZES.includes(saved.fontSize)
      ? saved.fontSize
      : "medium",
    captionStyle: CAPTION_STYLES.includes(saved.captionStyle)
      ? saved.captionStyle
      : "classic",
    captionFontFamily: CAPTION_FONT_FAMILIES.includes(saved.captionFontFamily)
      ? saved.captionFontFamily
      : "sans",
    captionColor: CAPTION_COLORS.includes(saved.captionColor)
      ? saved.captionColor
      : "white",
    captionBgOpacity: Number.isFinite(Number(saved.captionBgOpacity))
      ? Math.max(0, Math.min(100, Math.round(Number(saved.captionBgOpacity))))
      : DEFAULT_SETTINGS.captionBgOpacity,
    captionPosition: CAPTION_POSITIONS.includes(saved.captionPosition)
      ? saved.captionPosition
      : "bottom",
    captionMaxWidth: CAPTION_WIDTHS.includes(saved.captionMaxWidth)
      ? saved.captionMaxWidth
      : "balanced",
    karaokeHighlight:
      typeof saved.karaokeHighlight === "boolean"
        ? saved.karaokeHighlight
        : DEFAULT_SETTINGS.karaokeHighlight,
    karaokeDelayMs: Number.isFinite(Number(saved.karaokeDelayMs))
      ? Math.max(-1500, Math.min(3000, Math.round(Number(saved.karaokeDelayMs) / 10) * 10))
      : DEFAULT_SETTINGS.karaokeDelayMs,
    showSpeakerLabels:
      typeof saved.showSpeakerLabels === "boolean"
        ? saved.showSpeakerLabels
        : DEFAULT_SETTINGS.showSpeakerLabels,
    pauseOnCaptionHover:
      typeof saved.pauseOnCaptionHover === "boolean"
        ? saved.pauseOnCaptionHover
        : DEFAULT_SETTINGS.pauseOnCaptionHover,
    clickCaptionToCopy:
      typeof saved.clickCaptionToCopy === "boolean"
        ? saved.clickCaptionToCopy
        : DEFAULT_SETTINGS.clickCaptionToCopy,
    defaultPlaybackSpeed: PLAYBACK_SPEEDS.includes(Number(saved.defaultPlaybackSpeed))
      ? Number(saved.defaultPlaybackSpeed)
      : DEFAULT_SETTINGS.defaultPlaybackSpeed,
    subtitleOffsetSec: Number.isFinite(Number(saved.subtitleOffsetSec))
      ? Math.max(-10, Math.min(10, Number(saved.subtitleOffsetSec)))
      : 0,
    fineGrainedControls:
      typeof saved.fineGrainedControls === "boolean"
        ? saved.fineGrainedControls
        : DEFAULT_SETTINGS.fineGrainedControls,
    dynamicCaptionScaling:
      typeof saved.dynamicCaptionScaling === "boolean"
        ? saved.dynamicCaptionScaling
        : DEFAULT_SETTINGS.dynamicCaptionScaling,
    captionScaleFactor: Number.isFinite(Number(saved.captionScaleFactor))
      ? Math.max(50, Math.min(200, Math.round(Number(saved.captionScaleFactor))))
      : DEFAULT_SETTINGS.captionScaleFactor,
    captionMinFontPx: Number.isFinite(Number(saved.captionMinFontPx))
      ? Math.max(8, Math.min(18, Math.round(Number(saved.captionMinFontPx))))
      : DEFAULT_SETTINGS.captionMinFontPx,
    captionMaxFontPx: Number.isFinite(Number(saved.captionMaxFontPx))
      ? Math.max(20, Math.min(64, Math.round(Number(saved.captionMaxFontPx))))
      : DEFAULT_SETTINGS.captionMaxFontPx,
    captionPaddingY: Number.isFinite(Number(saved.captionPaddingY))
      ? Math.max(2, Math.min(20, Math.round(Number(saved.captionPaddingY))))
      : DEFAULT_SETTINGS.captionPaddingY,
    captionPaddingX: Number.isFinite(Number(saved.captionPaddingX))
      ? Math.max(6, Math.min(40, Math.round(Number(saved.captionPaddingX))))
      : DEFAULT_SETTINGS.captionPaddingX,
    captionBorderRadius: Number.isFinite(Number(saved.captionBorderRadius))
      ? Math.max(0, Math.min(32, Math.round(Number(saved.captionBorderRadius))))
      : DEFAULT_SETTINGS.captionBorderRadius,
    captionLineHeight: Number.isFinite(Number(saved.captionLineHeight))
      ? Math.max(115, Math.min(185, Math.round(Number(saved.captionLineHeight))))
      : DEFAULT_SETTINGS.captionLineHeight,
    captionBottomOffsetPx: Number.isFinite(Number(saved.captionBottomOffsetPx))
      ? Math.max(24, Math.min(180, Math.round(Number(saved.captionBottomOffsetPx))))
      : DEFAULT_SETTINGS.captionBottomOffsetPx,
    captionTextStrokePx: Number.isFinite(Number(saved.captionTextStrokePx))
      ? Math.max(0, Math.min(3, Math.round(Number(saved.captionTextStrokePx) * 2) / 2))
      : DEFAULT_SETTINGS.captionTextStrokePx,
    karaokeHighlightOpacity: Number.isFinite(Number(saved.karaokeHighlightOpacity))
      ? Math.max(15, Math.min(95, Math.round(Number(saved.karaokeHighlightOpacity))))
      : DEFAULT_SETTINGS.karaokeHighlightOpacity,
    upcomingWordOpacity: Number.isFinite(Number(saved.upcomingWordOpacity))
      ? Math.max(25, Math.min(100, Math.round(Number(saved.upcomingWordOpacity))))
      : DEFAULT_SETTINGS.upcomingWordOpacity,
    playBarDockMode: PLAYBAR_DOCK_MODES.includes(saved.playBarDockMode)
      ? saved.playBarDockMode
      : DEFAULT_SETTINGS.playBarDockMode,
    hoverFadeDelayMs: Number.isFinite(Number(saved.hoverFadeDelayMs))
      ? Math.max(400, Math.min(6000, Math.round(Number(saved.hoverFadeDelayMs) / 100) * 100))
      : DEFAULT_SETTINGS.hoverFadeDelayMs,
    keepSubtitlesInPiP:
      typeof saved.keepSubtitlesInPiP === "boolean"
        ? saved.keepSubtitlesInPiP
        : DEFAULT_SETTINGS.keepSubtitlesInPiP,
    skipSilenceEnabled:
      typeof saved.skipSilenceEnabled === "boolean"
        ? saved.skipSilenceEnabled
        : DEFAULT_SETTINGS.skipSilenceEnabled,
    skipSilenceGapSec: Number.isFinite(Number(saved.skipSilenceGapSec))
      ? Math.max(0.6, Math.min(5, Math.round(Number(saved.skipSilenceGapSec) * 10) / 10))
      : DEFAULT_SETTINGS.skipSilenceGapSec,
    skipSilenceRate: Number.isFinite(Number(saved.skipSilenceRate))
      ? Math.max(1.4, Math.min(3, Math.round(Number(saved.skipSilenceRate) * 10) / 10))
      : DEFAULT_SETTINGS.skipSilenceRate,
    audioBoostPercent: Number.isFinite(Number(saved.audioBoostPercent))
      ? Math.max(100, Math.min(250, Math.round(Number(saved.audioBoostPercent) / 5) * 5))
      : DEFAULT_SETTINGS.audioBoostPercent,
    showToast:
      typeof saved.showToast === "boolean"
        ? saved.showToast
        : DEFAULT_SETTINGS.showToast,
    desktopNotifications:
      typeof saved.desktopNotifications === "boolean"
        ? saved.desktopNotifications
        : DEFAULT_SETTINGS.desktopNotifications,
    soundAlerts:
      typeof saved.soundAlerts === "boolean"
        ? saved.soundAlerts
        : DEFAULT_SETTINGS.soundAlerts,
    notificationSoundPreset: NOTIFICATION_SOUND_PRESETS.includes(
      saved.notificationSoundPreset
    )
      ? saved.notificationSoundPreset
      : DEFAULT_SETTINGS.notificationSoundPreset,
    notificationSoundVolume: Number.isFinite(Number(saved.notificationSoundVolume))
      ? Math.max(10, Math.min(100, Math.round(Number(saved.notificationSoundVolume))))
      : DEFAULT_SETTINGS.notificationSoundVolume,
    badgeAlerts:
      typeof saved.badgeAlerts === "boolean"
        ? saved.badgeAlerts
        : DEFAULT_SETTINGS.badgeAlerts,
    notifyOnFailover:
      typeof saved.notifyOnFailover === "boolean"
        ? saved.notifyOnFailover
        : DEFAULT_SETTINGS.notifyOnFailover,
    notifyOnSync:
      typeof saved.notifyOnSync === "boolean"
        ? saved.notifyOnSync
        : DEFAULT_SETTINGS.notifyOnSync,
    autoUpdateExtension:
      typeof saved.autoUpdateExtension === "boolean"
        ? saved.autoUpdateExtension
        : DEFAULT_SETTINGS.autoUpdateExtension,
    autoBackgroundSync:
      typeof saved.autoBackgroundSync === "boolean"
        ? saved.autoBackgroundSync
        : DEFAULT_SETTINGS.autoBackgroundSync,
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

  if (partial && "karaokeDelayMs" in partial) {
    next.karaokeDelayMs = Number.isFinite(Number(partial.karaokeDelayMs))
      ? Math.max(-1500, Math.min(3000, Math.round(Number(partial.karaokeDelayMs) / 10) * 10))
      : DEFAULT_SETTINGS.karaokeDelayMs;
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
    .replace(/\b(?:gsk_|sk-|AIza|hf_|xi-|lms_)[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_KEY]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]")
    .replace(/Bearer\s+[A-Za-z0-9._:-]+/gi, "Bearer [REDACTED]")
    .slice(0, 600);
}

export const DEFAULT_SYNC_PREFERENCES = Object.freeze({
  syncApiKeys: true,
  syncTranscripts: true,
  syncSettings: true,
});

export function normalizeSyncPreferences(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SYNC_PREFERENCES };
  }
  return {
    syncApiKeys:
      typeof raw.syncApiKeys === "boolean"
        ? raw.syncApiKeys
        : DEFAULT_SYNC_PREFERENCES.syncApiKeys,
    syncTranscripts:
      typeof raw.syncTranscripts === "boolean"
        ? raw.syncTranscripts
        : DEFAULT_SYNC_PREFERENCES.syncTranscripts,
    syncSettings:
      typeof raw.syncSettings === "boolean"
        ? raw.syncSettings
        : DEFAULT_SYNC_PREFERENCES.syncSettings,
  };
}

export const DEFAULT_CLOUD_SYNC_PROFILE = Object.freeze({
  serverUrl: HOSTED_CLOUD_URL,
  connected: false,
  autoSync: true,
  syncPreferences: DEFAULT_SYNC_PREFERENCES,
  user: null,
  keyHints: {},
  subtitleCount: 0,
  lastSyncedAt: null,
});

export function normalizeSyncServerUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return DEFAULT_CLOUD_SYNC_PROFILE.serverUrl;
  }
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return DEFAULT_CLOUD_SYNC_PROFILE.serverUrl;
    }
    return `${parsed.origin}${parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/api$/, "")}`;
  } catch {
    return DEFAULT_CLOUD_SYNC_PROFILE.serverUrl;
  }
}

export async function getCloudSyncProfile(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.CLOUD_SYNC_PROFILE);
  const saved = raw?.[STORAGE_KEYS.CLOUD_SYNC_PROFILE];
  if (!saved || typeof saved !== "object") {
    return {
      ...DEFAULT_CLOUD_SYNC_PROFILE,
      syncPreferences: { ...DEFAULT_SYNC_PREFERENCES },
    };
  }
  return {
    serverUrl: normalizeSyncServerUrl(saved.serverUrl),
    connected: Boolean(saved.connected && saved.user?.email),
    autoSync: typeof saved.autoSync === "boolean" ? saved.autoSync : true,
    syncPreferences: normalizeSyncPreferences(saved.syncPreferences),
    user:
      saved.user && typeof saved.user === "object"
        ? {
            id: String(saved.user.id || ""),
            email: String(saved.user.email || ""),
            name: String(saved.user.name || ""),
            authProvider: String(saved.user.authProvider || "email"),
          }
        : null,
    keyHints:
      saved.keyHints && typeof saved.keyHints === "object"
        ? { ...saved.keyHints }
        : {},
    subtitleCount: Number(saved.subtitleCount) || 0,
    lastSyncedAt: saved.lastSyncedAt || null,
  };
}

export async function saveCloudSyncProfile(partial, storageArea) {
  const store = resolveStorage(storageArea);
  const current = await getCloudSyncProfile(store);
  const next = {
    ...current,
    ...partial,
  };
  if (partial?.syncPreferences) {
    next.syncPreferences = normalizeSyncPreferences({
      ...current.syncPreferences,
      ...partial.syncPreferences,
    });
  } else {
    next.syncPreferences = normalizeSyncPreferences(next.syncPreferences);
  }
  next.serverUrl = normalizeSyncServerUrl(next.serverUrl);
  next.connected = Boolean(next.connected && next.user?.email);
  await store.set({ [STORAGE_KEYS.CLOUD_SYNC_PROFILE]: next });
  return next;
}

/**
 * RESTRICTED: Call ONLY inside `src/background/service-worker.js`.
 */
export async function getSecretCloudSyncToken(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.CLOUD_SYNC_SECRET);
  const tok = raw?.[STORAGE_KEYS.CLOUD_SYNC_SECRET]?.token;
  return typeof tok === "string" ? tok.trim() : "";
}

/**
 * RESTRICTED: Call ONLY inside `src/background/service-worker.js`.
 */
export async function setSecretCloudSyncToken(token, storageArea) {
  const store = resolveStorage(storageArea);
  const trimmed = typeof token === "string" ? token.trim() : "";
  if (!trimmed) {
    await store.set({ [STORAGE_KEYS.CLOUD_SYNC_SECRET]: {} });
    return;
  }
  await store.set({ [STORAGE_KEYS.CLOUD_SYNC_SECRET]: { token: trimmed } });
}

/**
 * RESTRICTED: Call ONLY inside `src/background/service-worker.js`.
 * Merges decrypted cloud API keys into `chrome.storage.local` without clobbering unsynced local keys.
 */
export async function mergeSecretApiKeysFromCloud(cloudKeys, storageArea) {
  if (!cloudKeys || typeof cloudKeys !== "object") return;
  const store = resolveStorage(storageArea);
  const current = await getSecretApiKeysMap(store);
  const merged = { ...current };
  for (const [providerId, rawKey] of Object.entries(cloudKeys)) {
    if (typeof rawKey === "string" && rawKey.trim()) {
      merged[providerId] = rawKey.trim();
    }
  }
  await store.set({ [STORAGE_KEYS.API_KEYS]: merged });
}

/**
 * Merges subtitle transcripts pulled from Neon Lakebase Postgres into local cache & history.
 */
function hasTranscriptContentChanged(prev, incoming) {
  if (!prev || !incoming) return true;
  const prevTitle = String(prev.title || "Video Overview").trim();
  const nextTitle = String(incoming.title || prev.title || "Video Overview").trim();
  if (prevTitle !== nextTitle) return true;
  const prevLang = String(prev.language || "en").trim();
  const nextLang = String(incoming.language || prev.language || "en").trim();
  if (prevLang !== nextLang) return true;
  const prevCues = Array.isArray(prev.cues) ? prev.cues : [];
  const nextCues = Array.isArray(incoming.cues) ? incoming.cues : [];
  if (prevCues.length !== nextCues.length) return true;
  for (let i = 0; i < prevCues.length; i += 1) {
    const a = prevCues[i];
    const b = nextCues[i];
    if (
      Math.abs((Number(a?.startSec) || 0) - (Number(b?.startSec) || 0)) > 0.005 ||
      Math.abs((Number(a?.endSec) || 0) - (Number(b?.endSec) || 0)) > 0.005 ||
      String(a?.text || "") !== String(b?.text || "") ||
      Boolean(a?.bookmarked) !== Boolean(b?.bookmarked) ||
      String(a?.secondaryText || "") !== String(b?.secondaryText || "")
    ) {
      return true;
    }
  }
  return false;
}

export async function mergeCloudSubtitlesIntoCache(cloudSubtitles, storageArea) {
  if (!Array.isArray(cloudSubtitles) || cloudSubtitles.length === 0) {
    return { addedEntries: [], updatedEntries: [] };
  }
  const store = resolveStorage(storageArea);
  const [localCache, localHistory] = await Promise.all([
    getSubtitleCacheList(store),
    getHistory(store),
  ]);

  const byKey = new Map();
  for (const item of localCache) {
    if (item?.cacheKey) byKey.set(item.cacheKey, item);
  }

  const addedEntries = [];
  const updatedEntries = [];

  for (const sub of cloudSubtitles) {
    if (!sub?.cacheKey || !Array.isArray(sub.cues) || sub.cues.length === 0) continue;
    const prev = byKey.get(sub.cacheKey);
    const incomingTime = sub.savedAt ? Date.parse(sub.savedAt) : 0;
    const prevTime = prev?.createdAt ? Date.parse(prev.createdAt) : 0;
    const isGenuineUpdate =
      prev &&
      incomingTime &&
      prevTime &&
      incomingTime > prevTime &&
      hasTranscriptContentChanged(prev, sub);
    if (!prev || isGenuineUpdate) {
      const mergedEntry = {
        cacheKey: sub.cacheKey,
        artifactId: sub.artifactId || prev?.artifactId || null,
        notebookId: sub.notebookId || prev?.notebookId || null,
        mediaToken: sub.mediaToken || prev?.mediaToken || null,
        title: sub.title || prev?.title || "Video Overview",
        language: sub.language || prev?.language || "en",
        provider: sub.provider || prev?.provider || "neon-sync",
        model: sub.model || prev?.model || "",
        failoverUsed: Boolean(prev?.failoverUsed),
        cueCount: sub.cues.length,
        durationSeconds: prev?.durationSeconds || null,
        extractedBytes: sub.extractedBytes || prev?.extractedBytes || null,
        originalBytes: sub.originalBytes || prev?.originalBytes || null,
        latencyMs: sub.latencyMs || prev?.latencyMs || null,
        cues: sub.cues,
        createdAt: sub.savedAt || new Date().toISOString(),
      };
      byKey.set(sub.cacheKey, mergedEntry);
      if (!prev) addedEntries.push(mergedEntry);
      else updatedEntries.push(mergedEntry);
    }
  }

  const nextCache = [...byKey.values()].slice(0, MAX_CACHE_ENTRIES);

  const histByKey = new Map();
  for (const h of localHistory) {
    if (h?.cacheKey) histByKey.set(h.cacheKey, h);
  }
  for (const item of nextCache) {
    if (!histByKey.has(item.cacheKey)) {
      histByKey.set(item.cacheKey, {
        cacheKey: item.cacheKey,
        artifactId: item.artifactId,
        notebookId: item.notebookId,
        title: item.title,
        provider: item.provider,
        model: item.model,
        failoverUsed: Boolean(item.failoverUsed),
        cueCount: item.cueCount,
        extractedBytes: item.extractedBytes,
        originalBytes: item.originalBytes,
        latencyMs: item.latencyMs,
        createdAt: item.createdAt,
      });
    }
  }

  const nextHistory = [...histByKey.values()].slice(0, MAX_HISTORY_ENTRIES);
  await store.set({
    [STORAGE_KEYS.SUBTITLE_CACHE]: nextCache,
    [STORAGE_KEYS.HISTORY]: nextHistory,
  });
  return { addedEntries, updatedEntries };
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

/**
 * Notification Center state (`chrome.storage.local.notifications`).
 */
export async function getNotifications(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.NOTIFICATIONS);
    const list = raw?.[STORAGE_KEYS.NOTIFICATIONS];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function appendNotification(item, storageArea) {
  const store = resolveStorage(storageArea);
  const existing = await getNotifications(store);
  const record = {
    id:
      item?.id ||
      `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: String(item?.kind || "info"),
    title: String(item?.title || "LM Subs").slice(0, 140),
    body: String(item?.body || "").slice(0, 280),
    cacheKey: item?.cacheKey || null,
    provider: item?.provider || null,
    read: Boolean(item?.read),
    createdAt: item?.createdAt || new Date().toISOString(),
  };
  const next = [record, ...existing.filter((n) => n?.id !== record.id)].slice(
    0,
    MAX_NOTIFICATIONS
  );
  await store.set({ [STORAGE_KEYS.NOTIFICATIONS]: next });
  return { notification: record, notifications: next };
}

export async function markNotificationsRead({ id = null } = {}, storageArea) {
  const store = resolveStorage(storageArea);
  const existing = await getNotifications(store);
  const next = existing.map((n) =>
    !id || n.id === id ? { ...n, read: true } : n
  );
  await store.set({ [STORAGE_KEYS.NOTIFICATIONS]: next });
  return next;
}

export async function clearNotifications(storageArea) {
  const store = resolveStorage(storageArea);
  await store.set({ [STORAGE_KEYS.NOTIFICATIONS]: [] });
  return [];
}

/**
 * Extension auto-update status (`chrome.storage.local.updateStatus`).
 */
export async function getUpdateStatus(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.UPDATE_STATUS);
    const saved = raw?.[STORAGE_KEYS.UPDATE_STATUS];
    if (!saved || typeof saved !== "object") {
      return {
        updateAvailable: false,
        currentVersion: "0.2.6",
        currentBuildId: "",
        latestVersion: "0.2.6",
        latestBuildId: "",
        zipUrl: "/releases/lm-subs-latest.zip",
        zipSha256: "",
        notifiedReleaseKey: "",
        checkedAt: null,
        autoAppliedAt: null,
        linkedFolderName: "",
      };
    }
    return {
      updateAvailable: Boolean(saved.updateAvailable),
      currentVersion: String(saved.currentVersion || "0.2.6"),
      currentBuildId: String(saved.currentBuildId || ""),
      latestVersion: String(saved.latestVersion || saved.currentVersion || "0.2.6"),
      latestBuildId: String(saved.latestBuildId || ""),
      zipUrl: String(saved.zipUrl || "/releases/lm-subs-latest.zip"),
      zipSha256: String(saved.zipSha256 || ""),
      notifiedReleaseKey: String(saved.notifiedReleaseKey || ""),
      checkedAt: saved.checkedAt || null,
      autoAppliedAt: saved.autoAppliedAt || null,
      linkedFolderName: String(saved.linkedFolderName || ""),
    };
  } catch {
    return {
      updateAvailable: false,
      currentVersion: "0.2.6",
      currentBuildId: "",
      latestVersion: "0.2.6",
      latestBuildId: "",
      zipUrl: "/releases/lm-subs-latest.zip",
      zipSha256: "",
      notifiedReleaseKey: "",
      checkedAt: null,
      autoAppliedAt: null,
      linkedFolderName: "",
    };
  }
}

export async function saveUpdateStatus(partial, storageArea) {
  const store = resolveStorage(storageArea);
  const current = await getUpdateStatus(store);
  const next = { ...current, ...(partial || {}) };
  await store.set({ [STORAGE_KEYS.UPDATE_STATUS]: next });
  return next;
}

export async function getSetupState(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.SETUP_STATE);
    const saved = raw?.[STORAGE_KEYS.SETUP_STATE];
    if (!saved || typeof saved !== "object") {
      return {
        installedAt: null,
        welcomeOpenedAt: null,
        popupOpenedCount: 0,
        lastPopupOpenedAt: null,
        completedAt: null,
      };
    }
    return {
      installedAt: saved.installedAt || null,
      welcomeOpenedAt: saved.welcomeOpenedAt || null,
      popupOpenedCount: Number.isFinite(Number(saved.popupOpenedCount))
        ? Number(saved.popupOpenedCount)
        : 0,
      lastPopupOpenedAt: saved.lastPopupOpenedAt || null,
      completedAt: saved.completedAt || null,
    };
  } catch {
    return {
      installedAt: null,
      welcomeOpenedAt: null,
      popupOpenedCount: 0,
      lastPopupOpenedAt: null,
      completedAt: null,
    };
  }
}

export async function saveSetupState(partial, storageArea) {
  const store = resolveStorage(storageArea);
  const current = await getSetupState(store);
  const next = { ...current, ...(partial || {}) };
  await store.set({ [STORAGE_KEYS.SETUP_STATE]: next });
  return next;
}

function createEmptyNotebookLmStats() {
  return {
    notebooks: {},
    totals: {
      watchSeconds: 0,
      listenSeconds: 0,
      speedSavedSeconds: 0,
      bookmarksCount: 0,
      citationsCount: 0,
      loopsCount: 0,
      pipSessionsCount: 0,
      snapshotsCount: 0,
      exportsCount: 0,
    },
    dailyStudy: {},
    updatedAt: null,
  };
}

export async function getNotebookLmStats(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.NOTEBOOKLM_STATS);
    const saved = raw?.[STORAGE_KEYS.NOTEBOOKLM_STATS];
    if (!saved || typeof saved !== "object") {
      return createEmptyNotebookLmStats();
    }
    const base = createEmptyNotebookLmStats();
    return {
      notebooks:
        saved.notebooks && typeof saved.notebooks === "object"
          ? saved.notebooks
          : {},
      totals: {
        watchSeconds: Math.max(0, Number(saved.totals?.watchSeconds) || 0),
        listenSeconds: Math.max(0, Number(saved.totals?.listenSeconds) || 0),
        speedSavedSeconds: Math.max(
          0,
          Number(saved.totals?.speedSavedSeconds) || 0
        ),
        bookmarksCount: Math.max(0, Number(saved.totals?.bookmarksCount) || 0),
        citationsCount: Math.max(0, Number(saved.totals?.citationsCount) || 0),
        loopsCount: Math.max(0, Number(saved.totals?.loopsCount) || 0),
        pipSessionsCount: Math.max(
          0,
          Number(saved.totals?.pipSessionsCount) || 0
        ),
        snapshotsCount: Math.max(0, Number(saved.totals?.snapshotsCount) || 0),
        exportsCount: Math.max(0, Number(saved.totals?.exportsCount) || 0),
      },
      dailyStudy:
        saved.dailyStudy && typeof saved.dailyStudy === "object"
          ? saved.dailyStudy
          : base.dailyStudy,
      updatedAt: saved.updatedAt || null,
    };
  } catch {
    return createEmptyNotebookLmStats();
  }
}

export async function recordNotebookLmTelemetry(event = {}, storageArea) {
  const store = resolveStorage(storageArea);
  const current = await getNotebookLmStats(store);
  const nowIso = new Date().toISOString();
  const dayKey = nowIso.slice(0, 10);

  const notebooks = { ...current.notebooks };
  if (event.notebookId && typeof event.notebookId === "string") {
    const nbId = event.notebookId.slice(0, 80);
    const prev = notebooks[nbId] || {
      notebookId: nbId,
      title: "Untitled notebook",
      sourceCount: 0,
      videoCount: 0,
      audioCount: 0,
      reportCount: 0,
      studioArtifactCount: 0,
      watchSeconds: 0,
      listenSeconds: 0,
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
    };
    notebooks[nbId] = {
      ...prev,
      title:
        event.notebookTitle &&
        event.notebookTitle !== "NotebookLM Video Overview" &&
        event.notebookTitle !== "NotebookLM Audio Overview"
          ? String(event.notebookTitle).slice(0, 140)
          : prev.title,
      sourceCount: Math.max(
        prev.sourceCount || 0,
        Number(event.sourceCount) || 0
      ),
      videoCount: Math.max(prev.videoCount || 0, Number(event.videoCount) || 0),
      audioCount: Math.max(prev.audioCount || 0, Number(event.audioCount) || 0),
      reportCount: Math.max(
        prev.reportCount || 0,
        Number(event.reportCount) || 0
      ),
      studioArtifactCount: Math.max(
        prev.studioArtifactCount || 0,
        Number(event.studioArtifactCount) || 0
      ),
      watchSeconds:
        (prev.watchSeconds || 0) + Math.max(0, Number(event.watchSeconds) || 0),
      listenSeconds:
        (prev.listenSeconds || 0) +
        Math.max(0, Number(event.listenSeconds) || 0),
      lastSeenAt: nowIso,
    };
  }

  const addWatch = Math.max(0, Number(event.watchSeconds) || 0);
  const addListen = Math.max(0, Number(event.listenSeconds) || 0);
  const addSpeedSaved = Math.max(0, Number(event.speedSavedSeconds) || 0);
  const addBookmarks = Math.max(0, Number(event.bookmarksDelta) || 0);
  const addCitations = Math.max(0, Number(event.citationsDelta) || 0);
  const addLoops = Math.max(0, Number(event.loopsDelta) || 0);
  const addPip = Math.max(0, Number(event.pipDelta) || 0);
  const addSnapshots = Math.max(0, Number(event.snapshotsDelta) || 0);
  const addExports = Math.max(0, Number(event.exportsDelta) || 0);

  const totals = {
    watchSeconds: current.totals.watchSeconds + addWatch,
    listenSeconds: current.totals.listenSeconds + addListen,
    speedSavedSeconds: current.totals.speedSavedSeconds + addSpeedSaved,
    bookmarksCount: current.totals.bookmarksCount + addBookmarks,
    citationsCount: current.totals.citationsCount + addCitations,
    loopsCount: current.totals.loopsCount + addLoops,
    pipSessionsCount: current.totals.pipSessionsCount + addPip,
    snapshotsCount: current.totals.snapshotsCount + addSnapshots,
    exportsCount: current.totals.exportsCount + addExports,
  };

  const dailyStudy = { ...current.dailyStudy };
  const prevDay = dailyStudy[dayKey] || {
    activeSeconds: 0,
    citations: 0,
    bookmarks: 0,
  };
  dailyStudy[dayKey] = {
    activeSeconds: prevDay.activeSeconds + addWatch + addListen,
    citations: prevDay.citations + addCitations,
    bookmarks: prevDay.bookmarks + addBookmarks,
  };

  // Prune dailyStudy to latest 30 days
  const sortedDays = Object.keys(dailyStudy).sort();
  while (sortedDays.length > 30) {
    const oldest = sortedDays.shift();
    delete dailyStudy[oldest];
  }

  const next = {
    notebooks,
    totals,
    dailyStudy,
    updatedAt: nowIso,
  };
  await store.set({ [STORAGE_KEYS.NOTEBOOKLM_STATS]: next });
  return next;
}

export async function clearNotebookLmStats(storageArea) {
  const store = resolveStorage(storageArea);
  const empty = createEmptyNotebookLmStats();
  await store.set({ [STORAGE_KEYS.NOTEBOOKLM_STATS]: empty });
  return empty;
}



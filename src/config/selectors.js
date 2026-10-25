/**
 * Single source of truth for all Google NotebookLM (and "Gemini Notebook")
 * endpoints, `batchexecute` RPC method IDs, artifact wire positions, trusted
 * media CDN domains, DOM selectors, and extension message constants.
 *
 * Keeping every host, RPC ID, wire index, and selector in this one module makes
 * updating the extension trivial if Google rotates an undocumented RPC ID or
 * tweaks the Studio player markup.
 */

export const MESSAGE_NS = "lm-subs";
export const MESSAGE_NAMESPACE = "LM_SUBS_";
export const KEEPALIVE_PORT_NAME = "LM_SUBS_KEEPALIVE";
export const HOSTED_CLOUD_URL = "https://lm-subs.vercel.app";

export const NOTEBOOK_URL_ID_REGEX = /\/notebook\/([A-Za-z0-9_-]{8,})/;

/**
 * Canonical hosts serving Google NotebookLM (personal + Workspace
 * "Gemini Notebook" aliases).
 */
export const NOTEBOOKLM_HOSTS = Object.freeze([
  "notebooklm.google.com",
  "notebook.google.com",
  "notebook.cloud.google.com",
]);

/**
 * Trusted Google media & redirect CDN domain suffixes allowed when fetching
 * Video Overview streams (SSRF guard). Includes `.usercontent.google.com`,
 * `.googlevideo.com`, `.gvt1.com`, and `.ggpht.com` used by FIFE 302 redirects.
 */
export const TRUSTED_GOOGLE_MEDIA_DOMAINS = Object.freeze([
  ".googleusercontent.com",
  ".usercontent.google.com",
  ".googlevideo.com",
  ".gvt1.com",
  ".ggpht.com",
  ".google.com",
]);

/**
 * Google Wiz / LabsTailwindUi `batchexecute` endpoints and RPC method IDs.
 */
export const BATCHEXECUTE = Object.freeze({
  PATH_SUBSTRINGS: Object.freeze([
    "/_/LabsTailwindUi/data/batchexecute",
    "/_/CloudNotebookLmUi/data/batchexecute",
  ]),
  XSSI_PREFIX: ")]}'",
  ENVELOPE_TAG: "wrb.fr",
  RPC_IDS: Object.freeze({
    CREATE_STUDIO: "R7cb6c",
    POLL_STUDIO: "gArtLc",
  }),
  /** Studio artifact type codes at `row[2]` and `createParams[2][2]`. */
  ARTIFACT_TYPES: Object.freeze({
    AUDIO_OVERVIEW: 1,
    REPORT: 2,
    VIDEO_OVERVIEW: 3,
    APP: 4,
    MIND_MAP: 5,
    INFOGRAPHIC: 7,
    SLIDE_DECK: 8,
    DATA_TABLE: 9,
  }),
  /** Studio artifact lifecycle status codes at `row[4]`. */
  ARTIFACT_STATUS: Object.freeze({
    UNKNOWN: 0,
    INITIALIZED: 1,
    PROCESSING: 2,
    READY: 3,
    FAILED: 4,
    SUGGESTED: 5,
  }),
  /** Positional indices inside a Studio `LIST_ARTIFACTS` (`gArtLc`) row. */
  ROW_POS: Object.freeze({
    ID: 0,
    TITLE: 1,
    TYPE: 2,
    SOURCES: 3,
    STATUS: 4,
    VIDEO_METADATA: 8,
  }),
  /** Positional indices inside `row[8]` (`explainerVideo` metadata block). */
  VIDEO_META_POS: Object.freeze({
    PROGRESSIVE_URL: 1,
    GENERATION_OPTIONS: 2,
    DOWNLOAD_URL: 3,
    MEDIA_LIST: 4,
    DURATION: 5,
  }),
  /** Media streaming type codes inside `row[8][4][i][1]`. */
  MEDIA_KIND: Object.freeze({
    PROGRESSIVE: 1,
    HLS: 2,
    DASH: 3,
    DOWNLOAD: 4,
  }),
});

/**
 * Stable DOM selectors for NotebookLM's Studio panel & Video Overview player.
 * Prefers semantic tags, custom element names, and aria-labels over hashed classes.
 */
export const DOM_SELECTORS = Object.freeze({
  VIDEO_ELEMENT: "video",
  STUDIO_LIBRARY: "artifact-library",
  STUDIO_ITEM: "artifact-library-item",
  STUDIO_ITEM_TITLE: ".artifact-title",
  STUDIO_ITEM_DETAILS: ".artifact-details",
  STUDIO_ITEM_ICON: "mat-icon.artifact-icon",
  VIDEO_ICON_LIGATURES: Object.freeze([
    "subscriptions",
    "videocam",
    "movie",
    "play_circle",
  ]),
  GENERATE_VIDEO_BUTTONS: Object.freeze([
    'button[aria-label*="Video Overview" i]',
    'button[aria-label*="Generate video" i]',
    'button[aria-label*="Create video" i]',
    'button.primary-action-button[aria-label*="video" i]',
  ]),
  OVERLAY_HOST_ID: "lm-subs-player-root",
  OVERLAY_HOST_CLASS: "lm-subs-player-overlay",
  TOAST_HOST_ID: "lm-subs-toast-root",
  DEBUG_DRAWER_HOST_ID: "lm-subs-debug-root",
  TRACK_LABEL: "LM Subs",
});

/**
 * Cross-world `window.postMessage` event types (`page.js` <-> `content.js`).
 */
export const PAGE_MESSAGE = Object.freeze({
  BRIDGE_SOURCE_PAGE: "lm-subs-page",
  BRIDGE_SOURCE_CONTENT: "lm-subs-content",
  BATCH_ARTIFACTS: "LM_SUBS_BATCH_ARTIFACTS",
  SYNC_RPC_OVERRIDES: "LM_SUBS_SYNC_RPC_OVERRIDES",
  REQUEST_PAGE_STATE: "LM_SUBS_REQUEST_PAGE_STATE",
  PAGE_STATE_SNAPSHOT: "LM_SUBS_PAGE_STATE_SNAPSHOT",
  PAGE_DEBUG_EVENT: "LM_SUBS_PAGE_DEBUG_EVENT",
  EXTRACT_AUDIO_REQUEST: "LM_SUBS_EXTRACT_AUDIO_REQUEST",
  EXTRACT_AUDIO_RESPONSE: "LM_SUBS_EXTRACT_AUDIO_RESPONSE",
});

/**
 * Namespaced `chrome.runtime.sendMessage` action types (`content/popup/options` -> `background.js`).
 * Every runtime message starts with `MESSAGE_NAMESPACE` (`LM_SUBS_`).
 */
export const RUNTIME_MESSAGE = Object.freeze({
  ENSURE_SUBTITLES: "LM_SUBS_ENSURE",
  STAGE_AUDIO_CHUNK: "LM_SUBS_STAGE_AUDIO_CHUNK",
  GET_CACHED_SUBTITLES: "LM_SUBS_GET_CACHED",
  SAVE_IMPORTED_SUBTITLES: "LM_SUBS_SAVE_IMPORTED",
  TEST_PROVIDER: "LM_SUBS_TEST_PROVIDER",
  SUBTITLES_PROGRESS: "LM_SUBS_PROGRESS",
  SUBTITLES_PARTIAL: "LM_SUBS_PARTIAL",
  SUBTITLES_READY: "LM_SUBS_READY",
  DECODE_WAV_FALLBACK: "LM_SUBS_DECODE_WAV_FALLBACK",
  GET_ACTIVE_TAB_STATE: "LM_SUBS_GET_ACTIVE_TAB_STATE",
  TRIGGER_ACTIVE_VIDEO: "LM_SUBS_TRIGGER_ACTIVE_VIDEO",
  APPEND_DEBUG_LOG: "LM_SUBS_APPEND_DEBUG_LOG",
  GET_DEBUG_REPORT: "LM_SUBS_GET_DEBUG_REPORT",
  CLEAR_DEBUG_LOGS: "LM_SUBS_CLEAR_DEBUG_LOGS",
  SYNC_SIGNUP: "LM_SUBS_SYNC_SIGNUP",
  SYNC_SIGNIN: "LM_SUBS_SYNC_SIGNIN",
  SYNC_EMAIL_SEND_CODE: "LM_SUBS_SYNC_EMAIL_SEND_CODE",
  SYNC_EMAIL_VERIFY_CODE: "LM_SUBS_SYNC_EMAIL_VERIFY_CODE",
  SYNC_SAVE_PREFERENCES: "LM_SUBS_SYNC_SAVE_PREFERENCES",
  SYNC_GET_STATS: "LM_SUBS_SYNC_GET_STATS",
  SYNC_SIGNOUT: "LM_SUBS_SYNC_SIGNOUT",
  SYNC_NOW: "LM_SUBS_SYNC_NOW",
  SYNC_STATUS: "LM_SUBS_SYNC_STATUS",
  GET_NOTIFICATIONS: "LM_SUBS_GET_NOTIFICATIONS",
  MARK_NOTIFICATIONS_READ: "LM_SUBS_MARK_NOTIFICATIONS_READ",
  CLEAR_NOTIFICATIONS: "LM_SUBS_CLEAR_NOTIFICATIONS",
  TEST_DESKTOP_NOTIFICATION: "LM_SUBS_TEST_DESKTOP_NOTIFICATION",
  UPDATE_CACHED_SUBTITLES: "LM_SUBS_UPDATE_CACHED_SUBTITLES",
});

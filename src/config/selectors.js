/**
 * Single source of truth for all Google NotebookLM (and "Gemini Notebook")
 * endpoints, `batchexecute` RPC method IDs, artifact wire positions, trusted
 * media CDN domains, DOM selectors, and extension message constants.
 *
 * Keeping every host, RPC ID, wire index, and selector in this one module makes
 * updating the extension trivial if Google rotates an undocumented RPC ID or
 * tweaks the Studio player markup.
 */

export const MESSAGE_NS = "nlm-subtitles";
export const MESSAGE_NAMESPACE = "NOTEBOOKLM_SUBTITLES_";

export const NOTEBOOK_URL_ID_REGEX = /\/notebook\/([A-Za-z0-9_-]{8,})/;

/**
 * Both canonical hosts serving Google NotebookLM (personal + Workspace
 * post-July-2026 "Gemini Notebook" alias).
 */
export const NOTEBOOKLM_HOSTS = Object.freeze([
  "notebooklm.google.com",
  "notebook.google.com",
  "notebook.cloud.google.com",
]);

/**
 * Trusted Google media CDN domain suffixes allowed when fetching Video Overview
 * streams in the background service worker (SSRF guard).
 */
export const TRUSTED_GOOGLE_MEDIA_DOMAINS = Object.freeze([
  ".googleusercontent.com",
  ".usercontent.google.com",
  ".googlevideo.com",
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
  OVERLAY_HOST_ID: "nlm-subtitles-player-root",
  OVERLAY_HOST_CLASS: "nlm-subtitles-player-overlay",
  TOAST_HOST_ID: "nlm-subtitles-toast-root",
  TRACK_LABEL: "NotebookLM Auto-Subtitles",
});

/**
 * Cross-world `window.postMessage` event types (`page.js` <-> `content.js`).
 */
export const PAGE_MESSAGE = Object.freeze({
  BRIDGE_SOURCE_PAGE: "notebooklm-subtitles-page",
  BRIDGE_SOURCE_CONTENT: "notebooklm-subtitles-content",
  BATCH_ARTIFACTS: "NOTEBOOKLM_BATCH_ARTIFACTS",
  SYNC_RPC_OVERRIDES: "NOTEBOOKLM_SYNC_RPC_OVERRIDES",
});

/**
 * Namespaced `chrome.runtime.sendMessage` action types (`content/popup/options` -> `background.js`).
 * Every runtime message starts with `MESSAGE_NAMESPACE` (`NOTEBOOKLM_SUBTITLES_`).
 */
export const RUNTIME_MESSAGE = Object.freeze({
  ENSURE_SUBTITLES: "NOTEBOOKLM_SUBTITLES_ENSURE",
  GET_CACHED_SUBTITLES: "NOTEBOOKLM_SUBTITLES_GET_CACHED",
  SAVE_IMPORTED_SUBTITLES: "NOTEBOOKLM_SUBTITLES_SAVE_IMPORTED",
  TEST_PROVIDER: "NOTEBOOKLM_SUBTITLES_TEST_PROVIDER",
  SUBTITLES_PROGRESS: "NOTEBOOKLM_SUBTITLES_PROGRESS",
  SUBTITLES_READY: "NOTEBOOKLM_SUBTITLES_READY",
  GET_ACTIVE_TAB_STATE: "NOTEBOOKLM_SUBTITLES_GET_ACTIVE_TAB_STATE",
  TRIGGER_ACTIVE_VIDEO: "NOTEBOOKLM_SUBTITLES_TRIGGER_ACTIVE_VIDEO",
});

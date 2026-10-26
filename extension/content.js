(() => {
  // src/config/selectors.js
  var MESSAGE_NAMESPACE = "LM_SUBS_";
  var KEEPALIVE_PORT_NAME = "LM_SUBS_KEEPALIVE";
  var HOSTED_CLOUD_URL = "https://lm-subs.vercel.app";
  var ALARM_NAMES = Object.freeze({
    UPDATE_CHECK: "lmsubs-update-check",
    CLOUD_SYNC: "lmsubs-cloud-sync"
  });
  var NOTEBOOK_URL_ID_REGEX = /\/notebook\/([A-Za-z0-9_-]{8,})/;
  var NOTEBOOKLM_HOSTS = Object.freeze([
    "notebooklm.google.com",
    "notebook.google.com",
    "notebook.cloud.google.com"
  ]);
  var TRUSTED_GOOGLE_MEDIA_DOMAINS = Object.freeze([
    ".googleusercontent.com",
    ".usercontent.google.com",
    ".googlevideo.com",
    ".gvt1.com",
    ".ggpht.com",
    ".google.com"
  ]);
  var BATCHEXECUTE = Object.freeze({
    PATH_SUBSTRINGS: Object.freeze([
      "/_/LabsTailwindUi/data/batchexecute",
      "/_/CloudNotebookLmUi/data/batchexecute"
    ]),
    XSSI_PREFIX: ")]}'",
    ENVELOPE_TAG: "wrb.fr",
    RPC_IDS: Object.freeze({
      CREATE_STUDIO: "R7cb6c",
      POLL_STUDIO: "gArtLc"
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
      DATA_TABLE: 9
    }),
    /** Studio artifact lifecycle status codes at `row[4]`. */
    ARTIFACT_STATUS: Object.freeze({
      UNKNOWN: 0,
      INITIALIZED: 1,
      PROCESSING: 2,
      READY: 3,
      FAILED: 4,
      SUGGESTED: 5
    }),
    /** Positional indices inside a Studio `LIST_ARTIFACTS` (`gArtLc`) row. */
    ROW_POS: Object.freeze({
      ID: 0,
      TITLE: 1,
      TYPE: 2,
      SOURCES: 3,
      STATUS: 4,
      AUDIO_METADATA: 6,
      VIDEO_METADATA: 8
    }),
    /** Positional indices inside `row[8]` (`explainerVideo` metadata block). */
    VIDEO_META_POS: Object.freeze({
      PROGRESSIVE_URL: 1,
      GENERATION_OPTIONS: 2,
      DOWNLOAD_URL: 3,
      MEDIA_LIST: 4,
      DURATION: 5
    }),
    /** Media streaming type codes inside `row[8][4][i][1]`. */
    MEDIA_KIND: Object.freeze({
      PROGRESSIVE: 1,
      HLS: 2,
      DASH: 3,
      DOWNLOAD: 4
    })
  });
  var ARTIFACT_TYPE = BATCHEXECUTE.ARTIFACT_TYPES;
  var DOM_SELECTORS = Object.freeze({
    VIDEO_ELEMENT: "video",
    AUDIO_ELEMENT: "audio",
    MEDIA_ELEMENTS: "video, audio",
    STUDIO_LIBRARY: "artifact-library",
    STUDIO_ITEM: "artifact-library-item",
    STUDIO_ITEM_TITLE: ".artifact-title",
    STUDIO_ITEM_DETAILS: ".artifact-details",
    STUDIO_ITEM_ICON: "mat-icon.artifact-icon",
    VIDEO_ICON_LIGATURES: Object.freeze([
      "subscriptions",
      "videocam",
      "movie",
      "play_circle"
    ]),
    AUDIO_ICON_LIGATURES: Object.freeze([
      "podcasts",
      "graphic_eq",
      "headphones",
      "spatial_audio_off",
      "volume_up",
      "mic"
    ]),
    GENERATE_VIDEO_BUTTONS: Object.freeze([
      'button[aria-label*="Video Overview" i]',
      'button[aria-label*="Generate video" i]',
      'button[aria-label*="Create video" i]',
      'button.primary-action-button[aria-label*="video" i]',
      'button[aria-label*="Audio Overview" i]',
      'button[aria-label*="Generate audio" i]',
      'button[aria-label*="Deep Dive" i]'
    ]),
    OVERLAY_HOST_ID: "lm-subs-player-root",
    OVERLAY_HOST_CLASS: "lm-subs-player-overlay",
    TOAST_HOST_ID: "lm-subs-toast-root",
    DEBUG_DRAWER_HOST_ID: "lm-subs-debug-root",
    TRACK_LABEL: "LM Subs"
  });
  var PAGE_MESSAGE = Object.freeze({
    BRIDGE_SOURCE_PAGE: "lm-subs-page",
    BRIDGE_SOURCE_CONTENT: "lm-subs-content",
    BATCH_ARTIFACTS: "LM_SUBS_BATCH_ARTIFACTS",
    SYNC_RPC_OVERRIDES: "LM_SUBS_SYNC_RPC_OVERRIDES",
    REQUEST_PAGE_STATE: "LM_SUBS_REQUEST_PAGE_STATE",
    PAGE_STATE_SNAPSHOT: "LM_SUBS_PAGE_STATE_SNAPSHOT",
    PAGE_DEBUG_EVENT: "LM_SUBS_PAGE_DEBUG_EVENT",
    EXTRACT_AUDIO_REQUEST: "LM_SUBS_EXTRACT_AUDIO_REQUEST",
    EXTRACT_AUDIO_RESPONSE: "LM_SUBS_EXTRACT_AUDIO_RESPONSE",
    REMOTE_AUDIO_STATE: "LM_SUBS_REMOTE_AUDIO_STATE",
    REMOTE_AUDIO_COMMAND: "LM_SUBS_REMOTE_AUDIO_COMMAND"
  });
  var EXTERNAL_MESSAGE = Object.freeze({
    WEB_HANDSHAKE: "LM_SUBS_WEB_HANDSHAKE",
    WEB_SAVE_PROVIDER_KEY: "LM_SUBS_WEB_SAVE_PROVIDER_KEY",
    WEB_UPDATE_SETUP_PREFS: "LM_SUBS_WEB_UPDATE_SETUP_PREFS",
    WEB_CONNECT_CLOUD_TOKEN: "LM_SUBS_WEB_CONNECT_CLOUD_TOKEN"
  });
  var RUNTIME_MESSAGE = Object.freeze({
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
    CHECK_FOR_UPDATES: "LM_SUBS_CHECK_FOR_UPDATES",
    GET_UPDATE_STATUS: "LM_SUBS_GET_UPDATE_STATUS",
    APPLY_UNPACKED_UPDATE: "LM_SUBS_APPLY_UNPACKED_UPDATE",
    SUBTITLES_UPDATED: "LM_SUBS_SUBTITLES_UPDATED",
    BACKGROUND_SYNC_TICK: "LM_SUBS_BACKGROUND_SYNC_TICK",
    RECORD_NOTEBOOKLM_TELEMETRY: "LM_SUBS_RECORD_NOTEBOOKLM_TELEMETRY",
    GET_NOTEBOOKLM_STATS: "LM_SUBS_GET_NOTEBOOKLM_STATS",
    PLAY_NOTIFICATION_SOUND: "LM_SUBS_PLAY_NOTIFICATION_SOUND"
  });

  // src/lib/audio-extract.js
  var FOURCC_Encoder = new TextEncoder();
  function encodeMonoWav16Bit(float32Samples, sampleRate = 16e3) {
    const numSamples = float32Samples.length;
    const dataBytes = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buffer);
    const out = new Uint8Array(buffer);
    out.set(FOURCC_Encoder.encode("RIFF"), 0);
    view.setUint32(4, 36 + dataBytes, true);
    out.set(FOURCC_Encoder.encode("WAVE"), 8);
    out.set(FOURCC_Encoder.encode("fmt "), 12);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    out.set(FOURCC_Encoder.encode("data"), 36);
    view.setUint32(40, dataBytes, true);
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const clamped = Math.max(-1, Math.min(1, float32Samples[i]));
      const int16 = clamped < 0 ? clamped * 32768 : clamped * 32767;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
    return out;
  }
  function slicePcmIntoWavChunks(float32Samples, sampleRate = 16e3, maxChunkBytes = 18 * 1024 * 1024) {
    const usablePayloadBytes = Math.max(4096, maxChunkBytes - 44);
    const maxSamplesPerChunk = Math.floor(usablePayloadBytes / 2);
    const totalSamples = float32Samples.length;
    if (totalSamples === 0) {
      return [
        {
          bytes: encodeMonoWav16Bit(new Float32Array(0), sampleRate),
          mimeType: "audio/wav",
          fileName: "audio-chunk-1.wav",
          startOffsetSec: 0,
          durationSec: 0
        }
      ];
    }
    const chunks = [];
    let cursor = 0;
    let index = 1;
    while (cursor < totalSamples) {
      const end = Math.min(totalSamples, cursor + maxSamplesPerChunk);
      const slice = float32Samples.subarray(cursor, end);
      chunks.push({
        bytes: encodeMonoWav16Bit(slice, sampleRate),
        mimeType: "audio/wav",
        fileName: `audio-chunk-${index}.wav`,
        startOffsetSec: cursor / sampleRate,
        durationSec: slice.length / sampleRate
      });
      cursor = end;
      index++;
    }
    return chunks;
  }

  // src/lib/batchexecute.js
  var FIFE_NOTEBOOKLM_TOKEN_RE = /\/(?:rd-)?notebook(?:lm)?\/([A-Za-z0-9_-]{16,})/;
  var FIFE_SUFFIX_RE = /=[A-Za-z0-9_,.-]+$/;
  function isNotebookLmHost(hostname) {
    if (typeof hostname !== "string" || !hostname) return false;
    return NOTEBOOKLM_HOSTS.includes(hostname.toLowerCase());
  }
  function isTrustedGoogleMediaUrl(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl) return false;
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return false;
    }
    if (parsed.protocol !== "https:") return false;
    const host = (parsed.hostname || "").toLowerCase();
    if (!host || host.includes("%") || host.includes("\\") || host.includes("/")) {
      return false;
    }
    return TRUSTED_GOOGLE_MEDIA_DOMAINS.some((suffix) => {
      const bare = suffix.startsWith(".") ? suffix.slice(1) : suffix;
      return host === bare || host.endsWith(suffix);
    });
  }
  function isThumbnailOrManifestUrl(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl) return false;
    if (/\.(?:m3u8|mpd|jpe?g|png|webp|gif|svg)(?:$|\?)/i.test(rawUrl)) {
      return true;
    }
    const suffixMatch = rawUrl.match(FIFE_SUFFIX_RE);
    if (!suffixMatch) return false;
    const suffix = suffixMatch[0].slice(1).toLowerCase();
    if (/^(?:s\d+|w\d+|h\d+|c\b|p\b)/.test(suffix)) return true;
    if (/(?:^|-)s\d+(?:-|$)/.test(suffix)) return true;
    if (/^mm,(?:hls|dash)$/i.test(suffix)) return true;
    return false;
  }
  function summarizeMediaUrlForDebug(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl) return "(empty)";
    if (rawUrl.startsWith("blob:")) return rawUrl.slice(0, 48);
    try {
      const u = new URL(rawUrl);
      const suffixMatch = u.pathname.match(FIFE_SUFFIX_RE);
      const suffix = suffixMatch ? suffixMatch[0] : "";
      const tokenMatch = u.pathname.match(FIFE_NOTEBOOKLM_TOKEN_RE);
      if (tokenMatch) {
        const tok = tokenMatch[1];
        const shortTok = tok.length > 14 ? `${tok.slice(0, 8)}\u2026${tok.slice(-4)}` : tok;
        const prefix = u.pathname.includes("/rd-notebooklm/") ? "/rd-notebooklm/" : "/notebooklm/";
        return `${u.origin}${prefix}${shortTok}${suffix}`;
      }
      return `${u.origin}${u.pathname.slice(0, 36)}${suffix}`;
    } catch {
      return String(rawUrl).slice(0, 60);
    }
  }
  function extractMediaToken(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl) return null;
    const fifeMatch = rawUrl.match(FIFE_NOTEBOOKLM_TOKEN_RE);
    if (fifeMatch) {
      return fifeMatch[1];
    }
    try {
      const u = new URL(rawUrl);
      if (u.protocol === "blob:") return null;
      const idParam = u.searchParams.get("id") || u.searchParams.get("docid");
      if (idParam) return idParam;
      const cleanPath = u.pathname.replace(FIFE_SUFFIX_RE, "");
      return `${u.hostname}${cleanPath}`;
    } catch {
      return null;
    }
  }

  // src/lib/brand-logo.js
  var SVG_NS = "http://www.w3.org/2000/svg";
  var LM_SUBS_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none"><rect width="128" height="128" rx="28" fill="#111315"/><path fill-rule="evenodd" clip-rule="evenodd" d="M45.8 21.5C48.2 20.4 51 22.2 51 24.9V103.5C51 106.5 47.5 108.2 45.1 106.4L22.6 89.2C20.1 87.3 18.6 84.3 18.6 81.1V41.6C18.6 37.3 21.1 33.4 25 31.6L45.8 21.5ZM24.5 81.8L42.6 95.6C43.7 96.4 45.2 95.6 45.2 94.3V83.1C45.2 81.7 44 80.5 42.6 80.5H25.1C23.8 80.5 23.4 81 24.5 81.8Z" fill="#F6F7F8"/><rect x="56.5" y="49.5" width="8" height="29" rx="4" fill="#F6F7F8"/><rect x="68.5" y="37" width="8.5" height="54" rx="4.25" fill="#F6F7F8"/><rect x="81" y="49.5" width="8" height="29" rx="4" fill="#F6F7F8"/><path d="M84.5 27H98.5C104.851 27 110 32.1487 110 38.5V89.5C110 95.8513 104.851 101 98.5 101H84.5C81.7386 101 79.5 98.7614 79.5 96C79.5 93.2386 81.7386 91 84.5 91H97C98.3807 91 99.5 89.8807 99.5 88.5V39.5C99.5 38.1193 98.3807 37 97 37H84.5C81.7386 37 79.5 34.7614 79.5 32C79.5 29.2386 81.7386 27 84.5 27Z" fill="#1D5CF6"/></svg>';
  var LM_SUBS_LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
    LM_SUBS_LOGO_SVG
  )}`;
  function resolveExtensionLogoUrl(runtime = globalThis.chrome?.runtime, size = 128) {
    const validSize = [16, 32, 48, 128].includes(Number(size)) ? Number(size) : 128;
    const relPath = `icons/icon${validSize}.png`;
    try {
      if (runtime?.getURL) {
        const resolved = runtime.getURL(relPath);
        if (resolved) return resolved;
      }
    } catch {
    }
    return relPath;
  }
  function createBrandLogoElement(doc = globalThis.document, { size = 24, className = "brand-logo" } = {}) {
    if (doc && typeof doc.createElementNS === "function") {
      const svg = doc.createElementNS(SVG_NS, "svg");
      svg.setAttribute("width", String(size));
      svg.setAttribute("height", String(size));
      svg.setAttribute("viewBox", "0 0 128 128");
      svg.setAttribute("fill", "none");
      svg.setAttribute("aria-hidden", "true");
      if (className) svg.setAttribute("class", className);
      const bg = doc.createElementNS(SVG_NS, "rect");
      bg.setAttribute("x", "2");
      bg.setAttribute("y", "2");
      bg.setAttribute("width", "124");
      bg.setAttribute("height", "124");
      bg.setAttribute("rx", "27");
      bg.setAttribute("fill", "#111315");
      bg.setAttribute("stroke", "#272B33");
      bg.setAttribute("stroke-width", "4");
      const page = doc.createElementNS(SVG_NS, "path");
      page.setAttribute("fill-rule", "evenodd");
      page.setAttribute("clip-rule", "evenodd");
      page.setAttribute(
        "d",
        "M45.8 21.5C48.2 20.4 51 22.2 51 24.9V103.5C51 106.5 47.5 108.2 45.1 106.4L22.6 89.2C20.1 87.3 18.6 84.3 18.6 81.1V41.6C18.6 37.3 21.1 33.4 25 31.6L45.8 21.5ZM24.5 81.8L42.6 95.6C43.7 96.4 45.2 95.6 45.2 94.3V83.1C45.2 81.7 44 80.5 42.6 80.5H25.1C23.8 80.5 23.4 81 24.5 81.8Z"
      );
      page.setAttribute("fill", "#F6F7F8");
      const bar1 = doc.createElementNS(SVG_NS, "rect");
      bar1.setAttribute("x", "56.5");
      bar1.setAttribute("y", "49.5");
      bar1.setAttribute("width", "8");
      bar1.setAttribute("height", "29");
      bar1.setAttribute("rx", "4");
      bar1.setAttribute("fill", "#F6F7F8");
      const bar2 = doc.createElementNS(SVG_NS, "rect");
      bar2.setAttribute("x", "68.5");
      bar2.setAttribute("y", "37");
      bar2.setAttribute("width", "8.5");
      bar2.setAttribute("height", "54");
      bar2.setAttribute("rx", "4.25");
      bar2.setAttribute("fill", "#F6F7F8");
      const bar3 = doc.createElementNS(SVG_NS, "rect");
      bar3.setAttribute("x", "81");
      bar3.setAttribute("y", "49.5");
      bar3.setAttribute("width", "8");
      bar3.setAttribute("height", "29");
      bar3.setAttribute("rx", "4");
      bar3.setAttribute("fill", "#F6F7F8");
      const bracket = doc.createElementNS(SVG_NS, "path");
      bracket.setAttribute(
        "d",
        "M84.5 27H98.5C104.851 27 110 32.1487 110 38.5V89.5C110 95.8513 104.851 101 98.5 101H84.5C81.7386 101 79.5 98.7614 79.5 96C79.5 93.2386 81.7386 91 84.5 91H97C98.3807 91 99.5 89.8807 99.5 88.5V39.5C99.5 38.1193 98.3807 37 97 37H84.5C81.7386 37 79.5 34.7614 79.5 32C79.5 29.2386 81.7386 27 84.5 27Z"
      );
      bracket.setAttribute("fill", "#1D5CF6");
      svg.append(bg, page, bar1, bar2, bar3, bracket);
      return svg;
    }
    const img = doc.createElement("img");
    img.src = LM_SUBS_LOGO_DATA_URI;
    img.width = size;
    img.height = size;
    img.alt = "";
    if (className) img.className = className;
    return img;
  }

  // src/lib/chime.js
  var SOUND_PRESETS = Object.freeze([
    {
      id: "chime",
      label: "Acoustic fifth chime (C5 to G5)",
      durationSec: 0.46,
      wave: "triangle",
      decayRate: 10.2,
      overtoneRatio: 2,
      overtoneGain: 0.24,
      notes: [
        { offset: 0, dur: 0.24, freq: 523.25 },
        { offset: 0.11, dur: 0.32, freq: 783.99 }
      ]
    },
    {
      id: "marimba",
      label: "Studio triad marimba (C5, E5, G5)",
      durationSec: 0.52,
      wave: "sine",
      decayRate: 14.5,
      overtoneRatio: 4,
      overtoneGain: 0.18,
      notes: [
        { offset: 0, dur: 0.18, freq: 523.25 },
        { offset: 0.085, dur: 0.19, freq: 659.25 },
        { offset: 0.17, dur: 0.31, freq: 783.99 }
      ]
    },
    {
      id: "bell",
      label: "Crystal desk bell (A5 shimmer)",
      durationSec: 0.56,
      wave: "sine",
      decayRate: 8.4,
      overtoneRatio: 2.756,
      overtoneGain: 0.2,
      notes: [
        { offset: 0, dur: 0.52, freq: 880 },
        { offset: 0.03, dur: 0.46, freq: 1318.51 }
      ]
    },
    {
      id: "pulse",
      label: "Crisp double pulse (F5 to A5)",
      durationSec: 0.38,
      wave: "triangle",
      decayRate: 16,
      overtoneRatio: 2,
      overtoneGain: 0.15,
      notes: [
        { offset: 0, dur: 0.12, freq: 698.46 },
        { offset: 0.11, dur: 0.22, freq: 880 }
      ]
    },
    {
      id: "soft-pop",
      label: "Warm acoustic pluck (D5 to A5)",
      durationSec: 0.34,
      wave: "sine",
      decayRate: 18.5,
      overtoneRatio: 3,
      overtoneGain: 0.14,
      notes: [
        { offset: 0, dur: 0.13, freq: 587.33 },
        { offset: 0.07, dur: 0.22, freq: 880 }
      ]
    },
    {
      id: "none",
      label: "Silent (visual alerts only)",
      durationSec: 0,
      wave: "sine",
      decayRate: 10,
      overtoneRatio: 2,
      overtoneGain: 0,
      notes: []
    }
  ]);
  var SOUND_PRESET_IDS = Object.freeze(SOUND_PRESETS.map((p) => p.id));
  var sharedCtx = null;
  var cachedWavUris = /* @__PURE__ */ new Map();
  var lastChimeEpochMs = 0;
  function getSoundPresetSpec(presetId = "chime") {
    return SOUND_PRESETS.find((p) => p.id === presetId) || SOUND_PRESETS[0];
  }
  function bytesToBase64(bytes) {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(bytes).toString("base64");
    }
    let binary = "";
    const chunk = 32768;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return globalThis.btoa(binary);
  }
  function buildChimeWavBytes(sampleRate = 44100, presetId = "chime") {
    const spec = presetId === "none" ? SOUND_PRESETS[0] : getSoundPresetSpec(presetId);
    const durationSec = Math.max(0.28, spec.durationSec || 0.44);
    const numSamples = Math.floor(sampleRate * durationSec);
    const dataBytes = numSamples * 2;
    const buf = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buf);
    const writeAscii = (offset, str) => {
      for (let i = 0; i < str.length; i += 1) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    writeAscii(0, "RIFF");
    view.setUint32(4, 36 + dataBytes, true);
    writeAscii(8, "WAVE");
    writeAscii(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeAscii(36, "data");
    view.setUint32(40, dataBytes, true);
    for (let i = 0; i < numSamples; i += 1) {
      const t = i / sampleRate;
      let sample = 0;
      for (const note of spec.notes) {
        if (t >= note.offset && t <= note.offset + note.dur) {
          const lt = t - note.offset;
          const attack = Math.min(1, lt / 0.01);
          const decay = Math.exp(-lt * spec.decayRate);
          const env = attack * decay;
          const fundamental = Math.sin(2 * Math.PI * note.freq * lt);
          const harmonic = spec.overtoneGain * Math.sin(2 * Math.PI * note.freq * spec.overtoneRatio * lt);
          sample += env * (fundamental + harmonic) * 0.34;
        }
      }
      const clamped = Math.max(-0.95, Math.min(0.95, sample));
      view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
    }
    return new Uint8Array(buf);
  }
  function getChimeWavDataUri(presetId = "chime") {
    const key = SOUND_PRESET_IDS.includes(presetId) && presetId !== "none" ? presetId : "chime";
    if (!cachedWavUris.has(key)) {
      const wavBytes = buildChimeWavBytes(44100, key);
      cachedWavUris.set(key, `data:audio/wav;base64,${bytesToBase64(wavBytes)}`);
    }
    return cachedWavUris.get(key);
  }
  function getOrCreateAudioContext(win = globalThis) {
    if (sharedCtx && sharedCtx.state !== "closed") {
      return sharedCtx;
    }
    const AudioCtx = win?.AudioContext || win?.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      sharedCtx = new AudioCtx();
      return sharedCtx;
    } catch {
      return null;
    }
  }
  function unlockChimeAudio(win = globalThis) {
    try {
      const ctx = getOrCreateAudioContext(win);
      if (!ctx) return false;
      if (ctx.state === "suspended" && typeof ctx.resume === "function") {
        ctx.resume().catch(() => {
        });
      }
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      return true;
    } catch {
      return false;
    }
  }
  async function playWavElementFallback(win = globalThis, presetId = "chime", volumePct = 75) {
    try {
      const AudioCtor = win?.Audio || globalThis.Audio;
      if (typeof AudioCtor !== "function") return false;
      const audio = new AudioCtor(getChimeWavDataUri(presetId));
      audio.__lmSubsInternal = true;
      audio.volume = Math.max(0.05, Math.min(1, (Number(volumePct) || 75) / 100));
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        await playPromise;
      }
      return true;
    } catch {
      return false;
    }
  }
  async function playCompletionChimeSound({
    win = globalThis,
    preset = "chime",
    volume = 75,
    force = false,
    dedupeMs = 1100
  } = {}) {
    if (preset === "none") return false;
    const spec = getSoundPresetSpec(preset);
    if (!spec.notes.length) return false;
    const nowMs = Date.now();
    if (!force && dedupeMs > 0 && nowMs - lastChimeEpochMs < dedupeMs) {
      return false;
    }
    lastChimeEpochMs = nowMs;
    const volScale = Math.max(0.08, Math.min(1, (Number(volume) || 75) / 100));
    const peakGain = 0.28 * volScale;
    try {
      const ctx = getOrCreateAudioContext(win);
      if (ctx) {
        if (ctx.state === "suspended" && typeof ctx.resume === "function") {
          await Promise.race([
            ctx.resume().catch(() => {
            }),
            new Promise((r) => setTimeout(r, 140))
          ]);
        }
        if (ctx.state === "running") {
          const t0 = ctx.currentTime;
          for (const n of spec.notes) {
            const osc = ctx.createOscillator();
            const overtone = ctx.createOscillator();
            const gain = ctx.createGain();
            const overtoneGain = ctx.createGain();
            osc.type = spec.wave || "triangle";
            osc.frequency.setValueAtTime(n.freq, t0 + n.offset);
            overtone.type = "sine";
            overtone.frequency.setValueAtTime(
              n.freq * (spec.overtoneRatio || 2),
              t0 + n.offset
            );
            overtoneGain.gain.setValueAtTime(spec.overtoneGain || 0.2, t0 + n.offset);
            gain.gain.setValueAtTime(1e-4, t0 + n.offset);
            gain.gain.linearRampToValueAtTime(peakGain, t0 + n.offset + 0.012);
            gain.gain.exponentialRampToValueAtTime(7e-4, t0 + n.offset + n.dur);
            osc.connect(gain);
            overtone.connect(overtoneGain);
            overtoneGain.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0 + n.offset);
            overtone.start(t0 + n.offset);
            osc.stop(t0 + n.offset + n.dur + 0.02);
            overtone.stop(t0 + n.offset + n.dur + 0.02);
          }
          return true;
        }
      }
    } catch {
    }
    return playWavElementFallback(win, spec.id, volume);
  }

  // src/lib/decide.js
  function compileExcludePatterns(patterns) {
    if (!Array.isArray(patterns)) return [];
    const compiled = [];
    for (const raw of patterns) {
      if (typeof raw !== "string") continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      try {
        compiled.push(new RegExp(trimmed, "i"));
      } catch {
      }
    }
    return compiled;
  }
  function matchesExcludePattern(title, patterns) {
    if (!title || typeof title !== "string") return false;
    const regexes = compileExcludePatterns(patterns);
    return regexes.some((rx) => rx.test(title));
  }
  function resolveSubtitleCacheKey({ artifactId, mediaToken, mediaUrl } = {}) {
    if (typeof artifactId === "string" && artifactId.trim()) {
      return `artifact:${artifactId.trim()}`;
    }
    if (typeof mediaToken === "string" && mediaToken.trim()) {
      return `token:${mediaToken.trim()}`;
    }
    if (typeof mediaUrl === "string" && mediaUrl.trim()) {
      try {
        const u = new URL(mediaUrl.trim());
        return `url:${u.hostname}${u.pathname}`;
      } catch {
        return `url:${mediaUrl.trim()}`;
      }
    }
    return null;
  }
  function shouldGenerateSubtitles({
    settings = {},
    trigger = "generate",
    // "generate" | "player_open" | "manual"
    force = false,
    typeCode = BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW,
    status = "ready",
    title = "",
    artifactId = null,
    mediaToken = null,
    mediaUrl = null,
    cachedKeys = /* @__PURE__ */ new Set(),
    inFlightKeys = /* @__PURE__ */ new Set(),
    exhaustedKeys = /* @__PURE__ */ new Set()
  } = {}) {
    const isManual = trigger === "manual";
    if (!isManual && settings.enabled === false) {
      return { allow: false, reason: "extension_disabled", cacheKey: null };
    }
    const isVideoOverview = typeCode === BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW;
    const isAudioOverview = typeCode === BATCHEXECUTE.ARTIFACT_TYPES.AUDIO_OVERVIEW;
    if (!isVideoOverview && !isAudioOverview) {
      return { allow: false, reason: "not_media_overview", cacheKey: null };
    }
    if (status !== "ready") {
      return { allow: false, reason: `artifact_${status || "not_ready"}`, cacheKey: null };
    }
    const cacheKey = resolveSubtitleCacheKey({ artifactId, mediaToken, mediaUrl });
    if (!cacheKey) {
      return { allow: false, reason: "missing_identifier", cacheKey: null };
    }
    if (!mediaUrl || typeof mediaUrl !== "string") {
      return { allow: false, reason: "missing_media_url", cacheKey };
    }
    const inFlightSet = inFlightKeys instanceof Set ? inFlightKeys : new Set(inFlightKeys || []);
    if (inFlightSet.has(cacheKey)) {
      return { allow: false, reason: "already_in_flight", cacheKey };
    }
    if (!isManual && !force) {
      const exhaustedSet = exhaustedKeys instanceof Set ? exhaustedKeys : new Set(exhaustedKeys || []);
      if (exhaustedSet.has(cacheKey)) {
        return { allow: false, reason: "retries_exhausted", cacheKey };
      }
      const cachedSet = cachedKeys instanceof Set ? cachedKeys : new Set(cachedKeys || []);
      if (cachedSet.has(cacheKey)) {
        return { allow: false, reason: "already_cached", cacheKey };
      }
      if (isAudioOverview && settings.autoOnAudioOverviews === false) {
        return { allow: false, reason: "auto_audio_disabled", cacheKey };
      }
      if (isVideoOverview && trigger === "player_open" && settings.autoOnExistingVideos === false) {
        return { allow: false, reason: "auto_existing_disabled", cacheKey };
      }
      if (trigger === "generate" && settings.autoOnGenerate === false) {
        return { allow: false, reason: "auto_generate_disabled", cacheKey };
      }
      if (matchesExcludePattern(title, settings.excludePatterns)) {
        return { allow: false, reason: "excluded_by_pattern", cacheKey };
      }
    }
    return { allow: true, reason: "eligible", cacheKey };
  }

  // src/lib/providers/registry.js
  var DEFAULT_QUEUE_ORDER = Object.freeze([
    "groq",
    "mistral",
    "gemini",
    "deepgram",
    "assemblyai",
    "gladia",
    "cloudflare",
    "elevenlabs",
    "huggingface",
    "openrouter",
    "openai",
    "custom"
  ]);
  var PROVIDERS = Object.freeze({
    groq: Object.freeze({
      id: "groq",
      name: "Groq",
      badge: "Best Free Tier, 8 hrs/day",
      freeTierSummary: "Permanent free plan, no card: 20 RPM, 2,000 req/day, 7,200 audio sec/hr (2h/hr), 28,800 sec/day (8h/day).",
      accountRequirements: "Free Google, GitHub, or email sign-in. No credit card needed.",
      keyFormatHint: "Starts with gsk_ (about 56 characters)",
      setupSteps: Object.freeze([
        "Open console.groq.com/keys in a new tab.",
        "Click Log in or Sign up and continue with your Google account, GitHub account, or email address.",
        "Once inside GroqCloud, click API Keys in the left navigation bar.",
        "Click the Create API Key button, type LM Subs as the display name, and click Submit.",
        "Click Copy beside the new gsk_... key right away (Groq shows it once), paste it into LM Subs, and click Save key then Test."
      ]),
      defaultModel: "whisper-large-v3-turbo",
      models: ["whisper-large-v3-turbo", "whisper-large-v3"],
      requiresKey: true,
      keyPlaceholder: "gsk_...",
      keyUrl: "https://console.groq.com/keys",
      originPattern: "https://api.groq.com/*",
      maxUploadBytes: 24 * 1024 * 1024,
      protocol: "openai-stt",
      endpoint: "https://api.groq.com/openai/v1/audio/transcriptions"
    }),
    mistral: Object.freeze({
      id: "mistral",
      name: "Mistral (Voxtral)",
      badge: "Free Studio Tier, No Card",
      freeTierSummary: "Mistral Studio Experiment plan (free, no card). Voxtral Transcribe 3 returns accurate segment timestamps in 50+ languages.",
      accountRequirements: "Free Google, Microsoft, Apple, or email sign-in with phone verification on Experiment tier.",
      keyFormatHint: "32-character alphanumeric Mistral key",
      setupSteps: Object.freeze([
        "Open console.mistral.ai/api-keys in a new tab.",
        "Sign up or sign in using Google, Microsoft, Apple, or your email and password.",
        "If prompted to choose a workspace plan, select the free Experiment plan (no credit card required).",
        "Open API Keys in the left sidebar, click Create new key, name it LM Subs, and click Create new key.",
        "Copy the generated key string immediately, paste it into LM Subs, and click Save key then Test."
      ]),
      defaultModel: "voxtral-mini-transcribe-3",
      models: [
        "voxtral-mini-transcribe-3",
        "voxtral-small-transcribe-3",
        "voxtral-mini-latest"
      ],
      requiresKey: true,
      keyPlaceholder: "Mistral API key...",
      keyUrl: "https://console.mistral.ai/api-keys",
      originPattern: "https://api.mistral.ai/*",
      maxUploadBytes: 48 * 1024 * 1024,
      protocol: "mistral-stt",
      endpoint: "https://api.mistral.ai/v1/audio/transcriptions"
    }),
    gemini: Object.freeze({
      id: "gemini",
      name: "Google Gemini (AI Studio)",
      badge: "Free Daily Tier + Translation",
      freeTierSummary: "Google AI Studio free tier, no card. Multimodal audio-to-SRT with optional single-pass subtitle translation.",
      accountRequirements: "Uses the same Google account you already use for Google NotebookLM. No billing setup needed for free tier.",
      keyFormatHint: "Starts with AIzaSy (39 characters)",
      setupSteps: Object.freeze([
        "Open aistudio.google.com/apikey while signed into your Google account.",
        "Accept the Google AI Studio terms prompt if this is your first visit.",
        "Click the blue Create API key button near the top-right corner.",
        "Select Create API key in new project (or pick an existing Google Cloud project).",
        "Click Copy on the AIzaSy... key, paste it into LM Subs, and click Save key then Test."
      ]),
      defaultModel: "gemini-2.5-flash",
      models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
      requiresKey: true,
      keyPlaceholder: "AIzaSy...",
      keyUrl: "https://aistudio.google.com/apikey",
      originPattern: "https://generativelanguage.googleapis.com/*",
      maxUploadBytes: 18 * 1024 * 1024,
      protocol: "gemini-stt",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models"
    }),
    deepgram: Object.freeze({
      id: "deepgram",
      name: "Deepgram",
      badge: "$200 Free Credit, ~700 hrs",
      freeTierSummary: "$200 signup credit with no credit card (~700+ hours of Nova-3 batch audio with word-level timestamps).",
      accountRequirements: "Free Google, GitHub, or email sign-up. Includes $200 promotional credit without entering a card.",
      keyFormatHint: "40-character hexadecimal secret key",
      setupSteps: Object.freeze([
        "Open console.deepgram.com in a new tab.",
        "Click Sign Up (or Log In) with Google, GitHub, or email to claim the free $200 credit.",
        "In the left sidebar of your Default Project, click API Keys.",
        "Click Create a New API Key, enter LM Subs as the friendly name, leave Member permissions selected, and click Create Key.",
        "Copy the secret key before closing the modal, paste it into LM Subs, and click Save key then Test."
      ]),
      defaultModel: "nova-3",
      models: ["nova-3", "nova-2"],
      requiresKey: true,
      keyPlaceholder: "Deepgram API key...",
      keyUrl: "https://console.deepgram.com/",
      originPattern: "https://api.deepgram.com/*",
      maxUploadBytes: 50 * 1024 * 1024,
      protocol: "deepgram-stt",
      endpoint: "https://api.deepgram.com/v1/listen"
    }),
    assemblyai: Object.freeze({
      id: "assemblyai",
      name: "AssemblyAI",
      badge: "$50 Free Credit, ~330 hrs",
      freeTierSummary: "$50 free signup credit with no card (~330 hours on Universal-2 with word-level timestamps).",
      accountRequirements: "Free Google, GitHub, or email sign-up with $50 starter credit.",
      keyFormatHint: "32-character lowercase hexadecimal API key",
      setupSteps: Object.freeze([
        "Open assemblyai.com/app/account in a new tab.",
        "Create a free account or sign in using Google, GitHub, or email.",
        "After signing in, open the API Keys section on your dashboard home or Account page.",
        "Click Copy next to your Default API key (or click Create new API key and name it LM Subs).",
        "Paste the key into LM Subs and click Save key then Test."
      ]),
      defaultModel: "universal",
      models: ["universal", "nano"],
      requiresKey: true,
      keyPlaceholder: "AssemblyAI API key...",
      keyUrl: "https://www.assemblyai.com/app/account",
      originPattern: "https://api.assemblyai.com/*",
      maxUploadBytes: 50 * 1024 * 1024,
      protocol: "assemblyai-stt",
      endpoint: "https://api.assemblyai.com/v2"
    }),
    gladia: Object.freeze({
      id: "gladia",
      name: "Gladia",
      badge: "Free Monthly Hours, Solaria-1",
      freeTierSummary: "Free monthly transcription hours on Solaria-1 pre-recorded speech-to-text with native SRT/VTT generation.",
      accountRequirements: "Free Google, GitHub, or email sign-up.",
      keyFormatHint: "UUID-formatted Gladia API key (xxxxxxxx-xxxx-...)",
      setupSteps: Object.freeze([
        "Open app.gladia.io in a new tab.",
        "Sign up or log in with Google, GitHub, or your email address.",
        "Click API keys in the left dashboard menu (or copy the default key shown on the home card).",
        "Click Generate new key if needed, label it LM Subs, and copy the UUID token.",
        "Paste the token into LM Subs and click Save key then Test."
      ]),
      defaultModel: "solaria-1",
      models: ["solaria-1"],
      requiresKey: true,
      keyPlaceholder: "Gladia API key...",
      keyUrl: "https://app.gladia.io/",
      originPattern: "https://api.gladia.io/*",
      maxUploadBytes: 50 * 1024 * 1024,
      protocol: "gladia-stt",
      endpoint: "https://api.gladia.io/v2"
    }),
    cloudflare: Object.freeze({
      id: "cloudflare",
      name: "Cloudflare Workers AI",
      badge: "Free 10k Neurons/day",
      freeTierSummary: "10,000 free Neurons every day. Enter credentials as ACCOUNT_ID:API_TOKEN.",
      accountRequirements: "Free Cloudflare account (email, Google, or Apple). Uses combined ACCOUNT_ID:API_TOKEN format.",
      keyFormatHint: "Combined format: your_account_id:your_api_token",
      setupSteps: Object.freeze([
        "Open dash.cloudflare.com and sign in or create a free Cloudflare account.",
        "In the left sidebar, expand AI and click Workers AI, then click Use REST API.",
        "Click Create a Workers AI API Token, confirm permissions (Workers AI Read/Edit), and copy the generated API Token.",
        "On that same REST API page, copy your 32-character Account ID.",
        "Combine both values with a colon in between as account_id:api_token, paste into LM Subs, and click Save key then Test."
      ]),
      defaultModel: "@cf/openai/whisper-large-v3-turbo",
      models: ["@cf/openai/whisper-large-v3-turbo", "@cf/openai/whisper"],
      requiresKey: true,
      keyPlaceholder: "account_id:api_token",
      keyUrl: "https://dash.cloudflare.com/",
      originPattern: "https://api.cloudflare.com/*",
      maxUploadBytes: 18 * 1024 * 1024,
      protocol: "cloudflare-stt",
      endpoint: "https://api.cloudflare.com/client/v4/accounts"
    }),
    elevenlabs: Object.freeze({
      id: "elevenlabs",
      name: "ElevenLabs (Scribe v2)",
      badge: "10k Free Credits/mo",
      freeTierSummary: "10,000 monthly free credits (~30 min/month on Scribe v2) with word-level timestamps in 90+ languages.",
      accountRequirements: "Free ElevenLabs account via Google, Apple, GitHub, or email.",
      keyFormatHint: "Starts with sk_...",
      setupSteps: Object.freeze([
        "Open elevenlabs.io/app/settings/api-keys in a new tab.",
        "Sign in or register for a free ElevenLabs account.",
        "Click Create API Key in the API Keys panel and name it LM Subs.",
        "Ensure the Speech-to-Text endpoint permission is enabled (or leave unrestricted), then click Create.",
        "Copy the sk_... key, paste it into LM Subs, and click Save key then Test."
      ]),
      defaultModel: "scribe_v2",
      models: ["scribe_v2"],
      requiresKey: true,
      keyPlaceholder: "sk_...",
      keyUrl: "https://elevenlabs.io/app/settings/api-keys",
      originPattern: "https://api.elevenlabs.io/*",
      maxUploadBytes: 50 * 1024 * 1024,
      protocol: "elevenlabs-stt",
      endpoint: "https://api.elevenlabs.io/v1/speech-to-text"
    }),
    huggingface: Object.freeze({
      id: "huggingface",
      name: "Hugging Face Inference",
      badge: "Free HF Token Quota",
      freeTierSummary: "Free monthly Serverless Inference credits using any hf_... inference token.",
      accountRequirements: "Free Hugging Face account with verified email address.",
      keyFormatHint: "Starts with hf_...",
      setupSteps: Object.freeze([
        "Open huggingface.co/settings/tokens in a new tab and sign in (or click Sign Up to register and verify your email).",
        "Click the Create new token button.",
        "Choose Fine-grained (and check Make calls to Inference Providers) or Read, and name the token LM Subs.",
        "Click Create token at the bottom of the form.",
        "Copy the hf_... token immediately, paste it into LM Subs, and click Save key then Test."
      ]),
      defaultModel: "openai/whisper-large-v3-turbo",
      models: ["openai/whisper-large-v3-turbo", "openai/whisper-large-v3"],
      requiresKey: true,
      keyPlaceholder: "hf_...",
      keyUrl: "https://huggingface.co/settings/tokens",
      originPattern: "https://router.huggingface.co/*",
      maxUploadBytes: 18 * 1024 * 1024,
      protocol: "huggingface-stt",
      endpoint: "https://router.huggingface.co/hf-inference/models"
    }),
    openrouter: Object.freeze({
      id: "openrouter",
      name: "OpenRouter",
      badge: "Unified BYOK Router",
      freeTierSummary: "Unified OpenAI-compatible /api/v1/audio/transcriptions router across Voxtral and Whisper backends.",
      accountRequirements: "OpenRouter account (Google, GitHub, MetaMask, or email); audio models use pay-as-you-go credits.",
      keyFormatHint: "Starts with sk-or-v1-...",
      setupSteps: Object.freeze([
        "Open openrouter.ai/keys in a new tab and sign in with Google, GitHub, or email.",
        "If your credit balance is $0, add a small prepaid balance under Credits for audio transcription endpoints.",
        "Click Create Key, enter LM Subs as the name, optionally set a spending limit, and click Create.",
        "Copy the sk-or-v1-... secret string right away.",
        "Paste the key into LM Subs and click Save key then Test."
      ]),
      defaultModel: "mistralai/voxtral-mini-transcribe",
      models: ["mistralai/voxtral-mini-transcribe", "openai/whisper-1"],
      requiresKey: true,
      keyPlaceholder: "sk-or-v1-...",
      keyUrl: "https://openrouter.ai/keys",
      originPattern: "https://openrouter.ai/*",
      maxUploadBytes: 24 * 1024 * 1024,
      protocol: "openai-stt",
      endpoint: "https://openrouter.ai/api/v1/audio/transcriptions"
    }),
    openai: Object.freeze({
      id: "openai",
      name: "OpenAI Whisper",
      badge: "Standard Pay-As-You-Go",
      freeTierSummary: "Official OpenAI whisper-1 endpoint ($0.006/min) with word and segment verbose_json timestamps.",
      accountRequirements: "OpenAI Platform developer account (separate billing from ChatGPT Plus, minimum $5 prepaid credit).",
      keyFormatHint: "Starts with sk-proj-... or sk-...",
      setupSteps: Object.freeze([
        "Open platform.openai.com/api-keys and log in with your OpenAI developer account.",
        "Note that ChatGPT Plus subscriptions do not include API credits; ensure Billing has an active balance.",
        "Click Create new secret key in the top-right corner, name it LM Subs, and keep All permissions (or Audio enabled).",
        "Click Create secret key and copy the sk-proj-... token.",
        "Paste the key into LM Subs and click Save key then Test."
      ]),
      defaultModel: "whisper-1",
      models: ["whisper-1"],
      requiresKey: true,
      keyPlaceholder: "sk-proj-...",
      keyUrl: "https://platform.openai.com/api-keys",
      originPattern: "https://api.openai.com/*",
      maxUploadBytes: 24 * 1024 * 1024,
      protocol: "openai-stt",
      endpoint: "https://api.openai.com/v1/audio/transcriptions"
    }),
    custom: Object.freeze({
      id: "custom",
      name: "Local / Custom Whisper URL",
      badge: "100% Free, Unlimited Local",
      freeTierSummary: "Point at local speaches, faster-whisper-server, whisper.cpp, or LocalAI (http://localhost:8000/v1) for unlimited offline transcription.",
      accountRequirements: "Zero account, zero sign-up, and zero API key required. Runs 100% offline on your own CPU or GPU.",
      keyFormatHint: "Base URL http://localhost:8000/v1 (API key optional / blank)",
      setupSteps: Object.freeze([
        "Install Docker or Python and start an OpenAI-compatible local Whisper server such as speaches (docker run -p 8000:8000 ghcr.io/speaches-ai/speaches:latest-cpu).",
        "Verify http://localhost:8000/v1 is reachable on your machine.",
        "In LM Subs, enter http://localhost:8000/v1 as the OpenAI-compatible base URL.",
        "Leave the API key field blank unless your local server requires a custom Bearer token.",
        "Enable Local / Custom Whisper and click Save URL / Enable so audio stays completely on your machine."
      ]),
      defaultModel: "Systran/faster-whisper-small",
      models: ["Systran/faster-whisper-small", "whisper-1"],
      requiresKey: false,
      keyPlaceholder: "Optional Bearer key (leave blank for local)",
      keyUrl: "https://github.com/speaches-ai/speaches",
      originPattern: null,
      maxUploadBytes: 50 * 1024 * 1024,
      protocol: "custom-openai-stt",
      endpoint: "http://localhost:8000/v1/audio/transcriptions"
    })
  });

  // src/lib/storage.js
  var STORAGE_KEYS = Object.freeze({
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
    NOTEBOOKLM_STATS: "notebooklmStats"
  });
  var CAPTION_FONT_SIZES = Object.freeze([
    "small",
    "medium",
    "large",
    "xlarge",
    "xxlarge"
  ]);
  var CAPTION_STYLES = Object.freeze([
    "classic",
    "contrast",
    "minimal",
    "cinema",
    "paper",
    "amber"
  ]);
  var CAPTION_FONT_FAMILIES = Object.freeze([
    "sans",
    "serif",
    "mono",
    "dyslexic"
  ]);
  var CAPTION_COLORS = Object.freeze([
    "white",
    "yellow",
    "cyan",
    "green",
    "ink"
  ]);
  var CAPTION_POSITIONS = Object.freeze(["bottom", "raised", "top"]);
  var CAPTION_WIDTHS = Object.freeze(["compact", "balanced", "wide"]);
  var PLAYBAR_DOCK_MODES = Object.freeze(["native", "hover", "always"]);
  var NOTIFICATION_SOUND_PRESETS = Object.freeze([
    "chime",
    "marimba",
    "bell",
    "pulse",
    "soft-pop",
    "none"
  ]);
  var PLAYBACK_SPEEDS = Object.freeze([
    0.5,
    0.75,
    1,
    1.25,
    1.5,
    1.75,
    2,
    2.5
  ]);
  var DEFAULT_SETTINGS = Object.freeze({
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
    fontSize: "medium",
    // "small" | "medium" | "large" | "xlarge" | "xxlarge"
    captionStyle: "classic",
    // "classic" | "contrast" | "minimal" | "cinema" | "paper" | "amber"
    captionFontFamily: "sans",
    // "sans" | "serif" | "mono" | "dyslexic"
    captionColor: "white",
    // "white" | "yellow" | "cyan" | "green" | "ink"
    captionBgOpacity: 88,
    // 0..100
    captionPosition: "bottom",
    // "bottom" | "raised" | "top"
    captionMaxWidth: "balanced",
    // "compact" | "balanced" | "wide"
    karaokeHighlight: true,
    karaokeDelayMs: 0,
    // -1500..3000 ms delay applied to word-by-word highlight
    showSpeakerLabels: true,
    pauseOnCaptionHover: false,
    clickCaptionToCopy: true,
    defaultPlaybackSpeed: 1,
    subtitleOffsetSec: 0,
    fineGrainedControls: false,
    dynamicCaptionScaling: true,
    captionScaleFactor: 100,
    // 50..200 (%)
    captionMinFontPx: 10,
    // 8..18 (px)
    captionMaxFontPx: 42,
    // 20..64 (px)
    captionPaddingY: 7,
    // 2..20 (px)
    captionPaddingX: 15,
    // 6..40 (px)
    captionBorderRadius: 7,
    // 0..32 (px)
    captionLineHeight: 142,
    // 115..185 (%)
    captionBottomOffsetPx: 54,
    // 24..180 (px)
    captionTextStrokePx: 0,
    // 0..3 (px)
    karaokeHighlightOpacity: 48,
    // 15..95 (%)
    upcomingWordOpacity: 64,
    // 25..100 (%)
    playBarDockMode: "native",
    // "native" | "hover" | "always"
    hoverFadeDelayMs: 2200,
    // 400..6000 (ms)
    keepSubtitlesInPiP: true,
    skipSilenceEnabled: false,
    skipSilenceGapSec: 1.6,
    // 0.6..5.0 (s)
    skipSilenceRate: 2.2,
    // 1.4..3.0 (x)
    audioBoostPercent: 100,
    // 100..250 (%)
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
    rpcOverrides: {}
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
  async function getSettings(storageArea) {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.SETTINGS);
    const saved = raw?.[STORAGE_KEYS.SETTINGS];
    if (!saved || typeof saved !== "object") {
      return {
        ...DEFAULT_SETTINGS,
        queueOrder: [...DEFAULT_QUEUE_ORDER],
        providerModels: {},
        excludePatterns: [],
        rpcOverrides: {}
      };
    }
    const queueOrder = normalizeQueueOrder(saved.queueOrder);
    const primaryProvider = typeof saved.primaryProvider === "string" && DEFAULT_QUEUE_ORDER.includes(saved.primaryProvider) ? saved.primaryProvider : queueOrder[0] || "groq";
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
      enabled: typeof saved.enabled === "boolean" ? saved.enabled : DEFAULT_SETTINGS.enabled,
      debugMode: typeof saved.debugMode === "boolean" ? saved.debugMode : DEFAULT_SETTINGS.debugMode,
      autoOnGenerate: typeof saved.autoOnGenerate === "boolean" ? saved.autoOnGenerate : DEFAULT_SETTINGS.autoOnGenerate,
      autoOnExistingVideos: typeof saved.autoOnExistingVideos === "boolean" ? saved.autoOnExistingVideos : DEFAULT_SETTINGS.autoOnExistingVideos,
      autoOnAudioOverviews: typeof saved.autoOnAudioOverviews === "boolean" ? saved.autoOnAudioOverviews : DEFAULT_SETTINGS.autoOnAudioOverviews,
      primaryProvider,
      queueOrder,
      providerModels,
      customBaseUrl: typeof saved.customBaseUrl === "string" ? saved.customBaseUrl.trim() : "",
      customEnabled: Boolean(saved.customEnabled),
      languageHint: typeof saved.languageHint === "string" && saved.languageHint ? saved.languageHint : "auto",
      translateTo: typeof saved.translateTo === "string" && saved.translateTo ? saved.translateTo : "original",
      fontSize: CAPTION_FONT_SIZES.includes(saved.fontSize) ? saved.fontSize : "medium",
      captionStyle: CAPTION_STYLES.includes(saved.captionStyle) ? saved.captionStyle : "classic",
      captionFontFamily: CAPTION_FONT_FAMILIES.includes(saved.captionFontFamily) ? saved.captionFontFamily : "sans",
      captionColor: CAPTION_COLORS.includes(saved.captionColor) ? saved.captionColor : "white",
      captionBgOpacity: Number.isFinite(Number(saved.captionBgOpacity)) ? Math.max(0, Math.min(100, Math.round(Number(saved.captionBgOpacity)))) : DEFAULT_SETTINGS.captionBgOpacity,
      captionPosition: CAPTION_POSITIONS.includes(saved.captionPosition) ? saved.captionPosition : "bottom",
      captionMaxWidth: CAPTION_WIDTHS.includes(saved.captionMaxWidth) ? saved.captionMaxWidth : "balanced",
      karaokeHighlight: typeof saved.karaokeHighlight === "boolean" ? saved.karaokeHighlight : DEFAULT_SETTINGS.karaokeHighlight,
      karaokeDelayMs: Number.isFinite(Number(saved.karaokeDelayMs)) ? Math.max(-1500, Math.min(3e3, Math.round(Number(saved.karaokeDelayMs) / 10) * 10)) : DEFAULT_SETTINGS.karaokeDelayMs,
      showSpeakerLabels: typeof saved.showSpeakerLabels === "boolean" ? saved.showSpeakerLabels : DEFAULT_SETTINGS.showSpeakerLabels,
      pauseOnCaptionHover: typeof saved.pauseOnCaptionHover === "boolean" ? saved.pauseOnCaptionHover : DEFAULT_SETTINGS.pauseOnCaptionHover,
      clickCaptionToCopy: typeof saved.clickCaptionToCopy === "boolean" ? saved.clickCaptionToCopy : DEFAULT_SETTINGS.clickCaptionToCopy,
      defaultPlaybackSpeed: PLAYBACK_SPEEDS.includes(Number(saved.defaultPlaybackSpeed)) ? Number(saved.defaultPlaybackSpeed) : DEFAULT_SETTINGS.defaultPlaybackSpeed,
      subtitleOffsetSec: Number.isFinite(Number(saved.subtitleOffsetSec)) ? Math.max(-10, Math.min(10, Number(saved.subtitleOffsetSec))) : 0,
      fineGrainedControls: typeof saved.fineGrainedControls === "boolean" ? saved.fineGrainedControls : DEFAULT_SETTINGS.fineGrainedControls,
      dynamicCaptionScaling: typeof saved.dynamicCaptionScaling === "boolean" ? saved.dynamicCaptionScaling : DEFAULT_SETTINGS.dynamicCaptionScaling,
      captionScaleFactor: Number.isFinite(Number(saved.captionScaleFactor)) ? Math.max(50, Math.min(200, Math.round(Number(saved.captionScaleFactor)))) : DEFAULT_SETTINGS.captionScaleFactor,
      captionMinFontPx: Number.isFinite(Number(saved.captionMinFontPx)) ? Math.max(8, Math.min(18, Math.round(Number(saved.captionMinFontPx)))) : DEFAULT_SETTINGS.captionMinFontPx,
      captionMaxFontPx: Number.isFinite(Number(saved.captionMaxFontPx)) ? Math.max(20, Math.min(64, Math.round(Number(saved.captionMaxFontPx)))) : DEFAULT_SETTINGS.captionMaxFontPx,
      captionPaddingY: Number.isFinite(Number(saved.captionPaddingY)) ? Math.max(2, Math.min(20, Math.round(Number(saved.captionPaddingY)))) : DEFAULT_SETTINGS.captionPaddingY,
      captionPaddingX: Number.isFinite(Number(saved.captionPaddingX)) ? Math.max(6, Math.min(40, Math.round(Number(saved.captionPaddingX)))) : DEFAULT_SETTINGS.captionPaddingX,
      captionBorderRadius: Number.isFinite(Number(saved.captionBorderRadius)) ? Math.max(0, Math.min(32, Math.round(Number(saved.captionBorderRadius)))) : DEFAULT_SETTINGS.captionBorderRadius,
      captionLineHeight: Number.isFinite(Number(saved.captionLineHeight)) ? Math.max(115, Math.min(185, Math.round(Number(saved.captionLineHeight)))) : DEFAULT_SETTINGS.captionLineHeight,
      captionBottomOffsetPx: Number.isFinite(Number(saved.captionBottomOffsetPx)) ? Math.max(24, Math.min(180, Math.round(Number(saved.captionBottomOffsetPx)))) : DEFAULT_SETTINGS.captionBottomOffsetPx,
      captionTextStrokePx: Number.isFinite(Number(saved.captionTextStrokePx)) ? Math.max(0, Math.min(3, Math.round(Number(saved.captionTextStrokePx) * 2) / 2)) : DEFAULT_SETTINGS.captionTextStrokePx,
      karaokeHighlightOpacity: Number.isFinite(Number(saved.karaokeHighlightOpacity)) ? Math.max(15, Math.min(95, Math.round(Number(saved.karaokeHighlightOpacity)))) : DEFAULT_SETTINGS.karaokeHighlightOpacity,
      upcomingWordOpacity: Number.isFinite(Number(saved.upcomingWordOpacity)) ? Math.max(25, Math.min(100, Math.round(Number(saved.upcomingWordOpacity)))) : DEFAULT_SETTINGS.upcomingWordOpacity,
      playBarDockMode: PLAYBAR_DOCK_MODES.includes(saved.playBarDockMode) ? saved.playBarDockMode : DEFAULT_SETTINGS.playBarDockMode,
      hoverFadeDelayMs: Number.isFinite(Number(saved.hoverFadeDelayMs)) ? Math.max(400, Math.min(6e3, Math.round(Number(saved.hoverFadeDelayMs) / 100) * 100)) : DEFAULT_SETTINGS.hoverFadeDelayMs,
      keepSubtitlesInPiP: typeof saved.keepSubtitlesInPiP === "boolean" ? saved.keepSubtitlesInPiP : DEFAULT_SETTINGS.keepSubtitlesInPiP,
      skipSilenceEnabled: typeof saved.skipSilenceEnabled === "boolean" ? saved.skipSilenceEnabled : DEFAULT_SETTINGS.skipSilenceEnabled,
      skipSilenceGapSec: Number.isFinite(Number(saved.skipSilenceGapSec)) ? Math.max(0.6, Math.min(5, Math.round(Number(saved.skipSilenceGapSec) * 10) / 10)) : DEFAULT_SETTINGS.skipSilenceGapSec,
      skipSilenceRate: Number.isFinite(Number(saved.skipSilenceRate)) ? Math.max(1.4, Math.min(3, Math.round(Number(saved.skipSilenceRate) * 10) / 10)) : DEFAULT_SETTINGS.skipSilenceRate,
      audioBoostPercent: Number.isFinite(Number(saved.audioBoostPercent)) ? Math.max(100, Math.min(250, Math.round(Number(saved.audioBoostPercent) / 5) * 5)) : DEFAULT_SETTINGS.audioBoostPercent,
      showToast: typeof saved.showToast === "boolean" ? saved.showToast : DEFAULT_SETTINGS.showToast,
      desktopNotifications: typeof saved.desktopNotifications === "boolean" ? saved.desktopNotifications : DEFAULT_SETTINGS.desktopNotifications,
      soundAlerts: typeof saved.soundAlerts === "boolean" ? saved.soundAlerts : DEFAULT_SETTINGS.soundAlerts,
      notificationSoundPreset: NOTIFICATION_SOUND_PRESETS.includes(
        saved.notificationSoundPreset
      ) ? saved.notificationSoundPreset : DEFAULT_SETTINGS.notificationSoundPreset,
      notificationSoundVolume: Number.isFinite(Number(saved.notificationSoundVolume)) ? Math.max(10, Math.min(100, Math.round(Number(saved.notificationSoundVolume)))) : DEFAULT_SETTINGS.notificationSoundVolume,
      badgeAlerts: typeof saved.badgeAlerts === "boolean" ? saved.badgeAlerts : DEFAULT_SETTINGS.badgeAlerts,
      notifyOnFailover: typeof saved.notifyOnFailover === "boolean" ? saved.notifyOnFailover : DEFAULT_SETTINGS.notifyOnFailover,
      notifyOnSync: typeof saved.notifyOnSync === "boolean" ? saved.notifyOnSync : DEFAULT_SETTINGS.notifyOnSync,
      autoUpdateExtension: typeof saved.autoUpdateExtension === "boolean" ? saved.autoUpdateExtension : DEFAULT_SETTINGS.autoUpdateExtension,
      autoBackgroundSync: typeof saved.autoBackgroundSync === "boolean" ? saved.autoBackgroundSync : DEFAULT_SETTINGS.autoBackgroundSync,
      excludePatterns: Array.isArray(saved.excludePatterns) ? saved.excludePatterns.map((s) => String(s).trim()).filter(Boolean) : [],
      rpcOverrides
    };
  }
  async function saveSettings(partial, storageArea) {
    const store = resolveStorage(storageArea);
    const current = await getSettings(store);
    const next = {
      ...current,
      ...partial
    };
    if (partial?.queueOrder) {
      next.queueOrder = normalizeQueueOrder(partial.queueOrder);
    }
    if (partial?.primaryProvider && DEFAULT_QUEUE_ORDER.includes(partial.primaryProvider)) {
      next.primaryProvider = partial.primaryProvider;
      if (!partial.queueOrder) {
        next.queueOrder = normalizeQueueOrder([
          partial.primaryProvider,
          ...next.queueOrder
        ]);
      }
    } else if (next.queueOrder.length > 0) {
      next.primaryProvider = next.queueOrder[0];
    }
    if (Array.isArray(partial?.excludePatterns)) {
      next.excludePatterns = partial.excludePatterns.map((s) => String(s).trim()).filter(Boolean);
    }
    if (partial && "karaokeDelayMs" in partial) {
      next.karaokeDelayMs = Number.isFinite(Number(partial.karaokeDelayMs)) ? Math.max(-1500, Math.min(3e3, Math.round(Number(partial.karaokeDelayMs) / 10) * 10)) : DEFAULT_SETTINGS.karaokeDelayMs;
    }
    await store.set({ [STORAGE_KEYS.SETTINGS]: next });
    return next;
  }
  function sanitizeDebugMessage(text) {
    if (typeof text !== "string") return String(text ?? "");
    return text.replace(/\b(?:gsk_|sk-|AIza|hf_|xi-|lms_)[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_KEY]").replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]").replace(/Bearer\s+[A-Za-z0-9._:-]+/gi, "Bearer [REDACTED]").slice(0, 600);
  }
  var DEFAULT_SYNC_PREFERENCES = Object.freeze({
    syncApiKeys: true,
    syncTranscripts: true,
    syncSettings: true
  });
  var DEFAULT_CLOUD_SYNC_PROFILE = Object.freeze({
    serverUrl: HOSTED_CLOUD_URL,
    connected: false,
    autoSync: true,
    syncPreferences: DEFAULT_SYNC_PREFERENCES,
    user: null,
    keyHints: {},
    subtitleCount: 0,
    lastSyncedAt: null
  });

  // src/content/debug-drawer.js
  var DRAWER_CSS = (
    /* css */
    `
  :host {
    all: initial;
    position: fixed;
    left: 14px;
    bottom: 14px;
    z-index: 2147483646;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    color: #e6edf3;
    pointer-events: auto;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 11px;
    background: rgba(13, 17, 23, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 7px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    color: #e6edf3;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
  }

  .pill:hover {
    border-color: rgba(255, 255, 255, 0.32);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #3fb950;
  }
  .dot.error {
    background: #f85149;
  }

  .panel {
    width: 440px;
    max-width: calc(100vw - 28px);
    background: rgba(13, 17, 23, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.55);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel[hidden], .pill[hidden] {
    display: none !important;
  }

  .hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background: #161b22;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11.5px;
    font-weight: 600;
  }

  .hdr-actions {
    display: flex;
    gap: 5px;
  }

  button.act {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: #21262d;
    color: #e6edf3;
    border-radius: 5px;
    padding: 3px 7px;
    font-family: inherit;
    font-size: 10.5px;
    cursor: pointer;
  }
  button.act:hover {
    background: #30363d;
  }
  button.act.primary {
    border-color: rgba(56, 139, 253, 0.5);
    background: rgba(56, 139, 253, 0.18);
    color: #79c0ff;
  }

  .summary {
    padding: 6px 10px;
    font-size: 10.5px;
    line-height: 1.45;
    color: #8b949e;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: #0d1117;
  }

  .summary strong {
    color: #c9d1d9;
  }

  .logs {
    max-height: 210px;
    overflow-y: auto;
    padding: 6px 10px;
    font-size: 10.5px;
    line-height: 1.45;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .row {
    word-break: break-word;
    color: #c9d1d9;
  }
  .row .ts {
    color: #6e7681;
    margin-right: 5px;
  }
  .row .tag {
    display: inline-block;
    padding: 0 4px;
    border-radius: 3px;
    margin-right: 5px;
    font-size: 9.5px;
    font-weight: 700;
    background: rgba(110, 118, 129, 0.25);
    color: #c9d1d9;
  }
  .row.error {
    color: #ffa198;
  }
  .row.error .tag {
    background: rgba(248, 81, 73, 0.25);
    color: #ff7b72;
  }
  .row.ok .tag {
    background: rgba(63, 185, 80, 0.22);
    color: #56d364;
  }
`
  );
  var DebugDrawer = class {
    constructor({
      doc = globalThis.document,
      onForceScan = null,
      onCopyReport = null,
      onClear = null
    } = {}) {
      this.doc = doc;
      this.onForceScan = onForceScan;
      this.onCopyReport = onCopyReport;
      this.onClear = onClear;
      this.host = null;
      this.collapsed = false;
      this.entries = [];
      this.summaryState = {
        artifacts: 0,
        videos: 0,
        status: "idle",
        permissionsOk: true
      };
    }
    mount() {
      if (this.host || !this.doc?.body) return;
      const existing = this.doc.getElementById?.(DOM_SELECTORS.DEBUG_DRAWER_HOST_ID);
      if (existing) existing.remove?.();
      const host = this.doc.createElement("div");
      host.id = DOM_SELECTORS.DEBUG_DRAWER_HOST_ID;
      const shadow = host.attachShadow({ mode: "open" });
      const style = this.doc.createElement("style");
      style.textContent = DRAWER_CSS;
      const pill = this.doc.createElement("div");
      pill.className = "pill";
      pill.hidden = true;
      const dot = this.doc.createElement("span");
      dot.className = "dot";
      const pillLabel = this.doc.createElement("span");
      pillLabel.textContent = "LM Subs \xB7 Debug (0)";
      pill.append(dot, pillLabel);
      pill.addEventListener("click", () => {
        this.collapsed = false;
        this._syncVisibility();
      });
      const panel = this.doc.createElement("div");
      panel.className = "panel";
      const hdr = this.doc.createElement("div");
      hdr.className = "hdr";
      const title = this.doc.createElement("span");
      title.textContent = "LM Subs \xB7 Pipeline Monitor";
      const actions = this.doc.createElement("div");
      actions.className = "hdr-actions";
      const mkBtn = (label, cls, fn) => {
        const b = this.doc.createElement("button");
        b.type = "button";
        b.className = cls ? `act ${cls}` : "act";
        b.textContent = label;
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          fn(b);
        });
        return b;
      };
      const scanBtn = mkBtn("Scan / Retry", "primary", () => this.onForceScan?.());
      const copyBtn = mkBtn("Copy Report", "", async (btn) => {
        if (!this.onCopyReport) return;
        const ok = await this.onCopyReport();
        btn.textContent = ok ? "Copied!" : "Copy Failed";
        setTimeout(() => {
          btn.textContent = "Copy Report";
        }, 1600);
      });
      const clearBtn = mkBtn("Clear", "", () => {
        this.entries = [];
        this.renderLogs();
        this.onClear?.();
      });
      const minBtn = mkBtn("_", "", () => {
        this.collapsed = true;
        this._syncVisibility();
      });
      actions.append(scanBtn, copyBtn, clearBtn, minBtn);
      hdr.append(title, actions);
      const summary = this.doc.createElement("div");
      summary.className = "summary";
      const logs = this.doc.createElement("div");
      logs.className = "logs";
      panel.append(hdr, summary, logs);
      shadow.append(style, pill, panel);
      this.doc.body.appendChild(host);
      this.host = host;
      this.els = { pill, dot, pillLabel, panel, summary, logs };
      this.renderSummary();
      this.renderLogs();
      this._syncVisibility();
    }
    _syncVisibility() {
      if (!this.els) return;
      this.els.pill.hidden = !this.collapsed;
      this.els.panel.hidden = this.collapsed;
    }
    updateSummary(partial = {}) {
      this.summaryState = { ...this.summaryState, ...partial };
      this.renderSummary();
    }
    renderSummary() {
      if (!this.els) return;
      const s = this.summaryState;
      const permText = s.permissionsOk ? "OK" : "MISSING CDN PERM";
      this.els.summary.textContent = `Artifacts: ${s.artifacts}  |  <video> bound: ${s.videos}  |  State: ${s.status}  |  Perms: ${permText}`;
    }
    pushEntry(entry) {
      if (!entry) return;
      this.entries.push(entry);
      if (this.entries.length > 80) {
        this.entries.shift();
      }
      this.renderLogs();
    }
    setEntries(list = []) {
      this.entries = Array.isArray(list) ? list.slice(-80) : [];
      this.renderLogs();
    }
    renderLogs() {
      if (!this.els) return;
      const hasError = this.entries.some((e) => e.level === "error");
      this.els.dot.className = hasError ? "dot error" : "dot";
      this.els.pillLabel.textContent = `LM Subs \xB7 Debug (${this.entries.length})`;
      const container = this.els.logs;
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      if (this.entries.length === 0) {
        const empty = this.doc.createElement("div");
        empty.className = "row";
        empty.textContent = "Waiting for NotebookLM Video Overview activity...";
        container.appendChild(empty);
        return;
      }
      for (const item of this.entries.slice(-50)) {
        const row = this.doc.createElement("div");
        row.className = item.level === "error" ? "row error" : item.level === "ok" ? "row ok" : "row";
        const ts = this.doc.createElement("span");
        ts.className = "ts";
        ts.textContent = String(item.ts || "").slice(11, 19) || "--:--:--";
        const tag = this.doc.createElement("span");
        tag.className = "tag";
        tag.textContent = item.layer || "LOG";
        const msg = this.doc.createElement("span");
        msg.textContent = `${item.event ? item.event + ": " : ""}${item.detail || ""}`;
        row.append(ts, tag, msg);
        container.appendChild(row);
      }
      container.scrollTop = container.scrollHeight;
    }
    destroy() {
      if (this.host) {
        this.host.remove?.();
        this.host = null;
        this.els = null;
      }
    }
  };

  // src/lib/subtitles.js
  var DEFAULT_MAX_LINE_CHARS = 42;
  var DEFAULT_MIN_DURATION_SEC = 0.85;
  function stripLlmFences(rawText) {
    if (typeof rawText !== "string") return "";
    let s = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "");
    if (/<think>/i.test(s)) {
      s = s.replace(/<think>[\s\S]*$/i, "");
    }
    s = s.trim();
    const fenceMatch = s.match(/```(?:srt|vtt|webvtt|text)?\s*\r?\n([\s\S]*?)```/i);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }
    return s;
  }
  function parseTimestampSec(raw) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return Math.max(0, raw);
    }
    if (typeof raw !== "string") return NaN;
    const trimmed = raw.trim().replace(",", ".");
    const parts = trimmed.split(":");
    if (parts.length < 2 || parts.length > 3) return NaN;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    if (parts.length === 3) {
      hours = Number(parts[0]);
      minutes = Number(parts[1]);
      seconds = Number(parts[2]);
    } else {
      minutes = Number(parts[0]);
      seconds = Number(parts[1]);
    }
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return NaN;
    }
    return Math.max(0, hours * 3600 + minutes * 60 + seconds);
  }
  function formatTimestamp(seconds, separator = ",") {
    const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const totalMs = Math.round(clamped * 1e3);
    const ms = totalMs % 1e3;
    const totalSecs = Math.floor(totalMs / 1e3);
    const s = totalSecs % 60;
    const totalMins = Math.floor(totalSecs / 60);
    const m = totalMins % 60;
    const h = Math.floor(totalMins / 60);
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    const mmm = String(ms).padStart(3, "0");
    return `${hh}:${mm}:${ss}${separator}${mmm}`;
  }
  function wrapSubtitleLines(text, maxLineChars = DEFAULT_MAX_LINE_CHARS) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return "";
    if (clean.length <= maxLineChars) return clean;
    const words = clean.split(" ");
    if (words.length <= 1) return clean;
    const midpoint = clean.length / 2;
    let bestSplit = 1;
    let bestScore = Infinity;
    let runningLen = 0;
    for (let i = 0; i < words.length - 1; i++) {
      runningLen += (i > 0 ? 1 : 0) + words[i].length;
      const rightLen = clean.length - runningLen - 1;
      let penalty = Math.abs(runningLen - midpoint);
      if (runningLen > maxLineChars || rightLen > maxLineChars) {
        penalty += 50;
      }
      if (/[,.;:?!—-]$/.test(words[i])) {
        penalty -= 6;
      }
      if (penalty < bestScore) {
        bestScore = penalty;
        bestSplit = i + 1;
      }
    }
    const line1 = words.slice(0, bestSplit).join(" ");
    const line2 = words.slice(bestSplit).join(" ");
    return `${line1}
${line2}`;
  }
  function normalizeAndSortCues(rawCues, offsetSec = 0) {
    if (!Array.isArray(rawCues) || rawCues.length === 0) return [];
    const cleaned = [];
    for (const item of rawCues) {
      if (!item || typeof item !== "object") continue;
      const startRaw = Number(item.startSec ?? item.start);
      const endRaw = Number(item.endSec ?? item.end);
      if (!Number.isFinite(startRaw)) continue;
      let text = String(item.text || "").replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean).join("\n").trim();
      if (!text) continue;
      const speaker = typeof item.speaker === "string" && item.speaker.trim() ? item.speaker.trim() : null;
      const startSec = Math.max(0, Math.round((startRaw + offsetSec) * 1e3) / 1e3);
      const fallbackEnd = startSec + Math.max(DEFAULT_MIN_DURATION_SEC, text.length * 0.055);
      const computedEnd = Number.isFinite(endRaw) ? Math.max(startSec + 0.25, endRaw + offsetSec) : fallbackEnd;
      const endSec = Math.round(computedEnd * 1e3) / 1e3;
      if (!text.includes("\n") && text.length > DEFAULT_MAX_LINE_CHARS) {
        text = wrapSubtitleLines(text, DEFAULT_MAX_LINE_CHARS);
      }
      const secondaryText = typeof item.secondaryText === "string" && item.secondaryText.trim() ? item.secondaryText.trim() : null;
      const bookmarked = Boolean(item.bookmarked);
      cleaned.push({
        startSec,
        endSec,
        text,
        ...speaker ? { speaker } : {},
        ...secondaryText ? { secondaryText } : {},
        ...bookmarked ? { bookmarked: true } : {}
      });
    }
    cleaned.sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec);
    const out = [];
    for (let i = 0; i < cleaned.length; i++) {
      const curr = { ...cleaned[i] };
      const prev = out[out.length - 1];
      if (prev && prev.text === curr.text && Math.abs(curr.startSec - prev.endSec) < 0.15) {
        prev.endSec = Math.max(prev.endSec, curr.endSec);
        continue;
      }
      if (prev && prev.endSec > curr.startSec) {
        if (curr.startSec - prev.startSec >= 0.25) {
          prev.endSec = curr.startSec;
        } else {
          curr.startSec = prev.endSec;
          if (curr.endSec <= curr.startSec + 0.2) {
            curr.endSec = Math.round((curr.startSec + 0.6) * 1e3) / 1e3;
          }
        }
      }
      out.push(curr);
    }
    return out.map((cue, idx) => ({
      index: idx + 1,
      ...cue
    }));
  }
  function parseSubtitleText(input, offsetSec = 0) {
    const cleaned = stripLlmFences(input);
    if (!cleaned) return [];
    const trimmed = cleaned.replace(/^\uFEFF/, "").trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsedJson = JSON.parse(trimmed);
        const cueArray = Array.isArray(parsedJson) ? parsedJson : Array.isArray(parsedJson?.cues) ? parsedJson.cues : null;
        if (cueArray) {
          return normalizeAndSortCues(
            cueArray.map((c) => ({
              startSec: Number(c.startSec ?? c.start ?? 0),
              endSec: Number(c.endSec ?? c.end ?? 0),
              text: String(c.text || ""),
              ...c.speaker ? { speaker: String(c.speaker) } : {}
            })),
            offsetSec
          );
        }
      } catch {
      }
    }
    const lines = cleaned.replace(/^\uFEFF/, "").split(/\r?\n/);
    const rawCues = [];
    let i = 0;
    if (lines[0] && /^WEBVTT\b/i.test(lines[0].trim())) {
      i = 1;
      while (i < lines.length && lines[i].trim() !== "") i++;
    }
    while (i < lines.length) {
      while (i < lines.length && lines[i].trim() === "") i++;
      if (i >= lines.length) break;
      if (/^(?:NOTE|STYLE|REGION)\b/i.test(lines[i].trim())) {
        while (i < lines.length && lines[i].trim() !== "") i++;
        continue;
      }
      let timeLine = lines[i].trim();
      if (!timeLine.includes("-->") && i + 1 < lines.length && lines[i + 1].includes("-->")) {
        i++;
        timeLine = lines[i].trim();
      }
      if (!timeLine.includes("-->")) {
        i++;
        continue;
      }
      const arrowIdx = timeLine.indexOf("-->");
      const startStr = timeLine.slice(0, arrowIdx).trim();
      const rightSide = timeLine.slice(arrowIdx + 3).trim().split(/\s+/)[0];
      const startSec = parseTimestampSec(startStr);
      const endSec = parseTimestampSec(rightSide);
      i++;
      const textLines = [];
      while (i < lines.length && lines[i].trim() !== "") {
        const stripped = lines[i].replace(/<[^>]+>/g, "").trim();
        if (stripped) textLines.push(stripped);
        i++;
      }
      if (Number.isFinite(startSec) && textLines.length > 0) {
        rawCues.push({
          startSec,
          endSec,
          text: textLines.join("\n")
        });
      }
    }
    return normalizeAndSortCues(rawCues, offsetSec);
  }
  function formatSrt(cues) {
    const normalized = normalizeAndSortCues(cues);
    if (normalized.length === 0) return "";
    return normalized.map((cue, idx) => {
      const prefix = cue.speaker ? `[${cue.speaker}] ` : "";
      const body = prefix ? wrapSubtitleLines(`${prefix}${cue.text.replace(/\n/g, " ")}`) : cue.text;
      return `${idx + 1}
${formatTimestamp(cue.startSec, ",")} --> ${formatTimestamp(
        cue.endSec,
        ","
      )}
${body}`;
    }).join("\n\n") + "\n";
  }
  function formatVtt(cues) {
    const normalized = normalizeAndSortCues(cues);
    if (normalized.length === 0) return "WEBVTT\n\n";
    const blocks = normalized.map((cue, idx) => {
      const prefix = cue.speaker ? `[${cue.speaker}] ` : "";
      const body = prefix ? wrapSubtitleLines(`${prefix}${cue.text.replace(/\n/g, " ")}`) : cue.text;
      return `${idx + 1}
${formatTimestamp(cue.startSec, ".")} --> ${formatTimestamp(
        cue.endSec,
        "."
      )}
${body}`;
    });
    return `WEBVTT

${blocks.join("\n\n")}
`;
  }
  function formatShortTimestamp(seconds) {
    const clamped = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
    const s = clamped % 60;
    const totalMins = Math.floor(clamped / 60);
    const m = totalMins % 60;
    const h = Math.floor(totalMins / 60);
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
  }
  function formatTxt(cues, { includeTimestamps = true, title = "" } = {}) {
    const normalized = normalizeAndSortCues(cues);
    if (normalized.length === 0) return "";
    const header = title ? `# ${String(title).trim()}

` : "";
    const lines = normalized.map((cue) => {
      const cleanText = String(cue.text || "").replace(/\s+/g, " ").trim();
      const speakerPrefix = cue.speaker ? `${cue.speaker}: ` : "";
      if (!includeTimestamps) {
        return `${speakerPrefix}${cleanText}`;
      }
      return `[${formatShortTimestamp(cue.startSec)}] ${speakerPrefix}${cleanText}`;
    });
    return `${header}${lines.join("\n")}
`;
  }
  function formatJsonSubtitles(cues, meta = {}) {
    const normalized = normalizeAndSortCues(cues);
    const payload = {
      schema: "lm-subs/v1",
      title: meta.title || "NotebookLM Video Overview",
      language: meta.language || "en",
      ...meta.provider ? { provider: meta.provider } : {},
      ...meta.model ? { model: meta.model } : {},
      ...meta.artifactId ? { artifactId: meta.artifactId } : {},
      cueCount: normalized.length,
      exportedAt: meta.exportedAt || (/* @__PURE__ */ new Date()).toISOString(),
      cues: normalized
    };
    return `${JSON.stringify(payload, null, 2)}
`;
  }
  function formatMarkdownNotes(cues, meta = {}) {
    const normalized = normalizeAndSortCues(cues);
    const title = String(meta.title || "NotebookLM Video Overview").trim();
    const lang = String(meta.language || "en").trim();
    const lastEnd = normalized.length > 0 ? normalized[normalized.length - 1].endSec : 0;
    const mins = Math.floor(lastEnd / 60);
    const secs = Math.round(lastEnd % 60);
    const durationLabel = `${mins}:${String(secs).padStart(2, "0")}`;
    const lines = [
      `# ${title}`,
      "",
      `- **Language:** ${lang}`,
      `- **Duration:** ${durationLabel}`,
      `- **Synchronized cues:** ${normalized.length}`,
      ...meta.provider ? [`- **Transcribed via:** ${meta.provider}`] : [],
      ""
    ];
    if (normalized.length === 0) {
      lines.push("_No caption cues available._", "");
      return lines.join("\n");
    }
    const bookmarkedCues = normalized.filter((c) => c.bookmarked);
    if (bookmarkedCues.length > 0) {
      lines.push("## Saved study bookmarks", "");
      for (const cue of bookmarkedCues) {
        const stamp = formatTimestamp(cue.startSec, ".").slice(3, 8);
        const clean = cue.text.replace(/\s*\n\s*/g, " ").trim();
        lines.push(`- \`[${stamp}]\` ${clean}`);
      }
      lines.push("");
    }
    const SECTION_SPAN_SEC = 90;
    const sections = [];
    let current = null;
    for (const cue of normalized) {
      if (!current || cue.startSec - current.startSec >= SECTION_SPAN_SEC) {
        current = {
          startSec: cue.startSec,
          endSec: cue.endSec,
          items: []
        };
        sections.push(current);
      }
      current.endSec = Math.max(current.endSec, cue.endSec);
      current.items.push(cue);
    }
    lines.push("## Study summary by timestamp", "");
    sections.forEach((sec, idx) => {
      const startStamp = formatTimestamp(sec.startSec, ".").slice(3, 8);
      const endStamp = formatTimestamp(sec.endSec, ".").slice(3, 8);
      lines.push(`### Part ${idx + 1} (${startStamp} to ${endStamp})`, "");
      const prose = sec.items.map((c) => {
        const clean = c.text.replace(/\s*\n\s*/g, " ").trim();
        return c.speaker ? `**${c.speaker}:** ${clean}` : clean;
      }).join(" ");
      lines.push(prose, "");
    });
    lines.push("## Timestamped transcript", "");
    for (const cue of normalized) {
      const stamp = formatTimestamp(cue.startSec, ".").slice(3, 8);
      const clean = cue.text.replace(/\s*\n\s*/g, " ").trim();
      const speakerPrefix = cue.speaker ? `**${cue.speaker}:** ` : "";
      lines.push(`- \`[${stamp}]\` ${speakerPrefix}${clean}`);
    }
    lines.push("");
    return lines.join("\n");
  }
  function buildAutoChapters(cues, { targetSpanSec = 60 } = {}) {
    const normalized = normalizeAndSortCues(cues);
    if (normalized.length === 0) return [];
    const chapters = [];
    let startIdx = 0;
    while (startIdx < normalized.length) {
      const startCue = normalized[startIdx];
      let endIdx = startIdx;
      while (endIdx + 1 < normalized.length) {
        const curr = normalized[endIdx];
        const next = normalized[endIdx + 1];
        const span = curr.endSec - startCue.startSec;
        const gap = next.startSec - curr.endSec;
        const endsSentence = /[.?!]["')]*$/.test(curr.text.trim());
        if (span >= targetSpanSec && (endsSentence || gap >= 0.45)) {
          break;
        }
        if (span >= targetSpanSec * 1.45) {
          break;
        }
        endIdx += 1;
      }
      const slice = normalized.slice(startIdx, endIdx + 1);
      const rawLead = slice[0].text.replace(/\s*\n\s*/g, " ").trim();
      const firstClause = rawLead.split(/(?<=[.?!:;])\s+/)[0] || rawLead;
      const cleanHeading = firstClause.length > 62 ? `${firstClause.slice(0, 59).replace(/\s+\S*$/, "")}\u2026` : firstClause.replace(/[.]+$/, "");
      const wordCount = slice.reduce(
        (acc, c) => acc + String(c.text || "").trim().split(/\s+/).filter(Boolean).length,
        0
      );
      chapters.push({
        chapterNumber: chapters.length + 1,
        cueIndex: startIdx,
        startSec: startCue.startSec,
        endSec: slice[slice.length - 1].endSec,
        timestamp: formatShortTimestamp(startCue.startSec),
        title: cleanHeading || `Section ${chapters.length + 1}`,
        cueCount: slice.length,
        wordCount
      });
      startIdx = endIdx + 1;
    }
    return chapters;
  }
  function escapeCsvCell(val) {
    const s = String(val ?? "");
    if (/[",\r\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }
  function formatCsvSubtitles(cues) {
    const normalized = normalizeAndSortCues(cues);
    const header = "index,start_sec,end_sec,timestamp,speaker,bookmarked,text";
    if (normalized.length === 0) return `${header}
`;
    const rows = normalized.map((cue, idx) => {
      const cleanText = String(cue.text || "").replace(/\s*\n\s*/g, " ").trim();
      return [
        idx + 1,
        cue.startSec.toFixed(3),
        cue.endSec.toFixed(3),
        formatShortTimestamp(cue.startSec),
        escapeCsvCell(cue.speaker || ""),
        cue.bookmarked ? "true" : "false",
        escapeCsvCell(cleanText)
      ].join(",");
    });
    return `${header}
${rows.join("\n")}
`;
  }
  function slugifySubtitleFilename(title) {
    const slug = String(title || "notebooklm-video-overview").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
    return slug || "notebooklm-video-overview";
  }
  function serializeSubtitles(cues, format = "srt", meta = {}) {
    const fmt = String(format || "srt").toLowerCase();
    const base = slugifySubtitleFilename(meta.title);
    if (fmt === "vtt") {
      return {
        content: formatVtt(cues),
        extension: "vtt",
        mimeType: "text/vtt;charset=utf-8",
        filename: `${base}.vtt`
      };
    }
    if (fmt === "txt") {
      return {
        content: formatTxt(cues, {
          includeTimestamps: meta.includeTimestamps !== false,
          title: meta.title || ""
        }),
        extension: "txt",
        mimeType: "text/plain;charset=utf-8",
        filename: `${base}.txt`
      };
    }
    if (fmt === "md" || fmt === "markdown") {
      return {
        content: formatMarkdownNotes(cues, meta),
        extension: "md",
        mimeType: "text/markdown;charset=utf-8",
        filename: `${base}-notes.md`
      };
    }
    if (fmt === "csv") {
      return {
        content: formatCsvSubtitles(cues),
        extension: "csv",
        mimeType: "text/csv;charset=utf-8",
        filename: `${base}.csv`
      };
    }
    if (fmt === "json") {
      return {
        content: formatJsonSubtitles(cues, meta),
        extension: "json",
        mimeType: "application/json;charset=utf-8",
        filename: `${base}.json`
      };
    }
    return {
      content: formatSrt(cues),
      extension: "srt",
      mimeType: "application/x-subrip;charset=utf-8",
      filename: `${base}.srt`
    };
  }
  function findActiveCue(cues, timeSec) {
    if (!Array.isArray(cues) || cues.length === 0 || !Number.isFinite(timeSec)) {
      return null;
    }
    let lo = 0;
    let hi = cues.length - 1;
    let candidateIdx = -1;
    while (lo <= hi) {
      const mid = lo + hi >>> 1;
      if (cues[mid].startSec <= timeSec) {
        candidateIdx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (candidateIdx === -1) return null;
    const cue = cues[candidateIdx];
    if (timeSec >= cue.startSec && timeSec <= cue.endSec) {
      return cue;
    }
    return null;
  }

  // src/content/player-overlay.js
  function unlockChimeForGesture() {
    try {
      unlockChimeAudio(globalThis);
    } catch {
    }
  }
  var FONT_SCALE_MAP = {
    small: "clamp(13px, 1.85cqh, 16px)",
    medium: "clamp(15px, 2.35cqh, 21px)",
    large: "clamp(18px, 2.95cqh, 26px)",
    xlarge: "clamp(21px, 3.55cqh, 32px)",
    xxlarge: "clamp(24px, 4.2cqh, 38px)"
  };
  var FONT_BASE_PX = {
    small: 17,
    medium: 21,
    large: 25,
    xlarge: 30,
    xxlarge: 35
  };
  var REFERENCE_PLAYER_HEIGHT_PX = 720;
  var CAPTION_LINGER_SEC = 0.28;
  var FONT_FAMILY_MAP = {
    sans: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Charter, "Bitstream Charter", Georgia, Cambria, "Times New Roman", serif',
    mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace',
    dyslexic: '"Trebuchet MS", Verdana, "Plus Jakarta Sans", sans-serif'
  };
  var COLOR_HEX_MAP = {
    white: "#fdfdfe",
    yellow: "#fde047",
    cyan: "#67e8f9",
    green: "#86efac",
    ink: "#111315"
  };
  var MAX_WIDTH_MAP = {
    compact: "min(86%, 560px)",
    balanced: "min(92%, 780px)",
    wide: "min(96%, 1040px)"
  };
  var OVERLAY_CSS = `
  :host {
    all: initial;
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2147483640;
    container-type: size;
    font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  :host([data-mode="audio"]) {
    position: fixed;
    inset: 0;
  }
  .toolbar {
    position: absolute;
    bottom: 10px;
    right: 104px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 2px;
    padding: 0 5px;
    border-radius: 999px;
    background: rgba(18, 20, 24, 0.78);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    pointer-events: auto;
    opacity: 0.96;
    font-variant-numeric: tabular-nums;
    transition: opacity 180ms ease, background-color 120ms ease;
  }
  /* Controls follow NotebookLM's own play bar: they fade in together with the
     native controls on hover and fade out together with them. Visibility never
     depends on whether a caption happens to be on screen, so nothing blinks. */
  .toolbar {
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease, background-color 120ms ease;
  }
  :host([data-controls-visible="true"]) .toolbar {
    opacity: 0.96;
    pointer-events: auto;
  }
  :host([data-dock="native"]) .toolbar {
    display: none;
  }
  :host([data-mode="audio"]) .toolbar {
    bottom: 14px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    height: 34px;
    gap: 4px;
    padding: 0 8px;
    background: rgba(17, 19, 21, 0.92);
    box-shadow: 0 10px 28px rgba(17, 19, 21, 0.22);
  }
  :host([data-mode="audio"]) .caption-stage {
    bottom: 56px;
  }
  :host([data-mode="audio"]) .tools-popover,
  :host([data-mode="audio"]) .style-popover,
  :host([data-mode="audio"]) .shortcuts-popover {
    bottom: 56px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }
  :host([data-mode="audio"]) .transcript-drawer {
    top: 72px;
    right: 18px;
    left: auto;
    bottom: 60px;
    transform: none;
    width: min(360px, calc(100vw - 36px));
  }
  .audio-mode-tag {
    display: none;
    align-items: center;
    gap: 5px;
    padding: 0 7px 0 4px;
    font-size: 10.5px;
    font-weight: 600;
    color: #93c5fd;
    letter-spacing: 0.01em;
  }
  :host([data-mode="audio"]) .audio-mode-tag {
    display: inline-flex;
  }
  .toolbar[data-idle="true"] {
    opacity: 0;
  }
  .toolbar:hover,
  .toolbar:focus-within {
    opacity: 1 !important;
    pointer-events: auto;
    background: rgba(18, 20, 24, 0.92);
  }
  .cc-pill {
    position: relative;
    height: 22px;
    padding: 0 7px;
    border-radius: 4px;
    border: 1.5px solid rgba(255, 255, 255, 0.72);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: #f3f4f6;
    background: transparent;
  }
  .cc-pill[data-active="true"] {
    background: rgba(255, 255, 255, 0.14);
    border-color: #ffffff;
    color: #ffffff;
    box-shadow: inset 0 -2px 0 #3b82f6;
  }
  .cc-pill[data-primary="true"] {
    border-color: #3b82f6;
    background: rgba(0, 85, 212, 0.85);
    color: #ffffff;
  }
  .bar-pill {
    height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    color: #e5e7eb;
  }
  .tools-popover {
    position: absolute;
    bottom: 50px;
    right: 14px;
    width: 288px;
    display: none;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(18, 20, 24, 0.97);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #f6f7f8;
    pointer-events: auto;
    font-size: 11px;
  }
  .tools-popover[data-open="true"] {
    display: flex;
  }
  .tools-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tools-label {
    font-size: 10px;
    font-weight: 600;
    color: #9ca3af;
  }
  .tools-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }
  .tools-row button {
    padding: 4px 7px;
    border: 1px solid #2b313c;
    background: #14171c;
    border-radius: 5px;
    font-size: 10.5px;
  }
  button {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 7px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    color: #e5e7eb;
    background: transparent;
    transition: background-color 100ms ease, color 100ms ease;
    user-select: none;
    white-space: nowrap;
  }
  button:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fdfdfe;
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
  }
  button[data-active="true"] {
    background: #0055d4;
    color: #fdfdfe;
  }
  button[data-primary="true"] {
    background: #0055d4;
    color: #fdfdfe;
  }
  button[data-primary="true"]:hover {
    background: #0044aa;
  }
  button:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .sep {
    width: 1px;
    height: 13px;
    background: rgba(255, 255, 255, 0.16);
    margin: 0 2px;
  }
  .status-pill {
    font-size: 11px;
    font-weight: 500;
    color: #d1d5db;
    padding: 2px 6px;
    white-space: nowrap;
  }
  .status-pill[data-state="working"] {
    color: #93c5fd;
  }
  .status-pill[data-state="error"] {
    color: #f87171;
  }

  /* Caption Stage & Customizable Caption Box */
  .caption-stage {
    position: absolute;
    left: 5%;
    right: 5%;
    bottom: var(--lms-caption-bottom, 56px);
    display: flex;
    justify-content: center;
    align-items: flex-end;
    pointer-events: none;
    transition: top 120ms ease, bottom 120ms ease, right 120ms ease;
  }
  .caption-stage[data-pos="raised"] {
    bottom: calc(var(--lms-caption-bottom, 56px) + 42px);
  }
  .caption-stage[data-pos="top"] {
    top: 42px;
    bottom: auto;
    align-items: flex-start;
  }
  .caption-stage[data-drawer-open="true"] {
    right: calc(min(336px, 45%) + 24px);
  }
  .caption-box {
    display: none;
    max-width: min(92%, 780px);
    padding: var(--lms-caption-pad-y, 7px) var(--lms-caption-pad-x, 15px)
      calc(var(--lms-caption-pad-y, 7px) + 1px);
    border-radius: var(--lms-caption-radius, 7px);
    background: rgba(11, 13, 16, 0.88);
    color: #fdfdfe;
    text-align: center;
    font-weight: 500;
    font-size: var(--lms-caption-font, clamp(15px, 2.35cqh, 21px));
    line-height: var(--lms-caption-leading, 1.42);
    letter-spacing: 0.005em;
    white-space: pre-line;
    border: 1px solid rgba(255, 255, 255, 0.12);
    pointer-events: auto;
    cursor: pointer;
    user-select: text;
    text-shadow: var(--lms-caption-stroke, none);
  }
  .caption-box[data-font="dyslexic"] {
    letter-spacing: 0.045em;
    word-spacing: 0.12em;
    line-height: 1.58;
  }
  .caption-box[data-style="contrast"] {
    border: 1.5px solid #3b82f6;
    font-weight: 600;
  }
  .caption-box[data-style="minimal"] {
    background: transparent !important;
    border-color: transparent !important;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.96), 0 0 11px rgba(0, 0, 0, 0.88);
    font-weight: 600;
  }
  .caption-box[data-style="cinema"] {
    border-radius: 999px;
    padding: 8px 20px 9px;
    border-color: rgba(255, 255, 255, 0.08);
  }
  .caption-box[data-style="paper"] {
    border-color: rgba(17, 19, 21, 0.18);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  }
  .caption-box[data-style="amber"] {
    border-color: rgba(251, 191, 36, 0.35);
  }
  .caption-box[data-visible="true"] {
    display: inline-block;
  }
  .caption-word-done {
    opacity: 1;
  }
  .caption-word-current {
    background: rgba(29, 92, 246, var(--lms-karaoke-alpha, 0.48));
    color: #ffffff;
    padding: 1px 5px;
    margin: 0 1px;
    border-radius: 4px;
    font-weight: 600;
  }
  .caption-box[data-style="paper"] .caption-word-current {
    background: rgba(0, 85, 212, var(--lms-karaoke-alpha, 0.16));
    color: #0055d4;
  }
  .caption-word-upcoming {
    opacity: var(--lms-upcoming-alpha, 0.64);
  }
  .caption-secondary {
    display: block;
    margin-top: 4px;
    font-size: 0.84em;
    opacity: 0.86;
  }

  /* Live Caption Style Popover */
  .style-popover {
    position: absolute;
    bottom: 50px;
    right: 14px;
    width: 288px;
    display: none;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(18, 20, 24, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #f6f7f8;
    pointer-events: auto;
    font-size: 11px;
  }
  .style-popover[data-open="true"] {
    display: flex;
  }
  .style-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .style-row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #9ca3af;
    font-size: 10.5px;
    font-weight: 600;
  }
  .style-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .style-pills button {
    padding: 4px 7px;
    border: 1px solid #2f3540;
    background: #14171c;
    font-size: 10.5px;
  }
  .style-pills button[data-active="true"] {
    background: #0055d4;
    border-color: #3b82f6;
    color: #fdfdfe;
  }
  .opacity-range {
    width: 100%;
    accent-color: #3b82f6;
    cursor: pointer;
    height: 14px;
    margin: 0;
  }

  /* Interactive Click-to-Seek Transcript, Chapters & Bookmarks Drawer */
  .transcript-drawer {
    position: absolute;
    top: 16px;
    right: 14px;
    bottom: 50px;
    width: min(336px, 45%);
    min-width: 248px;
    display: none;
    flex-direction: column;
    border-radius: 10px;
    background: rgba(18, 20, 24, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #f6f7f8;
    pointer-events: auto;
    overflow: hidden;
    font-variant-numeric: tabular-nums;
  }
  .transcript-drawer[data-open="true"] {
    display: flex;
  }
  .drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid #272b33;
  }
  .drawer-title {
    font-size: 11.5px;
    font-weight: 700;
    color: #fdfdfe;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .drawer-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 5px 10px;
    border-bottom: 1px solid #272b33;
    background: #14171c;
  }
  .drawer-search-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-bottom: 1px solid #272b33;
    background: #14171c;
  }
  .drawer-search-input {
    all: unset;
    flex: 1;
    min-width: 0;
    padding: 4px 7px;
    border-radius: 5px;
    border: 1px solid #2f3540;
    background: #0c0e12;
    color: #fdfdfe;
    font-size: 11.5px;
    line-height: 1.3;
  }
  .drawer-search-input::placeholder {
    color: #8b93a1;
  }
  .drawer-count {
    font-size: 10.5px;
    color: #9ca3af;
    white-space: nowrap;
  }
  .drawer-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
    overscroll-behavior: contain;
  }
  .cue-item {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 5px 8px 5px 10px;
    border-left: 2px solid transparent;
  }
  .cue-item:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  .cue-item[data-current="true"] {
    background: rgba(0, 85, 212, 0.22);
    border-left-color: #3b82f6;
  }
  .cue-row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    flex: 1;
    min-width: 0;
    padding: 1px 0;
    border-radius: 0;
    text-align: left;
    font-weight: 400;
    line-height: 1.4;
    white-space: normal;
  }
  .cue-row:hover {
    background: transparent;
  }
  .cue-actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    opacity: 0.72;
  }
  .cue-item:hover .cue-actions,
  .cue-actions[data-starred="true"] {
    opacity: 1;
  }
  .cue-mini-btn {
    padding: 2px 5px;
    font-size: 10px;
    border-radius: 4px;
    color: #9ca3af;
  }
  .cue-mini-btn[data-starred="true"] {
    color: #fde047;
  }
  .cue-stamp {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px;
    font-weight: 600;
    color: #93c5fd;
    padding-top: 1px;
    flex-shrink: 0;
  }
  .cue-text {
    font-size: 11.5px;
    color: #e5e7eb;
    word-break: break-word;
  }
  .cue-item[data-current="true"] .cue-text {
    color: #fdfdfe;
    font-weight: 600;
  }
  .chapter-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 0;
    text-align: left;
    white-space: normal;
  }
  .chapter-meta {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #93c5fd;
  }
  .chapter-title {
    font-size: 11.5px;
    font-weight: 600;
    color: #f3f4f6;
    line-height: 1.35;
  }
  .drawer-empty {
    padding: 16px 12px;
    font-size: 11.5px;
    color: #9ca3af;
    text-align: center;
  }

  /* Keyboard Shortcuts Cheat Sheet Popover */
  .shortcuts-popover {
    position: absolute;
    bottom: 50px;
    right: 14px;
    width: 264px;
    display: none;
    flex-direction: column;
    gap: 5px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(18, 20, 24, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #f6f7f8;
    pointer-events: auto;
    font-size: 11px;
  }
  .shortcuts-popover[data-open="true"] {
    display: flex;
  }
  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: #d1d5db;
  }
  .kbd {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 5px;
    border-radius: 4px;
    background: #1d2129;
    border: 1px solid #323846;
    color: #fdfdfe;
  }

  input[type="file"] {
    display: none;
  }
`;
  var DOCK_STYLE_ID = "lm-subs-dock-style";
  var DOCK_CSS = `
  .lms-dock-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    margin: 0 1px;
    border-radius: 50%;
    color: #f1f3f4;
    fill: currentColor;
    cursor: pointer;
    opacity: 0.92;
    font-family: "Google Sans", Roboto, "Plus Jakarta Sans", sans-serif;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    transition: background-color 120ms ease, opacity 120ms ease, color 120ms ease;
  }
  .lms-dock-btn:hover {
    background-color: rgba(255, 255, 255, 0.14);
    opacity: 1;
  }
  .lms-dock-btn:focus-visible {
    outline: 2px solid #8ab4f8;
    outline-offset: 1px;
  }
  .lms-dock-btn[data-active="true"] {
    background-color: rgba(138, 180, 248, 0.22);
    color: #8ab4f8;
  }
  .lms-dock-btn[data-disabled="true"] {
    opacity: 0.4;
    cursor: default;
  }
  .lms-dock-cc {
    width: auto;
    min-width: 30px;
    height: 24px;
    padding: 0 6px;
    margin: 0 3px;
    border-radius: 4px;
    border: 1.5px solid rgba(241, 243, 244, 0.82);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  .lms-dock-cc[data-active="true"] {
    background-color: rgba(138, 180, 248, 0.24);
    border-color: #8ab4f8;
    color: #ffffff;
  }
  .lms-dock-cc[data-primary="true"] {
    border-color: #8ab4f8;
    background-color: rgba(138, 180, 248, 0.18);
  }
`;
  function ensureDockStyle(doc) {
    if (!doc || typeof doc.getElementById !== "function") return null;
    let el = doc.getElementById(DOCK_STYLE_ID);
    if (!el) {
      const host = doc.head || doc.documentElement;
      if (!host || typeof host.appendChild !== "function") return null;
      el = doc.createElement("style");
      el.id = DOCK_STYLE_ID;
      el.textContent = DOCK_CSS;
      host.appendChild(el);
    }
    return el;
  }
  function findNativeControlBar(video, doc) {
    if (!video || typeof video.closest !== "function") return null;
    const labelRe = /(play|pause|resume|rewind|forward|mute|unmute|full ?screen|subtitle|caption|closed caption|pip|picture)/i;
    const safeRect = (el) => {
      try {
        return el?.getBoundingClientRect?.() || null;
      } catch {
        return null;
      }
    };
    const videoRect = safeRect(video);
    const videoHeight = Number(videoRect?.height) || 0;
    const score = (node, depth2) => {
      if (!node || node === video) return null;
      let buttons = [];
      try {
        buttons = [...node.querySelectorAll?.("button, [role=button]") || []];
      } catch {
        buttons = [];
      }
      if (buttons.length < 2 || buttons.length > 26) return null;
      let hits = 0;
      for (const b of buttons) {
        const label = `${b.getAttribute?.("aria-label") || ""} ${b.getAttribute?.("title") || ""} ${b.getAttribute?.("data-tooltip") || ""}`;
        if (labelRe.test(label)) hits += 1;
      }
      if (hits < 2) return null;
      const rect = safeRect(node);
      const height = Number(rect?.height) || 0;
      let bottomAligned = false;
      if (rect && videoHeight > 0) {
        const delta = Math.abs(rect.bottom - videoRect.bottom);
        bottomAligned = delta <= Math.max(10, videoHeight * 0.08);
      }
      return { node, hits, buttonCount: buttons.length, height, bottomAligned, depth: depth2 };
    };
    const candidates = [];
    let ancestor = video.parentElement;
    let depth = 0;
    while (ancestor && depth < 8) {
      const own = score(ancestor, depth);
      if (own) candidates.push(own);
      let kids = [];
      try {
        kids = [...ancestor.children || []];
      } catch {
        kids = [];
      }
      for (const kid of kids) {
        if (kid === video || kid.contains?.(video)) continue;
        const kidScore = score(kid, depth + 1);
        if (kidScore) candidates.push(kidScore);
      }
      ancestor = ancestor.parentElement;
      depth += 1;
    }
    if (candidates.length === 0) return null;
    const compact = candidates.filter((c) => c.bottomAligned && c.height > 0 && c.height <= 120).sort((a, b) => a.buttonCount - b.buttonCount || a.depth - b.depth);
    if (compact.length > 0) return compact[0].node;
    const smallest = [...candidates].sort(
      (a, b) => a.buttonCount - b.buttonCount || a.depth - b.depth
    )[0];
    return smallest ? smallest.node : candidates[0].node;
  }
  function formatBriefStamp(sec) {
    const full = formatTimestamp(sec, ".");
    return sec >= 3600 ? full.slice(0, 8) : full.slice(3, 8);
  }
  function hexToRgba(hex, alpha) {
    const clean = String(hex || "#0b0d10").replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16) || 11;
    const g = parseInt(clean.slice(2, 4), 16) || 13;
    const b = parseInt(clean.slice(4, 6), 16) || 16;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(2)})`;
  }
  function triggerTextDownload(doc, content, filename, mimeType, mountContainer = null) {
    const blob = new Blob(["\uFEFF", content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    a.addEventListener("click", (ev) => {
      ev.stopPropagation();
    });
    const container = mountContainer || doc.fullscreenElement || doc.body || doc.documentElement;
    container?.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4e3);
  }
  function flashButtonLabel(btn, tempLabel, durationMs = 1200) {
    if (!btn) return;
    const original = btn.dataset.origLabel || btn.textContent;
    btn.dataset.origLabel = original;
    btn.textContent = tempLabel;
    btn.dataset.active = "true";
    setTimeout(() => {
      btn.textContent = original;
      btn.dataset.active = "false";
    }, durationMs);
  }
  var VideoSubtitleController = class {
    constructor(video, {
      doc = globalThis.document,
      mediaKind = null,
      initialFontSize = "medium",
      initialCaptionStyle = "classic",
      initialFontFamily = "sans",
      initialCaptionColor = "white",
      initialBgOpacity = 88,
      initialCaptionPosition = "bottom",
      initialCaptionMaxWidth = "balanced",
      initialKaraokeHighlight = true,
      initialKaraokeDelayMs = 0,
      initialShowSpeakerLabels = true,
      initialPauseOnCaptionHover = false,
      initialClickCaptionToCopy = true,
      initialPlaybackSpeed = 1,
      initialOffsetSec = 0,
      initialFineGrainedControls = false,
      initialDynamicCaptionScaling = true,
      initialCaptionScaleFactor = 100,
      initialCaptionMinFontPx = 11,
      initialCaptionMaxFontPx = 40,
      initialCaptionPaddingY = 7,
      initialCaptionPaddingX = 15,
      initialCaptionBorderRadius = 7,
      initialCaptionLineHeight = 142,
      initialCaptionBottomOffsetPx = 54,
      initialCaptionTextStrokePx = 0,
      initialKaraokeHighlightOpacity = 48,
      initialUpcomingWordOpacity = 64,
      initialPlayBarDockMode = "native",
      initialHoverFadeDelayMs = 2200,
      initialKeepSubtitlesInPiP = true,
      initialSkipSilenceEnabled = false,
      initialSkipSilenceGapSec = 1.6,
      initialSkipSilenceRate = 2.2,
      initialAudioBoostPercent = 100,
      onRequestGenerate = () => {
      },
      onOffsetChange = () => {
      },
      onFontSizeChange = () => {
      },
      onCaptionStyleChange = () => {
      },
      onStylePatchChange = () => {
      },
      onCuesMutated = () => {
      },
      onCiteCue = null,
      onImportSubtitles = () => {
      },
      onTelemetry = () => {
      }
    } = {}) {
      this.video = video;
      this.doc = doc;
      this.mediaKind = mediaKind === "audio" || String(video?.tagName || "").toUpperCase() === "AUDIO" ? "audio" : "video";
      this.cues = [];
      this.title = this.mediaKind === "audio" ? "NotebookLM Audio Overview" : "NotebookLM Video Overview";
      this.ccEnabled = true;
      this.fontSize = CAPTION_FONT_SIZES.includes(initialFontSize) ? initialFontSize : "medium";
      this.captionStyle = CAPTION_STYLES.includes(initialCaptionStyle) ? initialCaptionStyle : "classic";
      this.captionFontFamily = CAPTION_FONT_FAMILIES.includes(initialFontFamily) ? initialFontFamily : "sans";
      this.captionColor = CAPTION_COLORS.includes(initialCaptionColor) ? initialCaptionColor : "white";
      this.captionBgOpacity = Number.isFinite(Number(initialBgOpacity)) ? Math.max(0, Math.min(100, Number(initialBgOpacity))) : 88;
      this.captionPosition = CAPTION_POSITIONS.includes(initialCaptionPosition) ? initialCaptionPosition : "bottom";
      this.captionMaxWidth = CAPTION_WIDTHS.includes(initialCaptionMaxWidth) ? initialCaptionMaxWidth : "balanced";
      this.karaokeHighlight = Boolean(initialKaraokeHighlight);
      this.karaokeDelayMs = Number.isFinite(Number(initialKaraokeDelayMs)) ? Math.max(-1500, Math.min(3e3, Math.round(Number(initialKaraokeDelayMs)))) : 0;
      this.showSpeakerLabels = initialShowSpeakerLabels !== false;
      this.pauseOnCaptionHover = Boolean(initialPauseOnCaptionHover);
      this.clickCaptionToCopy = initialClickCaptionToCopy !== false;
      this.playbackSpeed = PLAYBACK_SPEEDS.includes(Number(initialPlaybackSpeed)) ? Number(initialPlaybackSpeed) : 1;
      this.fineGrainedControls = Boolean(initialFineGrainedControls);
      this.dynamicCaptionScaling = initialDynamicCaptionScaling !== false;
      this.captionScaleFactor = this._clamp(
        initialCaptionScaleFactor,
        50,
        200,
        100
      );
      this.captionMinFontPx = this._clamp(initialCaptionMinFontPx, 8, 18, 11);
      this.captionMaxFontPx = this._clamp(initialCaptionMaxFontPx, 20, 64, 40);
      this.captionPaddingY = this._clamp(initialCaptionPaddingY, 2, 20, 7);
      this.captionPaddingX = this._clamp(initialCaptionPaddingX, 6, 40, 15);
      this.captionBorderRadius = this._clamp(initialCaptionBorderRadius, 0, 32, 7);
      this.captionLineHeight = this._clamp(initialCaptionLineHeight, 115, 185, 142);
      this.captionBottomOffsetPx = this._clamp(
        initialCaptionBottomOffsetPx,
        24,
        180,
        54
      );
      this.captionTextStrokePx = this._clamp(initialCaptionTextStrokePx, 0, 3, 0);
      this.karaokeHighlightOpacity = this._clamp(
        initialKaraokeHighlightOpacity,
        15,
        95,
        48
      );
      this.upcomingWordOpacity = this._clamp(
        initialUpcomingWordOpacity,
        25,
        100,
        64
      );
      this.playBarDockMode = ["native", "hover", "always"].includes(
        initialPlayBarDockMode
      ) ? initialPlayBarDockMode : "native";
      this.hoverFadeDelayMs = this._clamp(initialHoverFadeDelayMs, 400, 6e3, 2200);
      this.keepSubtitlesInPiP = initialKeepSubtitlesInPiP !== false;
      this.skipSilenceEnabled = Boolean(initialSkipSilenceEnabled);
      this.skipSilenceGapSec = this._clamp(initialSkipSilenceGapSec, 0.6, 5, 1.6);
      this.skipSilenceRate = this._clamp(initialSkipSilenceRate, 1.4, 3, 2.2);
      this.audioBoostPercent = this._clamp(initialAudioBoostPercent, 100, 250, 100);
      this.offsetSec = Number.isFinite(initialOffsetSec) ? initialOffsetSec : 0;
      this.statusState = "idle";
      this.statusLabel = "";
      this.nativeTrack = null;
      this.inPiP = false;
      this.idleTimer = null;
      this.syncTimer = null;
      this.pointerOverPlayer = false;
      this.nativeControlsVisible = true;
      this.controlsVisible = true;
      this.nativeControlBar = null;
      this.dockButtons = {};
      this.dockObserver = null;
      this.dockPollTimer = null;
      this.sizeObserver = null;
      this.watchAccumulatorSec = 0;
      this.lastWatchTickMs = 0;
      this.boostCtx = null;
      this.boostSource = null;
      this.pipWindow = null;
      this.pipCaptionEl = null;
      this.drawerOpen = false;
      this.drawerTab = "lines";
      this.drawerAutoScroll = true;
      this.drawerQuery = "";
      this.styleOpen = false;
      this.shortcutsOpen = false;
      this.toolsOpen = false;
      this.loopCueIndex = -1;
      this.activeCueIndex = -1;
      this.lastRenderedSignature = "";
      this.pausedByHover = false;
      this.cueRowElements = [];
      this.stylePillButtons = {};
      this.onRequestGenerate = onRequestGenerate;
      this.onOffsetChange = onOffsetChange;
      this.onFontSizeChange = onFontSizeChange;
      this.onCaptionStyleChange = onCaptionStyleChange;
      this.onStylePatchChange = onStylePatchChange;
      this.onCuesMutated = onCuesMutated;
      this.onCiteCue = onCiteCue;
      this.onImportSubtitles = onImportSubtitles;
      this.onTelemetry = onTelemetry;
      this._mount();
      this._bindEvents();
      this._applyPlaybackSpeed(this.playbackSpeed, false);
      this._mountNativeDock();
      this._startControlVisibilitySync();
      this._applyCaptionMetrics();
    }
    _clamp(value, min, max, fallback) {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, n));
    }
    _emitTelemetry(patch = {}) {
      try {
        this.onTelemetry(patch);
      } catch {
      }
    }
    /**
     * Mirrors Google NotebookLM's own play bar: we read the host page's control
     * bar opacity/visibility and match it, so caption controls appear and
     * disappear exactly with the native controls instead of blinking on their own.
     */
    _startControlVisibilitySync() {
      const bar = this.nativeControlBar;
      if (!bar || typeof MutationObserver === "undefined") {
        this.nativeControlsVisible = true;
        this._updateControlsVisibility();
        return;
      }
      const readNative = () => {
        let visible = true;
        try {
          const cs = globalThis.getComputedStyle?.(bar);
          if (cs) {
            const opacity = Number(cs.opacity);
            if (Number.isFinite(opacity) && opacity < 0.12) visible = false;
            if (cs.visibility === "hidden" || cs.visibility === "collapse") {
              visible = false;
            }
            if (cs.display === "none") visible = false;
          }
          if (bar.hasAttribute?.("aria-hidden") && bar.getAttribute("aria-hidden") === "true") {
            visible = false;
          }
        } catch {
          visible = true;
        }
        if (visible !== this.nativeControlsVisible) {
          this.nativeControlsVisible = visible;
          this._updateControlsVisibility();
        }
      };
      try {
        this.dockObserver = new MutationObserver(readNative);
        this.dockObserver.observe(bar, {
          attributes: true,
          attributeFilter: ["class", "style", "aria-hidden", "hidden"],
          subtree: false
        });
      } catch {
        this.dockObserver = null;
      }
      readNative();
      this.dockPollTimer = setInterval(readNative, 420);
    }
    _updateControlsVisibility() {
      const anyPopoverOpen = this.drawerOpen || this.styleOpen || this.shortcutsOpen || this.toolsOpen;
      let visible = true;
      if (this.playBarDockMode === "always" || this.mediaKind === "audio") {
        visible = true;
      } else if (anyPopoverOpen || this.statusState === "working") {
        visible = true;
      } else if (this.pointerOverPlayer || this.video?.paused) {
        visible = true;
      } else if (this.playBarDockMode === "native") {
        visible = this.nativeControlsVisible;
      } else {
        visible = this.nativeControlsVisible;
      }
      if (visible === this.controlsVisible && this.host?.dataset) {
        this.host.dataset.controlsVisible = visible ? "true" : "false";
        return;
      }
      this.controlsVisible = visible;
      if (this.host?.dataset) {
        this.host.dataset.controlsVisible = visible ? "true" : "false";
      }
      for (const btn of Object.values(this.dockButtons)) {
        if (!btn) continue;
        btn.style.opacity = visible ? "" : "0";
        btn.style.pointerEvents = visible ? "" : "none";
      }
    }
    _resolveMountParent() {
      if (this.mediaKind === "audio") {
        return this.doc?.body || this.doc?.documentElement || this.video?.parentElement || null;
      }
      if (this.video?.parentElement) {
        return this.video.parentElement;
      }
      const root = this.video?.getRootNode?.();
      if (root && root !== this.doc && typeof root.appendChild === "function") {
        return root;
      }
      return null;
    }
    _ensureMounted() {
      const parent = this._resolveMountParent();
      if (!parent) return false;
      if (!this.host) {
        this._mount();
        return Boolean(this.host);
      }
      if (this.host.parentElement !== parent && parent !== this.host.getRootNode?.()) {
        try {
          if (parent.style) {
            const computedPos = globalThis.getComputedStyle?.(parent)?.position;
            if (!computedPos || computedPos === "static") {
              parent.style.position = "relative";
            }
          }
          parent.appendChild(this.host);
        } catch {
        }
      }
      return true;
    }
    _svgIcon(size, nodes = []) {
      const NS = "http://www.w3.org/2000/svg";
      const svg = this.doc.createElementNS(NS, "svg");
      svg.setAttribute("width", String(size || 20));
      svg.setAttribute("height", String(size || 20));
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("focusable", "false");
      svg.setAttribute("aria-hidden", "true");
      for (const node of nodes) {
        let el = null;
        if (node.t === "path") {
          el = this.doc.createElementNS(NS, "path");
          el.setAttribute("d", node.d);
          if (node.stroke) {
            el.setAttribute("fill", "none");
            el.setAttribute("stroke", "currentColor");
            el.setAttribute("stroke-width", String(node.sw || 1.7));
            el.setAttribute("stroke-linecap", "round");
            el.setAttribute("stroke-linejoin", "round");
          } else {
            el.setAttribute("fill", "currentColor");
          }
        } else if (node.t === "rect") {
          el = this.doc.createElementNS(NS, "rect");
          el.setAttribute("x", String(node.x));
          el.setAttribute("y", String(node.y));
          el.setAttribute("width", String(node.w));
          el.setAttribute("height", String(node.h));
          el.setAttribute("rx", String(node.rx || 0));
          if (node.stroke) {
            el.setAttribute("fill", "none");
            el.setAttribute("stroke", "currentColor");
            el.setAttribute("stroke-width", String(node.sw || 1.7));
          } else {
            el.setAttribute("fill", "currentColor");
          }
        } else if (node.t === "circle") {
          el = this.doc.createElementNS(NS, "circle");
          el.setAttribute("cx", String(node.cx));
          el.setAttribute("cy", String(node.cy));
          el.setAttribute("r", String(node.r));
          el.setAttribute("fill", node.stroke ? "none" : "currentColor");
          if (node.stroke) {
            el.setAttribute("stroke", "currentColor");
            el.setAttribute("stroke-width", String(node.sw || 1.7));
          }
        }
        if (el) svg.appendChild(el);
      }
      return svg;
    }
    _teardownNativeDock() {
      try {
        this.dockObserver?.disconnect?.();
      } catch {
      }
      this.dockObserver = null;
      if (this.dockPollTimer) {
        clearInterval(this.dockPollTimer);
        this.dockPollTimer = null;
      }
      for (const btn of Object.values(this.dockButtons)) {
        try {
          btn?.remove?.();
        } catch {
        }
      }
      this.dockButtons = {};
      this.nativeControlBar = null;
    }
    /**
     * Injects LM Subs caption controls directly into Google NotebookLM's own
     * bottom play bar so they look and behave like native player buttons.
     */
    _mountNativeDock() {
      this._teardownNativeDock();
      this.host?.setAttribute?.("data-dock", this.playBarDockMode);
      if (this.mediaKind === "audio" || this.playBarDockMode !== "native") {
        return false;
      }
      if (!this.doc || typeof this.doc.createElement !== "function") return false;
      const bar = findNativeControlBar(this.video, this.doc);
      if (!bar) {
        this.host?.setAttribute?.("data-dock", "hover");
        return false;
      }
      ensureDockStyle(this.doc);
      this.nativeControlBar = bar;
      const makeDockButton = (key, label, iconNodes, onClick, { cc = false } = {}) => {
        const btn = this.doc.createElement("button");
        btn.type = "button";
        btn.className = cc ? "lms-dock-btn lms-dock-cc" : "lms-dock-btn";
        btn.setAttribute("aria-label", label);
        btn.title = label;
        if (cc) {
          btn.textContent = "CC";
        } else if (iconNodes === null) {
          btn.textContent = label;
        } else {
          btn.appendChild(this._svgIcon(20, iconNodes));
        }
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          unlockChimeForGesture();
          onClick();
        });
        this.dockButtons[key] = btn;
        return btn;
      };
      const ccBtn = makeDockButton(
        "cc",
        "Toggle LM Subs captions (C)",
        null,
        () => {
          if (this.cues.length === 0 && this.statusState !== "working") {
            this.onRequestGenerate({ force: true });
            return;
          }
          this.toggleSubtitles();
        },
        { cc: true }
      );
      const optionsBtn = makeDockButton(
        "options",
        "LM Subs caption options (O)",
        [
          {
            t: "path",
            d: "M4 6h10v2H4V6zm0 5h6v2H4v-2zm0 5h10v2H4v-2zm13.5-9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"
          }
        ],
        () => this.toggleToolsPopover()
      );
      const built = [ccBtn, optionsBtn];
      if (this.fineGrainedControls) {
        built.push(
          makeDockButton(
            "speed",
            "Playback speed",
            null,
            () => this.cyclePlaybackSpeed()
          ),
          makeDockButton(
            "loop",
            "Loop active caption sentence (L)",
            [
              {
                t: "path",
                d: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
              }
            ],
            () => this.toggleCueLoop()
          ),
          makeDockButton(
            "pip",
            "Picture-in-Picture with captions (P)",
            [
              { t: "rect", x: 3, y: 5, w: 18, h: 14, rx: 2, stroke: true },
              { t: "rect", x: 12, y: 12, w: 7, h: 5, rx: 1 }
            ],
            () => this.togglePictureInPicture()
          ),
          makeDockButton(
            "snapshot",
            "Save frame with the caption burned in (X)",
            [
              {
                t: "path",
                d: "M9 3h6l1.5 2H20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3.5L9 3zm3 5.2A4.3 4.3 0 1 0 12 17.8 4.3 4.3 0 0 0 12 8.2zm0 2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z"
              }
            ],
            () => this.captureSnapshot()
          ),
          makeDockButton("boost", "Volume boost", [
            {
              t: "path",
              d: "M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"
            }
          ], () => this.cycleAudioBoost()),
          makeDockButton(
            "silence",
            "Skip silence",
            [
              {
                t: "path",
                d: "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"
              }
            ],
            () => this.toggleSkipSilence()
          )
        );
      }
      let anchor = null;
      try {
        const kids = [...bar.children || []];
        for (const child of kids) {
          const label = `${child?.getAttribute?.("aria-label") || ""} ${child?.getAttribute?.("title") || ""}`;
          if (/full ?screen|theater|pip|picture/i.test(label)) {
            anchor = child;
            break;
          }
        }
      } catch {
        anchor = null;
      }
      for (const btn of built) {
        try {
          if (anchor && btn.insertBefore) {
            bar.insertBefore(btn, anchor);
          } else {
            bar.appendChild(btn);
          }
        } catch {
          try {
            bar.appendChild(btn);
          } catch {
          }
        }
      }
      this.host?.setAttribute?.("data-dock", "native");
      this._renderDockButtons();
      this._startControlVisibilitySync();
      return true;
    }
    _renderDockButtons() {
      const hasCues = this.cues.length > 0;
      const isWorking = this.statusState === "working";
      const cc = this.dockButtons.cc;
      if (cc) {
        cc.dataset.active = hasCues && this.ccEnabled ? "true" : "false";
        cc.dataset.primary = !hasCues && !isWorking ? "true" : "false";
        cc.dataset.disabled = isWorking ? "true" : "false";
        cc.title = hasCues ? this.ccEnabled ? "Hide LM Subs captions (C)" : "Show LM Subs captions (C)" : "Generate LM Subs captions";
      }
      const options = this.dockButtons.options;
      if (options) {
        options.dataset.active = this.toolsOpen ? "true" : "false";
      }
      const speed = this.dockButtons.speed;
      if (speed) {
        speed.textContent = `${this.playbackSpeed}x`;
        speed.dataset.active = this.playbackSpeed !== 1 ? "true" : "false";
        speed.title = `Playback speed: ${this.playbackSpeed}x (< / >)`;
      }
      const loop = this.dockButtons.loop;
      if (loop) {
        loop.dataset.active = this.loopCueIndex >= 0 ? "true" : "false";
      }
      const pip = this.dockButtons.pip;
      if (pip) {
        pip.dataset.active = this.inPiP ? "true" : "false";
      }
      const boost = this.dockButtons.boost;
      if (boost) {
        boost.dataset.active = this.audioBoostPercent > 100 ? "true" : "false";
        boost.title = `Volume boost: ${this.audioBoostPercent}%`;
      }
      const silence = this.dockButtons.silence;
      if (silence) {
        silence.dataset.active = this.skipSilenceEnabled ? "true" : "false";
        silence.title = this.skipSilenceEnabled ? `Skip silence on (${this.skipSilenceGapSec}s gaps)` : "Skip silence off";
      }
    }
    _closePopoversExcept(keepName) {
      if (keepName !== "drawer" && this.drawerOpen) {
        this.drawerOpen = false;
        if (this.drawerEl) this.drawerEl.dataset.open = "false";
        if (this.stageEl) this.stageEl.dataset.drawerOpen = "false";
        if (this.transcriptBtn) this.transcriptBtn.dataset.active = "false";
      }
      if (keepName !== "style" && this.styleOpen) {
        this.styleOpen = false;
        if (this.stylePopoverEl) this.stylePopoverEl.dataset.open = "false";
        if (this.stylerBtn) this.stylerBtn.dataset.active = "false";
      }
      if (keepName !== "shortcuts" && this.shortcutsOpen) {
        this.shortcutsOpen = false;
        if (this.shortcutsEl) this.shortcutsEl.dataset.open = "false";
        if (this.shortcutsBtn) this.shortcutsBtn.dataset.active = "false";
      }
      if (keepName !== "tools" && this.toolsOpen) {
        this.toolsOpen = false;
        if (this.toolsPopoverEl) this.toolsPopoverEl.dataset.open = "false";
        if (this.moreBtn) this.moreBtn.dataset.active = "false";
      }
    }
    toggleToolsPopover(forceState) {
      this._ensureMounted();
      const next = typeof forceState === "boolean" ? forceState : !this.toolsOpen;
      if (next) this._closePopoversExcept("tools");
      this.toolsOpen = next;
      if (this.toolsPopoverEl) {
        this.toolsPopoverEl.dataset.open = next ? "true" : "false";
      }
      if (this.moreBtn) {
        this.moreBtn.dataset.active = next ? "true" : "false";
      }
      return this.toolsOpen;
    }
    _mount() {
      const parent = this._resolveMountParent();
      if (!parent) return;
      if (parent.style && this.mediaKind !== "audio") {
        const computedPos = globalThis.getComputedStyle?.(parent)?.position;
        if (!computedPos || computedPos === "static") {
          parent.style.position = "relative";
        }
      }
      const hostClass = this.mediaKind === "audio" ? `${DOM_SELECTORS.OVERLAY_HOST_CLASS}-audio` : DOM_SELECTORS.OVERLAY_HOST_CLASS;
      const old = parent.querySelector?.(`.${hostClass}`);
      if (old) old.remove();
      this.host = this.doc.createElement("div");
      this.host.className = hostClass;
      if (this.host.dataset) {
        this.host.dataset.mode = this.mediaKind;
      }
      this.host.setAttribute?.("data-mode", this.mediaKind);
      this.host.setAttribute?.("data-dock", this.playBarDockMode);
      if (this.host.dataset) {
        this.host.dataset.controlsVisible = "true";
      }
      const shadow = this.host.attachShadow({ mode: "closed" });
      this.shadow = shadow;
      const style = this.doc.createElement("style");
      style.textContent = OVERLAY_CSS;
      this.toolbar = this.doc.createElement("div");
      this.toolbar.className = "toolbar";
      this.ccBtn = this.doc.createElement("button");
      this.ccBtn.type = "button";
      this.ccBtn.className = "cc-pill";
      this.ccBtn.title = "Toggle closed captions (C)";
      this.ccBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.cues.length === 0 && this.statusState !== "working") {
          this.onRequestGenerate({ force: true });
          return;
        }
        this.toggleSubtitles();
      });
      this.statusEl = this.doc.createElement("span");
      this.statusEl.className = "status-pill";
      this.controlsGroup = this.doc.createElement("span");
      this.controlsGroup.style.display = "inline-flex";
      this.controlsGroup.style.alignItems = "center";
      this.controlsGroup.style.gap = "3px";
      const sep0 = this.doc.createElement("span");
      sep0.className = "sep";
      this.transcriptBtn = this._makeBtn(
        "Transcript",
        "Toggle transcript, smart chapters, and saved bookmarks (T)",
        () => this.toggleTranscriptDrawer()
      );
      this.loopBtn = this._makeBtn(
        "Loop",
        "Repeat active caption sentence continuously (L)",
        () => this.toggleCueLoop()
      );
      this.speedBtn = this._makeBtn(
        "1x",
        "Cycle video playback speed (< / >)",
        () => this.cyclePlaybackSpeed()
      );
      this.pipBtn = this._makeBtn(
        "PiP",
        "Toggle Picture-in-Picture window with live captions (P)",
        () => this.togglePictureInPicture()
      );
      const sep1 = this.doc.createElement("span");
      sep1.className = "sep";
      this.sizeDownBtn = this._makeBtn(
        "A-",
        "Smaller captions (-)",
        () => this._stepFontSize(-1)
      );
      this.sizeUpBtn = this._makeBtn(
        "A+",
        "Larger captions (+)",
        () => this._stepFontSize(1)
      );
      this.styleBtn = this._makeBtn(
        "Box",
        "Cycle caption backdrop (B)",
        () => this.cycleCaptionStyle()
      );
      this.stylerBtn = this._makeBtn(
        "Style",
        "Customize caption font, color, position, opacity, and word highlight (S)",
        () => this.toggleStylePopover()
      );
      const sep2 = this.doc.createElement("span");
      sep2.className = "sep";
      this.offsetMinusBtn = this._makeBtn(
        "-0.25s",
        "Shift subtitles earlier ([)",
        () => this._adjustOffset(-0.25)
      );
      this.offsetLabelBtn = this._makeBtn(
        "0.0s",
        "Reset timing offset (\\)",
        () => this._resetOffset()
      );
      this.offsetPlusBtn = this._makeBtn(
        "+0.25s",
        "Shift subtitles later (])",
        () => this._adjustOffset(0.25)
      );
      const sep3 = this.doc.createElement("span");
      sep3.className = "sep";
      this.srtBtn = this._makeBtn(".SRT", "Export SubRip (.srt)", () => {
        if (this.cues.length === 0) return;
        this.exportSubtitles("srt");
        flashButtonLabel(this.srtBtn, "Saved");
      });
      this.vttBtn = this._makeBtn(".VTT", "Export WebVTT (.vtt)", () => {
        if (this.cues.length === 0) return;
        this.exportSubtitles("vtt");
        flashButtonLabel(this.vttBtn, "Saved");
      });
      this.txtBtn = this._makeBtn(".TXT", "Export timestamped transcript (.txt)", () => {
        if (this.cues.length === 0) return;
        this.exportSubtitles("txt");
        flashButtonLabel(this.txtBtn, "Saved");
      });
      this.mdBtn = this._makeBtn(".MD", "Export Markdown study notes (.md)", () => {
        if (this.cues.length === 0) return;
        this.exportSubtitles("md");
        flashButtonLabel(this.mdBtn, "Saved");
      });
      this.csvBtn = this._makeBtn(".CSV", "Export CSV spreadsheet / Anki deck (.csv)", () => {
        if (this.cues.length === 0) return;
        this.exportSubtitles("csv");
        flashButtonLabel(this.csvBtn, "Saved");
      });
      this.copyBtn = this._makeBtn("Copy", "Copy transcript to clipboard", async () => {
        if (this.cues.length === 0) return;
        const text = formatTxt(this._shiftedCues(), {
          includeTimestamps: true,
          title: this.title
        });
        try {
          await globalThis.navigator?.clipboard?.writeText(text);
          flashButtonLabel(this.copyBtn, "Copied");
        } catch {
          this.exportSubtitles("txt");
          flashButtonLabel(this.copyBtn, "Saved");
        }
      });
      this.shortcutsBtn = this._makeBtn(
        "?",
        "Keyboard shortcuts (?)",
        () => this.toggleShortcutsHelp()
      );
      this.fileInput = this.doc.createElement("input");
      this.fileInput.type = "file";
      this.fileInput.accept = ".srt,.vtt,.json,text/vtt,text/plain,application/json";
      this.fileInput.addEventListener("change", async () => {
        const file = this.fileInput.files?.[0];
        if (!file) return;
        const raw = await file.text();
        const parsed = parseSubtitleText(raw);
        if (parsed.length > 0) {
          this.setCues(parsed, { title: this.title || file.name });
          this.onImportSubtitles(parsed, file.name);
        }
        this.fileInput.value = "";
      });
      this.importBtn = this._makeBtn("Import", "Load external .srt, .vtt, or .json file", () => {
        this.fileInput.click();
      });
      this.regenBtn = this._makeBtn("Retry", "Regenerate subtitles with AI", () => {
        this.onRequestGenerate({ force: true });
      });
      this.transcriptBtn.className = "bar-pill";
      this.moreBtn = this._makeBtn(
        "Options",
        "Subtitle style, timing, playback, and export options",
        () => this.toggleToolsPopover()
      );
      this.moreBtn.className = "bar-pill";
      this.snapshotBtn = this._makeBtn(
        "Shot",
        "Save the current frame with the caption burned in (X)",
        () => this.captureSnapshot()
      );
      this.boostBtn = this._makeBtn(
        "Vol",
        "Cycle volume boost for quiet NotebookLM narration",
        () => this.cycleAudioBoost()
      );
      this.silenceBtn = this._makeBtn(
        "Silence",
        "Skip silent gaps between spoken sentences (Z)",
        () => this.toggleSkipSilence()
      );
      this.fullscreenBtn = this._makeBtn(
        "Full",
        "Toggle fullscreen playback with captions (F)",
        () => this.toggleFullscreen()
      );
      this.back10Btn = this._makeBtn(
        "-10s",
        "Rewind 10 seconds (,)",
        () => this.seekBySeconds(-10)
      );
      this.fwd10Btn = this._makeBtn(
        "+10s",
        "Forward 10 seconds (.)",
        () => this.seekBySeconds(10)
      );
      this.toolsPopoverEl = this.doc.createElement("div");
      this.toolsPopoverEl.className = "tools-popover";
      this.toolsPopoverEl.dataset.open = "false";
      const makeToolsSection = (labelText, ...buttons) => {
        const sec = this.doc.createElement("div");
        sec.className = "tools-section";
        const lbl = this.doc.createElement("div");
        lbl.className = "tools-label";
        lbl.textContent = labelText;
        const row = this.doc.createElement("div");
        row.className = "tools-row";
        row.append(...buttons);
        sec.append(lbl, row);
        return sec;
      };
      this.controlsGroup.style.display = "flex";
      this.controlsGroup.style.flexDirection = "column";
      this.controlsGroup.style.gap = "8px";
      this.controlsGroup.append(
        makeToolsSection(
          "Appearance and studio",
          this.sizeDownBtn,
          this.sizeUpBtn,
          this.styleBtn,
          this.stylerBtn
        ),
        makeToolsSection(
          "Playback and timing",
          this.loopBtn,
          this.speedBtn,
          this.pipBtn,
          this.offsetMinusBtn,
          this.offsetLabelBtn,
          this.offsetPlusBtn
        ),
        makeToolsSection(
          "Export transcript",
          this.srtBtn,
          this.vttBtn,
          this.txtBtn,
          this.mdBtn,
          this.csvBtn,
          this.copyBtn
        )
      );
      const utilitySection = makeToolsSection(
        "Source and shortcuts",
        this.importBtn,
        this.regenBtn,
        this.shortcutsBtn
      );
      this.fineSection = makeToolsSection(
        "Fine-grained playback",
        this.snapshotBtn,
        this.boostBtn,
        this.silenceBtn,
        this.fullscreenBtn,
        this.back10Btn,
        this.fwd10Btn
      );
      this.fineSection.dataset.fine = "true";
      this.fineSection.style.display = this.fineGrainedControls ? "flex" : "none";
      this.toolsPopoverEl.append(
        this.controlsGroup,
        utilitySection,
        this.fineSection
      );
      if (this.mediaKind === "audio" && this.pipBtn) {
        this.pipBtn.style.display = "none";
      }
      if (this.mediaKind === "audio") {
        this.audioTagEl = this.doc.createElement("span");
        this.audioTagEl.className = "audio-mode-tag";
        this.audioTagEl.textContent = "Podcast";
        this.toolbar.append(
          this.audioTagEl,
          this.ccBtn,
          this.statusEl,
          this.transcriptBtn,
          this.moreBtn,
          this.fileInput
        );
      } else {
        this.toolbar.append(
          this.ccBtn,
          this.statusEl,
          this.transcriptBtn,
          this.moreBtn,
          this.fileInput
        );
      }
      this._mountStylePopover();
      this._mountTranscriptDrawer();
      this.shortcutsEl = this.doc.createElement("div");
      this.shortcutsEl.className = "shortcuts-popover";
      this.shortcutsEl.dataset.open = "false";
      const shortcutPairs = [
        ["Toggle captions", "C"],
        ["Transcript & chapters", "T"],
        ["Caption style studio", "S"],
        ["Prev / next cue", "J / K"],
        ["Loop active sentence", "L"],
        ["Bookmark active cue", "M"],
        ["Playback speed", "< / >"],
        ["Picture-in-Picture", "P"],
        ["Caption size", "- / +"],
        ["Cycle backdrop", "B"],
        ["Timing -0.25s / +0.25s", "[ / ]"],
        ["Word delay -50 / +50ms", "{ / }"],
        ["Reset timing", "\\"],
        ["Rewind / forward 10s", ", / ."],
        ["Fullscreen", "F"],
        ["Frame snapshot with caption", "X"],
        ["Skip silence", "Z"]
      ];
      for (const [desc, keyLabel] of shortcutPairs) {
        const row = this.doc.createElement("div");
        row.className = "shortcut-item";
        const d = this.doc.createElement("span");
        d.textContent = desc;
        const k = this.doc.createElement("span");
        k.className = "kbd";
        k.textContent = keyLabel;
        row.append(d, k);
        this.shortcutsEl.appendChild(row);
      }
      this.stageEl = this.doc.createElement("div");
      this.stageEl.className = "caption-stage";
      this.captionBox = this.doc.createElement("div");
      this.captionBox.className = "caption-box";
      this.captionBox.title = "Click to copy spoken line";
      this.captionBox.addEventListener("click", async (e) => {
        if (!this.clickCaptionToCopy) return;
        e.stopPropagation();
        const active = this._getActiveCueObject();
        if (!active) return;
        const line = `[${formatShortTimestamp(active.startSec)}] ${String(active.text || "").replace(/\s*\n\s*/g, " ").trim()}`;
        try {
          await globalThis.navigator?.clipboard?.writeText(line);
          flashButtonLabel(this.copyBtn, "Copied cue");
        } catch {
        }
      });
      this.captionBox.addEventListener("mouseenter", () => {
        if (this.pauseOnCaptionHover && this.video && !this.video.paused) {
          this.pausedByHover = true;
          try {
            this.video.pause();
          } catch {
          }
        }
      });
      this.captionBox.addEventListener("mouseleave", () => {
        if (this.pausedByHover && this.video && this.video.paused) {
          this.pausedByHover = false;
          try {
            this.video.play?.().catch?.(() => {
            });
          } catch {
          }
        }
      });
      this.stageEl.appendChild(this.captionBox);
      shadow.append(
        style,
        this.stageEl,
        this.drawerEl,
        this.toolsPopoverEl,
        this.stylePopoverEl,
        this.shortcutsEl,
        this.toolbar
      );
      parent.appendChild(this.host);
      this._observePlayerSize();
      this._applyCaptionMetrics();
      this._applyAllCaptionVisuals();
      this._renderToolbar();
    }
    _mountStylePopover() {
      this.stylePopoverEl = this.doc.createElement("div");
      this.stylePopoverEl.className = "style-popover";
      this.stylePopoverEl.dataset.open = "false";
      const addPillGroup = (groupKey, labelText, options, onSelect) => {
        const row = this.doc.createElement("div");
        row.className = "style-row";
        const head = this.doc.createElement("div");
        head.className = "style-row-head";
        const lbl = this.doc.createElement("span");
        lbl.textContent = labelText;
        head.appendChild(lbl);
        const pills = this.doc.createElement("div");
        pills.className = "style-pills";
        this.stylePillButtons[groupKey] = [];
        for (const [val, text] of options) {
          const b = this._makeBtn(text, text, () => onSelect(val));
          b.dataset.val = String(val);
          pills.appendChild(b);
          this.stylePillButtons[groupKey].push(b);
        }
        row.append(head, pills);
        this.stylePopoverEl.appendChild(row);
      };
      addPillGroup(
        "position",
        "Position (V)",
        [
          ["bottom", "Bottom"],
          ["raised", "Raised"],
          ["top", "Top"]
        ],
        (val) => this._updateStylePatch({ captionPosition: val })
      );
      addPillGroup(
        "style",
        "Backdrop (B)",
        [
          ["classic", "Dark"],
          ["contrast", "Contrast"],
          ["minimal", "Clean"],
          ["cinema", "Pill"],
          ["paper", "Paper"],
          ["amber", "Warm"]
        ],
        (val) => {
          this.captionStyle = val;
          this._applyAllCaptionVisuals();
          this.onCaptionStyleChange(val);
          this.onStylePatchChange({ captionStyle: val });
        }
      );
      addPillGroup(
        "font",
        "Typeface",
        [
          ["sans", "Sans"],
          ["serif", "Serif"],
          ["mono", "Mono"],
          ["dyslexic", "Readable"]
        ],
        (val) => this._updateStylePatch({ captionFontFamily: val })
      );
      addPillGroup(
        "color",
        "Text color",
        [
          ["white", "White"],
          ["yellow", "Yellow"],
          ["cyan", "Cyan"],
          ["green", "Green"],
          ["ink", "Ink"]
        ],
        (val) => this._updateStylePatch({ captionColor: val })
      );
      addPillGroup(
        "width",
        "Line width",
        [
          ["compact", "Compact"],
          ["balanced", "Balanced"],
          ["wide", "Wide"]
        ],
        (val) => this._updateStylePatch({ captionMaxWidth: val })
      );
      const opRow = this.doc.createElement("div");
      opRow.className = "style-row";
      const opHead = this.doc.createElement("div");
      opHead.className = "style-row-head";
      const opLbl = this.doc.createElement("span");
      opLbl.textContent = "Backdrop opacity";
      this.opacityValEl = this.doc.createElement("span");
      this.opacityValEl.textContent = `${this.captionBgOpacity}%`;
      opHead.append(opLbl, this.opacityValEl);
      this.opacityInput = this.doc.createElement("input");
      this.opacityInput.type = "range";
      this.opacityInput.className = "opacity-range";
      this.opacityInput.min = "20";
      this.opacityInput.max = "100";
      this.opacityInput.step = "5";
      this.opacityInput.value = String(this.captionBgOpacity);
      this.opacityInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const v = Number(this.opacityInput.value);
        this._updateStylePatch({ captionBgOpacity: v });
      });
      opRow.append(opHead, this.opacityInput);
      this.stylePopoverEl.appendChild(opRow);
      const kdRow = this.doc.createElement("div");
      kdRow.className = "style-row";
      const kdHead = this.doc.createElement("div");
      kdHead.className = "style-row-head";
      const kdLbl = this.doc.createElement("span");
      kdLbl.textContent = "Word highlight delay ({ / })";
      this.karaokeDelayValEl = this.doc.createElement("span");
      this.karaokeDelayValEl.textContent = `${this.karaokeDelayMs > 0 ? "+" : ""}${this.karaokeDelayMs} ms`;
      kdHead.append(kdLbl, this.karaokeDelayValEl);
      this.karaokeDelayInput = this.doc.createElement("input");
      this.karaokeDelayInput.type = "range";
      this.karaokeDelayInput.className = "opacity-range";
      this.karaokeDelayInput.min = "-500";
      this.karaokeDelayInput.max = "1500";
      this.karaokeDelayInput.step = "50";
      this.karaokeDelayInput.value = String(this.karaokeDelayMs);
      this.karaokeDelayInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const v = Number(this.karaokeDelayInput.value);
        this._updateStylePatch({ karaokeDelayMs: v });
      });
      kdRow.append(kdHead, this.karaokeDelayInput);
      this.stylePopoverEl.appendChild(kdRow);
      const toggleRow = this.doc.createElement("div");
      toggleRow.className = "style-pills";
      this.karaokeBtn = this._makeBtn(
        "Word highlight",
        "Highlight spoken words progressively through each cue",
        () => this._updateStylePatch({ karaokeHighlight: !this.karaokeHighlight })
      );
      this.hoverPauseBtn = this._makeBtn(
        "Hover pause",
        "Pause video automatically while hovering over captions",
        () => this._updateStylePatch({
          pauseOnCaptionHover: !this.pauseOnCaptionHover
        })
      );
      toggleRow.append(this.karaokeBtn, this.hoverPauseBtn);
      this.stylePopoverEl.appendChild(toggleRow);
    }
    _mountTranscriptDrawer() {
      this.drawerEl = this.doc.createElement("aside");
      this.drawerEl.className = "transcript-drawer";
      this.drawerEl.dataset.open = "false";
      this.drawerEl.setAttribute?.("aria-label", "Interactive video transcript");
      const drawerHead = this.doc.createElement("div");
      drawerHead.className = "drawer-head";
      this.drawerTitleEl = this.doc.createElement("div");
      this.drawerTitleEl.className = "drawer-title";
      this.drawerTitleEl.textContent = "Transcript";
      const drawerHeadActions = this.doc.createElement("div");
      drawerHeadActions.style.display = "inline-flex";
      drawerHeadActions.style.gap = "4px";
      this.drawerAutoBtn = this._makeBtn("Follow", "Auto-scroll active line", () => {
        this.drawerAutoScroll = !this.drawerAutoScroll;
        this.drawerAutoBtn.dataset.active = this.drawerAutoScroll ? "true" : "false";
      });
      this.drawerAutoBtn.dataset.active = "true";
      const drawerCloseBtn = this._makeBtn("Close", "Close transcript (T)", () => {
        this.toggleTranscriptDrawer(false);
      });
      drawerHeadActions.append(this.drawerAutoBtn, drawerCloseBtn);
      drawerHead.append(this.drawerTitleEl, drawerHeadActions);
      const tabsRow = this.doc.createElement("div");
      tabsRow.className = "drawer-tabs";
      const tabGroup = this.doc.createElement("div");
      tabGroup.style.display = "inline-flex";
      tabGroup.style.gap = "3px";
      this.tabLinesBtn = this._makeBtn(
        "Lines",
        "All spoken lines",
        () => this._setDrawerTab("lines")
      );
      this.tabChaptersBtn = this._makeBtn(
        "Chapters",
        "Smart topic chapters",
        () => this._setDrawerTab("chapters")
      );
      this.tabSavedBtn = this._makeBtn(
        "Saved",
        "Bookmarked study moments",
        () => this._setDrawerTab("saved")
      );
      this.tabLinesBtn.dataset.active = "true";
      tabGroup.append(this.tabLinesBtn, this.tabChaptersBtn, this.tabSavedBtn);
      this.bookmarkNowBtn = this._makeBtn(
        "+ Bookmark",
        "Bookmark active spoken cue (M)",
        () => this.toggleBookmarkActiveCue()
      );
      tabsRow.append(tabGroup, this.bookmarkNowBtn);
      const searchRow = this.doc.createElement("div");
      searchRow.className = "drawer-search-row";
      this.drawerSearchInput = this.doc.createElement("input");
      this.drawerSearchInput.type = "search";
      this.drawerSearchInput.className = "drawer-search-input";
      this.drawerSearchInput.placeholder = "Filter spoken words\u2026";
      this.drawerSearchInput.setAttribute?.("aria-label", "Filter transcript");
      for (const evtName of ["keydown", "keyup", "keypress"]) {
        this.drawerSearchInput.addEventListener(evtName, (ev) => {
          ev.stopPropagation();
        });
      }
      this.drawerSearchInput.addEventListener("input", () => {
        this.drawerQuery = this.drawerSearchInput.value || "";
        this._renderTranscriptList();
      });
      this.drawerCountEl = this.doc.createElement("span");
      this.drawerCountEl.className = "drawer-count";
      searchRow.append(this.drawerSearchInput, this.drawerCountEl);
      this.drawerListEl = this.doc.createElement("div");
      this.drawerListEl.className = "drawer-list";
      this.drawerEl.append(drawerHead, tabsRow, searchRow, this.drawerListEl);
    }
    _setDrawerTab(tab) {
      this.drawerTab = tab;
      if (this.tabLinesBtn) this.tabLinesBtn.dataset.active = tab === "lines" ? "true" : "false";
      if (this.tabChaptersBtn) this.tabChaptersBtn.dataset.active = tab === "chapters" ? "true" : "false";
      if (this.tabSavedBtn) this.tabSavedBtn.dataset.active = tab === "saved" ? "true" : "false";
      this._renderTranscriptList();
    }
    _makeBtn(label, title, onClick) {
      const btn = this.doc.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.title = title;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
      });
      return btn;
    }
    _bindEvents() {
      this._onTimeChange = () => {
        this._ensureMounted();
        this._enforceCueLoop();
        this._applySkipSilence();
        this._renderActiveCue();
      };
      this._onPlay = () => {
        this._ensureMounted();
        if (this.playbackSpeed !== 1) {
          this._applyPlaybackSpeed(this.playbackSpeed, false);
        }
        this._startHighFreqSync();
        this._startWatchClock();
        this._updateControlsVisibility();
      };
      this._onPause = () => {
        this._stopHighFreqSync();
        this._flushWatchClock();
        this._updateControlsVisibility();
        this._renderActiveCue();
      };
      this._onEnterPiP = () => {
        this.inPiP = true;
        this._emitTelemetry({ pipDelta: 1 });
        if (this.pipBtn) this.pipBtn.dataset.active = "true";
        this._renderDockButtons();
        this._syncTrackVisibility();
        this._renderActiveCue();
      };
      this._onLeavePiP = () => {
        this.inPiP = false;
        if (this.pipBtn) this.pipBtn.dataset.active = "false";
        this._renderDockButtons();
        this._syncTrackVisibility();
        this._renderActiveCue();
      };
      this._onPointerEnter = () => {
        this.pointerOverPlayer = true;
        this._updateControlsVisibility();
      };
      this._onPointerLeave = () => {
        this.pointerOverPlayer = false;
        this._updateControlsVisibility();
      };
      this._onFullscreenChange = () => {
        this._ensureMounted();
        this._applyCaptionMetrics();
        this._updateControlsVisibility();
      };
      this.video.addEventListener("timeupdate", this._onTimeChange);
      this.video.addEventListener("seeking", this._onTimeChange);
      this.video.addEventListener("seeked", this._onTimeChange);
      this.video.addEventListener("play", this._onPlay);
      this.video.addEventListener("pause", this._onPause);
      this.video.addEventListener("enterpictureinpicture", this._onEnterPiP);
      this.video.addEventListener("leavepictureinpicture", this._onLeavePiP);
      const container = this.host?.parentElement || this.video.parentElement;
      if (container) {
        container.addEventListener?.("pointerenter", this._onPointerEnter, {
          passive: true
        });
        container.addEventListener?.("pointerleave", this._onPointerLeave, {
          passive: true
        });
        container.addEventListener?.("mouseenter", this._onPointerEnter, {
          passive: true
        });
        container.addEventListener?.("mouseleave", this._onPointerLeave, {
          passive: true
        });
      }
      this.doc.addEventListener?.("fullscreenchange", this._onFullscreenChange, {
        passive: true
      });
      globalThis.addEventListener?.("resize", this._onFullscreenChange, {
        passive: true
      });
    }
    _startWatchClock() {
      this.lastWatchTickMs = Date.now();
    }
    _flushWatchClock() {
      if (!this.lastWatchTickMs) return;
      const elapsedMs = Date.now() - this.lastWatchTickMs;
      this.lastWatchTickMs = 0;
      if (elapsedMs < 500) return;
      const seconds = elapsedMs / 1e3;
      this.watchAccumulatorSec += seconds;
      if (this.watchAccumulatorSec < 5) return;
      const whole = Math.round(this.watchAccumulatorSec);
      this.watchAccumulatorSec = 0;
      const speedSaved = this.playbackSpeed > 1 ? Math.round(whole * (this.playbackSpeed - 1)) : 0;
      this._emitTelemetry({
        [this.mediaKind === "audio" ? "listenSeconds" : "watchSeconds"]: whole,
        speedSavedSeconds: speedSaved
      });
    }
    _startHighFreqSync() {
      if (this.syncTimer) return;
      this.syncTimer = setInterval(() => {
        this._enforceCueLoop();
        this._renderActiveCue();
      }, 90);
    }
    _stopHighFreqSync() {
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
      }
    }
    /**
     * Controls stay visible while the pointer is over the player, while any
     * popover is open, while paused, and while NotebookLM's own controls are
     * on screen. They never toggle on cue presence, which is what used to make
     * the caption options blink between sentences.
     */
    _scheduleIdleFade() {
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
      if (this.toolbar) this.toolbar.dataset.idle = "false";
      this._updateControlsVisibility();
    }
    seekBySeconds(deltaSec) {
      try {
        const next = Math.max(
          0,
          Math.min(
            Number.isFinite(this.video.duration) && this.video.duration > 0 ? this.video.duration - 0.05 : Number.MAX_SAFE_INTEGER,
            (this.video.currentTime || 0) + deltaSec
          )
        );
        this.video.currentTime = next;
        this._renderActiveCue();
        return true;
      } catch {
        return false;
      }
    }
    async toggleFullscreen() {
      try {
        const target = this.host?.parentElement || this.video.parentElement;
        if (this.doc.fullscreenElement) {
          await this.doc.exitFullscreen?.();
          return false;
        }
        if (target?.requestFullscreen) {
          await target.requestFullscreen();
          return true;
        }
        if (this.video.requestFullscreen) {
          await this.video.requestFullscreen();
          return true;
        }
      } catch {
      }
      return false;
    }
    /**
     * Saves the current video frame with the live caption painted onto it.
     * Uses a canvas snapshot rather than `innerHTML` so it stays Trusted Types safe.
     */
    captureSnapshot() {
      try {
        const w = this.video.videoWidth;
        const h = this.video.videoHeight;
        if (!w || !h) return false;
        const canvas = this.doc.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext?.("2d");
        if (!ctx) return false;
        ctx.drawImage(this.video, 0, 0, w, h);
        const active = this._getActiveCueObject();
        if (active && this.ccEnabled) {
          const prefix = this.showSpeakerLabels && active.speaker ? `[${active.speaker}] ` : "";
          const text = `${prefix}${active.text}`.replace(/\s*\n\s*/g, " ").trim();
          const fontSize = Math.max(16, Math.round(h * 0.045));
          ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", Roboto, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const maxWidth = w * 0.86;
          const words = String(text).split(" ");
          const lines = [];
          let line = "";
          for (const word of words) {
            const candidate = line ? `${line} ${word}` : word;
            if (ctx.measureText(candidate).width > maxWidth && line) {
              lines.push(line);
              line = word;
            } else {
              line = candidate;
            }
          }
          if (line) lines.push(line);
          const lineHeight = fontSize * 1.35;
          const padX = fontSize * 0.7;
          const padY = fontSize * 0.45;
          const boxWidth = Math.min(
            maxWidth + padX * 2,
            Math.max(
              ...lines.map((l) => ctx.measureText(l).width + padX * 2),
              fontSize
            )
          );
          const boxHeight = lines.length * lineHeight + padY * 2;
          const boxX = (w - boxWidth) / 2;
          const boxY = h - boxHeight - fontSize * 0.9;
          ctx.fillStyle = "rgba(11, 13, 16, 0.86)";
          if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, fontSize * 0.4);
            ctx.fill();
          } else {
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
          }
          ctx.fillStyle = "#fdfdfe";
          lines.forEach((l, idx) => {
            ctx.fillText(
              l,
              w / 2,
              boxY + padY + lineHeight * (idx + 0.82),
              maxWidth
            );
          });
        }
        const dataUrl = canvas.toDataURL?.("image/png");
        if (!dataUrl) return false;
        const a = this.doc.createElement("a");
        a.href = dataUrl;
        a.download = `lm-subs-shot-${Math.round((this.video.currentTime || 0) * 10) / 10}s.png`;
        a.rel = "noopener";
        a.style.display = "none";
        (this.doc.body || this.doc.documentElement)?.appendChild?.(a);
        a.click();
        a.remove();
        this._emitTelemetry({ snapshotsDelta: 1 });
        return true;
      } catch {
        return false;
      }
    }
    cycleAudioBoost() {
      const steps = [100, 125, 150, 175, 200];
      const idx = steps.indexOf(this.audioBoostPercent);
      const next = steps[(idx + 1) % steps.length];
      this.applyAudioBoost(next);
      return next;
    }
    applyAudioBoost(percent) {
      this.audioBoostPercent = this._clamp(percent, 100, 250, 100);
      try {
        const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (this.audioBoostPercent <= 100) {
          if (this.boostSource) {
            try {
              this.boostSource.disconnect();
            } catch {
            }
            this.boostSource = null;
          }
          this.video.volume = 1;
        } else if (AudioCtx && typeof AudioCtx.prototype.createMediaElementSource === "function") {
          if (!this.boostCtx) {
            this.boostCtx = new AudioCtx();
            this.boostSource = this.boostCtx.createMediaElementSource(this.video);
            this.boostGain = this.boostCtx.createGain();
            this.boostSource.connect(this.boostGain);
            this.boostGain.connect(this.boostCtx.destination);
          }
          if (this.boostCtx.state === "suspended") {
            this.boostCtx.resume?.().catch?.(() => {
            });
          }
          if (this.boostGain) {
            this.boostGain.gain.value = this.audioBoostPercent / 100;
          }
        }
      } catch {
      }
      if (this.boostBtn) {
        this.boostBtn.textContent = this.audioBoostPercent > 100 ? `${this.audioBoostPercent}%` : "Vol";
        this.boostBtn.dataset.active = this.audioBoostPercent > 100 ? "true" : "false";
      }
      this._renderDockButtons();
      return this.audioBoostPercent;
    }
    toggleSkipSilence(forceState) {
      this.skipSilenceEnabled = typeof forceState === "boolean" ? forceState : !this.skipSilenceEnabled;
      if (this.silenceBtn) {
        this.silenceBtn.dataset.active = this.skipSilenceEnabled ? "true" : "false";
      }
      this._renderDockButtons();
      this.onStylePatchChange({ skipSilenceEnabled: this.skipSilenceEnabled });
      this._applySkipSilence();
      return this.skipSilenceEnabled;
    }
    /**
     * Speeds playback through silent gaps between caption cues, then restores
     * the chosen rate as soon as the next spoken line begins.
     */
    _applySkipSilence() {
      if (!this.skipSilenceEnabled || this.cues.length === 0) return;
      const t = this.video.currentTime || 0;
      const shifted = this._shiftedCues();
      const active = findActiveCue(shifted, t - this.offsetSec);
      if (active) {
        if (this.video.playbackRate !== this.playbackSpeed) {
          this.video.playbackRate = this.playbackSpeed;
        }
        return;
      }
      let nextStart = null;
      for (const cue of shifted) {
        if (cue.startSec > t) {
          nextStart = cue.startSec;
          break;
        }
      }
      let prevEnd = 0;
      for (const cue of shifted) {
        if (cue.endSec <= t) prevEnd = Math.max(prevEnd, cue.endSec);
      }
      const gap = nextStart !== null ? nextStart - t : Number.POSITIVE_INFINITY;
      const behindGap = t - prevEnd;
      const inGap = gap > this.skipSilenceGapSec || behindGap > this.skipSilenceGapSec;
      if (inGap && this.video.playbackRate !== this.skipSilenceRate) {
        this.video.playbackRate = this.skipSilenceRate;
      } else if (!inGap && this.video.playbackRate !== this.playbackSpeed) {
        this.video.playbackRate = this.playbackSpeed;
      }
    }
    _enforceCueLoop() {
      if (this.loopCueIndex < 0 || this.loopCueIndex >= this.cues.length) return;
      const shifted = this._shiftedCues();
      const target = shifted[this.loopCueIndex];
      if (!target) return;
      const now = this.video.currentTime || 0;
      if (now >= target.endSec - 0.03 || now < target.startSec - 0.25) {
        try {
          this.video.currentTime = Math.max(0, target.startSec + 0.01);
        } catch {
        }
      }
    }
    toggleCueLoop() {
      if (this.cues.length === 0) return false;
      if (this.loopCueIndex >= 0) {
        this.loopCueIndex = -1;
        if (this.loopBtn) this.loopBtn.dataset.active = "false";
        this._renderDockButtons();
        return false;
      }
      const idx = this.activeCueIndex >= 0 ? this.activeCueIndex : this._findNearestCueIndex();
      if (idx < 0) return false;
      this.loopCueIndex = idx;
      this._emitTelemetry({ loopsDelta: 1 });
      if (this.loopBtn) this.loopBtn.dataset.active = "true";
      this._renderDockButtons();
      return true;
    }
    _findNearestCueIndex() {
      const shifted = this._shiftedCues();
      if (!shifted.length) return -1;
      const now = this.video.currentTime || 0;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < shifted.length; i++) {
        const dist = Math.abs(shifted[i].startSec - now);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      return best;
    }
    seekRelativeCue(step) {
      const shifted = this._shiftedCues();
      if (!shifted.length) return false;
      const base = this.activeCueIndex >= 0 ? this.activeCueIndex : this._findNearestCueIndex();
      const nextIdx = Math.max(0, Math.min(shifted.length - 1, base + step));
      const cue = shifted[nextIdx];
      if (!cue) return false;
      if (this.loopCueIndex >= 0) {
        this.loopCueIndex = nextIdx;
      }
      try {
        this.video.currentTime = Math.max(0, cue.startSec + 0.01);
        this._renderActiveCue();
      } catch {
      }
      return true;
    }
    cyclePlaybackSpeed(stepDir = 1) {
      const idx = PLAYBACK_SPEEDS.indexOf(this.playbackSpeed);
      const nextIdx = idx < 0 ? 1 : (idx + stepDir + PLAYBACK_SPEEDS.length) % PLAYBACK_SPEEDS.length;
      const nextSpeed = PLAYBACK_SPEEDS[nextIdx];
      this._applyPlaybackSpeed(nextSpeed, true);
      return nextSpeed;
    }
    _applyPlaybackSpeed(rate, persist = false) {
      this.playbackSpeed = rate;
      try {
        if (this.video) {
          this.video.playbackRate = rate;
        }
      } catch {
      }
      if (this.speedBtn) {
        this.speedBtn.textContent = `${rate}x`;
        this.speedBtn.dataset.active = rate !== 1 ? "true" : "false";
      }
      if (persist) {
        this.onStylePatchChange({ defaultPlaybackSpeed: rate });
      }
    }
    /**
     * Picture-in-Picture that keeps captions on screen.
     *
     * 1. If `keepSubtitlesInPiP` is on and the Document Picture-in-Picture API is
     *    available, we open a real PiP window and render the live caption box into
     *    it (full styling, speaker labels, and karaoke word highlight included).
     * 2. Otherwise we fall back to the native `<video>` PiP window and populate a
     *    programmatic `TextTrack` so the OS/browser renders captions inside it.
     */
    async togglePictureInPicture() {
      try {
        if (this.doc.pictureInPictureElement) {
          await this.doc.exitPictureInPicture?.();
          return false;
        }
        if (this.pipWindow && !this.pipWindow.closed) {
          this.pipWindow.close();
          return false;
        }
        if (this.keepSubtitlesInPiP && this.cues.length > 0 && globalThis.documentPictureInPicture?.requestWindow) {
          const win = await globalThis.documentPictureInPicture.requestWindow({
            width: 480,
            height: 270
          });
          this.pipWindow = win;
          const doc = win.document;
          doc.title = "LM Subs captions";
          const style = doc.createElement("style");
          style.textContent = `
          html, body { margin: 0; height: 100%; background: #0b0d10; overflow: hidden; }
          .lms-pip-caption {
            position: absolute;
            left: 4%; right: 4%; bottom: 6%;
            display: inline-block;
            max-width: 92%;
            margin: 0 auto;
            padding: 7px 15px 8px;
            border-radius: 7px;
            background: rgba(11, 13, 16, 0.88);
            color: #fdfdfe;
            text-align: center;
            font-family: "Plus Jakarta Sans", Roboto, sans-serif;
            font-weight: 500;
            line-height: 1.42;
            white-space: pre-line;
          }
          .lms-pip-caption[data-visible="false"] { display: none; }
          .lms-pip-caption .caption-word-current {
            background: rgba(29, 92, 246, 0.48);
            color: #ffffff;
            padding: 1px 5px;
            border-radius: 4px;
            font-weight: 600;
          }
          .lms-pip-caption .caption-word-upcoming { opacity: 0.64; }
        `;
          const captionEl = doc.createElement("div");
          captionEl.className = "lms-pip-caption";
          captionEl.dataset.visible = "false";
          doc.body.append(style, captionEl);
          this.pipCaptionEl = captionEl;
          this.pipDoc = doc;
          win.addEventListener("pagehide", () => {
            this.pipWindow = null;
            this.pipCaptionEl = null;
            this.pipDoc = null;
          });
          this._renderPipCaption();
          this._emitTelemetry({ pipDelta: 1 });
          return true;
        }
        if (typeof this.video?.requestPictureInPicture === "function") {
          this._syncNativeTextTrack();
          await this.video.requestPictureInPicture();
          return true;
        }
      } catch {
      }
      return false;
    }
    _renderPipCaption() {
      if (!this.pipCaptionEl || !this.pipDoc) return;
      const effectiveTime = (this.video.currentTime || 0) - this.offsetSec;
      const active = findActiveCue(this.cues, effectiveTime) || (this.lastActiveCue && effectiveTime - this.lastActiveCue.endSec <= CAPTION_LINGER_SEC ? this.lastActiveCue : null);
      if (!this.ccEnabled || !active) {
        this.pipCaptionEl.dataset.visible = "false";
        return;
      }
      const prefix = this.showSpeakerLabels && active.speaker ? `[${active.speaker}] ` : "";
      const fullText = `${prefix}${active.text}`;
      while (this.pipCaptionEl.firstChild) {
        this.pipCaptionEl.removeChild(this.pipCaptionEl.firstChild);
      }
      if (this.karaokeHighlight) {
        const span = Math.max(0.25, active.endSec - active.startSec);
        const delayedTime = effectiveTime - (this.karaokeDelayMs || 0) / 1e3;
        const progress = Math.max(
          0,
          Math.min(1, (delayedTime - active.startSec) / span)
        );
        const tokens = fullText.split(/(\s+)/);
        const wordPositions = [];
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i].trim()) wordPositions.push(i);
        }
        const activeWordCount = Math.min(
          wordPositions.length,
          Math.max(1, Math.ceil(progress * wordPositions.length))
        );
        let seen = 0;
        for (const tok of tokens) {
          if (!tok.trim()) {
            this.pipCaptionEl.appendChild(this.pipDoc.createTextNode(tok));
            continue;
          }
          seen += 1;
          const w = this.pipDoc.createElement("span");
          w.className = seen === activeWordCount ? "caption-word-current" : seen < activeWordCount ? "caption-word-done" : "caption-word-upcoming";
          w.textContent = tok;
          this.pipCaptionEl.appendChild(w);
        }
      } else {
        this.pipCaptionEl.textContent = fullText;
      }
      this.pipCaptionEl.dataset.visible = "true";
    }
    toggleBookmarkCueAt(index) {
      if (index < 0 || index >= this.cues.length) return false;
      const target = this.cues[index];
      const nextBookmarked = !target.bookmarked;
      this.cues[index] = {
        ...target,
        ...nextBookmarked ? { bookmarked: true } : {}
      };
      if (!nextBookmarked) {
        delete this.cues[index].bookmarked;
      } else {
        this._emitTelemetry({ bookmarksDelta: 1 });
      }
      this.onCuesMutated(this.cues);
      if (this.drawerOpen) {
        this._renderTranscriptList();
      }
      return nextBookmarked;
    }
    toggleBookmarkActiveCue() {
      if (this.cues.length === 0) return false;
      const idx = this.activeCueIndex >= 0 ? this.activeCueIndex : this._findNearestCueIndex();
      if (idx < 0) return false;
      const starred = this.toggleBookmarkCueAt(idx);
      flashButtonLabel(this.bookmarkNowBtn, starred ? "Saved" : "Removed", 1e3);
      return starred;
    }
    stepFontSize(delta) {
      this._stepFontSize(delta);
    }
    _stepFontSize(delta) {
      const idx = CAPTION_FONT_SIZES.indexOf(this.fontSize);
      const nextIdx = Math.max(
        0,
        Math.min(CAPTION_FONT_SIZES.length - 1, idx + delta)
      );
      this.fontSize = CAPTION_FONT_SIZES[nextIdx];
      this._applyAllCaptionVisuals();
      this.onFontSizeChange(this.fontSize);
    }
    cycleCaptionStyle() {
      const idx = CAPTION_STYLES.indexOf(this.captionStyle);
      this.captionStyle = CAPTION_STYLES[(idx + 1) % CAPTION_STYLES.length];
      this._applyAllCaptionVisuals();
      this.onCaptionStyleChange(this.captionStyle);
      return this.captionStyle;
    }
    cycleCaptionPosition() {
      const idx = CAPTION_POSITIONS.indexOf(this.captionPosition);
      const next = CAPTION_POSITIONS[(idx + 1) % CAPTION_POSITIONS.length];
      this._updateStylePatch({ captionPosition: next });
      return next;
    }
    toggleStylePopover(forceState) {
      this.styleOpen = typeof forceState === "boolean" ? forceState : !this.styleOpen;
      if (this.styleOpen) {
        this._closePopoversExcept("style");
      }
      if (this.stylePopoverEl) {
        this.stylePopoverEl.dataset.open = this.styleOpen ? "true" : "false";
      }
      if (this.stylerBtn) {
        this.stylerBtn.dataset.active = this.styleOpen ? "true" : "false";
      }
      return this.styleOpen;
    }
    _updateStylePatch(patch) {
      this.setSettings(patch);
      this.onStylePatchChange(patch);
    }
    /**
     * Computes the live caption font size from the real player box so captions
     * shrink in the compact Studio sidebar preview and grow in fullscreen, then
     * clamps the result between `captionMinFontPx` and `captionMaxFontPx`.
     */
    _resolveCaptionFontSizePx() {
      const base = FONT_BASE_PX[this.fontSize] || FONT_BASE_PX.medium;
      if (!this.dynamicCaptionScaling) {
        return Math.max(
          this.captionMinFontPx,
          Math.min(this.captionMaxFontPx, base)
        );
      }
      let height = 0;
      let width = 0;
      try {
        const rect = this.host?.getBoundingClientRect?.() || this.video?.getBoundingClientRect?.();
        height = Number(rect?.height) || 0;
        width = Number(rect?.width) || 0;
      } catch {
        height = 0;
      }
      if (!height && typeof this.video?.videoHeight === "number") {
        height = this.video.videoHeight;
        width = this.video.videoWidth || height * 1.777;
      }
      if (!height) height = REFERENCE_PLAYER_HEIGHT_PX;
      if (!width) width = height * 1.777;
      const scaleBase = Math.min(height, width * 0.5625);
      const raw = base * Math.max(0.35, Math.min(3, scaleBase / REFERENCE_PLAYER_HEIGHT_PX)) * (this.captionScaleFactor / 100);
      return Math.max(
        this.captionMinFontPx,
        Math.min(this.captionMaxFontPx, Math.round(raw * 10) / 10)
      );
    }
    _applyCaptionMetrics() {
      const root = this.host || this.stageEl;
      if (!root || !root.style) return;
      const box = this.captionBox?.style ? this.captionBox : null;
      const setVar = (name, value) => {
        if (typeof root.style?.setProperty === "function") {
          root.style.setProperty(name, value);
        }
        if (box && typeof box.setProperty === "function") {
          box.setProperty(name, value);
        }
      };
      const px = this._resolveCaptionFontSizePx();
      setVar("--lms-caption-font", `${px}px`);
      setVar(
        "--lms-caption-pad-y",
        `${Math.round(this.captionPaddingY * px / 18.5)}px`
      );
      setVar(
        "--lms-caption-pad-x",
        `${Math.round(this.captionPaddingX * px / 18.5)}px`
      );
      setVar("--lms-caption-radius", `${this.captionBorderRadius}px`);
      setVar("--lms-caption-leading", String(this.captionLineHeight / 100));
      setVar("--lms-caption-bottom", `${this.captionBottomOffsetPx}px`);
      setVar("--lms-karaoke-alpha", String(this.karaokeHighlightOpacity / 100));
      setVar("--lms-upcoming-alpha", String(this.upcomingWordOpacity / 100));
      setVar(
        "--lms-caption-stroke",
        this.captionTextStrokePx > 0 ? `0 0 ${this.captionTextStrokePx}px rgba(0,0,0,0.92), 0 1px 2px rgba(0,0,0,0.85)` : "none"
      );
      if (this.pipCaptionEl?.style) {
        this.pipCaptionEl.style.fontSize = `${px}px`;
      }
    }
    _observePlayerSize() {
      if (typeof ResizeObserver === "undefined") return;
      const targets = [];
      if (this.host) targets.push(this.host);
      const parent = this.video?.parentElement;
      if (parent && parent !== this.host) targets.push(parent);
      if (!targets.length) return;
      try {
        this.sizeObserver?.disconnect?.();
        this.sizeObserver = new ResizeObserver(() => {
          this._applyCaptionMetrics();
        });
        for (const t of targets) this.sizeObserver.observe(t);
      } catch {
        this.sizeObserver = null;
      }
    }
    _applyAllCaptionVisuals() {
      if (this.stageEl) {
        this.stageEl.dataset.pos = this.captionPosition;
      }
      if (this.captionBox) {
        this.captionBox.style.fontSize = this.dynamicCaptionScaling && this.host?.style ? "" : FONT_SCALE_MAP[this.fontSize] || FONT_SCALE_MAP.medium;
        this.captionBox.style.fontFamily = FONT_FAMILY_MAP[this.captionFontFamily] || FONT_FAMILY_MAP.sans;
        this.captionBox.style.maxWidth = MAX_WIDTH_MAP[this.captionMaxWidth] || MAX_WIDTH_MAP.balanced;
        this.captionBox.dataset.style = this.captionStyle;
        this.captionBox.dataset.font = this.captionFontFamily;
        this._applyCaptionMetrics();
        const alpha = this.captionBgOpacity / 100;
        let bgCss = hexToRgba("#0b0d10", alpha);
        let textHex = COLOR_HEX_MAP[this.captionColor] || COLOR_HEX_MAP.white;
        if (this.captionStyle === "contrast") {
          bgCss = hexToRgba("#050608", Math.max(0.75, alpha));
        } else if (this.captionStyle === "minimal") {
          bgCss = "transparent";
          if (this.captionColor === "ink") textHex = "#fdfdfe";
        } else if (this.captionStyle === "paper") {
          bgCss = hexToRgba("#fdfdfe", Math.max(0.82, alpha));
          if (this.captionColor === "white") textHex = "#111315";
        } else if (this.captionStyle === "amber") {
          bgCss = hexToRgba("#1c160c", Math.max(0.78, alpha));
          if (this.captionColor === "white") textHex = "#fde68a";
        }
        this.captionBox.style.backgroundColor = bgCss;
        this.captionBox.style.color = textHex;
      }
      if (this.styleBtn) {
        const labelMap = {
          classic: "Box",
          contrast: "Hi-Con",
          minimal: "Clean",
          cinema: "Pill",
          paper: "Paper",
          amber: "Warm"
        };
        this.styleBtn.textContent = labelMap[this.captionStyle] || "Box";
      }
      if (this.opacityValEl) {
        this.opacityValEl.textContent = `${this.captionBgOpacity}%`;
      }
      if (this.opacityInput) {
        this.opacityInput.value = String(this.captionBgOpacity);
      }
      if (this.karaokeDelayValEl) {
        const sign = this.karaokeDelayMs > 0 ? "+" : "";
        this.karaokeDelayValEl.textContent = `${sign}${this.karaokeDelayMs} ms`;
      }
      if (this.karaokeDelayInput) {
        this.karaokeDelayInput.value = String(this.karaokeDelayMs);
      }
      if (this.karaokeBtn) {
        this.karaokeBtn.dataset.active = this.karaokeHighlight ? "true" : "false";
      }
      if (this.hoverPauseBtn) {
        this.hoverPauseBtn.dataset.active = this.pauseOnCaptionHover ? "true" : "false";
      }
      const syncPills = (group, activeVal) => {
        for (const b of this.stylePillButtons[group] || []) {
          b.dataset.active = b.dataset.val === String(activeVal) ? "true" : "false";
        }
      };
      syncPills("position", this.captionPosition);
      syncPills("style", this.captionStyle);
      syncPills("font", this.captionFontFamily);
      syncPills("color", this.captionColor);
      syncPills("width", this.captionMaxWidth);
      this.lastRenderedSignature = "";
      this._renderActiveCue();
    }
    adjustKaraokeDelay(deltaMs) {
      const next = Math.max(
        -1500,
        Math.min(3e3, Math.round((this.karaokeDelayMs + deltaMs) / 10) * 10)
      );
      this._updateStylePatch({ karaokeDelayMs: next });
      return next;
    }
    adjustOffset(delta) {
      this._adjustOffset(delta);
    }
    resetOffset() {
      this._resetOffset();
    }
    _adjustOffset(delta) {
      this.offsetSec = Math.round((this.offsetSec + delta) * 100) / 100;
      this._syncNativeTextTrack();
      this._renderToolbar();
      this._renderTranscriptList();
      this._renderActiveCue();
      this.onOffsetChange(this.offsetSec);
    }
    _resetOffset() {
      this.offsetSec = 0;
      this._syncNativeTextTrack();
      this._renderToolbar();
      this._renderTranscriptList();
      this._renderActiveCue();
      this.onOffsetChange(0);
    }
    toggleTranscriptDrawer(forceState) {
      if (this.cues.length === 0) return false;
      this.drawerOpen = typeof forceState === "boolean" ? forceState : !this.drawerOpen;
      if (this.drawerOpen) {
        this._closePopoversExcept("drawer");
      }
      if (this.drawerEl) {
        this.drawerEl.dataset.open = this.drawerOpen ? "true" : "false";
      }
      if (this.stageEl) {
        this.stageEl.dataset.drawerOpen = this.drawerOpen ? "true" : "false";
      }
      if (this.transcriptBtn) {
        this.transcriptBtn.dataset.active = this.drawerOpen ? "true" : "false";
      }
      if (this.drawerOpen) {
        this._renderTranscriptList();
        this._highlightDrawerActiveCue(true);
      }
      this._renderToolbar();
      return this.drawerOpen;
    }
    toggleShortcutsHelp(forceState) {
      this.shortcutsOpen = typeof forceState === "boolean" ? forceState : !this.shortcutsOpen;
      if (this.shortcutsOpen) {
        this._closePopoversExcept("shortcuts");
      }
      if (this.shortcutsEl) {
        this.shortcutsEl.dataset.open = this.shortcutsOpen ? "true" : "false";
      }
      if (this.shortcutsBtn) {
        this.shortcutsBtn.dataset.active = this.shortcutsOpen ? "true" : "false";
      }
      return this.shortcutsOpen;
    }
    _shiftedCues() {
      if (!this.offsetSec) return this.cues;
      return this.cues.map((c) => ({
        ...c,
        startSec: Math.max(0, Math.round((c.startSec + this.offsetSec) * 1e3) / 1e3),
        endSec: Math.max(0.25, Math.round((c.endSec + this.offsetSec) * 1e3) / 1e3)
      }));
    }
    setSettings(patch = {}) {
      if (patch.fontSize && CAPTION_FONT_SIZES.includes(patch.fontSize)) {
        this.fontSize = patch.fontSize;
      }
      if (patch.captionStyle && CAPTION_STYLES.includes(patch.captionStyle)) {
        this.captionStyle = patch.captionStyle;
      }
      if (patch.captionFontFamily && CAPTION_FONT_FAMILIES.includes(patch.captionFontFamily)) {
        this.captionFontFamily = patch.captionFontFamily;
      }
      if (patch.captionColor && CAPTION_COLORS.includes(patch.captionColor)) {
        this.captionColor = patch.captionColor;
      }
      if (Number.isFinite(Number(patch.captionBgOpacity))) {
        this.captionBgOpacity = Math.max(
          0,
          Math.min(100, Math.round(Number(patch.captionBgOpacity)))
        );
      }
      if (patch.captionPosition && CAPTION_POSITIONS.includes(patch.captionPosition)) {
        this.captionPosition = patch.captionPosition;
      }
      if (patch.captionMaxWidth && CAPTION_WIDTHS.includes(patch.captionMaxWidth)) {
        this.captionMaxWidth = patch.captionMaxWidth;
      }
      if (typeof patch.karaokeHighlight === "boolean") {
        this.karaokeHighlight = patch.karaokeHighlight;
      }
      if (Number.isFinite(Number(patch.karaokeDelayMs))) {
        this.karaokeDelayMs = Math.max(
          -1500,
          Math.min(3e3, Math.round(Number(patch.karaokeDelayMs) / 10) * 10)
        );
      }
      if (typeof patch.showSpeakerLabels === "boolean") {
        this.showSpeakerLabels = patch.showSpeakerLabels;
      }
      if (typeof patch.pauseOnCaptionHover === "boolean") {
        this.pauseOnCaptionHover = patch.pauseOnCaptionHover;
      }
      if (typeof patch.clickCaptionToCopy === "boolean") {
        this.clickCaptionToCopy = patch.clickCaptionToCopy;
      }
      if (PLAYBACK_SPEEDS.includes(Number(patch.defaultPlaybackSpeed))) {
        this._applyPlaybackSpeed(Number(patch.defaultPlaybackSpeed), false);
      }
      if (Number.isFinite(patch.subtitleOffsetSec)) {
        this.offsetSec = patch.subtitleOffsetSec;
        this._syncNativeTextTrack();
        this._renderToolbar();
        this._renderTranscriptList();
      }
      if (typeof patch.fineGrainedControls === "boolean") {
        this.fineGrainedControls = patch.fineGrainedControls;
        if (this.fineSection) {
          this.fineSection.style.display = this.fineGrainedControls ? "flex" : "none";
        }
        this._mountNativeDock();
      }
      if (typeof patch.dynamicCaptionScaling === "boolean") {
        this.dynamicCaptionScaling = patch.dynamicCaptionScaling;
      }
      if (Number.isFinite(Number(patch.captionScaleFactor))) {
        this.captionScaleFactor = this._clamp(
          patch.captionScaleFactor,
          50,
          200,
          100
        );
      }
      if (Number.isFinite(Number(patch.captionMinFontPx))) {
        this.captionMinFontPx = this._clamp(patch.captionMinFontPx, 8, 18, 11);
      }
      if (Number.isFinite(Number(patch.captionMaxFontPx))) {
        this.captionMaxFontPx = this._clamp(patch.captionMaxFontPx, 20, 64, 40);
      }
      if (Number.isFinite(Number(patch.captionPaddingY))) {
        this.captionPaddingY = this._clamp(patch.captionPaddingY, 2, 20, 7);
      }
      if (Number.isFinite(Number(patch.captionPaddingX))) {
        this.captionPaddingX = this._clamp(patch.captionPaddingX, 6, 40, 15);
      }
      if (Number.isFinite(Number(patch.captionBorderRadius))) {
        this.captionBorderRadius = this._clamp(
          patch.captionBorderRadius,
          0,
          32,
          7
        );
      }
      if (Number.isFinite(Number(patch.captionLineHeight))) {
        this.captionLineHeight = this._clamp(
          patch.captionLineHeight,
          115,
          185,
          142
        );
      }
      if (Number.isFinite(Number(patch.captionBottomOffsetPx))) {
        this.captionBottomOffsetPx = this._clamp(
          patch.captionBottomOffsetPx,
          24,
          180,
          54
        );
      }
      if (Number.isFinite(Number(patch.captionTextStrokePx))) {
        this.captionTextStrokePx = this._clamp(
          patch.captionTextStrokePx,
          0,
          3,
          0
        );
      }
      if (Number.isFinite(Number(patch.karaokeHighlightOpacity))) {
        this.karaokeHighlightOpacity = this._clamp(
          patch.karaokeHighlightOpacity,
          15,
          95,
          48
        );
      }
      if (Number.isFinite(Number(patch.upcomingWordOpacity))) {
        this.upcomingWordOpacity = this._clamp(
          patch.upcomingWordOpacity,
          25,
          100,
          64
        );
      }
      if (patch.playBarDockMode && ["native", "hover", "always"].includes(patch.playBarDockMode)) {
        this.playBarDockMode = patch.playBarDockMode;
        this.host?.setAttribute?.("data-dock", this.playBarDockMode);
        this._mountNativeDock();
        this._updateControlsVisibility();
      }
      if (Number.isFinite(Number(patch.hoverFadeDelayMs))) {
        this.hoverFadeDelayMs = this._clamp(patch.hoverFadeDelayMs, 400, 6e3, 2200);
      }
      if (typeof patch.keepSubtitlesInPiP === "boolean") {
        this.keepSubtitlesInPiP = patch.keepSubtitlesInPiP;
        this._syncTrackVisibility();
      }
      if (typeof patch.skipSilenceEnabled === "boolean") {
        this.skipSilenceEnabled = patch.skipSilenceEnabled;
        if (this.silenceBtn) {
          this.silenceBtn.dataset.active = this.skipSilenceEnabled ? "true" : "false";
        }
      }
      if (Number.isFinite(Number(patch.skipSilenceGapSec))) {
        this.skipSilenceGapSec = this._clamp(patch.skipSilenceGapSec, 0.6, 5, 1.6);
      }
      if (Number.isFinite(Number(patch.skipSilenceRate))) {
        this.skipSilenceRate = this._clamp(patch.skipSilenceRate, 1.4, 3, 2.2);
      }
      if (Number.isFinite(Number(patch.audioBoostPercent))) {
        this.audioBoostPercent = this._clamp(patch.audioBoostPercent, 100, 250, 100);
      }
      this._applyCaptionMetrics();
      this._applyAllCaptionVisuals();
      this._renderDockButtons();
      this._renderToolbar();
    }
    setStatus(state, label = "") {
      this._ensureMounted();
      this.statusState = state;
      this.statusLabel = label;
      this._renderDockButtons();
      this._renderToolbar();
      this._updateControlsVisibility();
    }
    toggleSubtitles() {
      if (this.cues.length === 0) return;
      this.ccEnabled = !this.ccEnabled;
      this._syncTrackVisibility();
      this._renderDockButtons();
      this._renderToolbar();
      this.lastRenderedSignature = "";
      this._renderActiveCue();
    }
    setCues(cues, { title, language = "en" } = {}) {
      this._ensureMounted();
      this.cues = Array.isArray(cues) ? cues : [];
      if (title) this.title = title;
      this.language = language || "en";
      this.statusState = this.cues.length > 0 ? "ready" : "idle";
      this.statusLabel = "";
      this.loopCueIndex = -1;
      if (this.loopBtn) this.loopBtn.dataset.active = "false";
      if (this.drawerTitleEl) {
        this.drawerTitleEl.textContent = `Transcript (${this.cues.length})`;
      }
      this._syncNativeTextTrack();
      this._renderDockButtons();
      this._renderToolbar();
      if (this.drawerOpen) {
        this._renderTranscriptList();
      }
      this.lastRenderedSignature = "";
      this._renderActiveCue();
      this._updateControlsVisibility();
    }
    getExportCues() {
      return this._shiftedCues();
    }
    exportSubtitles(format = "srt") {
      if (this.cues.length === 0) return false;
      this._emitTelemetry({ exportsDelta: 1 });
      const { content, filename, mimeType } = serializeSubtitles(
        this._shiftedCues(),
        format,
        {
          title: this.title,
          language: this.language || "en"
        }
      );
      const openDialog = this.video?.closest?.("dialog[open]") || null;
      triggerTextDownload(
        this.doc,
        content,
        filename,
        mimeType,
        this.shadow || openDialog
      );
      return true;
    }
    async _citeCueIntoNotebook(cue, citeBtn) {
      const clean = String(cue.text || "").replace(/\s*\n\s*/g, " ").trim();
      const formatted = `[${formatBriefStamp(cue.startSec)}] "${clean}"`;
      let inserted = false;
      if (typeof this.onCiteCue === "function") {
        try {
          inserted = Boolean(await this.onCiteCue(formatted, cue));
        } catch {
          inserted = false;
        }
      }
      if (!inserted) {
        try {
          await globalThis.navigator?.clipboard?.writeText(formatted);
        } catch {
        }
      } else {
        this._emitTelemetry({ citationsDelta: 1 });
      }
      flashButtonLabel(citeBtn, inserted ? "Cited" : "Copied", 1100);
    }
    _renderTranscriptList() {
      if (!this.drawerListEl) return;
      while (this.drawerListEl.firstChild) {
        this.drawerListEl.removeChild(this.drawerListEl.firstChild);
      }
      this.cueRowElements = [];
      const shifted = this._shiftedCues();
      const q = String(this.drawerQuery || "").trim().toLowerCase();
      if (this.drawerTab === "chapters") {
        const chapters = buildAutoChapters(shifted);
        if (this.drawerCountEl) {
          this.drawerCountEl.textContent = `${chapters.length} sec`;
        }
        if (chapters.length === 0) {
          const empty = this.doc.createElement("div");
          empty.className = "drawer-empty";
          empty.textContent = "No smart chapters available yet.";
          this.drawerListEl.appendChild(empty);
          return;
        }
        for (const ch of chapters) {
          if (q && !ch.title.toLowerCase().includes(q)) continue;
          const btn = this.doc.createElement("button");
          btn.type = "button";
          btn.className = "chapter-row";
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            try {
              this.video.currentTime = Math.max(0, ch.startSec + 0.01);
              if (this.video.paused && typeof this.video.play === "function") {
                this.video.play().catch(() => {
                });
              }
            } catch {
            }
          });
          const meta = this.doc.createElement("span");
          meta.className = "chapter-meta";
          meta.textContent = `Part ${ch.chapterNumber}  [${ch.timestamp}]  (${ch.wordCount} words)`;
          const title = this.doc.createElement("span");
          title.className = "chapter-title";
          title.textContent = ch.title;
          btn.append(meta, title);
          this.drawerListEl.appendChild(btn);
        }
        return;
      }
      let matchCount = 0;
      for (let i = 0; i < shifted.length; i++) {
        const cue = shifted[i];
        if (this.drawerTab === "saved" && !cue.bookmarked) {
          this.cueRowElements.push(null);
          continue;
        }
        const singleLine = String(cue.text || "").replace(/\s*\n\s*/g, " ").trim();
        const hay = `${cue.speaker || ""} ${singleLine}`.toLowerCase();
        if (q && !hay.includes(q)) {
          this.cueRowElements.push(null);
          continue;
        }
        matchCount += 1;
        const rowWrap = this.doc.createElement("div");
        rowWrap.className = "cue-item";
        rowWrap.dataset.cueIndex = String(i);
        const btn = this.doc.createElement("button");
        btn.type = "button";
        btn.className = "cue-row";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          try {
            this.video.currentTime = Math.max(0, cue.startSec + 0.01);
            if (this.video.paused && typeof this.video.play === "function") {
              this.video.play().catch(() => {
              });
            }
          } catch {
          }
        });
        const stamp = this.doc.createElement("span");
        stamp.className = "cue-stamp";
        stamp.textContent = formatBriefStamp(cue.startSec);
        const textSpan = this.doc.createElement("span");
        textSpan.className = "cue-text";
        textSpan.textContent = this.showSpeakerLabels && cue.speaker ? `[${cue.speaker}] ${singleLine}` : singleLine;
        btn.append(stamp, textSpan);
        const actions = this.doc.createElement("div");
        actions.className = "cue-actions";
        actions.dataset.starred = cue.bookmarked ? "true" : "false";
        const starBtn = this._makeBtn(
          cue.bookmarked ? "Saved" : "Save",
          "Bookmark this spoken moment",
          () => this.toggleBookmarkCueAt(i)
        );
        starBtn.className = "cue-mini-btn";
        starBtn.dataset.starred = cue.bookmarked ? "true" : "false";
        const citeBtn = this._makeBtn(
          "Cite",
          "Insert quote with timestamp into NotebookLM chat or copy",
          () => this._citeCueIntoNotebook(cue, citeBtn)
        );
        citeBtn.className = "cue-mini-btn";
        actions.append(starBtn, citeBtn);
        rowWrap.append(btn, actions);
        this.drawerListEl.appendChild(rowWrap);
        this.cueRowElements.push(rowWrap);
      }
      if (this.drawerCountEl) {
        this.drawerCountEl.textContent = this.drawerTab === "saved" ? `${matchCount} saved` : q ? `${matchCount}/${shifted.length}` : `${shifted.length}`;
      }
      if (matchCount === 0) {
        const empty = this.doc.createElement("div");
        empty.className = "drawer-empty";
        empty.textContent = this.drawerTab === "saved" ? "No bookmarked cues yet. Click Save on any line or press M while watching." : q ? "No spoken lines match your filter." : "No transcript cues loaded yet.";
        this.drawerListEl.appendChild(empty);
      }
      this._highlightDrawerActiveCue(false);
    }
    _highlightDrawerActiveCue(forceScroll = false) {
      if (!this.drawerOpen || !this.cueRowElements.length) return;
      for (let i = 0; i < this.cueRowElements.length; i++) {
        const el = this.cueRowElements[i];
        if (!el) continue;
        const isCurrent = i === this.activeCueIndex;
        el.dataset.current = isCurrent ? "true" : "false";
        if (isCurrent && (forceScroll || this.drawerAutoScroll) && !this.drawerQuery && typeof el.scrollIntoView === "function") {
          try {
            el.scrollIntoView({ block: "nearest" });
          } catch {
          }
        }
      }
    }
    _syncNativeTextTrack() {
      if (typeof this.video.addTextTrack !== "function" || typeof VTTCue === "undefined") {
        return;
      }
      try {
        if (!this.nativeTrack) {
          this.nativeTrack = this.video.addTextTrack(
            "subtitles",
            DOM_SELECTORS.TRACK_LABEL || "LM Subs",
            this.language || "en"
          );
        }
        if (this.nativeTrack.cues) {
          while (this.nativeTrack.cues.length > 0) {
            this.nativeTrack.removeCue(this.nativeTrack.cues[0]);
          }
        }
        for (const cue of this._shiftedCues()) {
          const vttCue = new VTTCue(cue.startSec, cue.endSec, cue.text);
          this.nativeTrack.addCue(vttCue);
        }
        this._syncTrackVisibility();
      } catch {
      }
    }
    _syncTrackVisibility() {
      if (!this.nativeTrack) return;
      this.nativeTrack.mode = this.ccEnabled && this.keepSubtitlesInPiP && this.inPiP && this.cues.length > 0 ? "showing" : "hidden";
    }
    _renderToolbar() {
      if (!this.toolbar) return;
      const hasCues = this.cues.length > 0;
      const isWorking = this.statusState === "working";
      if (isWorking) {
        this.ccBtn.textContent = "CC";
        this.ccBtn.dataset.active = "false";
        this.ccBtn.dataset.primary = "false";
        this.ccBtn.disabled = true;
      } else if (hasCues) {
        this.ccBtn.textContent = "CC";
        this.ccBtn.dataset.active = this.ccEnabled ? "true" : "false";
        this.ccBtn.dataset.primary = "false";
        this.ccBtn.disabled = false;
      } else {
        this.ccBtn.textContent = "CC";
        this.ccBtn.dataset.active = "false";
        this.ccBtn.dataset.primary = "true";
        this.ccBtn.disabled = false;
      }
      if (this.statusLabel) {
        this.statusEl.style.display = "inline-block";
        this.statusEl.dataset.state = this.statusState;
        this.statusEl.textContent = this.statusLabel;
      } else {
        this.statusEl.style.display = "none";
      }
      this.controlsGroup.style.display = hasCues ? "flex" : "none";
      if (this.transcriptBtn) {
        this.transcriptBtn.style.display = hasCues ? "inline-flex" : "none";
        this.transcriptBtn.dataset.active = this.drawerOpen ? "true" : "false";
      }
      if (this.moreBtn) {
        this.moreBtn.dataset.active = this.toolsOpen ? "true" : "false";
      }
      this.regenBtn.style.display = hasCues || this.statusState === "error" ? "inline-flex" : "none";
      this.regenBtn.textContent = hasCues ? "Regen" : "Retry";
      this.regenBtn.disabled = isWorking;
      const sign = this.offsetSec > 0 ? "+" : "";
      this.offsetLabelBtn.textContent = `${sign}${this.offsetSec.toFixed(2)}s`;
    }
    _getActiveCueObject() {
      const effectiveTime = (this.video.currentTime || 0) - this.offsetSec;
      return findActiveCue(this.cues, effectiveTime);
    }
    _renderActiveCue() {
      if (!this.captionBox) return;
      const effectiveTime = (this.video.currentTime || 0) - this.offsetSec;
      let active = findActiveCue(this.cues, effectiveTime);
      if (!active && this.lastActiveCue) {
        const endedAgo = effectiveTime - this.lastActiveCue.endSec;
        if (endedAgo >= 0 && endedAgo <= CAPTION_LINGER_SEC) {
          active = this.lastActiveCue;
        }
      }
      if (active) this.lastActiveCue = active;
      const nextIdx = active ? this.cues.indexOf(active) : -1;
      if (nextIdx !== this.activeCueIndex) {
        this.activeCueIndex = nextIdx;
        this._highlightDrawerActiveCue(false);
      }
      if (!this.ccEnabled || this.inPiP && !this.pipWindow || !active) {
        this.captionBox.dataset.visible = "false";
        this.lastRenderedSignature = "";
        this._renderPipCaption();
        return;
      }
      const prefix = this.showSpeakerLabels && active.speaker ? `[${active.speaker}] ` : "";
      const fullText = `${prefix}${active.text}`;
      if (!this.karaokeHighlight) {
        const sig2 = `plain:${nextIdx}:${fullText}:${active.secondaryText || ""}`;
        if (sig2 !== this.lastRenderedSignature) {
          this.lastRenderedSignature = sig2;
          while (this.captionBox.firstChild) {
            this.captionBox.removeChild(this.captionBox.firstChild);
          }
          if (active.secondaryText) {
            const primarySpan = this.doc.createElement("span");
            primarySpan.textContent = fullText;
            const secSpan = this.doc.createElement("span");
            secSpan.className = "caption-secondary";
            secSpan.textContent = active.secondaryText;
            this.captionBox.append(primarySpan, secSpan);
          } else {
            this.captionBox.textContent = fullText;
          }
        }
        this.captionBox.dataset.visible = "true";
        this._renderPipCaption();
        return;
      }
      const span = Math.max(0.25, active.endSec - active.startSec);
      const delayedTime = effectiveTime - (this.karaokeDelayMs || 0) / 1e3;
      const rawProgress = (delayedTime - active.startSec) / span;
      const progress = Math.max(0, Math.min(1, rawProgress));
      const tokens = fullText.split(/(\s+)/);
      const wordPositions = [];
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].trim()) wordPositions.push(i);
      }
      const activeWordCount = this.karaokeDelayMs > 0 && rawProgress < 0 ? 0 : Math.min(
        wordPositions.length,
        Math.max(1, Math.ceil(progress * wordPositions.length))
      );
      const sig = `karaoke:${nextIdx}:${activeWordCount}:${fullText}`;
      if (sig !== this.lastRenderedSignature) {
        this.lastRenderedSignature = sig;
        while (this.captionBox.firstChild) {
          this.captionBox.removeChild(this.captionBox.firstChild);
        }
        let seenWords = 0;
        for (const tok of tokens) {
          if (!tok.trim()) {
            this.captionBox.appendChild(this.doc.createTextNode(tok));
            continue;
          }
          seenWords += 1;
          if (seenWords === activeWordCount) {
            const w = this.doc.createElement("span");
            w.className = "caption-word-done caption-word-current";
            w.textContent = tok;
            this.captionBox.appendChild(w);
          } else if (seenWords < activeWordCount) {
            const w = this.doc.createElement("span");
            w.className = "caption-word-done";
            w.textContent = tok;
            this.captionBox.appendChild(w);
          } else {
            const w = this.doc.createElement("span");
            w.className = "caption-word-upcoming";
            w.textContent = tok;
            this.captionBox.appendChild(w);
          }
        }
      }
      this.captionBox.dataset.visible = "true";
      this._renderPipCaption();
    }
    destroy() {
      this._flushWatchClock();
      this._stopHighFreqSync();
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (this.dockPollTimer) clearInterval(this.dockPollTimer);
      this.dockPollTimer = null;
      try {
        this.sizeObserver?.disconnect?.();
      } catch {
      }
      this.sizeObserver = null;
      this._teardownNativeDock();
      try {
        if (this.pipWindow && !this.pipWindow.closed) this.pipWindow.close();
      } catch {
      }
      this.pipWindow = null;
      this.pipCaptionEl = null;
      this.video.removeEventListener("timeupdate", this._onTimeChange);
      this.video.removeEventListener("seeking", this._onTimeChange);
      this.video.removeEventListener("seeked", this._onTimeChange);
      this.video.removeEventListener("play", this._onPlay);
      this.video.removeEventListener("pause", this._onPause);
      this.video.removeEventListener("enterpictureinpicture", this._onEnterPiP);
      this.video.removeEventListener("leavepictureinpicture", this._onLeavePiP);
      const container = this.host?.parentElement || this.video.parentElement;
      if (container) {
        container.removeEventListener?.("pointerenter", this._onPointerEnter);
        container.removeEventListener?.("pointerleave", this._onPointerLeave);
        container.removeEventListener?.("mouseenter", this._onPointerEnter);
        container.removeEventListener?.("mouseleave", this._onPointerLeave);
      }
      this.doc.removeEventListener?.("fullscreenchange", this._onFullscreenChange);
      globalThis.removeEventListener?.("resize", this._onFullscreenChange);
      this.host?.remove();
    }
  };

  // src/content/toast.js
  var TOAST_CSS = `
  :host {
    all: initial;
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483646;
    pointer-events: none;
    font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .toast {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 430px;
    padding: 9px 11px 9px 11px;
    border-radius: 9px;
    background: #111315;
    color: #f6f7f8;
    border: 1px solid #272b33;
    font-size: 12px;
    line-height: 1.4;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 120ms ease, transform 120ms ease;
    pointer-events: none;
  }
  .toast[data-visible="true"] {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
  @media (prefers-reduced-motion: reduce) {
    .toast {
      transition: none;
      transform: none;
    }
  }
  .logo-wrap {
    position: relative;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .brand-logo {
    width: 26px;
    height: 26px;
    display: block;
    border-radius: 6px;
  }
  .dot {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid #111315;
    background: #9ca3af;
  }
  .toast[data-kind="working"] .dot {
    background: #3b82f6;
  }
  .toast[data-kind="success"] .dot {
    background: #22c55e;
  }
  .toast[data-kind="error"] .dot {
    background: #ef4444;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }
  .title {
    font-weight: 600;
    color: #fdfdfe;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .detail {
    font-size: 11.5px;
    color: #9ca3af;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .action-btn {
    all: unset;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 5px;
    background: #0055d4;
    color: #fdfdfe;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .action-btn:hover {
    background: #0044aa;
  }
  .action-btn:focus-visible,
  .close-btn:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
  }
  .close-btn {
    all: unset;
    cursor: pointer;
    padding: 2px 5px;
    border-radius: 4px;
    color: #9ca3af;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;
  }
  .close-btn:hover {
    color: #fdfdfe;
    background: rgba(255, 255, 255, 0.1);
  }
`;
  function createToastManager(doc = globalThis.document) {
    let host = null;
    let toastEl = null;
    let titleEl = null;
    let detailEl = null;
    let actionBtn = null;
    let closeBtn = null;
    let currentAction = null;
    let hideTimer = null;
    function hide() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      currentAction = null;
      if (toastEl) {
        toastEl.dataset.visible = "false";
      }
    }
    function ensureMounted() {
      if (!doc || !doc.body) return false;
      if (host && doc.body.contains(host)) return true;
      const existing = doc.getElementById(DOM_SELECTORS.TOAST_HOST_ID);
      if (existing) existing.remove();
      host = doc.createElement("div");
      host.id = DOM_SELECTORS.TOAST_HOST_ID;
      const shadow = host.attachShadow({ mode: "closed" });
      const style = doc.createElement("style");
      style.textContent = TOAST_CSS;
      toastEl = doc.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute?.("role", "status");
      toastEl.setAttribute?.("aria-live", "polite");
      const logoWrap = doc.createElement("span");
      logoWrap.className = "logo-wrap";
      const logoMark = createBrandLogoElement(doc, {
        size: 26,
        className: "brand-logo"
      });
      const dot = doc.createElement("span");
      dot.className = "dot";
      logoWrap.append(logoMark, dot);
      const body = doc.createElement("div");
      body.className = "body";
      titleEl = doc.createElement("div");
      titleEl.className = "title";
      detailEl = doc.createElement("div");
      detailEl.className = "detail";
      actionBtn = doc.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "action-btn";
      actionBtn.style.display = "none";
      actionBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const fn = currentAction;
        hide();
        if (typeof fn === "function") fn();
      });
      closeBtn = doc.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "close-btn";
      closeBtn.setAttribute?.("aria-label", "Dismiss notification");
      closeBtn.textContent = "\xD7";
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        hide();
      });
      body.append(titleEl, detailEl);
      toastEl.append(logoWrap, body, actionBtn, closeBtn);
      shadow.append(style, toastEl);
      doc.body.appendChild(host);
      return true;
    }
    function show({
      title,
      detail = "",
      kind = "info",
      durationMs = 4200,
      actionLabel = "",
      onAction = null
    } = {}) {
      if (!ensureMounted()) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      toastEl.dataset.kind = kind;
      titleEl.textContent = String(title || "LM Subs");
      detailEl.textContent = String(detail || "");
      detailEl.style.display = detail ? "block" : "none";
      if (actionLabel && typeof onAction === "function") {
        currentAction = onAction;
        actionBtn.textContent = String(actionLabel);
        actionBtn.style.display = "inline-flex";
      } else {
        currentAction = null;
        actionBtn.style.display = "none";
      }
      toastEl.dataset.visible = "true";
      if (durationMs > 0) {
        hideTimer = setTimeout(() => {
          if (toastEl) toastEl.dataset.visible = "false";
        }, durationMs);
      }
    }
    return { show, hide };
  }

  // src/content/content.js
  var GUARD_FLAG = "__notebooklmSubtitlesContentLoaded__";
  var BLOB_EXTRACT_TIMEOUT_MS = 4e3;
  var MAX_WAV_CHUNK_BYTES = 14 * 1024 * 1024;
  var KEEPALIVE_PORT_REFRESH_MS = 4 * 60 * 1e3;
  function uint8ToBase64(bytes) {
    let s = "";
    const CHUNK = 32768;
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
  function collectMediaElementsDeep(root, out = [], depth = 0, selector = DOM_SELECTORS.MEDIA_ELEMENTS) {
    if (!root || depth > 6) return out;
    try {
      const tag = String(root.tagName || "").toUpperCase();
      if ((tag === "VIDEO" || tag === "AUDIO" && selector !== DOM_SELECTORS.VIDEO_ELEMENT) && !root.__lmSubsInternal && !out.includes(root)) {
        out.push(root);
      }
      if (typeof root.querySelectorAll === "function") {
        const items = root.querySelectorAll(selector);
        for (const el of items) {
          if (!el.__lmSubsInternal && !out.includes(el)) out.push(el);
        }
        const allEls = root.querySelectorAll("*");
        for (const el of allEls) {
          if (el.shadowRoot) {
            collectMediaElementsDeep(el.shadowRoot, out, depth + 1, selector);
          }
        }
      }
    } catch {
    }
    return out;
  }
  function collectVideosDeep(root, out = [], depth = 0) {
    return collectMediaElementsDeep(root, out, depth, DOM_SELECTORS.VIDEO_ELEMENT);
  }
  var RemoteAudioElementProxy = class {
    constructor(audioId, sendCommand) {
      this.audioId = audioId;
      this._sendCommand = sendCommand;
      this.tagName = "AUDIO";
      this.isConnected = true;
      this.src = "";
      this.currentSrc = "";
      this._currentTime = 0;
      this.duration = 0;
      this.paused = true;
      this._playbackRate = 1;
      this.readyState = 2;
      this._listeners = /* @__PURE__ */ new Map();
    }
    get currentTime() {
      return this._currentTime;
    }
    set currentTime(val) {
      const next = Math.max(0, Number(val) || 0);
      this._currentTime = next;
      this._sendCommand("seek", next);
      this._emit("seeking");
      this._emit("timeupdate");
    }
    get playbackRate() {
      return this._playbackRate;
    }
    set playbackRate(val) {
      const next = Number(val) || 1;
      this._playbackRate = next;
      this._sendCommand("rate", next);
    }
    play() {
      this.paused = false;
      this._sendCommand("play");
      this._emit("play");
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
      this._sendCommand("pause");
      this._emit("pause");
    }
    addEventListener(type, fn) {
      if (!this._listeners.has(type)) this._listeners.set(type, /* @__PURE__ */ new Set());
      this._listeners.get(type).add(fn);
    }
    removeEventListener(type, fn) {
      this._listeners.get(type)?.delete(fn);
    }
    _emit(type) {
      const set = this._listeners.get(type);
      if (!set) return;
      for (const fn of set) {
        try {
          fn({ type, target: this });
        } catch {
        }
      }
    }
    applySnapshot(snap = {}) {
      if (typeof snap.src === "string" && snap.src) {
        this.src = snap.src;
        this.currentSrc = snap.src;
      }
      if (Number.isFinite(snap.currentTime)) {
        this._currentTime = snap.currentTime;
      }
      if (Number.isFinite(snap.duration) && snap.duration > 0) {
        this.duration = snap.duration;
      }
      if (typeof snap.paused === "boolean") {
        this.paused = snap.paused;
      }
      if (Number.isFinite(snap.playbackRate) && snap.playbackRate > 0) {
        this._playbackRate = snap.playbackRate;
      }
      const evt = snap.eventType || "timeupdate";
      this._emit(evt);
      if (evt !== "timeupdate") this._emit("timeupdate");
    }
  };
  async function initContentCoordinator({
    win = globalThis.window,
    doc = globalThis.document,
    runtime = globalThis.chrome?.runtime,
    storage = globalThis.chrome?.storage
  } = {}) {
    if (!win || !doc || !runtime) return null;
    if (!isNotebookLmHost(win.location?.hostname || "")) return null;
    if (win[GUARD_FLAG]) return win[GUARD_FLAG];
    const artifactsById = /* @__PURE__ */ new Map();
    const artifactsByToken = /* @__PURE__ */ new Map();
    const pendingGeneratedVideoIds = /* @__PURE__ */ new Set();
    const cachedKeys = /* @__PURE__ */ new Set();
    const inFlightKeys = /* @__PURE__ */ new Set();
    const exhaustedKeys = /* @__PURE__ */ new Set();
    const controllers = /* @__PURE__ */ new Map();
    const remoteAudioProxies = /* @__PURE__ */ new Map();
    const pendingPageRequests = /* @__PURE__ */ new Map();
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
    let keepaliveGeneration = 0;
    let keepaliveOpenedAt = 0;
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
    function openKeepalivePort() {
      const generation = keepaliveGeneration += 1;
      keepaliveOpenedAt = Date.now();
      let port = null;
      try {
        port = runtime.connect({ name: KEEPALIVE_PORT_NAME });
      } catch {
        return;
      }
      keepalivePort = port;
      port.onDisconnect.addListener(() => {
        if (generation !== keepaliveGeneration) return;
        keepalivePort = null;
      });
    }
    function startKeepalive() {
      if (keepaliveTimer || !runtime?.connect) return;
      if (!keepalivePort) openKeepalivePort();
      keepaliveTimer = setInterval(() => {
        try {
          keepalivePort?.postMessage({ ping: Date.now() });
        } catch {
        }
        if (Date.now() - keepaliveOpenedAt >= KEEPALIVE_PORT_REFRESH_MS) {
          try {
            keepalivePort?.disconnect();
          } catch {
          }
          keepalivePort = null;
          openKeepalivePort();
        }
      }, 2e4);
    }
    function stopKeepaliveIfIdle() {
      if (inFlightKeys.size > 0) return;
      keepaliveGeneration += 1;
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }
      if (keepalivePort) {
        try {
          keepalivePort.disconnect();
        } catch {
        }
        keepalivePort = null;
      }
    }
    function recordDebug(layer, event, detail, level = "info") {
      const entry = {
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        layer,
        event,
        detail: sanitizeDebugMessage(detail),
        level
      };
      localDebugBuffer.push(entry);
      if (localDebugBuffer.length > 80) localDebugBuffer.shift();
      if (debugDrawer) {
        debugDrawer.pushEntry(entry);
        debugDrawer.updateSummary({
          artifacts: artifactsById.size,
          videos: controllers.size,
          permissionsOk
        });
      }
      if (settings.debugMode) {
        sendRuntimeMessage({
          type: RUNTIME_MESSAGE.APPEND_DEBUG_LOG,
          entry
        }).catch(() => {
        });
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
                "No active <video> element in DOM yet \u2014 open a Studio Video Overview player",
                "error"
              );
            }
          },
          onCopyReport: async () => {
            const res = await sendRuntimeMessage({
              type: RUNTIME_MESSAGE.GET_DEBUG_REPORT,
              tabContext: buildTabDiagnosticSnapshot()
            });
            const text = res?.reportText || JSON.stringify(buildTabDiagnosticSnapshot(), null, 2);
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
              () => {
              }
            );
          }
        });
        debugDrawer.mount();
        debugDrawer.setEntries(localDebugBuffer);
        debugDrawer.updateSummary({
          artifacts: artifactsById.size,
          videos: controllers.size,
          status: pickTargetVideoEntry()?.controller?.statusState || "idle",
          permissionsOk
        });
      });
    }
    function buildNotebookScope() {
      let videoCount = 0;
      let audioCount = 0;
      let reportCount = 0;
      let studioArtifactCount = 0;
      for (const art of artifactsById.values()) {
        studioArtifactCount += 1;
        if (art.typeCode === ARTIFACT_TYPE.AUDIO_OVERVIEW || art.mediaKind === "audio") {
          audioCount += 1;
        } else if (art.typeCode === ARTIFACT_TYPE.VIDEO_OVERVIEW) {
          videoCount += 1;
        } else if (art.typeCode === ARTIFACT_TYPE.REPORT || art.typeCode === ARTIFACT_TYPE.INFOGRAPHIC || art.typeCode === ARTIFACT_TYPE.SLIDE_DECK || art.typeCode === ARTIFACT_TYPE.DATA_TABLE || art.typeCode === ARTIFACT_TYPE.MIND_MAP) {
          reportCount += 1;
        }
      }
      return {
        notebookId: getNotebookIdFromUrl(),
        notebookTitle: getNotebookTitleFallback(),
        sourceCount: Number(win.__lmSubsSourceCount || 0),
        videoCount,
        audioCount,
        reportCount,
        studioArtifactCount
      };
    }
    let telemetryAccumulator = {};
    let telemetryFlushTimer = null;
    function recordNotebookTelemetry(patch = {}, mediaKind = "video") {
      if (!patch || typeof patch !== "object") return;
      telemetryAccumulator = { ...telemetryAccumulator, ...patch };
      if (!telemetryAccumulator.__kind && mediaKind) {
        telemetryAccumulator.__kind = mediaKind;
      }
      if (telemetryFlushTimer) return;
      telemetryFlushTimer = setTimeout(() => {
        telemetryFlushTimer = null;
        const payload = { ...telemetryAccumulator };
        delete payload.__kind;
        telemetryAccumulator = {};
        if (!Object.keys(payload).length) return;
        sendRuntimeMessage({
          type: RUNTIME_MESSAGE.RECORD_NOTEBOOKLM_TELEMETRY,
          event: { ...payload, ...buildNotebookScope() }
        }).catch(() => {
        });
      }, 8e3);
    }
    function ensureToast() {
      if (!toast && doc.body) {
        toast = createToastManager(doc);
      }
      return toast;
    }
    function showToast(title, detail = "", kind = "info", durationMs = 3800, extra = {}) {
      if (!settings.showToast || !settings.enabled) return;
      waitForBody(doc, () => {
        ensureToast()?.show({
          title,
          detail,
          kind,
          durationMs,
          actionLabel: extra?.actionLabel || "",
          onAction: extra?.onAction || null
        });
      });
    }
    function playCompletionChime({ force = false } = {}) {
      if (!settings.soundAlerts || !settings.enabled) return;
      playCompletionChimeSound({
        win,
        preset: settings.notificationSoundPreset || "chime",
        volume: Number(settings.notificationSoundVolume) || 75,
        force
      }).catch(() => {
      });
    }
    function playNotificationSoundPreset(msg = {}) {
      if (!settings.enabled) return;
      playCompletionChimeSound({
        win,
        preset: msg.preset || settings.notificationSoundPreset || "chime",
        volume: Number(msg.volume ?? settings.notificationSoundVolume) || 75,
        force: true
      }).catch(() => {
      });
    }
    try {
      const onUnlockGesture = () => {
        unlockChimeAudio(win);
      };
      doc.addEventListener?.("pointerdown", onUnlockGesture, {
        capture: true,
        passive: true
      });
      doc.addEventListener?.("keydown", onUnlockGesture, {
        capture: true,
        passive: true
      });
      doc.addEventListener?.("play", onUnlockGesture, {
        capture: true,
        passive: true
      });
    } catch {
    }
    function fireTabDesktopNotification(title, body) {
      if (!settings.desktopNotifications || !settings.enabled) return;
      if (!doc.hidden) return;
      try {
        const Notif = win.Notification;
        if (Notif && Notif.permission === "granted") {
          const iconUrl = runtime?.getURL ? resolveExtensionLogoUrl(runtime, 128) : LM_SUBS_LOGO_DATA_URI;
          const badgeUrl = runtime?.getURL ? resolveExtensionLogoUrl(runtime, 48) : LM_SUBS_LOGO_DATA_URI;
          new Notif(String(title || "LM Subs"), {
            body: String(body || ""),
            icon: iconUrl,
            badge: badgeUrl
          });
        }
      } catch {
      }
    }
    function hideToast() {
      toast?.hide?.();
    }
    function getPostOrigin() {
      return win.location?.origin && win.location.origin !== "null" ? win.location.origin : "*";
    }
    function syncRpcOverridesToPage() {
      try {
        win.postMessage(
          {
            source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
            type: PAGE_MESSAGE.SYNC_RPC_OVERRIDES,
            rpcOverrides: settings.rpcOverrides || {}
          },
          getPostOrigin()
        );
      } catch {
      }
    }
    function requestPageStateSnapshot() {
      try {
        win.postMessage(
          {
            source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
            type: PAGE_MESSAGE.REQUEST_PAGE_STATE
          },
          getPostOrigin()
        );
      } catch {
      }
    }
    function requestPageBlobExtraction({ videoCurrentSrc }) {
      return new Promise((resolve) => {
        const requestId = `extract_${Date.now()}_${pageReqSeq++}`;
        const timer = setTimeout(() => {
          pendingPageRequests.delete(requestId);
          resolve({
            ok: false,
            error: "Timed out reading in-memory Blob stream."
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
                blobOnly: true
              }
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
      return (doc.title || "NotebookLM Video Overview").replace(/\s*[-–|]\s*(?:NotebookLM|Gemini Notebook).*$/i, "").trim() || "NotebookLM Video Overview";
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
        if (video.muted && video.loop && video.videoWidth > 0 && video.videoWidth <= 520 && !video.controls) {
          return true;
        }
      } catch {
      }
      return false;
    }
    function matchArtifactForVideo(video) {
      const isAudioEl = String(video?.tagName || "").toUpperCase() === "AUDIO";
      const src = video.currentSrc || video.src || "";
      const token = extractMediaToken(src);
      if (token && artifactsByToken.has(token)) {
        return artifactsByToken.get(token);
      }
      const allReady = [...artifactsById.values()].filter(
        (a) => a.status === "ready" && (a.mediaUrl || a.progressiveUrl || a.mediaVariants?.length)
      );
      const kindMatched = allReady.filter(
        (a) => isAudioEl ? a.typeCode === ARTIFACT_TYPE.AUDIO_OVERVIEW || a.mediaKind === "audio" : a.typeCode !== ARTIFACT_TYPE.AUDIO_OVERVIEW && a.mediaKind !== "audio"
      );
      const readyList = kindMatched.length > 0 ? kindMatched : allReady;
      if (readyList.length === 1) {
        return readyList[0];
      }
      if (Number.isFinite(video.duration) && video.duration > 0) {
        let best = null;
        let bestDiff = Infinity;
        for (const art of readyList) {
          if (typeof art.durationSeconds === "number") {
            const diff = Math.abs(art.durationSeconds - video.duration);
            if (diff < 3 && diff < bestDiff) {
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
          if (e.initiatorType === "video" || e.initiatorType === "audio" || e.initiatorType === "media" || /videoplayback|=m(?:18|22|37|140)(?:-dv)?(?:$|\?)/i.test(url)) {
            if (!urls.includes(url)) urls.push(url);
          }
        }
      } catch {
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
            durationSec: ch.durationSec
          }
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
        }
      }
      const sampleRate = decoded.duration > 600 ? 12e3 : 16e3;
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
        durationSec: c.durationSec
      }));
    }
    const CHANNEL_LOST_REGEX = /message channel closed|message port closed|extension context invalidated|no response from background/i;
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async function dispatchEnsureSubtitles(payload) {
      const res = await sendRuntimeMessage(payload);
      if (res?.ok || !CHANNEL_LOST_REGEX.test(String(res?.error || ""))) {
        return res;
      }
      recordDebug(
        "CONTENT",
        "ensure.channel_lost",
        "Background worker restarted mid transcription, checking for a cached transcript\u2026"
      );
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await sleep(2e3);
        const cached = await sendRuntimeMessage({
          type: RUNTIME_MESSAGE.GET_CACHED_SUBTITLES,
          cacheKey: payload.cacheKey,
          artifactId: payload.artifactId,
          mediaToken: payload.mediaToken
        });
        if (cached?.ok && cached.entry?.cues?.length > 0) {
          recordDebug(
            "CONTENT",
            "ensure.channel_recovered",
            `Recovered ${cached.entry.cues.length} cues after worker restart`,
            "ok"
          );
          return { ok: true, cached: true, recovered: true, entry: cached.entry };
        }
      }
      recordDebug(
        "CONTENT",
        "ensure.channel_retry",
        "Transcript not cached yet, re-dispatching to the fresh background worker"
      );
      return sendRuntimeMessage(payload);
    }
    async function ensureSubtitlesForEntry(entry, { force = false, trigger = "player_open" } = {}) {
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
        if (typeof u === "string" && isTrustedGoogleMediaUrl(u) && !mediaVariants.includes(u)) {
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
      const primaryMediaUrl = mediaVariants[0] || artifact?.progressiveUrl || artifact?.mediaUrl || (isTrustedGoogleMediaUrl(rawSrc) ? rawSrc : "") || (rawSrc.startsWith("blob:") || rawSrc.startsWith("data:audio/") ? rawSrc : "");
      const isBlobSrc = rawSrc.startsWith("blob:") || rawSrc.startsWith("data:audio/");
      if (!primaryMediaUrl) {
        recordDebug(
          "CONTENT",
          "ensure.waiting_url",
          `Waiting for media URL (artifacts=${artifactsById.size}, src=${summarizeMediaUrlForDebug(rawSrc)})`
        );
        return;
      }
      const isAudioMedia = entry.mediaKind === "audio" || artifact?.typeCode === ARTIFACT_TYPE.AUDIO_OVERVIEW || artifact?.mediaKind === "audio";
      const resolvedTypeCode = artifact?.typeCode ?? (isAudioMedia ? ARTIFACT_TYPE.AUDIO_OVERVIEW : ARTIFACT_TYPE.VIDEO_OVERVIEW);
      const artifactId = artifact?.artifactId || null;
      const mediaToken = artifact?.mediaToken || extractMediaToken(primaryMediaUrl) || null;
      const fallbackTitle = getNotebookTitleFallback();
      const title = artifact?.title || (isAudioMedia && fallbackTitle === "NotebookLM Video Overview" ? "NotebookLM Audio Overview" : fallbackTitle);
      const isNewlyGenerated = Boolean(
        artifactId && pendingGeneratedVideoIds.has(artifactId)
      );
      const effectiveTrigger = force ? "manual" : isNewlyGenerated ? "generate" : trigger;
      const decision = shouldGenerateSubtitles({
        settings,
        trigger: effectiveTrigger,
        force,
        typeCode: resolvedTypeCode,
        mediaKind: isAudioMedia ? "audio" : "video",
        status: "ready",
        title,
        artifactId: artifactId || (!mediaToken && isBlobSrc ? `blob_${Math.round((video.duration || 1) * 10)}` : null),
        mediaToken,
        mediaUrl: primaryMediaUrl,
        cachedKeys,
        inFlightKeys,
        exhaustedKeys
      });
      if (!decision.allow) {
        if (decision.reason === "already_cached" && controller.cues.length === 0) {
          const cached = await sendRuntimeMessage({
            type: RUNTIME_MESSAGE.GET_CACHED_SUBTITLES,
            cacheKey: decision.cacheKey,
            artifactId,
            mediaToken
          });
          if (cached?.ok && cached.entry?.cues?.length > 0) {
            controller.setCues(cached.entry.cues, {
              title: cached.entry.title || title,
              language: cached.entry.language || "en"
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
      entry.mediaToken = mediaToken;
      entry.cacheKey = cacheKey;
      inFlightKeys.add(cacheKey);
      startKeepalive();
      controller.setStatus("working", "Generating subtitles\u2026");
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
        if (!force) {
          const cachedRes = await sendRuntimeMessage({
            type: RUNTIME_MESSAGE.GET_CACHED_SUBTITLES,
            cacheKey,
            artifactId,
            mediaToken
          });
          if (cachedRes?.ok && cachedRes.entry?.cues?.length > 0) {
            cachedKeys.add(cacheKey);
            controller.setCues(cachedRes.entry.cues, {
              title: cachedRes.entry.title || title,
              language: cachedRes.entry.language || artifact?.language || "en"
            });
            debugDrawer?.updateSummary({
              status: `ready (${cachedRes.entry.cues.length} cached)`
            });
            recordDebug(
              "CONTENT",
              "ensure.cache_hit",
              `Loaded ${cachedRes.entry.cues.length} cached cues (${cachedRes.entry.provider})`,
              "ok"
            );
            showToast(
              "Loaded cached subtitles",
              `${cachedRes.entry.cues.length} cues \xB7 ${title}`,
              "success",
              2600
            );
            return;
          }
        }
        showToast(
          isAudioMedia ? "Extracting audio from Audio Overview\u2026" : "Extracting audio from Video Overview\u2026",
          title,
          "working",
          0
        );
        let stagedJobId = null;
        if (isBlobSrc) {
          const blobResult = await requestPageBlobExtraction({
            videoCurrentSrc: rawSrc
          });
          if (blobResult?.ok && Array.isArray(blobResult.chunks) && blobResult.chunks.length > 0) {
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
        recordDebug(
          "CONTENT",
          "ensure.sw_dispatch",
          `Sending ENSURE_SUBTITLES to Service Worker (variants=${mediaVariants.length}, staged=${Boolean(
            stagedJobId
          )})`
        );
        const res = await dispatchEnsureSubtitles({
          type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
          stagedJobId,
          force: Boolean(force),
          cacheKey,
          artifactId,
          mediaToken,
          artifact: {
            cacheKey,
            artifactId,
            notebookId: artifact?.notebookId || getNotebookIdFromUrl(),
            mediaToken,
            title,
            language: artifact?.language || null,
            mediaUrl: primaryMediaUrl,
            // The stream Chrome is already playing is the most reliable download
            // candidate, so the service worker tries it before probing variants.
            playingUrl: isTrustedGoogleMediaUrl(rawSrc) && !isThumbnailOrManifestUrl(rawSrc) ? rawSrc : "",
            progressiveUrl: artifact?.progressiveUrl && !isThumbnailOrManifestUrl(artifact.progressiveUrl) && artifact.progressiveUrl || primaryMediaUrl,
            mediaVariants,
            durationSeconds: artifact?.durationSeconds || (Number.isFinite(video.duration) ? video.duration : null)
          }
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
          language: saved.language || artifact?.language || "en"
        });
        debugDrawer?.updateSummary({ status: `ready (${saved.cues.length} cues)` });
        const ratioDetail = saved.extractedBytes && saved.originalBytes ? ` \xB7 ${(saved.extractedBytes / 1048576).toFixed(1)} MB audio` : "";
        recordDebug(
          "CONTENT",
          "ensure.ok",
          `Rendered ${saved.cues.length} cues via ${saved.provider || "AI"}${ratioDetail}`,
          "ok"
        );
        showToast(
          res.cached ? `Loaded cached subtitles (${saved.cues.length} cues)` : `Subtitles ready (${saved.cues.length} cues)`,
          `${saved.provider || "AI"}${ratioDetail} \xB7 ${saved.title || title}`,
          "success",
          5200,
          {
            actionLabel: "Transcript",
            onAction: () => controller.toggleTranscriptDrawer(true)
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
    function insertCitationIntoNotebookChat(formattedText) {
      try {
        const selectors = [
          'textarea[aria-label*="query" i]',
          'textarea[placeholder*="typing" i]',
          'textarea[placeholder*="Ask" i]',
          "textarea.query-box-input",
          "chat-panel textarea"
        ];
        let target = null;
        for (const sel of selectors) {
          const el = doc.querySelector?.(sel);
          if (el && !el.disabled && !el.readOnly) {
            target = el;
            break;
          }
        }
        if (!target) return false;
        const existing = String(target.value || "").trim();
        target.value = existing ? `${existing}
${formattedText} ` : `${formattedText} `;
        if (typeof Event === "function") {
          target.dispatchEvent(new Event("input", { bubbles: true }));
        }
        target.focus?.();
        return true;
      } catch {
        return false;
      }
    }
    function bindVideoElement(video) {
      if (!video || video.__lmSubsInternal || controllers.has(video)) {
        return controllers.get(video) || null;
      }
      const isAudioEl = String(video?.tagName || "").toUpperCase() === "AUDIO";
      if (!isAudioEl && isLikelySilentCardPreviewVideo(video)) {
        return null;
      }
      if (isAudioEl) {
        const aSrc = String(video.currentSrc || video.src || "");
        if (aSrc.startsWith("data:audio/wav") && video.duration > 0 && video.duration < 3) {
          return null;
        }
      }
      const mediaKind = isAudioEl ? "audio" : "video";
      const entry = {
        video,
        mediaKind,
        controller: null,
        artifactId: null,
        mediaToken: null,
        cacheKey: null,
        inFlight: false
      };
      const controller = new VideoSubtitleController(video, {
        doc,
        mediaKind,
        initialFontSize: settings.fontSize,
        initialCaptionStyle: settings.captionStyle,
        initialFontFamily: settings.captionFontFamily,
        initialCaptionColor: settings.captionColor,
        initialBgOpacity: settings.captionBgOpacity,
        initialCaptionPosition: settings.captionPosition,
        initialCaptionMaxWidth: settings.captionMaxWidth,
        initialKaraokeHighlight: settings.karaokeHighlight,
        initialKaraokeDelayMs: settings.karaokeDelayMs,
        initialShowSpeakerLabels: settings.showSpeakerLabels,
        initialPauseOnCaptionHover: settings.pauseOnCaptionHover,
        initialClickCaptionToCopy: settings.clickCaptionToCopy,
        initialPlaybackSpeed: settings.defaultPlaybackSpeed,
        initialOffsetSec: settings.subtitleOffsetSec,
        initialFineGrainedControls: settings.fineGrainedControls,
        initialDynamicCaptionScaling: settings.dynamicCaptionScaling,
        initialCaptionScaleFactor: settings.captionScaleFactor,
        initialCaptionMinFontPx: settings.captionMinFontPx,
        initialCaptionMaxFontPx: settings.captionMaxFontPx,
        initialCaptionPaddingY: settings.captionPaddingY,
        initialCaptionPaddingX: settings.captionPaddingX,
        initialCaptionBorderRadius: settings.captionBorderRadius,
        initialCaptionLineHeight: settings.captionLineHeight,
        initialCaptionBottomOffsetPx: settings.captionBottomOffsetPx,
        initialCaptionTextStrokePx: settings.captionTextStrokePx,
        initialKaraokeHighlightOpacity: settings.karaokeHighlightOpacity,
        initialUpcomingWordOpacity: settings.upcomingWordOpacity,
        initialPlayBarDockMode: settings.playBarDockMode,
        initialHoverFadeDelayMs: settings.hoverFadeDelayMs,
        initialKeepSubtitlesInPiP: settings.keepSubtitlesInPiP,
        initialSkipSilenceEnabled: settings.skipSilenceEnabled,
        initialSkipSilenceGapSec: settings.skipSilenceGapSec,
        initialSkipSilenceRate: settings.skipSilenceRate,
        initialAudioBoostPercent: settings.audioBoostPercent,
        onTelemetry: (patch) => {
          recordNotebookTelemetry(patch, entry.mediaKind);
        },
        onRequestGenerate: ({ force } = {}) => {
          ensureSubtitlesForEntry(entry, {
            force: Boolean(force),
            trigger: "manual"
          });
        },
        onFontSizeChange: (fontSize) => {
          settings.fontSize = fontSize;
          saveSettings({ fontSize }).catch(() => {
          });
        },
        onCaptionStyleChange: (captionStyle) => {
          settings.captionStyle = captionStyle;
          saveSettings({ captionStyle }).catch(() => {
          });
        },
        onStylePatchChange: (patch) => {
          settings = { ...settings, ...patch };
          saveSettings(patch).catch(() => {
          });
        },
        onCuesMutated: (nextCues) => {
          if (!entry.cacheKey) return;
          sendRuntimeMessage({
            type: RUNTIME_MESSAGE.UPDATE_CACHED_SUBTITLES,
            cacheKey: entry.cacheKey,
            title: controller.title,
            cues: nextCues
          }).catch(() => {
          });
        },
        onCiteCue: (formattedText) => {
          const inserted = insertCitationIntoNotebookChat(formattedText);
          if (inserted) {
            showToast(
              "Inserted timestamped quote into NotebookLM chat",
              formattedText.slice(0, 68),
              "success",
              2800
            );
          }
          return inserted;
        },
        onOffsetChange: (subtitleOffsetSec) => {
          settings.subtitleOffsetSec = subtitleOffsetSec;
          saveSettings({ subtitleOffsetSec }).catch(() => {
          });
        },
        onImportSubtitles: (cues, fileName) => {
          const artifact = matchArtifactForVideo(video);
          const mediaUrl = artifact?.mediaUrl || video.currentSrc || video.src || "";
          const mediaToken = artifact?.mediaToken || extractMediaToken(mediaUrl);
          const cacheKey = resolveSubtitleCacheKey({
            artifactId: artifact?.artifactId,
            mediaToken,
            mediaUrl
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
              cues
            }
          });
          cachedKeys.add(cacheKey);
          showToast(
            `Imported ${cues.length} cues`,
            fileName,
            "success",
            3200
          );
        }
      });
      entry.controller = controller;
      controllers.set(video, entry);
      lastActiveVideo = video;
      recordDebug(
        "CONTENT",
        isAudioEl ? "audio.bound" : "video.bound",
        `Bound <${mediaKind}> overlay (mounted=${Boolean(
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
      const mediaEls = collectMediaElementsDeep(doc);
      for (const mediaEl of mediaEls) {
        bindVideoElement(mediaEl);
      }
    }
    function ingestArtifactsList(artifacts = [], isCreateMediaRequest = false, isAudioCreate = false) {
      if (isCreateMediaRequest) {
        createIntentTimestamp = Date.now();
        showToast(
          isAudioCreate ? "Audio Overview queued" : "Video Overview queued",
          "Subtitles will generate automatically as soon as rendering finishes.",
          "info",
          4e3
        );
      }
      if (!Array.isArray(artifacts) || artifacts.length === 0) return;
      let newlyReadyCount = 0;
      for (const art of artifacts) {
        if (!art?.artifactId) continue;
        const previous = artifactsById.get(art.artifactId);
        if (art.status === "initializing" || art.status === "processing" || isCreateMediaRequest && !previous || Date.now() - createIntentTimestamp < 45e3) {
          pendingGeneratedVideoIds.add(art.artifactId);
        }
        artifactsById.set(art.artifactId, art);
        if (art.mediaToken) {
          artifactsByToken.set(art.mediaToken, art);
        }
        if (art.status === "ready" && (art.mediaUrl || art.progressiveUrl || art.mediaVariants?.length) && previous?.status !== "ready") {
          newlyReadyCount++;
          recordDebug(
            "CONTENT",
            "artifact.ready",
            `Artifact ${art.artifactId.slice(0, 8)} ready ("${(art.title || "Untitled").slice(0, 34)}") variants=${art.mediaVariants?.length || 0}`,
            "ok"
          );
        }
      }
      if (debugDrawer) {
        debugDrawer.updateSummary({
          artifacts: artifactsById.size,
          videos: controllers.size
        });
      }
      if (newlyReadyCount > 0) {
        for (const entry of controllers.values()) {
          if (entry.controller.cues.length === 0 && !entry.inFlight) {
            ensureSubtitlesForEntry(entry, {
              force: false,
              trigger: "player_open"
            });
          }
        }
      }
      for (const art of artifacts) {
        if (art.status === "ready" && (art.mediaUrl || art.progressiveUrl || art.mediaVariants?.length) && pendingGeneratedVideoIds.has(art.artifactId)) {
          const isAudioArt = art.typeCode === ARTIFACT_TYPE.AUDIO_OVERVIEW || art.mediaKind === "audio";
          const primaryUrl = art.mediaVariants?.[0] || art.progressiveUrl || art.mediaUrl;
          const decision = shouldGenerateSubtitles({
            settings,
            trigger: "generate",
            force: false,
            typeCode: art.typeCode,
            mediaKind: isAudioArt ? "audio" : "video",
            status: "ready",
            title: art.title || getNotebookTitleFallback(),
            artifactId: art.artifactId,
            mediaToken: art.mediaToken,
            mediaUrl: primaryUrl,
            cachedKeys,
            inFlightKeys,
            exhaustedKeys
          });
          if (decision.allow) {
            pendingGeneratedVideoIds.delete(art.artifactId);
            inFlightKeys.add(decision.cacheKey);
            startKeepalive();
            showToast(
              isAudioArt ? "Audio Overview ready, generating subtitles\u2026" : "Video Overview ready, generating subtitles\u2026",
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
                durationSeconds: art.durationSeconds || null
              }
            }).then((res) => {
              if (res?.ok && res.entry?.cues?.length > 0) {
                cachedKeys.add(decision.cacheKey);
                showToast(
                  `Subtitles ready (${res.entry.cues.length} cues)`,
                  `Open "${art.title || (isAudioArt ? "Audio Overview" : "Video Overview")}" to follow with CC`,
                  "success",
                  4500
                );
                scanForVideos();
              }
            }).finally(() => {
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
          duration: Number.isFinite(video.duration) ? Math.round(video.duration * 10) / 10 : null,
          readyState: video.readyState,
          srcSummary: summarizeMediaUrlForDebug(video.currentSrc || video.src || "")
        });
      }
      const artifacts = [...artifactsById.values()].map((a) => ({
        id: a.artifactId?.slice(0, 12),
        status: a.status,
        origin: a.origin || "rpc",
        variantCount: a.mediaVariants?.length || 0,
        mediaSummary: summarizeMediaUrlForDebug(
          a.mediaVariants?.[0] || a.progressiveUrl || a.mediaUrl || ""
        )
      }));
      return {
        host: win.location?.hostname || "",
        pathname: win.location?.pathname || "",
        artifactCount: artifacts.length,
        videoCount: videos.length,
        permissionsOk,
        artifacts,
        videos
      };
    }
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
        if (p.event === "video.play" || p.event === "audio.play") {
          scanForVideos();
        }
        return;
      }
      if (msg.type === PAGE_MESSAGE.REMOTE_AUDIO_STATE) {
        const snap = msg.payload || {};
        if (!snap.audioId) return;
        let proxy = remoteAudioProxies.get(snap.audioId);
        if (!proxy) {
          proxy = new RemoteAudioElementProxy(snap.audioId, (command, value) => {
            try {
              win.postMessage(
                {
                  source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
                  type: PAGE_MESSAGE.REMOTE_AUDIO_COMMAND,
                  payload: { audioId: snap.audioId, command, value }
                },
                getPostOrigin()
              );
            } catch {
            }
          });
          remoteAudioProxies.set(snap.audioId, proxy);
        }
        proxy.applySnapshot(snap);
        const entry = bindVideoElement(proxy);
        if (entry && entry.controller.cues.length === 0 && !entry.inFlight && (snap.src || artifactsById.size > 0)) {
          ensureSubtitlesForEntry(entry, {
            force: false,
            trigger: "player_open"
          });
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
          `Synced ${snap.artifacts?.length || 0} artifact(s), ${snap.rpcTrace?.length || 0} RPC(s), ssrScanned=${Boolean(snap.ssrScanned)}`
        );
        return;
      }
      if (msg.type === PAGE_MESSAGE.BATCH_ARTIFACTS) {
        ingestArtifactsList(
          msg.payload?.artifacts || [],
          Boolean(
            msg.payload?.isCreateMediaRequest || msg.payload?.isCreateVideoRequest || msg.payload?.isCreateAudioRequest
          ),
          Boolean(msg.payload?.isCreateAudioRequest)
        );
      }
    });
    const handleCapturedMediaEvent = (event) => {
      try {
        const path = typeof event.composedPath === "function" ? event.composedPath() : [];
        const candidate = path[0] || event.target;
        const tag = String(candidate?.tagName || "").toUpperCase();
        if (tag === "VIDEO" || tag === "AUDIO") {
          const entry = bindVideoElement(candidate);
          if (entry && (event.type === "play" || event.type === "loadedmetadata")) {
            ensureSubtitlesForEntry(entry, {
              force: false,
              trigger: "player_open"
            });
          }
        }
      } catch {
      }
    };
    for (const mediaEvt of ["loadedmetadata", "canplay", "play"]) {
      doc.addEventListener?.(mediaEvt, handleCapturedMediaEvent, true);
    }
    doc.addEventListener?.("keydown", (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      for (const node of path) {
        const tag = (node?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || node?.isContentEditable) {
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
      } else if (key === "s" || key === "S") {
        active.controller.toggleStylePopover?.();
      } else if (key === "v" || key === "V") {
        active.controller.cycleCaptionPosition?.();
      } else if (key === "j" || key === "J") {
        active.controller.seekRelativeCue?.(-1);
      } else if (key === "k" || key === "K") {
        active.controller.seekRelativeCue?.(1);
      } else if (key === "l" || key === "L") {
        active.controller.toggleCueLoop?.();
      } else if (key === "m" || key === "M") {
        active.controller.toggleBookmarkActiveCue?.();
      } else if (key === "p" || key === "P") {
        active.controller.togglePictureInPicture?.();
      } else if (key === "<") {
        active.controller.cyclePlaybackSpeed?.(-1);
      } else if (key === ">") {
        active.controller.cyclePlaybackSpeed?.(1);
      } else if (key === "[") {
        active.controller.adjustOffset(-0.25);
      } else if (key === "]") {
        active.controller.adjustOffset(0.25);
      } else if (key === "{") {
        const nextMs = active.controller.adjustKaraokeDelay?.(-50) ?? 0;
        showToast(
          "Word highlight delay",
          `${nextMs > 0 ? "+" : ""}${nextMs} ms`,
          "info",
          1600
        );
      } else if (key === "}") {
        const nextMs = active.controller.adjustKaraokeDelay?.(50) ?? 0;
        showToast(
          "Word highlight delay",
          `${nextMs > 0 ? "+" : ""}${nextMs} ms`,
          "info",
          1600
        );
      } else if (key === "\\") {
        active.controller.resetOffset();
      } else if (key === "-") {
        active.controller.stepFontSize(-1);
      } else if (key === "=" || key === "+") {
        active.controller.stepFontSize(1);
      } else if (key === "b" || key === "B") {
        active.controller.cycleCaptionStyle();
      } else if (key === "x" || key === "X") {
        active.controller.captureSnapshot?.();
      } else if (key === "f" || key === "F") {
        active.controller.toggleFullscreen?.();
      } else if (key === "z" || key === "Z") {
        active.controller.toggleSkipSilence?.();
      } else if (key === "," || key === "<") {
        active.controller.seekBySeconds?.(-10);
      } else if (key === ".") {
        active.controller.seekBySeconds?.(10);
      } else if (key === "?") {
        active.controller.toggleShortcutsHelp();
      }
    });
    let lastBgTickMs = 0;
    doc.addEventListener?.("visibilitychange", () => {
      if (doc.hidden) return;
      const now = Date.now();
      if (now - lastBgTickMs < 45e3) return;
      lastBgTickMs = now;
      sendRuntimeMessage({ type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK }).catch(
        () => {
        }
      );
    });
    runtime.onMessage?.addListener((msg, _sender, sendResponse) => {
      if (!msg || typeof msg.type !== "string") return false;
      if (!msg.type.startsWith(MESSAGE_NAMESPACE)) return false;
      if (msg.type === RUNTIME_MESSAGE.SUBTITLES_UPDATED && Array.isArray(msg.entries)) {
        for (const updated of msg.entries) {
          if (!updated?.cues?.length) continue;
          for (const [, vEntry] of controllers.entries()) {
            if (updated.cacheKey && vEntry.cacheKey === updated.cacheKey || updated.artifactId && vEntry.artifactId === updated.artifactId || updated.mediaToken && vEntry.mediaToken === updated.mediaToken) {
              vEntry.controller.setCues(updated.cues, {
                title: updated.title || vEntry.controller.title || "Video Overview",
                language: updated.language || "en"
              });
              showToast(
                `Captions updated (${updated.cues.length} cues)`,
                updated.title || "Synced automatically",
                "success",
                3800,
                {
                  actionLabel: "Transcript",
                  onAction: () => vEntry.controller.toggleTranscriptDrawer(true)
                }
              );
            }
          }
        }
        return false;
      }
      if (msg.type === RUNTIME_MESSAGE.PLAY_NOTIFICATION_SOUND) {
        playNotificationSoundPreset(msg);
        return false;
      }
      if (msg.type === RUNTIME_MESSAGE.SUBTITLES_READY) {
        playCompletionChime({ force: true });
        fireTabDesktopNotification(
          `Subtitles ready: ${msg.title || "Video Overview"}`,
          `${msg.cueCount || 0} cues generated via ${msg.provider || "AI"}.`
        );
        return false;
      }
      if (msg.type === RUNTIME_MESSAGE.SUBTITLES_PROGRESS) {
        const active = pickTargetVideoEntry();
        if (active && active.inFlight) {
          active.controller.setStatus("working", msg.label || "Transcribing\u2026");
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
            language: msg.language || "en"
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
        decodeBase64MediaToWavFallback(msg.base64Media).then((chunks) => sendResponse({ ok: true, chunks })).catch(
          (err) => sendResponse({ ok: false, error: err?.message || String(err) })
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
        const activeMediaKind = target?.mediaKind || (matched?.typeCode === ARTIFACT_TYPE.AUDIO_OVERVIEW ? "audio" : matched?.mediaKind || "video");
        sendResponse({
          ok: true,
          hasVideoElement: controllers.size > 0,
          hasAudioElement: [...controllers.values()].some(
            (e) => e.mediaKind === "audio"
          ),
          mediaKind: activeMediaKind,
          videoCount: controllers.size,
          readyArtifactCount: readyArts.length,
          generatingCount: generatingArts.length,
          hasSubtitles: hasLiveCues,
          activeArtifact: matched ? {
            artifactId: matched.artifactId,
            title: matched.title,
            mediaKind: activeMediaKind
          } : target ? {
            title: target.controller.title || getNotebookTitleFallback(),
            mediaKind: activeMediaKind
          } : null,
          activeSubtitles: hasLiveCues ? {
            title: matched?.title || target.controller.title || getNotebookTitleFallback(),
            language: target.controller.language || "en",
            cues: target.controller.getExportCues()
          } : null,
          diagnostics: buildTabDiagnosticSnapshot()
        });
        return false;
      }
      if (msg.type === RUNTIME_MESSAGE.TRIGGER_ACTIVE_VIDEO) {
        requestPageStateSnapshot();
        scanForVideos();
        const target = pickTargetVideoEntry();
        if (!target) {
          const readyArt = [...artifactsById.values()].filter((a) => a.status === "ready" && (a.mediaUrl || a.progressiveUrl || a.mediaVariants?.length)).pop();
          if (!readyArt) {
            sendResponse({
              ok: false,
              error: "Open a Video or Audio Overview in NotebookLM Studio first, then click Generate."
            });
            return false;
          }
          const primaryUrl = readyArt.mediaVariants?.[0] || readyArt.progressiveUrl || readyArt.mediaUrl;
          const cacheKey = resolveSubtitleCacheKey({
            artifactId: readyArt.artifactId,
            mediaToken: readyArt.mediaToken,
            mediaUrl: primaryUrl
          });
          showToast(
            "Generating subtitles in background\u2026",
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
              durationSeconds: readyArt.durationSeconds || null
            }
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
                6e3
              );
            }
          });
          sendResponse({
            ok: true,
            title: readyArt.title || getNotebookTitleFallback()
          });
          return false;
        }
        const matched = matchArtifactForVideo(target.video);
        const title = matched?.title || target.controller.title || getNotebookTitleFallback();
        ensureSubtitlesForEntry(target, {
          force: Boolean(msg.force),
          trigger: "manual"
        });
        sendResponse({
          ok: true,
          title,
          cueCount: target.controller.cues.length
        });
        return false;
      }
      return false;
    });
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
            captionFontFamily: settings.captionFontFamily,
            captionColor: settings.captionColor,
            captionBgOpacity: settings.captionBgOpacity,
            captionPosition: settings.captionPosition,
            captionMaxWidth: settings.captionMaxWidth,
            karaokeHighlight: settings.karaokeHighlight,
            karaokeDelayMs: settings.karaokeDelayMs,
            showSpeakerLabels: settings.showSpeakerLabels,
            pauseOnCaptionHover: settings.pauseOnCaptionHover,
            clickCaptionToCopy: settings.clickCaptionToCopy,
            defaultPlaybackSpeed: settings.defaultPlaybackSpeed,
            subtitleOffsetSec: settings.subtitleOffsetSec,
            fineGrainedControls: settings.fineGrainedControls,
            dynamicCaptionScaling: settings.dynamicCaptionScaling,
            captionScaleFactor: settings.captionScaleFactor,
            captionMinFontPx: settings.captionMinFontPx,
            captionMaxFontPx: settings.captionMaxFontPx,
            captionPaddingY: settings.captionPaddingY,
            captionPaddingX: settings.captionPaddingX,
            captionBorderRadius: settings.captionBorderRadius,
            captionLineHeight: settings.captionLineHeight,
            captionBottomOffsetPx: settings.captionBottomOffsetPx,
            captionTextStrokePx: settings.captionTextStrokePx,
            karaokeHighlightOpacity: settings.karaokeHighlightOpacity,
            upcomingWordOpacity: settings.upcomingWordOpacity,
            playBarDockMode: settings.playBarDockMode,
            hoverFadeDelayMs: settings.hoverFadeDelayMs,
            keepSubtitlesInPiP: settings.keepSubtitlesInPiP,
            skipSilenceEnabled: settings.skipSilenceEnabled,
            skipSilenceGapSec: settings.skipSilenceGapSec,
            skipSilenceRate: settings.skipSilenceRate,
            audioBoostPercent: settings.audioBoostPercent
          });
        }
      });
    } catch {
    }
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
      }
    };
    win[GUARD_FLAG] = api;
    return api;
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    initContentCoordinator().catch(() => {
    });
  }
})();

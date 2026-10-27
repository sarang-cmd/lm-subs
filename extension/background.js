var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/chime.js
var chime_exports = {};
__export(chime_exports, {
  SOUND_PRESETS: () => SOUND_PRESETS,
  SOUND_PRESET_IDS: () => SOUND_PRESET_IDS,
  buildChimeWavBytes: () => buildChimeWavBytes,
  getChimeWavDataUri: () => getChimeWavDataUri,
  getSoundPresetSpec: () => getSoundPresetSpec,
  playCompletionChimeSound: () => playCompletionChimeSound,
  playNotificationSound: () => playNotificationSound,
  unlockChimeAudio: () => unlockChimeAudio
});
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
async function playNotificationSound({
  win = globalThis,
  preset = "bell",
  volume = 70,
  force = false
} = {}) {
  return playCompletionChimeSound({
    win,
    preset: preset === "none" ? "none" : preset || "bell",
    volume,
    force,
    dedupeMs: 900
  });
}
var SOUND_PRESETS, SOUND_PRESET_IDS, sharedCtx, cachedWavUris, lastChimeEpochMs;
var init_chime = __esm({
  "src/lib/chime.js"() {
    SOUND_PRESETS = Object.freeze([
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
    SOUND_PRESET_IDS = Object.freeze(SOUND_PRESETS.map((p) => p.id));
    sharedCtx = null;
    cachedWavUris = /* @__PURE__ */ new Map();
    lastChimeEpochMs = 0;
  }
});

// src/config/selectors.js
var MESSAGE_NAMESPACE = "LM_SUBS_";
var KEEPALIVE_PORT_NAME = "LM_SUBS_KEEPALIVE";
var HOSTED_CLOUD_URL = "https://lm-subs.vercel.app";
var ALARM_NAMES = Object.freeze({
  UPDATE_CHECK: "lmsubs-update-check",
  CLOUD_SYNC: "lmsubs-cloud-sync"
});
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
function fourCC(bytes, offset) {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3]
  );
}
function makeBox(type, payloadParts) {
  let payloadLen = 0;
  for (const part of payloadParts) {
    payloadLen += part.byteLength;
  }
  const total = 8 + payloadLen;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, total, false);
  const typeBytes = FOURCC_Encoder.encode(type.slice(0, 4).padEnd(4, " "));
  out.set(typeBytes.subarray(0, 4), 4);
  let cursor = 8;
  for (const part of payloadParts) {
    out.set(part, cursor);
    cursor += part.byteLength;
  }
  return out;
}
function readIsoBoxes(bytes, start = 0, end = bytes.byteLength) {
  const boxes = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = start;
  while (pos + 8 <= end) {
    const size32 = view.getUint32(pos, false);
    const type = fourCC(bytes, pos + 4);
    let headerSize = 8;
    let boxSize = size32;
    if (size32 === 1) {
      if (pos + 16 > end) break;
      const hi = view.getUint32(pos + 8, false);
      const lo = view.getUint32(pos + 12, false);
      boxSize = hi * 4294967296 + lo;
      headerSize = 16;
    } else if (size32 === 0) {
      boxSize = end - pos;
    }
    if (boxSize < headerSize || pos + boxSize > end) {
      break;
    }
    boxes.push({
      type,
      offset: pos,
      size: boxSize,
      headerSize,
      dataOffset: pos + headerSize,
      endOffset: pos + boxSize
    });
    pos += boxSize;
  }
  return boxes;
}
function parseStsc(bytes, box) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (box.dataOffset + 8 > box.endOffset) return [];
  const count = view.getUint32(box.dataOffset + 4, false);
  const entries = [];
  let cursor = box.dataOffset + 8;
  for (let i = 0; i < count && cursor + 12 <= box.endOffset; i++) {
    entries.push({
      firstChunk: view.getUint32(cursor, false),
      samplesPerChunk: view.getUint32(cursor + 4, false),
      sampleDescIndex: view.getUint32(cursor + 8, false)
    });
    cursor += 12;
  }
  return entries;
}
function parseStsz(bytes, box) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (box.dataOffset + 12 > box.endOffset) {
    return { constantSize: 0, sampleCount: 0, sizes: [] };
  }
  const constantSize = view.getUint32(box.dataOffset + 4, false);
  const sampleCount = view.getUint32(box.dataOffset + 8, false);
  const sizes = [];
  if (constantSize === 0) {
    let cursor = box.dataOffset + 12;
    for (let i = 0; i < sampleCount && cursor + 4 <= box.endOffset; i++) {
      sizes.push(view.getUint32(cursor, false));
      cursor += 4;
    }
  }
  return { constantSize, sampleCount, sizes };
}
function parseChunkOffsets(bytes, stcoBox, co64Box) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offsets = [];
  if (stcoBox && stcoBox.dataOffset + 8 <= stcoBox.endOffset) {
    const count = view.getUint32(stcoBox.dataOffset + 4, false);
    let cursor = stcoBox.dataOffset + 8;
    for (let i = 0; i < count && cursor + 4 <= stcoBox.endOffset; i++) {
      offsets.push(view.getUint32(cursor, false));
      cursor += 4;
    }
    return offsets;
  }
  if (co64Box && co64Box.dataOffset + 8 <= co64Box.endOffset) {
    const count = view.getUint32(co64Box.dataOffset + 4, false);
    let cursor = co64Box.dataOffset + 8;
    for (let i = 0; i < count && cursor + 8 <= co64Box.endOffset; i++) {
      const hi = view.getUint32(cursor, false);
      const lo = view.getUint32(cursor + 4, false);
      offsets.push(hi * 4294967296 + lo);
      cursor += 8;
    }
  }
  return offsets;
}
function buildStcoBox(offsets) {
  const payload = new Uint8Array(8 + offsets.length * 4);
  const view = new DataView(payload.buffer);
  view.setUint32(0, 0, false);
  view.setUint32(4, offsets.length, false);
  for (let i = 0; i < offsets.length; i++) {
    view.setUint32(8 + i * 4, offsets[i] >>> 0, false);
  }
  return makeBox("stco", [payload]);
}
function buildM4aFtypBox() {
  const payload = new Uint8Array(20);
  const view = new DataView(payload.buffer);
  payload.set(FOURCC_Encoder.encode("M4A "), 0);
  view.setUint32(4, 0, false);
  payload.set(FOURCC_Encoder.encode("M4A "), 8);
  payload.set(FOURCC_Encoder.encode("mp42"), 12);
  payload.set(FOURCC_Encoder.encode("isom"), 16);
  return makeBox("ftyp", [payload]);
}
function validateMediaPayload(inputBuffer, contentType = "") {
  const bytes = inputBuffer instanceof Uint8Array ? inputBuffer : new Uint8Array(inputBuffer || 0);
  if (bytes.byteLength === 0) {
    throw new Error("Media download returned 0 bytes.");
  }
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("text/html")) {
    throw new Error(
      "Received HTML instead of media stream. Refresh your NotebookLM tab so Google's media session cookie renews."
    );
  }
  if (ct.startsWith("image/")) {
    throw new Error(`Received thumbnail image (${ct}) instead of audio/video stream.`);
  }
  if (ct.includes("mpegurl") || ct.includes("dash+xml") || ct.includes("application/xml") || ct.includes("text/xml") || ct.includes("application/json") || ct.startsWith("text/plain")) {
    throw new Error(`Received streaming manifest/text (${ct}) instead of binary media.`);
  }
  if (bytes.byteLength >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    throw new Error("Received JPEG thumbnail instead of audio/video stream.");
  }
  if (bytes.byteLength >= 4 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
    throw new Error("Received PNG image instead of audio/video stream.");
  }
  if (bytes.byteLength >= 12 && fourCC(bytes, 0) === "RIFF" && fourCC(bytes, 8) === "WEBP") {
    throw new Error("Received WebP thumbnail instead of audio/video stream.");
  }
  const headAscii = String.fromCharCode(
    ...bytes.subarray(0, Math.min(48, bytes.byteLength))
  ).trimStart().toLowerCase();
  if (headAscii.startsWith("<!doctype") || headAscii.startsWith("<html")) {
    throw new Error(
      "Received an HTML document instead of video/audio bytes. Refresh NotebookLM and try again."
    );
  }
  if (headAscii.startsWith("#extm3u") || headAscii.startsWith("<?xml") || headAscii.startsWith("<mpd")) {
    throw new Error("Received HLS/DASH manifest text instead of binary audio/video.");
  }
  return bytes;
}
function inspectMp4Tracks(inputBuffer) {
  const bytes = inputBuffer instanceof Uint8Array ? inputBuffer : new Uint8Array(inputBuffer || 0);
  if (bytes.byteLength < 16) {
    return { isMp4: false, hasVideo: false, hasAudio: false, isFragmented: false };
  }
  const topBoxes = readIsoBoxes(bytes, 0, bytes.byteLength);
  const ftypBox = topBoxes.find((b) => b.type === "ftyp");
  const moovBox = topBoxes.find((b) => b.type === "moov");
  const isFragmented = topBoxes.some((b) => b.type === "moof");
  if (!ftypBox && !moovBox) {
    return { isMp4: false, hasVideo: false, hasAudio: false, isFragmented: false };
  }
  let hasVideo = false;
  let hasAudio = false;
  let hasMvex = false;
  if (moovBox) {
    const moovChildren = readIsoBoxes(bytes, moovBox.dataOffset, moovBox.endOffset);
    hasMvex = moovChildren.some((b) => b.type === "mvex");
    for (const child of moovChildren) {
      if (child.type !== "trak") continue;
      const trakChildren = readIsoBoxes(bytes, child.dataOffset, child.endOffset);
      const mdia = trakChildren.find((b) => b.type === "mdia");
      if (!mdia) continue;
      const mdiaChildren = readIsoBoxes(bytes, mdia.dataOffset, mdia.endOffset);
      const hdlr = mdiaChildren.find((b) => b.type === "hdlr");
      if (!hdlr || hdlr.dataOffset + 12 > hdlr.endOffset) continue;
      const subtype = fourCC(bytes, hdlr.dataOffset + 8);
      if (subtype === "vide") hasVideo = true;
      if (subtype === "soun") hasAudio = true;
    }
  }
  return {
    isMp4: true,
    hasVideo,
    hasAudio,
    isFragmented: isFragmented || hasMvex
  };
}
function extractAudioTrackFromMp4(inputBuffer) {
  const bytes = inputBuffer instanceof Uint8Array ? inputBuffer : new Uint8Array(inputBuffer || 0);
  if (bytes.byteLength < 32) return null;
  const topBoxes = readIsoBoxes(bytes, 0, bytes.byteLength);
  const moovBox = topBoxes.find((b) => b.type === "moov");
  if (!moovBox) return null;
  const moovChildren = readIsoBoxes(bytes, moovBox.dataOffset, moovBox.endOffset);
  const mvhdBox = moovChildren.find((b) => b.type === "mvhd");
  if (!mvhdBox) return null;
  const trakBoxes = moovChildren.filter((b) => b.type === "trak");
  if (trakBoxes.length === 0) return null;
  let soundTrak = null;
  let hasVideoTrak = false;
  for (const trak of trakBoxes) {
    const trakChildren = readIsoBoxes(bytes, trak.dataOffset, trak.endOffset);
    const mdia = trakChildren.find((b) => b.type === "mdia");
    if (!mdia) continue;
    const mdiaChildren = readIsoBoxes(bytes, mdia.dataOffset, mdia.endOffset);
    const hdlr = mdiaChildren.find((b) => b.type === "hdlr");
    if (!hdlr || hdlr.dataOffset + 12 > hdlr.endOffset) continue;
    const handlerSubtype = fourCC(bytes, hdlr.dataOffset + 8);
    if (handlerSubtype === "vide") {
      hasVideoTrak = true;
    } else if (handlerSubtype === "soun" && !soundTrak) {
      const minf = mdiaChildren.find((b) => b.type === "minf");
      if (!minf) continue;
      const minfChildren = readIsoBoxes(bytes, minf.dataOffset, minf.endOffset);
      const stbl = minfChildren.find((b) => b.type === "stbl");
      if (!stbl) continue;
      const stblChildren = readIsoBoxes(bytes, stbl.dataOffset, stbl.endOffset);
      soundTrak = {
        trak,
        trakChildren,
        mdia,
        mdiaChildren,
        minf,
        minfChildren,
        stbl,
        stblChildren
      };
    }
  }
  if (!soundTrak) return null;
  const stscBox = soundTrak.stblChildren.find((b) => b.type === "stsc");
  const stszBox = soundTrak.stblChildren.find((b) => b.type === "stsz");
  const stcoBox = soundTrak.stblChildren.find((b) => b.type === "stco");
  const co64Box = soundTrak.stblChildren.find((b) => b.type === "co64");
  if (!stscBox || !stszBox || !stcoBox && !co64Box) {
    return null;
  }
  const stsc = parseStsc(bytes, stscBox);
  const stsz = parseStsz(bytes, stszBox);
  const origOffsets = parseChunkOffsets(bytes, stcoBox, co64Box);
  if (stsc.length === 0 || stsz.sampleCount === 0 || origOffsets.length === 0) {
    return null;
  }
  const chunkSlices = [];
  const relativeChunkOffsets = [];
  let sampleCursor = 0;
  let stscIdx = 0;
  let totalAudioBytes = 0;
  for (let c = 0; c < origOffsets.length; c++) {
    const chunkNum1Based = c + 1;
    while (stscIdx + 1 < stsc.length && stsc[stscIdx + 1].firstChunk <= chunkNum1Based) {
      stscIdx++;
    }
    const samplesInChunk = stsc[stscIdx].samplesPerChunk;
    let chunkByteLen = 0;
    if (stsz.constantSize > 0) {
      chunkByteLen = samplesInChunk * stsz.constantSize;
      sampleCursor += samplesInChunk;
    } else {
      if (sampleCursor + samplesInChunk > stsz.sizes.length) {
        return null;
      }
      for (let s = 0; s < samplesInChunk; s++) {
        chunkByteLen += stsz.sizes[sampleCursor++];
      }
    }
    const startByte = origOffsets[c];
    const endByte = startByte + chunkByteLen;
    if (startByte < 0 || chunkByteLen < 0 || endByte > bytes.byteLength) {
      return null;
    }
    relativeChunkOffsets.push(totalAudioBytes);
    chunkSlices.push(bytes.subarray(startByte, endByte));
    totalAudioBytes += chunkByteLen;
  }
  if (totalAudioBytes === 0 || totalAudioBytes > 2147483647) {
    return null;
  }
  const rebuildMoovWithOffsets = (chunkAbsOffsets) => {
    const newStco = buildStcoBox(chunkAbsOffsets);
    const stblParts = [];
    for (const child of soundTrak.stblChildren) {
      if (child.type === "stco" || child.type === "co64") continue;
      stblParts.push(bytes.subarray(child.offset, child.endOffset));
    }
    stblParts.push(newStco);
    const newStbl = makeBox("stbl", stblParts);
    const minfParts = soundTrak.minfChildren.map(
      (child) => child.type === "stbl" ? newStbl : bytes.subarray(child.offset, child.endOffset)
    );
    const newMinf = makeBox("minf", minfParts);
    const mdiaParts = soundTrak.mdiaChildren.map(
      (child) => child.type === "minf" ? newMinf : bytes.subarray(child.offset, child.endOffset)
    );
    const newMdia = makeBox("mdia", mdiaParts);
    const trakParts = soundTrak.trakChildren.map(
      (child) => child.type === "mdia" ? newMdia : bytes.subarray(child.offset, child.endOffset)
    );
    const newTrak = makeBox("trak", trakParts);
    const mvhdSlice = bytes.subarray(mvhdBox.offset, mvhdBox.endOffset);
    return makeBox("moov", [mvhdSlice, newTrak]);
  };
  const ftypBytes = buildM4aFtypBox();
  const placeholderMoov = rebuildMoovWithOffsets(
    new Array(origOffsets.length).fill(0)
  );
  const mdatPayloadStart = ftypBytes.byteLength + placeholderMoov.byteLength + 8;
  const finalAbsOffsets = relativeChunkOffsets.map(
    (rel) => mdatPayloadStart + rel
  );
  const finalMoov = rebuildMoovWithOffsets(finalAbsOffsets);
  const mdatTotalSize = 8 + totalAudioBytes;
  const outputSize = ftypBytes.byteLength + finalMoov.byteLength + mdatTotalSize;
  const out = new Uint8Array(outputSize);
  const outView = new DataView(out.buffer);
  let pos = 0;
  out.set(ftypBytes, pos);
  pos += ftypBytes.byteLength;
  out.set(finalMoov, pos);
  pos += finalMoov.byteLength;
  outView.setUint32(pos, mdatTotalSize, false);
  out.set(FOURCC_Encoder.encode("mdat"), pos + 4);
  pos += 8;
  for (const slice of chunkSlices) {
    out.set(slice, pos);
    pos += slice.byteLength;
  }
  return {
    bytes: out,
    mimeType: "audio/mp4",
    fileName: "audio.m4a",
    strippedVideo: hasVideoTrak,
    originalBytes: bytes.byteLength,
    extractedBytes: out.byteLength,
    chunkCount: origOffsets.length
  };
}
function planMp4AudioExtractionFromSlice(sliceBytesInput, {
  totalFileBytes = 0,
  maxGapBytes = 98304,
  maxRangeSpanBytes = 2 * 1024 * 1024
} = {}) {
  const bytes = sliceBytesInput instanceof Uint8Array ? sliceBytesInput : new Uint8Array(sliceBytesInput || 0);
  if (bytes.byteLength < 32) return null;
  const topBoxes = readIsoBoxes(bytes, 0, bytes.byteLength);
  const moovBox = topBoxes.find((b) => b.type === "moov");
  if (!moovBox) return null;
  const moovChildren = readIsoBoxes(bytes, moovBox.dataOffset, moovBox.endOffset);
  const mvhdBox = moovChildren.find((b) => b.type === "mvhd");
  if (!mvhdBox) return null;
  if (moovChildren.some((b) => b.type === "mvex")) return null;
  const trakBoxes = moovChildren.filter((b) => b.type === "trak");
  let soundTrak = null;
  let hasVideoTrak = false;
  for (const trak of trakBoxes) {
    const trakChildren = readIsoBoxes(bytes, trak.dataOffset, trak.endOffset);
    const mdia = trakChildren.find((b) => b.type === "mdia");
    if (!mdia) continue;
    const mdiaChildren = readIsoBoxes(bytes, mdia.dataOffset, mdia.endOffset);
    const hdlr = mdiaChildren.find((b) => b.type === "hdlr");
    if (!hdlr || hdlr.dataOffset + 12 > hdlr.endOffset) continue;
    const subtype = fourCC(bytes, hdlr.dataOffset + 8);
    if (subtype === "vide") {
      hasVideoTrak = true;
    } else if (subtype === "soun" && !soundTrak) {
      const minf = mdiaChildren.find((b) => b.type === "minf");
      if (!minf) continue;
      const minfChildren = readIsoBoxes(bytes, minf.dataOffset, minf.endOffset);
      const stbl = minfChildren.find((b) => b.type === "stbl");
      if (!stbl) continue;
      const stblChildren = readIsoBoxes(bytes, stbl.dataOffset, stbl.endOffset);
      soundTrak = {
        trak,
        trakChildren,
        mdia,
        mdiaChildren,
        minf,
        minfChildren,
        stbl,
        stblChildren
      };
    }
  }
  if (!soundTrak) return null;
  const stscBox = soundTrak.stblChildren.find((b) => b.type === "stsc");
  const stszBox = soundTrak.stblChildren.find((b) => b.type === "stsz");
  const stcoBox = soundTrak.stblChildren.find((b) => b.type === "stco");
  const co64Box = soundTrak.stblChildren.find((b) => b.type === "co64");
  if (!stscBox || !stszBox || !stcoBox && !co64Box) return null;
  const stsc = parseStsc(bytes, stscBox);
  const stsz = parseStsz(bytes, stszBox);
  const origOffsets = parseChunkOffsets(bytes, stcoBox, co64Box);
  if (stsc.length === 0 || stsz.sampleCount === 0 || origOffsets.length === 0) {
    return null;
  }
  const audioChunks = [];
  const relativeChunkOffsets = [];
  let sampleCursor = 0;
  let stscIdx = 0;
  let totalAudioBytes = 0;
  for (let c = 0; c < origOffsets.length; c++) {
    const chunkNum1Based = c + 1;
    while (stscIdx + 1 < stsc.length && stsc[stscIdx + 1].firstChunk <= chunkNum1Based) {
      stscIdx++;
    }
    const samplesInChunk = stsc[stscIdx].samplesPerChunk;
    let chunkByteLen = 0;
    if (stsz.constantSize > 0) {
      chunkByteLen = samplesInChunk * stsz.constantSize;
      sampleCursor += samplesInChunk;
    } else {
      if (sampleCursor + samplesInChunk > stsz.sizes.length) return null;
      for (let s = 0; s < samplesInChunk; s++) {
        chunkByteLen += stsz.sizes[sampleCursor++];
      }
    }
    const startByte = origOffsets[c];
    const endByteExclusive = startByte + chunkByteLen;
    if (startByte < 0 || chunkByteLen <= 0 || totalFileBytes > 0 && endByteExclusive > totalFileBytes) {
      return null;
    }
    relativeChunkOffsets.push(totalAudioBytes);
    audioChunks.push({
      startByte,
      endByteExclusive,
      length: chunkByteLen,
      destRelOffset: totalAudioBytes
    });
    totalAudioBytes += chunkByteLen;
  }
  if (totalAudioBytes === 0 || totalAudioBytes > 2147483647) return null;
  const rebuildMoovWithOffsets = (chunkAbsOffsets) => {
    const newStco = buildStcoBox(chunkAbsOffsets);
    const stblParts = [];
    for (const child of soundTrak.stblChildren) {
      if (child.type === "stco" || child.type === "co64") continue;
      stblParts.push(bytes.subarray(child.offset, child.endOffset));
    }
    stblParts.push(newStco);
    const newStbl = makeBox("stbl", stblParts);
    const minfParts = soundTrak.minfChildren.map(
      (child) => child.type === "stbl" ? newStbl : bytes.subarray(child.offset, child.endOffset)
    );
    const newMinf = makeBox("minf", minfParts);
    const mdiaParts = soundTrak.mdiaChildren.map(
      (child) => child.type === "minf" ? newMinf : bytes.subarray(child.offset, child.endOffset)
    );
    const newMdia = makeBox("mdia", mdiaParts);
    const trakParts = soundTrak.trakChildren.map(
      (child) => child.type === "mdia" ? newMdia : bytes.subarray(child.offset, child.endOffset)
    );
    const newTrak = makeBox("trak", trakParts);
    const mvhdSlice = bytes.subarray(mvhdBox.offset, mvhdBox.endOffset);
    return makeBox("moov", [mvhdSlice, newTrak]);
  };
  const ftypBytes = buildM4aFtypBox();
  const placeholderMoov = rebuildMoovWithOffsets(
    new Array(origOffsets.length).fill(0)
  );
  const mdatPayloadStart = ftypBytes.byteLength + placeholderMoov.byteLength + 8;
  const finalAbsOffsets = relativeChunkOffsets.map(
    (rel) => mdatPayloadStart + rel
  );
  const finalMoov = rebuildMoovWithOffsets(finalAbsOffsets);
  const sortedChunks = [...audioChunks].sort((a, b) => a.startByte - b.startByte);
  const coalescedRanges = [];
  for (const ch of sortedChunks) {
    const prev = coalescedRanges[coalescedRanges.length - 1];
    if (prev && ch.startByte - prev.endExclusive <= maxGapBytes && ch.endByteExclusive - prev.start <= maxRangeSpanBytes) {
      prev.endExclusive = Math.max(prev.endExclusive, ch.endByteExclusive);
      prev.chunks.push(ch);
    } else {
      coalescedRanges.push({
        start: ch.startByte,
        endExclusive: ch.endByteExclusive,
        chunks: [ch]
      });
    }
  }
  return {
    ftypBytes,
    finalMoov,
    mdatPayloadStart,
    totalAudioBytes,
    hasVideoTrak,
    chunkCount: origOffsets.length,
    coalescedRanges
  };
}
async function extractAudioViaHttpRange({
  url,
  credentials = "include",
  totalBytes = 0,
  fetchImpl = globalThis.fetch,
  concurrency = 8,
  probeBytes = 1024 * 1024
}) {
  async function fetchRangeSlice(start, endInclusive) {
    const res = await fetchImpl(url, {
      method: "GET",
      credentials,
      headers: {
        Range: `bytes=${start}-${endInclusive}`
      }
    });
    if (res.status !== 206) {
      return null;
    }
    let resolvedTotal = totalBytes;
    const contentRange = res.headers?.get?.("content-range") || "";
    const crMatch = contentRange.match(/\/(\d+)$/);
    if (crMatch) {
      resolvedTotal = Number(crMatch[1]) || resolvedTotal;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    return { bytes: buf, totalBytes: resolvedTotal };
  }
  const headEnd = totalBytes > 0 ? Math.min(totalBytes - 1, probeBytes - 1) : probeBytes - 1;
  const headRes = await fetchRangeSlice(0, headEnd);
  if (!headRes || headRes.bytes.byteLength < 32) return null;
  const knownTotal = headRes.totalBytes || totalBytes;
  let moovSliceForReplan = headRes.bytes;
  let plan = planMp4AudioExtractionFromSlice(headRes.bytes, {
    totalFileBytes: knownTotal
  });
  if (!plan && knownTotal > headRes.bytes.byteLength) {
    const view = new DataView(
      headRes.bytes.buffer,
      headRes.bytes.byteOffset,
      headRes.bytes.byteLength
    );
    let pos = 0;
    let moovOffset = -1;
    let moovSize = 0;
    while (pos + 8 <= headRes.bytes.byteLength) {
      const sz = view.getUint32(pos, false);
      const tp = fourCC(headRes.bytes, pos + 4);
      if (tp === "moov" && sz >= 32) {
        moovOffset = pos;
        moovSize = sz;
        break;
      }
      if (sz < 8) break;
      pos += sz;
    }
    if (moovOffset >= 0 && moovOffset + moovSize <= knownTotal && moovSize <= 16 * 1024 * 1024) {
      const fullMoov = await fetchRangeSlice(moovOffset, moovOffset + moovSize - 1);
      if (fullMoov) {
        moovSliceForReplan = fullMoov.bytes;
        plan = planMp4AudioExtractionFromSlice(fullMoov.bytes, {
          totalFileBytes: knownTotal
        });
      }
    } else {
      const tailLen = Math.min(knownTotal, Math.round(1.5 * 1024 * 1024));
      const tailStart = Math.max(0, knownTotal - tailLen);
      const tailRes = await fetchRangeSlice(tailStart, knownTotal - 1);
      if (tailRes) {
        const tb = tailRes.bytes;
        const tv = new DataView(tb.buffer, tb.byteOffset, tb.byteLength);
        for (let i = 0; i + 8 <= tb.byteLength; i++) {
          if (tb[i + 4] === 109 && // m
          tb[i + 5] === 111 && // o
          tb[i + 6] === 111 && // o
          tb[i + 7] === 118) {
            const sz = tv.getUint32(i, false);
            if (sz >= 32 && i + sz <= tb.byteLength) {
              const tailMoovSlice = tb.subarray(i, i + sz);
              plan = planMp4AudioExtractionFromSlice(tailMoovSlice, {
                totalFileBytes: knownTotal
              });
              if (plan) {
                moovSliceForReplan = tailMoovSlice;
                break;
              }
            }
          }
        }
      }
    }
  }
  if (!plan) return null;
  if (plan.coalescedRanges.length > 28) {
    const widerPlan = planMp4AudioExtractionFromSlice(
      moovSliceForReplan || headRes.bytes,
      {
        totalFileBytes: knownTotal,
        maxGapBytes: 262144,
        maxRangeSpanBytes: 4 * 1024 * 1024
      }
    );
    if (widerPlan && widerPlan.coalescedRanges.length < plan.coalescedRanges.length) {
      plan = widerPlan;
    }
  }
  if (plan.coalescedRanges.length > 48 && knownTotal > 0 && knownTotal <= 24 * 1024 * 1024) {
    return null;
  }
  const plannedDownloadBytes = plan.coalescedRanges.reduce(
    (sum, r) => sum + (r.endExclusive - r.start),
    0
  );
  if (plannedDownloadBytes > 64 * 1024 * 1024) {
    return null;
  }
  const mdatTotalSize = 8 + plan.totalAudioBytes;
  const outputSize = plan.ftypBytes.byteLength + plan.finalMoov.byteLength + mdatTotalSize;
  const out = new Uint8Array(outputSize);
  const outView = new DataView(out.buffer);
  let cursor = 0;
  out.set(plan.ftypBytes, cursor);
  cursor += plan.ftypBytes.byteLength;
  out.set(plan.finalMoov, cursor);
  cursor += plan.finalMoov.byteLength;
  outView.setUint32(cursor, mdatTotalSize, false);
  out.set(FOURCC_Encoder.encode("mdat"), cursor + 4);
  let rangeIndex = 0;
  let downloadedRangeBytes = headRes.bytes.byteLength;
  let rangeErr = null;
  async function rangeWorker() {
    while (!rangeErr) {
      const idx = rangeIndex++;
      if (idx >= plan.coalescedRanges.length) return;
      const r = plan.coalescedRanges[idx];
      try {
        let sliceBytes;
        if (r.endExclusive <= headRes.bytes.byteLength) {
          sliceBytes = headRes.bytes.subarray(r.start, r.endExclusive);
        } else {
          const fetched = await fetchRangeSlice(r.start, r.endExclusive - 1);
          if (!fetched || fetched.bytes.byteLength < r.endExclusive - r.start) {
            throw new Error("Incomplete HTTP 206 range response");
          }
          downloadedRangeBytes += fetched.bytes.byteLength;
          sliceBytes = fetched.bytes;
        }
        for (const ch of r.chunks) {
          const localStart = ch.startByte - r.start;
          const localEnd = localStart + ch.length;
          out.set(
            sliceBytes.subarray(localStart, localEnd),
            plan.mdatPayloadStart + ch.destRelOffset
          );
        }
      } catch (e) {
        rangeErr = e;
      }
    }
  }
  const workers = Math.max(
    1,
    Math.min(concurrency, plan.coalescedRanges.length)
  );
  await Promise.all(Array.from({ length: workers }, () => rangeWorker()));
  if (rangeErr) return null;
  return {
    bytes: out,
    mimeType: "audio/mp4",
    fileName: "audio.m4a",
    strippedVideo: plan.hasVideoTrak,
    originalBytes: knownTotal || outputSize,
    downloadedBytes: downloadedRangeBytes,
    extractedBytes: out.byteLength,
    rangeCount: plan.coalescedRanges.length
  };
}
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
function createTestSpeechCadenceWav(durationSec = 1.1, sampleRate = 16e3) {
  const count = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const envelope = t > 0.12 && t < durationSec - 0.12 ? 0.08 : 0;
    samples[i] = envelope * Math.sin(2 * Math.PI * 220 * t);
  }
  return encodeMonoWav16Bit(samples, sampleRate);
}
function resolveAvoidedVideoBytes({
  originalBytes = 0,
  extractedBytes = 0,
  durationSeconds = 0,
  cues = []
} = {}) {
  const orig = Math.max(0, Math.round(Number(originalBytes) || 0));
  const ext = Math.max(0, Math.round(Number(extractedBytes) || 0));
  if (orig > ext && ext > 0) {
    return {
      originalBytes: orig,
      extractedBytes: ext,
      savedBytes: orig - ext
    };
  }
  let dur = Number(durationSeconds) || 0;
  if (dur <= 0 && Array.isArray(cues) && cues.length > 0) {
    for (const c of cues) {
      const end = Number(c?.endSec ?? c?.end ?? 0);
      if (Number.isFinite(end) && end > dur) dur = end;
    }
  }
  if (ext > 0) {
    const byRatio = Math.round(ext * 6.5);
    const byDuration = dur > 0 ? Math.round(dur * 112 * 1024) : 0;
    const estimatedVideoBytes = Math.max(
      ext + 1024,
      byDuration > ext ? byDuration : byRatio
    );
    return {
      originalBytes: estimatedVideoBytes,
      extractedBytes: ext,
      savedBytes: Math.max(0, estimatedVideoBytes - ext)
    };
  }
  if (dur > 0) {
    const estExt = Math.round(dur * 16 * 1024);
    const estOrig = Math.round(dur * 112 * 1024);
    return {
      originalBytes: estOrig,
      extractedBytes: estExt,
      savedBytes: Math.max(0, estOrig - estExt)
    };
  }
  return {
    originalBytes: orig,
    extractedBytes: ext,
    savedBytes: Math.max(0, orig - ext)
  };
}

// src/lib/batchexecute.js
var FIFE_NOTEBOOKLM_TOKEN_RE = /\/(?:rd-)?notebook(?:lm)?\/([A-Za-z0-9_-]{16,})/;
var FIFE_SUFFIX_RE = /=[A-Za-z0-9_,.-]+$/;
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
function deriveGoogleMediaVariants(mediaUrl) {
  if (typeof mediaUrl !== "string" || !mediaUrl) return [];
  const out = [];
  const pushUnique = (u) => {
    if (u && !out.includes(u)) out.push(u);
  };
  const isTrusted = isTrustedGoogleMediaUrl(mediaUrl);
  const tokenMatch = isTrusted ? mediaUrl.match(FIFE_NOTEBOOKLM_TOKEN_RE) : null;
  const isFifeNonRd = isTrusted && tokenMatch && !mediaUrl.includes("/rd-notebooklm/");
  const isGoogleUserContent = isFifeNonRd && mediaUrl.includes("googleusercontent.com/notebooklm/");
  if (isFifeNonRd) {
    const base = mediaUrl.replace(FIFE_SUFFIX_RE, "");
    const token = tokenMatch[1];
    if (base !== mediaUrl || !FIFE_SUFFIX_RE.test(mediaUrl)) {
      pushUnique(`${base}=m140`);
      pushUnique(`${base}=m140-dv`);
    }
    if (isGoogleUserContent) {
      pushUnique(`https://lh3.google.com/notebooklm/${token}=m140`);
      pushUnique(`https://lh3.google.com/notebooklm/${token}=m140-dv`);
    }
    if (base !== mediaUrl || !FIFE_SUFFIX_RE.test(mediaUrl)) {
      pushUnique(`${base}=m18`);
    }
    if (isGoogleUserContent) {
      pushUnique(`https://lh3.google.com/notebooklm/${token}=m18`);
    }
    if (base !== mediaUrl || !FIFE_SUFFIX_RE.test(mediaUrl)) {
      pushUnique(`${base}=m22`);
      pushUnique(`${base}=m22-dv`);
    }
    if (isGoogleUserContent) {
      pushUnique(`https://lh3.google.com/notebooklm/${token}=m22`);
    }
  }
  if (!isThumbnailOrManifestUrl(mediaUrl)) {
    pushUnique(mediaUrl);
  }
  return out;
}

// src/lib/media-download.js
var MEDIA_DOWNLOAD_DEADLINE_MS = 15e4;
var MEDIA_SEGMENT_BYTES = 4 * 1024 * 1024;
var MEDIA_PARALLEL_SEGMENTS = 6;
var MEDIA_PARALLEL_MIN_BYTES = 6 * 1024 * 1024;
var AUDIO_ONLY_SUFFIX_REGEX = /=m(?:140|4a)(?:[-_,]|$)/i;
function isAudioOnlyVariantUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl) return false;
  return AUDIO_ONLY_SUFFIX_REGEX.test(rawUrl);
}
function dedupeUrls(list) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const url of list) {
    if (typeof url !== "string" || !url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}
function orderMediaCandidates({
  playingUrl = "",
  mediaVariants = [],
  progressiveUrl = "",
  mediaUrl = "",
  isTrusted = () => true,
  isManifest = () => false
} = {}) {
  const playing = [playingUrl];
  const variants = Array.isArray(mediaVariants) ? mediaVariants : [];
  const audioFirst = variants.filter((u) => isAudioOnlyVariantUrl(u));
  const rest = [
    ...variants.filter((u) => !isAudioOnlyVariantUrl(u)),
    progressiveUrl,
    mediaUrl
  ];
  return dedupeUrls([...playing, ...audioFirst, ...rest]).filter(
    (u) => isTrusted(u) && !isManifest(u)
  );
}
function planRangeSegments(totalBytes, { segmentBytes = MEDIA_SEGMENT_BYTES, maxSegments = MEDIA_PARALLEL_SEGMENTS } = {}) {
  const total = Number(totalBytes) || 0;
  if (total <= 0 || segmentBytes <= 0) return [];
  const segmentCount = Math.min(
    Math.max(1, Math.ceil(total / segmentBytes)),
    Math.max(1, maxSegments)
  );
  const even = Math.ceil(total / segmentCount);
  const segments = [];
  for (let index = 0; index < segmentCount; index += 1) {
    const start = index * even;
    const end = Math.min(total - 1, start + even - 1);
    if (start > end) break;
    segments.push({ index, start, end });
  }
  return segments;
}
function makeAbortTimer(ms, controller) {
  if (!ms || ms <= 0 || typeof setTimeout !== "function") return null;
  return setTimeout(() => {
    try {
      controller.abort();
    } catch {
    }
  }, ms);
}
async function readResponseBodyWithProgress(res, { onProgress, totalBytes = 0 } = {}) {
  const reader = res?.body?.getReader?.();
  if (!reader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress?.({
      receivedBytes: buf.byteLength,
      totalBytes: totalBytes || buf.byteLength
    });
    return buf;
  }
  const chunks = [];
  let received = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    received += value.byteLength;
    onProgress?.({ receivedBytes: received, totalBytes: totalBytes || 0 });
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
async function downloadRangedParallel(url, {
  credentials = "include",
  fetchImpl = globalThis.fetch,
  totalBytes = 0,
  deadlineMs = MEDIA_DOWNLOAD_DEADLINE_MS,
  segmentBytes = MEDIA_SEGMENT_BYTES,
  concurrency = MEDIA_PARALLEL_SEGMENTS,
  onProgress
} = {}) {
  const total = Number(totalBytes) || 0;
  if (total <= 0) return null;
  const segments = planRangeSegments(total, {
    segmentBytes,
    maxSegments: concurrency
  });
  if (segments.length === 0) return null;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? makeAbortTimer(deadlineMs, controller) : null;
  const parts = new Array(segments.length).fill(null);
  let received = 0;
  const runSegment = async (segment) => {
    const res = await fetchImpl(url, {
      method: "GET",
      credentials,
      headers: { Range: `bytes=${segment.start}-${segment.end}` },
      signal: controller ? controller.signal : void 0
    });
    if (!res || res.status !== 206) {
      throw new Error(`Range request rejected (HTTP ${res?.status ?? "?"})`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    parts[segment.index] = buf;
    received += buf.byteLength;
    onProgress?.({ receivedBytes: received, totalBytes: total });
    return buf;
  };
  try {
    const queue = [...segments];
    const workers = new Array(Math.min(concurrency, segments.length)).fill(0).map(async () => {
      for (; ; ) {
        const next = queue.shift();
        if (!next) return;
        await runSegment(next);
      }
    });
    await Promise.all(workers);
    if (parts.some((part) => !part)) return null;
    const assembled = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      assembled.set(part, offset);
      offset += part.byteLength;
    }
    return {
      bytes: assembled,
      contentType: "",
      totalBytes: total,
      ranged: true
    };
  } catch {
    return null;
  } finally {
    if (timer && typeof clearTimeout === "function") clearTimeout(timer);
  }
}
function formatDownloadProgress({ receivedBytes = 0, totalBytes = 0 } = {}) {
  const mb = (value) => `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (!totalBytes) return mb(receivedBytes);
  const pct = Math.min(100, Math.round(receivedBytes / totalBytes * 100));
  return `${pct}% \xB7 ${mb(receivedBytes)} of ${mb(totalBytes)}`;
}

// src/lib/brand-logo.js
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

// src/lib/release-notes.js
var RELEASE_NOTES = Object.freeze({
  "0.2.8": Object.freeze({
    headline: "A lighter site, a deeper blog, and pages Google can read",
    highlights: Object.freeze([
      "Product screenshots load as WebP with a PNG fallback, cutting image weight by roughly two thirds",
      "The home page shows a two by two gallery of the player, the docked controls, statistics, and the install page",
      "Four new guides join the blog, and every article carries an on page index, a reading time, and next and previous links",
      "The setup guide, statistics, library, about, and welcome pages now ship real HTML, so search engines read them without running JavaScript",
      "Statistics labels match the extension exactly, including caption cues and median speed",
      "Caption buttons dock as one group in front of NotebookLM\u2019s right-hand cluster, a narrow play bar trims the extras instead of crowding the native controls, and the duplicate playback speed button is gone"
    ])
  }),
  "0.2.7": Object.freeze({
    headline: "Long Audio Overviews finish, and updates explain themselves",
    highlights: Object.freeze([
      "Audio Overviews download across six parallel streams, so a 20 minute podcast no longer outlives the background worker",
      "The update alert now lists what the new version changes instead of only naming the version",
      "Every page got roomier padding and wider content gutters, including the welcome page that opens on install",
      "New social preview cards for the site, blog and install page"
    ])
  }),
  "0.2.6": Object.freeze({
    headline: "Controls live in the play bar, and captions scale with the player",
    highlights: Object.freeze([
      "CC and caption controls dock inside NotebookLM's own bottom play bar and fade with it, so nothing blinks between cues",
      "Captions resize with the player and sidebar, from the compact Studio view to fullscreen",
      "Picture in Picture keeps live subtitles",
      "Statistics match across the website, settings page and popup",
      "Six notification chime presets replace the system beep"
    ])
  })
});
function getReleaseNotes(version) {
  const key = String(version || "").trim();
  const entry = RELEASE_NOTES[key];
  if (!entry) return null;
  return {
    version: key,
    headline: String(entry.headline || ""),
    highlights: Array.isArray(entry.highlights) ? [...entry.highlights] : []
  };
}
function resolveReleaseNotes(version, remoteNotes = null) {
  const local = getReleaseNotes(version);
  const remoteHeadline = String(remoteNotes?.headline || "");
  const remoteHighlights = Array.isArray(remoteNotes?.highlights) ? remoteNotes.highlights.filter((line) => typeof line === "string" && line.trim()) : [];
  if (local && remoteHighlights.length === 0 && !remoteHeadline) return local;
  if (remoteHighlights.length === 0 && !remoteHeadline && !local) return null;
  return {
    version: String(version || local?.version || ""),
    headline: remoteHeadline || local?.headline || "",
    highlights: remoteHighlights.length ? remoteHighlights : local?.highlights || []
  };
}
function buildUpdateNotification({ latestVersion = "", notes = null } = {}) {
  const resolved = resolveReleaseNotes(latestVersion, notes);
  const title = `Update available: LM Subs v${latestVersion}`;
  if (!resolved || resolved.highlights.length === 0) {
    return {
      title,
      body: "Open LM Subs in your toolbar to apply the update and reload.",
      items: []
    };
  }
  const [first, ...rest] = resolved.highlights;
  const more = rest.length > 0 ? ` +${rest.length} more` : "";
  return {
    title,
    body: `${first}${more}`,
    items: resolved.highlights.slice(0, 5).map((line) => ({
      title: line,
      message: ""
    }))
  };
}

// src/lib/decide.js
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

// src/lib/subtitles.js
var HALLUCINATION_PATTERNS = [
  /^thank(?:s| you)(?: very much| so much)? for watching[.!]*$/i,
  /^subtitles by\b/i,
  /^amara\.org/i,
  /^please subscribe\b/i,
  /^\[(?:music|silence|applause|blank_audio)\]$/i
];
var DEFAULT_MAX_LINE_CHARS = 42;
var DEFAULT_MAX_CUE_CHARS = 84;
var DEFAULT_MAX_DURATION_SEC = 6.2;
var DEFAULT_MIN_DURATION_SEC = 0.85;
var PAUSE_SPLIT_THRESHOLD_SEC = 0.38;
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
function cuesFromWords(words, {
  maxCueChars = DEFAULT_MAX_CUE_CHARS,
  maxDurationSec = DEFAULT_MAX_DURATION_SEC,
  offsetSec = 0
} = {}) {
  if (!Array.isArray(words) || words.length === 0) return [];
  const tokens = [];
  for (const w of words) {
    if (!w || typeof w !== "object") continue;
    const rawToken = String(w.word ?? w.text ?? "").trim();
    if (!rawToken) continue;
    if (w.type && w.type !== "word" && w.type !== "punctuation") continue;
    const start = Number(w.start ?? w.startSec);
    const end = Number(w.end ?? w.endSec ?? start + 0.25);
    if (!Number.isFinite(start)) continue;
    tokens.push({
      word: rawToken,
      start,
      end: Number.isFinite(end) ? Math.max(start + 0.05, end) : start + 0.25,
      speaker: w.speaker ?? w.speaker_id ?? null
    });
  }
  if (tokens.length === 0) return [];
  const cues = [];
  let bucket = [];
  let bucketChars = 0;
  const flushBucket = () => {
    if (bucket.length === 0) return;
    const text = bucket.map((t) => t.word).join(" ").replace(/\s+([,.;:?!])/g, "$1");
    cues.push({
      startSec: bucket[0].start,
      endSec: Math.max(bucket[0].start + DEFAULT_MIN_DURATION_SEC, bucket[bucket.length - 1].end),
      text,
      speaker: bucket[0].speaker ? String(bucket[0].speaker) : void 0
    });
    bucket = [];
    bucketChars = 0;
  };
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const prev = bucket[bucket.length - 1];
    if (prev) {
      const nextChars = bucketChars + 1 + tok.word.length;
      const nextDuration = tok.end - bucket[0].start;
      const gap = tok.start - prev.end;
      const speakerChanged = prev.speaker && tok.speaker && prev.speaker !== tok.speaker;
      const sentenceEnded = /[.?!]["')]*$/.test(prev.word);
      const clauseEnded = /[,;:—-]$/.test(prev.word);
      const shouldFlush = speakerChanged || nextChars > maxCueChars || nextDuration > maxDurationSec || sentenceEnded && (bucketChars >= 24 || gap >= 0.18) || clauseEnded && bucketChars >= 48 || gap >= PAUSE_SPLIT_THRESHOLD_SEC && bucketChars >= 20;
      if (shouldFlush) {
        flushBucket();
      }
    }
    bucket.push(tok);
    bucketChars += (bucket.length > 1 ? 1 : 0) + tok.word.length;
  }
  flushBucket();
  return normalizeAndSortCues(cues, offsetSec);
}
function isLikelyWhisperHallucination(segment) {
  const text = String(segment?.text || "").trim();
  if (!text) return true;
  const noSpeech = Number(segment?.no_speech_prob ?? 0);
  if (noSpeech > 0.85) {
    if (text.length < 48 || HALLUCINATION_PATTERNS.some((rx) => rx.test(text))) {
      return true;
    }
  }
  if (noSpeech > 0.6 && HALLUCINATION_PATTERNS.some((rx) => rx.test(text))) {
    return true;
  }
  return false;
}
function splitLongSegment(startSec, endSec, text, speaker, maxCueChars = DEFAULT_MAX_CUE_CHARS) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxCueChars && endSec - startSec <= DEFAULT_MAX_DURATION_SEC + 1.5) {
    return [{ startSec, endSec, text: clean, speaker }];
  }
  const words = clean.split(" ");
  if (words.length <= 2) {
    return [{ startSec, endSec, text: clean, speaker }];
  }
  const chunks = [];
  let currWords = [];
  let currLen = 0;
  for (const w of words) {
    const nextLen = currLen + (currWords.length > 0 ? 1 : 0) + w.length;
    const prevWord = currWords[currWords.length - 1] || "";
    const naturalBreak = /[.?!]$/.test(prevWord) && currLen >= 28 || /[,;:—]$/.test(prevWord) && currLen >= 46;
    if (currWords.length > 0 && (nextLen > maxCueChars || naturalBreak)) {
      chunks.push(currWords.join(" "));
      currWords = [w];
      currLen = w.length;
    } else {
      currWords.push(w);
      currLen = nextLen;
    }
  }
  if (currWords.length > 0) {
    chunks.push(currWords.join(" "));
  }
  const totalChars = chunks.reduce((acc, s) => acc + s.length, 0) || 1;
  const totalDur = Math.max(0.5, endSec - startSec);
  let cursor = startSec;
  return chunks.map((chunkText, idx) => {
    const share = chunkText.length / totalChars;
    const chunkEnd = idx === chunks.length - 1 ? endSec : cursor + totalDur * share;
    const cue = {
      startSec: cursor,
      endSec: chunkEnd,
      text: chunkText,
      speaker
    };
    cursor = chunkEnd;
    return cue;
  });
}
function cuesFromSegments(segments, { maxCueChars = DEFAULT_MAX_CUE_CHARS, offsetSec = 0 } = {}) {
  if (!Array.isArray(segments) || segments.length === 0) return [];
  const raw = [];
  for (const seg of segments) {
    if (!seg || typeof seg !== "object") continue;
    if (isLikelyWhisperHallucination(seg)) continue;
    const startSec = Number(seg.start ?? seg.startSec ?? seg.timestamp?.[0]);
    const endCandidate = Number(
      seg.end ?? seg.endSec ?? seg.timestamp?.[1] ?? startSec + 2.5
    );
    if (!Number.isFinite(startSec)) continue;
    const endSec = Number.isFinite(endCandidate) ? Math.max(startSec + 0.3, endCandidate) : startSec + 2.5;
    const speaker = seg.speaker ?? seg.speaker_id ?? void 0;
    const pieces = splitLongSegment(
      startSec,
      endSec,
      String(seg.text || ""),
      speaker ? String(speaker) : void 0,
      maxCueChars
    );
    raw.push(...pieces);
  }
  return normalizeAndSortCues(raw, offsetSec);
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
function getProviderSpec(providerId) {
  return PROVIDERS[providerId] || PROVIDERS.groq;
}
function resolveCustomTranscriptionUrl(customBaseUrl) {
  const raw = String(customBaseUrl || "").trim() || PROVIDERS.custom.endpoint;
  const trimmed = raw.replace(/\/+$/, "");
  if (trimmed.endsWith("/audio/transcriptions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/audio/transcriptions`;
  return `${trimmed}/v1/audio/transcriptions`;
}
function getProviderOriginPattern(providerId, customBaseUrl = "") {
  const spec = getProviderSpec(providerId);
  if (spec.id === "custom") {
    try {
      const u = new URL(resolveCustomTranscriptionUrl(customBaseUrl));
      return `${u.protocol}//${u.host}/*`;
    } catch {
      return null;
    }
  }
  return spec.originPattern;
}
function redactSecrets(message, secrets = []) {
  let out = String(message || "");
  for (const s of secrets) {
    if (typeof s !== "string") continue;
    const trimmed = s.trim();
    if (trimmed.length >= 6) {
      out = out.split(trimmed).join("[REDACTED]");
      if (trimmed.includes(":")) {
        for (const part of trimmed.split(":")) {
          if (part.length >= 6) {
            out = out.split(part).join("[REDACTED]");
          }
        }
      }
    }
  }
  return out;
}

// src/lib/providers/openai-stt.js
var ProviderHttpError = class extends Error {
  constructor(message, { status = 0, retryAfterSec = null, provider = "" } = {}) {
    super(message);
    this.name = "ProviderHttpError";
    this.status = status;
    this.retryAfterSec = retryAfterSec;
    this.provider = provider;
  }
};
function parseRetryAfterSeconds(headers) {
  if (!headers || typeof headers.get !== "function") return null;
  const raw = headers.get("retry-after");
  if (!raw) return null;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.min(60, numeric);
  }
  return null;
}
async function readErrorDetail(response, secrets = []) {
  let detail = "";
  try {
    const text = await response.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        detail = parsed?.error?.message || parsed?.message || parsed?.detail || text.slice(0, 240);
      } catch {
        detail = text.slice(0, 240);
      }
    }
  } catch {
    detail = "";
  }
  return redactSecrets(detail || `HTTP ${response.status}`, secrets);
}
function normalizeIso6391(language) {
  if (typeof language !== "string" || !language.trim()) return null;
  const base = language.trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2}$/.test(base) ? base : null;
}
function parseTranscriptionPayload(payload, offsetSec = 0, durationHintSec = null) {
  if (typeof payload === "string") {
    const parsed = parseSubtitleText(payload, offsetSec);
    if (parsed.length > 0) return parsed;
    if (payload.trim()) {
      return [
        {
          index: 1,
          startSec: offsetSec,
          endSec: offsetSec + (durationHintSec || Math.max(2, payload.length * 0.06)),
          text: payload.trim()
        }
      ];
    }
    return [];
  }
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.words) && payload.words.length > 0) {
    const wordCues = cuesFromWords(payload.words, { offsetSec });
    if (wordCues.length > 0) return wordCues;
  }
  if (Array.isArray(payload.segments) && payload.segments.length > 0) {
    const segCues = cuesFromSegments(payload.segments, { offsetSec });
    if (segCues.length > 0) return segCues;
  }
  if (typeof payload.vtt === "string" && payload.vtt.trim()) {
    const vttCues = parseSubtitleText(payload.vtt, offsetSec);
    if (vttCues.length > 0) return vttCues;
  }
  if (typeof payload.srt === "string" && payload.srt.trim()) {
    const srtCues = parseSubtitleText(payload.srt, offsetSec);
    if (srtCues.length > 0) return srtCues;
  }
  if (typeof payload.text === "string" && payload.text.trim()) {
    const maybeSub = parseSubtitleText(payload.text, offsetSec);
    if (maybeSub.length > 0) return maybeSub;
    const dur = Number(payload.duration ?? payload.usage?.prompt_audio_seconds) || durationHintSec || Math.max(2.5, payload.text.trim().length * 0.06);
    return cuesFromSegments(
      [{ start: 0, end: dur, text: payload.text.trim() }],
      { offsetSec }
    );
  }
  return [];
}
async function sendMultipartTranscription({
  url,
  providerId,
  model,
  apiKey,
  audioBytes,
  mimeType = "audio/mp4",
  fileName = "audio.m4a",
  language = null,
  isMistral = false,
  isOpenRouter = false,
  offsetSec = 0,
  durationHintSec = null,
  fetchImpl = globalThis.fetch,
  signal
}) {
  const form = new FormData();
  const blob = new Blob([audioBytes], { type: mimeType });
  form.append("file", blob, fileName);
  form.append("model", model);
  const lang2 = normalizeIso6391(language);
  if (lang2) {
    form.append("language", lang2);
  }
  if (isMistral) {
    form.append("timestamp_granularities", "segment");
  } else if (isOpenRouter) {
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
  } else {
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
  }
  const headers = {};
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  const response = await fetchImpl(url, {
    method: "POST",
    headers,
    body: form,
    signal
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey]);
    throw new ProviderHttpError(`${providerId} (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: providerId
    });
  }
  const contentType = (response.headers?.get?.("content-type") || "").toLowerCase();
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  return parseTranscriptionPayload(payload, offsetSec, durationHintSec);
}
async function callMultipartSttProvider({
  providerId,
  model,
  apiKey,
  customBaseUrl = "",
  audioBytes,
  mimeType = "audio/mp4",
  fileName = "audio.m4a",
  language = null,
  offsetSec = 0,
  durationHintSec = null,
  fetchImpl = globalThis.fetch,
  signal
}) {
  const spec = getProviderSpec(providerId);
  const resolvedModel = model && model.trim() || spec.defaultModel;
  const endpoint = spec.id === "custom" ? resolveCustomTranscriptionUrl(customBaseUrl) : spec.endpoint;
  try {
    return await sendMultipartTranscription({
      url: endpoint,
      providerId: spec.id,
      model: resolvedModel,
      apiKey,
      audioBytes,
      mimeType,
      fileName,
      language,
      isMistral: spec.protocol === "mistral-stt",
      isOpenRouter: spec.id === "openrouter",
      offsetSec,
      durationHintSec,
      fetchImpl,
      signal
    });
  } catch (err) {
    if (spec.id === "mistral" && resolvedModel === "voxtral-mini-transcribe-3" && (err?.status === 400 || err?.status === 404 || /model/i.test(err?.message || ""))) {
      return await sendMultipartTranscription({
        url: endpoint,
        providerId: spec.id,
        model: "voxtral-mini-latest",
        apiKey,
        audioBytes,
        mimeType,
        fileName,
        language,
        isMistral: true,
        offsetSec,
        durationHintSec,
        fetchImpl,
        signal
      });
    }
    throw err;
  }
}

// src/lib/providers/gemini-stt.js
function uint8ToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString("base64");
  }
  const CHUNK = 32768;
  const parts = [];
  for (let i = 0; i < arr.byteLength; i += CHUNK) {
    parts.push(
      String.fromCharCode.apply(null, arr.subarray(i, Math.min(arr.byteLength, i + CHUNK)))
    );
  }
  return btoa(parts.join(""));
}
function buildGeminiSubtitlePrompt({ language, translateTo }) {
  const langInstruction = translateTo && translateTo !== "original" ? `Translate the spoken dialogue into ${translateTo} while keeping exact spoken timestamps.` : language ? `Transcribe in the spoken language (${language}).` : "Transcribe in the exact language spoken in the audio.";
  return [
    "Transcribe this audio into strict SubRip (.srt) subtitle blocks with accurate timestamps.",
    langInstruction,
    "Rules:",
    "1. Output ONLY valid .srt subtitle blocks (index, `HH:MM:SS,mmm --> HH:MM:SS,mmm`, 1\u20132 concise lines of text).",
    "2. Keep each cue under 80 characters and 1.2\u20135.5 seconds long.",
    "3. If there is no speech in the audio, return an empty string.",
    "4. Do NOT wrap output in markdown fences or commentary."
  ].join("\n");
}
async function callGeminiSttProvider({
  model,
  apiKey,
  audioBytes,
  mimeType = "audio/mp4",
  language = null,
  translateTo = "",
  offsetSec = 0,
  fetchImpl = globalThis.fetch,
  signal
}) {
  const spec = getProviderSpec("gemini");
  const resolvedModel = model && model.trim() || spec.defaultModel;
  const url = `${spec.endpoint}/${encodeURIComponent(resolvedModel)}:generateContent`;
  const b64 = uint8ToBase64(audioBytes);
  const promptText = buildGeminiSubtitlePrompt({ language, translateTo });
  const buildBody = (includeThinkingConfig) => ({
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "audio/mp4",
              data: b64
            }
          },
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      ...includeThinkingConfig && /gemini-2\.5/i.test(resolvedModel) ? { thinkingConfig: { thinkingBudget: 0 } } : {}
    }
  });
  const send = async (withThinking) => fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(buildBody(withThinking)),
    signal
  });
  let response = await send(true);
  if (!response.ok && response.status === 400 && /gemini-2\.5/i.test(resolvedModel)) {
    response = await send(false);
  }
  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey]);
    throw new ProviderHttpError(`gemini (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: "gemini"
    });
  }
  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => typeof p?.text === "string" ? p.text : "").join("\n").trim() : "";
  if (!text) return [];
  return parseSubtitleText(text, offsetSec);
}

// src/lib/providers/native-stt.js
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function callDeepgramProvider({
  model,
  apiKey,
  audioBytes,
  mimeType = "audio/mp4",
  language = null,
  offsetSec = 0,
  fetchImpl = globalThis.fetch,
  signal
}) {
  const spec = getProviderSpec("deepgram");
  const resolvedModel = model && model.trim() || spec.defaultModel;
  const params = new URLSearchParams({
    model: resolvedModel,
    smart_format: "true",
    punctuate: "true",
    utterances: "true"
  });
  if (language && /^[a-z]{2}/i.test(language)) {
    params.set("language", language.slice(0, 2).toLowerCase());
  } else {
    params.set("detect_language", "true");
  }
  const response = await fetchImpl(`${spec.endpoint}?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": mimeType || "audio/mp4"
    },
    body: audioBytes,
    signal
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey]);
    throw new ProviderHttpError(`deepgram (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: "deepgram"
    });
  }
  const data = await response.json();
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];
  const words = alt?.words;
  if (Array.isArray(words) && words.length > 0) {
    return cuesFromWords(
      words.map((w) => ({
        word: w.punctuated_word || w.word,
        start: w.start,
        end: w.end
      })),
      { offsetSec }
    );
  }
  const utterances = data?.results?.utterances;
  if (Array.isArray(utterances) && utterances.length > 0) {
    return cuesFromSegments(
      utterances.map((u) => ({ start: u.start, end: u.end, text: u.transcript })),
      { offsetSec }
    );
  }
  return [];
}
async function callElevenLabsProvider({
  model,
  apiKey,
  audioBytes,
  mimeType = "audio/mp4",
  fileName = "audio.m4a",
  language = null,
  offsetSec = 0,
  fetchImpl = globalThis.fetch,
  signal
}) {
  const spec = getProviderSpec("elevenlabs");
  const resolvedModel = model && model.trim() || spec.defaultModel;
  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: mimeType }), fileName);
  form.append("model_id", resolvedModel);
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "false");
  if (language && /^[a-z]{2}/i.test(language)) {
    form.append("language_code", language.slice(0, 2).toLowerCase());
  }
  const response = await fetchImpl(spec.endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey
    },
    body: form,
    signal
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey]);
    throw new ProviderHttpError(`elevenlabs (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: "elevenlabs"
    });
  }
  const data = await response.json();
  if (Array.isArray(data?.words) && data.words.length > 0) {
    return cuesFromWords(data.words, { offsetSec });
  }
  if (typeof data?.text === "string" && data.text.trim()) {
    return cuesFromSegments([{ start: 0, end: 4, text: data.text.trim() }], {
      offsetSec
    });
  }
  return [];
}
async function callAssemblyAiProvider({
  model,
  apiKey,
  audioBytes,
  language = null,
  offsetSec = 0,
  pollIntervalMs = 1500,
  maxPolls = 80,
  fetchImpl = globalThis.fetch,
  signal
}) {
  const spec = getProviderSpec("assemblyai");
  const headers = { Authorization: apiKey };
  const upRes = await fetchImpl(`${spec.endpoint}/upload`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/octet-stream"
    },
    body: audioBytes,
    signal
  });
  if (!upRes.ok) {
    const detail = await readErrorDetail(upRes, [apiKey]);
    throw new ProviderHttpError(`assemblyai (${upRes.status}): ${detail}`, {
      status: upRes.status,
      retryAfterSec: parseRetryAfterSeconds(upRes.headers),
      provider: "assemblyai"
    });
  }
  const { upload_url: uploadUrl } = await upRes.json();
  const txBody = {
    audio_url: uploadUrl,
    speech_model: model && model.trim() || spec.defaultModel
  };
  if (language && /^[a-z]{2}/i.test(language)) {
    txBody.language_code = language.slice(0, 2).toLowerCase();
  } else {
    txBody.language_detection = true;
  }
  const createRes = await fetchImpl(`${spec.endpoint}/transcript`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(txBody),
    signal
  });
  if (!createRes.ok) {
    const detail = await readErrorDetail(createRes, [apiKey]);
    throw new ProviderHttpError(`assemblyai (${createRes.status}): ${detail}`, {
      status: createRes.status,
      retryAfterSec: parseRetryAfterSeconds(createRes.headers),
      provider: "assemblyai"
    });
  }
  const created = await createRes.json();
  const transcriptId = created?.id;
  if (!transcriptId) {
    throw new Error("assemblyai: missing transcript id");
  }
  for (let i = 0; i < maxPolls; i++) {
    const pollRes = await fetchImpl(`${spec.endpoint}/transcript/${transcriptId}`, {
      method: "GET",
      headers,
      signal
    });
    if (!pollRes.ok) {
      const detail = await readErrorDetail(pollRes, [apiKey]);
      throw new ProviderHttpError(`assemblyai (${pollRes.status}): ${detail}`, {
        status: pollRes.status,
        provider: "assemblyai"
      });
    }
    const statusData = await pollRes.json();
    if (statusData.status === "completed") {
      if (Array.isArray(statusData.words) && statusData.words.length > 0) {
        return cuesFromWords(
          statusData.words.map((w) => ({
            word: w.text,
            start: Number(w.start) / 1e3,
            end: Number(w.end) / 1e3
          })),
          { offsetSec }
        );
      }
      return [];
    }
    if (statusData.status === "error") {
      throw new Error(`assemblyai: ${statusData.error || "transcription failed"}`);
    }
    await sleep(pollIntervalMs);
  }
  throw new Error("assemblyai: timed out waiting for transcription");
}
async function callGladiaProvider({
  apiKey,
  audioBytes,
  mimeType = "audio/mp4",
  fileName = "audio.m4a",
  offsetSec = 0,
  pollIntervalMs = 1500,
  maxPolls = 80,
  fetchImpl = globalThis.fetch,
  signal
}) {
  const spec = getProviderSpec("gladia");
  const upForm = new FormData();
  upForm.append("audio", new Blob([audioBytes], { type: mimeType }), fileName);
  const upRes = await fetchImpl(`${spec.endpoint}/upload`, {
    method: "POST",
    headers: { "x-gladia-key": apiKey },
    body: upForm,
    signal
  });
  if (!upRes.ok) {
    const detail = await readErrorDetail(upRes, [apiKey]);
    throw new ProviderHttpError(`gladia (${upRes.status}): ${detail}`, {
      status: upRes.status,
      retryAfterSec: parseRetryAfterSeconds(upRes.headers),
      provider: "gladia"
    });
  }
  const { audio_url: audioUrl } = await upRes.json();
  const initRes = await fetchImpl(`${spec.endpoint}/pre-recorded`, {
    method: "POST",
    headers: {
      "x-gladia-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      subtitles: true,
      subtitles_config: { formats: ["srt"] }
    }),
    signal
  });
  if (!initRes.ok) {
    const detail = await readErrorDetail(initRes, [apiKey]);
    throw new ProviderHttpError(`gladia (${initRes.status}): ${detail}`, {
      status: initRes.status,
      retryAfterSec: parseRetryAfterSeconds(initRes.headers),
      provider: "gladia"
    });
  }
  const initData = await initRes.json();
  const resultUrl = initData?.result_url || `${spec.endpoint}/pre-recorded/${initData?.id}`;
  for (let i = 0; i < maxPolls; i++) {
    const pollRes = await fetchImpl(resultUrl, {
      method: "GET",
      headers: { "x-gladia-key": apiKey },
      signal
    });
    if (!pollRes.ok) {
      const detail = await readErrorDetail(pollRes, [apiKey]);
      throw new ProviderHttpError(`gladia (${pollRes.status}): ${detail}`, {
        status: pollRes.status,
        provider: "gladia"
      });
    }
    const job = await pollRes.json();
    if (job.status === "done") {
      const srtText = job?.result?.transcription?.subtitles?.[0]?.subtitles;
      if (typeof srtText === "string" && srtText.trim()) {
        return parseSubtitleText(srtText, offsetSec);
      }
      const utterances = job?.result?.transcription?.utterances;
      if (Array.isArray(utterances) && utterances.length > 0) {
        return cuesFromSegments(
          utterances.map((u) => ({ start: u.start, end: u.end, text: u.text })),
          { offsetSec }
        );
      }
      return [];
    }
    if (job.status === "error") {
      throw new Error(`gladia: ${job.error_message || "transcription failed"}`);
    }
    await sleep(pollIntervalMs);
  }
  throw new Error("gladia: timed out waiting for transcription");
}
async function callCloudflareProvider({
  model,
  apiKey,
  audioBytes,
  offsetSec = 0,
  fetchImpl = globalThis.fetch,
  signal
}) {
  const spec = getProviderSpec("cloudflare");
  const resolvedModel = model && model.trim() || spec.defaultModel;
  const sepIdx = String(apiKey || "").indexOf(":");
  if (sepIdx <= 0) {
    throw new ProviderHttpError(
      "cloudflare: enter key as ACCOUNT_ID:API_TOKEN",
      { status: 400, provider: "cloudflare" }
    );
  }
  const accountId = apiKey.slice(0, sepIdx).trim();
  const token = apiKey.slice(sepIdx + 1).trim();
  const url = `${spec.endpoint}/${encodeURIComponent(accountId)}/ai/run/${resolvedModel}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ audio: uint8ToBase64(audioBytes) }),
    signal
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey, token]);
    throw new ProviderHttpError(`cloudflare (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: "cloudflare"
    });
  }
  const data = await response.json();
  const result = data?.result || data;
  if (Array.isArray(result?.words) && result.words.length > 0) {
    return cuesFromWords(result.words, { offsetSec });
  }
  if (typeof result?.vtt === "string" && result.vtt.trim()) {
    return parseSubtitleText(result.vtt, offsetSec);
  }
  if (typeof result?.text === "string" && result.text.trim()) {
    return cuesFromSegments([{ start: 0, end: 4, text: result.text.trim() }], {
      offsetSec
    });
  }
  return [];
}
async function callHuggingFaceProvider({
  model,
  apiKey,
  audioBytes,
  offsetSec = 0,
  fetchImpl = globalThis.fetch,
  signal
}) {
  const spec = getProviderSpec("huggingface");
  const resolvedModel = model && model.trim() || spec.defaultModel;
  const url = `${spec.endpoint}/${resolvedModel}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: uint8ToBase64(audioBytes),
      parameters: { return_timestamps: true }
    }),
    signal
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey]);
    throw new ProviderHttpError(`huggingface (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: "huggingface"
    });
  }
  const data = await response.json();
  if (Array.isArray(data?.chunks) && data.chunks.length > 0) {
    return cuesFromSegments(
      data.chunks.map((c) => ({
        start: Array.isArray(c.timestamp) ? c.timestamp[0] : 0,
        end: Array.isArray(c.timestamp) && c.timestamp[1] != null ? c.timestamp[1] : (c.timestamp?.[0] || 0) + 2.5,
        text: c.text
      })),
      { offsetSec }
    );
  }
  if (typeof data?.text === "string" && data.text.trim()) {
    return cuesFromSegments([{ start: 0, end: 4, text: data.text.trim() }], {
      offsetSec
    });
  }
  return [];
}

// src/lib/providers/index.js
function sleep2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function transcribeSingleChunk({
  providerId,
  model,
  apiKey,
  customBaseUrl = "",
  audioBytes,
  mimeType = "audio/mp4",
  fileName = "audio.m4a",
  language = null,
  translateTo = "",
  offsetSec = 0,
  durationHintSec = null,
  timeoutMs = 12e4,
  fetchImpl = globalThis.fetch
}) {
  const spec = getProviderSpec(providerId);
  const resolvedModel = model && model.trim() || spec.defaultModel;
  if (spec.requiresKey && (!apiKey || !apiKey.trim())) {
    throw new ProviderHttpError(`Missing API key for ${spec.name}`, {
      status: 401,
      provider: spec.id
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    switch (spec.protocol) {
      case "openai-stt":
      case "mistral-stt":
      case "custom-openai-stt":
        return await callMultipartSttProvider({
          providerId: spec.id,
          model: resolvedModel,
          apiKey: apiKey?.trim() || "",
          customBaseUrl,
          audioBytes,
          mimeType,
          fileName,
          language,
          offsetSec,
          durationHintSec,
          fetchImpl,
          signal: controller.signal
        });
      case "gemini-stt":
        return await callGeminiSttProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          mimeType,
          language,
          translateTo,
          offsetSec,
          fetchImpl,
          signal: controller.signal
        });
      case "deepgram-stt":
        return await callDeepgramProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          mimeType,
          language,
          offsetSec,
          fetchImpl,
          signal: controller.signal
        });
      case "elevenlabs-stt":
        return await callElevenLabsProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          mimeType,
          fileName,
          language,
          offsetSec,
          fetchImpl,
          signal: controller.signal
        });
      case "assemblyai-stt":
        return await callAssemblyAiProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          language,
          offsetSec,
          fetchImpl,
          signal: controller.signal
        });
      case "gladia-stt":
        return await callGladiaProvider({
          apiKey: apiKey.trim(),
          audioBytes,
          mimeType,
          fileName,
          offsetSec,
          fetchImpl,
          signal: controller.signal
        });
      case "cloudflare-stt":
        return await callCloudflareProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          offsetSec,
          fetchImpl,
          signal: controller.signal
        });
      case "huggingface-stt":
        return await callHuggingFaceProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          offsetSec,
          fetchImpl,
          signal: controller.signal
        });
      default:
        throw new Error(`Unsupported provider protocol: ${spec.protocol}`);
    }
  } catch (err) {
    const safeMsg = redactSecrets(err?.message || String(err), [apiKey]);
    if (err?.name === "AbortError") {
      throw new ProviderHttpError(`${spec.id}: request timed out`, {
        status: 504,
        provider: spec.id
      });
    }
    if (err instanceof ProviderHttpError) {
      err.message = safeMsg;
      throw err;
    }
    const endpointHost = (() => {
      try {
        return new URL(
          spec.id === "custom" ? customBaseUrl || spec.endpoint : spec.endpoint
        ).hostname;
      } catch {
        return spec.id;
      }
    })();
    throw new ProviderHttpError(
      `${spec.id} network error (${endpointHost}): ${safeMsg}`,
      {
        status: err?.status || 0,
        provider: spec.id
      }
    );
  } finally {
    clearTimeout(timer);
  }
}
function isRetryableSingleProviderStatus(status) {
  return status === 0 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}
async function transcribeWithQueue({
  chunks,
  candidates,
  language = null,
  translateTo = "",
  timeoutMs = 9e4,
  singleProviderRetryDelayMs = 900,
  chunkConcurrency = 3,
  onPartialCues = null,
  fetchImpl = globalThis.fetch
}) {
  const audioChunks = Array.isArray(chunks) && chunks.length > 0 ? chunks : [];
  if (audioChunks.length === 0) {
    throw new Error("No audio data available to transcribe.");
  }
  const runnableCandidates = (candidates || []).filter((c) => {
    const spec = getProviderSpec(c.providerId);
    if (!spec.requiresKey) {
      return Boolean(c.enabledInQueue || c.customBaseUrl && c.customBaseUrl.trim());
    }
    return typeof c.apiKey === "string" && c.apiKey.trim().length > 0;
  });
  if (runnableCandidates.length === 0) {
    throw new Error(
      "No STT API key configured yet. Click the LM Subs toolbar icon and paste a free Groq or Mistral API key."
    );
  }
  const allSecrets = runnableCandidates.map((c) => c.apiKey).filter(Boolean);
  const attempts = [];
  const startedAt = Date.now();
  for (let idx = 0; idx < runnableCandidates.length; idx++) {
    const candidate = runnableCandidates[idx];
    const spec = getProviderSpec(candidate.providerId);
    const resolvedModel = candidate.model && candidate.model.trim() || spec.defaultModel;
    const oversizeChunk = audioChunks.find(
      (ch) => ch.bytes.byteLength > spec.maxUploadBytes
    );
    if (oversizeChunk) {
      const mb = (oversizeChunk.bytes.byteLength / (1024 * 1024)).toFixed(1);
      const capMb = (spec.maxUploadBytes / (1024 * 1024)).toFixed(0);
      attempts.push({
        provider: spec.id,
        model: resolvedModel,
        status: 413,
        error: `Extracted audio (${mb} MB) exceeds ${spec.name} ${capMb} MB upload limit`
      });
      continue;
    }
    const runCandidateOnce = async () => {
      const partGroups = new Array(audioChunks.length).fill(null);
      let nextIndex = 0;
      let completedCount = 0;
      let fatalErr = null;
      const workerCount = Math.max(
        1,
        Math.min(Number(chunkConcurrency) || 3, audioChunks.length)
      );
      async function chunkWorker() {
        while (!fatalErr) {
          const i = nextIndex++;
          if (i >= audioChunks.length) return;
          const ch = audioChunks[i];
          try {
            const partCues = await transcribeSingleChunk({
              providerId: spec.id,
              model: resolvedModel,
              apiKey: candidate.apiKey,
              customBaseUrl: candidate.customBaseUrl || "",
              audioBytes: ch.bytes,
              mimeType: ch.mimeType || "audio/mp4",
              fileName: ch.fileName || "audio.m4a",
              language,
              translateTo,
              offsetSec: ch.startOffsetSec || 0,
              durationHintSec: ch.durationSec || null,
              timeoutMs,
              fetchImpl
            });
            partGroups[i] = partCues;
            completedCount += 1;
            if (typeof onPartialCues === "function" && audioChunks.length > 1 && completedCount < audioChunks.length) {
              const ready = [];
              for (const g of partGroups) {
                if (Array.isArray(g)) ready.push(...g);
              }
              const sortedPartial = normalizeAndSortCues(ready);
              if (sortedPartial.length > 0) {
                onPartialCues({
                  cues: sortedPartial,
                  provider: spec.id,
                  providerName: spec.name,
                  model: resolvedModel,
                  completedChunks: completedCount,
                  totalChunks: audioChunks.length
                });
              }
            }
          } catch (workerErr) {
            fatalErr = workerErr;
          }
        }
      }
      await Promise.all(
        Array.from({ length: workerCount }, () => chunkWorker())
      );
      if (fatalErr) throw fatalErr;
      const merged = [];
      for (const g of partGroups) {
        if (Array.isArray(g)) merged.push(...g);
      }
      return normalizeAndSortCues(merged);
    };
    try {
      const cues = await runCandidateOnce();
      return {
        cues,
        provider: spec.id,
        providerName: spec.name,
        model: resolvedModel,
        failoverUsed: idx > 0,
        attempts,
        latencyMs: Date.now() - startedAt
      };
    } catch (err) {
      const status = err?.status || 0;
      const safeErr = redactSecrets(err?.message || String(err), allSecrets);
      if (runnableCandidates.length === 1 && isRetryableSingleProviderStatus(status)) {
        const waitMs = err?.retryAfterSec ? Math.min(4e3, Math.max(300, err.retryAfterSec * 1e3)) : singleProviderRetryDelayMs;
        await sleep2(waitMs);
        try {
          const retryCues = await runCandidateOnce();
          return {
            cues: retryCues,
            provider: spec.id,
            providerName: spec.name,
            model: resolvedModel,
            failoverUsed: false,
            attempts: [{ provider: spec.id, model: resolvedModel, status, retried: true }],
            latencyMs: Date.now() - startedAt
          };
        } catch (retryErr) {
          attempts.push({
            provider: spec.id,
            model: resolvedModel,
            status: retryErr?.status || status,
            error: redactSecrets(retryErr?.message || String(retryErr), allSecrets)
          });
          break;
        }
      }
      attempts.push({
        provider: spec.id,
        model: resolvedModel,
        status,
        error: safeErr
      });
    }
  }
  const summary = attempts.map((a) => `${a.provider}: ${a.error}`).join(" | ");
  throw new Error(summary || "All configured transcription providers failed.");
}

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
var MAX_CACHE_ENTRIES = 35;
var MAX_HISTORY_ENTRIES = 60;
var MAX_DEBUG_LOGS = 120;
var MAX_NOTIFICATIONS = 50;
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
function getModelForProvider(settings, providerId) {
  const saved = settings?.providerModels?.[providerId];
  if (typeof saved === "string" && saved.trim()) return saved.trim();
  return getProviderSpec(providerId).defaultModel;
}
async function getSecretApiKeysMap(storageArea) {
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
async function getApiKey(providerId, storageArea) {
  const map = await getSecretApiKeysMap(storageArea);
  return map[providerId] || "";
}
async function getSavedKeyPresenceMap(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.API_KEYS);
  const map = raw?.[STORAGE_KEYS.API_KEYS] || {};
  const presence = {};
  for (const id of DEFAULT_QUEUE_ORDER) {
    presence[id] = typeof map[id] === "string" && map[id].trim().length > 0;
  }
  return presence;
}
async function setApiKey(providerId, apiKey, storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.API_KEYS);
  const current = raw?.[STORAGE_KEYS.API_KEYS] && typeof raw[STORAGE_KEYS.API_KEYS] === "object" ? { ...raw[STORAGE_KEYS.API_KEYS] } : {};
  const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
  if (trimmed) {
    current[providerId] = trimmed;
  } else {
    delete current[providerId];
  }
  await store.set({ [STORAGE_KEYS.API_KEYS]: current });
}
async function getSubtitleCacheList(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.SUBTITLE_CACHE);
  const list = raw?.[STORAGE_KEYS.SUBTITLE_CACHE];
  return Array.isArray(list) ? list : [];
}
async function findCachedSubtitles({ cacheKey, artifactId, mediaToken } = {}, storageArea) {
  const list = await getSubtitleCacheList(storageArea);
  for (const item of list) {
    if (!item || !Array.isArray(item.cues) || item.cues.length === 0) continue;
    if (cacheKey && item.cacheKey === cacheKey) return item;
    if (artifactId && item.artifactId === artifactId) return item;
    if (mediaToken && item.mediaToken === mediaToken) return item;
  }
  return null;
}
async function saveCachedSubtitles(entry, storageArea) {
  const store = resolveStorage(storageArea);
  const [list, history] = await Promise.all([
    getSubtitleCacheList(store),
    getHistory(store)
  ]);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
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
    createdAt: nowIso
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
    createdAt: nowIso
  };
  const nextHistory = [
    summaryRow,
    ...history.filter((h) => h.cacheKey !== record.cacheKey)
  ].slice(0, MAX_HISTORY_ENTRIES);
  await store.set({
    [STORAGE_KEYS.SUBTITLE_CACHE]: nextCache,
    [STORAGE_KEYS.HISTORY]: nextHistory
  });
  return record;
}
async function getHistory(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.HISTORY);
  const list = raw?.[STORAGE_KEYS.HISTORY];
  return Array.isArray(list) ? list : [];
}
async function getLastStatus(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.LAST_STATUS);
  return raw?.[STORAGE_KEYS.LAST_STATUS] || null;
}
async function setLastStatus(status, storageArea) {
  const store = resolveStorage(storageArea);
  const next = {
    ...status,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await store.set({ [STORAGE_KEYS.LAST_STATUS]: next });
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
function normalizeSyncPreferences(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SYNC_PREFERENCES };
  }
  return {
    syncApiKeys: typeof raw.syncApiKeys === "boolean" ? raw.syncApiKeys : DEFAULT_SYNC_PREFERENCES.syncApiKeys,
    syncTranscripts: typeof raw.syncTranscripts === "boolean" ? raw.syncTranscripts : DEFAULT_SYNC_PREFERENCES.syncTranscripts,
    syncSettings: typeof raw.syncSettings === "boolean" ? raw.syncSettings : DEFAULT_SYNC_PREFERENCES.syncSettings
  };
}
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
function normalizeSyncServerUrl(rawUrl) {
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
async function getCloudSyncProfile(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.CLOUD_SYNC_PROFILE);
  const saved = raw?.[STORAGE_KEYS.CLOUD_SYNC_PROFILE];
  if (!saved || typeof saved !== "object") {
    return {
      ...DEFAULT_CLOUD_SYNC_PROFILE,
      syncPreferences: { ...DEFAULT_SYNC_PREFERENCES }
    };
  }
  return {
    serverUrl: normalizeSyncServerUrl(saved.serverUrl),
    connected: Boolean(saved.connected && saved.user?.email),
    autoSync: typeof saved.autoSync === "boolean" ? saved.autoSync : true,
    syncPreferences: normalizeSyncPreferences(saved.syncPreferences),
    user: saved.user && typeof saved.user === "object" ? {
      id: String(saved.user.id || ""),
      email: String(saved.user.email || ""),
      name: String(saved.user.name || ""),
      authProvider: String(saved.user.authProvider || "email")
    } : null,
    keyHints: saved.keyHints && typeof saved.keyHints === "object" ? { ...saved.keyHints } : {},
    subtitleCount: Number(saved.subtitleCount) || 0,
    lastSyncedAt: saved.lastSyncedAt || null
  };
}
async function saveCloudSyncProfile(partial, storageArea) {
  const store = resolveStorage(storageArea);
  const current = await getCloudSyncProfile(store);
  const next = {
    ...current,
    ...partial
  };
  if (partial?.syncPreferences) {
    next.syncPreferences = normalizeSyncPreferences({
      ...current.syncPreferences,
      ...partial.syncPreferences
    });
  } else {
    next.syncPreferences = normalizeSyncPreferences(next.syncPreferences);
  }
  next.serverUrl = normalizeSyncServerUrl(next.serverUrl);
  next.connected = Boolean(next.connected && next.user?.email);
  await store.set({ [STORAGE_KEYS.CLOUD_SYNC_PROFILE]: next });
  return next;
}
async function getSecretCloudSyncToken(storageArea) {
  const store = resolveStorage(storageArea);
  const raw = await store.get(STORAGE_KEYS.CLOUD_SYNC_SECRET);
  const tok = raw?.[STORAGE_KEYS.CLOUD_SYNC_SECRET]?.token;
  return typeof tok === "string" ? tok.trim() : "";
}
async function setSecretCloudSyncToken(token, storageArea) {
  const store = resolveStorage(storageArea);
  const trimmed = typeof token === "string" ? token.trim() : "";
  if (!trimmed) {
    await store.set({ [STORAGE_KEYS.CLOUD_SYNC_SECRET]: {} });
    return;
  }
  await store.set({ [STORAGE_KEYS.CLOUD_SYNC_SECRET]: { token: trimmed } });
}
async function mergeSecretApiKeysFromCloud(cloudKeys, storageArea) {
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
    if (Math.abs((Number(a?.startSec) || 0) - (Number(b?.startSec) || 0)) > 5e-3 || Math.abs((Number(a?.endSec) || 0) - (Number(b?.endSec) || 0)) > 5e-3 || String(a?.text || "") !== String(b?.text || "") || Boolean(a?.bookmarked) !== Boolean(b?.bookmarked) || String(a?.secondaryText || "") !== String(b?.secondaryText || "")) {
      return true;
    }
  }
  return false;
}
async function mergeCloudSubtitlesIntoCache(cloudSubtitles, storageArea) {
  if (!Array.isArray(cloudSubtitles) || cloudSubtitles.length === 0) {
    return { addedEntries: [], updatedEntries: [] };
  }
  const store = resolveStorage(storageArea);
  const [localCache, localHistory] = await Promise.all([
    getSubtitleCacheList(store),
    getHistory(store)
  ]);
  const byKey = /* @__PURE__ */ new Map();
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
    const isGenuineUpdate = prev && incomingTime && prevTime && incomingTime > prevTime && hasTranscriptContentChanged(prev, sub);
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
        createdAt: sub.savedAt || (/* @__PURE__ */ new Date()).toISOString()
      };
      byKey.set(sub.cacheKey, mergedEntry);
      if (!prev) addedEntries.push(mergedEntry);
      else updatedEntries.push(mergedEntry);
    }
  }
  const nextCache = [...byKey.values()].slice(0, MAX_CACHE_ENTRIES);
  const histByKey = /* @__PURE__ */ new Map();
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
        createdAt: item.createdAt
      });
    }
  }
  const nextHistory = [...histByKey.values()].slice(0, MAX_HISTORY_ENTRIES);
  await store.set({
    [STORAGE_KEYS.SUBTITLE_CACHE]: nextCache,
    [STORAGE_KEYS.HISTORY]: nextHistory
  });
  return { addedEntries, updatedEntries };
}
async function getDebugLogs(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.DEBUG_LOGS);
    const list = raw?.[STORAGE_KEYS.DEBUG_LOGS];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
async function saveDebugLogs(logs, storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const trimmed = Array.isArray(logs) ? logs.slice(-MAX_DEBUG_LOGS) : [];
    await store.set({ [STORAGE_KEYS.DEBUG_LOGS]: trimmed });
    return trimmed;
  } catch {
    return [];
  }
}
async function clearDebugLogs(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    await store.set({ [STORAGE_KEYS.DEBUG_LOGS]: [] });
  } catch {
  }
}
async function getNotifications(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.NOTIFICATIONS);
    const list = raw?.[STORAGE_KEYS.NOTIFICATIONS];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
async function appendNotification(item, storageArea) {
  const store = resolveStorage(storageArea);
  const existing = await getNotifications(store);
  const record = {
    id: item?.id || `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: String(item?.kind || "info"),
    title: String(item?.title || "LM Subs").slice(0, 140),
    body: String(item?.body || "").slice(0, 280),
    cacheKey: item?.cacheKey || null,
    provider: item?.provider || null,
    read: Boolean(item?.read),
    createdAt: item?.createdAt || (/* @__PURE__ */ new Date()).toISOString()
  };
  const next = [record, ...existing.filter((n) => n?.id !== record.id)].slice(
    0,
    MAX_NOTIFICATIONS
  );
  await store.set({ [STORAGE_KEYS.NOTIFICATIONS]: next });
  return { notification: record, notifications: next };
}
async function markNotificationsRead({ id = null } = {}, storageArea) {
  const store = resolveStorage(storageArea);
  const existing = await getNotifications(store);
  const next = existing.map(
    (n) => !id || n.id === id ? { ...n, read: true } : n
  );
  await store.set({ [STORAGE_KEYS.NOTIFICATIONS]: next });
  return next;
}
async function clearNotifications(storageArea) {
  const store = resolveStorage(storageArea);
  await store.set({ [STORAGE_KEYS.NOTIFICATIONS]: [] });
  return [];
}
function normalizeReleaseNotes(raw) {
  if (!raw || typeof raw !== "object") return null;
  const highlights = Array.isArray(raw.highlights) ? raw.highlights.filter((line) => typeof line === "string" && line.trim()).slice(0, 6) : [];
  const headline = String(raw.headline || "");
  const version = String(raw.version || "");
  if (!headline && highlights.length === 0) return null;
  return { version, headline, highlights };
}
async function getUpdateStatus(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.UPDATE_STATUS);
    const saved = raw?.[STORAGE_KEYS.UPDATE_STATUS];
    if (!saved || typeof saved !== "object") {
      return {
        updateAvailable: false,
        currentVersion: "0.2.8",
        currentBuildId: "",
        latestVersion: "0.2.8",
        latestBuildId: "",
        zipUrl: "/releases/lm-subs-latest.zip",
        zipSha256: "",
        notifiedReleaseKey: "",
        checkedAt: null,
        autoAppliedAt: null,
        linkedFolderName: "",
        latestNotes: null
      };
    }
    return {
      updateAvailable: Boolean(saved.updateAvailable),
      currentVersion: String(saved.currentVersion || "0.2.8"),
      currentBuildId: String(saved.currentBuildId || ""),
      latestVersion: String(saved.latestVersion || saved.currentVersion || "0.2.8"),
      latestBuildId: String(saved.latestBuildId || ""),
      zipUrl: String(saved.zipUrl || "/releases/lm-subs-latest.zip"),
      zipSha256: String(saved.zipSha256 || ""),
      notifiedReleaseKey: String(saved.notifiedReleaseKey || ""),
      checkedAt: saved.checkedAt || null,
      autoAppliedAt: saved.autoAppliedAt || null,
      linkedFolderName: String(saved.linkedFolderName || ""),
      latestNotes: normalizeReleaseNotes(saved.latestNotes)
    };
  } catch {
    return {
      updateAvailable: false,
      currentVersion: "0.2.8",
      currentBuildId: "",
      latestVersion: "0.2.8",
      latestBuildId: "",
      zipUrl: "/releases/lm-subs-latest.zip",
      zipSha256: "",
      notifiedReleaseKey: "",
      checkedAt: null,
      autoAppliedAt: null,
      linkedFolderName: "",
      latestNotes: null
    };
  }
}
async function saveUpdateStatus(partial, storageArea) {
  const store = resolveStorage(storageArea);
  const current = await getUpdateStatus(store);
  const next = { ...current, ...partial || {} };
  await store.set({ [STORAGE_KEYS.UPDATE_STATUS]: next });
  return next;
}
async function getSetupState(storageArea) {
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
        completedAt: null
      };
    }
    return {
      installedAt: saved.installedAt || null,
      welcomeOpenedAt: saved.welcomeOpenedAt || null,
      popupOpenedCount: Number.isFinite(Number(saved.popupOpenedCount)) ? Number(saved.popupOpenedCount) : 0,
      lastPopupOpenedAt: saved.lastPopupOpenedAt || null,
      completedAt: saved.completedAt || null
    };
  } catch {
    return {
      installedAt: null,
      welcomeOpenedAt: null,
      popupOpenedCount: 0,
      lastPopupOpenedAt: null,
      completedAt: null
    };
  }
}
async function saveSetupState(partial, storageArea) {
  const store = resolveStorage(storageArea);
  const current = await getSetupState(store);
  const next = { ...current, ...partial || {} };
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
      exportsCount: 0
    },
    dailyStudy: {},
    updatedAt: null
  };
}
async function getNotebookLmStats(storageArea) {
  try {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.NOTEBOOKLM_STATS);
    const saved = raw?.[STORAGE_KEYS.NOTEBOOKLM_STATS];
    if (!saved || typeof saved !== "object") {
      return createEmptyNotebookLmStats();
    }
    const base = createEmptyNotebookLmStats();
    return {
      notebooks: saved.notebooks && typeof saved.notebooks === "object" ? saved.notebooks : {},
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
        exportsCount: Math.max(0, Number(saved.totals?.exportsCount) || 0)
      },
      dailyStudy: saved.dailyStudy && typeof saved.dailyStudy === "object" ? saved.dailyStudy : base.dailyStudy,
      updatedAt: saved.updatedAt || null
    };
  } catch {
    return createEmptyNotebookLmStats();
  }
}
async function recordNotebookLmTelemetry(event = {}, storageArea) {
  const store = resolveStorage(storageArea);
  const current = await getNotebookLmStats(store);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
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
      lastSeenAt: nowIso
    };
    notebooks[nbId] = {
      ...prev,
      title: event.notebookTitle && event.notebookTitle !== "NotebookLM Video Overview" && event.notebookTitle !== "NotebookLM Audio Overview" ? String(event.notebookTitle).slice(0, 140) : prev.title,
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
      watchSeconds: (prev.watchSeconds || 0) + Math.max(0, Number(event.watchSeconds) || 0),
      listenSeconds: (prev.listenSeconds || 0) + Math.max(0, Number(event.listenSeconds) || 0),
      lastSeenAt: nowIso
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
    exportsCount: current.totals.exportsCount + addExports
  };
  const dailyStudy = { ...current.dailyStudy };
  const prevDay = dailyStudy[dayKey] || {
    activeSeconds: 0,
    citations: 0,
    bookmarks: 0
  };
  dailyStudy[dayKey] = {
    activeSeconds: prevDay.activeSeconds + addWatch + addListen,
    citations: prevDay.citations + addCitations,
    bookmarks: prevDay.bookmarks + addBookmarks
  };
  const sortedDays = Object.keys(dailyStudy).sort();
  while (sortedDays.length > 30) {
    const oldest = sortedDays.shift();
    delete dailyStudy[oldest];
  }
  const next = {
    notebooks,
    totals,
    dailyStudy,
    updatedAt: nowIso
  };
  await store.set({ [STORAGE_KEYS.NOTEBOOKLM_STATS]: next });
  return next;
}

// src/lib/unpacked-updater.js
var IDB_NAME = "lmsubs_updater_db";
var IDB_STORE = "handles";
var IDB_DIR_KEY = "extension_root_dir";
var CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();
function computeCrc32(bytes) {
  let crc = 4294967295;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 255] ^ crc >>> 8;
  }
  return (crc ^ 4294967295) >>> 0;
}
function compareSemver(a, b) {
  const pa = String(a || "0.0.0").replace(/^v/i, "").split("-")[0].split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = String(b || "0.0.0").replace(/^v/i, "").split("-")[0].split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}
function isRemoteReleaseNewer({
  localVersion = "0.0.0",
  localBuildId = "",
  remoteVersion = "0.0.0",
  remoteBuildId = ""
} = {}) {
  if (!remoteVersion) return false;
  const cmp = compareSemver(remoteVersion, localVersion);
  if (cmp > 0) return true;
  if (cmp < 0) return false;
  if (localBuildId && remoteBuildId && String(localBuildId).trim() !== String(remoteBuildId).trim()) {
    return true;
  }
  return false;
}
async function computeSha256Hex(inputBytes) {
  const u8 = inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", u8);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifySha256Hex(inputBytes, expectedHex) {
  if (!expectedHex) return true;
  const actual = await computeSha256Hex(inputBytes);
  return actual.toLowerCase() === String(expectedHex).trim().toLowerCase();
}
async function inflateRawBytes(compressedBytes) {
  if (typeof globalThis.DecompressionStream !== "function") {
    throw new Error("DecompressionStream is unavailable in this environment.");
  }
  const ds = new globalThis.DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(compressedBytes);
  writer.close();
  const res = new Response(ds.readable);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
function sanitizeZipRelativePath(rawName) {
  const normalized = String(rawName || "").replace(/\\/g, "/").trim();
  if (!normalized || normalized.endsWith("/")) return null;
  if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Unsafe archive path rejected: ${rawName}`);
  }
  const parts = normalized.split("/").filter(Boolean);
  if (parts.some((p) => p === "." || p === "..")) {
    throw new Error(`Path traversal rejected in archive: ${rawName}`);
  }
  if (parts.length > 1 && parts[0] === "lm-subs") {
    return parts.slice(1).join("/");
  }
  return parts.join("/");
}
async function extractZipArchive(zipInput) {
  const bytes = zipInput instanceof Uint8Array ? zipInput : new Uint8Array(zipInput);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocdOffset = -1;
  const minPos = Math.max(0, bytes.byteLength - 65557);
  for (let pos = bytes.byteLength - 22; pos >= minPos; pos--) {
    if (view.getUint32(pos, true) === 101010256) {
      eocdOffset = pos;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error("Invalid update package: ZIP central directory not found.");
  }
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder("utf-8");
  const files = [];
  let cursor = centralDirOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (cursor + 46 > bytes.byteLength || view.getUint32(cursor, true) !== 33639248) {
      throw new Error("Invalid update package: corrupted central directory header.");
    }
    const method = view.getUint16(cursor + 10, true);
    const expectedCrc = view.getUint32(cursor + 16, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const rawName = decoder.decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLen)
    );
    cursor += 46 + nameLen + extraLen + commentLen;
    const relPath = sanitizeZipRelativePath(rawName);
    if (!relPath) continue;
    if (localHeaderOffset + 30 > bytes.byteLength || view.getUint32(localHeaderOffset, true) !== 67324752) {
      throw new Error(`Invalid local header for ${relPath}`);
    }
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.byteLength) {
      throw new Error(`Truncated archive payload for ${relPath}`);
    }
    const slice = bytes.subarray(dataStart, dataEnd);
    let outBytes;
    if (method === 0) {
      outBytes = new Uint8Array(slice);
    } else if (method === 8) {
      outBytes = await inflateRawBytes(slice);
    } else {
      throw new Error(`Unsupported ZIP compression method ${method} for ${relPath}`);
    }
    if (outBytes.byteLength !== uncompressedSize) {
      throw new Error(`Size mismatch while extracting ${relPath}`);
    }
    const actualCrc = computeCrc32(outBytes);
    if (actualCrc !== expectedCrc) {
      throw new Error(`CRC-32 integrity check failed for ${relPath}`);
    }
    files.push({ path: relPath, bytes: outBytes });
  }
  if (!files.some((f) => f.path === "manifest.json")) {
    throw new Error("Invalid extension archive: manifest.json missing.");
  }
  return files;
}
function openHandlesDb() {
  if (typeof globalThis.indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = globalThis.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function loadLinkedExtensionDirHandle() {
  const db = await openHandlesDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_DIR_KEY);
      req.onsuccess = () => {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}
async function inspectLinkedDirPermission(dirHandle) {
  if (!dirHandle) return { linked: false, permission: "none", folderName: "" };
  try {
    const perm = await dirHandle.queryPermission?.({ mode: "readwrite" }) || "granted";
    return {
      linked: true,
      permission: perm,
      folderName: dirHandle.name || "lm-subs"
    };
  } catch {
    return {
      linked: true,
      permission: "prompt",
      folderName: dirHandle.name || "lm-subs"
    };
  }
}
async function resolveTargetExtensionDir(dirHandle) {
  try {
    await dirHandle.getFileHandle("manifest.json", { create: false });
    return dirHandle;
  } catch {
    try {
      const sub = await dirHandle.getDirectoryHandle("lm-subs", { create: false });
      await sub.getFileHandle("manifest.json", { create: false });
      return sub;
    } catch {
      throw new Error(
        "Selected folder does not contain LM Subs manifest.json. Select your unzipped lm-subs folder."
      );
    }
  }
}
async function applyUpdateToDirectoryHandle(dirHandle, zipBytes, { expectedSha256 = "", requestPermission = false } = {}) {
  if (!dirHandle) {
    throw new Error("No unpacked extension folder is linked yet.");
  }
  let perm = await dirHandle.queryPermission?.({ mode: "readwrite" }) || "granted";
  if (perm !== "granted" && requestPermission && dirHandle.requestPermission) {
    perm = await dirHandle.requestPermission({ mode: "readwrite" });
  }
  if (perm !== "granted") {
    const err = new Error("Write permission is required to update the unpacked folder.");
    err.code = "PERMISSION_REQUIRED";
    throw err;
  }
  const shaOk = await verifySha256Hex(zipBytes, expectedSha256);
  if (!shaOk) {
    throw new Error("Update package SHA-256 verification failed.");
  }
  const targetDir = await resolveTargetExtensionDir(dirHandle);
  const entries = await extractZipArchive(zipBytes);
  for (const entry of entries) {
    const segments = entry.path.split("/").filter(Boolean);
    const fileName = segments.pop();
    let currentDir = targetDir;
    for (const seg of segments) {
      currentDir = await currentDir.getDirectoryHandle(seg, { create: true });
    }
    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(entry.bytes);
    await writable.close();
  }
  const manifestEntry = entries.find((e) => e.path === "manifest.json");
  const updatedManifest = JSON.parse(new TextDecoder().decode(manifestEntry.bytes));
  return {
    ok: true,
    writtenFiles: entries.length,
    version: updatedManifest.version || "",
    folderName: targetDir.name || "lm-subs"
  };
}

// src/background/service-worker.js
var STAGED_AUDIO_TTL_MS = 5 * 60 * 1e3;
var JOB_HEARTBEAT_INTERVAL_MS = 2e4;
var MAX_SINGLE_M4A_FOR_ALL_PROVIDERS = 22 * 1024 * 1024;
var MAX_SAFE_IPC_DECODE_BYTES = 38 * 1024 * 1024;
var RANGE_EXTRACTION_THRESHOLD_BYTES = 3 * 1024 * 1024;
var MEDIA_HEADER_TIMEOUT_MS = 4500;
function base64ToUint8(b64) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function uint8ToBase642(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(
      "base64"
    );
  }
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
function formatMegabytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function defaultJobHeartbeat() {
  const chromeNs = globalThis.chrome;
  if (chromeNs?.storage?.session?.set) {
    chromeNs.storage.session.set({ lmsubsJobHeartbeat: Date.now() });
    return;
  }
  chromeNs?.runtime?.getPlatformInfo?.();
}
function createRuntimeDispatcher({
  storageArea = globalThis.chrome?.storage?.local,
  fetchImpl = globalThis.fetch,
  tabsApi = globalThis.chrome?.tabs,
  permissionsApi = globalThis.chrome?.permissions,
  actionApi = globalThis.chrome?.action,
  notificationsApi = globalThis.chrome?.notifications,
  alarmsApi = globalThis.chrome?.alarms,
  runtimeApi = globalThis.chrome?.runtime,
  dirHandleLoader = loadLinkedExtensionDirHandle,
  heartbeatImpl = defaultJobHeartbeat,
  mediaDeadlineMs = MEDIA_DOWNLOAD_DEADLINE_MS
} = {}) {
  const inFlightPromises = /* @__PURE__ */ new Map();
  const stagedAudioJobs = /* @__PURE__ */ new Map();
  const memoryDebugLogs = [];
  let debugLogsHydrated = false;
  let jobHeartbeatCount = 0;
  let jobHeartbeatTimer = null;
  function startJobKeepAlive() {
    jobHeartbeatCount += 1;
    if (jobHeartbeatTimer) return;
    const ping = () => {
      try {
        heartbeatImpl?.();
      } catch {
      }
    };
    ping();
    if (typeof setInterval === "function") {
      jobHeartbeatTimer = setInterval(ping, JOB_HEARTBEAT_INTERVAL_MS);
    }
  }
  function stopJobKeepAlive() {
    jobHeartbeatCount = Math.max(0, jobHeartbeatCount - 1);
    if (jobHeartbeatCount > 0 || !jobHeartbeatTimer) return;
    clearInterval(jobHeartbeatTimer);
    jobHeartbeatTimer = null;
  }
  async function syncToolbarBadge({ transientState = null } = {}) {
    if (!actionApi?.setBadgeText) return;
    try {
      const [settings, notifications, updateStatus] = await Promise.all([
        getSettings(storageArea),
        getNotifications(storageArea),
        getUpdateStatus(storageArea)
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
      const badgeColor = newestKind === "error" ? "#B42318" : newestKind === "ready" ? "#166534" : "#0055D4";
      await actionApi.setBadgeBackgroundColor?.({ color: badgeColor });
      await actionApi.setBadgeText({
        text: unread.length > 99 ? "99+" : String(unread.length)
      });
    } catch {
    }
  }
  async function broadcastNotificationSound() {
    try {
      const settings = await getSettings(storageArea);
      if (!settings.soundAlerts) return false;
      if (settings.notificationSoundPreset === "none") return false;
      const payload = {
        type: RUNTIME_MESSAGE.PLAY_NOTIFICATION_SOUND,
        preset: settings.notificationSoundPreset || "chime",
        volume: Number(settings.notificationSoundVolume) || 75
      };
      try {
        runtimeApi?.sendMessage?.(payload, () => {
          void globalThis.chrome?.runtime?.lastError;
        });
      } catch {
      }
      if (!tabsApi?.query) return true;
      const tabs = await new Promise((resolve) => {
        try {
          const maybe = tabsApi.query(
            {
              url: [
                "https://notebooklm.google.com/*",
                "https://notebook.google.com/*",
                "https://notebook.cloud.google.com/*"
              ]
            },
            (res) => resolve(Array.isArray(res) ? res : [])
          );
          if (maybe && typeof maybe.then === "function") {
            maybe.then((res) => resolve(Array.isArray(res) ? res : [])).catch(() => resolve([]));
          } else if (tabsApi.query.length < 2) {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
      for (const tab of tabs) {
        notifyTabMessage(tab.id, payload);
      }
      return true;
    } catch {
      return false;
    }
  }
  async function fireDesktopAlertIfPermitted({
    id,
    title,
    body,
    silent = false,
    items = null
  }) {
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
      const listItems = Array.isArray(items) ? items.filter((item) => item && typeof item.title === "string").slice(0, 5).map((item) => ({
        title: String(item.title).slice(0, 120),
        message: String(item.message || "").slice(0, 120)
      })) : [];
      const createAlert = (options) => new Promise((resolve) => {
        try {
          const maybe = notificationsApi.create(
            id || `lmsubs_${Date.now()}`,
            options,
            () => {
              const lastError = globalThis.chrome?.runtime?.lastError;
              resolve(!lastError);
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
      const message = String(body || "");
      const baseOptions = {
        iconUrl,
        title: String(title || "LM Subs"),
        message,
        silent: Boolean(silent)
      };
      if (listItems.length > 0) {
        const listed = await createAlert({
          ...baseOptions,
          type: "list",
          items: listItems
        });
        if (listed) return true;
      }
      await createAlert({
        ...baseOptions,
        type: "basic",
        message: listItems.length > 0 ? `${listItems.map((item) => item.title).join("\n").slice(0, 400)}

${message}`.trim() : message
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
    desktopItems = null
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
        read: Boolean(quiet)
      },
      storageArea
    );
    await syncToolbarBadge();
    if (!quiet && kind !== "sync" && fireDesktop && settings.desktopNotifications) {
      const brandedChime = Boolean(settings.soundAlerts) && (settings.notificationSoundPreset || "chime") !== "none";
      await fireDesktopAlertIfPermitted({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        items: desktopItems,
        // Suppress the generic OS beep only when LM Subs plays its own preset
        silent: brandedChime
      });
      if (brandedChime) {
        await broadcastNotificationSound();
      }
    }
    return notification;
  }
  const REQUIRED_GOOGLE_ORIGINS = [
    "https://*.googleusercontent.com/*",
    "https://*.google.com/*",
    "https://*.googlevideo.com/*"
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
      ts: entry?.ts || (/* @__PURE__ */ new Date()).toISOString(),
      layer: String(entry?.layer || "SW").slice(0, 12),
      event: String(entry?.event || "log").slice(0, 48),
      detail: safeDetail,
      level: entry?.level || "info"
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
      }
    }
    return {
      ok: missingOrigins.length === 0,
      missingOrigins
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
      chunk
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
        parts: new Array(Number(totalChunks) || 1)
      };
      stagedAudioJobs.set(stagedJobId, job);
    }
    job.parts[index] = {
      bytes: base64ToUint8(chunk.base64),
      mimeType: chunk.mimeType || "audio/mp4",
      fileName: chunk.fileName || `chunk-${index + 1}.m4a`,
      startOffsetSec: Number(chunk.startOffsetSec) || 0,
      durationSec: chunk.durationSec || null
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
      chunks
    };
  }
  function notifyTabMessage(tabId, message) {
    if (!tabId || !tabsApi?.sendMessage) return;
    try {
      tabsApi.sendMessage(tabId, message, () => {
        void globalThis.chrome?.runtime?.lastError;
      });
    } catch {
    }
  }
  function notifyTabProgress(tabId, payload) {
    notifyTabMessage(tabId, {
      type: RUNTIME_MESSAGE.SUBTITLES_PROGRESS,
      ...payload
    });
  }
  async function broadcastUpdatedSubtitlesToTabs(entries) {
    if (!Array.isArray(entries) || entries.length === 0 || !tabsApi?.query) return;
    try {
      const urls = [
        "https://notebooklm.google.com/*",
        "https://notebook.google.com/*",
        "https://notebook.cloud.google.com/*"
      ];
      const tabs = await new Promise((resolve) => {
        try {
          const maybe = tabsApi.query(
            { url: urls },
            (res) => resolve(Array.isArray(res) ? res : [])
          );
          if (maybe && typeof maybe.then === "function") {
            maybe.then((res) => resolve(Array.isArray(res) ? res : [])).catch(() => resolve([]));
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
            entries
          });
        }
      }
    } catch {
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
  async function callSyncApi(serverUrl, path, { method = "GET", token = "", body = null, timeoutMs = 1e4 } = {}) {
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
          body: body !== null ? JSON.stringify(body) : void 0,
          signal: controller.signal
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
        getSecretCloudSyncToken(storageArea)
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
    silentNotification = false
  } = {}) {
    const [profile, token] = await Promise.all([
      getCloudSyncProfile(storageArea),
      getSecretCloudSyncToken(storageArea)
    ]);
    if (!token) {
      throw new Error("Sign in to your LM Subs account first.");
    }
    const syncPrefs = profile.syncPreferences || {
      syncApiKeys: true,
      syncTranscripts: true,
      syncSettings: true
    };
    const [localSettings, localKeys, localSubtitles] = await Promise.all([
      getSettings(storageArea),
      getSecretApiKeysMap(storageArea),
      getSubtitleCacheList(storageArea)
    ]);
    const pushRes = await callSyncApi(profile.serverUrl, "/api/sync/push", {
      method: "POST",
      token,
      body: {
        syncPreferences: syncPrefs,
        ...syncPrefs.syncSettings ? { settings: localSettings } : {},
        ...syncPrefs.syncApiKeys ? { apiKeys: localKeys } : {},
        deletedProviders,
        deletedCacheKeys,
        ...syncPrefs.syncTranscripts ? { subtitles: localSubtitles.slice(0, 35) } : {}
      },
      timeoutMs: 12e3
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
          lastSyncedAt: pushRes.syncedAt || (/* @__PURE__ */ new Date()).toISOString()
        },
        storageArea
      );
      return { ok: true, profile: updated };
    }
    const pullRes = await callSyncApi(
      activeServerUrl,
      `/api/sync/pull?includeSecrets=${syncPrefs.syncApiKeys ? "1" : "0"}`,
      {
        method: "GET",
        token,
        timeoutMs: 12e3
      }
    );
    const mergedPrefs = pullRes.syncPreferences || syncPrefs;
    if (mergedPrefs.syncSettings && pullRes.settings && typeof pullRes.settings === "object") {
      await saveSettings(pullRes.settings, storageArea);
    }
    if (mergedPrefs.syncApiKeys && pullRes.apiKeys && typeof pullRes.apiKeys === "object") {
      await mergeSecretApiKeysFromCloud(pullRes.apiKeys, storageArea);
    }
    let mergeResult = { addedEntries: [], updatedEntries: [] };
    if (mergedPrefs.syncTranscripts && Array.isArray(pullRes.subtitles) && pullRes.subtitles.length > 0) {
      mergeResult = await mergeCloudSubtitlesIntoCache(pullRes.subtitles, storageArea) || {
        addedEntries: [],
        updatedEntries: []
      };
      const changedEntries = [
        ...mergeResult.addedEntries,
        ...mergeResult.updatedEntries
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
        subtitleCount: Array.isArray(pullRes.subtitles) ? pullRes.subtitles.length : 0,
        lastSyncedAt: pullRes.syncedAt || (/* @__PURE__ */ new Date()).toISOString()
      },
      storageArea
    );
    await appendDebugEntry(
      {
        layer: "SYNC",
        event: "neon.sync_ok",
        detail: `Synced ${Object.keys(pullRes.keyHints || {}).length} encrypted key(s) & ${pullRes.subtitles?.length || 0} subtitle(s) with hosted Postgres`,
        level: "ok"
      },
      [token, ...Object.values(pullRes.apiKeys || {})]
    );
    const changedCount = mergeResult.addedEntries.length + mergeResult.updatedEntries.length;
    if (!silentNotification || changedCount > 0) {
      await emitExtensionNotification({
        kind: "sync",
        title: changedCount > 0 ? `Synced ${changedCount} updated transcript${changedCount === 1 ? "" : "s"}` : "Cloud sync completed",
        body: `${updatedProfile.subtitleCount} transcript(s) and ${Object.keys(updatedProfile.keyHints || {}).length} encrypted key(s) synced.`,
        fireDesktop: false,
        quiet: Boolean(silentNotification)
      }).catch(() => {
      });
    }
    return { ok: true, profile: updatedProfile, mergeResult };
  }
  async function resolveLocalExtensionBuildMeta() {
    const manifestVersion = runtimeApi?.getManifest?.()?.version || "0.2.8";
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
            notes: resolveReleaseNotes(String(json.version), json.notes || null)
          };
        }
      } catch {
      }
    }
    throw new Error("Could not reach LM Subs release server.");
  }
  async function applyUnpackedUpdateNow({
    zipUrl = "",
    zipSha256 = "",
    targetVersion = "",
    targetBuildId = ""
  } = {}) {
    const [profile, prevStatus] = await Promise.all([
      getCloudSyncProfile(storageArea),
      getUpdateStatus(storageArea)
    ]);
    const dirHandle = await dirHandleLoader().catch(() => null);
    if (!dirHandle) {
      throw new Error(
        "Link your unzipped lm-subs folder once so updates can be written directly."
      );
    }
    const base = normalizeSyncServerUrl(profile?.serverUrl || HOSTED_CLOUD_URL);
    const rawZipUrl = zipUrl || prevStatus.zipUrl || "/releases/lm-subs-latest.zip";
    const resolvedZipUrl = /^https?:\/\//i.test(rawZipUrl) ? rawZipUrl : `${base}${rawZipUrl.startsWith("/") ? "" : "/"}${rawZipUrl}`;
    const expectedSha = zipSha256 || prevStatus.zipSha256 || "";
    const res = await fetchImpl(resolvedZipUrl, { cache: "no-store" });
    if (!res?.ok) {
      throw new Error(`Failed to download update package (HTTP ${res?.status || 0}).`);
    }
    const zipBytes = new Uint8Array(await res.arrayBuffer());
    const applied = await applyUpdateToDirectoryHandle(dirHandle, zipBytes, {
      expectedSha256: expectedSha,
      requestPermission: false
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
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        autoAppliedAt: (/* @__PURE__ */ new Date()).toISOString(),
        linkedFolderName: applied.folderName || "lm-subs"
      },
      storageArea
    );
    await emitExtensionNotification({
      kind: "update",
      title: `LM Subs updated automatically (v${newVer})`,
      body: `Wrote ${applied.writtenFiles} verified files into ${applied.folderName} and reloaded.`,
      fireDesktop: true
    }).catch(() => {
    });
    if (runtimeApi?.reload) {
      if (runtimeApi.reload.length === 0 && typeof setTimeout === "function") {
        setTimeout(() => {
          try {
            runtimeApi.reload();
          } catch {
          }
        }, 120);
      } else {
        runtimeApi.reload();
      }
    }
    return { ok: true, applied: true, status: nextStatus };
  }
  async function checkExtensionUpdate({ attemptAutoApply = true } = {}) {
    const [settings, profile, prevStatus, localMeta, dirHandle] = await Promise.all([
      getSettings(storageArea),
      getCloudSyncProfile(storageArea),
      getUpdateStatus(storageArea),
      resolveLocalExtensionBuildMeta(),
      dirHandleLoader().catch(() => null)
    ]);
    const dirInfo = await inspectLinkedDirPermission(dirHandle);
    const remote = await fetchRemoteReleaseMeta(
      profile?.serverUrl || HOSTED_CLOUD_URL
    );
    const newer = isRemoteReleaseNewer({
      localVersion: localMeta.version,
      localBuildId: localMeta.buildId,
      remoteVersion: remote.version,
      remoteBuildId: remote.buildId
    });
    const resolvedZipUrl = /^https?:\/\//i.test(remote.zipUrl) ? remote.zipUrl : `${remote.serverBase}${remote.zipUrl.startsWith("/") ? "" : "/"}${remote.zipUrl}`;
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
          checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
          linkedFolderName: dirInfo.folderName
        },
        storageArea
      );
      await syncToolbarBadge();
      return {
        ok: true,
        updateAvailable: false,
        autoApplied: false,
        status: upToDate,
        folderPermission: dirInfo.permission
      };
    }
    if (attemptAutoApply && settings.autoUpdateExtension && dirInfo.linked && dirInfo.permission === "granted" && inFlightPromises.size === 0) {
      try {
        const appliedRes = await applyUnpackedUpdateNow({
          zipUrl: resolvedZipUrl,
          zipSha256: remote.zipSha256,
          targetVersion: remote.version,
          targetBuildId: remote.buildId
        });
        return {
          ok: true,
          updateAvailable: false,
          autoApplied: true,
          status: appliedRes.status,
          folderPermission: dirInfo.permission
        };
      } catch {
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
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        linkedFolderName: dirInfo.folderName,
        latestNotes: remote.notes || null
      },
      storageArea
    );
    if (shouldNotify) {
      const updateAlert = buildUpdateNotification({
        latestVersion: remote.version,
        notes: remote.notes || null
      });
      const howToApply = dirInfo.linked ? "Click LM Subs in your toolbar to apply the update and reload." : "Open LM Subs to link your folder for one-click auto-updates or download the release.";
      await emitExtensionNotification({
        kind: "update",
        title: updateAlert.title,
        body: updateAlert.body ? `${updateAlert.body}

${howToApply}` : howToApply,
        fireDesktop: true,
        desktopItems: updateAlert.items
      }).catch(() => {
      });
    } else {
      await syncToolbarBadge();
    }
    return {
      ok: true,
      updateAvailable: true,
      autoApplied: false,
      status: nextStatus,
      folderPermission: dirInfo.permission
    };
  }
  async function runAutomaticBackgroundCloudPoll() {
    const [settings, profile, token] = await Promise.all([
      getSettings(storageArea),
      getCloudSyncProfile(storageArea),
      getSecretCloudSyncToken(storageArea)
    ]);
    if (!settings.autoBackgroundSync || !profile.connected || !token) {
      return { ok: true, skipped: true };
    }
    const syncRes = await runBidirectionalCloudSync({
      silentNotification: true
    });
    try {
      const notifRes = await callSyncApi(profile.serverUrl, "/api/notifications", {
        method: "GET",
        token,
        timeoutMs: 8e3
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
              createdAt: item.createdAt
            },
            storageArea
          );
        }
        await syncToolbarBadge();
      }
    } catch {
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
        deviceLabel: "chrome-extension"
      }
    });
    await setSecretCloudSyncToken(res.token, storageArea);
    await saveCloudSyncProfile(
      {
        serverUrl,
        connected: true,
        user: res.user,
        keyHints: res.summary?.keyHints || {},
        subtitleCount: res.summary?.subtitleCount || 0,
        lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      storageArea
    );
    return runBidirectionalCloudSync();
  }
  async function handleSyncSignin(msg) {
    const serverUrl = normalizeSyncServerUrl(msg?.serverUrl);
    const pastedToken = String(msg?.token || "").trim();
    if (pastedToken) {
      const meRes = await callSyncApi(serverUrl, "/api/auth/me", {
        method: "GET",
        token: pastedToken
      });
      await setSecretCloudSyncToken(pastedToken, storageArea);
      await saveCloudSyncProfile(
        {
          serverUrl,
          connected: true,
          user: meRes.user,
          keyHints: meRes.summary?.keyHints || {},
          subtitleCount: meRes.summary?.subtitleCount || 0,
          lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
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
        deviceLabel: "chrome-extension"
      }
    });
    await setSecretCloudSyncToken(res.token, storageArea);
    await saveCloudSyncProfile(
      {
        serverUrl,
        connected: true,
        user: res.user,
        keyHints: res.summary?.keyHints || {},
        subtitleCount: res.summary?.subtitleCount || 0,
        lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      storageArea
    );
    const pullRes = await callSyncApi(
      serverUrl,
      "/api/sync/pull?includeSecrets=1",
      { method: "GET", token: res.token, timeoutMs: 12e3 }
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
      body: { email }
    });
    if (res._resolvedBase) {
      await saveCloudSyncProfile({ serverUrl: res._resolvedBase }, storageArea);
    }
    return {
      ok: true,
      delivery: res.delivery || "email",
      previewCode: res.previewCode || null,
      expiresInSec: res.expiresInSec || 600
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
        deviceLabel: "chrome-extension"
      }
    });
    const activeBase = res._resolvedBase || serverUrl;
    await setSecretCloudSyncToken(res.token, storageArea);
    await saveCloudSyncProfile(
      {
        serverUrl: activeBase,
        connected: true,
        syncPreferences: res.summary?.syncPreferences || profile.syncPreferences,
        user: res.user,
        keyHints: res.summary?.keyHints || {},
        subtitleCount: res.summary?.subtitleCount || 0,
        lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      storageArea
    );
    const pullRes = await callSyncApi(
      activeBase,
      `/api/sync/pull?includeSecrets=${res.summary?.syncPreferences?.syncApiKeys ?? true ? "1" : "0"}`,
      { method: "GET", token: res.token, timeoutMs: 12e3 }
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
        ...typeof msg?.autoSync === "boolean" ? { autoSync: msg.autoSync } : {},
        ...msg?.syncPreferences ? { syncPreferences: msg.syncPreferences } : {}
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
          purgeDisabled: Boolean(msg?.purgeDisabled)
        }
      });
      const updated = await saveCloudSyncProfile(
        {
          syncPreferences: res.syncPreferences || profile.syncPreferences,
          keyHints: res.summary?.keyHints || {},
          subtitleCount: res.summary?.subtitleCount ?? profile.subtitleCount
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
      getSecretCloudSyncToken(storageArea)
    ]);
    if (!profile.connected || !token) {
      return { ok: false, error: "Sign in to view cloud statistics." };
    }
    return callSyncApi(profile.serverUrl, "/api/stats", {
      method: "GET",
      token,
      timeoutMs: 8e3
    });
  }
  async function handleSyncSignout() {
    const [profile, token] = await Promise.all([
      getCloudSyncProfile(storageArea),
      getSecretCloudSyncToken(storageArea)
    ]);
    if (token) {
      await callSyncApi(profile.serverUrl, "/api/auth/signout", {
        method: "POST",
        token,
        timeoutMs: 4e3
      }).catch(() => {
      });
    }
    await setSecretCloudSyncToken("", storageArea);
    const cleared = await saveCloudSyncProfile(
      {
        connected: false,
        user: null,
        keyHints: {},
        subtitleCount: 0
      },
      storageArea
    );
    return { ok: true, profile: cleared };
  }
  async function fetchAndExtractCompactAudio(artifact, tabId, pageFetchError = null) {
    const seedUrl = artifact.progressiveUrl || artifact.mediaUrl;
    const rawVariants = [
      ...deriveGoogleMediaVariants(seedUrl),
      ...deriveGoogleMediaVariants(artifact.mediaUrl),
      ...Array.isArray(artifact.mediaVariants) ? artifact.mediaVariants : []
    ];
    const allCandidateUrls = orderMediaCandidates({
      playingUrl: artifact.playingUrl,
      mediaVariants: rawVariants,
      progressiveUrl: artifact.progressiveUrl,
      mediaUrl: artifact.mediaUrl,
      isTrusted: isTrustedGoogleMediaUrl,
      isManifest: isThumbnailOrManifestUrl
    });
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
      )}${artifact.playingUrl && artifact.playingUrl === allCandidateUrls[0] ? " (playing in tab)" : ""}`
    });
    let lastProgressAt = 0;
    const reportProgress = ({ receivedBytes, totalBytes }) => {
      const now = Date.now();
      if (now - lastProgressAt < 700) return;
      lastProgressAt = now;
      notifyTabProgress(tabId, {
        cacheKey: artifact.cacheKey,
        artifactId: artifact.artifactId,
        mediaToken: artifact.mediaToken,
        label: "Downloading audio stream\u2026",
        detail: formatDownloadProgress({ receivedBytes, totalBytes })
      });
    };
    const startedAt = Date.now();
    const budgetLeft = () => Math.max(5e3, mediaDeadlineMs - (Date.now() - startedAt));
    const overBudget = () => Date.now() - startedAt >= mediaDeadlineMs;
    let downloadedBytes = null;
    let downloadedContentType = "";
    let downloadedTrackInfo = null;
    let lastDownloadErr = pageFetchError || "Failed to fetch Video Overview stream.";
    const deadFifeSuffixes = /* @__PURE__ */ new Set();
    for (const candidateUrl of allCandidateUrls) {
      if (overBudget()) {
        await appendDebugEntry({
          layer: "SW",
          event: "media.deadline",
          detail: `Stopped probing after ${Math.round(
            (Date.now() - startedAt) / 1e3
          )}s to keep the background worker responsive`,
          level: "warn"
        });
        break;
      }
      const fifeSuffixMatch = candidateUrl.match(
        /\/([A-Za-z0-9_-]{16,})(=[A-Za-z0-9_,.-]+)$/
      );
      const fifeKey = fifeSuffixMatch ? `${fifeSuffixMatch[1]}${fifeSuffixMatch[2]}` : "";
      if (fifeKey && deadFifeSuffixes.has(fifeKey)) {
        continue;
      }
      let hostLabel = "googleusercontent.com";
      try {
        hostLabel = new URL(candidateUrl).hostname;
      } catch {
      }
      const candidateStartedAt = Date.now();
      let skipCandidateVariant = false;
      for (const credentialsMode of ["include", "omit"]) {
        if (overBudget()) break;
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        const headerTimer = setTimeout(
          () => controller?.abort(),
          MEDIA_HEADER_TIMEOUT_MS
        );
        try {
          const res = await fetchImpl(candidateUrl, {
            method: "GET",
            credentials: credentialsMode,
            signal: controller ? controller.signal : void 0
          });
          clearTimeout(headerTimer);
          if (!res.ok) {
            lastDownloadErr = `Media CDN (${hostLabel}) returned HTTP ${res.status}`;
            try {
              await res.body?.cancel?.();
            } catch {
            }
            await appendDebugEntry({
              layer: "SW",
              event: "media.http_status",
              detail: `${summarizeMediaUrlForDebug(candidateUrl)} [${credentialsMode}] -> HTTP ${res.status}`
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
            }
            continue;
          }
          const contentLen = Number(res.headers?.get?.("content-length") || 0);
          const audioOnlyVariant = isAudioOnlyVariantUrl(candidateUrl);
          const bodyTimer = setTimeout(() => controller?.abort(), budgetLeft());
          try {
            if (contentLen > RANGE_EXTRACTION_THRESHOLD_BYTES && ct.includes("video/mp4") && !audioOnlyVariant) {
              try {
                await res.body?.cancel?.();
              } catch {
              }
              controller?.abort();
              notifyTabProgress(tabId, {
                cacheKey: artifact.cacheKey,
                artifactId: artifact.artifactId,
                mediaToken: artifact.mediaToken,
                label: "Streaming audio track via HTTP Range\u2026",
                detail: `Skipping ${formatMegabytes(contentLen)} video frames`
              });
              const ranged = await extractAudioViaHttpRange({
                url: candidateUrl,
                credentials: credentialsMode,
                totalBytes: contentLen,
                fetchImpl
              });
              if (ranged && ranged.bytes && ranged.extractedBytes <= MAX_SINGLE_M4A_FOR_ALL_PROVIDERS) {
                await appendDebugEntry({
                  layer: "SW",
                  event: "media.range_extracted",
                  detail: `HTTP Range extracted ${formatMegabytes(
                    ranged.extractedBytes
                  )} .m4a (downloaded ${formatMegabytes(
                    ranged.downloadedBytes
                  )} of ${formatMegabytes(contentLen)} MP4) in ${Math.round(
                    (Date.now() - candidateStartedAt) / 1e3
                  )}s`,
                  level: "ok"
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
                      durationSec: artifact.durationSeconds || null
                    }
                  ]
                };
              }
              lastDownloadErr = "HTTP Range audio extraction failed.";
              continue;
            }
            if (contentLen >= MEDIA_PARALLEL_MIN_BYTES) {
              try {
                await res.body?.cancel?.();
              } catch {
              }
              controller?.abort();
              notifyTabProgress(tabId, {
                cacheKey: artifact.cacheKey,
                artifactId: artifact.artifactId,
                mediaToken: artifact.mediaToken,
                label: "Downloading Audio Overview\u2026",
                detail: formatDownloadProgress({
                  receivedBytes: 0,
                  totalBytes: contentLen
                })
              });
              const ranged = await downloadRangedParallel(candidateUrl, {
                credentials: credentialsMode,
                fetchImpl,
                totalBytes: contentLen,
                deadlineMs: budgetLeft(),
                onProgress: reportProgress
              });
              if (ranged?.bytes?.byteLength) {
                downloadedBytes = validateMediaPayload(ranged.bytes, ct);
                downloadedContentType = ct;
                downloadedTrackInfo = inspectMp4Tracks(downloadedBytes);
                await appendDebugEntry({
                  layer: "SW",
                  event: "media.downloaded",
                  detail: `Downloaded ${formatMegabytes(
                    downloadedBytes.byteLength
                  )} (${ct || "binary"}) in ${Math.round(
                    (Date.now() - candidateStartedAt) / 1e3
                  )}s across ${MEDIA_PARALLEL_SEGMENTS} parallel ranges [${credentialsMode}]`,
                  level: "ok"
                });
                break;
              }
              lastDownloadErr = `Parallel range download failed (${hostLabel}).`;
              continue;
            }
            const buf = await readResponseBodyWithProgress(res, {
              totalBytes: contentLen,
              onProgress: reportProgress
            });
            const validated = validateMediaPayload(buf, ct);
            const trackInfo = inspectMp4Tracks(validated);
            if (trackInfo.isMp4 && trackInfo.hasVideo && !trackInfo.hasAudio && !trackInfo.isFragmented) {
              lastDownloadErr = `Skipped silent video-only preview stream (${summarizeMediaUrlForDebug(
                candidateUrl
              )})`;
              await appendDebugEntry({
                layer: "SW",
                event: "media.skip_silent",
                detail: `${summarizeMediaUrlForDebug(candidateUrl)} has vide track only (0 soun tracks) \u2014 advancing`
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
              detail: `Downloaded ${formatMegabytes(validated.byteLength)} (${ct || "binary"}) from ${summarizeMediaUrlForDebug(candidateUrl)} [${credentialsMode}]`,
              level: "ok"
            });
            break;
          } finally {
            clearTimeout(bodyTimer);
          }
        } catch (err) {
          clearTimeout(headerTimer);
          lastDownloadErr = `Media stream download failed (${hostLabel}): ${err?.message || String(err)}`;
          await appendDebugEntry({
            layer: "SW",
            event: "media.fetch_err",
            detail: `${summarizeMediaUrlForDebug(candidateUrl)} [${credentialsMode}] -> ${err?.message || String(err)}`
          });
        }
      }
      if (skipCandidateVariant) continue;
      if (downloadedBytes) break;
    }
    if (!downloadedBytes) {
      if (overBudget()) {
        const timeoutErr = new Error(
          `Downloading this Audio Overview exceeded the ${Math.round(
            mediaDeadlineMs / 1e3
          )}s background budget (${lastDownloadErr || "slow Google CDN response"}). Play it for a few seconds and press Retry, or reload the tab.`
        );
        throw timeoutErr;
      }
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
    const isAlreadyPureAudio = downloadedContentType.startsWith("audio/") || downloadedTrackInfo?.isMp4 && !downloadedTrackInfo.hasVideo;
    if (isAlreadyPureAudio && originalBytes <= MAX_SINGLE_M4A_FOR_ALL_PROVIDERS) {
      const isWebm = downloadedContentType.includes("webm");
      const isWav = downloadedContentType.includes("wav");
      const isMp3 = downloadedContentType.includes("mpeg") || downloadedContentType.includes("mp3");
      const isOgg = downloadedContentType.includes("ogg");
      const byteStats = resolveAvoidedVideoBytes({
        originalBytes,
        extractedBytes: originalBytes,
        durationSeconds: artifact.durationSeconds || 0
      });
      notifyTabProgress(tabId, {
        cacheKey: artifact.cacheKey,
        artifactId: artifact.artifactId,
        mediaToken: artifact.mediaToken,
        label: "Audio stream ready \xB7 Transcribing\u2026",
        detail: `${formatMegabytes(originalBytes)} direct audio`
      });
      const resolvedMime = isWav ? "audio/wav" : isWebm ? "audio/webm" : isMp3 ? "audio/mpeg" : isOgg ? "audio/ogg" : "audio/mp4";
      const resolvedExt = isWav ? "wav" : isWebm ? "webm" : isMp3 ? "mp3" : isOgg ? "ogg" : "m4a";
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
            durationSec: artifact.durationSeconds || null
          }
        ]
      };
    }
    const extracted = extractAudioTrackFromMp4(downloadedBytes);
    if (extracted && extracted.bytes && extracted.extractedBytes <= MAX_SINGLE_M4A_FOR_ALL_PROVIDERS) {
      notifyTabProgress(tabId, {
        cacheKey: artifact.cacheKey,
        artifactId: artifact.artifactId,
        mediaToken: artifact.mediaToken,
        label: "Audio extracted \xB7 Transcribing\u2026",
        detail: `${formatMegabytes(originalBytes)} video -> ${formatMegabytes(
          extracted.extractedBytes
        )} .m4a`
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
            durationSec: artifact.durationSeconds || null
          }
        ]
      };
    }
    const decodeSourceBytes = extracted && extracted.bytes ? extracted.bytes : downloadedBytes;
    if (tabId && tabsApi?.sendMessage && decodeSourceBytes.byteLength <= MAX_SAFE_IPC_DECODE_BYTES) {
      const decodedRes = await new Promise((resolve) => {
        tabsApi.sendMessage(
          tabId,
          {
            type: RUNTIME_MESSAGE.DECODE_WAV_FALLBACK,
            base64Media: uint8ToBase642(decodeSourceBytes)
          },
          (resp) => {
            void globalThis.chrome?.runtime?.lastError;
            resolve(resp || null);
          }
        );
      });
      if (decodedRes?.ok && Array.isArray(decodedRes.chunks) && decodedRes.chunks.length > 0) {
        const chunks = decodedRes.chunks.map((c) => ({
          bytes: base64ToUint8(c.base64),
          mimeType: c.mimeType,
          fileName: c.fileName,
          startOffsetSec: c.startOffsetSec,
          durationSec: c.durationSec
        }));
        const extractedBytes = chunks.reduce((acc, c) => acc + c.bytes.byteLength, 0);
        return {
          originalBytes,
          extractedBytes,
          durationSeconds: artifact.durationSeconds || null,
          chunks
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
            durationSec: artifact.durationSeconds || null
          }
        ]
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
            durationSec: artifact.durationSeconds || null
          }
        ]
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
    const mediaToken = artifact.mediaToken || extractMediaToken(artifact.mediaUrl);
    const cacheKey = artifact.cacheKey || resolveSubtitleCacheKey({
      artifactId: artifact.artifactId,
      mediaToken,
      mediaUrl: artifact.mediaUrl
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
      const cloudEntry = await fetchCloudSubtitleIfAvailable({
        cacheKey,
        artifactId: artifact.artifactId,
        mediaToken
      });
      if (cloudEntry) {
        const hydrated = await saveCachedSubtitles(cloudEntry, storageArea);
        await appendDebugEntry({
          layer: "SYNC",
          event: "neon.cache_hit",
          detail: `Loaded ${hydrated.cueCount} cues from Neon Postgres in 1 round-trip`,
          level: "ok"
        });
        return { ok: true, cached: true, cloudCached: true, entry: hydrated };
      }
    }
    if (inFlightPromises.has(cacheKey)) {
      return inFlightPromises.get(cacheKey);
    }
    const tabId = sender?.tab?.id || null;
    startJobKeepAlive();
    const jobPromise = (async () => {
      const [settings, secretKeysMap] = await Promise.all([
        getSettings(storageArea),
        getSecretApiKeysMap(storageArea)
      ]);
      const candidates = [];
      for (const providerId of settings.queueOrder) {
        const spec = getProviderSpec(providerId);
        const apiKey = secretKeysMap[providerId] || "";
        const enabledCustom = providerId === "custom" && (settings.customEnabled || Boolean(settings.customBaseUrl));
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
          enabledInQueue: true
        });
      }
      if (candidates.length === 0) {
        const noKeyMsg = "No STT API key configured yet. Open LM Subs and add a free Groq or Mistral key (or sign in to Neon Sync).";
        await setLastStatus(
          {
            state: "error",
            title: artifact.title || "Video Overview",
            message: noKeyMsg
          },
          storageArea
        );
        return { ok: false, error: noKeyMsg };
      }
      await setLastStatus(
        {
          state: "working",
          title: artifact.title || "Video Overview",
          message: `Transcribing via ${getProviderSpec(candidates[0].providerId).name}\u2026`
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
          label: "Fetching compact audio stream\u2026",
          detail: artifact.title || ""
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
          label: `Transcribing via ${getProviderSpec(candidates[0].providerId).name}\u2026`,
          detail: `${formatMegabytes(audioBundle.originalBytes)} -> ${formatMegabytes(
            audioBundle.extractedBytes
          )} audio`
        });
      }
      const language = settings.languageHint && settings.languageHint !== "auto" ? settings.languageHint : artifact.language || null;
      await appendDebugEntry({
        layer: "STT",
        event: "stt.dispatch",
        detail: `Sending ${audioBundle.chunks.length} chunk(s) (${formatMegabytes(
          audioBundle.extractedBytes
        )}) to [${candidates.map((c) => c.providerId).join(" -> ")}]`
      });
      const txResult = await transcribeWithQueue({
        chunks: audioBundle.chunks,
        candidates,
        language,
        translateTo: settings.translateTo || "original",
        timeoutMs: 9e4,
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
            cues: partial.cues
          });
        },
        fetchImpl
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
        level: "ok"
      });
      const resolvedDurationSec = audioBundle.durationSeconds || artifact.durationSeconds || null;
      const finalByteStats = resolveAvoidedVideoBytes({
        originalBytes: audioBundle.originalBytes,
        extractedBytes: audioBundle.extractedBytes,
        durationSeconds: resolvedDurationSec || 0,
        cues: txResult.cues
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
          cues: txResult.cues
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
          message: `${savedEntry.cueCount} cues \xB7 ${(txResult.latencyMs / 1e3).toFixed(1)}s via ${txResult.providerName}`
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
          fireDesktop: false
        }).catch(() => {
        });
      }
      await emitExtensionNotification({
        kind: "ready",
        title: `Subtitles ready: ${savedEntry.title}`,
        body: `${savedEntry.cueCount} cues generated in ${(txResult.latencyMs / 1e3).toFixed(1)}s via ${txResult.providerName}.`,
        cacheKey: savedEntry.cacheKey,
        provider: txResult.provider,
        fireDesktop: true
      }).catch(() => {
      });
      const readyMsg = {
        type: RUNTIME_MESSAGE.SUBTITLES_READY,
        cacheKey: savedEntry.cacheKey,
        artifactId: savedEntry.artifactId,
        title: savedEntry.title,
        cueCount: savedEntry.cueCount,
        provider: txResult.providerName
      };
      notifyTabMessage(tabId, readyMsg);
      try {
        runtimeApi?.sendMessage?.(readyMsg, () => {
          void globalThis.chrome?.runtime?.lastError;
        });
      } catch {
      }
      getCloudSyncProfile(storageArea).then((prof) => {
        if (prof.connected && prof.autoSync) {
          return runBidirectionalCloudSync({ pushOnly: true });
        }
        return null;
      }).catch(() => {
      });
      return { ok: true, cached: false, entry: savedEntry };
    })().catch(async (err) => {
      const [secretsMap, syncTok] = await Promise.all([
        getSecretApiKeysMap(storageArea).catch(() => ({})),
        getSecretCloudSyncToken(storageArea).catch(() => "")
      ]);
      const allSecrets = [...Object.values(secretsMap), syncTok].filter(Boolean);
      const safeError = redactSecrets(err?.message || String(err), allSecrets);
      await appendDebugEntry(
        {
          layer: "SW",
          event: "pipeline.error",
          detail: safeError,
          level: "error"
        },
        allSecrets
      ).catch(() => {
      });
      await setLastStatus(
        {
          state: "error",
          title: artifact.title || "Video Overview",
          message: safeError
        },
        storageArea
      ).catch(() => {
      });
      await emitExtensionNotification({
        kind: "error",
        title: `Subtitle error: ${artifact.title || "Video Overview"}`,
        body: safeError,
        cacheKey,
        fireDesktop: true
      }).catch(() => {
      });
      await syncToolbarBadge({ transientState: "error" });
      return {
        ok: false,
        error: safeError,
        missingPermissions: Boolean(err?.missingPermissions)
      };
    }).finally(() => {
      inFlightPromises.delete(cacheKey);
      stopJobKeepAlive();
    });
    inFlightPromises.set(cacheKey, jobPromise);
    return jobPromise;
  }
  async function handleTestProvider(msg) {
    const providerId = msg?.providerId || "groq";
    const spec = getProviderSpec(providerId);
    const settings = await getSettings(storageArea);
    const savedKey = await getApiKey(providerId, storageArea);
    const apiKey = typeof msg?.unsavedApiKey === "string" && msg.unsavedApiKey.trim() ? msg.unsavedApiKey.trim() : savedKey;
    if (spec.requiresKey && !apiKey) {
      return {
        ok: false,
        error: `Enter or save a ${spec.name} API key first.`
      };
    }
    const model = typeof msg?.model === "string" && msg.model.trim() || getModelForProvider(settings, providerId);
    const customBaseUrl = typeof msg?.customBaseUrl === "string" ? msg.customBaseUrl.trim() : settings.customBaseUrl;
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
        timeoutMs: 25e3,
        fetchImpl
      });
      return {
        ok: true,
        provider: spec.id,
        providerName: spec.name,
        model,
        latencyMs: Date.now() - startedAt
      };
    } catch (err) {
      return {
        ok: false,
        error: redactSecrets(err?.message || String(err), [apiKey])
      };
    }
  }
  return function onRuntimeMessage(msg, sender, sendResponse) {
    if (!msg || typeof msg.type !== "string" || !msg.type.startsWith(MESSAGE_NAMESPACE)) {
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
          mediaToken: msg.mediaToken
        },
        storageArea
      ).then((entry) => sendResponse({ ok: true, entry })).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.ENSURE_SUBTITLES) {
      handleEnsureSubtitles(msg, sender).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.SAVE_IMPORTED_SUBTITLES && msg.entry) {
      saveCachedSubtitles(msg.entry, storageArea).then((saved) => {
        getCloudSyncProfile(storageArea).then((prof) => {
          if (prof.connected && prof.autoSync) {
            return runBidirectionalCloudSync({ pushOnly: true });
          }
          return null;
        }).catch(() => {
        });
        sendResponse({ ok: true, entry: saved });
      }).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
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
            title: typeof msg.title === "string" && msg.title.trim() ? msg.title.trim() : existing.title,
            cues: cleanedCues
          },
          storageArea
        );
        await broadcastUpdatedSubtitlesToTabs([saved]);
        await emitExtensionNotification({
          kind: "edit",
          title: `Saved cue edits: ${saved.title}`,
          body: `Updated ${saved.cueCount} synchronized cues.`,
          cacheKey: saved.cacheKey,
          fireDesktop: false
        }).catch(() => {
        });
        getCloudSyncProfile(storageArea).then((prof) => {
          if (prof.connected && prof.autoSync) {
            return runBidirectionalCloudSync({ pushOnly: true });
          }
          return null;
        }).catch(() => {
        });
        return { ok: true, entry: saved };
      })().then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.GET_NOTIFICATIONS) {
      getNotifications(storageArea).then((notifications) => {
        const unreadCount = notifications.filter((n) => !n.read).length;
        sendResponse({ ok: true, unreadCount, notifications });
      }).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.MARK_NOTIFICATIONS_READ) {
      markNotificationsRead({ id: msg.id || null }, storageArea).then(async (notifications) => {
        await syncToolbarBadge();
        const unreadCount = notifications.filter((n) => !n.read).length;
        sendResponse({ ok: true, unreadCount, notifications });
      }).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.CLEAR_NOTIFICATIONS) {
      clearNotifications(storageArea).then(async () => {
        await syncToolbarBadge();
        sendResponse({ ok: true, unreadCount: 0, notifications: [] });
      }).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.TEST_DESKTOP_NOTIFICATION) {
      (async () => {
        const created = await emitExtensionNotification({
          kind: "ready",
          title: "LM Subs desktop alerts active",
          body: "You will receive an alert when background Video Overviews finish captioning.",
          fireDesktop: false
        });
        const osDispatched = await fireDesktopAlertIfPermitted({
          id: `test_${Date.now()}`,
          title: "LM Subs desktop alerts active",
          body: "Background Video Overview alerts are ready."
        });
        return { ok: true, notification: created, osDispatched };
      })().then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.GET_UPDATE_STATUS) {
      Promise.all([
        getUpdateStatus(storageArea),
        dirHandleLoader().catch(() => null)
      ]).then(async ([status, dirHandle]) => {
        const dirInfo = await inspectLinkedDirPermission(dirHandle);
        sendResponse({
          ok: true,
          status: {
            ...status,
            linkedFolderName: dirInfo.folderName || status.linkedFolderName || ""
          },
          folderLinked: dirInfo.linked,
          folderPermission: dirInfo.permission
        });
      }).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.CHECK_FOR_UPDATES) {
      checkExtensionUpdate({
        attemptAutoApply: msg.attemptAutoApply !== false
      }).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.APPLY_UNPACKED_UPDATE) {
      applyUnpackedUpdateNow({
        zipUrl: msg.zipUrl || "",
        zipSha256: msg.zipSha256 || "",
        targetVersion: msg.targetVersion || "",
        targetBuildId: msg.targetBuildId || ""
      }).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({
          ok: false,
          code: err?.code || "",
          error: err?.message || String(err)
        })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK) {
      Promise.all([
        runAutomaticBackgroundCloudPoll().catch((err) => ({
          ok: false,
          error: err?.message || String(err)
        })),
        msg.includeUpdateCheck ? checkExtensionUpdate({ attemptAutoApply: true }).catch(() => null) : Promise.resolve(null)
      ]).then(
        ([syncOut, updateOut]) => sendResponse({ ok: true, sync: syncOut, update: updateOut })
      ).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.TEST_PROVIDER) {
      handleTestProvider(msg).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.SYNC_STATUS) {
      getCloudSyncProfile(storageArea).then((profile) => sendResponse({ ok: true, profile })).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.SYNC_SIGNUP) {
      handleSyncSignup(msg).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.SYNC_SIGNIN) {
      handleSyncSignin(msg).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.SYNC_EMAIL_SEND_CODE) {
      handleSyncEmailSendCode(msg).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.SYNC_EMAIL_VERIFY_CODE) {
      handleSyncEmailVerifyCode(msg).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.SYNC_SAVE_PREFERENCES) {
      handleSyncSavePreferences(msg).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.SYNC_GET_STATS) {
      handleSyncGetStats().then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.SYNC_SIGNOUT) {
      handleSyncSignout().then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.SYNC_NOW) {
      runBidirectionalCloudSync({
        deletedProviders: Array.isArray(msg.deletedProviders) ? msg.deletedProviders : [],
        deletedCacheKeys: Array.isArray(msg.deletedCacheKeys) ? msg.deletedCacheKeys : [],
        pushOnly: Boolean(msg.pushOnly)
      }).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.RECORD_NOTEBOOKLM_TELEMETRY && msg.event) {
      recordNotebookLmTelemetry(msg.event, storageArea).then((stats) => sendResponse({ ok: true, stats })).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.GET_NOTEBOOKLM_STATS) {
      getNotebookLmStats(storageArea).then((stats) => sendResponse({ ok: true, stats })).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.PLAY_NOTIFICATION_SOUND) {
      (async () => {
        const settings = await getSettings(storageArea);
        if (!settings.soundAlerts) return { ok: false, reason: "sound_off" };
        const { playCompletionChimeSound: playCompletionChimeSound2 } = await Promise.resolve().then(() => (init_chime(), chime_exports));
        const played = await playCompletionChimeSound2({
          win: globalThis,
          preset: msg.preset || settings.notificationSoundPreset || "chime",
          volume: Number(msg.volume ?? settings.notificationSoundVolume) || 75,
          force: true
        });
        return { ok: played };
      })().then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.APPEND_DEBUG_LOG && msg.entry) {
      Promise.all([
        getSecretApiKeysMap(storageArea).catch(() => ({})),
        getSecretCloudSyncToken(storageArea).catch(() => "")
      ]).then(
        ([secretsMap, syncTok]) => appendDebugEntry(
          msg.entry,
          [...Object.values(secretsMap), syncTok].filter(Boolean)
        )
      ).then((saved) => sendResponse({ ok: true, entry: saved })).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.CLEAR_DEBUG_LOGS) {
      memoryDebugLogs.length = 0;
      clearDebugLogs(storageArea).then(() => sendResponse({ ok: true })).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    if (msg.type === RUNTIME_MESSAGE.GET_DEBUG_REPORT) {
      (async () => {
        await ensureDebugLogsHydrated();
        const [settings, presenceMap, lastStatus, permCheck, syncProfile] = await Promise.all([
          getSettings(storageArea),
          getSavedKeyPresenceMap(storageArea),
          getLastStatus(storageArea),
          checkGoogleHostPermissions(),
          getCloudSyncProfile(storageArea)
        ]);
        const configuredProviders = Object.entries(presenceMap).filter(([, has]) => Boolean(has)).map(([id]) => id);
        const manifestVersion = runtimeApi?.getManifest?.()?.version || "0.2.8";
        const reportObj = {
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          extensionVersion: manifestVersion,
          permissionsOk: permCheck.ok,
          missingOrigins: permCheck.missingOrigins,
          neonSync: {
            connected: syncProfile.connected,
            serverUrl: syncProfile.serverUrl,
            lastSyncedAt: syncProfile.lastSyncedAt
          },
          settingsSummary: {
            enabled: settings.enabled,
            debugMode: settings.debugMode,
            autoOnGenerate: settings.autoOnGenerate,
            autoOnExistingVideos: settings.autoOnExistingVideos,
            primaryProvider: settings.primaryProvider,
            configuredProviders,
            queueOrder: settings.queueOrder.slice(0, 6)
          },
          lastStatus,
          tabContext: msg.tabContext || null,
          logs: [...memoryDebugLogs]
        };
        const lines = [
          `# LM Subs \u2014 Diagnostic Report (v${manifestVersion})`,
          `Generated: ${reportObj.generatedAt}`,
          `Google CDN Permissions: ${permCheck.ok ? "GRANTED" : `MISSING (${permCheck.missingOrigins.join(", ")})`}`,
          `Neon Cloud Sync: ${syncProfile.connected ? `CONNECTED (${syncProfile.serverUrl})` : "OFFLINE"}`,
          `Enabled: ${settings.enabled} | Debug Mode: ${settings.debugMode} | Primary: ${settings.primaryProvider}`,
          `Configured Providers (keys redacted): ${configuredProviders.length > 0 ? configuredProviders.join(", ") : "(none)"}`,
          `Last Status: ${lastStatus ? `[${lastStatus.state}] ${lastStatus.title || ""} \u2014 ${lastStatus.message || ""}` : "(none)"}`
        ];
        if (msg.tabContext) {
          lines.push(
            `Tab Snapshot: host=${msg.tabContext.host}${msg.tabContext.pathname || ""} | artifacts=${msg.tabContext.artifactCount} | boundVideos=${msg.tabContext.videoCount}`
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
            lines.push(`${l.ts} [${l.layer}] ${l.event}: ${l.detail}`);
          }
        }
        return {
          ok: true,
          permissionsOk: permCheck.ok,
          missingOrigins: permCheck.missingOrigins,
          logs: reportObj.logs,
          reportJson: reportObj,
          reportText: lines.join("\n")
        };
      })().then((res) => sendResponse(res)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    return false;
  };
}
function isAllowedExternalWebSender(sender) {
  const raw = String(sender?.origin || sender?.url || "").trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) {
      return true;
    }
    if (parsed.protocol === "https:" && (host === "lm-subs.vercel.app" || host.endsWith(".vercel.app"))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
function createExternalMessageDispatcher(runtimeDispatcher, {
  storageArea = globalThis.chrome?.storage?.local,
  runtimeApi = globalThis.chrome?.runtime
} = {}) {
  const invokeInternal = (msg) => new Promise((resolve) => {
    runtimeDispatcher(msg, {}, (res) => resolve(res));
  });
  async function buildSafeHandshakePayload() {
    const [settings, presenceMap, cloudProfile, setupState] = await Promise.all([
      getSettings(storageArea),
      getSavedKeyPresenceMap(storageArea),
      getCloudSyncProfile(storageArea),
      getSetupState(storageArea)
    ]);
    const configuredProviders = Object.entries(presenceMap || {}).filter(([, present]) => Boolean(present)).map(([id]) => id);
    return {
      ok: true,
      extensionId: runtimeApi?.id || "",
      version: runtimeApi?.getManifest?.()?.version || "0.2.8",
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
        desktopNotifications: Boolean(settings.desktopNotifications)
      },
      cloudLinked: Boolean(cloudProfile?.connected),
      cloudEmail: cloudProfile?.user?.email || null,
      setupState
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
      buildSafeHandshakePayload().then((payload) => sendResponse(payload)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
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
      })().then((payload) => sendResponse(payload)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
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
          "desktopNotifications"
        ]) {
          if (typeof prefs[boolKey] === "boolean") {
            patch[boolKey] = prefs[boolKey];
          }
        }
        if (Number.isFinite(Number(prefs.karaokeDelayMs))) {
          patch.karaokeDelayMs = Math.max(
            -1500,
            Math.min(3e3, Math.round(Number(prefs.karaokeDelayMs)))
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
            { completedAt: (/* @__PURE__ */ new Date()).toISOString() },
            storageArea
          );
        }
        return buildSafeHandshakePayload();
      })().then((payload) => sendResponse(payload)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
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
          serverUrl
        });
        if (!res?.ok) {
          throw new Error(res?.error || "Could not link cloud account.");
        }
        return buildSafeHandshakePayload();
      })().then((payload) => sendResponse(payload)).catch(
        (err) => sendResponse({ ok: false, error: err?.message || String(err) })
      );
      return true;
    }
    sendResponse({ ok: false, error: "Unsupported external action." });
    return false;
  };
}
function installBackgroundAutomation(dispatcher, {
  alarmsApi = globalThis.chrome?.alarms,
  runtimeApi = globalThis.chrome?.runtime,
  notificationsApi = globalThis.chrome?.notifications,
  tabsApi = globalThis.chrome?.tabs,
  storageArea = globalThis.chrome?.storage?.local,
  welcomeBaseUrl = HOSTED_CLOUD_URL
} = {}) {
  const invoke = (msg) => new Promise((resolve) => {
    dispatcher(msg, {}, (res) => resolve(res));
  });
  const scheduleAlarms = () => {
    try {
      alarmsApi?.create?.(ALARM_NAMES.UPDATE_CHECK, {
        delayInMinutes: 1,
        periodInMinutes: 15
      });
      alarmsApi?.create?.(ALARM_NAMES.CLOUD_SYNC, {
        delayInMinutes: 1,
        periodInMinutes: 5
      });
    } catch {
    }
  };
  scheduleAlarms();
  alarmsApi?.onAlarm?.addListener?.((alarm) => {
    if (!alarm?.name) return;
    if (alarm.name === ALARM_NAMES.UPDATE_CHECK) {
      invoke({ type: RUNTIME_MESSAGE.CHECK_FOR_UPDATES }).catch(() => {
      });
    } else if (alarm.name === ALARM_NAMES.CLOUD_SYNC) {
      invoke({ type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK }).catch(() => {
      });
    }
  });
  runtimeApi?.onStartup?.addListener?.(() => {
    scheduleAlarms();
    invoke({
      type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK,
      includeUpdateCheck: true
    }).catch(() => {
    });
  });
  runtimeApi?.onInstalled?.addListener?.((details) => {
    scheduleAlarms();
    if (details?.reason === "install") {
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const extId = runtimeApi?.id || "";
      const ver = runtimeApi?.getManifest?.()?.version || "0.2.8";
      const base = normalizeSyncServerUrl(welcomeBaseUrl || HOSTED_CLOUD_URL);
      const qs = new URLSearchParams({ installed: "1", v: ver });
      if (extId) qs.set("extId", extId);
      const welcomeUrl = `${base}/welcome?${qs.toString()}`;
      saveSetupState(
        { installedAt: nowIso, welcomeOpenedAt: nowIso },
        storageArea
      ).catch(() => {
      });
      try {
        tabsApi?.create?.({ url: welcomeUrl, active: true });
      } catch {
      }
    }
    invoke({
      type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK,
      includeUpdateCheck: true
    }).catch(() => {
    });
  });
  runtimeApi?.onUpdateAvailable?.addListener?.(() => {
    try {
      runtimeApi.reload?.();
    } catch {
    }
  });
  notificationsApi?.onClicked?.addListener?.(() => {
    try {
      runtimeApi?.openOptionsPage?.();
    } catch {
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
      }
    });
  });
}
export {
  createExternalMessageDispatcher,
  createRuntimeDispatcher,
  installBackgroundAutomation,
  isAllowedExternalWebSender
};

// src/config/selectors.js
var MESSAGE_NAMESPACE = "NOTEBOOKLM_SUBTITLES_";
var KEEPALIVE_PORT_NAME = "NOTEBOOKLM_SUBTITLES_KEEPALIVE";
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
var DOM_SELECTORS = Object.freeze({
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
    "play_circle"
  ]),
  GENERATE_VIDEO_BUTTONS: Object.freeze([
    'button[aria-label*="Video Overview" i]',
    'button[aria-label*="Generate video" i]',
    'button[aria-label*="Create video" i]',
    'button.primary-action-button[aria-label*="video" i]'
  ]),
  OVERLAY_HOST_ID: "nlm-subtitles-player-root",
  OVERLAY_HOST_CLASS: "nlm-subtitles-player-overlay",
  TOAST_HOST_ID: "nlm-subtitles-toast-root",
  DEBUG_DRAWER_HOST_ID: "nlm-subtitles-debug-root",
  TRACK_LABEL: "NotebookLM Auto-Subtitles"
});
var PAGE_MESSAGE = Object.freeze({
  BRIDGE_SOURCE_PAGE: "notebooklm-subtitles-page",
  BRIDGE_SOURCE_CONTENT: "notebooklm-subtitles-content",
  BATCH_ARTIFACTS: "NOTEBOOKLM_BATCH_ARTIFACTS",
  SYNC_RPC_OVERRIDES: "NOTEBOOKLM_SYNC_RPC_OVERRIDES",
  REQUEST_PAGE_STATE: "NOTEBOOKLM_REQUEST_PAGE_STATE",
  PAGE_STATE_SNAPSHOT: "NOTEBOOKLM_PAGE_STATE_SNAPSHOT",
  PAGE_DEBUG_EVENT: "NOTEBOOKLM_PAGE_DEBUG_EVENT",
  EXTRACT_AUDIO_REQUEST: "NOTEBOOKLM_EXTRACT_AUDIO_REQUEST",
  EXTRACT_AUDIO_RESPONSE: "NOTEBOOKLM_EXTRACT_AUDIO_RESPONSE"
});
var RUNTIME_MESSAGE = Object.freeze({
  ENSURE_SUBTITLES: "NOTEBOOKLM_SUBTITLES_ENSURE",
  STAGE_AUDIO_CHUNK: "NOTEBOOKLM_SUBTITLES_STAGE_AUDIO_CHUNK",
  GET_CACHED_SUBTITLES: "NOTEBOOKLM_SUBTITLES_GET_CACHED",
  SAVE_IMPORTED_SUBTITLES: "NOTEBOOKLM_SUBTITLES_SAVE_IMPORTED",
  TEST_PROVIDER: "NOTEBOOKLM_SUBTITLES_TEST_PROVIDER",
  SUBTITLES_PROGRESS: "NOTEBOOKLM_SUBTITLES_PROGRESS",
  SUBTITLES_READY: "NOTEBOOKLM_SUBTITLES_READY",
  GET_ACTIVE_TAB_STATE: "NOTEBOOKLM_SUBTITLES_GET_ACTIVE_TAB_STATE",
  TRIGGER_ACTIVE_VIDEO: "NOTEBOOKLM_SUBTITLES_TRIGGER_ACTIVE_VIDEO",
  APPEND_DEBUG_LOG: "NOTEBOOKLM_SUBTITLES_APPEND_DEBUG_LOG",
  GET_DEBUG_REPORT: "NOTEBOOKLM_SUBTITLES_GET_DEBUG_REPORT",
  CLEAR_DEBUG_LOGS: "NOTEBOOKLM_SUBTITLES_CLEAR_DEBUG_LOGS"
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
  if (isTrusted && tokenMatch && !mediaUrl.includes("/rd-notebooklm/")) {
    const base = mediaUrl.replace(FIFE_SUFFIX_RE, "");
    if (base !== mediaUrl || !FIFE_SUFFIX_RE.test(mediaUrl)) {
      pushUnique(`${base}=m140`);
      pushUnique(`${base}=m18`);
      pushUnique(`${base}=m22`);
      pushUnique(`${base}=m140-dv`);
      pushUnique(`${base}=m22-dv`);
    }
  }
  if (!isThumbnailOrManifestUrl(mediaUrl)) {
    pushUnique(mediaUrl);
  }
  if (isTrusted && tokenMatch && !mediaUrl.includes("/rd-notebooklm/") && mediaUrl.includes("googleusercontent.com/notebooklm/")) {
    const token = tokenMatch[1];
    pushUnique(`https://lh3.google.com/notebooklm/${token}=m140`);
    pushUnique(`https://lh3.google.com/notebooklm/${token}=m18`);
    pushUnique(`https://lh3.google.com/notebooklm/${token}=m22`);
  }
  return out;
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
    cleaned.push({ startSec, endSec, text, ...speaker ? { speaker } : {} });
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
    badge: "Best Free Tier \xB7 8 hrs/day",
    freeTierSummary: "Permanent free plan, no card: 20 RPM, 2,000 req/day, 7,200 audio sec/hr (2h/hr), 28,800 sec/day (8h/day).",
    defaultModel: "whisper-large-v3-turbo",
    models: ["whisper-large-v3-turbo", "whisper-large-v3"],
    requiresKey: true,
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    originPattern: "https://api.groq.com/*",
    maxUploadBytes: 24 * 1024 * 1024,
    // 25 MB hard cap -> 24 MB safety margin
    protocol: "openai-stt",
    endpoint: "https://api.groq.com/openai/v1/audio/transcriptions"
  }),
  mistral: Object.freeze({
    id: "mistral",
    name: "Mistral (Voxtral)",
    badge: "Free Studio Tier \xB7 No Card",
    freeTierSummary: "Mistral Studio Experiment plan (free, no card). Voxtral Transcribe 3 returns accurate segment timestamps in 50+ languages.",
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
    badge: "Free Daily Tier \xB7 + Translation",
    freeTierSummary: "Google AI Studio free tier, no card. Multimodal audio-to-SRT with optional single-pass subtitle translation.",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    requiresKey: true,
    keyPlaceholder: "AIzaSy...",
    keyUrl: "https://aistudio.google.com/apikey",
    originPattern: "https://generativelanguage.googleapis.com/*",
    maxUploadBytes: 18 * 1024 * 1024,
    // Inline base64 stays comfortably under 20 MB request cap
    protocol: "gemini-stt",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models"
  }),
  deepgram: Object.freeze({
    id: "deepgram",
    name: "Deepgram",
    badge: "$200 Free Credit \xB7 ~700 hrs",
    freeTierSummary: "$200 signup credit with no credit card (~700+ hours of Nova-3 batch audio with word-level timestamps).",
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
    badge: "$50 Free Credit \xB7 ~330 hrs",
    freeTierSummary: "$50 free signup credit with no card (~330 hours on Universal-2 with word-level timestamps).",
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
    badge: "\u20AC50 Free Credit \xB7 ~80 hrs",
    freeTierSummary: "\u20AC50 free credit (~80+ hours of Solaria-1 pre-recorded transcription with native SRT/VTT generation).",
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
    freeTierSummary: "Free monthly Serverless Inference credits using any `hf_...` read/inference token.",
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
    freeTierSummary: "Unified OpenAI-compatible `/api/v1/audio/transcriptions` router across Voxtral & Whisper backends.",
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
    freeTierSummary: "Official OpenAI `whisper-1` endpoint ($0.006/min) with word & segment `verbose_json` timestamps.",
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
    badge: "100% Free \xB7 Unlimited Local",
    freeTierSummary: "Point at local `speaches`, `faster-whisper-server`, `whisper.cpp`, or `LocalAI` (`http://localhost:8000/v1`) for unlimited offline transcription.",
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
    if (providerId === "groq" || providerId === "openai") {
      form.append("timestamp_granularities[]", "word");
    }
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
  timeoutMs = 12e4,
  singleProviderRetryDelayMs = 1100,
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
      "No STT API key configured yet. Click the Subtitles for NotebookLM toolbar icon and paste a free Groq or Mistral API key."
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
      const merged = [];
      for (const ch of audioChunks) {
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
        merged.push(...partCues);
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
  DEBUG_LOGS: "debugLogs"
});
var MAX_CACHE_ENTRIES = 35;
var MAX_HISTORY_ENTRIES = 60;
var MAX_DEBUG_LOGS = 120;
var DEFAULT_SETTINGS = Object.freeze({
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
  fontSize: "medium",
  // "small" | "medium" | "large" | "xlarge"
  subtitleOffsetSec: 0,
  showToast: true,
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
    primaryProvider,
    queueOrder,
    providerModels,
    customBaseUrl: typeof saved.customBaseUrl === "string" ? saved.customBaseUrl.trim() : "",
    customEnabled: Boolean(saved.customEnabled),
    languageHint: typeof saved.languageHint === "string" && saved.languageHint ? saved.languageHint : "auto",
    translateTo: typeof saved.translateTo === "string" && saved.translateTo ? saved.translateTo : "original",
    fontSize: ["small", "medium", "large", "xlarge"].includes(saved.fontSize) ? saved.fontSize : "medium",
    subtitleOffsetSec: Number.isFinite(Number(saved.subtitleOffsetSec)) ? Math.max(-10, Math.min(10, Number(saved.subtitleOffsetSec))) : 0,
    showToast: typeof saved.showToast === "boolean" ? saved.showToast : DEFAULT_SETTINGS.showToast,
    excludePatterns: Array.isArray(saved.excludePatterns) ? saved.excludePatterns.map((s) => String(s).trim()).filter(Boolean) : [],
    rpcOverrides
  };
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
  return text.replace(/\b(?:gsk_|sk-|AIza|hf_|xi-)[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_KEY]").replace(/Bearer\s+[A-Za-z0-9._:-]+/gi, "Bearer [REDACTED]").slice(0, 600);
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

// src/background/service-worker.js
var STAGED_AUDIO_TTL_MS = 5 * 60 * 1e3;
var MAX_SINGLE_M4A_FOR_ALL_PROVIDERS = 22 * 1024 * 1024;
var MAX_SAFE_IPC_DECODE_BYTES = 38 * 1024 * 1024;
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
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
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
function createRuntimeDispatcher({
  storageArea = globalThis.chrome?.storage?.local,
  fetchImpl = globalThis.fetch,
  tabsApi = globalThis.chrome?.tabs,
  permissionsApi = globalThis.chrome?.permissions
} = {}) {
  const inFlightPromises = /* @__PURE__ */ new Map();
  const stagedAudioJobs = /* @__PURE__ */ new Map();
  const memoryDebugLogs = [];
  let debugLogsHydrated = false;
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
  function notifyTabProgress(tabId, payload) {
    if (!tabId || !tabsApi?.sendMessage) return;
    try {
      tabsApi.sendMessage(
        tabId,
        {
          type: RUNTIME_MESSAGE.SUBTITLES_PROGRESS,
          ...payload
        },
        () => {
          void globalThis.chrome?.runtime?.lastError;
        }
      );
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
  async function fetchAndExtractCompactAudio(artifact, tabId, pageFetchError = null) {
    const seedUrl = artifact.progressiveUrl || artifact.mediaUrl;
    const rawCandidates = [
      ...deriveGoogleMediaVariants(seedUrl),
      ...deriveGoogleMediaVariants(artifact.mediaUrl),
      ...Array.isArray(artifact.mediaVariants) ? artifact.mediaVariants : [],
      artifact.progressiveUrl,
      artifact.mediaUrl
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
      )}`
    });
    let downloadedBytes = null;
    let downloadedContentType = "";
    let lastDownloadErr = pageFetchError || "Failed to fetch Video Overview stream.";
    for (const candidateUrl of allCandidateUrls) {
      let hostLabel = "googleusercontent.com";
      try {
        hostLabel = new URL(candidateUrl).hostname;
      } catch {
      }
      let skipCandidateVariant = false;
      for (const credentialsMode of ["include", "omit"]) {
        try {
          const res = await fetchImpl(candidateUrl, {
            method: "GET",
            credentials: credentialsMode
          });
          if (!res.ok) {
            lastDownloadErr = `Media CDN (${hostLabel}) returned HTTP ${res.status}`;
            await appendDebugEntry({
              layer: "SW",
              event: "media.http_status",
              detail: `${summarizeMediaUrlForDebug(candidateUrl)} [${credentialsMode}] -> HTTP ${res.status}`
            });
            if (res.status === 404 || res.status === 400) {
              break;
            }
            continue;
          }
          const ct = res.headers?.get?.("content-type") || "";
          const buf = new Uint8Array(await res.arrayBuffer());
          const validated = validateMediaPayload(buf, ct);
          const trackInfo = inspectMp4Tracks(validated);
          if (trackInfo.isMp4 && trackInfo.hasVideo && !trackInfo.hasAudio && !trackInfo.isFragmented) {
            lastDownloadErr = `Skipped silent video-only preview stream (${summarizeMediaUrlForDebug(
              candidateUrl
            )})`;
            await appendDebugEntry({
              layer: "SW",
              event: "media.skip_silent",
              detail: `${summarizeMediaUrlForDebug(candidateUrl)} has vide track only (0 soun tracks, ${validated.byteLength} B) \u2014 advancing to next stream`
            });
            skipCandidateVariant = true;
            break;
          }
          downloadedBytes = validated;
          downloadedContentType = ct.toLowerCase();
          await appendDebugEntry({
            layer: "SW",
            event: "media.downloaded",
            detail: `Downloaded ${formatMegabytes(validated.byteLength)} (${ct || "binary"}) from ${summarizeMediaUrlForDebug(candidateUrl)} [${credentialsMode}]`,
            level: "ok"
          });
          break;
        } catch (err) {
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
            type: "NOTEBOOKLM_SUBTITLES_DECODE_WAV_FALLBACK",
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
      const isWebm = downloadedContentType.includes("webm");
      const isWav = downloadedContentType.includes("wav");
      return {
        originalBytes,
        extractedBytes: originalBytes,
        durationSeconds: artifact.durationSeconds || null,
        chunks: [
          {
            bytes: downloadedBytes,
            mimeType: isWav ? "audio/wav" : isWebm ? "audio/webm" : "audio/mp4",
            fileName: isWav ? "overview-audio.wav" : isWebm ? "overview-audio.webm" : "overview-audio.m4a",
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
    }
    if (inFlightPromises.has(cacheKey)) {
      return inFlightPromises.get(cacheKey);
    }
    const tabId = sender?.tab?.id || null;
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
        const noKeyMsg = "No STT API key configured yet. Open the Subtitles for NotebookLM popup and save a free Groq or Mistral key.";
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
      let audioBundle = stagedAudio;
      if (!audioBundle) {
        notifyTabProgress(tabId, {
          cacheKey,
          artifactId: artifact.artifactId,
          mediaToken,
          label: "Downloading & extracting audio track\u2026",
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
          detail: `${formatMegabytes(audioBundle.originalBytes)} video -> ${formatMegabytes(
            audioBundle.extractedBytes
          )} audio`
        });
      }
      const language = settings.languageHint && settings.languageHint !== "auto" ? settings.languageHint : artifact.language || null;
      await appendDebugEntry({
        layer: "STT",
        event: "stt.dispatch",
        detail: `Sending ${audioBundle.chunks.length} audio chunk(s) (${formatMegabytes(
          audioBundle.extractedBytes
        )}) to queue [${candidates.map((c) => c.providerId).join(" -> ")}]`
      });
      const txResult = await transcribeWithQueue({
        chunks: audioBundle.chunks,
        candidates,
        language,
        translateTo: settings.translateTo || "original",
        timeoutMs: 18e4,
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
          durationSeconds: audioBundle.durationSeconds || artifact.durationSeconds || null,
          extractedBytes: audioBundle.extractedBytes,
          originalBytes: audioBundle.originalBytes,
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
          extractedBytes: audioBundle.extractedBytes,
          originalBytes: audioBundle.originalBytes,
          latencyMs: txResult.latencyMs,
          message: `Generated ${savedEntry.cueCount} cues via ${txResult.providerName}`
        },
        storageArea
      );
      return { ok: true, cached: false, entry: savedEntry };
    })().catch(async (err) => {
      const secretsMap = await getSecretApiKeysMap(storageArea).catch(() => ({}));
      const allSecrets = Object.values(secretsMap);
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
      return {
        ok: false,
        error: safeError,
        missingPermissions: Boolean(err?.missingPermissions)
      };
    }).finally(() => {
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
      saveCachedSubtitles(msg.entry, storageArea).then((saved) => sendResponse({ ok: true, entry: saved })).catch(
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
    if (msg.type === RUNTIME_MESSAGE.APPEND_DEBUG_LOG && msg.entry) {
      getSecretApiKeysMap(storageArea).catch(() => ({})).then(
        (secretsMap) => appendDebugEntry(msg.entry, Object.values(secretsMap))
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
        const [settings, presenceMap, lastStatus, permCheck] = await Promise.all([
          getSettings(storageArea),
          getSavedKeyPresenceMap(storageArea),
          getLastStatus(storageArea),
          checkGoogleHostPermissions()
        ]);
        const configuredProviders = Object.entries(presenceMap).filter(([, has]) => Boolean(has)).map(([id]) => id);
        const manifestVersion = globalThis.chrome?.runtime?.getManifest?.()?.version || "0.1.2";
        const reportObj = {
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
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
            queueOrder: settings.queueOrder.slice(0, 6)
          },
          lastStatus,
          tabContext: msg.tabContext || null,
          logs: [...memoryDebugLogs]
        };
        const lines = [
          `# Subtitles for NotebookLM \u2014 Diagnostic Report (v${manifestVersion})`,
          `Generated: ${reportObj.generatedAt}`,
          `Google CDN Permissions: ${permCheck.ok ? "GRANTED" : `MISSING (${permCheck.missingOrigins.join(", ")})`}`,
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
if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(createRuntimeDispatcher());
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
  createRuntimeDispatcher
};

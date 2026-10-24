(() => {
  // src/config/selectors.js
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
    TRACK_LABEL: "LM Subs"
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
    SUBTITLES_PARTIAL: "NOTEBOOKLM_SUBTITLES_PARTIAL",
    SUBTITLES_READY: "NOTEBOOKLM_SUBTITLES_READY",
    GET_ACTIVE_TAB_STATE: "NOTEBOOKLM_SUBTITLES_GET_ACTIVE_TAB_STATE",
    TRIGGER_ACTIVE_VIDEO: "NOTEBOOKLM_SUBTITLES_TRIGGER_ACTIVE_VIDEO",
    APPEND_DEBUG_LOG: "NOTEBOOKLM_SUBTITLES_APPEND_DEBUG_LOG",
    GET_DEBUG_REPORT: "NOTEBOOKLM_SUBTITLES_GET_DEBUG_REPORT",
    CLEAR_DEBUG_LOGS: "NOTEBOOKLM_SUBTITLES_CLEAR_DEBUG_LOGS",
    SYNC_SIGNUP: "NOTEBOOKLM_SUBTITLES_SYNC_SIGNUP",
    SYNC_SIGNIN: "NOTEBOOKLM_SUBTITLES_SYNC_SIGNIN",
    SYNC_SIGNOUT: "NOTEBOOKLM_SUBTITLES_SYNC_SIGNOUT",
    SYNC_NOW: "NOTEBOOKLM_SUBTITLES_SYNC_NOW",
    SYNC_STATUS: "NOTEBOOKLM_SUBTITLES_SYNC_STATUS"
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
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var FIFE_NOTEBOOKLM_TOKEN_RE = /\/(?:rd-)?notebook(?:lm)?\/([A-Za-z0-9_-]{16,})/;
  var FIFE_SUFFIX_RE = /=[A-Za-z0-9_,.-]+$/;
  function isBatchExecuteUrl(url) {
    if (typeof url !== "string" || !url) return false;
    return BATCHEXECUTE.PATH_SUBSTRINGS.some((sub) => url.includes(sub));
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
  function normalizeStatusCode(code) {
    switch (code) {
      case BATCHEXECUTE.ARTIFACT_STATUS.INITIALIZED:
        return "initializing";
      case BATCHEXECUTE.ARTIFACT_STATUS.PROCESSING:
        return "processing";
      case BATCHEXECUTE.ARTIFACT_STATUS.READY:
        return "ready";
      case BATCHEXECUTE.ARTIFACT_STATUS.FAILED:
        return "failed";
      default:
        return "unknown";
    }
  }
  function extractFreqParam(body) {
    if (!body) return null;
    if (typeof body === "string") {
      if (body.includes("f.req=")) {
        try {
          const params = new URLSearchParams(body);
          return params.get("f.req");
        } catch {
          return null;
        }
      }
      const trimmed = body.trim();
      if (trimmed.startsWith("[")) return trimmed;
      return null;
    }
    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
      return body.get("f.req");
    }
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      const val = body.get("f.req");
      return typeof val === "string" ? val : null;
    }
    return null;
  }
  function parseBatchExecuteRequest(body, rpcOverrides = {}) {
    const createRpcId = rpcOverrides?.CREATE_STUDIO || BATCHEXECUTE.RPC_IDS.CREATE_STUDIO;
    const freqRaw = extractFreqParam(body);
    if (!freqRaw) return null;
    let outer;
    try {
      outer = JSON.parse(freqRaw);
    } catch {
      return null;
    }
    if (!Array.isArray(outer)) return null;
    const calls = Array.isArray(outer[0]) && Array.isArray(outer[0][0]) ? outer[0] : outer;
    for (const call of calls) {
      if (!Array.isArray(call) || call.length < 2) continue;
      const rpcId = call[0];
      const paramsJson = call[1];
      if (typeof rpcId !== "string" || typeof paramsJson !== "string") continue;
      let params;
      try {
        params = JSON.parse(paramsJson);
      } catch {
        continue;
      }
      if (!Array.isArray(params) || params.length < 3) continue;
      const notebookId = typeof params[1] === "string" ? params[1] : null;
      const content = params[2];
      const isCreateIdMatch = rpcId === createRpcId;
      const isStructuralVideoCreate = Array.isArray(content) && content[2] === BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW && Array.isArray(content[3]);
      if ((isCreateIdMatch || isStructuralVideoCreate) && Array.isArray(content) && content[2] === BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW) {
        const videoOpts = content[BATCHEXECUTE.ROW_POS.VIDEO_METADATA];
        const innerOpts = Array.isArray(videoOpts) ? videoOpts[2] : null;
        const language = Array.isArray(innerOpts) && typeof innerOpts[1] === "string" ? innerOpts[1] : null;
        const focusPrompt = Array.isArray(innerOpts) && typeof innerOpts[2] === "string" ? innerOpts[2] : null;
        return {
          isVideoCreate: true,
          rpcId,
          notebookId,
          language,
          focusPrompt
        };
      }
    }
    return null;
  }
  function extractVideoMetadataFromRow(row) {
    if (!Array.isArray(row)) return null;
    const typeCode = row[BATCHEXECUTE.ROW_POS.TYPE];
    if (typeCode !== BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW) return null;
    const artifactId = row[BATCHEXECUTE.ROW_POS.ID];
    if (typeof artifactId !== "string" || !artifactId) return null;
    const title = typeof row[BATCHEXECUTE.ROW_POS.TITLE] === "string" ? row[BATCHEXECUTE.ROW_POS.TITLE].trim() : "";
    const statusCode = typeof row[BATCHEXECUTE.ROW_POS.STATUS] === "number" ? row[BATCHEXECUTE.ROW_POS.STATUS] : 0;
    const status = normalizeStatusCode(statusCode);
    const videoBlock = row[BATCHEXECUTE.ROW_POS.VIDEO_METADATA];
    let mediaUrl = null;
    let progressiveUrl = null;
    let directAudioUrl = null;
    let language = null;
    let durationSeconds = null;
    const discoveredStreamUrls = [];
    const pushStreamUrl = (u) => {
      if (typeof u === "string" && isTrustedGoogleMediaUrl(u) && !isThumbnailOrManifestUrl(u) && !discoveredStreamUrls.includes(u)) {
        discoveredStreamUrls.push(u);
      }
    };
    if (Array.isArray(videoBlock)) {
      const progCandidate = videoBlock[BATCHEXECUTE.VIDEO_META_POS.PROGRESSIVE_URL];
      if (typeof progCandidate === "string" && isTrustedGoogleMediaUrl(progCandidate)) {
        if (!isThumbnailOrManifestUrl(progCandidate)) {
          progressiveUrl = progCandidate;
          pushStreamUrl(progCandidate);
        } else if (!progressiveUrl) {
          progressiveUrl = progCandidate;
        }
      }
      const genOpts = videoBlock[BATCHEXECUTE.VIDEO_META_POS.GENERATION_OPTIONS];
      if (Array.isArray(genOpts) && typeof genOpts[1] === "string" && genOpts[1]) {
        language = genOpts[1];
      }
      const dlCandidate = videoBlock[BATCHEXECUTE.VIDEO_META_POS.DOWNLOAD_URL];
      if (typeof dlCandidate === "string" && isTrustedGoogleMediaUrl(dlCandidate)) {
        if (!isThumbnailOrManifestUrl(dlCandidate)) {
          mediaUrl = dlCandidate;
          pushStreamUrl(dlCandidate);
        }
      }
      let fallbackMp4 = null;
      let fallbackAnyTrusted = null;
      for (const subBlock of videoBlock) {
        if (!Array.isArray(subBlock)) continue;
        for (const entry of subBlock) {
          if (!Array.isArray(entry) || typeof entry[0] !== "string") continue;
          const url = entry[0];
          const kind = entry[1];
          const mime = typeof entry[2] === "string" ? entry[2].toLowerCase() : "";
          if (!isTrustedGoogleMediaUrl(url)) continue;
          if (!fallbackAnyTrusted) fallbackAnyTrusted = url;
          if (mime === "audio/mp4" || mime === "audio/mpeg" || mime === "audio/webm") {
            if (!directAudioUrl) directAudioUrl = url;
            pushStreamUrl(url);
          } else if (mime === "video/mp4" || !mime && !isThumbnailOrManifestUrl(url)) {
            pushStreamUrl(url);
            if (kind === BATCHEXECUTE.MEDIA_KIND.PROGRESSIVE && !progressiveUrl) {
              progressiveUrl = url;
            }
            if (kind === BATCHEXECUTE.MEDIA_KIND.DOWNLOAD) {
              mediaUrl = url;
            } else if (!fallbackMp4) {
              fallbackMp4 = url;
            }
          }
        }
      }
      if (!mediaUrl && fallbackMp4) {
        mediaUrl = fallbackMp4;
      }
      if (!mediaUrl && progressiveUrl) {
        mediaUrl = progressiveUrl;
      }
      if (!mediaUrl && fallbackAnyTrusted) {
        mediaUrl = fallbackAnyTrusted;
      }
      const durTuple = videoBlock[BATCHEXECUTE.VIDEO_META_POS.DURATION];
      if (Array.isArray(durTuple) && typeof durTuple[0] === "number") {
        const secs = durTuple[0];
        const nanos = typeof durTuple[1] === "number" ? durTuple[1] : 0;
        durationSeconds = Math.round((secs + nanos / 1e9) * 100) / 100;
      }
    }
    const looksLikeArtifactRow = UUID_RE.test(artifactId) || Boolean(mediaUrl) || Array.isArray(row[BATCHEXECUTE.ROW_POS.SOURCES]);
    if (!looksLikeArtifactRow) return null;
    const primarySeed = directAudioUrl || progressiveUrl || mediaUrl;
    const variants = [];
    const pushVariant = (u) => {
      if (u && !variants.includes(u)) variants.push(u);
    };
    if (directAudioUrl) pushVariant(directAudioUrl);
    if (primarySeed) {
      for (const v of deriveGoogleMediaVariants(primarySeed)) pushVariant(v);
    }
    if (mediaUrl && mediaUrl !== primarySeed) {
      for (const v of deriveGoogleMediaVariants(mediaUrl)) pushVariant(v);
    }
    for (const extra of discoveredStreamUrls) {
      pushVariant(extra);
    }
    return {
      artifactId,
      title,
      typeCode,
      statusCode,
      status,
      language,
      mediaUrl,
      progressiveUrl: progressiveUrl || mediaUrl,
      directAudioUrl,
      mediaVariants: variants,
      mediaToken: extractMediaToken(mediaUrl || progressiveUrl || directAudioUrl || ""),
      durationSeconds
    };
  }
  function collectVideoRowsFromPayload(node, out, seenIds, depth = 0) {
    if (!Array.isArray(node) || depth > 7) return;
    const maybeVideo = extractVideoMetadataFromRow(node);
    if (maybeVideo) {
      if (!seenIds.has(maybeVideo.artifactId)) {
        seenIds.add(maybeVideo.artifactId);
        out.push(maybeVideo);
      }
      return;
    }
    for (const child of node) {
      if (Array.isArray(child)) {
        collectVideoRowsFromPayload(child, out, seenIds, depth + 1);
      }
    }
  }
  function extractRpcIdsFromUrl(url) {
    if (typeof url !== "string" || !url) return [];
    try {
      const u = new URL(url, "https://notebook.google.com");
      const raw = u.searchParams.get("rpcids") || "";
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
  function parseBatchExecuteResponse(responseText, rpcOverrides = {}) {
    if (typeof responseText !== "string" || !responseText) {
      return [];
    }
    const createRpcId = rpcOverrides?.CREATE_STUDIO || BATCHEXECUTE.RPC_IDS.CREATE_STUDIO;
    const pollRpcId = rpcOverrides?.POLL_STUDIO || BATCHEXECUTE.RPC_IDS.POLL_STUDIO;
    let body = responseText.trimStart();
    if (body.startsWith(BATCHEXECUTE.XSSI_PREFIX)) {
      body = body.slice(BATCHEXECUTE.XSSI_PREFIX.length).trimStart();
    }
    const results = [];
    const seenIds = /* @__PURE__ */ new Set();
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith("[")) continue;
      let frames;
      try {
        frames = JSON.parse(line);
      } catch {
        continue;
      }
      if (!Array.isArray(frames)) continue;
      for (const frame of frames) {
        if (!Array.isArray(frame) || frame[0] !== BATCHEXECUTE.ENVELOPE_TAG || typeof frame[2] !== "string") {
          continue;
        }
        const rpcId = frame[1];
        let inner;
        try {
          inner = JSON.parse(frame[2]);
        } catch {
          continue;
        }
        const beforeCount = results.length;
        collectVideoRowsFromPayload(inner, results, seenIds, 0);
        for (let i = beforeCount; i < results.length; i++) {
          results[i].rpcId = rpcId;
          results[i].origin = rpcId === createRpcId ? "create" : rpcId === pollRpcId ? "poll" : "structural";
        }
      }
    }
    return results;
  }
  function extractBalancedBracketJson(text, openBracketIndex) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = openBracketIndex; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === "[") {
        depth++;
      } else if (ch === "]") {
        depth--;
        if (depth === 0) {
          return text.slice(openBracketIndex, i + 1);
        }
      }
    }
    return null;
  }
  function parseAfInitDataPayloads(scriptTexts = []) {
    const results = [];
    const seenIds = /* @__PURE__ */ new Set();
    for (const scriptText of scriptTexts) {
      if (typeof scriptText !== "string" || !scriptText.includes("AF_initDataCallback")) {
        continue;
      }
      const dataKeyRe = /\bdata\s*:\s*\[/g;
      let match;
      while ((match = dataKeyRe.exec(scriptText)) !== null) {
        const bracketIdx = scriptText.indexOf("[", match.index);
        if (bracketIdx < 0) continue;
        const jsonSlice = extractBalancedBracketJson(scriptText, bracketIdx);
        if (!jsonSlice) continue;
        try {
          const parsed = JSON.parse(jsonSlice);
          const before = results.length;
          collectVideoRowsFromPayload(parsed, results, seenIds, 0);
          for (let i = before; i < results.length; i++) {
            results[i].rpcId = "AF_initDataCallback";
            results[i].origin = "ssr";
          }
        } catch {
        }
      }
    }
    return results;
  }

  // src/page/inject.js
  var GUARD_FLAG = "__notebooklmSubtitlesMainHooked__";
  var MAX_INLINE_M4A_BYTES = 20 * 1024 * 1024;
  var MAX_WAV_CHUNK_BYTES = 14 * 1024 * 1024;
  var MAX_RPC_TRACE = 30;
  function installMainWorldObserver(win = globalThis) {
    if (!win || win[GUARD_FLAG]) return;
    win[GUARD_FLAG] = true;
    let rpcOverrides = {};
    let ssrScanned = false;
    const bufferedArtifacts = /* @__PURE__ */ new Map();
    const rpcTrace = [];
    const nativeFetch = typeof win.fetch === "function" ? win.fetch.bind(win) : null;
    const trackedMediaBlobs = /* @__PURE__ */ new Map();
    if (win.URL && typeof win.URL.createObjectURL === "function") {
      const origCreateObjectURL = win.URL.createObjectURL.bind(win.URL);
      win.URL.createObjectURL = function patchedCreateObjectURL(obj) {
        const url = origCreateObjectURL(obj);
        try {
          if (typeof Blob !== "undefined" && obj instanceof Blob && (obj.size > 65536 || /^(?:video|audio)\//i.test(obj.type || ""))) {
            if (trackedMediaBlobs.size >= 4) {
              const oldestKey = trackedMediaBlobs.keys().next().value;
              trackedMediaBlobs.delete(oldestKey);
            }
            trackedMediaBlobs.set(url, obj);
            emitPageDebug(
              "blob.created",
              `Captured media Blob (${Math.round(obj.size / 1024)} KB, ${obj.type || "unknown"})`
            );
          }
        } catch {
        }
        return url;
      };
    }
    function getTargetOrigin() {
      return win.location && win.location.origin && win.location.origin !== "null" ? win.location.origin : "*";
    }
    function postToContent(type, payload, transfer = []) {
      try {
        win.postMessage(
          {
            source: PAGE_MESSAGE.BRIDGE_SOURCE_PAGE,
            type,
            payload
          },
          getTargetOrigin(),
          transfer
        );
      } catch {
      }
    }
    function emitPageDebug(event, detail, extra = null) {
      postToContent(PAGE_MESSAGE.PAGE_DEBUG_EVENT, {
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        layer: "PAGE",
        event,
        detail,
        extra
      });
    }
    function recordArtifacts(artifacts = []) {
      for (const art of artifacts) {
        if (art?.artifactId) {
          bufferedArtifacts.set(art.artifactId, art);
        }
      }
    }
    function scanSsrInitDataScripts() {
      try {
        const doc = win.document;
        if (!doc?.querySelectorAll) return [];
        const scripts = doc.querySelectorAll("script");
        if (!scripts || scripts.length === 0) return [];
        const texts = [];
        for (const s of scripts) {
          const txt = s.textContent || "";
          if (txt.includes("AF_initDataCallback")) {
            texts.push(txt);
          }
        }
        ssrScanned = true;
        if (texts.length === 0) return [];
        const found = parseAfInitDataPayloads(texts);
        if (found.length > 0) {
          recordArtifacts(found);
          emitPageDebug(
            "ssr.af_init_data",
            `Found ${found.length} Video Overview(s) in SSR AF_initDataCallback scripts`
          );
          postToContent(PAGE_MESSAGE.BATCH_ARTIFACTS, {
            isCreateVideoRequest: false,
            notebookId: null,
            artifacts: found,
            observedAt: Date.now()
          });
        }
        return found;
      } catch {
        return [];
      }
    }
    function discoverPerformanceMediaUrls() {
      const found = [];
      try {
        const entries = win.performance?.getEntriesByType?.("resource") || [];
        for (let i = entries.length - 1; i >= 0; i--) {
          const e = entries[i];
          const url = e?.name || "";
          if (!isTrustedGoogleMediaUrl(url)) continue;
          if (e.initiatorType === "img" || e.initiatorType === "css") continue;
          const isExplicitVideoInitiator = e.initiatorType === "video" || e.initiatorType === "audio" || e.initiatorType === "media";
          const isPlayableStreamPattern = /videoplayback|=m(?:18|22|37|140)(?:-dv)?(?:$|\?)/i.test(url);
          if ((isExplicitVideoInitiator || isPlayableStreamPattern) && !isThumbnailOrManifestUrl(url) && !found.includes(url)) {
            found.push(url);
          }
        }
      } catch {
      }
      return found;
    }
    async function decodeBytesToWavChunks(mediaBytes) {
      const AudioCtx = win.AudioContext || win.webkitAudioContext;
      const OfflineCtx = win.OfflineAudioContext || win.webkitOfflineAudioContext;
      if (!AudioCtx || !OfflineCtx) {
        throw new Error("WebAudio decoder unavailable in this browser context.");
      }
      const ctx = new AudioCtx();
      let decoded;
      try {
        const copy = mediaBytes.buffer.slice(
          mediaBytes.byteOffset,
          mediaBytes.byteOffset + mediaBytes.byteLength
        );
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
      const source = offline.createBufferSource();
      source.buffer = decoded;
      source.connect(offline.destination);
      source.start(0);
      const rendered = await offline.startRendering();
      const pcm = rendered.getChannelData(0);
      return slicePcmIntoWavChunks(pcm, sampleRate, MAX_WAV_CHUNK_BYTES);
    }
    async function fetchSingleCandidateInPage(url, { blobOnly = false } = {}) {
      if (typeof url !== "string" || !url) {
        throw new Error("Empty media URL");
      }
      if (url.startsWith("blob:")) {
        const tracked = trackedMediaBlobs.get(url);
        if (tracked) {
          const buf2 = new Uint8Array(await tracked.arrayBuffer());
          return {
            bytes: validateMediaPayload(buf2, tracked.type || "video/mp4"),
            contentType: tracked.type || "video/mp4"
          };
        }
        if (blobOnly) {
          throw new Error("MediaSource blob stream is not backed by a standalone Blob");
        }
        if (!nativeFetch) throw new Error("fetch unavailable");
        const blobRes = await nativeFetch(url);
        if (!blobRes.ok) throw new Error(`blob HTTP ${blobRes.status}`);
        const ct = blobRes.headers?.get?.("content-type") || "video/mp4";
        const buf = new Uint8Array(await blobRes.arrayBuffer());
        return {
          bytes: validateMediaPayload(buf, ct),
          contentType: ct
        };
      }
      if (blobOnly) {
        throw new Error("Deferring HTTPS Google CDN fetch to Service Worker");
      }
      if (!isTrustedGoogleMediaUrl(url)) {
        throw new Error("Untrusted media URL");
      }
      if (!nativeFetch) {
        throw new Error("fetch unavailable");
      }
      let lastErr = null;
      for (const credentialsMode of ["include", "omit"]) {
        try {
          const res = await nativeFetch(url, {
            method: "GET",
            credentials: credentialsMode
          });
          if (!res.ok) {
            lastErr = new Error(`HTTP ${res.status}`);
            continue;
          }
          const ct = res.headers?.get?.("content-type") || "";
          const buf = new Uint8Array(await res.arrayBuffer());
          return {
            bytes: validateMediaPayload(buf, ct),
            contentType: ct
          };
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr || new Error("In-page media fetch failed");
    }
    async function handleExtractAudioRequest({
      requestId,
      candidateUrls = [],
      videoCurrentSrc = "",
      blobOnly = false
    } = {}) {
      const discoveredMediaUrls = discoverPerformanceMediaUrls();
      const expanded = [];
      const pushUrl = (u) => {
        if (typeof u === "string" && u && !expanded.includes(u)) {
          expanded.push(u);
        }
      };
      if (videoCurrentSrc && videoCurrentSrc.startsWith("blob:")) {
        pushUrl(videoCurrentSrc);
      }
      if (!blobOnly) {
        for (const u of candidateUrls) {
          for (const v of deriveGoogleMediaVariants(u)) pushUrl(v);
          if (!isThumbnailOrManifestUrl(u)) pushUrl(u);
        }
        if (videoCurrentSrc && isTrustedGoogleMediaUrl(videoCurrentSrc)) {
          for (const v of deriveGoogleMediaVariants(videoCurrentSrc)) pushUrl(v);
          if (!isThumbnailOrManifestUrl(videoCurrentSrc)) pushUrl(videoCurrentSrc);
        }
        for (const u of discoveredMediaUrls) {
          for (const v of deriveGoogleMediaVariants(u)) pushUrl(v);
          pushUrl(u);
        }
      }
      let downloaded = null;
      let lastError = blobOnly ? "Deferred HTTPS CDN download to Service Worker." : "No downloadable media stream matched in page.";
      for (const url of expanded) {
        try {
          downloaded = await fetchSingleCandidateInPage(url, { blobOnly });
          break;
        } catch (err) {
          lastError = err?.message || String(err);
        }
      }
      if (!downloaded) {
        postToContent(PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE, {
          requestId,
          ok: false,
          deferred: Boolean(blobOnly),
          error: lastError,
          discoveredMediaUrls
        });
        return;
      }
      const originalBytes = downloaded.bytes.byteLength;
      try {
        const extracted = extractAudioTrackFromMp4(downloaded.bytes);
        if (extracted && extracted.bytes && extracted.extractedBytes <= MAX_INLINE_M4A_BYTES) {
          const cleanCopy = extracted.bytes.slice();
          postToContent(
            PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE,
            {
              requestId,
              ok: true,
              originalBytes,
              extractedBytes: cleanCopy.byteLength,
              chunks: [
                {
                  buffer: cleanCopy.buffer,
                  mimeType: "audio/mp4",
                  fileName: "overview-audio.m4a",
                  startOffsetSec: 0,
                  durationSec: null
                }
              ]
            },
            [cleanCopy.buffer]
          );
          return;
        }
        const wavChunks = await decodeBytesToWavChunks(downloaded.bytes);
        const transferList = [];
        let totalExtracted = 0;
        const serializedChunks = wavChunks.map((ch) => {
          const cleanCopy = ch.bytes.slice();
          totalExtracted += cleanCopy.byteLength;
          transferList.push(cleanCopy.buffer);
          return {
            buffer: cleanCopy.buffer,
            mimeType: ch.mimeType,
            fileName: ch.fileName,
            startOffsetSec: ch.startOffsetSec,
            durationSec: ch.durationSec
          };
        });
        postToContent(
          PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE,
          {
            requestId,
            ok: true,
            originalBytes,
            extractedBytes: totalExtracted,
            chunks: serializedChunks
          },
          transferList
        );
      } catch (err) {
        postToContent(PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE, {
          requestId,
          ok: false,
          error: `Audio decode error: ${err?.message || String(err)}`,
          discoveredMediaUrls
        });
      }
    }
    function sendStateSnapshotToContent() {
      if (!ssrScanned) {
        scanSsrInitDataScripts();
      }
      postToContent(PAGE_MESSAGE.PAGE_STATE_SNAPSHOT, {
        artifacts: [...bufferedArtifacts.values()],
        rpcTrace: [...rpcTrace],
        discoveredMediaUrls: discoverPerformanceMediaUrls(),
        ssrScanned,
        observedAt: Date.now()
      });
    }
    win.addEventListener("message", (event) => {
      if (event.source !== win) return;
      const msg = event.data;
      if (!msg || msg.source !== PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT) return;
      if (msg.type === PAGE_MESSAGE.SYNC_RPC_OVERRIDES && msg.rpcOverrides && typeof msg.rpcOverrides === "object") {
        rpcOverrides = { ...msg.rpcOverrides };
        return;
      }
      if (msg.type === PAGE_MESSAGE.REQUEST_PAGE_STATE) {
        sendStateSnapshotToContent();
        return;
      }
      if (msg.type === PAGE_MESSAGE.EXTRACT_AUDIO_REQUEST) {
        handleExtractAudioRequest(msg.payload);
      }
    });
    function inspectTransaction(url, requestBody, responseText, transport = "xhr") {
      try {
        const rpcIds = extractRpcIdsFromUrl(url);
        const reqMeta = parseBatchExecuteRequest(requestBody, rpcOverrides);
        const artifacts = responseText ? parseBatchExecuteResponse(responseText, rpcOverrides).map((art) => ({
          ...art,
          notebookId: reqMeta?.notebookId || null
        })) : [];
        if (artifacts.length > 0) {
          recordArtifacts(artifacts);
        }
        const traceEntry = {
          ts: (/* @__PURE__ */ new Date()).toISOString(),
          transport,
          rpcIds,
          isCreateVideo: Boolean(reqMeta?.isVideoCreate),
          videoCount: artifacts.length,
          statuses: artifacts.map((a) => `${a.artifactId.slice(0, 8)}:${a.status}`)
        };
        rpcTrace.push(traceEntry);
        if (rpcTrace.length > MAX_RPC_TRACE) rpcTrace.shift();
        if (reqMeta?.isVideoCreate || artifacts.length > 0 || rpcIds.includes("gArtLc") || rpcIds.includes("R7cb6c")) {
          emitPageDebug(
            "rpc.batchexecute",
            `${transport.toUpperCase()} rpcids=[${rpcIds.join(",") || "?"}] -> ${artifacts.length} video artifact(s)`
          );
        }
        const isCreateVideoRequest = Boolean(reqMeta?.isVideoCreate);
        if (isCreateVideoRequest || artifacts.length > 0) {
          postToContent(PAGE_MESSAGE.BATCH_ARTIFACTS, {
            isCreateVideoRequest,
            notebookId: reqMeta?.notebookId || null,
            artifacts,
            observedAt: Date.now()
          });
        }
      } catch {
      }
    }
    if (typeof win.fetch === "function") {
      const origFetch = win.fetch;
      win.fetch = function patchedFetch(input, init) {
        let url = "";
        let reqBody = "";
        try {
          url = typeof input === "string" ? input : input?.url || "";
          if (isBatchExecuteUrl(url) && init?.body) {
            reqBody = init.body;
          }
        } catch {
          url = "";
        }
        const promise = Reflect.apply(origFetch, this, arguments);
        if (isBatchExecuteUrl(url)) {
          promise.then((res) => {
            if (!res || typeof res.clone !== "function") return;
            return res.clone().text().then((text) => inspectTransaction(url, reqBody, text, "fetch"));
          }).catch(() => {
          });
        }
        return promise;
      };
    }
    const XHR = win.XMLHttpRequest;
    if (XHR && XHR.prototype) {
      const nativeOpen = XHR.prototype.open;
      const nativeSend = XHR.prototype.send;
      const metaMap = /* @__PURE__ */ new WeakMap();
      XHR.prototype.open = function patchedOpen(_method, url) {
        try {
          const urlStr = typeof url === "string" ? url : String(url || "");
          if (isBatchExecuteUrl(urlStr)) {
            metaMap.set(this, { url: urlStr, body: "" });
          }
        } catch {
        }
        return Reflect.apply(nativeOpen, this, arguments);
      };
      XHR.prototype.send = function patchedSend(body) {
        const meta = metaMap.get(this);
        if (meta) {
          meta.body = body || "";
          this.addEventListener(
            "load",
            () => {
              try {
                if ((!this.responseType || this.responseType === "text") && typeof this.responseText === "string") {
                  inspectTransaction(meta.url, meta.body, this.responseText, "xhr");
                }
              } catch {
              }
            },
            { once: true }
          );
        }
        return Reflect.apply(nativeSend, this, arguments);
      };
    }
    const MediaProto = win.HTMLMediaElement?.prototype;
    if (MediaProto && typeof MediaProto.play === "function") {
      const origPlay = MediaProto.play;
      MediaProto.play = function patchedPlay() {
        try {
          if (this?.tagName === "VIDEO") {
            const src = this.currentSrc || this.src || "";
            emitPageDebug(
              "video.play",
              `<video>.play() src=${summarizeMediaUrlForDebug(src)} dur=${Number.isFinite(this.duration) ? Math.round(this.duration) + "s" : "?"}`,
              {
                currentSrc: isTrustedGoogleMediaUrl(src) ? src : "",
                isBlob: src.startsWith("blob:")
              }
            );
          }
        } catch {
        }
        return Reflect.apply(origPlay, this, arguments);
      };
    }
    if (win.document) {
      if (win.document.readyState === "loading") {
        win.addEventListener?.("DOMContentLoaded", () => scanSsrInitDataScripts(), {
          once: true
        });
      } else {
        scanSsrInitDataScripts();
      }
    }
  }
  if (typeof window !== "undefined") {
    installMainWorldObserver(window);
  }
})();

/**
 * Client-side Audio Extractor & Chunker (Zero WASM / Zero External Dependencies).
 *
 * Implements:
 * 1. `extractAudioTrackFromMp4(buffer)` — Lossless ISO-BMFF (`.mp4` -> `.m4a`)
 *    audio-track remuxer. Strips all H.264/VP9/AV1 video tracks and video `mdat`
 *    payloads, repacking only the `soun` track chunks with recalculated `stco`
 *    offsets. Shrinks a 50–100 MB Video Overview MP4 down to a ~4–8 MB `.m4a`
 *    in milliseconds inside a Chrome MV3 Service Worker.
 * 2. `encodeMonoWav16Bit(samples, sampleRate)` & `slicePcmIntoWavChunks(...)` —
 *    16 kHz mono 16-bit PCM WAV encoder and automatic multi-chunk splitter with
 *    exact `startOffsetSec` timestamps for >24 MB recordings or WebAudio decode.
 * 3. `validateMediaPayload(bytes, contentType)` — Guards against 0-byte or
 *    expired-session `text/html` responses from Google's CDN.
 * 4. `createSyntheticMp4WithVideoAndAudio(...)` & `createTestSpeechCadenceWav(...)` —
 *    Deterministic binary builders for unit tests and 1-click provider latency checks.
 */

const FOURCC_Encoder = new TextEncoder();

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

/**
 * Parses contiguous ISO-BMFF boxes within `[start, end)`.
 */
export function readIsoBoxes(bytes, start = 0, end = bytes.byteLength) {
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
      endOffset: pos + boxSize,
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
      sampleDescIndex: view.getUint32(cursor + 8, false),
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
  view.setUint32(0, 0, false); // version + flags
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

/**
 * Validates that downloaded bytes are a real audio/video media payload rather than
 * an empty body, an HTML login page, an image thumbnail, or a text streaming manifest.
 */
export function validateMediaPayload(inputBuffer, contentType = "") {
  const bytes =
    inputBuffer instanceof Uint8Array
      ? inputBuffer
      : new Uint8Array(inputBuffer || 0);

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
  if (
    ct.includes("mpegurl") ||
    ct.includes("dash+xml") ||
    ct.includes("application/xml") ||
    ct.includes("text/xml") ||
    ct.includes("application/json") ||
    ct.startsWith("text/plain")
  ) {
    throw new Error(`Received streaming manifest/text (${ct}) instead of binary media.`);
  }

  // Sniff leading magic bytes even when Content-Type is generic `application/octet-stream`
  if (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    throw new Error("Received JPEG thumbnail instead of audio/video stream.");
  }
  if (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    throw new Error("Received PNG image instead of audio/video stream.");
  }
  if (
    bytes.byteLength >= 12 &&
    fourCC(bytes, 0) === "RIFF" &&
    fourCC(bytes, 8) === "WEBP"
  ) {
    throw new Error("Received WebP thumbnail instead of audio/video stream.");
  }

  const headAscii = String.fromCharCode(
    ...bytes.subarray(0, Math.min(48, bytes.byteLength))
  )
    .trimStart()
    .toLowerCase();
  if (headAscii.startsWith("<!doctype") || headAscii.startsWith("<html")) {
    throw new Error(
      "Received an HTML document instead of video/audio bytes. Refresh NotebookLM and try again."
    );
  }
  if (
    headAscii.startsWith("#extm3u") ||
    headAscii.startsWith("<?xml") ||
    headAscii.startsWith("<mpd")
  ) {
    throw new Error("Received HLS/DASH manifest text instead of binary audio/video.");
  }

  return bytes;
}

/**
 * Inspects ISO-BMFF boxes to report whether an MP4/M4A buffer has `soun` / `vide`
 * tracks or `moof` fragments (lets us skip silent video-only preview thumbnails).
 */
export function inspectMp4Tracks(inputBuffer) {
  const bytes =
    inputBuffer instanceof Uint8Array
      ? inputBuffer
      : new Uint8Array(inputBuffer || 0);
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
    isFragmented: isFragmented || hasMvex,
  };
}

/**
 * Losslessly extracts the primary `'soun'` track from an ISO-BMFF `.mp4` buffer
 * and remuxes it into a compact standalone `.m4a` (`audio/mp4`) buffer.
 *
 * Returns `{ bytes, mimeType: "audio/mp4", fileName: "audio.m4a", strippedVideo: true, ... }`
 * or `null` if the buffer is not a progressive ISO-BMFF container with a sample-table audio track.
 */
export function extractAudioTrackFromMp4(inputBuffer) {
  const bytes =
    inputBuffer instanceof Uint8Array
      ? inputBuffer
      : new Uint8Array(inputBuffer || 0);

  if (bytes.byteLength < 32) return null;

  const topBoxes = readIsoBoxes(bytes, 0, bytes.byteLength);
  const moovBox = topBoxes.find((b) => b.type === "moov");
  if (!moovBox) return null;

  const moovChildren = readIsoBoxes(bytes, moovBox.dataOffset, moovBox.endOffset);
  const mvhdBox = moovChildren.find((b) => b.type === "mvhd");
  if (!mvhdBox) return null;

  // Fragmented MP4 (`mvex` with empty sample tables) cannot be remuxed via `stco` alone
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
        stblChildren,
      };
    }
  }

  if (!soundTrak) return null;

  const stscBox = soundTrak.stblChildren.find((b) => b.type === "stsc");
  const stszBox = soundTrak.stblChildren.find((b) => b.type === "stsz");
  const stcoBox = soundTrak.stblChildren.find((b) => b.type === "stco");
  const co64Box = soundTrak.stblChildren.find((b) => b.type === "co64");

  if (!stscBox || !stszBox || (!stcoBox && !co64Box)) {
    return null;
  }

  const stsc = parseStsc(bytes, stscBox);
  const stsz = parseStsz(bytes, stszBox);
  const origOffsets = parseChunkOffsets(bytes, stcoBox, co64Box);

  if (
    stsc.length === 0 ||
    stsz.sampleCount === 0 ||
    origOffsets.length === 0
  ) {
    return null;
  }

  // Compute exact byte range for each audio chunk `1..chunkCount`
  const chunkSlices = [];
  const relativeChunkOffsets = [];
  let sampleCursor = 0;
  let stscIdx = 0;
  let totalAudioBytes = 0;

  for (let c = 0; c < origOffsets.length; c++) {
    const chunkNum1Based = c + 1;
    while (
      stscIdx + 1 < stsc.length &&
      stsc[stscIdx + 1].firstChunk <= chunkNum1Based
    ) {
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

  if (totalAudioBytes === 0 || totalAudioBytes > 0x7fffffff) {
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

    const minfParts = soundTrak.minfChildren.map((child) =>
      child.type === "stbl" ? newStbl : bytes.subarray(child.offset, child.endOffset)
    );
    const newMinf = makeBox("minf", minfParts);

    const mdiaParts = soundTrak.mdiaChildren.map((child) =>
      child.type === "minf" ? newMinf : bytes.subarray(child.offset, child.endOffset)
    );
    const newMdia = makeBox("mdia", mdiaParts);

    const trakParts = soundTrak.trakChildren.map((child) =>
      child.type === "mdia" ? newMdia : bytes.subarray(child.offset, child.endOffset)
    );
    const newTrak = makeBox("trak", trakParts);

    const mvhdSlice = bytes.subarray(mvhdBox.offset, mvhdBox.endOffset);
    return makeBox("moov", [mvhdSlice, newTrak]);
  };

  const ftypBytes = buildM4aFtypBox();
  // Pass 1: measure exact `moov` size using zeroed 32-bit `stco` entries
  const placeholderMoov = rebuildMoovWithOffsets(
    new Array(origOffsets.length).fill(0)
  );
  const mdatPayloadStart = ftypBytes.byteLength + placeholderMoov.byteLength + 8;

  // Pass 2: write exact absolute offsets into `stco` (byte length is invariant)
  const finalAbsOffsets = relativeChunkOffsets.map(
    (rel) => mdatPayloadStart + rel
  );
  const finalMoov = rebuildMoovWithOffsets(finalAbsOffsets);

  const mdatTotalSize = 8 + totalAudioBytes;
  const outputSize =
    ftypBytes.byteLength + finalMoov.byteLength + mdatTotalSize;
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
    chunkCount: origOffsets.length,
  };
}

/**
 * Encodes Float32 mono PCM samples (`[-1, 1]`) into a standard 16-bit PCM `.wav` Uint8Array.
 */
export function encodeMonoWav16Bit(float32Samples, sampleRate = 16000) {
  const numSamples = float32Samples.length;
  const dataBytes = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const out = new Uint8Array(buffer);

  out.set(FOURCC_Encoder.encode("RIFF"), 0);
  view.setUint32(4, 36 + dataBytes, true);
  out.set(FOURCC_Encoder.encode("WAVE"), 8);
  out.set(FOURCC_Encoder.encode("fmt "), 12);
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, 1, true); // NumChannels = 1 (Mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample = 16
  out.set(FOURCC_Encoder.encode("data"), 36);
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, float32Samples[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return out;
}

/**
 * Splits a mono Float32 PCM array into one or more 16-bit WAV chunks guaranteed
 * to stay below `maxChunkBytes` (default 18 MB, comfortably under Groq's 25 MB cap),
 * recording each chunk's exact `startOffsetSec` for seamless subtitle stitching.
 */
export function slicePcmIntoWavChunks(
  float32Samples,
  sampleRate = 16000,
  maxChunkBytes = 18 * 1024 * 1024
) {
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
        durationSec: 0,
      },
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
      durationSec: slice.length / sampleRate,
    });
    cursor = end;
    index++;
  }

  return chunks;
}

/**
 * Generates a compact 1.1-second 16 kHz mono WAV buffer (~35 KB) for 1-click
 * provider API key & latency verification without needing microphone access.
 */
export function createTestSpeechCadenceWav(durationSec = 1.1, sampleRate = 16000) {
  const count = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const envelope = t > 0.12 && t < durationSec - 0.12 ? 0.08 : 0.0;
    samples[i] = envelope * Math.sin(2 * Math.PI * 220 * t);
  }
  return encodeMonoWav16Bit(samples, sampleRate);
}

/**
 * Builds a valid minimal dual-track (`vide` + `soun`) progressive ISO-BMFF MP4
 * buffer for deterministic unit & e2e tests of `extractAudioTrackFromMp4()`.
 */
export function createSyntheticMp4WithVideoAndAudio({
  videoPayloads = [new Uint8Array(4096).fill(0xaa), new Uint8Array(4096).fill(0xbb)],
  audioPayloads = [new Uint8Array([0x11, 0x22, 0x33, 0x44]), new Uint8Array([0x55, 0x66, 0x77])],
} = {}) {
  const ftyp = buildM4aFtypBox();

  const makeHdlr = (subtype) => {
    const p = new Uint8Array(24);
    p.set(FOURCC_Encoder.encode(subtype), 8);
    return makeBox("hdlr", [p]);
  };
  const makeStscSingle = () => {
    const p = new Uint8Array(20);
    const v = new DataView(p.buffer);
    v.setUint32(4, 1, false);
    v.setUint32(8, 1, false); // first_chunk = 1
    v.setUint32(12, 1, false); // samples_per_chunk = 1
    v.setUint32(16, 1, false); // sample_desc_index = 1
    return makeBox("stsc", [p]);
  };
  const makeStszList = (sizes) => {
    const p = new Uint8Array(12 + sizes.length * 4);
    const v = new DataView(p.buffer);
    v.setUint32(4, 0, false);
    v.setUint32(8, sizes.length, false);
    sizes.forEach((sz, idx) => v.setUint32(12 + idx * 4, sz, false));
    return makeBox("stsz", [p]);
  };
  const makeStsdDummy = (fourcc) => {
    const entry = makeBox(fourcc, [new Uint8Array(16)]);
    const hdr = new Uint8Array(8);
    new DataView(hdr.buffer).setUint32(4, 1, false);
    return makeBox("stsd", [hdr, entry]);
  };
  const makeSttsDummy = (count) => {
    const p = new Uint8Array(16);
    const v = new DataView(p.buffer);
    v.setUint32(4, 1, false);
    v.setUint32(8, count, false);
    v.setUint32(12, 1024, false);
    return makeBox("stts", [p]);
  };

  const buildTrak = (subtype, codec, sizes, offsets) => {
    const stbl = makeBox("stbl", [
      makeStsdDummy(codec),
      makeSttsDummy(sizes.length),
      makeStscSingle(),
      makeStszList(sizes),
      buildStcoBox(offsets),
    ]);
    const minf = makeBox("minf", [stbl]);
    const mdia = makeBox("mdia", [makeBox("mdhd", [new Uint8Array(24)]), makeHdlr(subtype), minf]);
    return makeBox("trak", [makeBox("tkhd", [new Uint8Array(84)]), mdia]);
  };

  const mvhd = makeBox("mvhd", [new Uint8Array(100)]);
  const videoSizes = videoPayloads.map((p) => p.byteLength);
  const safeAudio = Array.isArray(audioPayloads) ? audioPayloads : [];
  const audioSizes = safeAudio.map((p) => p.byteLength);

  // Measure moov size first (omit `soun` trak when `audioPayloads` is empty to model silent previews)
  const dummyMoovParts = [mvhd];
  if (videoSizes.length > 0) {
    dummyMoovParts.push(
      buildTrak("vide", "avc1", videoSizes, new Array(videoSizes.length).fill(0))
    );
  }
  if (audioSizes.length > 0) {
    dummyMoovParts.push(
      buildTrak("soun", "mp4a", audioSizes, new Array(audioSizes.length).fill(0))
    );
  }
  const dummyMoov = makeBox("moov", dummyMoovParts);

  // Interleave video and audio chunks inside `mdat` just like real muxed MP4 files
  const mdatStart = ftyp.byteLength + dummyMoov.byteLength + 8;
  const interleaved = [];
  const realVideoOffsets = [];
  const realAudioOffsets = [];
  let rel = 0;
  const maxLen = Math.max(videoPayloads.length, safeAudio.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < videoPayloads.length) {
      realVideoOffsets.push(mdatStart + rel);
      interleaved.push(videoPayloads[i]);
      rel += videoPayloads[i].byteLength;
    }
    if (i < safeAudio.length) {
      realAudioOffsets.push(mdatStart + rel);
      interleaved.push(safeAudio[i]);
      rel += safeAudio[i].byteLength;
    }
  }

  const realMoovParts = [mvhd];
  if (videoSizes.length > 0) {
    realMoovParts.push(buildTrak("vide", "avc1", videoSizes, realVideoOffsets));
  }
  if (audioSizes.length > 0) {
    realMoovParts.push(buildTrak("soun", "mp4a", audioSizes, realAudioOffsets));
  }
  const realMoov = makeBox("moov", realMoovParts);
  const mdat = makeBox("mdat", interleaved);

  const out = new Uint8Array(ftyp.byteLength + realMoov.byteLength + mdat.byteLength);
  out.set(ftyp, 0);
  out.set(realMoov, ftyp.byteLength);
  out.set(mdat, ftyp.byteLength + realMoov.byteLength);
  return out;
}

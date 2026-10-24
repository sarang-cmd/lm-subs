import assert from "node:assert/strict";
import test from "node:test";
import {
  createSyntheticMp4WithVideoAndAudio,
  createTestSpeechCadenceWav,
  encodeMonoWav16Bit,
  extractAudioTrackFromMp4,
  readIsoBoxes,
  slicePcmIntoWavChunks,
  validateMediaPayload,
} from "../src/lib/audio-extract.js";

test("extractAudioTrackFromMp4 strips heavy video track and preserves exact audio payload", () => {
  const heavyVideo1 = new Uint8Array(120_000).fill(0xd1);
  const heavyVideo2 = new Uint8Array(140_000).fill(0xd2);
  const audioChunk1 = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02]);
  const audioChunk2 = new Uint8Array([0xca, 0xfe, 0xba, 0xbe, 0x03]);

  const muxedMp4 = createSyntheticMp4WithVideoAndAudio({
    videoPayloads: [heavyVideo1, heavyVideo2],
    audioPayloads: [audioChunk1, audioChunk2],
  });

  const extracted = extractAudioTrackFromMp4(muxedMp4);
  assert.ok(extracted);
  assert.equal(extracted.strippedVideo, true);
  assert.equal(extracted.mimeType, "audio/mp4");
  assert.ok(
    extracted.extractedBytes < muxedMp4.byteLength * 0.02,
    `Expected >98% size reduction, got ${extracted.extractedBytes} vs ${muxedMp4.byteLength}`
  );

  // Verify output is valid ISO-BMFF `ftyp` + `moov` + `mdat` containing exact audio bytes
  const topBoxes = readIsoBoxes(extracted.bytes);
  assert.deepEqual(
    topBoxes.map((b) => b.type),
    ["ftyp", "moov", "mdat"]
  );

  const mdat = topBoxes[2];
  const mdatPayload = extracted.bytes.subarray(mdat.dataOffset, mdat.endOffset);
  const expectedAudio = new Uint8Array([
    ...audioChunk1,
    ...audioChunk2,
  ]);
  assert.deepEqual([...mdatPayload], [...expectedAudio]);
});

test("encodeMonoWav16Bit and slicePcmIntoWavChunks produce valid RIFF headers and exact offsets", () => {
  const sampleRate = 16000;
  // 4 seconds of synthetic 16 kHz mono audio = 64,000 samples (128,000 PCM bytes)
  const samples = new Float32Array(sampleRate * 4);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
  }

  const singleWav = encodeMonoWav16Bit(samples, sampleRate);
  assert.equal(String.fromCharCode(...singleWav.subarray(0, 4)), "RIFF");
  assert.equal(String.fromCharCode(...singleWav.subarray(8, 12)), "WAVE");
  assert.equal(singleWav.byteLength, 44 + samples.length * 2);

  // Force 2-second chunks (64,044 bytes max per chunk)
  const chunks = slicePcmIntoWavChunks(samples, sampleRate, 64044);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].startOffsetSec, 0);
  assert.equal(chunks[0].durationSec, 2);
  assert.equal(chunks[1].startOffsetSec, 2);
  assert.equal(chunks[1].durationSec, 2);

  const testTone = createTestSpeechCadenceWav();
  assert.ok(testTone.byteLength > 1000 && testTone.byteLength < 60000);
});

test("validateMediaPayload rejects 0-byte and HTML auth login pages", () => {
  assert.throws(
    () => validateMediaPayload(new Uint8Array(0), "video/mp4"),
    /0 bytes/i
  );

  const htmlBytes = new TextEncoder().encode("<!DOCTYPE html><html>Sign in</html>");
  assert.throws(
    () => validateMediaPayload(htmlBytes, "text/html; charset=utf-8"),
    /HTML/i
  );
  // Even with spoofed video/mp4 Content-Type, leading byte sniffer catches HTML
  assert.throws(
    () => validateMediaPayload(htmlBytes, "video/mp4"),
    /HTML/i
  );
});

/**
 * Regression tests for the long Audio Overview (podcast) pipeline.
 *
 * A 20+ minute NotebookLM Audio Overview produces a large `=m140` stream. The
 * old pipeline probed muxed video variants first and ran one unbounded `fetch`
 * inside a single Manifest V3 service worker event, so Chrome tore the worker
 * down mid download and the content script reported "The message channel closed
 * before a response was received".
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  downloadRangedParallel,
  downloadWithProgress,
  formatDownloadProgress,
  isAudioOnlyVariantUrl,
  orderMediaCandidates,
  planRangeSegments,
  MEDIA_PARALLEL_MIN_BYTES,
} from "../src/lib/media-download.js";
import {
  createExternalMessageDispatcher,
  createRuntimeDispatcher,
} from "../src/background/service-worker.js";
import {
  EXTERNAL_MESSAGE,
  RUNTIME_MESSAGE,
} from "../src/config/selectors.js";

function createMemoryStorage() {
  const db = {};
  return {
    async get(keys) {
      if (typeof keys === "string") return { [keys]: db[keys] };
      if (Array.isArray(keys)) {
        const out = {};
        for (const k of keys) out[k] = db[k];
        return out;
      }
      return { ...db };
    },
    async set(items) {
      Object.assign(db, items);
    },
  };
}

function invokeExternal(dispatcher, msg, sender) {
  return new Promise((resolve) => {
    dispatcher(msg, sender, (res) => resolve(res));
  });
}

function invoke(dispatcher, msg, sender = { tab: { id: 7 } }) {
  return new Promise((resolve) => {
    dispatcher(msg, sender, (res) => resolve(res));
  });
}

const PLAYING_URL =
  "https://lh3.googleusercontent.com/notebooklm/ABzcPv3kPodcastPlaying1234567890=mm,140";
const AUDIO_VARIANT_URL =
  "https://lh3.googleusercontent.com/notebooklm/ABzcPv3kPodcastPlaying1234567890=m140-dv-mp2";
const VIDEO_VARIANT_URL =
  "https://lh3.googleusercontent.com/notebooklm/ABzcPv3kPodcastPlaying1234567890=m22";

test("Audio Overview URL helpers: `=m140` is audio only, muxed `=mm,140` and `=m22` are not", () => {
  assert.equal(isAudioOnlyVariantUrl(AUDIO_VARIANT_URL), true);
  assert.equal(
    isAudioOnlyVariantUrl(
      "https://lh3.googleusercontent.com/notebooklm/ABzcAudioOnly=m140"
    ),
    true
  );
  assert.equal(isAudioOnlyVariantUrl(VIDEO_VARIANT_URL), false);
  assert.equal(isAudioOnlyVariantUrl(PLAYING_URL), false);
  assert.equal(isAudioOnlyVariantUrl(""), false);
  assert.equal(isAudioOnlyVariantUrl(null), false);
});

test("Media candidates are ordered playing URL first, then audio-only renditions", () => {
  const ordered = orderMediaCandidates({
    playingUrl: PLAYING_URL,
    mediaVariants: [VIDEO_VARIANT_URL, AUDIO_VARIANT_URL],
    progressiveUrl: VIDEO_VARIANT_URL,
    mediaUrl: VIDEO_VARIANT_URL,
    isTrusted: (u) => String(u).includes("googleusercontent.com"),
    isManifest: (u) => String(u).includes("manifest"),
  });

  assert.equal(ordered[0], PLAYING_URL, "the stream already playing leads");
  assert.equal(ordered[1], AUDIO_VARIANT_URL, "audio rendition precedes video");
  assert.equal(ordered[2], VIDEO_VARIANT_URL);
  assert.equal(ordered.length, 3, "duplicates collapse");
});

test("Range segments cover every byte exactly once", () => {
  const total = 25 * 1024 * 1024;
  const segments = planRangeSegments(total, {
    segmentBytes: 4 * 1024 * 1024,
    maxSegments: 6,
  });

  assert.ok(segments.length >= 2 && segments.length <= 6);
  assert.equal(segments[0].start, 0);
  assert.equal(segments[segments.length - 1].end, total - 1);
  for (let i = 1; i < segments.length; i += 1) {
    assert.equal(segments[i].start, segments[i - 1].end + 1, "no gaps");
  }

  assert.deepEqual(planRangeSegments(0), []);
  assert.deepEqual(planRangeSegments(-5), []);
});

test("Parallel range download reassembles bytes in order and falls back when ranges are rejected", async () => {
  const total = 3 * 1024 * 1024;
  const source = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) source[i] = i % 251;

  const seenRanges = [];
  const rangedFetch = async (_url, init = {}) => {
    const header =
      init.headers && typeof init.headers.get === "function"
        ? init.headers.get("Range")
        : init.headers?.Range;
    const match = /bytes=(\d+)-(\d+)/.exec(String(header || ""));
    assert.ok(match, "Range header sent");
    const start = Number(match[1]);
    const end = Number(match[2]);
    seenRanges.push([start, end]);
    return new Response(source.subarray(start, end + 1), {
      status: 206,
      headers: { "content-range": `bytes ${start}-${end}/${total}` },
    });
  };

  const progress = [];
  const result = await downloadRangedParallel(
    "https://lh3.googleusercontent.com/notebooklm/ABzcAudio=m140",
    {
      credentials: "include",
      fetchImpl: rangedFetch,
      totalBytes: total,
      segmentBytes: 512 * 1024,
      concurrency: 4,
      onProgress: (p) => progress.push(p),
    }
  );

  assert.ok(result, "parallel download returns a bundle");
  assert.equal(result.ranged, true);
  assert.equal(result.bytes.byteLength, total);
  assert.deepEqual(result.bytes, source, "bytes reassembled in order");
  // 3 MB / 512 KB would be 6 segments, but concurrency caps the plan at 4.
  assert.equal(seenRanges.length, 4);
  assert.ok(progress.length > 0, "progress reported");

  const rejectingFetch = async () =>
    new Response("nope", { status: 200, headers: {} });
  assert.equal(
    await downloadRangedParallel(
      "https://lh3.googleusercontent.com/notebooklm/ABzcAudio=m140",
      {
        fetchImpl: rejectingFetch,
        totalBytes: total,
        segmentBytes: 1024 * 1024,
        concurrency: 2,
      }
    ),
    null,
    "returns null when the CDN ignores Range so the caller can fall back"
  );
});

test("Single stream download reports progress and honours the deadline", async () => {
  const payload = new Uint8Array(2048).fill(0x33);
  const progress = [];
  const res = await downloadWithProgress(
    "https://lh3.googleusercontent.com/notebooklm/ABzcAudio=m140",
    {
      fetchImpl: async () =>
        new Response(payload, {
          status: 200,
          headers: { "content-type": "audio/mp4" },
        }),
      onProgress: (p) => progress.push(p),
    }
  );

  assert.equal(res.bytes.byteLength, 2048);
  assert.equal(res.contentType, "audio/mp4");
  assert.equal(res.totalBytes, 2048);
  assert.ok(progress.length >= 1);

  const hangingFetch = (_url, init = {}) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener?.("abort", () =>
        reject(new Error("deadline"))
      );
    });

  await assert.rejects(
    downloadWithProgress(
      "https://lh3.googleusercontent.com/notebooklm/ABzcAudio=m140",
      { fetchImpl: hangingFetch, deadlineMs: 120 }
    ),
    /deadline|abort/i,
    "a stalled CDN never outlives the deadline"
  );
});

test("Download progress formats as a percentage with byte counts", () => {
  assert.equal(
    formatDownloadProgress({ receivedBytes: 4 * 1048576, totalBytes: 8 * 1048576 }),
    "50% · 4.0 MB of 8.0 MB"
  );
  assert.equal(formatDownloadProgress({ receivedBytes: 1048576 }), "1.0 MB");
});

test("Long Audio Overview: parallel ranged download of the playing stream, with worker heartbeat", async () => {
  const storage = createMemoryStorage();
  // 12 MB audio-only payload: above the parallel download threshold and below
  // the 22 MB single-upload cap, matching a ~20 minute Audio Overview.
  const totalBytes = 12 * 1024 * 1024;
  const audioBytes = new Uint8Array(totalBytes).fill(0x55);

  const requestedUrls = [];
  const groqCalls = [];

  const swFetch = async (url, init = {}) => {
    const u = String(url);
    requestedUrls.push(u);

    if (u.includes("googleusercontent.com")) {
      const header =
        init.headers && typeof init.headers.get === "function"
          ? init.headers.get("Range")
          : init.headers?.Range;
      const match = /bytes=(\d+)-(\d+)/.exec(String(header || ""));
      if (match) {
        const start = Number(match[1]);
        const end = Number(match[2]);
        return new Response(audioBytes.subarray(start, end + 1), {
          status: 206,
          headers: {
            "content-type": "audio/mp4",
            "content-range": `bytes ${start}-${end}/${totalBytes}`,
          },
        });
      }
      return new Response(audioBytes, {
        status: 200,
        headers: {
          "content-type": "audio/mp4",
          "content-length": String(totalBytes),
        },
      });
    }

    if (u.includes("api.groq.com")) {
      groqCalls.push(u);
      return new Response(
        JSON.stringify({
          segments: [
            { start: 0, end: 6.2, text: "Welcome back to the deep dive." },
            { start: 6.2, end: 12.4, text: "Today we unpack mass spectrometry." },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    return new Response("{}", { status: 404 });
  };

  let heartbeats = 0;
  const runtimeApi = {
    id: "abcdefghijklmnopabcdefghijklmnop",
    getManifest: () => ({ version: "0.2.7" }),
  };

  const runtimeDispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl: swFetch,
    runtimeApi,
    heartbeatImpl: () => {
      heartbeats += 1;
    },
  });

  const extDispatcher = createExternalMessageDispatcher(runtimeDispatcher, {
    storageArea: storage,
    runtimeApi,
  });

  const saveKeyRes = await invokeExternal(
    extDispatcher,
    {
      type: EXTERNAL_MESSAGE.WEB_SAVE_PROVIDER_KEY,
      provider: "groq",
      apiKey: "gsk_podcast_pipeline_key_123456",
      makePrimary: true,
    },
    { origin: "https://lm-subs.vercel.app" }
  );
  assert.equal(saveKeyRes.ok, true);

  const ensureRes = await invoke(runtimeDispatcher, {
    type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
    artifact: {
      cacheKey: "artifact:8f9a0586-b861",
      artifactId: "8f9a0586-b861-4aaa-8bbb-ccccdddd1111",
      title: "How Mass Spectrometry Weighs Invisible Atoms",
      mediaUrl: VIDEO_VARIANT_URL,
      progressiveUrl: VIDEO_VARIANT_URL,
      mediaVariants: [VIDEO_VARIANT_URL, AUDIO_VARIANT_URL],
      playingUrl: AUDIO_VARIANT_URL,
      durationSeconds: 1312,
    },
  });

  assert.equal(
    ensureRes.ok,
    true,
    `long Audio Overview must transcribe, got: ${ensureRes.error || ""}`
  );
  assert.equal(ensureRes.cached, false);
  assert.ok(ensureRes.entry.cues.length >= 2);
  assert.equal(
    ensureRes.entry.cues[0].text.replace(/\s+/g, " "),
    "Welcome back to the deep dive."
  );

  assert.equal(
    requestedUrls[0],
    AUDIO_VARIANT_URL,
    "the audio rendition is probed before muxed video variants"
  );
  assert.ok(
    requestedUrls.some((u) => u.includes("api.groq.com")),
    "transcription runs after the download"
  );
  assert.ok(heartbeats > 0, "service worker heartbeat pings during the job");

  const report = await invoke(runtimeDispatcher, {
    type: RUNTIME_MESSAGE.GET_DEBUG_REPORT,
  });
  const logText = (report?.logs || [])
    .map((entry) => `${entry.event} ${entry.detail || ""}`)
    .join("\n");
  assert.match(logText, /parallel ranges/, "download used parallel ranges");
  assert.match(logText, /media\.downloaded/, "download completed and logged");
});

test("Audio Overview download budget: a stalled CDN reports an actionable error instead of hanging", async () => {
  const storage = createMemoryStorage();

  const runtimeApi = {
    id: "abcdefghijklmnopabcdefghijklmnop",
    getManifest: () => ({ version: "0.2.7" }),
  };

  const runtimeDispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl: (_url, init = {}) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener?.("abort", () =>
          reject(new Error("aborted by deadline"))
        );
      }),
    runtimeApi,
    heartbeatImpl: () => {},
    mediaDeadlineMs: 1200,
  });

  const extDispatcher = createExternalMessageDispatcher(runtimeDispatcher, {
    storageArea: storage,
    runtimeApi,
  });

  await invokeExternal(
    extDispatcher,
    {
      type: EXTERNAL_MESSAGE.WEB_SAVE_PROVIDER_KEY,
      provider: "groq",
      apiKey: "gsk_podcast_timeout_key_123456",
      makePrimary: true,
    },
    { origin: "https://lm-subs.vercel.app" }
  );

  const startedAt = Date.now();
  const ensureRes = await invoke(runtimeDispatcher, {
    type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
    artifact: {
      cacheKey: "artifact:timeout-case",
      artifactId: "8f9a0586-b861-4aaa-8bbb-ccccdddd2222",
      title: "Stalled Podcast",
      mediaUrl: AUDIO_VARIANT_URL,
      playingUrl: AUDIO_VARIANT_URL,
      durationSeconds: 1312,
    },
  });
  const elapsed = Date.now() - startedAt;

  assert.equal(ensureRes.ok, false);
  assert.match(
    String(ensureRes.error || ""),
    /background budget|aborted|download failed/i,
    `expected a bounded download error, got: ${ensureRes.error}`
  );
  assert.ok(elapsed < 60000, "failed fast instead of hanging the worker");
});

test("Parallel download threshold only applies to long downloads", () => {
  assert.ok(MEDIA_PARALLEL_MIN_BYTES >= 4 * 1024 * 1024);
  const shortPlan = planRangeSegments(2 * 1024 * 1024, {
    segmentBytes: 4 * 1024 * 1024,
    maxSegments: 6,
  });
  assert.equal(shortPlan.length, 1, "short media downloads in one request");
});

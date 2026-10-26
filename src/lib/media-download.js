/**
 * Bounded, progress-aware media download helpers (`src/lib/media-download.js`).
 *
 * Why this module exists (`LM Subs v0.2.7`):
 * Downloading a long Google NotebookLM Audio Overview (a 20+ minute podcast can
 * be a 10 MB to 25 MB `=m140` stream) used to happen in one unbounded
 * `await fetch()` inside a single Manifest V3 service worker event. A slow CDN
 * response kept the worker busy past its port keepalive window, Chrome tore the
 * port down, and the content script surfaced the confusing
 * "The message channel closed before a response was received" error instead of
 * captions.
 *
 * These helpers keep every download inside a hard deadline, spread large files
 * across parallel HTTP `206` range requests so throughput is not limited by a
 * single slow connection, and report progress back to the tab. Everything is
 * pure and takes an injectable `fetchImpl` so it can be unit tested.
 */

export const MEDIA_DOWNLOAD_DEADLINE_MS = 150000;
export const MEDIA_HEADER_TIMEOUT_MS = 4500;
export const MEDIA_SEGMENT_BYTES = 4 * 1024 * 1024;
export const MEDIA_PARALLEL_SEGMENTS = 6;
export const MEDIA_PARALLEL_MIN_BYTES = 6 * 1024 * 1024;

/**
 * Google FIFE suffixes that carry audio only (`=m140` is the DASH/muxed audio
 * rendition NotebookLM serves for Audio Overviews, and it is also the audio leg
 * of every Video Overview).
 */
const AUDIO_ONLY_SUFFIX_REGEX = /=m(?:140|4a)(?:[-_,]|$)/i;

export function isAudioOnlyVariantUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl) return false;
  return AUDIO_ONLY_SUFFIX_REGEX.test(rawUrl);
}

function dedupeUrls(list) {
  const seen = new Set();
  const out = [];
  for (const url of list) {
    if (typeof url !== "string" || !url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/**
 * Orders media candidates so the stream that is already playing in the tab is
 * attempted first, then audio-only renditions, then everything else.
 *
 * The URL sitting in `mediaElement.currentSrc` is known good: Chrome is
 * actively streaming it, so it needs no extra redirect hop and no guesswork
 * about which FIFE suffix still resolves. Trying it first removes the long
 * candidate sweep that used to push podcast downloads past the worker deadline.
 */
export function orderMediaCandidates({
  playingUrl = "",
  mediaVariants = [],
  progressiveUrl = "",
  mediaUrl = "",
  isTrusted = () => true,
  isManifest = () => false,
} = {}) {
  const playing = [playingUrl];
  const variants = Array.isArray(mediaVariants) ? mediaVariants : [];
  const audioFirst = variants.filter((u) => isAudioOnlyVariantUrl(u));
  const rest = [
    ...variants.filter((u) => !isAudioOnlyVariantUrl(u)),
    progressiveUrl,
    mediaUrl,
  ];

  return dedupeUrls([...playing, ...audioFirst, ...rest]).filter(
    (u) => isTrusted(u) && !isManifest(u)
  );
}

/** Splits a byte range into sequential, non-overlapping `206` segments. */
export function planRangeSegments(
  totalBytes,
  { segmentBytes = MEDIA_SEGMENT_BYTES, maxSegments = MEDIA_PARALLEL_SEGMENTS } = {}
) {
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
      // Ignore
    }
  }, ms);
}

/**
 * Reads an already-open response body with progress callbacks and no size
 * limit. Used when the caller needs to inspect `content-type` before deciding
 * between the Range and plain strategies.
 */
export async function readResponseBodyWithProgress(
  res,
  { onProgress, totalBytes = 0 } = {}
) {
  const reader = res?.body?.getReader?.();
  if (!reader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress?.({
      receivedBytes: buf.byteLength,
      totalBytes: totalBytes || buf.byteLength,
    });
    return buf;
  }

  const chunks = [];
  let received = 0;
  for (;;) {
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

function parseContentLength(res) {
  const raw = res?.headers?.get?.("content-length");
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Single `GET` download with a hard deadline that covers the whole body read,
 * not just the response headers. Returns `{ bytes, contentType, totalBytes }`
 * or throws when the deadline expires or the request fails.
 */
export async function downloadWithProgress(
  url,
  {
    credentials = "include",
    fetchImpl = globalThis.fetch,
    deadlineMs = MEDIA_DOWNLOAD_DEADLINE_MS,
    headerTimeoutMs = MEDIA_HEADER_TIMEOUT_MS,
    onProgress,
  } = {}
) {
  const controller =
    typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller
    ? makeAbortTimer(deadlineMs, controller)
    : null;

  try {
    const res = await fetchImpl(url, {
      method: "GET",
      credentials,
      signal: controller ? controller.signal : undefined,
    });
    if (!res || res.ok === false) {
      const err = new Error(
        `Media CDN returned HTTP ${res?.status ?? "unknown"}`
      );
      err.status = res?.status ?? 0;
      throw err;
    }

    const totalBytes = parseContentLength(res);
    const bytes = await readResponseBodyWithProgress(res, {
      onProgress,
      totalBytes,
    });
    return {
      bytes,
      contentType: (res.headers?.get?.("content-type") || "").toLowerCase(),
      totalBytes: totalBytes || bytes.byteLength,
      ranged: false,
    };
  } finally {
    if (timer && typeof clearTimeout === "function") clearTimeout(timer);
  }
}

/**
 * Parallel `206` range download. Used for media above
 * `MEDIA_PARALLEL_MIN_BYTES` so a long Audio Overview is not throttled by one
 * slow TCP stream. Falls back to a plain `GET` when the CDN ignores `Range`.
 */
export async function downloadRangedParallel(
  url,
  {
    credentials = "include",
    fetchImpl = globalThis.fetch,
    totalBytes = 0,
    deadlineMs = MEDIA_DOWNLOAD_DEADLINE_MS,
    segmentBytes = MEDIA_SEGMENT_BYTES,
    concurrency = MEDIA_PARALLEL_SEGMENTS,
    onProgress,
  } = {}
) {
  const total = Number(totalBytes) || 0;
  if (total <= 0) return null;

  const segments = planRangeSegments(total, {
    segmentBytes,
    maxSegments: concurrency,
  });
  if (segments.length === 0) return null;

  const controller =
    typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? makeAbortTimer(deadlineMs, controller) : null;
  const parts = new Array(segments.length).fill(null);
  let received = 0;

  const runSegment = async (segment) => {
    const res = await fetchImpl(url, {
      method: "GET",
      credentials,
      headers: { Range: `bytes=${segment.start}-${segment.end}` },
      signal: controller ? controller.signal : undefined,
    });
    // Only a true `206 Partial Content` may be spliced back together. A `200`
    // means the CDN ignored the range and returned the whole file, which would
    // corrupt the assembly, so bail out and let the caller fall back.
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
    const workers = new Array(Math.min(concurrency, segments.length))
      .fill(0)
      .map(async () => {
        for (;;) {
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
      ranged: true,
    };
  } catch {
    return null;
  } finally {
    if (timer && typeof clearTimeout === "function") clearTimeout(timer);
  }
}

/**
 * Downloads one candidate URL, choosing the parallel range strategy for large
 * payloads and always respecting the global deadline.
 */
export async function fetchMediaBytes(
  url,
  {
    credentials = "include",
    fetchImpl = globalThis.fetch,
    knownTotalBytes = 0,
    deadlineMs = MEDIA_DOWNLOAD_DEADLINE_MS,
    onProgress,
  } = {}
) {
  const total = Number(knownTotalBytes) || 0;
  if (total >= MEDIA_PARALLEL_MIN_BYTES) {
    const ranged = await downloadRangedParallel(url, {
      credentials,
      fetchImpl,
      totalBytes: total,
      deadlineMs,
      onProgress,
    });
    if (ranged && ranged.bytes?.byteLength > 0) return ranged;
  }

  return downloadWithProgress(url, {
    credentials,
    fetchImpl,
    deadlineMs,
    onProgress,
  });
}

/** Formats a download progress payload for the tab toast and debug log. */
export function formatDownloadProgress({ receivedBytes = 0, totalBytes = 0 } = {}) {
  const mb = (value) => `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (!totalBytes) return mb(receivedBytes);
  const pct = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
  return `${pct}% · ${mb(receivedBytes)} of ${mb(totalBytes)}`;
}

/**
 * Pure parser for Google NotebookLM / Gemini Notebook `batchexecute` wire traffic
 * and SSR `AF_initDataCallback` hydration scripts.
 *
 * Supports:
 * - Outgoing `f.req` form-urlencoded request bodies (`CREATE_STUDIO` / `R7cb6c`)
 * - Incoming `)]}'` anti-XSSI framed `wrb.fr` response bodies (`CREATE_STUDIO` + `POLL_STUDIO` / `gArtLc`)
 * - Inline Google Boq `AF_initDataCallback({..., data: [...]})` SSR hydration blocks on page refresh
 * - RPC-ID-agnostic structural fallback so rotated 6-character Google RPC IDs
 *   still resolve Studio Video Overview rows cleanly
 * - Trusted Google CDN URL validation & FIFE media token / variant derivation
 *   (including live `=mm,22`, `=m140`, `=m18`, `=m22`, `=m22-dv`, and `rd-notebooklm` forms).
 */

import {
  BATCHEXECUTE,
  NOTEBOOKLM_HOSTS,
  TRUSTED_GOOGLE_MEDIA_DOMAINS,
} from "../config/selectors.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FIFE_NOTEBOOKLM_TOKEN_RE =
  /\/(?:rd-)?notebook(?:lm)?\/([A-Za-z0-9_-]{16,})/;

const FIFE_SUFFIX_RE = /=[A-Za-z0-9_,.-]+$/;

export function isNotebookLmHost(hostname) {
  if (typeof hostname !== "string" || !hostname) return false;
  return NOTEBOOKLM_HOSTS.includes(hostname.toLowerCase());
}

export function isBatchExecuteUrl(url) {
  if (typeof url !== "string" || !url) return false;
  return BATCHEXECUTE.PATH_SUBSTRINGS.some((sub) => url.includes(sub));
}

/**
 * Strict SSRF-safe check that a media URL points to a trusted Google HTTPS CDN host.
 * Rejects non-HTTPS schemes and percent-encoded or slash-injected hostnames.
 */
export function isTrustedGoogleMediaUrl(rawUrl) {
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

/**
 * Returns true if a Google FIFE URL is a resized image/motion thumbnail (`=s512...`, `=w1280...`)
 * or a streaming manifest (`=mm,hls`, `=mm,dash`, `.m3u8`, `.mpd`) rather than a full audio/video file.
 */
export function isThumbnailOrManifestUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl) return false;
  if (/\.(?:m3u8|mpd|jpe?g|png|webp|gif|svg)(?:$|\?)/i.test(rawUrl)) {
    return true;
  }
  const suffixMatch = rawUrl.match(FIFE_SUFFIX_RE);
  if (!suffixMatch) return false;
  const suffix = suffixMatch[0].slice(1).toLowerCase();
  // `s512`, `s512-mm,22`, `w2752-d-h1536`, `mm,hls`, `mm,dash`, `mm,22` (card preview redirector)
  if (/^(?:s\d+|w\d+|h\d+|c\b|p\b)/.test(suffix)) return true;
  if (/(?:^|-)s\d+(?:-|$)/.test(suffix)) return true;
  if (/^mm,(?:hls|dash)$/i.test(suffix)) return true;
  return false;
}

/**
 * Formats a media URL safely for diagnostic logs (shortens long signed capability tokens).
 */
export function summarizeMediaUrlForDebug(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl) return "(empty)";
  if (rawUrl.startsWith("blob:")) return rawUrl.slice(0, 48);
  try {
    const u = new URL(rawUrl);
    const suffixMatch = u.pathname.match(FIFE_SUFFIX_RE);
    const suffix = suffixMatch ? suffixMatch[0] : "";
    const tokenMatch = u.pathname.match(FIFE_NOTEBOOKLM_TOKEN_RE);
    if (tokenMatch) {
      const tok = tokenMatch[1];
      const shortTok =
        tok.length > 14 ? `${tok.slice(0, 8)}…${tok.slice(-4)}` : tok;
      const prefix = u.pathname.includes("/rd-notebooklm/")
        ? "/rd-notebooklm/"
        : "/notebooklm/";
      return `${u.origin}${prefix}${shortTok}${suffix}`;
    }
    return `${u.origin}${u.pathname.slice(0, 36)}${suffix}`;
  } catch {
    return String(rawUrl).slice(0, 60);
  }
}

/**
 * Extracts a stable identifier from a NotebookLM / Google FIFE media URL so
 * `<video src="...=m22">` or `...=mm,22` matches `...=m22-dv` from `gArtLc`.
 */
export function extractMediaToken(rawUrl) {
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

/**
 * Given a Google FIFE NotebookLM URL (`.../notebooklm/<token>=m22-dv`, `=mm,22`, `=m22`, etc.),
 * returns ordered candidate URLs preferring compact AAC audio (`=m140`) and direct MP4
 * streams (`=m18`, `=m22`) before attachment-redirect variants (`=m140-dv`, `=m22-dv`).
 */
export function deriveGoogleMediaVariants(mediaUrl) {
  if (typeof mediaUrl !== "string" || !mediaUrl) return [];
  const out = [];
  const pushUnique = (u) => {
    if (u && !out.includes(u)) out.push(u);
  };

  const isTrusted = isTrustedGoogleMediaUrl(mediaUrl);
  const tokenMatch = isTrusted ? mediaUrl.match(FIFE_NOTEBOOKLM_TOKEN_RE) : null;
  const isFifeNonRd =
    isTrusted && tokenMatch && !mediaUrl.includes("/rd-notebooklm/");
  const isGoogleUserContent =
    isFifeNonRd && mediaUrl.includes("googleusercontent.com/notebooklm/");

  if (isFifeNonRd) {
    const base = mediaUrl.replace(FIFE_SUFFIX_RE, "");
    const token = tokenMatch[1];

    // 1. Always exhaust pure AAC audio-only (~3-5 MB) variants BEFORE touching video MP4s!
    if (base !== mediaUrl || !FIFE_SUFFIX_RE.test(mediaUrl)) {
      pushUnique(`${base}=m140`);
      pushUnique(`${base}=m140-dv`);
    }
    if (isGoogleUserContent) {
      pushUnique(`https://lh3.google.com/notebooklm/${token}=m140`);
      pushUnique(`https://lh3.google.com/notebooklm/${token}=m140-dv`);
    }

    // 2. Compact 360p MP4 (~10-14 MB) next
    if (base !== mediaUrl || !FIFE_SUFFIX_RE.test(mediaUrl)) {
      pushUnique(`${base}=m18`);
    }
    if (isGoogleUserContent) {
      pushUnique(`https://lh3.google.com/notebooklm/${token}=m18`);
    }

    // 3. 720p MP4 only as final fallback
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

/**
 * Extracts `f.req` JSON string from URL-encoded form body or raw string.
 */
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

/**
 * Parses an outgoing `batchexecute` request body to detect when the user clicks
 * "Generate" for a Studio Video Overview (`CREATE_STUDIO`, `content[2] === 3`).
 */
export function parseBatchExecuteRequest(body, rpcOverrides = {}) {
  const createRpcId =
    rpcOverrides?.CREATE_STUDIO || BATCHEXECUTE.RPC_IDS.CREATE_STUDIO;
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
    const typeCode = Array.isArray(content) ? content[2] : null;
    const isSupportedMediaType =
      typeCode === BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW ||
      typeCode === BATCHEXECUTE.ARTIFACT_TYPES.AUDIO_OVERVIEW;
    const isCreateIdMatch = rpcId === createRpcId;
    const isStructuralMediaCreate =
      Array.isArray(content) &&
      isSupportedMediaType &&
      Array.isArray(content[3]);

    if ((isCreateIdMatch || isStructuralMediaCreate) && isSupportedMediaType) {
      const metaSlot =
        typeCode === BATCHEXECUTE.ARTIFACT_TYPES.AUDIO_OVERVIEW
          ? content[BATCHEXECUTE.ROW_POS.AUDIO_METADATA] ??
            content[BATCHEXECUTE.ROW_POS.VIDEO_METADATA]
          : content[BATCHEXECUTE.ROW_POS.VIDEO_METADATA];
      const innerOpts = Array.isArray(metaSlot) ? metaSlot[2] : null;
      const language =
        Array.isArray(innerOpts) && typeof innerOpts[1] === "string"
          ? innerOpts[1]
          : null;
      const focusPrompt =
        Array.isArray(innerOpts) && typeof innerOpts[2] === "string"
          ? innerOpts[2]
          : null;

      return {
        isVideoCreate: typeCode === BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW,
        isAudioCreate: typeCode === BATCHEXECUTE.ARTIFACT_TYPES.AUDIO_OVERVIEW,
        isMediaCreate: true,
        typeCode,
        mediaKind:
          typeCode === BATCHEXECUTE.ARTIFACT_TYPES.AUDIO_OVERVIEW
            ? "audio"
            : "video",
        rpcId,
        notebookId,
        language,
        focusPrompt,
      };
    }
  }

  return null;
}

/**
 * Extracts audio/video stream URLs from a Studio Video Overview (`row[2] === 3`)
 * or Studio Audio Overview / Deep-Dive Podcast (`row[2] === 1`).
 */
export function extractArtifactMetadataFromRow(row) {
  if (!Array.isArray(row)) return null;
  const typeCode = row[BATCHEXECUTE.ROW_POS.TYPE];
  const isVideo = typeCode === BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW;
  const isAudio = typeCode === BATCHEXECUTE.ARTIFACT_TYPES.AUDIO_OVERVIEW;
  if (!isVideo && !isAudio) return null;

  const artifactId = row[BATCHEXECUTE.ROW_POS.ID];
  if (typeof artifactId !== "string" || !artifactId) return null;

  const title =
    typeof row[BATCHEXECUTE.ROW_POS.TITLE] === "string"
      ? row[BATCHEXECUTE.ROW_POS.TITLE].trim()
      : "";
  const statusCode =
    typeof row[BATCHEXECUTE.ROW_POS.STATUS] === "number"
      ? row[BATCHEXECUTE.ROW_POS.STATUS]
      : 0;
  const status = normalizeStatusCode(statusCode);

  const primaryBlock = isAudio
    ? row[BATCHEXECUTE.ROW_POS.AUDIO_METADATA]
    : row[BATCHEXECUTE.ROW_POS.VIDEO_METADATA];
  const candidateBlocks = [];
  if (Array.isArray(primaryBlock)) candidateBlocks.push(primaryBlock);
  for (let slot = 5; slot <= Math.min(row.length - 1, 12); slot++) {
    if (Array.isArray(row[slot]) && row[slot] !== primaryBlock) {
      candidateBlocks.push(row[slot]);
    }
  }

  let mediaUrl = null;
  let progressiveUrl = null;
  let directAudioUrl = null;
  let language = null;
  let durationSeconds = null;
  const discoveredStreamUrls = [];

  const pushStreamUrl = (u) => {
    if (
      typeof u === "string" &&
      isTrustedGoogleMediaUrl(u) &&
      !isThumbnailOrManifestUrl(u) &&
      !discoveredStreamUrls.includes(u)
    ) {
      discoveredStreamUrls.push(u);
    }
  };

  const scanNestedForStreams = (node, depth = 0) => {
    if (depth > 5 || node == null) return;
    if (typeof node === "string") {
      if (isTrustedGoogleMediaUrl(node) && !isThumbnailOrManifestUrl(node)) {
        if (isAudio && !directAudioUrl) directAudioUrl = node;
        if (!mediaUrl) mediaUrl = node;
        pushStreamUrl(node);
      } else if (
        !language &&
        /^[a-z]{2}(?:-[A-Z]{2})?$/.test(node) &&
        node !== "id"
      ) {
        language = node;
      }
      return;
    }
    if (!Array.isArray(node)) return;

    // Tuple `[seconds, nanos]` check when duration is still unset
    if (
      durationSeconds === null &&
      node.length === 2 &&
      typeof node[0] === "number" &&
      node[0] > 3 &&
      node[0] < 36000 &&
      typeof node[1] === "number" &&
      node[1] >= 0
    ) {
      durationSeconds = Math.round((node[0] + node[1] / 1e9) * 100) / 100;
    }

    // Media entry `[url, kind, mime]`
    if (typeof node[0] === "string" && isTrustedGoogleMediaUrl(node[0])) {
      const url = node[0];
      const kind = node[1];
      const mime = typeof node[2] === "string" ? node[2].toLowerCase() : "";
      if (
        mime.startsWith("audio/") ||
        (isAudio && !isThumbnailOrManifestUrl(url))
      ) {
        if (!directAudioUrl) directAudioUrl = url;
        if (!mediaUrl) mediaUrl = url;
        pushStreamUrl(url);
      } else if (
        mime === "video/mp4" ||
        (!mime && !isThumbnailOrManifestUrl(url))
      ) {
        pushStreamUrl(url);
        if (kind === BATCHEXECUTE.MEDIA_KIND.PROGRESSIVE && !progressiveUrl) {
          progressiveUrl = url;
        }
        if (kind === BATCHEXECUTE.MEDIA_KIND.DOWNLOAD || !mediaUrl) {
          mediaUrl = url;
        }
      }
    }

    for (const child of node) {
      scanNestedForStreams(child, depth + 1);
    }
  };

  if (Array.isArray(primaryBlock)) {
    const progCandidate = primaryBlock[BATCHEXECUTE.VIDEO_META_POS.PROGRESSIVE_URL];
    if (typeof progCandidate === "string" && isTrustedGoogleMediaUrl(progCandidate)) {
      if (!isThumbnailOrManifestUrl(progCandidate)) {
        progressiveUrl = progCandidate;
        if (isAudio && !directAudioUrl) directAudioUrl = progCandidate;
        pushStreamUrl(progCandidate);
      } else if (!progressiveUrl) {
        progressiveUrl = progCandidate;
      }
    }

    const genOpts = primaryBlock[BATCHEXECUTE.VIDEO_META_POS.GENERATION_OPTIONS];
    if (Array.isArray(genOpts) && typeof genOpts[1] === "string" && genOpts[1]) {
      language = genOpts[1];
    }

    const dlCandidate = primaryBlock[BATCHEXECUTE.VIDEO_META_POS.DOWNLOAD_URL];
    if (typeof dlCandidate === "string" && isTrustedGoogleMediaUrl(dlCandidate)) {
      if (!isThumbnailOrManifestUrl(dlCandidate)) {
        mediaUrl = dlCandidate;
        if (isAudio && !directAudioUrl) directAudioUrl = dlCandidate;
        pushStreamUrl(dlCandidate);
      }
    }

    const durTuple = primaryBlock[BATCHEXECUTE.VIDEO_META_POS.DURATION];
    if (Array.isArray(durTuple) && typeof durTuple[0] === "number") {
      const secs = durTuple[0];
      const nanos = typeof durTuple[1] === "number" ? durTuple[1] : 0;
      durationSeconds = Math.round((secs + nanos / 1e9) * 100) / 100;
    }
  }

  for (const blk of candidateBlocks) {
    scanNestedForStreams(blk, 0);
  }

  if (!mediaUrl && progressiveUrl) {
    mediaUrl = progressiveUrl;
  }

  const looksLikeArtifactRow =
    UUID_RE.test(artifactId) ||
    Boolean(mediaUrl) ||
    Array.isArray(row[BATCHEXECUTE.ROW_POS.SOURCES]);
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
    mediaKind: isAudio ? "audio" : "video",
    statusCode,
    status,
    language,
    mediaUrl,
    progressiveUrl: progressiveUrl || mediaUrl,
    directAudioUrl,
    mediaVariants: variants,
    mediaToken: extractMediaToken(mediaUrl || progressiveUrl || directAudioUrl || ""),
    durationSeconds,
  };
}

export const extractVideoMetadataFromRow = extractArtifactMetadataFromRow;

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

/**
 * Extracts RPC IDs mentioned in a `batchexecute` URL query (`?rpcids=gArtLc,wXbhsf`).
 */
export function extractRpcIdsFromUrl(url) {
  if (typeof url !== "string" || !url) return [];
  try {
    const u = new URL(url, "https://notebook.google.com");
    const raw = u.searchParams.get("rpcids") || "";
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Parses a raw `batchexecute` response text (`)]}'\n\n<byteCount>\n[["wrb.fr", ...]]`)
 * and extracts all Studio Video Overview artifact rows.
 */
export function parseBatchExecuteResponse(responseText, rpcOverrides = {}) {
  if (typeof responseText !== "string" || !responseText) {
    return [];
  }

  const createRpcId =
    rpcOverrides?.CREATE_STUDIO || BATCHEXECUTE.RPC_IDS.CREATE_STUDIO;
  const pollRpcId =
    rpcOverrides?.POLL_STUDIO || BATCHEXECUTE.RPC_IDS.POLL_STUDIO;

  let body = responseText.trimStart();
  if (body.startsWith(BATCHEXECUTE.XSSI_PREFIX)) {
    body = body.slice(BATCHEXECUTE.XSSI_PREFIX.length).trimStart();
  }

  const results = [];
  const seenIds = new Set();

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
      if (
        !Array.isArray(frame) ||
        frame[0] !== BATCHEXECUTE.ENVELOPE_TAG ||
        typeof frame[2] !== "string"
      ) {
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
        results[i].origin =
          rpcId === createRpcId
            ? "create"
            : rpcId === pollRpcId
              ? "poll"
              : "structural";
      }
    }
  }

  return results;
}

/**
 * Extracts balanced JSON array literals passed as `data: [...]` inside Google Boq
 * `AF_initDataCallback({...})` SSR hydration `<script>` blocks.
 * Ensures existing Video Overviews are discovered immediately on page refresh (`Ctrl+R`)
 * even when NotebookLM hydrates Studio state without firing an XHR `gArtLc` call.
 */
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

export function parseAfInitDataPayloads(scriptTexts = []) {
  const results = [];
  const seenIds = new Set();

  for (const scriptText of scriptTexts) {
    if (
      typeof scriptText !== "string" ||
      !scriptText.includes("AF_initDataCallback")
    ) {
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
        // Ignore non-JSON script literals
      }
    }
  }

  return results;
}

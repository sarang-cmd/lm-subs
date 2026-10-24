/**
 * Pure parser for Google NotebookLM / Gemini Notebook `batchexecute` wire traffic.
 *
 * Supports:
 * - Outgoing `f.req` form-urlencoded request bodies (`CREATE_STUDIO` / `R7cb6c`)
 * - Incoming `)]}'` anti-XSSI framed `wrb.fr` response bodies (`CREATE_STUDIO` + `POLL_STUDIO` / `gArtLc`)
 * - RPC-ID-agnostic structural fallback so rotated 6-character Google RPC IDs
 *   still resolve Studio Video Overview rows cleanly.
 * - Trusted Google CDN URL validation & FIFE media token matching.
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
 * Extracts a stable identifier from a NotebookLM / Google FIFE media URL so
 * `<video src="...=m22">` in the DOM matches `...=m22-dv` from `gArtLc`.
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
    const cleanPath = u.pathname.replace(/=m\d+(?:-dv)?$/i, "");
    return `${u.hostname}${cleanPath}`;
  } catch {
    return null;
  }
}

/**
 * Given a Google FIFE NotebookLM video URL (`.../notebooklm/<token>=m22-dv`),
 * returns ordered candidate URLs preferring direct streaming variants (`=m140`,
 * `=m18`, `=m22`) before attachment-redirect variants (`=m140-dv`, `=m22-dv`).
 */
export function deriveGoogleMediaVariants(mediaUrl) {
  if (typeof mediaUrl !== "string" || !mediaUrl) return [];
  const out = [];
  const pushUnique = (u) => {
    if (u && !out.includes(u)) out.push(u);
  };

  if (
    isTrustedGoogleMediaUrl(mediaUrl) &&
    FIFE_NOTEBOOKLM_TOKEN_RE.test(mediaUrl)
  ) {
    const base = mediaUrl.replace(/=(?:m\d+(?:-dv)?|mm,[a-z]+)$/i, "");
    if (base !== mediaUrl) {
      // Direct streaming variants avoid cross-origin 302 download-attachment redirects
      pushUnique(`${base}=m140`);
      pushUnique(`${base}=m18`);
      pushUnique(`${base}=m22`);
      pushUnique(`${base}=m140-dv`);
      pushUnique(`${base}=m22-dv`);
    }
  }
  pushUnique(mediaUrl);
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
    const isCreateIdMatch = rpcId === createRpcId;
    const isStructuralVideoCreate =
      Array.isArray(content) &&
      content[2] === BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW &&
      Array.isArray(content[3]);

    if (
      (isCreateIdMatch || isStructuralVideoCreate) &&
      Array.isArray(content) &&
      content[2] === BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW
    ) {
      const videoOpts = content[BATCHEXECUTE.ROW_POS.VIDEO_METADATA];
      const innerOpts = Array.isArray(videoOpts) ? videoOpts[2] : null;
      const language =
        Array.isArray(innerOpts) && typeof innerOpts[1] === "string"
          ? innerOpts[1]
          : null;
      const focusPrompt =
        Array.isArray(innerOpts) && typeof innerOpts[2] === "string"
          ? innerOpts[2]
          : null;

      return {
        isVideoCreate: true,
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
 * Extracts the best MP4 URLs from a Studio Video Overview row (`row[8]`).
 */
export function extractVideoMetadataFromRow(row) {
  if (!Array.isArray(row)) return null;
  const typeCode = row[BATCHEXECUTE.ROW_POS.TYPE];
  if (typeCode !== BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW) return null;

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

  const videoBlock = row[BATCHEXECUTE.ROW_POS.VIDEO_METADATA];
  let mediaUrl = null;
  let progressiveUrl = null;
  let language = null;
  let durationSeconds = null;
  const discoveredMp4Urls = [];

  if (Array.isArray(videoBlock)) {
    const progCandidate = videoBlock[BATCHEXECUTE.VIDEO_META_POS.PROGRESSIVE_URL];
    if (typeof progCandidate === "string" && isTrustedGoogleMediaUrl(progCandidate)) {
      progressiveUrl = progCandidate;
      discoveredMp4Urls.push(progCandidate);
    }

    const genOpts = videoBlock[BATCHEXECUTE.VIDEO_META_POS.GENERATION_OPTIONS];
    if (Array.isArray(genOpts) && typeof genOpts[1] === "string" && genOpts[1]) {
      language = genOpts[1];
    }

    const dlCandidate = videoBlock[BATCHEXECUTE.VIDEO_META_POS.DOWNLOAD_URL];
    if (typeof dlCandidate === "string" && isTrustedGoogleMediaUrl(dlCandidate)) {
      mediaUrl = dlCandidate;
      discoveredMp4Urls.push(dlCandidate);
    }

    const mediaList = videoBlock[BATCHEXECUTE.VIDEO_META_POS.MEDIA_LIST];
    if (Array.isArray(mediaList)) {
      let fallbackMp4 = null;
      for (const entry of mediaList) {
        if (!Array.isArray(entry) || typeof entry[0] !== "string") continue;
        const url = entry[0];
        const kind = entry[1];
        const mime = entry[2];
        if (!isTrustedGoogleMediaUrl(url)) continue;

        if (mime === "video/mp4") {
          if (!discoveredMp4Urls.includes(url)) discoveredMp4Urls.push(url);
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
      if (!mediaUrl && fallbackMp4) {
        mediaUrl = fallbackMp4;
      }
    }

    if (!mediaUrl && progressiveUrl) {
      mediaUrl = progressiveUrl;
    }

    const durTuple = videoBlock[BATCHEXECUTE.VIDEO_META_POS.DURATION];
    if (Array.isArray(durTuple) && typeof durTuple[0] === "number") {
      const secs = durTuple[0];
      const nanos = typeof durTuple[1] === "number" ? durTuple[1] : 0;
      durationSeconds = Math.round((secs + nanos / 1e9) * 100) / 100;
    }
  }

  const looksLikeArtifactRow =
    UUID_RE.test(artifactId) ||
    Boolean(mediaUrl) ||
    Array.isArray(row[BATCHEXECUTE.ROW_POS.SOURCES]);
  if (!looksLikeArtifactRow) return null;

  const primarySeed = progressiveUrl || mediaUrl;
  const variants = primarySeed ? deriveGoogleMediaVariants(primarySeed) : [];
  for (const extra of discoveredMp4Urls) {
    if (!variants.includes(extra)) variants.push(extra);
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
    mediaVariants: variants,
    mediaToken: extractMediaToken(mediaUrl || progressiveUrl || ""),
    durationSeconds,
  };
}

function collectVideoRowsFromPayload(node, out, seenIds, depth = 0) {
  if (!Array.isArray(node) || depth > 5) return;

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

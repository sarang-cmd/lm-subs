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

  // Same-site `.google.com` FIFE fallback in case third-party `.googleusercontent.com`
  // cookies are partitioned by the browser.
  if (
    isTrusted &&
    tokenMatch &&
    !mediaUrl.includes("/rd-notebooklm/") &&
    mediaUrl.includes("googleusercontent.com/notebooklm/")
  ) {
    const token = tokenMatch[1];
    pushUnique(`https://lh3.google.com/notebooklm/${token}=m140`);
    pushUnique(`https://lh3.google.com/notebooklm/${token}=m18`);
    pushUnique(`https://lh3.google.com/notebooklm/${token}=m22`);
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
 * Extracts the best audio/video MP4 URLs from a Studio Video Overview row (`row[8]`).
 * Aligned with `ExplainerVideoArtifact` & `CinematicVideo` wire shapes on `notebook.google.com`.
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

  if (Array.isArray(videoBlock)) {
    const progCandidate = videoBlock[BATCHEXECUTE.VIDEO_META_POS.PROGRESSIVE_URL];
    if (typeof progCandidate === "string" && isTrustedGoogleMediaUrl(progCandidate)) {
      if (!isThumbnailOrManifestUrl(progCandidate)) {
        progressiveUrl = progCandidate;
        pushStreamUrl(progCandidate);
      } else if (!progressiveUrl) {
        // Still keep token seed if needed
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

    // Scan ALL nested media-list arrays inside `row[8]` (matches `ArtifactRow.video_url`
    // in `notebooklm-py` so both Explainer and Cinematic Video Overview rows resolve).
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
        } else if (mime === "video/mp4" || (!mime && !isThumbnailOrManifestUrl(url))) {
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

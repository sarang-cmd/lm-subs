/**
 * Pure decision gate determining whether a NotebookLM Video Overview should
 * trigger automatic subtitle generation (`src/lib/decide.js`).
 */

import { BATCHEXECUTE } from "../config/selectors.js";

/**
 * Compiles user-supplied regex pattern strings safely, ignoring malformed entries.
 */
export function compileExcludePatterns(patterns) {
  if (!Array.isArray(patterns)) return [];
  const compiled = [];
  for (const raw of patterns) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      compiled.push(new RegExp(trimmed, "i"));
    } catch {
      // Ignore malformed user regex so one typo never breaks the pipeline
    }
  }
  return compiled;
}

export function matchesExcludePattern(title, patterns) {
  if (!title || typeof title !== "string") return false;
  const regexes = compileExcludePatterns(patterns);
  return regexes.some((rx) => rx.test(title));
}

/**
 * Computes a stable cache key from an artifact ID or media token/URL.
 */
export function resolveSubtitleCacheKey({ artifactId, mediaToken, mediaUrl } = {}) {
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

/**
 * Pure decision function for subtitle generation eligibility.
 *
 * @returns {{ allow: boolean, reason: string, cacheKey: string | null }}
 */
export function shouldGenerateSubtitles({
  settings = {},
  trigger = "generate", // "generate" | "player_open" | "manual"
  force = false,
  typeCode = BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW,
  status = "ready",
  title = "",
  artifactId = null,
  mediaToken = null,
  mediaUrl = null,
  cachedKeys = new Set(),
  inFlightKeys = new Set(),
  exhaustedKeys = new Set(),
} = {}) {
  const isManual = trigger === "manual";

  if (!isManual && settings.enabled === false) {
    return { allow: false, reason: "extension_disabled", cacheKey: null };
  }

  if (typeCode !== BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW) {
    return { allow: false, reason: "not_video_overview", cacheKey: null };
  }

  if (status !== "ready") {
    return { allow: false, reason: `artifact_${status || "not_ready"}`, cacheKey: null };
  }

  const cacheKey = resolveSubtitleCacheKey({ artifactId, mediaToken, mediaUrl });
  if (!cacheKey) {
    return { allow: false, reason: "missing_identifier", cacheKey: null };
  }

  if (!mediaUrl || typeof mediaUrl !== "string") {
    return { allow: false, reason: "missing_media_url", cacheKey };
  }

  const inFlightSet =
    inFlightKeys instanceof Set ? inFlightKeys : new Set(inFlightKeys || []);
  if (inFlightSet.has(cacheKey)) {
    return { allow: false, reason: "already_in_flight", cacheKey };
  }

  if (!isManual && !force) {
    const exhaustedSet =
      exhaustedKeys instanceof Set ? exhaustedKeys : new Set(exhaustedKeys || []);
    if (exhaustedSet.has(cacheKey)) {
      return { allow: false, reason: "retries_exhausted", cacheKey };
    }

    const cachedSet =
      cachedKeys instanceof Set ? cachedKeys : new Set(cachedKeys || []);
    if (cachedSet.has(cacheKey)) {
      return { allow: false, reason: "already_cached", cacheKey };
    }

    if (
      trigger === "player_open" &&
      settings.autoOnExistingVideos === false
    ) {
      return { allow: false, reason: "auto_existing_disabled", cacheKey };
    }

    if (
      trigger === "generate" &&
      settings.autoOnGenerate === false
    ) {
      return { allow: false, reason: "auto_generate_disabled", cacheKey };
    }

    if (matchesExcludePattern(title, settings.excludePatterns)) {
      return { allow: false, reason: "excluded_by_pattern", cacheKey };
    }
  }

  return { allow: true, reason: "eligible", cacheKey };
}

/**
 * Subtitle Engine (`src/lib/subtitles.js`)
 *
 * Pure, dependency-free library handling:
 * - SRT & WebVTT parsing (including LLM markdown-fenced / `<think>` outputs)
 * - SRT & WebVTT standards-compliant serialization
 * - Word-level timestamp grouping into crisp 1–2 line readable cues (`cuesFromWords`)
 * - Segment-level reflow & Whisper silence-hallucination filtering (`cuesFromSegments`)
 * - Balanced 2-line text wrapping (`wrapSubtitleLines`)
 * - Monotonic sorting, overlap trimming, and O(log N) playback lookup (`findActiveCue`)
 */

const HALLUCINATION_PATTERNS = [
  /^thank(?:s| you)(?: very much| so much)? for watching[.!]*$/i,
  /^subtitles by\b/i,
  /^amara\.org/i,
  /^please subscribe\b/i,
  /^\[(?:music|silence|applause|blank_audio)\]$/i,
];

const DEFAULT_MAX_LINE_CHARS = 42;
const DEFAULT_MAX_CUE_CHARS = 84;
const DEFAULT_MAX_DURATION_SEC = 6.2;
const DEFAULT_MIN_DURATION_SEC = 0.85;
const PAUSE_SPLIT_THRESHOLD_SEC = 0.38;

/**
 * Strips `<think>...</think>` blocks and markdown code fences from LLM outputs.
 */
export function stripLlmFences(rawText) {
  if (typeof rawText !== "string") return "";
  let s = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // Handle unclosed `<think>` prefix if truncated
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

/**
 * Parses `HH:MM:SS,mmm`, `HH:MM:SS.mmm`, or `MM:SS.mmm` into seconds (`Number`).
 */
export function parseTimestampSec(raw) {
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

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds)
  ) {
    return NaN;
  }
  return Math.max(0, hours * 3600 + minutes * 60 + seconds);
}

/**
 * Formats seconds into SRT (`00:01:24,350`) or VTT (`00:01:24.350`) timestamp.
 */
export function formatTimestamp(seconds, separator = ",") {
  const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMs = Math.round(clamped * 1000);
  const ms = totalMs % 1000;
  const totalSecs = Math.floor(totalMs / 1000);
  const s = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const m = totalMins % 60;
  const h = Math.floor(totalMins / 60);

  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  const mmm = String(ms).padStart(3, "0");
  return `${hh}:${mm}:${ss}${separator}${mmm}`;
}

/**
 * Wraps cue text cleanly into at most 2 balanced lines for comfortable video reading.
 */
export function wrapSubtitleLines(text, maxLineChars = DEFAULT_MAX_LINE_CHARS) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (clean.length <= maxLineChars) return clean;

  const words = clean.split(" ");
  if (words.length <= 1) return clean;

  // Find split point closest to visual midpoint, preferring punctuation breaks
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
  return `${line1}\n${line2}`;
}

/**
 * Normalizes, sorts, deduplicates, and resolves overlaps across a cue array.
 */
export function normalizeAndSortCues(rawCues, offsetSec = 0) {
  if (!Array.isArray(rawCues) || rawCues.length === 0) return [];

  const cleaned = [];
  for (const item of rawCues) {
    if (!item || typeof item !== "object") continue;
    const startRaw = Number(item.startSec ?? item.start);
    const endRaw = Number(item.endSec ?? item.end);
    if (!Number.isFinite(startRaw)) continue;

    let text = String(item.text || "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!text) continue;

    const speaker =
      typeof item.speaker === "string" && item.speaker.trim()
        ? item.speaker.trim()
        : null;

    const startSec = Math.max(0, Math.round((startRaw + offsetSec) * 1000) / 1000);
    const fallbackEnd = startSec + Math.max(DEFAULT_MIN_DURATION_SEC, text.length * 0.055);
    const computedEnd = Number.isFinite(endRaw)
      ? Math.max(startSec + 0.25, endRaw + offsetSec)
      : fallbackEnd;
    const endSec = Math.round(computedEnd * 1000) / 1000;

    if (!text.includes("\n") && text.length > DEFAULT_MAX_LINE_CHARS) {
      text = wrapSubtitleLines(text, DEFAULT_MAX_LINE_CHARS);
    }

    cleaned.push({ startSec, endSec, text, ...(speaker ? { speaker } : {}) });
  }

  cleaned.sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec);

  // Trim overlaps so consecutive cues never flicker or stack simultaneously
  const out = [];
  for (let i = 0; i < cleaned.length; i++) {
    const curr = { ...cleaned[i] };
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.text === curr.text &&
      Math.abs(curr.startSec - prev.endSec) < 0.15
    ) {
      prev.endSec = Math.max(prev.endSec, curr.endSec);
      continue;
    }
    if (prev && prev.endSec > curr.startSec) {
      if (curr.startSec - prev.startSec >= 0.25) {
        prev.endSec = curr.startSec;
      } else {
        curr.startSec = prev.endSec;
        if (curr.endSec <= curr.startSec + 0.2) {
          curr.endSec = Math.round((curr.startSec + 0.6) * 1000) / 1000;
        }
      }
    }
    out.push(curr);
  }

  return out.map((cue, idx) => ({
    index: idx + 1,
    ...cue,
  }));
}

/**
 * Parses `.srt`, `.vtt`, or LM Subs `.json` subtitle payloads into normalized `SubtitleCue[]`.
 */
export function parseSubtitleText(input, offsetSec = 0) {
  const cleaned = stripLlmFences(input);
  if (!cleaned) return [];

  const trimmed = cleaned.replace(/^\uFEFF/, "").trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsedJson = JSON.parse(trimmed);
      const cueArray = Array.isArray(parsedJson)
        ? parsedJson
        : Array.isArray(parsedJson?.cues)
          ? parsedJson.cues
          : null;
      if (cueArray) {
        return normalizeAndSortCues(
          cueArray.map((c) => ({
            startSec: Number(c.startSec ?? c.start ?? 0),
            endSec: Number(c.endSec ?? c.end ?? 0),
            text: String(c.text || ""),
            ...(c.speaker ? { speaker: String(c.speaker) } : {}),
          })),
          offsetSec
        );
      }
    } catch {
      // Fall through to line-based SRT/VTT parser
    }
  }

  const lines = cleaned.replace(/^\uFEFF/, "").split(/\r?\n/);
  const rawCues = [];
  let i = 0;

  // Skip optional WEBVTT header & metadata blocks
  if (lines[0] && /^WEBVTT\b/i.test(lines[0].trim())) {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "") i++;
  }

  while (i < lines.length) {
    while (i < lines.length && lines[i].trim() === "") i++;
    if (i >= lines.length) break;

    // Skip NOTE or STYLE blocks in WebVTT
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
    const rightSide = timeLine
      .slice(arrowIdx + 3)
      .trim()
      .split(/\s+/)[0];

    const startSec = parseTimestampSec(startStr);
    const endSec = parseTimestampSec(rightSide);
    i++;

    const textLines = [];
    while (i < lines.length && lines[i].trim() !== "") {
      // Strip VTT inline tags like `<c>` or `<00:01.000>` while preserving text
      const stripped = lines[i].replace(/<[^>]+>/g, "").trim();
      if (stripped) textLines.push(stripped);
      i++;
    }

    if (Number.isFinite(startSec) && textLines.length > 0) {
      rawCues.push({
        startSec,
        endSec,
        text: textLines.join("\n"),
      });
    }
  }

  return normalizeAndSortCues(rawCues, offsetSec);
}

export const parseSrt = parseSubtitleText;
export const parseVtt = parseSubtitleText;

/**
 * Formats normalized cues into SubRip (`.srt`) format.
 */
export function formatSrt(cues) {
  const normalized = normalizeAndSortCues(cues);
  if (normalized.length === 0) return "";
  return (
    normalized
      .map((cue, idx) => {
        const prefix = cue.speaker ? `[${cue.speaker}] ` : "";
        const body = prefix ? wrapSubtitleLines(`${prefix}${cue.text.replace(/\n/g, " ")}`) : cue.text;
        return `${idx + 1}\n${formatTimestamp(cue.startSec, ",")} --> ${formatTimestamp(
          cue.endSec,
          ","
        )}\n${body}`;
      })
      .join("\n\n") + "\n"
  );
}

/**
 * Formats normalized cues into WebVTT (`.vtt`) format (used by `<track>` & downloads).
 */
export function formatVtt(cues) {
  const normalized = normalizeAndSortCues(cues);
  if (normalized.length === 0) return "WEBVTT\n\n";
  const blocks = normalized.map((cue, idx) => {
    const prefix = cue.speaker ? `[${cue.speaker}] ` : "";
    const body = prefix ? wrapSubtitleLines(`${prefix}${cue.text.replace(/\n/g, " ")}`) : cue.text;
    return `${idx + 1}\n${formatTimestamp(cue.startSec, ".")} --> ${formatTimestamp(
      cue.endSec,
      "."
    )}\n${body}`;
  });
  return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
}

/**
 * Formats seconds into compact `[MM:SS]` or `[HH:MM:SS]` for plain-text transcripts.
 */
export function formatShortTimestamp(seconds) {
  const clamped = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  const s = clamped % 60;
  const totalMins = Math.floor(clamped / 60);
  const m = totalMins % 60;
  const h = Math.floor(totalMins / 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Formats normalized cues into a clean, readable plain-text (`.txt`) transcript
 * suitable for Notion, Obsidian, Google Docs, or NotebookLM source notes.
 */
export function formatTxt(cues, { includeTimestamps = true, title = "" } = {}) {
  const normalized = normalizeAndSortCues(cues);
  if (normalized.length === 0) return "";
  const header = title ? `# ${String(title).trim()}\n\n` : "";
  const lines = normalized.map((cue) => {
    const cleanText = String(cue.text || "")
      .replace(/\s+/g, " ")
      .trim();
    const speakerPrefix = cue.speaker ? `${cue.speaker}: ` : "";
    if (!includeTimestamps) {
      return `${speakerPrefix}${cleanText}`;
    }
    return `[${formatShortTimestamp(cue.startSec)}] ${speakerPrefix}${cleanText}`;
  });
  return `${header}${lines.join("\n")}\n`;
}

/**
 * Formats normalized cues and metadata into structured JSON (`.json`).
 */
export function formatJsonSubtitles(cues, meta = {}) {
  const normalized = normalizeAndSortCues(cues);
  const payload = {
    schema: "lm-subs/v1",
    title: meta.title || "NotebookLM Video Overview",
    language: meta.language || "en",
    ...(meta.provider ? { provider: meta.provider } : {}),
    ...(meta.model ? { model: meta.model } : {}),
    ...(meta.artifactId ? { artifactId: meta.artifactId } : {}),
    cueCount: normalized.length,
    exportedAt: meta.exportedAt || new Date().toISOString(),
    cues: normalized,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Formats normalized cues into structured Markdown study notes (`.md`) grouped
 * into ~90-second sections with timestamp anchors and a full timestamped index.
 */
export function formatMarkdownNotes(cues, meta = {}) {
  const normalized = normalizeAndSortCues(cues);
  const title = String(meta.title || "NotebookLM Video Overview").trim();
  const lang = String(meta.language || "en").trim();
  const lastEnd =
    normalized.length > 0 ? normalized[normalized.length - 1].endSec : 0;
  const mins = Math.floor(lastEnd / 60);
  const secs = Math.round(lastEnd % 60);
  const durationLabel = `${mins}:${String(secs).padStart(2, "0")}`;

  const lines = [
    `# ${title}`,
    "",
    `- **Language:** ${lang}`,
    `- **Duration:** ${durationLabel}`,
    `- **Synchronized cues:** ${normalized.length}`,
    ...(meta.provider ? [`- **Transcribed via:** ${meta.provider}`] : []),
    "",
  ];

  if (normalized.length === 0) {
    lines.push("_No caption cues available._", "");
    return lines.join("\n");
  }

  // Group into ~90s sections so long lectures read cleanly as study notes
  const SECTION_SPAN_SEC = 90;
  const sections = [];
  let current = null;

  for (const cue of normalized) {
    if (
      !current ||
      cue.startSec - current.startSec >= SECTION_SPAN_SEC
    ) {
      current = {
        startSec: cue.startSec,
        endSec: cue.endSec,
        items: [],
      };
      sections.push(current);
    }
    current.endSec = Math.max(current.endSec, cue.endSec);
    current.items.push(cue);
  }

  lines.push("## Study summary by timestamp", "");
  sections.forEach((sec, idx) => {
    const startStamp = formatTimestamp(sec.startSec, ".").slice(3, 8);
    const endStamp = formatTimestamp(sec.endSec, ".").slice(3, 8);
    lines.push(`### Part ${idx + 1} (${startStamp} to ${endStamp})`, "");
    const prose = sec.items
      .map((c) => {
        const clean = c.text.replace(/\s*\n\s*/g, " ").trim();
        return c.speaker ? `**${c.speaker}:** ${clean}` : clean;
      })
      .join(" ");
    lines.push(prose, "");
  });

  lines.push("## Timestamped transcript", "");
  for (const cue of normalized) {
    const stamp = formatTimestamp(cue.startSec, ".").slice(3, 8);
    const clean = cue.text.replace(/\s*\n\s*/g, " ").trim();
    const speakerPrefix = cue.speaker ? `**${cue.speaker}:** ` : "";
    lines.push(`- \`[${stamp}]\` ${speakerPrefix}${clean}`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Performs case-insensitive full-text search across a cue array, returning
 * matching cue indices and snippets.
 */
export function searchCues(cues, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q || !Array.isArray(cues) || cues.length === 0) return [];
  const matches = [];
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const hay = `${cue?.speaker || ""} ${cue?.text || ""}`.toLowerCase();
    if (hay.includes(q)) {
      matches.push({
        index: i,
        startSec: cue.startSec,
        endSec: cue.endSec,
        text: String(cue.text || "").replace(/\s*\n\s*/g, " ").trim(),
      });
    }
  }
  return matches;
}

/**
 * Builds a clean filesystem-safe slug for exported subtitle filenames.
 */
export function slugifySubtitleFilename(title) {
  const slug = String(title || "notebooklm-video-overview")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "notebooklm-video-overview";
}

/**
 * Unified serializer returning `{ content, extension, mimeType, filename }`
 * for `srt`, `vtt`, `txt`, `md`, or `json`.
 */
export function serializeSubtitles(cues, format = "srt", meta = {}) {
  const fmt = String(format || "srt").toLowerCase();
  const base = slugifySubtitleFilename(meta.title);

  if (fmt === "vtt") {
    return {
      content: formatVtt(cues),
      extension: "vtt",
      mimeType: "text/vtt;charset=utf-8",
      filename: `${base}.vtt`,
    };
  }
  if (fmt === "txt") {
    return {
      content: formatTxt(cues, {
        includeTimestamps: meta.includeTimestamps !== false,
        title: meta.title || "",
      }),
      extension: "txt",
      mimeType: "text/plain;charset=utf-8",
      filename: `${base}.txt`,
    };
  }
  if (fmt === "md" || fmt === "markdown") {
    return {
      content: formatMarkdownNotes(cues, meta),
      extension: "md",
      mimeType: "text/markdown;charset=utf-8",
      filename: `${base}-notes.md`,
    };
  }
  if (fmt === "json") {
    return {
      content: formatJsonSubtitles(cues, meta),
      extension: "json",
      mimeType: "application/json;charset=utf-8",
      filename: `${base}.json`,
    };
  }
  return {
    content: formatSrt(cues),
    extension: "srt",
    mimeType: "application/x-subrip;charset=utf-8",
    filename: `${base}.srt`,
  };
}

/**
 * Groups word-level timestamps (`[{ word|text, start, end, speaker? }]`) into
 * crisp, natural 1–2 line subtitle cues breaking on punctuation and pauses.
 */
export function cuesFromWords(
  words,
  {
    maxCueChars = DEFAULT_MAX_CUE_CHARS,
    maxDurationSec = DEFAULT_MAX_DURATION_SEC,
    offsetSec = 0,
  } = {}
) {
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
      speaker: w.speaker ?? w.speaker_id ?? null,
    });
  }

  if (tokens.length === 0) return [];

  const cues = [];
  let bucket = [];
  let bucketChars = 0;

  const flushBucket = () => {
    if (bucket.length === 0) return;
    const text = bucket
      .map((t) => t.word)
      .join(" ")
      .replace(/\s+([,.;:?!])/g, "$1");
    cues.push({
      startSec: bucket[0].start,
      endSec: Math.max(bucket[0].start + DEFAULT_MIN_DURATION_SEC, bucket[bucket.length - 1].end),
      text,
      speaker: bucket[0].speaker ? String(bucket[0].speaker) : undefined,
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
      const speakerChanged =
        prev.speaker && tok.speaker && prev.speaker !== tok.speaker;
      const sentenceEnded = /[.?!]["')]*$/.test(prev.word);
      const clauseEnded = /[,;:—-]$/.test(prev.word);

      const shouldFlush =
        speakerChanged ||
        nextChars > maxCueChars ||
        nextDuration > maxDurationSec ||
        (sentenceEnded && (bucketChars >= 24 || gap >= 0.18)) ||
        (clauseEnded && bucketChars >= 48) ||
        (gap >= PAUSE_SPLIT_THRESHOLD_SEC && bucketChars >= 20);

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
    if (
      text.length < 48 ||
      HALLUCINATION_PATTERNS.some((rx) => rx.test(text))
    ) {
      return true;
    }
  }
  if (noSpeech > 0.6 && HALLUCINATION_PATTERNS.some((rx) => rx.test(text))) {
    return true;
  }
  return false;
}

/**
 * Splits a single overlong segment (e.g. a 16-second 220-character Voxtral or
 * Whisper segment) proportionally into comfortable <=84-char caption chunks.
 */
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
    const naturalBreak =
      (/[.?!]$/.test(prevWord) && currLen >= 28) ||
      (/[,;:—]$/.test(prevWord) && currLen >= 46);

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
    const chunkEnd =
      idx === chunks.length - 1 ? endSec : cursor + totalDur * share;
    const cue = {
      startSec: cursor,
      endSec: chunkEnd,
      text: chunkText,
      speaker,
    };
    cursor = chunkEnd;
    return cue;
  });
}

/**
 * Converts segment-level timestamps (`[{ start, end, text, no_speech_prob?, speaker_id? }]`)
 * into clean, hallucination-filtered, readable cues.
 */
export function cuesFromSegments(
  segments,
  { maxCueChars = DEFAULT_MAX_CUE_CHARS, offsetSec = 0 } = {}
) {
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
    const endSec = Number.isFinite(endCandidate)
      ? Math.max(startSec + 0.3, endCandidate)
      : startSec + 2.5;
    const speaker = seg.speaker ?? seg.speaker_id ?? undefined;

    const pieces = splitLongSegment(
      startSec,
      endSec,
      String(seg.text || ""),
      speaker ? String(speaker) : undefined,
      maxCueChars
    );
    raw.push(...pieces);
  }

  return normalizeAndSortCues(raw, offsetSec);
}

/**
 * Binary-searches sorted cues (`O(log N)`) to return the active cue at `timeSec`
 * (or `null` when between cues).
 */
export function findActiveCue(cues, timeSec) {
  if (!Array.isArray(cues) || cues.length === 0 || !Number.isFinite(timeSec)) {
    return null;
  }

  let lo = 0;
  let hi = cues.length - 1;
  let candidateIdx = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (cues[mid].startSec <= timeSec) {
      candidateIdx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (candidateIdx === -1) return null;
  const cue = cues[candidateIdx];
  if (timeSec >= cue.startSec && timeSec <= cue.endSec) {
    return cue;
  }
  return null;
}

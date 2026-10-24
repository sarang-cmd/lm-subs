/**
 * Multipart `/audio/transcriptions` adapter supporting:
 * - Groq (`whisper-large-v3-turbo`, `whisper-large-v3`)
 * - Mistral (`voxtral-mini-transcribe-3`, `voxtral-small-transcribe-3`, `voxtral-mini-latest`)
 * - OpenRouter (`mistralai/voxtral-mini-transcribe`)
 * - OpenAI (`whisper-1`)
 * - Custom / Local Whisper (`speaches`, `faster-whisper-server`, `whisper.cpp`, `LocalAI`)
 */

import {
  cuesFromSegments,
  cuesFromWords,
  parseSubtitleText,
} from "../subtitles.js";
import {
  getProviderSpec,
  redactSecrets,
  resolveCustomTranscriptionUrl,
} from "./registry.js";

export class ProviderHttpError extends Error {
  constructor(message, { status = 0, retryAfterSec = null, provider = "" } = {}) {
    super(message);
    this.name = "ProviderHttpError";
    this.status = status;
    this.retryAfterSec = retryAfterSec;
    this.provider = provider;
  }
}

export function parseRetryAfterSeconds(headers) {
  if (!headers || typeof headers.get !== "function") return null;
  const raw = headers.get("retry-after");
  if (!raw) return null;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.min(60, numeric);
  }
  return null;
}

export async function readErrorDetail(response, secrets = []) {
  let detail = "";
  try {
    const text = await response.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        detail =
          parsed?.error?.message ||
          parsed?.message ||
          parsed?.detail ||
          text.slice(0, 240);
      } catch {
        detail = text.slice(0, 240);
      }
    }
  } catch {
    detail = "";
  }
  return redactSecrets(detail || `HTTP ${response.status}`, secrets);
}

function normalizeIso6391(language) {
  if (typeof language !== "string" || !language.trim()) return null;
  const base = language.trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2}$/.test(base) ? base : null;
}

function parseTranscriptionPayload(payload, offsetSec = 0, durationHintSec = null) {
  if (typeof payload === "string") {
    const parsed = parseSubtitleText(payload, offsetSec);
    if (parsed.length > 0) return parsed;
    if (payload.trim()) {
      return [
        {
          index: 1,
          startSec: offsetSec,
          endSec: offsetSec + (durationHintSec || Math.max(2, payload.length * 0.06)),
          text: payload.trim(),
        },
      ];
    }
    return [];
  }

  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload.words) && payload.words.length > 0) {
    const wordCues = cuesFromWords(payload.words, { offsetSec });
    if (wordCues.length > 0) return wordCues;
  }

  if (Array.isArray(payload.segments) && payload.segments.length > 0) {
    const segCues = cuesFromSegments(payload.segments, { offsetSec });
    if (segCues.length > 0) return segCues;
  }

  if (typeof payload.vtt === "string" && payload.vtt.trim()) {
    const vttCues = parseSubtitleText(payload.vtt, offsetSec);
    if (vttCues.length > 0) return vttCues;
  }

  if (typeof payload.srt === "string" && payload.srt.trim()) {
    const srtCues = parseSubtitleText(payload.srt, offsetSec);
    if (srtCues.length > 0) return srtCues;
  }

  if (typeof payload.text === "string" && payload.text.trim()) {
    const maybeSub = parseSubtitleText(payload.text, offsetSec);
    if (maybeSub.length > 0) return maybeSub;
    const dur =
      Number(payload.duration ?? payload.usage?.prompt_audio_seconds) ||
      durationHintSec ||
      Math.max(2.5, payload.text.trim().length * 0.06);
    return cuesFromSegments(
      [{ start: 0, end: dur, text: payload.text.trim() }],
      { offsetSec }
    );
  }

  return [];
}

async function sendMultipartTranscription({
  url,
  providerId,
  model,
  apiKey,
  audioBytes,
  mimeType = "audio/mp4",
  fileName = "audio.m4a",
  language = null,
  isMistral = false,
  isOpenRouter = false,
  offsetSec = 0,
  durationHintSec = null,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const form = new FormData();
  const blob = new Blob([audioBytes], { type: mimeType });
  form.append("file", blob, fileName);
  form.append("model", model);

  const lang2 = normalizeIso6391(language);
  if (lang2) {
    form.append("language", lang2);
  }

  if (isMistral) {
    // Mistral Voxtral Transcribe returns `segments[]` with `timestamp_granularities="segment"`
    form.append("timestamp_granularities", "segment");
  } else if (isOpenRouter) {
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
  } else {
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    if (providerId === "groq" || providerId === "openai") {
      form.append("timestamp_granularities[]", "word");
    }
  }

  const headers = {};
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetchImpl(url, {
    method: "POST",
    headers,
    body: form,
    signal,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey]);
    throw new ProviderHttpError(`${providerId} (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: providerId,
    });
  }

  const contentType = (response.headers?.get?.("content-type") || "").toLowerCase();
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return parseTranscriptionPayload(payload, offsetSec, durationHintSec);
}

export async function callMultipartSttProvider({
  providerId,
  model,
  apiKey,
  customBaseUrl = "",
  audioBytes,
  mimeType = "audio/mp4",
  fileName = "audio.m4a",
  language = null,
  offsetSec = 0,
  durationHintSec = null,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const spec = getProviderSpec(providerId);
  const resolvedModel = (model && model.trim()) || spec.defaultModel;
  const endpoint =
    spec.id === "custom"
      ? resolveCustomTranscriptionUrl(customBaseUrl)
      : spec.endpoint;

  try {
    return await sendMultipartTranscription({
      url: endpoint,
      providerId: spec.id,
      model: resolvedModel,
      apiKey,
      audioBytes,
      mimeType,
      fileName,
      language,
      isMistral: spec.protocol === "mistral-stt",
      isOpenRouter: spec.id === "openrouter",
      offsetSec,
      durationHintSec,
      fetchImpl,
      signal,
    });
  } catch (err) {
    // Graceful Mistral model-alias fallback (`voxtral-mini-transcribe-3` -> `voxtral-mini-latest`)
    if (
      spec.id === "mistral" &&
      resolvedModel === "voxtral-mini-transcribe-3" &&
      (err?.status === 400 || err?.status === 404 || /model/i.test(err?.message || ""))
    ) {
      return await sendMultipartTranscription({
        url: endpoint,
        providerId: spec.id,
        model: "voxtral-mini-latest",
        apiKey,
        audioBytes,
        mimeType,
        fileName,
        language,
        isMistral: true,
        offsetSec,
        durationHintSec,
        fetchImpl,
        signal,
      });
    }
    throw err;
  }
}

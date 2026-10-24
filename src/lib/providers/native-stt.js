/**
 * Dedicated Speech-to-Text adapters for non-OpenAI wire protocols:
 * - Deepgram (`nova-3` / `nova-2`)
 * - ElevenLabs (`scribe_v2`)
 * - AssemblyAI (`universal` / `nano`)
 * - Gladia (`solaria-1`)
 * - Cloudflare Workers AI (`@cf/openai/whisper-large-v3-turbo`)
 * - Hugging Face Inference (`openai/whisper-large-v3-turbo`)
 */

import {
  cuesFromSegments,
  cuesFromWords,
  parseSubtitleText,
} from "../subtitles.js";
import { uint8ToBase64 } from "./gemini-stt.js";
import {
  ProviderHttpError,
  parseRetryAfterSeconds,
  readErrorDetail,
} from "./openai-stt.js";
import { getProviderSpec } from "./registry.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callDeepgramProvider({
  model,
  apiKey,
  audioBytes,
  mimeType = "audio/mp4",
  language = null,
  offsetSec = 0,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const spec = getProviderSpec("deepgram");
  const resolvedModel = (model && model.trim()) || spec.defaultModel;
  const params = new URLSearchParams({
    model: resolvedModel,
    smart_format: "true",
    punctuate: "true",
    utterances: "true",
  });
  if (language && /^[a-z]{2}/i.test(language)) {
    params.set("language", language.slice(0, 2).toLowerCase());
  } else {
    params.set("detect_language", "true");
  }

  const response = await fetchImpl(`${spec.endpoint}?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": mimeType || "audio/mp4",
    },
    body: audioBytes,
    signal,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey]);
    throw new ProviderHttpError(`deepgram (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: "deepgram",
    });
  }

  const data = await response.json();
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];
  const words = alt?.words;
  if (Array.isArray(words) && words.length > 0) {
    return cuesFromWords(
      words.map((w) => ({
        word: w.punctuated_word || w.word,
        start: w.start,
        end: w.end,
      })),
      { offsetSec }
    );
  }
  const utterances = data?.results?.utterances;
  if (Array.isArray(utterances) && utterances.length > 0) {
    return cuesFromSegments(
      utterances.map((u) => ({ start: u.start, end: u.end, text: u.transcript })),
      { offsetSec }
    );
  }
  return [];
}

export async function callElevenLabsProvider({
  model,
  apiKey,
  audioBytes,
  mimeType = "audio/mp4",
  fileName = "audio.m4a",
  language = null,
  offsetSec = 0,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const spec = getProviderSpec("elevenlabs");
  const resolvedModel = (model && model.trim()) || spec.defaultModel;

  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: mimeType }), fileName);
  form.append("model_id", resolvedModel);
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "false");
  if (language && /^[a-z]{2}/i.test(language)) {
    form.append("language_code", language.slice(0, 2).toLowerCase());
  }

  const response = await fetchImpl(spec.endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: form,
    signal,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey]);
    throw new ProviderHttpError(`elevenlabs (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: "elevenlabs",
    });
  }

  const data = await response.json();
  if (Array.isArray(data?.words) && data.words.length > 0) {
    return cuesFromWords(data.words, { offsetSec });
  }
  if (typeof data?.text === "string" && data.text.trim()) {
    return cuesFromSegments([{ start: 0, end: 4, text: data.text.trim() }], {
      offsetSec,
    });
  }
  return [];
}

export async function callAssemblyAiProvider({
  model,
  apiKey,
  audioBytes,
  language = null,
  offsetSec = 0,
  pollIntervalMs = 1500,
  maxPolls = 80,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const spec = getProviderSpec("assemblyai");
  const headers = { Authorization: apiKey };

  // 1. Upload binary audio
  const upRes = await fetchImpl(`${spec.endpoint}/upload`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/octet-stream",
    },
    body: audioBytes,
    signal,
  });
  if (!upRes.ok) {
    const detail = await readErrorDetail(upRes, [apiKey]);
    throw new ProviderHttpError(`assemblyai (${upRes.status}): ${detail}`, {
      status: upRes.status,
      retryAfterSec: parseRetryAfterSeconds(upRes.headers),
      provider: "assemblyai",
    });
  }
  const { upload_url: uploadUrl } = await upRes.json();

  // 2. Create transcript job
  const txBody = {
    audio_url: uploadUrl,
    speech_model: (model && model.trim()) || spec.defaultModel,
  };
  if (language && /^[a-z]{2}/i.test(language)) {
    txBody.language_code = language.slice(0, 2).toLowerCase();
  } else {
    txBody.language_detection = true;
  }

  const createRes = await fetchImpl(`${spec.endpoint}/transcript`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(txBody),
    signal,
  });
  if (!createRes.ok) {
    const detail = await readErrorDetail(createRes, [apiKey]);
    throw new ProviderHttpError(`assemblyai (${createRes.status}): ${detail}`, {
      status: createRes.status,
      retryAfterSec: parseRetryAfterSeconds(createRes.headers),
      provider: "assemblyai",
    });
  }
  const created = await createRes.json();
  const transcriptId = created?.id;
  if (!transcriptId) {
    throw new Error("assemblyai: missing transcript id");
  }

  // 3. Poll until completed
  for (let i = 0; i < maxPolls; i++) {
    const pollRes = await fetchImpl(`${spec.endpoint}/transcript/${transcriptId}`, {
      method: "GET",
      headers,
      signal,
    });
    if (!pollRes.ok) {
      const detail = await readErrorDetail(pollRes, [apiKey]);
      throw new ProviderHttpError(`assemblyai (${pollRes.status}): ${detail}`, {
        status: pollRes.status,
        provider: "assemblyai",
      });
    }
    const statusData = await pollRes.json();
    if (statusData.status === "completed") {
      if (Array.isArray(statusData.words) && statusData.words.length > 0) {
        return cuesFromWords(
          statusData.words.map((w) => ({
            word: w.text,
            start: Number(w.start) / 1000,
            end: Number(w.end) / 1000,
          })),
          { offsetSec }
        );
      }
      return [];
    }
    if (statusData.status === "error") {
      throw new Error(`assemblyai: ${statusData.error || "transcription failed"}`);
    }
    await sleep(pollIntervalMs);
  }

  throw new Error("assemblyai: timed out waiting for transcription");
}

export async function callGladiaProvider({
  apiKey,
  audioBytes,
  mimeType = "audio/mp4",
  fileName = "audio.m4a",
  offsetSec = 0,
  pollIntervalMs = 1500,
  maxPolls = 80,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const spec = getProviderSpec("gladia");

  const upForm = new FormData();
  upForm.append("audio", new Blob([audioBytes], { type: mimeType }), fileName);

  const upRes = await fetchImpl(`${spec.endpoint}/upload`, {
    method: "POST",
    headers: { "x-gladia-key": apiKey },
    body: upForm,
    signal,
  });
  if (!upRes.ok) {
    const detail = await readErrorDetail(upRes, [apiKey]);
    throw new ProviderHttpError(`gladia (${upRes.status}): ${detail}`, {
      status: upRes.status,
      retryAfterSec: parseRetryAfterSeconds(upRes.headers),
      provider: "gladia",
    });
  }
  const { audio_url: audioUrl } = await upRes.json();

  const initRes = await fetchImpl(`${spec.endpoint}/pre-recorded`, {
    method: "POST",
    headers: {
      "x-gladia-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      subtitles: true,
      subtitles_config: { formats: ["srt"] },
    }),
    signal,
  });
  if (!initRes.ok) {
    const detail = await readErrorDetail(initRes, [apiKey]);
    throw new ProviderHttpError(`gladia (${initRes.status}): ${detail}`, {
      status: initRes.status,
      retryAfterSec: parseRetryAfterSeconds(initRes.headers),
      provider: "gladia",
    });
  }
  const initData = await initRes.json();
  const resultUrl =
    initData?.result_url || `${spec.endpoint}/pre-recorded/${initData?.id}`;

  for (let i = 0; i < maxPolls; i++) {
    const pollRes = await fetchImpl(resultUrl, {
      method: "GET",
      headers: { "x-gladia-key": apiKey },
      signal,
    });
    if (!pollRes.ok) {
      const detail = await readErrorDetail(pollRes, [apiKey]);
      throw new ProviderHttpError(`gladia (${pollRes.status}): ${detail}`, {
        status: pollRes.status,
        provider: "gladia",
      });
    }
    const job = await pollRes.json();
    if (job.status === "done") {
      const srtText = job?.result?.transcription?.subtitles?.[0]?.subtitles;
      if (typeof srtText === "string" && srtText.trim()) {
        return parseSubtitleText(srtText, offsetSec);
      }
      const utterances = job?.result?.transcription?.utterances;
      if (Array.isArray(utterances) && utterances.length > 0) {
        return cuesFromSegments(
          utterances.map((u) => ({ start: u.start, end: u.end, text: u.text })),
          { offsetSec }
        );
      }
      return [];
    }
    if (job.status === "error") {
      throw new Error(`gladia: ${job.error_message || "transcription failed"}`);
    }
    await sleep(pollIntervalMs);
  }

  throw new Error("gladia: timed out waiting for transcription");
}

export async function callCloudflareProvider({
  model,
  apiKey,
  audioBytes,
  offsetSec = 0,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const spec = getProviderSpec("cloudflare");
  const resolvedModel = (model && model.trim()) || spec.defaultModel;
  const sepIdx = String(apiKey || "").indexOf(":");
  if (sepIdx <= 0) {
    throw new ProviderHttpError(
      "cloudflare: enter key as ACCOUNT_ID:API_TOKEN",
      { status: 400, provider: "cloudflare" }
    );
  }
  const accountId = apiKey.slice(0, sepIdx).trim();
  const token = apiKey.slice(sepIdx + 1).trim();

  const url = `${spec.endpoint}/${encodeURIComponent(accountId)}/ai/run/${resolvedModel}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audio: uint8ToBase64(audioBytes) }),
    signal,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey, token]);
    throw new ProviderHttpError(`cloudflare (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: "cloudflare",
    });
  }

  const data = await response.json();
  const result = data?.result || data;
  if (Array.isArray(result?.words) && result.words.length > 0) {
    return cuesFromWords(result.words, { offsetSec });
  }
  if (typeof result?.vtt === "string" && result.vtt.trim()) {
    return parseSubtitleText(result.vtt, offsetSec);
  }
  if (typeof result?.text === "string" && result.text.trim()) {
    return cuesFromSegments([{ start: 0, end: 4, text: result.text.trim() }], {
      offsetSec,
    });
  }
  return [];
}

export async function callHuggingFaceProvider({
  model,
  apiKey,
  audioBytes,
  offsetSec = 0,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const spec = getProviderSpec("huggingface");
  const resolvedModel = (model && model.trim()) || spec.defaultModel;
  const url = `${spec.endpoint}/${resolvedModel}`;

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: uint8ToBase64(audioBytes),
      parameters: { return_timestamps: true },
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey]);
    throw new ProviderHttpError(`huggingface (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: "huggingface",
    });
  }

  const data = await response.json();
  if (Array.isArray(data?.chunks) && data.chunks.length > 0) {
    return cuesFromSegments(
      data.chunks.map((c) => ({
        start: Array.isArray(c.timestamp) ? c.timestamp[0] : 0,
        end:
          Array.isArray(c.timestamp) && c.timestamp[1] != null
            ? c.timestamp[1]
            : (c.timestamp?.[0] || 0) + 2.5,
        text: c.text,
      })),
      { offsetSec }
    );
  }
  if (typeof data?.text === "string" && data.text.trim()) {
    return cuesFromSegments([{ start: 0, end: 4, text: data.text.trim() }], {
      offsetSec,
    });
  }
  return [];
}

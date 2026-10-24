/**
 * Google Gemini (AI Studio) multimodal Audio-to-Subtitles adapter.
 *
 * Uses `POST /v1beta/models/{model}:generateContent` with `x-goog-api-key` header
 * (never placing the API key in the URL) and `thinkingBudget: 0` on Gemini 2.5
 * Flash models so tokens go directly into accurate SubRip (`.srt`) output.
 */

import { parseSubtitleText } from "../subtitles.js";
import {
  ProviderHttpError,
  parseRetryAfterSeconds,
  readErrorDetail,
} from "./openai-stt.js";
import { getProviderSpec } from "./registry.js";

/**
 * Stack-safe chunked Uint8Array -> Base64 encoder (works in Browser, Service Worker, and Node).
 */
export function uint8ToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString("base64");
  }
  const CHUNK = 0x8000;
  const parts = [];
  for (let i = 0; i < arr.byteLength; i += CHUNK) {
    parts.push(
      String.fromCharCode.apply(null, arr.subarray(i, Math.min(arr.byteLength, i + CHUNK)))
    );
  }
  return btoa(parts.join(""));
}

function buildGeminiSubtitlePrompt({ language, translateTo }) {
  const langInstruction =
    translateTo && translateTo !== "original"
      ? `Translate the spoken dialogue into ${translateTo} while keeping exact spoken timestamps.`
      : language
        ? `Transcribe in the spoken language (${language}).`
        : "Transcribe in the exact language spoken in the audio.";

  return [
    "Transcribe this audio into strict SubRip (.srt) subtitle blocks with accurate timestamps.",
    langInstruction,
    "Rules:",
    "1. Output ONLY valid .srt subtitle blocks (index, `HH:MM:SS,mmm --> HH:MM:SS,mmm`, 1–2 concise lines of text).",
    "2. Keep each cue under 80 characters and 1.2–5.5 seconds long.",
    "3. If there is no speech in the audio, return an empty string.",
    "4. Do NOT wrap output in markdown fences or commentary.",
  ].join("\n");
}

export async function callGeminiSttProvider({
  model,
  apiKey,
  audioBytes,
  mimeType = "audio/mp4",
  language = null,
  translateTo = "",
  offsetSec = 0,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const spec = getProviderSpec("gemini");
  const resolvedModel = (model && model.trim()) || spec.defaultModel;
  const url = `${spec.endpoint}/${encodeURIComponent(resolvedModel)}:generateContent`;

  const b64 = uint8ToBase64(audioBytes);
  const promptText = buildGeminiSubtitlePrompt({ language, translateTo });

  const buildBody = (includeThinkingConfig) => ({
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "audio/mp4",
              data: b64,
            },
          },
          { text: promptText },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      ...(includeThinkingConfig && /gemini-2\.5/i.test(resolvedModel)
        ? { thinkingConfig: { thinkingBudget: 0 } }
        : {}),
    },
  });

  const send = async (withThinking) =>
    fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(buildBody(withThinking)),
      signal,
    });

  let response = await send(true);
  if (!response.ok && response.status === 400 && /gemini-2\.5/i.test(resolvedModel)) {
    response = await send(false);
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response, [apiKey]);
    throw new ProviderHttpError(`gemini (${response.status}): ${detail}`, {
      status: response.status,
      retryAfterSec: parseRetryAfterSeconds(response.headers),
      provider: "gemini",
    });
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .join("\n")
        .trim()
    : "";

  if (!text) return [];
  return parseSubtitleText(text, offsetSec);
}

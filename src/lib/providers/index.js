/**
 * Unified Speech-to-Text Dispatcher & Automatic Multi-Provider Failover Queue.
 */

import { normalizeAndSortCues } from "../subtitles.js";
import { callGeminiSttProvider } from "./gemini-stt.js";
import {
  callAssemblyAiProvider,
  callCloudflareProvider,
  callDeepgramProvider,
  callElevenLabsProvider,
  callGladiaProvider,
  callHuggingFaceProvider,
} from "./native-stt.js";
import { ProviderHttpError, callMultipartSttProvider } from "./openai-stt.js";
import {
  DEFAULT_QUEUE_ORDER,
  PROVIDERS,
  getProviderOriginPattern,
  getProviderSpec,
  listProviderSpecs,
  redactSecrets,
  resolveCustomTranscriptionUrl,
} from "./registry.js";

export {
  DEFAULT_QUEUE_ORDER,
  PROVIDERS,
  ProviderHttpError,
  getProviderOriginPattern,
  getProviderSpec,
  listProviderSpecs,
  redactSecrets,
  resolveCustomTranscriptionUrl,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls a single STT provider for one audio buffer and returns normalized cues.
 */
export async function transcribeSingleChunk({
  providerId,
  model,
  apiKey,
  customBaseUrl = "",
  audioBytes,
  mimeType = "audio/mp4",
  fileName = "audio.m4a",
  language = null,
  translateTo = "",
  offsetSec = 0,
  durationHintSec = null,
  timeoutMs = 120000,
  fetchImpl = globalThis.fetch,
}) {
  const spec = getProviderSpec(providerId);
  const resolvedModel = (model && model.trim()) || spec.defaultModel;

  if (spec.requiresKey && (!apiKey || !apiKey.trim())) {
    throw new ProviderHttpError(`Missing API key for ${spec.name}`, {
      status: 401,
      provider: spec.id,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    switch (spec.protocol) {
      case "openai-stt":
      case "mistral-stt":
      case "custom-openai-stt":
        return await callMultipartSttProvider({
          providerId: spec.id,
          model: resolvedModel,
          apiKey: apiKey?.trim() || "",
          customBaseUrl,
          audioBytes,
          mimeType,
          fileName,
          language,
          offsetSec,
          durationHintSec,
          fetchImpl,
          signal: controller.signal,
        });

      case "gemini-stt":
        return await callGeminiSttProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          mimeType,
          language,
          translateTo,
          offsetSec,
          fetchImpl,
          signal: controller.signal,
        });

      case "deepgram-stt":
        return await callDeepgramProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          mimeType,
          language,
          offsetSec,
          fetchImpl,
          signal: controller.signal,
        });

      case "elevenlabs-stt":
        return await callElevenLabsProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          mimeType,
          fileName,
          language,
          offsetSec,
          fetchImpl,
          signal: controller.signal,
        });

      case "assemblyai-stt":
        return await callAssemblyAiProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          language,
          offsetSec,
          fetchImpl,
          signal: controller.signal,
        });

      case "gladia-stt":
        return await callGladiaProvider({
          apiKey: apiKey.trim(),
          audioBytes,
          mimeType,
          fileName,
          offsetSec,
          fetchImpl,
          signal: controller.signal,
        });

      case "cloudflare-stt":
        return await callCloudflareProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          offsetSec,
          fetchImpl,
          signal: controller.signal,
        });

      case "huggingface-stt":
        return await callHuggingFaceProvider({
          model: resolvedModel,
          apiKey: apiKey.trim(),
          audioBytes,
          offsetSec,
          fetchImpl,
          signal: controller.signal,
        });

      default:
        throw new Error(`Unsupported provider protocol: ${spec.protocol}`);
    }
  } catch (err) {
    const safeMsg = redactSecrets(err?.message || String(err), [apiKey]);
    if (err?.name === "AbortError") {
      throw new ProviderHttpError(`${spec.id}: request timed out`, {
        status: 504,
        provider: spec.id,
      });
    }
    if (err instanceof ProviderHttpError) {
      err.message = safeMsg;
      throw err;
    }
    const endpointHost = (() => {
      try {
        return new URL(
          spec.id === "custom" ? customBaseUrl || spec.endpoint : spec.endpoint
        ).hostname;
      } catch {
        return spec.id;
      }
    })();
    throw new ProviderHttpError(
      `${spec.id} network error (${endpointHost}): ${safeMsg}`,
      {
        status: err?.status || 0,
        provider: spec.id,
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableSingleProviderStatus(status) {
  return (
    status === 0 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

/**
 * Executes transcription across the user's ordered BYOK Provider Queue.
 *
 * - Attempts candidate providers in priority order (`#1 -> #2 -> #3 ...`).
 * - If Provider #1 hits `429` rate limits, `5xx`, upload size cap, or quota exhaustion,
 *   automatically fails over to Provider #2 without re-downloading the video.
 * - Supports multi-chunk audio input, offsetting and merging cues seamlessly.
 */
export async function transcribeWithQueue({
  chunks,
  candidates,
  language = null,
  translateTo = "",
  timeoutMs = 120000,
  singleProviderRetryDelayMs = 1100,
  fetchImpl = globalThis.fetch,
}) {
  const audioChunks =
    Array.isArray(chunks) && chunks.length > 0 ? chunks : [];
  if (audioChunks.length === 0) {
    throw new Error("No audio data available to transcribe.");
  }

  const runnableCandidates = (candidates || []).filter((c) => {
    const spec = getProviderSpec(c.providerId);
    if (!spec.requiresKey) {
      return Boolean(c.enabledInQueue || (c.customBaseUrl && c.customBaseUrl.trim()));
    }
    return typeof c.apiKey === "string" && c.apiKey.trim().length > 0;
  });

  if (runnableCandidates.length === 0) {
    throw new Error(
      "No STT API key configured yet. Click the Subtitles for NotebookLM toolbar icon and paste a free Groq or Mistral API key."
    );
  }

  const allSecrets = runnableCandidates.map((c) => c.apiKey).filter(Boolean);
  const attempts = [];
  const startedAt = Date.now();

  for (let idx = 0; idx < runnableCandidates.length; idx++) {
    const candidate = runnableCandidates[idx];
    const spec = getProviderSpec(candidate.providerId);
    const resolvedModel =
      (candidate.model && candidate.model.trim()) || spec.defaultModel;

    // Verify all chunks fit within this provider's upload byte limit
    const oversizeChunk = audioChunks.find(
      (ch) => ch.bytes.byteLength > spec.maxUploadBytes
    );
    if (oversizeChunk) {
      const mb = (oversizeChunk.bytes.byteLength / (1024 * 1024)).toFixed(1);
      const capMb = (spec.maxUploadBytes / (1024 * 1024)).toFixed(0);
      attempts.push({
        provider: spec.id,
        model: resolvedModel,
        status: 413,
        error: `Extracted audio (${mb} MB) exceeds ${spec.name} ${capMb} MB upload limit`,
      });
      continue;
    }

    const runCandidateOnce = async () => {
      const merged = [];
      for (const ch of audioChunks) {
        const partCues = await transcribeSingleChunk({
          providerId: spec.id,
          model: resolvedModel,
          apiKey: candidate.apiKey,
          customBaseUrl: candidate.customBaseUrl || "",
          audioBytes: ch.bytes,
          mimeType: ch.mimeType || "audio/mp4",
          fileName: ch.fileName || "audio.m4a",
          language,
          translateTo,
          offsetSec: ch.startOffsetSec || 0,
          durationHintSec: ch.durationSec || null,
          timeoutMs,
          fetchImpl,
        });
        merged.push(...partCues);
      }
      return normalizeAndSortCues(merged);
    };

    try {
      const cues = await runCandidateOnce();
      return {
        cues,
        provider: spec.id,
        providerName: spec.name,
        model: resolvedModel,
        failoverUsed: idx > 0,
        attempts,
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      const status = err?.status || 0;
      const safeErr = redactSecrets(err?.message || String(err), allSecrets);

      // When only one provider is configured, retry transient 429/5xx once
      if (
        runnableCandidates.length === 1 &&
        isRetryableSingleProviderStatus(status)
      ) {
        const waitMs = err?.retryAfterSec
          ? Math.min(4000, Math.max(300, err.retryAfterSec * 1000))
          : singleProviderRetryDelayMs;
        await sleep(waitMs);
        try {
          const retryCues = await runCandidateOnce();
          return {
            cues: retryCues,
            provider: spec.id,
            providerName: spec.name,
            model: resolvedModel,
            failoverUsed: false,
            attempts: [{ provider: spec.id, model: resolvedModel, status, retried: true }],
            latencyMs: Date.now() - startedAt,
          };
        } catch (retryErr) {
          attempts.push({
            provider: spec.id,
            model: resolvedModel,
            status: retryErr?.status || status,
            error: redactSecrets(retryErr?.message || String(retryErr), allSecrets),
          });
          break;
        }
      }

      attempts.push({
        provider: spec.id,
        model: resolvedModel,
        status,
        error: safeErr,
      });
    }
  }

  const summary = attempts
    .map((a) => `${a.provider}: ${a.error}`)
    .join(" | ");
  throw new Error(summary || "All configured transcription providers failed.");
}

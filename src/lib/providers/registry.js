/**
 * Registry of all 12 supported BYOK Speech-to-Text & Multimodal Audio providers.
 * Ordered with the most generous permanent / no-card free tiers first.
 */

export const DEFAULT_QUEUE_ORDER = Object.freeze([
  "groq",
  "mistral",
  "gemini",
  "deepgram",
  "assemblyai",
  "gladia",
  "cloudflare",
  "elevenlabs",
  "huggingface",
  "openrouter",
  "openai",
  "custom",
]);

export const PROVIDERS = Object.freeze({
  groq: Object.freeze({
    id: "groq",
    name: "Groq",
    badge: "Best Free Tier · 8 hrs/day",
    freeTierSummary:
      "Permanent free plan, no card: 20 RPM, 2,000 req/day, 7,200 audio sec/hr (2h/hr), 28,800 sec/day (8h/day).",
    defaultModel: "whisper-large-v3-turbo",
    models: ["whisper-large-v3-turbo", "whisper-large-v3"],
    requiresKey: true,
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    originPattern: "https://api.groq.com/*",
    maxUploadBytes: 24 * 1024 * 1024, // 25 MB hard cap -> 24 MB safety margin
    protocol: "openai-stt",
    endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
  }),

  mistral: Object.freeze({
    id: "mistral",
    name: "Mistral (Voxtral)",
    badge: "Free Studio Tier · No Card",
    freeTierSummary:
      "Mistral Studio Experiment plan (free, no card). Voxtral Transcribe 3 returns accurate segment timestamps in 50+ languages.",
    defaultModel: "voxtral-mini-transcribe-3",
    models: [
      "voxtral-mini-transcribe-3",
      "voxtral-small-transcribe-3",
      "voxtral-mini-latest",
    ],
    requiresKey: true,
    keyPlaceholder: "Mistral API key...",
    keyUrl: "https://console.mistral.ai/api-keys",
    originPattern: "https://api.mistral.ai/*",
    maxUploadBytes: 48 * 1024 * 1024,
    protocol: "mistral-stt",
    endpoint: "https://api.mistral.ai/v1/audio/transcriptions",
  }),

  gemini: Object.freeze({
    id: "gemini",
    name: "Google Gemini (AI Studio)",
    badge: "Free Daily Tier · + Translation",
    freeTierSummary:
      "Google AI Studio free tier, no card. Multimodal audio-to-SRT with optional single-pass subtitle translation.",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    requiresKey: true,
    keyPlaceholder: "AIzaSy...",
    keyUrl: "https://aistudio.google.com/apikey",
    originPattern: "https://generativelanguage.googleapis.com/*",
    maxUploadBytes: 18 * 1024 * 1024, // Inline base64 stays comfortably under 20 MB request cap
    protocol: "gemini-stt",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  }),

  deepgram: Object.freeze({
    id: "deepgram",
    name: "Deepgram",
    badge: "$200 Free Credit · ~700 hrs",
    freeTierSummary:
      "$200 signup credit with no credit card (~700+ hours of Nova-3 batch audio with word-level timestamps).",
    defaultModel: "nova-3",
    models: ["nova-3", "nova-2"],
    requiresKey: true,
    keyPlaceholder: "Deepgram API key...",
    keyUrl: "https://console.deepgram.com/",
    originPattern: "https://api.deepgram.com/*",
    maxUploadBytes: 50 * 1024 * 1024,
    protocol: "deepgram-stt",
    endpoint: "https://api.deepgram.com/v1/listen",
  }),

  assemblyai: Object.freeze({
    id: "assemblyai",
    name: "AssemblyAI",
    badge: "$50 Free Credit · ~330 hrs",
    freeTierSummary:
      "$50 free signup credit with no card (~330 hours on Universal-2 with word-level timestamps).",
    defaultModel: "universal",
    models: ["universal", "nano"],
    requiresKey: true,
    keyPlaceholder: "AssemblyAI API key...",
    keyUrl: "https://www.assemblyai.com/app/account",
    originPattern: "https://api.assemblyai.com/*",
    maxUploadBytes: 50 * 1024 * 1024,
    protocol: "assemblyai-stt",
    endpoint: "https://api.assemblyai.com/v2",
  }),

  gladia: Object.freeze({
    id: "gladia",
    name: "Gladia",
    badge: "€50 Free Credit · ~80 hrs",
    freeTierSummary:
      "€50 free credit (~80+ hours of Solaria-1 pre-recorded transcription with native SRT/VTT generation).",
    defaultModel: "solaria-1",
    models: ["solaria-1"],
    requiresKey: true,
    keyPlaceholder: "Gladia API key...",
    keyUrl: "https://app.gladia.io/",
    originPattern: "https://api.gladia.io/*",
    maxUploadBytes: 50 * 1024 * 1024,
    protocol: "gladia-stt",
    endpoint: "https://api.gladia.io/v2",
  }),

  cloudflare: Object.freeze({
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    badge: "Free 10k Neurons/day",
    freeTierSummary:
      "10,000 free Neurons every day. Enter credentials as ACCOUNT_ID:API_TOKEN.",
    defaultModel: "@cf/openai/whisper-large-v3-turbo",
    models: ["@cf/openai/whisper-large-v3-turbo", "@cf/openai/whisper"],
    requiresKey: true,
    keyPlaceholder: "account_id:api_token",
    keyUrl: "https://dash.cloudflare.com/",
    originPattern: "https://api.cloudflare.com/*",
    maxUploadBytes: 18 * 1024 * 1024,
    protocol: "cloudflare-stt",
    endpoint: "https://api.cloudflare.com/client/v4/accounts",
  }),

  elevenlabs: Object.freeze({
    id: "elevenlabs",
    name: "ElevenLabs (Scribe v2)",
    badge: "10k Free Credits/mo",
    freeTierSummary:
      "10,000 monthly free credits (~30 min/month on Scribe v2) with word-level timestamps in 90+ languages.",
    defaultModel: "scribe_v2",
    models: ["scribe_v2"],
    requiresKey: true,
    keyPlaceholder: "sk_...",
    keyUrl: "https://elevenlabs.io/app/settings/api-keys",
    originPattern: "https://api.elevenlabs.io/*",
    maxUploadBytes: 50 * 1024 * 1024,
    protocol: "elevenlabs-stt",
    endpoint: "https://api.elevenlabs.io/v1/speech-to-text",
  }),

  huggingface: Object.freeze({
    id: "huggingface",
    name: "Hugging Face Inference",
    badge: "Free HF Token Quota",
    freeTierSummary:
      "Free monthly Serverless Inference credits using any `hf_...` read/inference token.",
    defaultModel: "openai/whisper-large-v3-turbo",
    models: ["openai/whisper-large-v3-turbo", "openai/whisper-large-v3"],
    requiresKey: true,
    keyPlaceholder: "hf_...",
    keyUrl: "https://huggingface.co/settings/tokens",
    originPattern: "https://router.huggingface.co/*",
    maxUploadBytes: 18 * 1024 * 1024,
    protocol: "huggingface-stt",
    endpoint: "https://router.huggingface.co/hf-inference/models",
  }),

  openrouter: Object.freeze({
    id: "openrouter",
    name: "OpenRouter",
    badge: "Unified BYOK Router",
    freeTierSummary:
      "Unified OpenAI-compatible `/api/v1/audio/transcriptions` router across Voxtral & Whisper backends.",
    defaultModel: "mistralai/voxtral-mini-transcribe",
    models: ["mistralai/voxtral-mini-transcribe", "openai/whisper-1"],
    requiresKey: true,
    keyPlaceholder: "sk-or-v1-...",
    keyUrl: "https://openrouter.ai/keys",
    originPattern: "https://openrouter.ai/*",
    maxUploadBytes: 24 * 1024 * 1024,
    protocol: "openai-stt",
    endpoint: "https://openrouter.ai/api/v1/audio/transcriptions",
  }),

  openai: Object.freeze({
    id: "openai",
    name: "OpenAI Whisper",
    badge: "Standard Pay-As-You-Go",
    freeTierSummary:
      "Official OpenAI `whisper-1` endpoint ($0.006/min) with word & segment `verbose_json` timestamps.",
    defaultModel: "whisper-1",
    models: ["whisper-1"],
    requiresKey: true,
    keyPlaceholder: "sk-proj-...",
    keyUrl: "https://platform.openai.com/api-keys",
    originPattern: "https://api.openai.com/*",
    maxUploadBytes: 24 * 1024 * 1024,
    protocol: "openai-stt",
    endpoint: "https://api.openai.com/v1/audio/transcriptions",
  }),

  custom: Object.freeze({
    id: "custom",
    name: "Local / Custom Whisper URL",
    badge: "100% Free · Unlimited Local",
    freeTierSummary:
      "Point at local `speaches`, `faster-whisper-server`, `whisper.cpp`, or `LocalAI` (`http://localhost:8000/v1`) for unlimited offline transcription.",
    defaultModel: "Systran/faster-whisper-small",
    models: ["Systran/faster-whisper-small", "whisper-1"],
    requiresKey: false,
    keyPlaceholder: "Optional Bearer key (leave blank for local)",
    keyUrl: "https://github.com/speaches-ai/speaches",
    originPattern: null,
    maxUploadBytes: 50 * 1024 * 1024,
    protocol: "custom-openai-stt",
    endpoint: "http://localhost:8000/v1/audio/transcriptions",
  }),
});

export function getProviderSpec(providerId) {
  return PROVIDERS[providerId] || PROVIDERS.groq;
}

export function listProviderSpecs() {
  return DEFAULT_QUEUE_ORDER.map((id) => PROVIDERS[id]);
}

export function resolveCustomTranscriptionUrl(customBaseUrl) {
  const raw = String(customBaseUrl || "").trim() || PROVIDERS.custom.endpoint;
  const trimmed = raw.replace(/\/+$/, "");
  if (trimmed.endsWith("/audio/transcriptions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/audio/transcriptions`;
  return `${trimmed}/v1/audio/transcriptions`;
}

export function getProviderOriginPattern(providerId, customBaseUrl = "") {
  const spec = getProviderSpec(providerId);
  if (spec.id === "custom") {
    try {
      const u = new URL(resolveCustomTranscriptionUrl(customBaseUrl));
      return `${u.protocol}//${u.host}/*`;
    } catch {
      return null;
    }
  }
  return spec.originPattern;
}

/**
 * Redacts any API key or token substrings from error messages before logging or displaying.
 */
export function redactSecrets(message, secrets = []) {
  let out = String(message || "");
  for (const s of secrets) {
    if (typeof s !== "string") continue;
    const trimmed = s.trim();
    if (trimmed.length >= 6) {
      out = out.split(trimmed).join("[REDACTED]");
      if (trimmed.includes(":")) {
        for (const part of trimmed.split(":")) {
          if (part.length >= 6) {
            out = out.split(part).join("[REDACTED]");
          }
        }
      }
    }
  }
  return out;
}

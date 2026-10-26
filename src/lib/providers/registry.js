/**
 * Registry of all 12 supported BYOK Speech-to-Text & Multimodal Audio providers.
 * Ordered with the most generous permanent / no-card free tiers first, including
 * explicit step-by-step account creation and API key instructions for every provider.
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
    badge: "Best Free Tier, 8 hrs/day",
    freeTierSummary:
      "Permanent free plan, no card: 20 RPM, 2,000 req/day, 7,200 audio sec/hr (2h/hr), 28,800 sec/day (8h/day).",
    accountRequirements: "Free Google, GitHub, or email sign-in. No credit card needed.",
    keyFormatHint: "Starts with gsk_ (about 56 characters)",
    setupSteps: Object.freeze([
      "Open console.groq.com/keys in a new tab.",
      "Click Log in or Sign up and continue with your Google account, GitHub account, or email address.",
      "Once inside GroqCloud, click API Keys in the left navigation bar.",
      "Click the Create API Key button, type LM Subs as the display name, and click Submit.",
      "Click Copy beside the new gsk_... key right away (Groq shows it once), paste it into LM Subs, and click Save key then Test.",
    ]),
    defaultModel: "whisper-large-v3-turbo",
    models: ["whisper-large-v3-turbo", "whisper-large-v3"],
    requiresKey: true,
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    originPattern: "https://api.groq.com/*",
    maxUploadBytes: 24 * 1024 * 1024,
    protocol: "openai-stt",
    endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
  }),

  mistral: Object.freeze({
    id: "mistral",
    name: "Mistral (Voxtral)",
    badge: "Free Studio Tier, No Card",
    freeTierSummary:
      "Mistral Studio Experiment plan (free, no card). Voxtral Transcribe 3 returns accurate segment timestamps in 50+ languages.",
    accountRequirements: "Free Google, Microsoft, Apple, or email sign-in with phone verification on Experiment tier.",
    keyFormatHint: "32-character alphanumeric Mistral key",
    setupSteps: Object.freeze([
      "Open console.mistral.ai/api-keys in a new tab.",
      "Sign up or sign in using Google, Microsoft, Apple, or your email and password.",
      "If prompted to choose a workspace plan, select the free Experiment plan (no credit card required).",
      "Open API Keys in the left sidebar, click Create new key, name it LM Subs, and click Create new key.",
      "Copy the generated key string immediately, paste it into LM Subs, and click Save key then Test.",
    ]),
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
    badge: "Free Daily Tier + Translation",
    freeTierSummary:
      "Google AI Studio free tier, no card. Multimodal audio-to-SRT with optional single-pass subtitle translation.",
    accountRequirements: "Uses the same Google account you already use for Google NotebookLM. No billing setup needed for free tier.",
    keyFormatHint: "Starts with AIzaSy (39 characters)",
    setupSteps: Object.freeze([
      "Open aistudio.google.com/apikey while signed into your Google account.",
      "Accept the Google AI Studio terms prompt if this is your first visit.",
      "Click the blue Create API key button near the top-right corner.",
      "Select Create API key in new project (or pick an existing Google Cloud project).",
      "Click Copy on the AIzaSy... key, paste it into LM Subs, and click Save key then Test.",
    ]),
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    requiresKey: true,
    keyPlaceholder: "AIzaSy...",
    keyUrl: "https://aistudio.google.com/apikey",
    originPattern: "https://generativelanguage.googleapis.com/*",
    maxUploadBytes: 18 * 1024 * 1024,
    protocol: "gemini-stt",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  }),

  deepgram: Object.freeze({
    id: "deepgram",
    name: "Deepgram",
    badge: "$200 Free Credit, ~700 hrs",
    freeTierSummary:
      "$200 signup credit with no credit card (~700+ hours of Nova-3 batch audio with word-level timestamps).",
    accountRequirements: "Free Google, GitHub, or email sign-up. Includes $200 promotional credit without entering a card.",
    keyFormatHint: "40-character hexadecimal secret key",
    setupSteps: Object.freeze([
      "Open console.deepgram.com in a new tab.",
      "Click Sign Up (or Log In) with Google, GitHub, or email to claim the free $200 credit.",
      "In the left sidebar of your Default Project, click API Keys.",
      "Click Create a New API Key, enter LM Subs as the friendly name, leave Member permissions selected, and click Create Key.",
      "Copy the secret key before closing the modal, paste it into LM Subs, and click Save key then Test.",
    ]),
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
    badge: "$50 Free Credit, ~330 hrs",
    freeTierSummary:
      "$50 free signup credit with no card (~330 hours on Universal-2 with word-level timestamps).",
    accountRequirements: "Free Google, GitHub, or email sign-up with $50 starter credit.",
    keyFormatHint: "32-character lowercase hexadecimal API key",
    setupSteps: Object.freeze([
      "Open assemblyai.com/app/account in a new tab.",
      "Create a free account or sign in using Google, GitHub, or email.",
      "After signing in, open the API Keys section on your dashboard home or Account page.",
      "Click Copy next to your Default API key (or click Create new API key and name it LM Subs).",
      "Paste the key into LM Subs and click Save key then Test.",
    ]),
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
    badge: "Free Monthly Hours, Solaria-1",
    freeTierSummary:
      "Free monthly transcription hours on Solaria-1 pre-recorded speech-to-text with native SRT/VTT generation.",
    accountRequirements: "Free Google, GitHub, or email sign-up.",
    keyFormatHint: "UUID-formatted Gladia API key (xxxxxxxx-xxxx-...)",
    setupSteps: Object.freeze([
      "Open app.gladia.io in a new tab.",
      "Sign up or log in with Google, GitHub, or your email address.",
      "Click API keys in the left dashboard menu (or copy the default key shown on the home card).",
      "Click Generate new key if needed, label it LM Subs, and copy the UUID token.",
      "Paste the token into LM Subs and click Save key then Test.",
    ]),
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
    accountRequirements: "Free Cloudflare account (email, Google, or Apple). Uses combined ACCOUNT_ID:API_TOKEN format.",
    keyFormatHint: "Combined format: your_account_id:your_api_token",
    setupSteps: Object.freeze([
      "Open dash.cloudflare.com and sign in or create a free Cloudflare account.",
      "In the left sidebar, expand AI and click Workers AI, then click Use REST API.",
      "Click Create a Workers AI API Token, confirm permissions (Workers AI Read/Edit), and copy the generated API Token.",
      "On that same REST API page, copy your 32-character Account ID.",
      "Combine both values with a colon in between as account_id:api_token, paste into LM Subs, and click Save key then Test.",
    ]),
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
    accountRequirements: "Free ElevenLabs account via Google, Apple, GitHub, or email.",
    keyFormatHint: "Starts with sk_...",
    setupSteps: Object.freeze([
      "Open elevenlabs.io/app/settings/api-keys in a new tab.",
      "Sign in or register for a free ElevenLabs account.",
      "Click Create API Key in the API Keys panel and name it LM Subs.",
      "Ensure the Speech-to-Text endpoint permission is enabled (or leave unrestricted), then click Create.",
      "Copy the sk_... key, paste it into LM Subs, and click Save key then Test.",
    ]),
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
      "Free monthly Serverless Inference credits using any hf_... inference token.",
    accountRequirements: "Free Hugging Face account with verified email address.",
    keyFormatHint: "Starts with hf_...",
    setupSteps: Object.freeze([
      "Open huggingface.co/settings/tokens in a new tab and sign in (or click Sign Up to register and verify your email).",
      "Click the Create new token button.",
      "Choose Fine-grained (and check Make calls to Inference Providers) or Read, and name the token LM Subs.",
      "Click Create token at the bottom of the form.",
      "Copy the hf_... token immediately, paste it into LM Subs, and click Save key then Test.",
    ]),
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
      "Unified OpenAI-compatible /api/v1/audio/transcriptions router across Voxtral and Whisper backends.",
    accountRequirements: "OpenRouter account (Google, GitHub, MetaMask, or email); audio models use pay-as-you-go credits.",
    keyFormatHint: "Starts with sk-or-v1-...",
    setupSteps: Object.freeze([
      "Open openrouter.ai/keys in a new tab and sign in with Google, GitHub, or email.",
      "If your credit balance is $0, add a small prepaid balance under Credits for audio transcription endpoints.",
      "Click Create Key, enter LM Subs as the name, optionally set a spending limit, and click Create.",
      "Copy the sk-or-v1-... secret string right away.",
      "Paste the key into LM Subs and click Save key then Test.",
    ]),
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
      "Official OpenAI whisper-1 endpoint ($0.006/min) with word and segment verbose_json timestamps.",
    accountRequirements: "OpenAI Platform developer account (separate billing from ChatGPT Plus, minimum $5 prepaid credit).",
    keyFormatHint: "Starts with sk-proj-... or sk-...",
    setupSteps: Object.freeze([
      "Open platform.openai.com/api-keys and log in with your OpenAI developer account.",
      "Note that ChatGPT Plus subscriptions do not include API credits; ensure Billing has an active balance.",
      "Click Create new secret key in the top-right corner, name it LM Subs, and keep All permissions (or Audio enabled).",
      "Click Create secret key and copy the sk-proj-... token.",
      "Paste the key into LM Subs and click Save key then Test.",
    ]),
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
    badge: "100% Free, Unlimited Local",
    freeTierSummary:
      "Point at local speaches, faster-whisper-server, whisper.cpp, or LocalAI (http://localhost:8000/v1) for unlimited offline transcription.",
    accountRequirements: "Zero account, zero sign-up, and zero API key required. Runs 100% offline on your own CPU or GPU.",
    keyFormatHint: "Base URL http://localhost:8000/v1 (API key optional / blank)",
    setupSteps: Object.freeze([
      "Install Docker or Python and start an OpenAI-compatible local Whisper server such as speaches (docker run -p 8000:8000 ghcr.io/speaches-ai/speaches:latest-cpu).",
      "Verify http://localhost:8000/v1 is reachable on your machine.",
      "In LM Subs, enter http://localhost:8000/v1 as the OpenAI-compatible base URL.",
      "Leave the API key field blank unless your local server requires a custom Bearer token.",
      "Enable Local / Custom Whisper and click Save URL / Enable so audio stays completely on your machine.",
    ]),
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

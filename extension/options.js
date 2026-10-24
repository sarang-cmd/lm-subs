(() => {
  // src/config/selectors.js
  var NOTEBOOKLM_HOSTS = Object.freeze([
    "notebooklm.google.com",
    "notebook.google.com",
    "notebook.cloud.google.com"
  ]);
  var TRUSTED_GOOGLE_MEDIA_DOMAINS = Object.freeze([
    ".googleusercontent.com",
    ".usercontent.google.com",
    ".googlevideo.com",
    ".google.com"
  ]);
  var BATCHEXECUTE = Object.freeze({
    PATH_SUBSTRINGS: Object.freeze([
      "/_/LabsTailwindUi/data/batchexecute",
      "/_/CloudNotebookLmUi/data/batchexecute"
    ]),
    XSSI_PREFIX: ")]}'",
    ENVELOPE_TAG: "wrb.fr",
    RPC_IDS: Object.freeze({
      CREATE_STUDIO: "R7cb6c",
      POLL_STUDIO: "gArtLc"
    }),
    /** Studio artifact type codes at `row[2]` and `createParams[2][2]`. */
    ARTIFACT_TYPES: Object.freeze({
      AUDIO_OVERVIEW: 1,
      REPORT: 2,
      VIDEO_OVERVIEW: 3,
      APP: 4,
      MIND_MAP: 5,
      INFOGRAPHIC: 7,
      SLIDE_DECK: 8,
      DATA_TABLE: 9
    }),
    /** Studio artifact lifecycle status codes at `row[4]`. */
    ARTIFACT_STATUS: Object.freeze({
      UNKNOWN: 0,
      INITIALIZED: 1,
      PROCESSING: 2,
      READY: 3,
      FAILED: 4,
      SUGGESTED: 5
    }),
    /** Positional indices inside a Studio `LIST_ARTIFACTS` (`gArtLc`) row. */
    ROW_POS: Object.freeze({
      ID: 0,
      TITLE: 1,
      TYPE: 2,
      SOURCES: 3,
      STATUS: 4,
      VIDEO_METADATA: 8
    }),
    /** Positional indices inside `row[8]` (`explainerVideo` metadata block). */
    VIDEO_META_POS: Object.freeze({
      PROGRESSIVE_URL: 1,
      GENERATION_OPTIONS: 2,
      DOWNLOAD_URL: 3,
      MEDIA_LIST: 4,
      DURATION: 5
    }),
    /** Media streaming type codes inside `row[8][4][i][1]`. */
    MEDIA_KIND: Object.freeze({
      PROGRESSIVE: 1,
      HLS: 2,
      DASH: 3,
      DOWNLOAD: 4
    })
  });
  var DOM_SELECTORS = Object.freeze({
    VIDEO_ELEMENT: "video",
    STUDIO_LIBRARY: "artifact-library",
    STUDIO_ITEM: "artifact-library-item",
    STUDIO_ITEM_TITLE: ".artifact-title",
    STUDIO_ITEM_DETAILS: ".artifact-details",
    STUDIO_ITEM_ICON: "mat-icon.artifact-icon",
    VIDEO_ICON_LIGATURES: Object.freeze([
      "subscriptions",
      "videocam",
      "movie",
      "play_circle"
    ]),
    GENERATE_VIDEO_BUTTONS: Object.freeze([
      'button[aria-label*="Video Overview" i]',
      'button[aria-label*="Generate video" i]',
      'button[aria-label*="Create video" i]',
      'button.primary-action-button[aria-label*="video" i]'
    ]),
    OVERLAY_HOST_ID: "nlm-subtitles-player-root",
    OVERLAY_HOST_CLASS: "nlm-subtitles-player-overlay",
    TOAST_HOST_ID: "nlm-subtitles-toast-root",
    TRACK_LABEL: "NotebookLM Auto-Subtitles"
  });
  var PAGE_MESSAGE = Object.freeze({
    BRIDGE_SOURCE_PAGE: "notebooklm-subtitles-page",
    BRIDGE_SOURCE_CONTENT: "notebooklm-subtitles-content",
    BATCH_ARTIFACTS: "NOTEBOOKLM_BATCH_ARTIFACTS",
    SYNC_RPC_OVERRIDES: "NOTEBOOKLM_SYNC_RPC_OVERRIDES"
  });
  var RUNTIME_MESSAGE = Object.freeze({
    ENSURE_SUBTITLES: "NOTEBOOKLM_SUBTITLES_ENSURE",
    GET_CACHED_SUBTITLES: "NOTEBOOKLM_SUBTITLES_GET_CACHED",
    SAVE_IMPORTED_SUBTITLES: "NOTEBOOKLM_SUBTITLES_SAVE_IMPORTED",
    TEST_PROVIDER: "NOTEBOOKLM_SUBTITLES_TEST_PROVIDER",
    SUBTITLES_PROGRESS: "NOTEBOOKLM_SUBTITLES_PROGRESS",
    SUBTITLES_READY: "NOTEBOOKLM_SUBTITLES_READY",
    GET_ACTIVE_TAB_STATE: "NOTEBOOKLM_SUBTITLES_GET_ACTIVE_TAB_STATE",
    TRIGGER_ACTIVE_VIDEO: "NOTEBOOKLM_SUBTITLES_TRIGGER_ACTIVE_VIDEO"
  });

  // src/lib/providers/registry.js
  var DEFAULT_QUEUE_ORDER = Object.freeze([
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
    "custom"
  ]);
  var PROVIDERS = Object.freeze({
    groq: Object.freeze({
      id: "groq",
      name: "Groq",
      badge: "Best Free Tier \xB7 8 hrs/day",
      freeTierSummary: "Permanent free plan, no card: 20 RPM, 2,000 req/day, 7,200 audio sec/hr (2h/hr), 28,800 sec/day (8h/day).",
      defaultModel: "whisper-large-v3-turbo",
      models: ["whisper-large-v3-turbo", "whisper-large-v3"],
      requiresKey: true,
      keyPlaceholder: "gsk_...",
      keyUrl: "https://console.groq.com/keys",
      originPattern: "https://api.groq.com/*",
      maxUploadBytes: 24 * 1024 * 1024,
      // 25 MB hard cap -> 24 MB safety margin
      protocol: "openai-stt",
      endpoint: "https://api.groq.com/openai/v1/audio/transcriptions"
    }),
    mistral: Object.freeze({
      id: "mistral",
      name: "Mistral (Voxtral)",
      badge: "Free Studio Tier \xB7 No Card",
      freeTierSummary: "Mistral Studio Experiment plan (free, no card). Voxtral Transcribe 3 returns accurate segment timestamps in 50+ languages.",
      defaultModel: "voxtral-mini-transcribe-3",
      models: [
        "voxtral-mini-transcribe-3",
        "voxtral-small-transcribe-3",
        "voxtral-mini-latest"
      ],
      requiresKey: true,
      keyPlaceholder: "Mistral API key...",
      keyUrl: "https://console.mistral.ai/api-keys",
      originPattern: "https://api.mistral.ai/*",
      maxUploadBytes: 48 * 1024 * 1024,
      protocol: "mistral-stt",
      endpoint: "https://api.mistral.ai/v1/audio/transcriptions"
    }),
    gemini: Object.freeze({
      id: "gemini",
      name: "Google Gemini (AI Studio)",
      badge: "Free Daily Tier \xB7 + Translation",
      freeTierSummary: "Google AI Studio free tier, no card. Multimodal audio-to-SRT with optional single-pass subtitle translation.",
      defaultModel: "gemini-2.5-flash",
      models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
      requiresKey: true,
      keyPlaceholder: "AIzaSy...",
      keyUrl: "https://aistudio.google.com/apikey",
      originPattern: "https://generativelanguage.googleapis.com/*",
      maxUploadBytes: 18 * 1024 * 1024,
      // Inline base64 stays comfortably under 20 MB request cap
      protocol: "gemini-stt",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models"
    }),
    deepgram: Object.freeze({
      id: "deepgram",
      name: "Deepgram",
      badge: "$200 Free Credit \xB7 ~700 hrs",
      freeTierSummary: "$200 signup credit with no credit card (~700+ hours of Nova-3 batch audio with word-level timestamps).",
      defaultModel: "nova-3",
      models: ["nova-3", "nova-2"],
      requiresKey: true,
      keyPlaceholder: "Deepgram API key...",
      keyUrl: "https://console.deepgram.com/",
      originPattern: "https://api.deepgram.com/*",
      maxUploadBytes: 50 * 1024 * 1024,
      protocol: "deepgram-stt",
      endpoint: "https://api.deepgram.com/v1/listen"
    }),
    assemblyai: Object.freeze({
      id: "assemblyai",
      name: "AssemblyAI",
      badge: "$50 Free Credit \xB7 ~330 hrs",
      freeTierSummary: "$50 free signup credit with no card (~330 hours on Universal-2 with word-level timestamps).",
      defaultModel: "universal",
      models: ["universal", "nano"],
      requiresKey: true,
      keyPlaceholder: "AssemblyAI API key...",
      keyUrl: "https://www.assemblyai.com/app/account",
      originPattern: "https://api.assemblyai.com/*",
      maxUploadBytes: 50 * 1024 * 1024,
      protocol: "assemblyai-stt",
      endpoint: "https://api.assemblyai.com/v2"
    }),
    gladia: Object.freeze({
      id: "gladia",
      name: "Gladia",
      badge: "\u20AC50 Free Credit \xB7 ~80 hrs",
      freeTierSummary: "\u20AC50 free credit (~80+ hours of Solaria-1 pre-recorded transcription with native SRT/VTT generation).",
      defaultModel: "solaria-1",
      models: ["solaria-1"],
      requiresKey: true,
      keyPlaceholder: "Gladia API key...",
      keyUrl: "https://app.gladia.io/",
      originPattern: "https://api.gladia.io/*",
      maxUploadBytes: 50 * 1024 * 1024,
      protocol: "gladia-stt",
      endpoint: "https://api.gladia.io/v2"
    }),
    cloudflare: Object.freeze({
      id: "cloudflare",
      name: "Cloudflare Workers AI",
      badge: "Free 10k Neurons/day",
      freeTierSummary: "10,000 free Neurons every day. Enter credentials as ACCOUNT_ID:API_TOKEN.",
      defaultModel: "@cf/openai/whisper-large-v3-turbo",
      models: ["@cf/openai/whisper-large-v3-turbo", "@cf/openai/whisper"],
      requiresKey: true,
      keyPlaceholder: "account_id:api_token",
      keyUrl: "https://dash.cloudflare.com/",
      originPattern: "https://api.cloudflare.com/*",
      maxUploadBytes: 18 * 1024 * 1024,
      protocol: "cloudflare-stt",
      endpoint: "https://api.cloudflare.com/client/v4/accounts"
    }),
    elevenlabs: Object.freeze({
      id: "elevenlabs",
      name: "ElevenLabs (Scribe v2)",
      badge: "10k Free Credits/mo",
      freeTierSummary: "10,000 monthly free credits (~30 min/month on Scribe v2) with word-level timestamps in 90+ languages.",
      defaultModel: "scribe_v2",
      models: ["scribe_v2"],
      requiresKey: true,
      keyPlaceholder: "sk_...",
      keyUrl: "https://elevenlabs.io/app/settings/api-keys",
      originPattern: "https://api.elevenlabs.io/*",
      maxUploadBytes: 50 * 1024 * 1024,
      protocol: "elevenlabs-stt",
      endpoint: "https://api.elevenlabs.io/v1/speech-to-text"
    }),
    huggingface: Object.freeze({
      id: "huggingface",
      name: "Hugging Face Inference",
      badge: "Free HF Token Quota",
      freeTierSummary: "Free monthly Serverless Inference credits using any `hf_...` read/inference token.",
      defaultModel: "openai/whisper-large-v3-turbo",
      models: ["openai/whisper-large-v3-turbo", "openai/whisper-large-v3"],
      requiresKey: true,
      keyPlaceholder: "hf_...",
      keyUrl: "https://huggingface.co/settings/tokens",
      originPattern: "https://router.huggingface.co/*",
      maxUploadBytes: 18 * 1024 * 1024,
      protocol: "huggingface-stt",
      endpoint: "https://router.huggingface.co/hf-inference/models"
    }),
    openrouter: Object.freeze({
      id: "openrouter",
      name: "OpenRouter",
      badge: "Unified BYOK Router",
      freeTierSummary: "Unified OpenAI-compatible `/api/v1/audio/transcriptions` router across Voxtral & Whisper backends.",
      defaultModel: "mistralai/voxtral-mini-transcribe",
      models: ["mistralai/voxtral-mini-transcribe", "openai/whisper-1"],
      requiresKey: true,
      keyPlaceholder: "sk-or-v1-...",
      keyUrl: "https://openrouter.ai/keys",
      originPattern: "https://openrouter.ai/*",
      maxUploadBytes: 24 * 1024 * 1024,
      protocol: "openai-stt",
      endpoint: "https://openrouter.ai/api/v1/audio/transcriptions"
    }),
    openai: Object.freeze({
      id: "openai",
      name: "OpenAI Whisper",
      badge: "Standard Pay-As-You-Go",
      freeTierSummary: "Official OpenAI `whisper-1` endpoint ($0.006/min) with word & segment `verbose_json` timestamps.",
      defaultModel: "whisper-1",
      models: ["whisper-1"],
      requiresKey: true,
      keyPlaceholder: "sk-proj-...",
      keyUrl: "https://platform.openai.com/api-keys",
      originPattern: "https://api.openai.com/*",
      maxUploadBytes: 24 * 1024 * 1024,
      protocol: "openai-stt",
      endpoint: "https://api.openai.com/v1/audio/transcriptions"
    }),
    custom: Object.freeze({
      id: "custom",
      name: "Local / Custom Whisper URL",
      badge: "100% Free \xB7 Unlimited Local",
      freeTierSummary: "Point at local `speaches`, `faster-whisper-server`, `whisper.cpp`, or `LocalAI` (`http://localhost:8000/v1`) for unlimited offline transcription.",
      defaultModel: "Systran/faster-whisper-small",
      models: ["Systran/faster-whisper-small", "whisper-1"],
      requiresKey: false,
      keyPlaceholder: "Optional Bearer key (leave blank for local)",
      keyUrl: "https://github.com/speaches-ai/speaches",
      originPattern: null,
      maxUploadBytes: 50 * 1024 * 1024,
      protocol: "custom-openai-stt",
      endpoint: "http://localhost:8000/v1/audio/transcriptions"
    })
  });
  function getProviderSpec(providerId) {
    return PROVIDERS[providerId] || PROVIDERS.groq;
  }
  function resolveCustomTranscriptionUrl(customBaseUrl) {
    const raw = String(customBaseUrl || "").trim() || PROVIDERS.custom.endpoint;
    const trimmed = raw.replace(/\/+$/, "");
    if (trimmed.endsWith("/audio/transcriptions")) return trimmed;
    if (trimmed.endsWith("/v1")) return `${trimmed}/audio/transcriptions`;
    return `${trimmed}/v1/audio/transcriptions`;
  }
  function getProviderOriginPattern(providerId, customBaseUrl = "") {
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

  // src/lib/storage.js
  var STORAGE_KEYS = Object.freeze({
    SETTINGS: "settings",
    API_KEYS: "apiKeys",
    SUBTITLE_CACHE: "subtitleCache",
    HISTORY: "subtitleHistory",
    LAST_STATUS: "lastStatus"
  });
  var DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    autoOnGenerate: true,
    autoOnExistingVideos: true,
    primaryProvider: "groq",
    queueOrder: [...DEFAULT_QUEUE_ORDER],
    providerModels: {},
    customBaseUrl: "",
    customEnabled: false,
    languageHint: "auto",
    translateTo: "original",
    fontSize: "medium",
    // "small" | "medium" | "large" | "xlarge"
    subtitleOffsetSec: 0,
    showToast: true,
    excludePatterns: [],
    rpcOverrides: {}
  });
  function resolveStorage(storageArea) {
    const area = storageArea || globalThis.chrome?.storage?.local;
    if (!area) {
      throw new Error("chrome.storage.local is unavailable in this context");
    }
    return area;
  }
  function normalizeQueueOrder(rawOrder) {
    const out = [];
    if (Array.isArray(rawOrder)) {
      for (const id of rawOrder) {
        if (typeof id === "string" && DEFAULT_QUEUE_ORDER.includes(id) && !out.includes(id)) {
          out.push(id);
        }
      }
    }
    for (const id of DEFAULT_QUEUE_ORDER) {
      if (!out.includes(id)) out.push(id);
    }
    return out;
  }
  async function getSettings(storageArea) {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.SETTINGS);
    const saved = raw?.[STORAGE_KEYS.SETTINGS];
    if (!saved || typeof saved !== "object") {
      return {
        ...DEFAULT_SETTINGS,
        queueOrder: [...DEFAULT_QUEUE_ORDER],
        providerModels: {},
        excludePatterns: [],
        rpcOverrides: {}
      };
    }
    const queueOrder = normalizeQueueOrder(saved.queueOrder);
    const primaryProvider = typeof saved.primaryProvider === "string" && DEFAULT_QUEUE_ORDER.includes(saved.primaryProvider) ? saved.primaryProvider : queueOrder[0] || "groq";
    const providerModels = {};
    if (saved.providerModels && typeof saved.providerModels === "object") {
      for (const [k, v] of Object.entries(saved.providerModels)) {
        if (typeof v === "string" && v.trim()) {
          providerModels[k] = v.trim();
        }
      }
    }
    const rpcOverrides = {};
    if (saved.rpcOverrides && typeof saved.rpcOverrides === "object") {
      for (const [k, v] of Object.entries(saved.rpcOverrides)) {
        if (typeof v === "string" && v.trim()) {
          rpcOverrides[k] = v.trim();
        }
      }
    }
    return {
      enabled: typeof saved.enabled === "boolean" ? saved.enabled : DEFAULT_SETTINGS.enabled,
      autoOnGenerate: typeof saved.autoOnGenerate === "boolean" ? saved.autoOnGenerate : DEFAULT_SETTINGS.autoOnGenerate,
      autoOnExistingVideos: typeof saved.autoOnExistingVideos === "boolean" ? saved.autoOnExistingVideos : DEFAULT_SETTINGS.autoOnExistingVideos,
      primaryProvider,
      queueOrder,
      providerModels,
      customBaseUrl: typeof saved.customBaseUrl === "string" ? saved.customBaseUrl.trim() : "",
      customEnabled: Boolean(saved.customEnabled),
      languageHint: typeof saved.languageHint === "string" && saved.languageHint ? saved.languageHint : "auto",
      translateTo: typeof saved.translateTo === "string" && saved.translateTo ? saved.translateTo : "original",
      fontSize: ["small", "medium", "large", "xlarge"].includes(saved.fontSize) ? saved.fontSize : "medium",
      subtitleOffsetSec: Number.isFinite(Number(saved.subtitleOffsetSec)) ? Math.max(-10, Math.min(10, Number(saved.subtitleOffsetSec))) : 0,
      showToast: typeof saved.showToast === "boolean" ? saved.showToast : DEFAULT_SETTINGS.showToast,
      excludePatterns: Array.isArray(saved.excludePatterns) ? saved.excludePatterns.map((s) => String(s).trim()).filter(Boolean) : [],
      rpcOverrides
    };
  }
  async function saveSettings(partial, storageArea) {
    const store = resolveStorage(storageArea);
    const current = await getSettings(store);
    const next = {
      ...current,
      ...partial
    };
    if (partial?.queueOrder) {
      next.queueOrder = normalizeQueueOrder(partial.queueOrder);
    }
    if (partial?.primaryProvider && DEFAULT_QUEUE_ORDER.includes(partial.primaryProvider)) {
      next.primaryProvider = partial.primaryProvider;
      if (!partial.queueOrder) {
        next.queueOrder = normalizeQueueOrder([
          partial.primaryProvider,
          ...next.queueOrder
        ]);
      }
    } else if (next.queueOrder.length > 0) {
      next.primaryProvider = next.queueOrder[0];
    }
    if (Array.isArray(partial?.excludePatterns)) {
      next.excludePatterns = partial.excludePatterns.map((s) => String(s).trim()).filter(Boolean);
    }
    await store.set({ [STORAGE_KEYS.SETTINGS]: next });
    return next;
  }
  function getModelForProvider(settings, providerId) {
    const saved = settings?.providerModels?.[providerId];
    if (typeof saved === "string" && saved.trim()) return saved.trim();
    return getProviderSpec(providerId).defaultModel;
  }
  async function getSavedKeyPresenceMap(storageArea) {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.API_KEYS);
    const map = raw?.[STORAGE_KEYS.API_KEYS] || {};
    const presence = {};
    for (const id of DEFAULT_QUEUE_ORDER) {
      presence[id] = typeof map[id] === "string" && map[id].trim().length > 0;
    }
    return presence;
  }
  async function setApiKey(providerId, apiKey, storageArea) {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.API_KEYS);
    const current = raw?.[STORAGE_KEYS.API_KEYS] && typeof raw[STORAGE_KEYS.API_KEYS] === "object" ? { ...raw[STORAGE_KEYS.API_KEYS] } : {};
    const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
    if (trimmed) {
      current[providerId] = trimmed;
    } else {
      delete current[providerId];
    }
    await store.set({ [STORAGE_KEYS.API_KEYS]: current });
  }
  async function clearApiKey(providerId, storageArea) {
    return setApiKey(providerId, "", storageArea);
  }
  async function getSubtitleCacheList(storageArea) {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.SUBTITLE_CACHE);
    const list = raw?.[STORAGE_KEYS.SUBTITLE_CACHE];
    return Array.isArray(list) ? list : [];
  }
  async function deleteCachedSubtitles(cacheKey, storageArea) {
    const store = resolveStorage(storageArea);
    const [list, history] = await Promise.all([
      getSubtitleCacheList(store),
      getHistory(store)
    ]);
    await store.set({
      [STORAGE_KEYS.SUBTITLE_CACHE]: list.filter((it) => it.cacheKey !== cacheKey),
      [STORAGE_KEYS.HISTORY]: history.filter((h) => h.cacheKey !== cacheKey)
    });
  }
  async function clearAllCachedSubtitles(storageArea) {
    const store = resolveStorage(storageArea);
    await store.set({
      [STORAGE_KEYS.SUBTITLE_CACHE]: [],
      [STORAGE_KEYS.HISTORY]: []
    });
  }
  async function getHistory(storageArea) {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.HISTORY);
    const list = raw?.[STORAGE_KEYS.HISTORY];
    return Array.isArray(list) ? list : [];
  }

  // src/lib/subtitles.js
  var DEFAULT_MAX_LINE_CHARS = 42;
  var DEFAULT_MIN_DURATION_SEC = 0.85;
  function formatTimestamp(seconds, separator = ",") {
    const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const totalMs = Math.round(clamped * 1e3);
    const ms = totalMs % 1e3;
    const totalSecs = Math.floor(totalMs / 1e3);
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
  function wrapSubtitleLines(text, maxLineChars = DEFAULT_MAX_LINE_CHARS) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return "";
    if (clean.length <= maxLineChars) return clean;
    const words = clean.split(" ");
    if (words.length <= 1) return clean;
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
    return `${line1}
${line2}`;
  }
  function normalizeAndSortCues(rawCues, offsetSec = 0) {
    if (!Array.isArray(rawCues) || rawCues.length === 0) return [];
    const cleaned = [];
    for (const item of rawCues) {
      if (!item || typeof item !== "object") continue;
      const startRaw = Number(item.startSec ?? item.start);
      const endRaw = Number(item.endSec ?? item.end);
      if (!Number.isFinite(startRaw)) continue;
      let text = String(item.text || "").replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean).join("\n").trim();
      if (!text) continue;
      const speaker = typeof item.speaker === "string" && item.speaker.trim() ? item.speaker.trim() : null;
      const startSec = Math.max(0, Math.round((startRaw + offsetSec) * 1e3) / 1e3);
      const fallbackEnd = startSec + Math.max(DEFAULT_MIN_DURATION_SEC, text.length * 0.055);
      const computedEnd = Number.isFinite(endRaw) ? Math.max(startSec + 0.25, endRaw + offsetSec) : fallbackEnd;
      const endSec = Math.round(computedEnd * 1e3) / 1e3;
      if (!text.includes("\n") && text.length > DEFAULT_MAX_LINE_CHARS) {
        text = wrapSubtitleLines(text, DEFAULT_MAX_LINE_CHARS);
      }
      cleaned.push({ startSec, endSec, text, ...speaker ? { speaker } : {} });
    }
    cleaned.sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec);
    const out = [];
    for (let i = 0; i < cleaned.length; i++) {
      const curr = { ...cleaned[i] };
      const prev = out[out.length - 1];
      if (prev && prev.text === curr.text && Math.abs(curr.startSec - prev.endSec) < 0.15) {
        prev.endSec = Math.max(prev.endSec, curr.endSec);
        continue;
      }
      if (prev && prev.endSec > curr.startSec) {
        if (curr.startSec - prev.startSec >= 0.25) {
          prev.endSec = curr.startSec;
        } else {
          curr.startSec = prev.endSec;
          if (curr.endSec <= curr.startSec + 0.2) {
            curr.endSec = Math.round((curr.startSec + 0.6) * 1e3) / 1e3;
          }
        }
      }
      out.push(curr);
    }
    return out.map((cue, idx) => ({
      index: idx + 1,
      ...cue
    }));
  }
  function formatSrt(cues) {
    const normalized = normalizeAndSortCues(cues);
    if (normalized.length === 0) return "";
    return normalized.map((cue, idx) => {
      const prefix = cue.speaker ? `[${cue.speaker}] ` : "";
      const body = prefix ? wrapSubtitleLines(`${prefix}${cue.text.replace(/\n/g, " ")}`) : cue.text;
      return `${idx + 1}
${formatTimestamp(cue.startSec, ",")} --> ${formatTimestamp(
        cue.endSec,
        ","
      )}
${body}`;
    }).join("\n\n") + "\n";
  }
  function formatVtt(cues) {
    const normalized = normalizeAndSortCues(cues);
    if (normalized.length === 0) return "WEBVTT\n\n";
    const blocks = normalized.map((cue, idx) => {
      const prefix = cue.speaker ? `[${cue.speaker}] ` : "";
      const body = prefix ? wrapSubtitleLines(`${prefix}${cue.text.replace(/\n/g, " ")}`) : cue.text;
      return `${idx + 1}
${formatTimestamp(cue.startSec, ".")} --> ${formatTimestamp(
        cue.endSec,
        "."
      )}
${body}`;
    });
    return `WEBVTT

${blocks.join("\n\n")}
`;
  }

  // src/ui/brand-icon.js
  var SVG_NS = "http://www.w3.org/2000/svg";
  function createBrandMarkSvg(doc = globalThis.document, size = 28) {
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    const bg = doc.createElementNS(SVG_NS, "rect");
    bg.setAttribute("width", "32");
    bg.setAttribute("height", "32");
    bg.setAttribute("rx", "7");
    bg.setAttribute("fill", "#14171A");
    const border = doc.createElementNS(SVG_NS, "rect");
    border.setAttribute("x", "0.5");
    border.setAttribute("y", "0.5");
    border.setAttribute("width", "31");
    border.setAttribute("height", "31");
    border.setAttribute("rx", "6.5");
    border.setAttribute("stroke", "#2C323B");
    const play = doc.createElementNS(SVG_NS, "path");
    play.setAttribute("d", "M13 8.5L20.5 13L13 17.5V8.5Z");
    play.setAttribute("fill", "#F4F4F0");
    const bar1 = doc.createElementNS(SVG_NS, "rect");
    bar1.setAttribute("x", "6");
    bar1.setAttribute("y", "21");
    bar1.setAttribute("width", "12");
    bar1.setAttribute("height", "2.5");
    bar1.setAttribute("rx", "1.25");
    bar1.setAttribute("fill", "#22C55E");
    const bar2 = doc.createElementNS(SVG_NS, "rect");
    bar2.setAttribute("x", "20");
    bar2.setAttribute("y", "21");
    bar2.setAttribute("width", "6");
    bar2.setAttribute("height", "2.5");
    bar2.setAttribute("rx", "1.25");
    bar2.setAttribute("fill", "#F4F4F0");
    const bar3 = doc.createElementNS(SVG_NS, "rect");
    bar3.setAttribute("x", "8.5");
    bar3.setAttribute("y", "25");
    bar3.setAttribute("width", "15");
    bar3.setAttribute("height", "2.2");
    bar3.setAttribute("rx", "1.1");
    bar3.setAttribute("fill", "#9CA3AF");
    svg.append(bg, border, play, bar1, bar2, bar3);
    return svg;
  }

  // src/options/options.js
  function sendRuntime(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(res || null);
      });
    });
  }
  async function requestProviderOrigin(providerId, customBaseUrl = "") {
    const origin = getProviderOriginPattern(providerId, customBaseUrl);
    if (!origin || !chrome.permissions?.request) return true;
    try {
      return await chrome.permissions.request({ origins: [origin] });
    } catch {
      return true;
    }
  }
  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2e3);
  }
  function slugify(title) {
    return String(title || "video-overview").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "video-overview";
  }
  async function initOptions() {
    document.getElementById("brand-icon-slot")?.appendChild(createBrandMarkSvg(document, 32));
    const optEnabled = document.getElementById("opt-enabled");
    const queueContainer = document.getElementById("provider-queue-list");
    const optAutoGenerate = document.getElementById("opt-auto-generate");
    const optAutoExisting = document.getElementById("opt-auto-existing");
    const optShowToast = document.getElementById("opt-show-toast");
    const optLanguageHint = document.getElementById("opt-language-hint");
    const optTranslateTo = document.getElementById("opt-translate-to");
    const optFontSize = document.getElementById("opt-font-size");
    const optOffsetSec = document.getElementById("opt-offset-sec");
    const optExcludePatterns = document.getElementById("opt-exclude-patterns");
    const saveBehaviorBtn = document.getElementById("save-behavior-btn");
    const savedPill = document.getElementById("settings-saved-pill");
    const cacheEmpty = document.getElementById("cache-empty");
    const cacheTableWrap = document.getElementById("cache-table-wrap");
    const cacheTbody = document.getElementById("cache-tbody");
    const clearCacheBtn = document.getElementById("clear-cache-btn");
    const rpcCreateInput = document.getElementById("rpc-create-input");
    const rpcPollInput = document.getElementById("rpc-poll-input");
    const saveRpcBtn = document.getElementById("save-rpc-btn");
    let [settings, presenceMap, cacheList] = await Promise.all([
      getSettings(),
      getSavedKeyPresenceMap(),
      getSubtitleCacheList()
    ]);
    function flashSavedPill() {
      savedPill.style.display = "inline-flex";
      setTimeout(() => {
        savedPill.style.display = "none";
      }, 1800);
    }
    function populateForm() {
      optEnabled.checked = settings.enabled;
      optAutoGenerate.checked = settings.autoOnGenerate;
      optAutoExisting.checked = settings.autoOnExistingVideos;
      optShowToast.checked = settings.showToast;
      optLanguageHint.value = settings.languageHint || "auto";
      optTranslateTo.value = settings.translateTo || "original";
      optFontSize.value = settings.fontSize || "medium";
      optOffsetSec.value = String(settings.subtitleOffsetSec || 0);
      optExcludePatterns.value = (settings.excludePatterns || []).join("\n");
      rpcCreateInput.value = settings.rpcOverrides?.CREATE_STUDIO || "";
      rpcPollInput.value = settings.rpcOverrides?.POLL_STUDIO || "";
    }
    function moveProviderInQueue(index, delta) {
      const order = [...settings.queueOrder];
      const target = index + delta;
      if (target < 0 || target >= order.length) return;
      const [moved] = order.splice(index, 1);
      order.splice(target, 0, moved);
      saveSettings({ queueOrder: order, primaryProvider: order[0] }).then((next) => {
        settings = next;
        renderProviderQueue();
      });
    }
    function renderProviderQueue() {
      queueContainer.textContent = "";
      settings.queueOrder.forEach((providerId, idx) => {
        const spec = getProviderSpec(providerId);
        const isSaved = spec.id === "custom" ? Boolean(settings.customEnabled) : Boolean(presenceMap[providerId]);
        const row = document.createElement("div");
        row.className = "provider-row";
        const top = document.createElement("div");
        top.className = "provider-row-top";
        const leftInfo = document.createElement("div");
        leftInfo.className = "row";
        leftInfo.style.flexWrap = "wrap";
        const rank = document.createElement("span");
        rank.className = "provider-rank";
        rank.textContent = `#${idx + 1}`;
        const name = document.createElement("strong");
        name.textContent = spec.name;
        const tierBadge = document.createElement("span");
        tierBadge.className = "badge";
        tierBadge.textContent = spec.badge;
        const keyStatus = document.createElement("span");
        keyStatus.className = isSaved ? "badge badge-saved" : "badge";
        keyStatus.textContent = isSaved ? spec.id === "custom" ? "Active in queue" : "Key saved" : "Inactive";
        leftInfo.append(rank, name, tierBadge, keyStatus);
        const rightControls = document.createElement("div");
        rightControls.className = "row";
        const keyLink = document.createElement("a");
        keyLink.className = "link";
        keyLink.href = spec.keyUrl;
        keyLink.target = "_blank";
        keyLink.rel = "noopener noreferrer";
        keyLink.textContent = spec.id === "custom" ? "Docs \u2197" : "Get key \u2197";
        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "btn btn-sm";
        upBtn.textContent = "\u2191";
        upBtn.title = "Move higher in failover queue";
        upBtn.disabled = idx === 0;
        upBtn.addEventListener("click", () => moveProviderInQueue(idx, -1));
        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "btn btn-sm";
        downBtn.textContent = "\u2193";
        downBtn.title = "Move lower in failover queue";
        downBtn.disabled = idx === settings.queueOrder.length - 1;
        downBtn.addEventListener("click", () => moveProviderInQueue(idx, 1));
        rightControls.append(keyLink, upBtn, downBtn);
        top.append(leftInfo, rightControls);
        const desc = document.createElement("div");
        desc.className = "hint";
        desc.style.marginBottom = "8px";
        desc.textContent = spec.freeTierSummary;
        const grid = document.createElement("div");
        grid.className = "provider-grid";
        const keyOrUrlWrap = document.createElement("div");
        keyOrUrlWrap.className = "row";
        let urlInput = null;
        if (spec.id === "custom") {
          urlInput = document.createElement("input");
          urlInput.type = "url";
          urlInput.placeholder = "http://localhost:8000/v1";
          urlInput.value = settings.customBaseUrl || "";
          keyOrUrlWrap.appendChild(urlInput);
        }
        const keyInput = document.createElement("input");
        keyInput.type = "password";
        keyInput.placeholder = isSaved ? "Saved \xB7 enter new key to replace" : spec.keyPlaceholder;
        keyInput.autocomplete = "off";
        keyInput.spellcheck = false;
        keyOrUrlWrap.appendChild(keyInput);
        const modelInput = document.createElement("input");
        modelInput.type = "text";
        modelInput.value = getModelForProvider(settings, providerId);
        modelInput.title = `Model ID (default: ${spec.defaultModel})`;
        modelInput.placeholder = spec.defaultModel;
        const actions = document.createElement("div");
        actions.className = "row";
        const statusLine = document.createElement("div");
        statusLine.className = "status-line";
        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "btn btn-sm btn-primary";
        saveBtn.textContent = "Save";
        saveBtn.addEventListener("click", async () => {
          const customUrl = urlInput ? urlInput.value.trim() : settings.customBaseUrl;
          const granted = await requestProviderOrigin(providerId, customUrl);
          if (!granted) {
            statusLine.dataset.kind = "err";
            statusLine.textContent = `Host permission denied for ${spec.name}.`;
            return;
          }
          const nextModels = {
            ...settings.providerModels,
            [providerId]: modelInput.value.trim() || spec.defaultModel
          };
          if (providerId === "custom") {
            settings = await saveSettings({
              customBaseUrl: customUrl || "http://localhost:8000/v1",
              customEnabled: true,
              providerModels: nextModels
            });
            if (keyInput.value.trim()) {
              await setApiKey("custom", keyInput.value.trim());
            }
          } else {
            if (keyInput.value.trim()) {
              await setApiKey(providerId, keyInput.value.trim());
            } else if (!presenceMap[providerId]) {
              statusLine.dataset.kind = "err";
              statusLine.textContent = `Paste a ${spec.name} key first.`;
              return;
            }
            settings = await saveSettings({ providerModels: nextModels });
          }
          keyInput.value = "";
          presenceMap = await getSavedKeyPresenceMap();
          renderProviderQueue();
        });
        const testBtn = document.createElement("button");
        testBtn.type = "button";
        testBtn.className = "btn btn-sm";
        testBtn.textContent = "Test";
        testBtn.addEventListener("click", async () => {
          const customUrl = urlInput ? urlInput.value.trim() : settings.customBaseUrl;
          await requestProviderOrigin(providerId, customUrl);
          testBtn.disabled = true;
          statusLine.dataset.kind = "";
          statusLine.textContent = "Testing endpoint\u2026";
          const res = await sendRuntime({
            type: RUNTIME_MESSAGE.TEST_PROVIDER,
            providerId,
            model: modelInput.value.trim() || spec.defaultModel,
            unsavedApiKey: keyInput.value.trim(),
            customBaseUrl: customUrl
          });
          testBtn.disabled = false;
          if (res?.ok) {
            statusLine.dataset.kind = "ok";
            statusLine.textContent = `Verified ${res.providerName} (${res.model}) in ${res.latencyMs} ms.`;
          } else {
            statusLine.dataset.kind = "err";
            statusLine.textContent = res?.error || "Test failed.";
          }
        });
        actions.append(saveBtn, testBtn);
        if (isSaved) {
          const clearBtn = document.createElement("button");
          clearBtn.type = "button";
          clearBtn.className = "btn btn-sm btn-danger";
          clearBtn.textContent = spec.id === "custom" ? "Disable" : "Clear";
          clearBtn.addEventListener("click", async () => {
            if (spec.id === "custom") {
              settings = await saveSettings({ customEnabled: false });
            }
            await clearApiKey(providerId);
            presenceMap = await getSavedKeyPresenceMap();
            renderProviderQueue();
          });
          actions.appendChild(clearBtn);
        }
        grid.append(keyOrUrlWrap, modelInput, actions);
        row.append(top, desc, grid, statusLine);
        queueContainer.appendChild(row);
      });
    }
    function renderCacheTable() {
      cacheTbody.textContent = "";
      if (!cacheList || cacheList.length === 0) {
        cacheEmpty.style.display = "block";
        cacheTableWrap.style.display = "none";
        return;
      }
      cacheEmpty.style.display = "none";
      cacheTableWrap.style.display = "block";
      for (const item of cacheList) {
        const tr = document.createElement("tr");
        const tdTitle = document.createElement("td");
        tdTitle.style.fontWeight = "600";
        tdTitle.textContent = item.title || "Video Overview";
        const tdProv = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = item.failoverUsed ? `${item.provider} (failover)` : item.provider || "manual";
        tdProv.appendChild(badge);
        const tdSlim = document.createElement("td");
        if (item.originalBytes && item.extractedBytes) {
          const savedPct = Math.max(
            0,
            Math.round((1 - item.extractedBytes / item.originalBytes) * 100)
          );
          tdSlim.textContent = `${(item.originalBytes / 1048576).toFixed(1)} MB \u2192 ${(item.extractedBytes / 1048576).toFixed(1)} MB (-${savedPct}%)`;
        } else {
          tdSlim.textContent = "\u2014";
        }
        const tdCues = document.createElement("td");
        tdCues.textContent = String(item.cueCount || item.cues?.length || 0);
        const tdActions = document.createElement("td");
        const actRow = document.createElement("div");
        actRow.className = "row";
        const srtBtn = document.createElement("button");
        srtBtn.type = "button";
        srtBtn.className = "btn btn-sm";
        srtBtn.textContent = ".SRT";
        srtBtn.addEventListener("click", () => {
          downloadFile(
            formatSrt(item.cues || []),
            `${slugify(item.title)}.srt`,
            "application/x-subrip;charset=utf-8"
          );
        });
        const vttBtn = document.createElement("button");
        vttBtn.type = "button";
        vttBtn.className = "btn btn-sm";
        vttBtn.textContent = ".VTT";
        vttBtn.addEventListener("click", () => {
          downloadFile(
            formatVtt(item.cues || []),
            `${slugify(item.title)}.vtt`,
            "text/vtt;charset=utf-8"
          );
        });
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn btn-sm btn-danger";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", async () => {
          await deleteCachedSubtitles(item.cacheKey);
          cacheList = await getSubtitleCacheList();
          renderCacheTable();
        });
        actRow.append(srtBtn, vttBtn, delBtn);
        tdActions.appendChild(actRow);
        tr.append(tdTitle, tdProv, tdSlim, tdCues, tdActions);
        cacheTbody.appendChild(tr);
      }
    }
    populateForm();
    renderProviderQueue();
    renderCacheTable();
    optEnabled.addEventListener("change", async () => {
      settings = await saveSettings({ enabled: optEnabled.checked });
      flashSavedPill();
    });
    saveBehaviorBtn.addEventListener("click", async () => {
      const patterns = optExcludePatterns.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      settings = await saveSettings({
        autoOnGenerate: optAutoGenerate.checked,
        autoOnExistingVideos: optAutoExisting.checked,
        showToast: optShowToast.checked,
        languageHint: optLanguageHint.value,
        translateTo: optTranslateTo.value,
        fontSize: optFontSize.value,
        subtitleOffsetSec: Number(optOffsetSec.value) || 0,
        excludePatterns: patterns
      });
      flashSavedPill();
    });
    clearCacheBtn.addEventListener("click", async () => {
      await clearAllCachedSubtitles();
      cacheList = [];
      renderCacheTable();
    });
    saveRpcBtn.addEventListener("click", async () => {
      const rpcOverrides = {};
      if (rpcCreateInput.value.trim()) {
        rpcOverrides.CREATE_STUDIO = rpcCreateInput.value.trim();
      }
      if (rpcPollInput.value.trim()) {
        rpcOverrides.POLL_STUDIO = rpcPollInput.value.trim();
      }
      settings = await saveSettings({ rpcOverrides });
      flashSavedPill();
    });
  }
  document.addEventListener("DOMContentLoaded", initOptions);
})();

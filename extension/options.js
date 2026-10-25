(() => {
  // src/config/selectors.js
  var HOSTED_CLOUD_URL = "https://lm-subs.vercel.app";
  var NOTEBOOKLM_HOSTS = Object.freeze([
    "notebooklm.google.com",
    "notebook.google.com",
    "notebook.cloud.google.com"
  ]);
  var TRUSTED_GOOGLE_MEDIA_DOMAINS = Object.freeze([
    ".googleusercontent.com",
    ".usercontent.google.com",
    ".googlevideo.com",
    ".gvt1.com",
    ".ggpht.com",
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
    OVERLAY_HOST_ID: "lm-subs-player-root",
    OVERLAY_HOST_CLASS: "lm-subs-player-overlay",
    TOAST_HOST_ID: "lm-subs-toast-root",
    DEBUG_DRAWER_HOST_ID: "lm-subs-debug-root",
    TRACK_LABEL: "LM Subs"
  });
  var PAGE_MESSAGE = Object.freeze({
    BRIDGE_SOURCE_PAGE: "lm-subs-page",
    BRIDGE_SOURCE_CONTENT: "lm-subs-content",
    BATCH_ARTIFACTS: "LM_SUBS_BATCH_ARTIFACTS",
    SYNC_RPC_OVERRIDES: "LM_SUBS_SYNC_RPC_OVERRIDES",
    REQUEST_PAGE_STATE: "LM_SUBS_REQUEST_PAGE_STATE",
    PAGE_STATE_SNAPSHOT: "LM_SUBS_PAGE_STATE_SNAPSHOT",
    PAGE_DEBUG_EVENT: "LM_SUBS_PAGE_DEBUG_EVENT",
    EXTRACT_AUDIO_REQUEST: "LM_SUBS_EXTRACT_AUDIO_REQUEST",
    EXTRACT_AUDIO_RESPONSE: "LM_SUBS_EXTRACT_AUDIO_RESPONSE"
  });
  var RUNTIME_MESSAGE = Object.freeze({
    ENSURE_SUBTITLES: "LM_SUBS_ENSURE",
    STAGE_AUDIO_CHUNK: "LM_SUBS_STAGE_AUDIO_CHUNK",
    GET_CACHED_SUBTITLES: "LM_SUBS_GET_CACHED",
    SAVE_IMPORTED_SUBTITLES: "LM_SUBS_SAVE_IMPORTED",
    TEST_PROVIDER: "LM_SUBS_TEST_PROVIDER",
    SUBTITLES_PROGRESS: "LM_SUBS_PROGRESS",
    SUBTITLES_PARTIAL: "LM_SUBS_PARTIAL",
    SUBTITLES_READY: "LM_SUBS_READY",
    DECODE_WAV_FALLBACK: "LM_SUBS_DECODE_WAV_FALLBACK",
    GET_ACTIVE_TAB_STATE: "LM_SUBS_GET_ACTIVE_TAB_STATE",
    TRIGGER_ACTIVE_VIDEO: "LM_SUBS_TRIGGER_ACTIVE_VIDEO",
    APPEND_DEBUG_LOG: "LM_SUBS_APPEND_DEBUG_LOG",
    GET_DEBUG_REPORT: "LM_SUBS_GET_DEBUG_REPORT",
    CLEAR_DEBUG_LOGS: "LM_SUBS_CLEAR_DEBUG_LOGS",
    SYNC_SIGNUP: "LM_SUBS_SYNC_SIGNUP",
    SYNC_SIGNIN: "LM_SUBS_SYNC_SIGNIN",
    SYNC_EMAIL_SEND_CODE: "LM_SUBS_SYNC_EMAIL_SEND_CODE",
    SYNC_EMAIL_VERIFY_CODE: "LM_SUBS_SYNC_EMAIL_VERIFY_CODE",
    SYNC_SAVE_PREFERENCES: "LM_SUBS_SYNC_SAVE_PREFERENCES",
    SYNC_GET_STATS: "LM_SUBS_SYNC_GET_STATS",
    SYNC_SIGNOUT: "LM_SUBS_SYNC_SIGNOUT",
    SYNC_NOW: "LM_SUBS_SYNC_NOW",
    SYNC_STATUS: "LM_SUBS_SYNC_STATUS",
    GET_NOTIFICATIONS: "LM_SUBS_GET_NOTIFICATIONS",
    MARK_NOTIFICATIONS_READ: "LM_SUBS_MARK_NOTIFICATIONS_READ",
    CLEAR_NOTIFICATIONS: "LM_SUBS_CLEAR_NOTIFICATIONS",
    TEST_DESKTOP_NOTIFICATION: "LM_SUBS_TEST_DESKTOP_NOTIFICATION",
    UPDATE_CACHED_SUBTITLES: "LM_SUBS_UPDATE_CACHED_SUBTITLES"
  });

  // src/lib/audio-extract.js
  var FOURCC_Encoder = new TextEncoder();
  function resolveAvoidedVideoBytes({
    originalBytes = 0,
    extractedBytes = 0,
    durationSeconds = 0,
    cues = []
  } = {}) {
    const orig = Math.max(0, Math.round(Number(originalBytes) || 0));
    const ext = Math.max(0, Math.round(Number(extractedBytes) || 0));
    if (orig > ext && ext > 0) {
      return {
        originalBytes: orig,
        extractedBytes: ext,
        savedBytes: orig - ext
      };
    }
    let dur = Number(durationSeconds) || 0;
    if (dur <= 0 && Array.isArray(cues) && cues.length > 0) {
      for (const c of cues) {
        const end = Number(c?.endSec ?? c?.end ?? 0);
        if (Number.isFinite(end) && end > dur) dur = end;
      }
    }
    if (ext > 0) {
      const byRatio = Math.round(ext * 6.5);
      const byDuration = dur > 0 ? Math.round(dur * 112 * 1024) : 0;
      const estimatedVideoBytes = Math.max(
        ext + 1024,
        byDuration > ext ? byDuration : byRatio
      );
      return {
        originalBytes: estimatedVideoBytes,
        extractedBytes: ext,
        savedBytes: Math.max(0, estimatedVideoBytes - ext)
      };
    }
    if (dur > 0) {
      const estExt = Math.round(dur * 16 * 1024);
      const estOrig = Math.round(dur * 112 * 1024);
      return {
        originalBytes: estOrig,
        extractedBytes: estExt,
        savedBytes: Math.max(0, estOrig - estExt)
      };
    }
    return {
      originalBytes: orig,
      extractedBytes: ext,
      savedBytes: Math.max(0, orig - ext)
    };
  }

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
    LAST_STATUS: "lastStatus",
    DEBUG_LOGS: "debugLogs",
    NOTIFICATIONS: "notifications",
    CLOUD_SYNC_PROFILE: "cloudSyncProfile",
    CLOUD_SYNC_SECRET: "cloudSyncSecret"
  });
  var DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    debugMode: false,
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
    captionStyle: "classic",
    // "classic" | "contrast" | "minimal"
    subtitleOffsetSec: 0,
    showToast: true,
    desktopNotifications: true,
    soundAlerts: false,
    badgeAlerts: true,
    notifyOnFailover: true,
    notifyOnSync: true,
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
      debugMode: typeof saved.debugMode === "boolean" ? saved.debugMode : DEFAULT_SETTINGS.debugMode,
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
      captionStyle: ["classic", "contrast", "minimal"].includes(saved.captionStyle) ? saved.captionStyle : "classic",
      subtitleOffsetSec: Number.isFinite(Number(saved.subtitleOffsetSec)) ? Math.max(-10, Math.min(10, Number(saved.subtitleOffsetSec))) : 0,
      showToast: typeof saved.showToast === "boolean" ? saved.showToast : DEFAULT_SETTINGS.showToast,
      desktopNotifications: typeof saved.desktopNotifications === "boolean" ? saved.desktopNotifications : DEFAULT_SETTINGS.desktopNotifications,
      soundAlerts: typeof saved.soundAlerts === "boolean" ? saved.soundAlerts : DEFAULT_SETTINGS.soundAlerts,
      badgeAlerts: typeof saved.badgeAlerts === "boolean" ? saved.badgeAlerts : DEFAULT_SETTINGS.badgeAlerts,
      notifyOnFailover: typeof saved.notifyOnFailover === "boolean" ? saved.notifyOnFailover : DEFAULT_SETTINGS.notifyOnFailover,
      notifyOnSync: typeof saved.notifyOnSync === "boolean" ? saved.notifyOnSync : DEFAULT_SETTINGS.notifyOnSync,
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
  var DEFAULT_SYNC_PREFERENCES = Object.freeze({
    syncApiKeys: true,
    syncTranscripts: true,
    syncSettings: true
  });
  function normalizeSyncPreferences(raw) {
    if (!raw || typeof raw !== "object") {
      return { ...DEFAULT_SYNC_PREFERENCES };
    }
    return {
      syncApiKeys: typeof raw.syncApiKeys === "boolean" ? raw.syncApiKeys : DEFAULT_SYNC_PREFERENCES.syncApiKeys,
      syncTranscripts: typeof raw.syncTranscripts === "boolean" ? raw.syncTranscripts : DEFAULT_SYNC_PREFERENCES.syncTranscripts,
      syncSettings: typeof raw.syncSettings === "boolean" ? raw.syncSettings : DEFAULT_SYNC_PREFERENCES.syncSettings
    };
  }
  var DEFAULT_CLOUD_SYNC_PROFILE = Object.freeze({
    serverUrl: HOSTED_CLOUD_URL,
    connected: false,
    autoSync: true,
    syncPreferences: DEFAULT_SYNC_PREFERENCES,
    user: null,
    keyHints: {},
    subtitleCount: 0,
    lastSyncedAt: null
  });
  function normalizeSyncServerUrl(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl.trim()) {
      return DEFAULT_CLOUD_SYNC_PROFILE.serverUrl;
    }
    const trimmed = rawUrl.trim().replace(/\/+$/, "");
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return DEFAULT_CLOUD_SYNC_PROFILE.serverUrl;
      }
      return `${parsed.origin}${parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/api$/, "")}`;
    } catch {
      return DEFAULT_CLOUD_SYNC_PROFILE.serverUrl;
    }
  }
  async function getCloudSyncProfile(storageArea) {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.CLOUD_SYNC_PROFILE);
    const saved = raw?.[STORAGE_KEYS.CLOUD_SYNC_PROFILE];
    if (!saved || typeof saved !== "object") {
      return {
        ...DEFAULT_CLOUD_SYNC_PROFILE,
        syncPreferences: { ...DEFAULT_SYNC_PREFERENCES }
      };
    }
    return {
      serverUrl: normalizeSyncServerUrl(saved.serverUrl),
      connected: Boolean(saved.connected && saved.user?.email),
      autoSync: typeof saved.autoSync === "boolean" ? saved.autoSync : true,
      syncPreferences: normalizeSyncPreferences(saved.syncPreferences),
      user: saved.user && typeof saved.user === "object" ? {
        id: String(saved.user.id || ""),
        email: String(saved.user.email || ""),
        name: String(saved.user.name || ""),
        authProvider: String(saved.user.authProvider || "email")
      } : null,
      keyHints: saved.keyHints && typeof saved.keyHints === "object" ? { ...saved.keyHints } : {},
      subtitleCount: Number(saved.subtitleCount) || 0,
      lastSyncedAt: saved.lastSyncedAt || null
    };
  }
  async function getNotifications(storageArea) {
    try {
      const store = resolveStorage(storageArea);
      const raw = await store.get(STORAGE_KEYS.NOTIFICATIONS);
      const list = raw?.[STORAGE_KEYS.NOTIFICATIONS];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  // src/lib/subtitles.js
  var DEFAULT_MAX_LINE_CHARS = 42;
  var DEFAULT_MIN_DURATION_SEC = 0.85;
  function parseTimestampSec(raw) {
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
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return NaN;
    }
    return Math.max(0, hours * 3600 + minutes * 60 + seconds);
  }
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
  function formatShortTimestamp(seconds) {
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
  function formatTxt(cues, { includeTimestamps = true, title = "" } = {}) {
    const normalized = normalizeAndSortCues(cues);
    if (normalized.length === 0) return "";
    const header = title ? `# ${String(title).trim()}

` : "";
    const lines = normalized.map((cue) => {
      const cleanText = String(cue.text || "").replace(/\s+/g, " ").trim();
      const speakerPrefix = cue.speaker ? `${cue.speaker}: ` : "";
      if (!includeTimestamps) {
        return `${speakerPrefix}${cleanText}`;
      }
      return `[${formatShortTimestamp(cue.startSec)}] ${speakerPrefix}${cleanText}`;
    });
    return `${header}${lines.join("\n")}
`;
  }
  function formatJsonSubtitles(cues, meta = {}) {
    const normalized = normalizeAndSortCues(cues);
    const payload = {
      schema: "lm-subs/v1",
      title: meta.title || "NotebookLM Video Overview",
      language: meta.language || "en",
      ...meta.provider ? { provider: meta.provider } : {},
      ...meta.model ? { model: meta.model } : {},
      ...meta.artifactId ? { artifactId: meta.artifactId } : {},
      cueCount: normalized.length,
      exportedAt: meta.exportedAt || (/* @__PURE__ */ new Date()).toISOString(),
      cues: normalized
    };
    return `${JSON.stringify(payload, null, 2)}
`;
  }
  function formatMarkdownNotes(cues, meta = {}) {
    const normalized = normalizeAndSortCues(cues);
    const title = String(meta.title || "NotebookLM Video Overview").trim();
    const lang = String(meta.language || "en").trim();
    const lastEnd = normalized.length > 0 ? normalized[normalized.length - 1].endSec : 0;
    const mins = Math.floor(lastEnd / 60);
    const secs = Math.round(lastEnd % 60);
    const durationLabel = `${mins}:${String(secs).padStart(2, "0")}`;
    const lines = [
      `# ${title}`,
      "",
      `- **Language:** ${lang}`,
      `- **Duration:** ${durationLabel}`,
      `- **Synchronized cues:** ${normalized.length}`,
      ...meta.provider ? [`- **Transcribed via:** ${meta.provider}`] : [],
      ""
    ];
    if (normalized.length === 0) {
      lines.push("_No caption cues available._", "");
      return lines.join("\n");
    }
    const SECTION_SPAN_SEC = 90;
    const sections = [];
    let current = null;
    for (const cue of normalized) {
      if (!current || cue.startSec - current.startSec >= SECTION_SPAN_SEC) {
        current = {
          startSec: cue.startSec,
          endSec: cue.endSec,
          items: []
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
      const prose = sec.items.map((c) => {
        const clean = c.text.replace(/\s*\n\s*/g, " ").trim();
        return c.speaker ? `**${c.speaker}:** ${clean}` : clean;
      }).join(" ");
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
  function searchCues(cues, query) {
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
          text: String(cue.text || "").replace(/\s*\n\s*/g, " ").trim()
        });
      }
    }
    return matches;
  }
  function slugifySubtitleFilename(title) {
    const slug = String(title || "notebooklm-video-overview").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
    return slug || "notebooklm-video-overview";
  }
  function serializeSubtitles(cues, format = "srt", meta = {}) {
    const fmt = String(format || "srt").toLowerCase();
    const base = slugifySubtitleFilename(meta.title);
    if (fmt === "vtt") {
      return {
        content: formatVtt(cues),
        extension: "vtt",
        mimeType: "text/vtt;charset=utf-8",
        filename: `${base}.vtt`
      };
    }
    if (fmt === "txt") {
      return {
        content: formatTxt(cues, {
          includeTimestamps: meta.includeTimestamps !== false,
          title: meta.title || ""
        }),
        extension: "txt",
        mimeType: "text/plain;charset=utf-8",
        filename: `${base}.txt`
      };
    }
    if (fmt === "md" || fmt === "markdown") {
      return {
        content: formatMarkdownNotes(cues, meta),
        extension: "md",
        mimeType: "text/markdown;charset=utf-8",
        filename: `${base}-notes.md`
      };
    }
    if (fmt === "json") {
      return {
        content: formatJsonSubtitles(cues, meta),
        extension: "json",
        mimeType: "application/json;charset=utf-8",
        filename: `${base}.json`
      };
    }
    return {
      content: formatSrt(cues),
      extension: "srt",
      mimeType: "application/x-subrip;charset=utf-8",
      filename: `${base}.srt`
    };
  }

  // src/ui/brand-icon.js
  var SVG_NS = "http://www.w3.org/2000/svg";
  function createBrandMarkSvg(doc = globalThis.document, size = 28) {
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", "0 0 128 128");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    const bg = doc.createElementNS(SVG_NS, "rect");
    bg.setAttribute("width", "128");
    bg.setAttribute("height", "128");
    bg.setAttribute("rx", "28");
    bg.setAttribute("fill", "#111315");
    const page = doc.createElementNS(SVG_NS, "path");
    page.setAttribute("fill-rule", "evenodd");
    page.setAttribute("clip-rule", "evenodd");
    page.setAttribute(
      "d",
      "M45.8 21.5C48.2 20.4 51 22.2 51 24.9V103.5C51 106.5 47.5 108.2 45.1 106.4L22.6 89.2C20.1 87.3 18.6 84.3 18.6 81.1V41.6C18.6 37.3 21.1 33.4 25 31.6L45.8 21.5ZM24.5 81.8L42.6 95.6C43.7 96.4 45.2 95.6 45.2 94.3V83.1C45.2 81.7 44 80.5 42.6 80.5H25.1C23.8 80.5 23.4 81 24.5 81.8Z"
    );
    page.setAttribute("fill", "#F6F7F8");
    const barLeft = doc.createElementNS(SVG_NS, "rect");
    barLeft.setAttribute("x", "56.5");
    barLeft.setAttribute("y", "49.5");
    barLeft.setAttribute("width", "8");
    barLeft.setAttribute("height", "29");
    barLeft.setAttribute("rx", "4");
    barLeft.setAttribute("fill", "#F6F7F8");
    const barMid = doc.createElementNS(SVG_NS, "rect");
    barMid.setAttribute("x", "68.5");
    barMid.setAttribute("y", "37");
    barMid.setAttribute("width", "8.5");
    barMid.setAttribute("height", "54");
    barMid.setAttribute("rx", "4.25");
    barMid.setAttribute("fill", "#F6F7F8");
    const barRight = doc.createElementNS(SVG_NS, "rect");
    barRight.setAttribute("x", "81");
    barRight.setAttribute("y", "49.5");
    barRight.setAttribute("width", "8");
    barRight.setAttribute("height", "29");
    barRight.setAttribute("rx", "4");
    barRight.setAttribute("fill", "#F6F7F8");
    const bracket = doc.createElementNS(SVG_NS, "path");
    bracket.setAttribute(
      "d",
      "M84.5 27H98.5C104.851 27 110 32.1487 110 38.5V89.5C110 95.8513 104.851 101 98.5 101H84.5C81.7386 101 79.5 98.7614 79.5 96C79.5 93.2386 81.7386 91 84.5 91H97C98.3807 91 99.5 89.8807 99.5 88.5V39.5C99.5 38.1193 98.3807 37 97 37H84.5C81.7386 37 79.5 34.7614 79.5 32C79.5 29.2386 81.7386 27 84.5 27Z"
    );
    bracket.setAttribute("fill", "#1D5CF6");
    svg.append(bg, page, barLeft, barMid, barRight, bracket);
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
  async function requestSyncServerOrigin(rawUrl) {
    if (!chrome.permissions?.request) return true;
    try {
      const u = new URL(normalizeSyncServerUrl(rawUrl));
      return await chrome.permissions.request({ origins: [`${u.origin}/*`] });
    } catch {
      return true;
    }
  }
  function downloadFile(content, filename, mime) {
    const blob = new Blob(["\uFEFF", content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3e3);
  }
  function formatMegabytesLabel(bytes) {
    const b = Math.max(0, Number(bytes) || 0);
    if (b >= 1073741824) {
      return `${(b / 1073741824).toFixed(2)} GB`;
    }
    return `${(b / 1048576).toFixed(1)} MB`;
  }
  async function initOptions() {
    document.getElementById("brand-icon-slot")?.appendChild(createBrandMarkSvg(document, 26));
    const optEnabled = document.getElementById("opt-enabled");
    const queueWrap = document.getElementById("provider-queue-wrap");
    const queueContainer = document.getElementById("provider-queue-list");
    const queueSummary = document.getElementById("provider-queue-summary");
    const collapseAllBtn = document.getElementById("provider-collapse-all-btn");
    const toggleSectionBtn = document.getElementById("provider-section-toggle-btn");
    const optAutoGenerate = document.getElementById("opt-auto-generate");
    const optAutoExisting = document.getElementById("opt-auto-existing");
    const optShowToast = document.getElementById("opt-show-toast");
    const optLanguageHint = document.getElementById("opt-language-hint");
    const optTranslateTo = document.getElementById("opt-translate-to");
    const optFontSize = document.getElementById("opt-font-size");
    const optCaptionStyle = document.getElementById("opt-caption-style");
    const optOffsetSec = document.getElementById("opt-offset-sec");
    const optExcludePatterns = document.getElementById("opt-exclude-patterns");
    const saveBehaviorBtn = document.getElementById("save-behavior-btn");
    const savedPill = document.getElementById("settings-saved-pill");
    const optNotifUnreadBadge = document.getElementById("opt-notif-unread-badge");
    const optDesktopNotifications = document.getElementById("opt-desktop-notifications");
    const optBadgeAlerts = document.getElementById("opt-badge-alerts");
    const optSoundAlerts = document.getElementById("opt-sound-alerts");
    const optNotifyFailover = document.getElementById("opt-notify-failover");
    const optNotifySync = document.getElementById("opt-notify-sync");
    const optTestNotifBtn = document.getElementById("opt-test-notif-btn");
    const optMarkNotifReadBtn = document.getElementById("opt-mark-notif-read-btn");
    const optClearNotifBtn = document.getElementById("opt-clear-notif-btn");
    const optNotifList = document.getElementById("opt-notif-list");
    const optSyncBadge = document.getElementById("opt-sync-badge");
    const syncLoggedOutPanel = document.getElementById("sync-logged-out-panel");
    const syncLoggedInPanel = document.getElementById("sync-logged-in-panel");
    const syncGoogleBtn = document.getElementById("sync-google-btn");
    const syncGithubBtn = document.getElementById("sync-github-btn");
    const syncEmailInput = document.getElementById("sync-email-input");
    const syncSendCodeBtn = document.getElementById("sync-send-code-btn");
    const syncCodeInput = document.getElementById("sync-code-input");
    const syncVerifyCodeBtn = document.getElementById("sync-verify-code-btn");
    const syncTokenInput = document.getElementById("sync-token-input");
    const syncTokenBtn = document.getElementById("sync-token-btn");
    const syncGetWebCodeBtn = document.getElementById("sync-get-web-code-btn");
    const syncLocalCodePreview = document.getElementById("sync-local-code-preview");
    const syncLocalCodeDigits = document.getElementById("sync-local-code-digits");
    const syncCopyLocalCodeBtn = document.getElementById("sync-copy-local-code-btn");
    const syncAccountLabel = document.getElementById("sync-account-label");
    const syncMetaLabel = document.getElementById("sync-meta-label");
    const syncOpenWebStatsBtn = document.getElementById("sync-open-web-stats-btn");
    const syncNowBtn = document.getElementById("sync-now-btn");
    const syncSignoutBtn = document.getElementById("sync-signout-btn");
    const syncKeyHints = document.getElementById("sync-key-hints");
    const syncStatusLine = document.getElementById("sync-status-line");
    const syncPrefKeys = document.getElementById("sync-pref-keys");
    const syncPrefTranscripts = document.getElementById("sync-pref-transcripts");
    const syncPrefSettings = document.getElementById("sync-pref-settings");
    const refreshStatsBtn = document.getElementById("refresh-stats-btn");
    const statsSummaryNote = document.getElementById("stats-summary-note");
    const statVideos = document.getElementById("stat-videos");
    const statCues = document.getElementById("stat-cues");
    const statSaved = document.getElementById("stat-saved");
    const statLatency = document.getElementById("stat-latency");
    const cacheEmpty = document.getElementById("cache-empty");
    const cacheTableWrap = document.getElementById("cache-table-wrap");
    const cacheTbody = document.getElementById("cache-tbody");
    const cacheSearchInput = document.getElementById("cache-search-input");
    const exportAllVaultBtn = document.getElementById("export-all-vault-btn");
    const clearCacheBtn = document.getElementById("clear-cache-btn");
    const rpcCreateInput = document.getElementById("rpc-create-input");
    const rpcPollInput = document.getElementById("rpc-poll-input");
    const saveRpcBtn = document.getElementById("save-rpc-btn");
    const optDebugMode = document.getElementById("opt-debug-mode");
    const optPermBadge = document.getElementById("opt-perm-badge");
    const optGrantPermsBtn = document.getElementById("opt-grant-perms-btn");
    const optRefreshDebugBtn = document.getElementById("opt-refresh-debug-btn");
    const optCopyDebugBtn = document.getElementById("opt-copy-debug-btn");
    const optClearDebugBtn = document.getElementById("opt-clear-debug-btn");
    const debugLogViewer = document.getElementById("debug-log-viewer");
    let missingOriginsForOptions = [];
    let cacheFilterQuery = "";
    let editingCacheKey = null;
    let [settings, presenceMap, cacheList, syncProfile, notifications] = await Promise.all([
      getSettings(),
      getSavedKeyPresenceMap(),
      getSubtitleCacheList(),
      getCloudSyncProfile(),
      getNotifications()
    ]);
    const hasAnySavedKey = () => settings.queueOrder.some(
      (id) => id === "custom" ? Boolean(settings.customEnabled) : Boolean(presenceMap[id])
    );
    const expandedProviders = new Set(
      hasAnySavedKey() ? [] : [settings.queueOrder[0] || "groq"]
    );
    let providerListHidden = false;
    function flashSavedPill() {
      if (!savedPill) return;
      savedPill.style.display = "inline-flex";
      setTimeout(() => {
        savedPill.style.display = "none";
      }, 1800);
    }
    function setSyncFeedback(message, kind = "") {
      if (!syncStatusLine) return;
      syncStatusLine.dataset.kind = kind;
      syncStatusLine.textContent = message;
    }
    function renderSyncPanel() {
      const prefs = syncProfile?.syncPreferences || {
        syncApiKeys: true,
        syncTranscripts: true,
        syncSettings: true
      };
      if (syncPrefKeys) syncPrefKeys.checked = Boolean(prefs.syncApiKeys);
      if (syncPrefTranscripts) {
        syncPrefTranscripts.checked = Boolean(prefs.syncTranscripts);
      }
      if (syncPrefSettings) {
        syncPrefSettings.checked = Boolean(prefs.syncSettings);
      }
      if (syncProfile?.connected && syncProfile.user?.email) {
        optSyncBadge.textContent = "Synced";
        optSyncBadge.className = "badge badge-saved";
        syncLoggedOutPanel.style.display = "none";
        syncLoggedInPanel.style.display = "block";
        syncAccountLabel.textContent = syncProfile.user.name ? `${syncProfile.user.name} (${syncProfile.user.email})` : syncProfile.user.email;
        const hintEntries = Object.entries(syncProfile.keyHints || {});
        const lastStr = syncProfile.lastSyncedAt ? new Date(syncProfile.lastSyncedAt).toLocaleTimeString() : "moments ago";
        syncMetaLabel.textContent = `${hintEntries.length} encrypted key(s), ${syncProfile.subtitleCount || 0} synced transcript(s), last sync ${lastStr}`;
        syncKeyHints.textContent = "";
        for (const [provId, hint] of hintEntries) {
          const chip = document.createElement("span");
          chip.className = "key-chip";
          chip.textContent = `${provId}: ${hint}`;
          syncKeyHints.appendChild(chip);
        }
      } else {
        optSyncBadge.textContent = "Signed out";
        optSyncBadge.className = "badge";
        syncLoggedOutPanel.style.display = "block";
        syncLoggedInPanel.style.display = "none";
      }
    }
    function computeLocalFallbackStats() {
      let cues = 0;
      let savedBytes = 0;
      const lats = [];
      for (const item of cacheList) {
        cues += Number(item.cueCount || item.cues?.length || 0);
        const byteStats = resolveAvoidedVideoBytes({
          originalBytes: item.originalBytes,
          extractedBytes: item.extractedBytes,
          durationSeconds: item.durationSeconds,
          cues: item.cues
        });
        savedBytes += byteStats.savedBytes;
        if (Number(item.latencyMs) > 0) lats.push(Number(item.latencyMs));
      }
      lats.sort((a, b) => a - b);
      const med = lats.length > 0 ? lats[Math.floor(lats.length / 2)] : null;
      return {
        videos: cacheList.length,
        cues,
        savedBytes,
        medianLatencyMs: med
      };
    }
    async function renderStatisticsPanel() {
      if (!statVideos) return;
      const localStats = computeLocalFallbackStats();
      if (syncProfile?.connected) {
        const res = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_GET_STATS });
        if (res?.ok && res.totals) {
          const t = res.totals;
          const cloudSaved = Number(t.bandwidthSavedBytes) || 0;
          const bestSaved = Math.max(cloudSaved, localStats.savedBytes);
          const bestVideos = Math.max(Number(t.videosCaptioned) || 0, localStats.videos);
          const bestCues = Math.max(Number(t.totalCues) || 0, localStats.cues);
          const medMs = t.medianLatencyMs || localStats.medianLatencyMs;
          statVideos.textContent = String(bestVideos);
          statCues.textContent = String(bestCues);
          statSaved.textContent = formatMegabytesLabel(bestSaved);
          statLatency.textContent = medMs ? `${(medMs / 1e3).toFixed(1)}s` : "n/a";
          if (statsSummaryNote) {
            statsSummaryNote.textContent = `Live account metrics (${t.spokenMinutes || 0} spoken minutes across ${bestVideos} captioned videos).`;
          }
          return;
        }
      }
      statVideos.textContent = String(localStats.videos);
      statCues.textContent = String(localStats.cues);
      statSaved.textContent = formatMegabytesLabel(localStats.savedBytes);
      statLatency.textContent = localStats.medianLatencyMs ? `${(localStats.medianLatencyMs / 1e3).toFixed(1)}s` : "n/a";
      if (statsSummaryNote) {
        statsSummaryNote.textContent = "Computed from transcripts cached in this browser. Sign in above to include cross-device statistics.";
      }
    }
    async function reloadAllLocalState() {
      [settings, presenceMap, cacheList, syncProfile, notifications] = await Promise.all([
        getSettings(),
        getSavedKeyPresenceMap(),
        getSubtitleCacheList(),
        getCloudSyncProfile(),
        getNotifications()
      ]);
      populateForm();
      renderSyncPanel();
      renderProviderQueue();
      renderNotificationsPanel();
      renderCacheTable();
      await renderStatisticsPanel();
    }
    async function triggerAutoSyncIfConnected(extra = {}) {
      if (!syncProfile?.connected) return;
      const res = await sendRuntime({
        type: RUNTIME_MESSAGE.SYNC_NOW,
        ...extra
      });
      if (res?.ok && res.profile) {
        syncProfile = res.profile;
        renderSyncPanel();
      }
    }
    function populateForm() {
      optEnabled.checked = settings.enabled;
      if (optDebugMode) optDebugMode.checked = Boolean(settings.debugMode);
      optAutoGenerate.checked = settings.autoOnGenerate;
      optAutoExisting.checked = settings.autoOnExistingVideos;
      optShowToast.checked = settings.showToast;
      if (optDesktopNotifications) {
        optDesktopNotifications.checked = Boolean(settings.desktopNotifications);
      }
      if (optBadgeAlerts) optBadgeAlerts.checked = Boolean(settings.badgeAlerts);
      if (optSoundAlerts) optSoundAlerts.checked = Boolean(settings.soundAlerts);
      if (optNotifyFailover) {
        optNotifyFailover.checked = Boolean(settings.notifyOnFailover);
      }
      if (optNotifySync) optNotifySync.checked = Boolean(settings.notifyOnSync);
      optLanguageHint.value = settings.languageHint || "auto";
      optTranslateTo.value = settings.translateTo || "original";
      optFontSize.value = settings.fontSize || "medium";
      if (optCaptionStyle) optCaptionStyle.value = settings.captionStyle || "classic";
      optOffsetSec.value = String(settings.subtitleOffsetSec || 0);
      optExcludePatterns.value = (settings.excludePatterns || []).join("\n");
      rpcCreateInput.value = settings.rpcOverrides?.CREATE_STUDIO || "";
      rpcPollInput.value = settings.rpcOverrides?.POLL_STUDIO || "";
    }
    function renderNotificationsPanel() {
      if (!optNotifList) return;
      const list = Array.isArray(notifications) ? notifications : [];
      const unread = list.filter((n) => !n.read).length;
      if (optNotifUnreadBadge) {
        optNotifUnreadBadge.textContent = `${unread} unread`;
        optNotifUnreadBadge.className = unread > 0 ? "badge badge-saved" : "badge";
      }
      optNotifList.textContent = "";
      if (list.length === 0) {
        const empty = document.createElement("div");
        empty.className = "hint";
        empty.style.padding = "12px 14px";
        empty.style.margin = "0";
        empty.textContent = "No notifications recorded yet. Completed captions, rate-limit failovers, and sync events appear here.";
        optNotifList.appendChild(empty);
        return;
      }
      for (const item of list.slice(0, 25)) {
        const row = document.createElement("div");
        row.className = "notif-row";
        row.dataset.unread = item.read ? "false" : "true";
        const head = document.createElement("div");
        head.className = "notif-row-head";
        const title = document.createElement("span");
        title.className = "notif-row-title";
        title.textContent = item.title || "LM Subs";
        const time = document.createElement("span");
        time.className = "hint";
        time.style.margin = "0";
        time.textContent = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
        head.append(title, time);
        row.appendChild(head);
        if (item.body) {
          const body = document.createElement("div");
          body.className = "notif-row-body";
          body.textContent = item.body;
          row.appendChild(body);
        }
        optNotifList.appendChild(row);
      }
    }
    function moveProviderInQueue(index, delta) {
      const order = [...settings.queueOrder];
      const target = index + delta;
      if (target < 0 || target >= order.length) return;
      const [moved] = order.splice(index, 1);
      order.splice(target, 0, moved);
      saveSettings({ queueOrder: order, primaryProvider: order[0] }).then(async (next) => {
        settings = next;
        renderProviderQueue();
        await triggerAutoSyncIfConnected({ pushOnly: true });
      });
    }
    function renderProviderSummaryAndControls() {
      const activeIds = settings.queueOrder.filter(
        (id) => id === "custom" ? Boolean(settings.customEnabled) : Boolean(presenceMap[id])
      );
      if (queueSummary) {
        if (activeIds.length > 0) {
          const chain = activeIds.slice(0, 4).map((id, i) => `#${i + 1} ${getProviderSpec(id).name.split(" ")[0]}`).join(" -> ");
          queueSummary.textContent = `${activeIds.length} active in failover queue (${chain}). Click any row to edit its API key or model.`;
        } else {
          queueSummary.textContent = "No API keys saved yet. Paste a free-tier Groq or Mistral key below; unused providers stay collapsed.";
        }
      }
      if (collapseAllBtn) {
        collapseAllBtn.textContent = expandedProviders.size > 0 ? "Collapse rows" : "Expand configured";
      }
      if (toggleSectionBtn && queueWrap) {
        queueWrap.style.display = providerListHidden ? "none" : "block";
        toggleSectionBtn.textContent = providerListHidden ? `Show providers (${settings.queueOrder.length})` : "Hide list";
      }
    }
    function renderProviderQueue() {
      renderProviderSummaryAndControls();
      queueContainer.textContent = "";
      settings.queueOrder.forEach((providerId, idx) => {
        const spec = getProviderSpec(providerId);
        const isSaved = spec.id === "custom" ? Boolean(settings.customEnabled) : Boolean(presenceMap[providerId]);
        const isExpanded = expandedProviders.has(providerId);
        const item = document.createElement("div");
        item.className = "provider-item";
        const bar = document.createElement("div");
        bar.className = "provider-item-bar";
        const leftInfo = document.createElement("div");
        leftInfo.className = "provider-item-left";
        const rank = document.createElement("span");
        rank.className = "provider-rank";
        rank.textContent = String(idx + 1).padStart(2, "0");
        const name = document.createElement("span");
        name.className = "provider-name";
        name.textContent = spec.name;
        const tier = document.createElement("span");
        tier.className = "provider-tier";
        tier.textContent = spec.badge;
        const cloudHint = syncProfile?.keyHints?.[providerId];
        const keyStatus = document.createElement("span");
        keyStatus.className = isSaved ? "badge badge-saved" : "badge";
        keyStatus.textContent = isSaved ? spec.id === "custom" ? "Active" : cloudHint ? `Synced (${cloudHint})` : "Saved" : "Unset";
        leftInfo.append(rank, name, tier, keyStatus);
        const rightControls = document.createElement("div");
        rightControls.className = "provider-item-right";
        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "btn btn-sm";
        upBtn.textContent = "Up";
        upBtn.title = "Move higher in failover queue";
        upBtn.disabled = idx === 0;
        upBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          moveProviderInQueue(idx, -1);
        });
        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "btn btn-sm";
        downBtn.textContent = "Down";
        downBtn.title = "Move lower in failover queue";
        downBtn.disabled = idx === settings.queueOrder.length - 1;
        downBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          moveProviderInQueue(idx, 1);
        });
        const expandBtn = document.createElement("button");
        expandBtn.type = "button";
        expandBtn.className = "btn btn-sm";
        expandBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        expandBtn.textContent = isExpanded ? "Close" : isSaved ? "Edit key" : "Add key";
        const toggleRow = () => {
          if (expandedProviders.has(providerId)) {
            expandedProviders.delete(providerId);
          } else {
            expandedProviders.add(providerId);
          }
          renderProviderQueue();
        };
        expandBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleRow();
        });
        bar.addEventListener("click", toggleRow);
        rightControls.append(upBtn, downBtn, expandBtn);
        bar.append(leftInfo, rightControls);
        item.appendChild(bar);
        if (isExpanded) {
          const drawer = document.createElement("div");
          drawer.className = "provider-item-drawer";
          const descRow = document.createElement("div");
          descRow.className = "row";
          descRow.style.justifyContent = "space-between";
          descRow.style.flexWrap = "wrap";
          const desc = document.createElement("span");
          desc.className = "hint";
          desc.style.marginTop = "0";
          desc.textContent = spec.freeTierSummary;
          const keyLink = document.createElement("a");
          keyLink.className = "link";
          keyLink.href = spec.keyUrl;
          keyLink.target = "_blank";
          keyLink.rel = "noopener noreferrer";
          keyLink.textContent = spec.id === "custom" ? "Server docs" : "Get API key";
          descRow.append(desc, keyLink);
          const grid = document.createElement("div");
          grid.className = "provider-drawer-grid";
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
          keyInput.placeholder = isSaved ? "Saved (paste new key to replace)" : spec.keyPlaceholder;
          keyInput.autocomplete = "off";
          keyInput.spellcheck = false;
          keyOrUrlWrap.appendChild(keyInput);
          const modelInput = document.createElement("input");
          modelInput.type = "text";
          modelInput.className = "mono-input";
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
            expandedProviders.delete(providerId);
            await triggerAutoSyncIfConnected();
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
              await triggerAutoSyncIfConnected({ deletedProviders: [providerId] });
              renderProviderQueue();
            });
            actions.appendChild(clearBtn);
          }
          grid.append(keyOrUrlWrap, modelInput, actions);
          drawer.append(descRow, grid, statusLine);
          item.appendChild(drawer);
        }
        queueContainer.appendChild(item);
      });
    }
    collapseAllBtn?.addEventListener("click", () => {
      if (expandedProviders.size > 0) {
        expandedProviders.clear();
      } else {
        const configured = settings.queueOrder.filter(
          (id) => id === "custom" ? Boolean(settings.customEnabled) : Boolean(presenceMap[id])
        );
        const targets = configured.length > 0 ? configured : [settings.queueOrder[0] || "groq"];
        for (const id of targets) expandedProviders.add(id);
      }
      providerListHidden = false;
      renderProviderQueue();
    });
    toggleSectionBtn?.addEventListener("click", () => {
      providerListHidden = !providerListHidden;
      renderProviderSummaryAndControls();
    });
    function renderCacheTable() {
      cacheTbody.textContent = "";
      if (!cacheList || cacheList.length === 0) {
        cacheEmpty.style.display = "block";
        cacheEmpty.textContent = "No transcripts cached yet. Open a Video Overview in NotebookLM or sign in above to pull synced transcripts.";
        cacheTableWrap.style.display = "none";
        if (exportAllVaultBtn) exportAllVaultBtn.style.display = "none";
        return;
      }
      if (exportAllVaultBtn) exportAllVaultBtn.style.display = "inline-flex";
      const q = cacheFilterQuery.trim().toLowerCase();
      const visibleItems = !q ? cacheList.map((item) => ({ item, cueMatches: [] })) : cacheList.map((item) => {
        const titleHit = String(item.title || "").toLowerCase().includes(q) || String(item.provider || "").toLowerCase().includes(q);
        const cueMatches = searchCues(item.cues || [], q);
        return titleHit || cueMatches.length > 0 ? { item, cueMatches } : null;
      }).filter(Boolean);
      if (visibleItems.length === 0) {
        cacheEmpty.style.display = "block";
        cacheEmpty.textContent = "No transcripts or spoken lines match your search.";
        cacheTableWrap.style.display = "none";
        return;
      }
      cacheEmpty.style.display = "none";
      cacheTableWrap.style.display = "block";
      const makeFormatButton = (item, label, fmt) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn btn-sm";
        b.textContent = label;
        b.addEventListener("click", () => {
          const { content, filename, mimeType } = serializeSubtitles(
            item.cues || [],
            fmt,
            {
              title: item.title,
              language: item.language || "en",
              provider: item.provider,
              model: item.model,
              artifactId: item.artifactId
            }
          );
          downloadFile(content, filename, mimeType);
        });
        return b;
      };
      for (const { item, cueMatches } of visibleItems) {
        const tr = document.createElement("tr");
        const tdTitle = document.createElement("td");
        const titleDiv = document.createElement("div");
        titleDiv.style.fontWeight = "600";
        titleDiv.textContent = item.title || "Video Overview";
        tdTitle.appendChild(titleDiv);
        if (cueMatches.length > 0) {
          const matchSub = document.createElement("div");
          matchSub.className = "hint";
          matchSub.style.color = "var(--accent)";
          matchSub.textContent = `${cueMatches.length} matching spoken line${cueMatches.length === 1 ? "" : "s"}`;
          tdTitle.appendChild(matchSub);
        }
        const tdProv = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = item.failoverUsed ? `${item.provider} (failover)` : item.provider || "manual";
        tdProv.appendChild(badge);
        const tdSlim = document.createElement("td");
        tdSlim.style.fontFamily = "var(--font-mono)";
        tdSlim.style.fontSize = "11.5px";
        const byteStats = resolveAvoidedVideoBytes({
          originalBytes: item.originalBytes,
          extractedBytes: item.extractedBytes,
          durationSeconds: item.durationSeconds,
          cues: item.cues
        });
        if (byteStats.originalBytes > 0 && byteStats.extractedBytes > 0) {
          const savedPct = Math.max(
            0,
            Math.round((1 - byteStats.extractedBytes / byteStats.originalBytes) * 100)
          );
          const speedStr = item.latencyMs ? `, ${(item.latencyMs / 1e3).toFixed(1)}s` : "";
          tdSlim.textContent = `${(byteStats.extractedBytes / 1048576).toFixed(1)} MB (-${savedPct}%)${speedStr}`;
        } else {
          tdSlim.textContent = "n/a";
        }
        const tdCues = document.createElement("td");
        tdCues.style.fontFamily = "var(--font-mono)";
        tdCues.textContent = String(item.cueCount || item.cues?.length || 0);
        const tdActions = document.createElement("td");
        const actRow = document.createElement("div");
        actRow.className = "row";
        actRow.style.flexWrap = "wrap";
        const isEditing = editingCacheKey === item.cacheKey;
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn btn-sm";
        editBtn.textContent = isEditing ? "Close" : "Edit cues";
        editBtn.addEventListener("click", () => {
          editingCacheKey = isEditing ? null : item.cacheKey;
          renderCacheTable();
        });
        const srtBtn = makeFormatButton(item, ".SRT", "srt");
        const vttBtn = makeFormatButton(item, ".VTT", "vtt");
        const txtBtn = makeFormatButton(item, ".TXT", "txt");
        const mdBtn = makeFormatButton(item, ".MD", "md");
        const jsonBtn = makeFormatButton(item, ".JSON", "json");
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "btn btn-sm";
        copyBtn.textContent = "Copy";
        copyBtn.addEventListener("click", async () => {
          const txt = formatTxt(item.cues || [], {
            includeTimestamps: true,
            title: item.title
          });
          try {
            await navigator.clipboard.writeText(txt);
            copyBtn.textContent = "Copied";
          } catch {
            const { content, filename, mimeType } = serializeSubtitles(
              item.cues || [],
              "txt",
              { title: item.title }
            );
            downloadFile(content, filename, mimeType);
            copyBtn.textContent = "Saved";
          }
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 1200);
        });
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn btn-sm btn-danger";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", async () => {
          await deleteCachedSubtitles(item.cacheKey);
          cacheList = await getSubtitleCacheList();
          await triggerAutoSyncIfConnected({ deletedCacheKeys: [item.cacheKey] });
          renderCacheTable();
          renderStatisticsPanel();
        });
        actRow.append(editBtn, srtBtn, vttBtn, txtBtn, mdBtn, jsonBtn, copyBtn, delBtn);
        tdActions.appendChild(actRow);
        tr.append(tdTitle, tdProv, tdSlim, tdCues, tdActions);
        cacheTbody.appendChild(tr);
        if (isEditing) {
          const editTr = document.createElement("tr");
          const editTd = document.createElement("td");
          editTd.colSpan = 5;
          editTd.style.background = "var(--bg-canvas)";
          const editorWrap = document.createElement("div");
          editorWrap.style.display = "grid";
          editorWrap.style.gap = "8px";
          const topBar = document.createElement("div");
          topBar.className = "row";
          topBar.style.justifyContent = "space-between";
          const titleInput = document.createElement("input");
          titleInput.type = "text";
          titleInput.value = item.title || "Video Overview";
          titleInput.style.maxWidth = "340px";
          const saveEditsBtn = document.createElement("button");
          saveEditsBtn.type = "button";
          saveEditsBtn.className = "btn btn-sm btn-primary";
          saveEditsBtn.textContent = "Save cue edits";
          const errLine = document.createElement("div");
          errLine.className = "status-line";
          const cueRowsBox = document.createElement("div");
          cueRowsBox.className = "ext-cue-editor";
          const draftRows = (item.cues || []).map((c) => ({
            start: formatTimestamp(c.startSec, "."),
            end: formatTimestamp(c.endSec, "."),
            text: String(c.text || ""),
            speaker: c.speaker || ""
          }));
          const rebuildRowsDom = () => {
            cueRowsBox.textContent = "";
            draftRows.forEach((dr, idx) => {
              const rowEl = document.createElement("div");
              rowEl.className = "ext-cue-row";
              const sIn = document.createElement("input");
              sIn.type = "text";
              sIn.className = "mono-input";
              sIn.value = dr.start;
              sIn.addEventListener("input", () => {
                dr.start = sIn.value;
              });
              const eIn = document.createElement("input");
              eIn.type = "text";
              eIn.className = "mono-input";
              eIn.value = dr.end;
              eIn.addEventListener("input", () => {
                dr.end = eIn.value;
              });
              const tIn = document.createElement("input");
              tIn.type = "text";
              tIn.value = dr.text;
              tIn.addEventListener("input", () => {
                dr.text = tIn.value;
              });
              const rmBtn = document.createElement("button");
              rmBtn.type = "button";
              rmBtn.className = "btn btn-sm btn-danger";
              rmBtn.textContent = "Remove";
              rmBtn.addEventListener("click", () => {
                draftRows.splice(idx, 1);
                rebuildRowsDom();
              });
              rowEl.append(sIn, eIn, tIn, rmBtn);
              cueRowsBox.appendChild(rowEl);
            });
          };
          rebuildRowsDom();
          saveEditsBtn.addEventListener("click", async () => {
            const nextCues = [];
            for (const dr of draftRows) {
              const txt = String(dr.text || "").trim();
              if (!txt) continue;
              const s = parseTimestampSec(dr.start);
              const e = parseTimestampSec(dr.end);
              if (!Number.isFinite(s) || !Number.isFinite(e)) {
                errLine.dataset.kind = "err";
                errLine.textContent = "Enter valid HH:MM:SS.mmm timestamps.";
                return;
              }
              nextCues.push({
                startSec: s,
                endSec: Math.max(s + 0.25, e),
                text: txt,
                ...dr.speaker ? { speaker: dr.speaker } : {}
              });
            }
            saveEditsBtn.disabled = true;
            const res = await sendRuntime({
              type: RUNTIME_MESSAGE.UPDATE_CACHED_SUBTITLES,
              cacheKey: item.cacheKey,
              title: titleInput.value.trim(),
              cues: nextCues
            });
            saveEditsBtn.disabled = false;
            if (!res?.ok) {
              errLine.dataset.kind = "err";
              errLine.textContent = res?.error || "Could not save edits.";
              return;
            }
            editingCacheKey = null;
            await reloadAllLocalState();
            flashSavedPill();
          });
          topBar.append(titleInput, saveEditsBtn);
          editorWrap.append(topBar, errLine, cueRowsBox);
          editTd.appendChild(editorWrap);
          editTr.appendChild(editTd);
          cacheTbody.appendChild(editTr);
        }
      }
    }
    exportAllVaultBtn?.addEventListener("click", () => {
      if (!cacheList || cacheList.length === 0) return;
      const bundle = {
        schema: "lm-subs-vault/v1",
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        count: cacheList.length,
        transcripts: cacheList
      };
      downloadFile(
        `${JSON.stringify(bundle, null, 2)}
`,
        `lm-subs-vault-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`,
        "application/json;charset=utf-8"
      );
    });
    populateForm();
    renderSyncPanel();
    renderProviderQueue();
    renderNotificationsPanel();
    renderCacheTable();
    renderStatisticsPanel();
    cacheSearchInput?.addEventListener("input", () => {
      cacheFilterQuery = cacheSearchInput.value || "";
      renderCacheTable();
    });
    async function saveNotificationToggles() {
      settings = await saveSettings({
        desktopNotifications: Boolean(optDesktopNotifications?.checked),
        badgeAlerts: Boolean(optBadgeAlerts?.checked),
        soundAlerts: Boolean(optSoundAlerts?.checked),
        notifyOnFailover: Boolean(optNotifyFailover?.checked),
        notifyOnSync: Boolean(optNotifySync?.checked)
      });
      flashSavedPill();
      await sendRuntime({ type: RUNTIME_MESSAGE.GET_NOTIFICATIONS });
    }
    optDesktopNotifications?.addEventListener("change", async () => {
      if (optDesktopNotifications.checked && chrome.permissions?.request) {
        try {
          await chrome.permissions.request({ permissions: ["notifications"] });
        } catch {
        }
      }
      await saveNotificationToggles();
    });
    optBadgeAlerts?.addEventListener("change", saveNotificationToggles);
    optSoundAlerts?.addEventListener("change", saveNotificationToggles);
    optNotifyFailover?.addEventListener("change", saveNotificationToggles);
    optNotifySync?.addEventListener("change", saveNotificationToggles);
    optTestNotifBtn?.addEventListener("click", async () => {
      if (chrome.permissions?.request) {
        try {
          await chrome.permissions.request({ permissions: ["notifications"] });
        } catch {
        }
      }
      if (optDesktopNotifications) optDesktopNotifications.checked = true;
      settings = await saveSettings({ desktopNotifications: true });
      await sendRuntime({ type: RUNTIME_MESSAGE.TEST_DESKTOP_NOTIFICATION });
      notifications = await getNotifications();
      renderNotificationsPanel();
    });
    optMarkNotifReadBtn?.addEventListener("click", async () => {
      const res = await sendRuntime({
        type: RUNTIME_MESSAGE.MARK_NOTIFICATIONS_READ
      });
      notifications = res?.notifications || await getNotifications();
      renderNotificationsPanel();
    });
    optClearNotifBtn?.addEventListener("click", async () => {
      await sendRuntime({ type: RUNTIME_MESSAGE.CLEAR_NOTIFICATIONS });
      notifications = [];
      renderNotificationsPanel();
    });
    function openWebLocalCodePage() {
      const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
      const url = `${base}/?view=library&ext_connect=1`;
      if (chrome.tabs?.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      setSyncFeedback(
        "Sign in on the opened page, copy the local code at the top, and paste it into the open box above.",
        ""
      );
    }
    function openHostedOAuth(provider) {
      const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
      const url = `${base}/api/auth/oauth/${provider}?device=chrome-extension&next=${encodeURIComponent(
        "/?view=library&ext_connect=1"
      )}`;
      if (chrome.tabs?.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      setSyncFeedback(
        `Complete ${provider === "google" ? "Google" : "GitHub"} sign-in in the opened tab, then copy your local code from the top of the library into the open box above.`,
        ""
      );
    }
    syncGetWebCodeBtn?.addEventListener("click", openWebLocalCodePage);
    syncGoogleBtn?.addEventListener("click", () => openHostedOAuth("google"));
    syncGithubBtn?.addEventListener("click", () => openHostedOAuth("github"));
    syncCopyLocalCodeBtn?.addEventListener("click", async () => {
      const digits = syncLocalCodeDigits?.textContent?.trim() || "";
      if (!digits) return;
      try {
        await navigator.clipboard.writeText(digits);
        syncCopyLocalCodeBtn.textContent = "Copied";
        setTimeout(() => {
          syncCopyLocalCodeBtn.textContent = "Copy";
        }, 1500);
      } catch {
      }
    });
    syncSendCodeBtn?.addEventListener("click", async () => {
      const email = (syncEmailInput?.value || "").trim().toLowerCase();
      if (!email) {
        setSyncFeedback("Enter your email address first.", "err");
        syncEmailInput?.focus();
        return;
      }
      const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
      const granted = await requestSyncServerOrigin(base);
      if (!granted) {
        setSyncFeedback("Permission denied for LM Subs sync service.", "err");
        return;
      }
      syncSendCodeBtn.disabled = true;
      setSyncFeedback("Sending 6-digit verification code\u2026", "");
      const res = await sendRuntime({
        type: RUNTIME_MESSAGE.SYNC_EMAIL_SEND_CODE,
        email
      });
      syncSendCodeBtn.disabled = false;
      if (!res?.ok) {
        setSyncFeedback(res?.error || "Could not send verification code.", "err");
        return;
      }
      if (res.delivery === "preview" && res.previewCode) {
        if (syncLocalCodePreview && syncLocalCodeDigits) {
          syncLocalCodeDigits.textContent = res.previewCode;
          syncLocalCodePreview.style.display = "flex";
        }
        if (syncCodeInput) syncCodeInput.value = res.previewCode;
        if (syncTokenInput) syncTokenInput.value = res.previewCode;
        setSyncFeedback(
          `Local sign-in code ready: ${res.previewCode}. Click Connect code or Verify to finish signing in.`,
          "ok"
        );
      } else {
        if (syncLocalCodePreview) syncLocalCodePreview.style.display = "none";
        setSyncFeedback(
          `Sent a 6-digit code to ${email}. Enter it in either open code box above.`,
          "ok"
        );
      }
      syncCodeInput?.focus();
    });
    async function verifyCodeOrSessionToken(rawInput, triggerButton) {
      const cleaned = String(rawInput || "").trim();
      if (!cleaned) {
        setSyncFeedback("Paste your lms_ local code or 6-digit email code first.", "err");
        return;
      }
      const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
      const granted = await requestSyncServerOrigin(base);
      if (!granted) {
        setSyncFeedback("Permission denied for LM Subs sync service.", "err");
        return;
      }
      const compactDigits = cleaned.replace(/\s+/g, "");
      if (/^\d{6}$/.test(compactDigits)) {
        const email = (syncEmailInput?.value || "").trim().toLowerCase();
        if (!email) {
          setSyncFeedback("Enter the email address for this 6-digit code.", "err");
          syncEmailInput?.focus();
          return;
        }
        if (triggerButton) triggerButton.disabled = true;
        setSyncFeedback("Verifying 6-digit code\u2026", "");
        const res2 = await sendRuntime({
          type: RUNTIME_MESSAGE.SYNC_EMAIL_VERIFY_CODE,
          email,
          code: compactDigits,
          syncPreferences: {
            syncApiKeys: Boolean(syncPrefKeys?.checked),
            syncTranscripts: Boolean(syncPrefTranscripts?.checked),
            syncSettings: Boolean(syncPrefSettings?.checked)
          }
        });
        if (triggerButton) triggerButton.disabled = false;
        if (!res2?.ok) {
          setSyncFeedback(res2?.error || "Invalid or expired code.", "err");
          return;
        }
        if (syncCodeInput) syncCodeInput.value = "";
        if (syncTokenInput) syncTokenInput.value = "";
        if (syncLocalCodePreview) syncLocalCodePreview.style.display = "none";
        await reloadAllLocalState();
        setSyncFeedback("Signed in and synced opted-in categories.", "ok");
        return;
      }
      if (triggerButton) triggerButton.disabled = true;
      setSyncFeedback("Connecting local extension code\u2026", "");
      const res = await sendRuntime({
        type: RUNTIME_MESSAGE.SYNC_SIGNIN,
        token: cleaned,
        syncPreferences: {
          syncApiKeys: Boolean(syncPrefKeys?.checked),
          syncTranscripts: Boolean(syncPrefTranscripts?.checked),
          syncSettings: Boolean(syncPrefSettings?.checked)
        }
      });
      if (triggerButton) triggerButton.disabled = false;
      if (!res?.ok) {
        setSyncFeedback(res?.error || "Invalid or expired local code.", "err");
        return;
      }
      if (syncTokenInput) syncTokenInput.value = "";
      if (syncCodeInput) syncCodeInput.value = "";
      await reloadAllLocalState();
      setSyncFeedback("Connected Chrome extension and synced your account.", "ok");
    }
    syncTokenBtn?.addEventListener("click", () => {
      verifyCodeOrSessionToken(syncTokenInput?.value, syncTokenBtn);
    });
    syncTokenInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        verifyCodeOrSessionToken(syncTokenInput.value, syncTokenBtn);
      }
    });
    syncVerifyCodeBtn?.addEventListener("click", () => {
      verifyCodeOrSessionToken(syncCodeInput?.value, syncVerifyCodeBtn);
    });
    syncCodeInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        verifyCodeOrSessionToken(syncCodeInput.value, syncVerifyCodeBtn);
      }
    });
    async function saveSyncOptInPreferences() {
      const nextPrefs = {
        syncApiKeys: Boolean(syncPrefKeys?.checked),
        syncTranscripts: Boolean(syncPrefTranscripts?.checked),
        syncSettings: Boolean(syncPrefSettings?.checked)
      };
      const res = await sendRuntime({
        type: RUNTIME_MESSAGE.SYNC_SAVE_PREFERENCES,
        syncPreferences: nextPrefs,
        purgeDisabled: true
      });
      if (res?.ok) {
        syncProfile = res.profile || syncProfile;
        renderSyncPanel();
        setSyncFeedback("Updated sync preferences.", "ok");
      } else {
        setSyncFeedback(res?.error || "Could not update sync preferences.", "err");
      }
    }
    syncPrefKeys?.addEventListener("change", saveSyncOptInPreferences);
    syncPrefTranscripts?.addEventListener("change", saveSyncOptInPreferences);
    syncPrefSettings?.addEventListener("change", saveSyncOptInPreferences);
    syncOpenWebStatsBtn?.addEventListener("click", () => {
      const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
      const url = `${base}/?view=stats`;
      if (chrome.tabs?.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });
    refreshStatsBtn?.addEventListener("click", () => {
      renderStatisticsPanel();
    });
    syncNowBtn?.addEventListener("click", async () => {
      syncNowBtn.disabled = true;
      syncNowBtn.textContent = "Syncing\u2026";
      setSyncFeedback("Synchronizing opted-in data\u2026", "");
      const res = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_NOW });
      syncNowBtn.disabled = false;
      syncNowBtn.textContent = "Sync now";
      if (res?.ok) {
        await reloadAllLocalState();
        setSyncFeedback("Synchronized opted-in categories.", "ok");
      } else {
        setSyncFeedback(res?.error || "Sync failed.", "err");
      }
    });
    syncSignoutBtn?.addEventListener("click", async () => {
      await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_SIGNOUT });
      await reloadAllLocalState();
      setSyncFeedback("Signed out. Local keys and cached transcripts remain in this browser.", "");
    });
    optEnabled.addEventListener("change", async () => {
      settings = await saveSettings({ enabled: optEnabled.checked });
      flashSavedPill();
      await triggerAutoSyncIfConnected({ pushOnly: true });
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
        captionStyle: optCaptionStyle ? optCaptionStyle.value : settings.captionStyle,
        subtitleOffsetSec: Number(optOffsetSec.value) || 0,
        excludePatterns: patterns
      });
      flashSavedPill();
      await triggerAutoSyncIfConnected({ pushOnly: true });
    });
    clearCacheBtn.addEventListener("click", async () => {
      await clearAllCachedSubtitles();
      cacheList = [];
      renderCacheTable();
      renderStatisticsPanel();
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
      await triggerAutoSyncIfConnected({ pushOnly: true });
    });
    async function refreshDiagnosticsPanel() {
      if (!debugLogViewer) return;
      const report = await sendRuntime({
        type: RUNTIME_MESSAGE.GET_DEBUG_REPORT
      });
      if (!report?.ok) {
        debugLogViewer.textContent = report?.error || "Unable to fetch diagnostic report from Service Worker.";
        return;
      }
      missingOriginsForOptions = report.missingOrigins || [];
      if (optPermBadge) {
        if (report.permissionsOk) {
          optPermBadge.textContent = "Google CDN: OK";
          optPermBadge.className = "badge badge-saved";
          if (optGrantPermsBtn) optGrantPermsBtn.style.display = "none";
        } else {
          optPermBadge.textContent = "Permissions withheld";
          optPermBadge.className = "badge badge-err";
          if (optGrantPermsBtn) optGrantPermsBtn.style.display = "inline-flex";
        }
      }
      debugLogViewer.textContent = report.reportText || "(empty)";
    }
    optDebugMode?.addEventListener("change", async () => {
      settings = await saveSettings({ debugMode: optDebugMode.checked });
      flashSavedPill();
      await refreshDiagnosticsPanel();
    });
    optGrantPermsBtn?.addEventListener("click", async () => {
      if (!chrome.permissions?.request || missingOriginsForOptions.length === 0) return;
      try {
        await chrome.permissions.request({ origins: missingOriginsForOptions });
        await refreshDiagnosticsPanel();
      } catch {
      }
    });
    optRefreshDebugBtn?.addEventListener("click", () => {
      refreshDiagnosticsPanel();
    });
    optCopyDebugBtn?.addEventListener("click", async () => {
      const report = await sendRuntime({
        type: RUNTIME_MESSAGE.GET_DEBUG_REPORT
      });
      const text = report?.reportText || "";
      try {
        await navigator.clipboard.writeText(text);
        optCopyDebugBtn.textContent = "Copied";
      } catch {
        optCopyDebugBtn.textContent = "Failed";
      }
      setTimeout(() => {
        optCopyDebugBtn.textContent = "Copy redacted report";
      }, 1600);
    });
    optClearDebugBtn?.addEventListener("click", async () => {
      await sendRuntime({ type: RUNTIME_MESSAGE.CLEAR_DEBUG_LOGS });
      await refreshDiagnosticsPanel();
    });
    try {
      chrome.storage?.onChanged?.addListener(async (changes, areaName) => {
        if (areaName !== "local") return;
        if (changes.notifications) {
          notifications = await getNotifications();
          renderNotificationsPanel();
        }
        if (changes.subtitleCache) {
          cacheList = await getSubtitleCacheList();
          renderCacheTable();
        }
      });
    } catch {
    }
    refreshDiagnosticsPanel();
  }
  document.addEventListener("DOMContentLoaded", initOptions);
})();

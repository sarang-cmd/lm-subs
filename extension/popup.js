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
  function listProviderSpecs() {
    return DEFAULT_QUEUE_ORDER.map((id) => PROVIDERS[id]);
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
  async function getSubtitleCacheList(storageArea) {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.SUBTITLE_CACHE);
    const list = raw?.[STORAGE_KEYS.SUBTITLE_CACHE];
    return Array.isArray(list) ? list : [];
  }
  async function getLastStatus(storageArea) {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.LAST_STATUS);
    return raw?.[STORAGE_KEYS.LAST_STATUS] || null;
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

  // src/popup/popup.js
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
  function exportSubtitleEntry(entry, format = "srt") {
    if (!entry?.cues?.length) return;
    const { content, filename, mimeType } = serializeSubtitles(entry.cues, format, {
      title: entry.title,
      language: entry.language || "en",
      provider: entry.provider,
      model: entry.model,
      artifactId: entry.artifactId
    });
    const blob = new Blob(["\uFEFF", content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3e3);
  }
  async function initPopup() {
    const iconSlot = document.getElementById("brand-icon-slot");
    iconSlot?.appendChild(createBrandMarkSvg(document, 24));
    const enabledToggle = document.getElementById("enabled-toggle");
    const providersDisclosure = document.getElementById("popup-providers-disclosure");
    const queueSummaryText = document.getElementById("queue-summary-text");
    const openQueueBtn = document.getElementById("open-queue-btn");
    const openOptionsBtn = document.getElementById("open-options-btn");
    const providerSelect = document.getElementById("provider-select");
    const keyPresenceBadge = document.getElementById("key-presence-badge");
    const providerTierHint = document.getElementById("provider-tier-hint");
    const customUrlField = document.getElementById("custom-url-field");
    const customUrlInput = document.getElementById("custom-url-input");
    const getKeyLink = document.getElementById("get-key-link");
    const apiKeyInput = document.getElementById("api-key-input");
    const saveKeyBtn = document.getElementById("save-key-btn");
    const testKeyBtn = document.getElementById("test-key-btn");
    const keyFeedback = document.getElementById("key-feedback");
    const popupSyncBadge = document.getElementById("popup-sync-badge");
    const popupSyncSummary = document.getElementById("popup-sync-summary");
    const popupSyncNowBtn = document.getElementById("popup-sync-now-btn");
    const popupGetCodeBtn = document.getElementById("popup-get-code-btn");
    const popupOpenSyncBtn = document.getElementById("popup-open-sync-btn");
    const popupLocalCodeRow = document.getElementById("popup-local-code-row");
    const popupLocalCodeInput = document.getElementById("popup-local-code-input");
    const popupConnectCodeBtn = document.getElementById("popup-connect-code-btn");
    const popupSyncFeedback = document.getElementById("popup-sync-feedback");
    const tabBadge = document.getElementById("tab-badge");
    const tabDescription = document.getElementById("tab-description");
    const generateNowBtn = document.getElementById("generate-now-btn");
    const popupExportBar = document.getElementById("popup-export-bar");
    const popupExportSource = document.getElementById("popup-export-source");
    const downloadLatestSrtBtn = document.getElementById("download-latest-srt-btn");
    const downloadLatestVttBtn = document.getElementById("download-latest-vtt-btn");
    const downloadLatestTxtBtn = document.getElementById("download-latest-txt-btn");
    const downloadLatestMdBtn = document.getElementById("download-latest-md-btn");
    const downloadLatestJsonBtn = document.getElementById("download-latest-json-btn");
    const copyLatestTxtBtn = document.getElementById("copy-latest-txt-btn");
    const popupNotifBadge = document.getElementById("popup-notif-badge");
    const popupNotifSummary = document.getElementById("popup-notif-summary");
    const popupEnableOsNotifBtn = document.getElementById("popup-enable-os-notif-btn");
    const popupMarkReadBtn = document.getElementById("popup-mark-read-btn");
    const popupClearNotifBtn = document.getElementById("popup-clear-notif-btn");
    const popupNotifList = document.getElementById("popup-notif-list");
    const lastStatusCard = document.getElementById("last-status-card");
    const lastStatusBadge = document.getElementById("last-status-badge");
    const lastStatusTitle = document.getElementById("last-status-title");
    const lastStatusMeta = document.getElementById("last-status-meta");
    const permWarningCard = document.getElementById("permission-warning-card");
    const grantGooglePermsBtn = document.getElementById("grant-google-perms-btn");
    const debugModeToggle = document.getElementById("debug-mode-toggle");
    const copyDebugBtn = document.getElementById("copy-debug-btn");
    const specs = listProviderSpecs();
    for (const spec of specs) {
      const opt = document.createElement("option");
      opt.value = spec.id;
      opt.textContent = `${spec.name} (${spec.badge})`;
      providerSelect.appendChild(opt);
    }
    let [settings, presenceMap, lastStatus, cacheList, syncProfile, notifications] = await Promise.all([
      getSettings(),
      getSavedKeyPresenceMap(),
      getLastStatus(),
      getSubtitleCacheList(),
      getCloudSyncProfile(),
      getNotifications()
    ]);
    let activeTabId = null;
    let activeTabDiagnostics = null;
    let activeTabSubtitles = null;
    let missingGoogleOrigins = [];
    let initialDisclosureSet = false;
    function resolveExportTarget() {
      if (activeTabSubtitles?.cues?.length > 0) {
        return activeTabSubtitles;
      }
      if (cacheList.length > 0 && cacheList[0]?.cues?.length > 0) {
        return cacheList[0];
      }
      return null;
    }
    function renderExportBar() {
      if (!popupExportBar) return;
      const target = resolveExportTarget();
      if (!target) {
        popupExportBar.style.display = "none";
        return;
      }
      popupExportBar.style.display = "block";
      if (popupExportSource) {
        popupExportSource.textContent = `${target.title || "Video Overview"} (${target.cues.length})`;
      }
    }
    async function inspectGoogleHostPermissions() {
      if (!chrome.permissions?.contains) return;
      const required = [
        "https://*.googleusercontent.com/*",
        "https://*.google.com/*",
        "https://*.googlevideo.com/*",
        "https://*.usercontent.google.com/*"
      ];
      const missing = [];
      for (const origin of required) {
        try {
          const ok = await chrome.permissions.contains({ origins: [origin] });
          if (!ok) missing.push(origin);
        } catch {
        }
      }
      missingGoogleOrigins = missing;
      if (permWarningCard) {
        permWarningCard.style.display = missing.length > 0 ? "block" : "none";
      }
    }
    function renderQueueSummary() {
      const activeIds = settings.queueOrder.filter(
        (id) => id === "custom" ? settings.customEnabled : presenceMap[id]
      );
      const guideEl = document.getElementById("beginner-guide-details");
      if (activeIds.length === 0) {
        queueSummaryText.textContent = "Add Groq or Mistral key";
        if (guideEl) guideEl.open = true;
        if (providersDisclosure && !initialDisclosureSet) {
          providersDisclosure.open = true;
          initialDisclosureSet = true;
        }
      } else {
        queueSummaryText.textContent = activeIds.slice(0, 3).map((id, i) => `#${i + 1} ${getProviderSpec(id).name.split(" ")[0]}`).join(" -> ");
        if (guideEl) guideEl.open = false;
        if (providersDisclosure && !initialDisclosureSet) {
          providersDisclosure.open = false;
          initialDisclosureSet = true;
        }
      }
    }
    function renderSelectedProvider() {
      const selectedId = providerSelect.value;
      const spec = getProviderSpec(selectedId);
      providerTierHint.textContent = spec.freeTierSummary;
      apiKeyInput.placeholder = spec.keyPlaceholder;
      getKeyLink.href = spec.keyUrl;
      getKeyLink.textContent = spec.id === "custom" ? "Local server docs" : "Get free key";
      customUrlField.style.display = spec.id === "custom" ? "block" : "none";
      customUrlInput.value = settings.customBaseUrl || "";
      const isConfigured = spec.id === "custom" ? settings.customEnabled : Boolean(presenceMap[spec.id]);
      if (isConfigured) {
        keyPresenceBadge.textContent = spec.id === "custom" ? "Enabled" : "Saved";
        keyPresenceBadge.className = "badge badge-saved";
      } else {
        keyPresenceBadge.textContent = "Not set";
        keyPresenceBadge.className = "badge";
      }
      keyFeedback.textContent = "";
      keyFeedback.dataset.kind = "";
    }
    function renderSyncStatus() {
      if (!popupSyncBadge || !popupSyncSummary) return;
      if (syncProfile?.connected && syncProfile.user?.email) {
        popupSyncBadge.textContent = "Synced";
        popupSyncBadge.className = "badge badge-saved";
        const keyCount = Object.keys(syncProfile.keyHints || {}).length;
        popupSyncSummary.textContent = `${syncProfile.user.email} (${keyCount} key(s), ${syncProfile.subtitleCount || 0} transcript(s))`;
        if (popupSyncNowBtn) popupSyncNowBtn.style.display = "inline-flex";
        if (popupGetCodeBtn) popupGetCodeBtn.style.display = "none";
        if (popupLocalCodeRow) popupLocalCodeRow.style.display = "none";
        if (popupOpenSyncBtn) popupOpenSyncBtn.textContent = "Account";
      } else {
        popupSyncBadge.textContent = "Signed out";
        popupSyncBadge.className = "badge";
        popupSyncSummary.textContent = "Paste your local code below or click Get code to sign in with Google, GitHub, or email.";
        if (popupSyncNowBtn) popupSyncNowBtn.style.display = "none";
        if (popupGetCodeBtn) popupGetCodeBtn.style.display = "inline-flex";
        if (popupLocalCodeRow) popupLocalCodeRow.style.display = "block";
        if (popupOpenSyncBtn) popupOpenSyncBtn.textContent = "Settings";
      }
    }
    function renderLastStatus() {
      if (!lastStatus) {
        lastStatusCard.style.display = "none";
        return;
      }
      lastStatusCard.style.display = "block";
      lastStatusTitle.textContent = lastStatus.title || "Video Overview";
      if (lastStatus.state === "success") {
        lastStatusBadge.textContent = lastStatus.failoverUsed ? `${lastStatus.provider} (failover)` : lastStatus.provider || "Ready";
        lastStatusBadge.className = "badge badge-saved";
        const speedPart = lastStatus.latencyMs ? `, ${(lastStatus.latencyMs / 1e3).toFixed(1)}s` : "";
        const byteStats = resolveAvoidedVideoBytes({
          originalBytes: lastStatus.originalBytes,
          extractedBytes: lastStatus.extractedBytes
        });
        const avoidedPart = byteStats.savedBytes > 0 ? `, ${(byteStats.savedBytes / 1048576).toFixed(1)} MB avoided` : "";
        lastStatusMeta.textContent = `${lastStatus.cueCount || 0} cues${speedPart}${avoidedPart}`;
      } else if (lastStatus.state === "working") {
        lastStatusBadge.textContent = "Working";
        lastStatusBadge.className = "badge badge-warn";
        lastStatusMeta.textContent = lastStatus.message || "Transcribing\u2026";
      } else {
        lastStatusBadge.textContent = "Error";
        lastStatusBadge.className = "badge badge-err";
        lastStatusMeta.textContent = lastStatus.message || "Failed";
      }
      renderExportBar();
    }
    async function inspectActiveTab() {
      if (!chrome.tabs?.query) return;
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs?.[0];
      let host = "";
      try {
        host = tab?.url ? new URL(tab.url).hostname : "";
      } catch {
        host = "";
      }
      if (!tab?.id || !NOTEBOOKLM_HOSTS.includes(host)) {
        tabBadge.textContent = "Standby";
        tabBadge.className = "badge";
        generateNowBtn.disabled = true;
        return;
      }
      activeTabId = tab.id;
      chrome.tabs.sendMessage(
        tab.id,
        { type: RUNTIME_MESSAGE.GET_ACTIVE_TAB_STATE },
        (state) => {
          if (chrome.runtime.lastError || !state?.ok) {
            tabBadge.textContent = "NotebookLM";
            tabBadge.className = "badge";
            tabDescription.textContent = "Reload the NotebookLM tab once if you recently installed LM Subs.";
            generateNowBtn.disabled = false;
            return;
          }
          if (state.diagnostics) {
            activeTabDiagnostics = state.diagnostics;
          }
          if (state.activeSubtitles?.cues?.length > 0) {
            activeTabSubtitles = state.activeSubtitles;
            renderExportBar();
          }
          if (state.hasVideoElement || state.readyArtifactCount > 0) {
            tabBadge.textContent = `${Math.max(1, state.readyArtifactCount)} ready`;
            tabBadge.className = "badge badge-saved";
            tabDescription.textContent = state.activeArtifact?.title ? `Video: "${state.activeArtifact.title}"` : "Video Overview ready for captioning.";
            generateNowBtn.disabled = false;
          } else if (state.generatingCount > 0) {
            tabBadge.textContent = "Rendering";
            tabBadge.className = "badge badge-warn";
            tabDescription.textContent = "Studio is rendering the Video Overview. Captions start automatically when ready.";
            generateNowBtn.disabled = true;
          } else {
            tabBadge.textContent = "Idle";
            tabBadge.className = "badge";
            tabDescription.textContent = "Open a Video Overview in NotebookLM Studio to generate captions.";
            generateNowBtn.disabled = false;
          }
        }
      );
    }
    async function inspectOsNotificationPermission() {
      if (!popupEnableOsNotifBtn || !chrome.permissions?.contains) return;
      try {
        const granted = await chrome.permissions.contains({
          permissions: ["notifications"]
        });
        popupEnableOsNotifBtn.textContent = granted ? "Test desktop alert" : "Enable desktop alerts";
      } catch {
      }
    }
    function renderNotifications() {
      if (!popupNotifList) return;
      const list = Array.isArray(notifications) ? notifications : [];
      const unread = list.filter((n) => !n.read).length;
      if (popupNotifBadge) {
        popupNotifBadge.style.display = unread > 0 ? "inline-flex" : "none";
        popupNotifBadge.textContent = unread > 99 ? "99+" : String(unread);
      }
      if (popupNotifSummary) {
        popupNotifSummary.textContent = unread > 0 ? `${unread} unread` : list.length > 0 ? `${list.length} recent` : "No unread alerts";
      }
      popupNotifList.textContent = "";
      if (list.length === 0) {
        const empty = document.createElement("div");
        empty.className = "hint";
        empty.style.margin = "4px 0";
        empty.textContent = "Caption completions, failovers, and sync updates appear here.";
        popupNotifList.appendChild(empty);
        return;
      }
      for (const item of list.slice(0, 12)) {
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
        time.textContent = item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        }) : "";
        head.append(title, time);
        row.appendChild(head);
        if (item.body) {
          const body = document.createElement("div");
          body.className = "notif-row-body";
          body.textContent = item.body;
          row.appendChild(body);
        }
        popupNotifList.appendChild(row);
      }
    }
    enabledToggle.checked = settings.enabled;
    if (debugModeToggle) debugModeToggle.checked = Boolean(settings.debugMode);
    providerSelect.value = settings.primaryProvider || "groq";
    renderQueueSummary();
    renderSelectedProvider();
    renderSyncStatus();
    renderLastStatus();
    renderExportBar();
    renderNotifications();
    inspectOsNotificationPermission();
    inspectGoogleHostPermissions();
    inspectActiveTab();
    enabledToggle.addEventListener("change", async () => {
      settings = await saveSettings({ enabled: enabledToggle.checked });
    });
    debugModeToggle?.addEventListener("change", async () => {
      settings = await saveSettings({ debugMode: debugModeToggle.checked });
    });
    grantGooglePermsBtn?.addEventListener("click", async () => {
      if (!chrome.permissions?.request || missingGoogleOrigins.length === 0) return;
      try {
        const granted = await chrome.permissions.request({
          origins: missingGoogleOrigins
        });
        if (granted) {
          await inspectGoogleHostPermissions();
        }
      } catch {
      }
    });
    copyDebugBtn?.addEventListener("click", async () => {
      copyDebugBtn.disabled = true;
      const report = await sendRuntime({
        type: RUNTIME_MESSAGE.GET_DEBUG_REPORT,
        tabContext: activeTabDiagnostics
      });
      const text = report?.reportText || "No diagnostic data available.";
      try {
        await navigator.clipboard.writeText(text);
        copyDebugBtn.textContent = "Copied";
      } catch {
        copyDebugBtn.textContent = "Failed";
      }
      setTimeout(() => {
        copyDebugBtn.disabled = false;
        copyDebugBtn.textContent = "Report";
      }, 1600);
    });
    providerSelect.addEventListener("change", async () => {
      const nextProvider = providerSelect.value;
      settings = await saveSettings({ primaryProvider: nextProvider });
      renderQueueSummary();
      renderSelectedProvider();
    });
    saveKeyBtn.addEventListener("click", async () => {
      const providerId = providerSelect.value;
      const spec = getProviderSpec(providerId);
      const rawKey = apiKeyInput.value.trim();
      const customUrl = customUrlInput.value.trim();
      const granted = await requestProviderOrigin(providerId, customUrl);
      if (!granted) {
        keyFeedback.dataset.kind = "err";
        keyFeedback.textContent = `Host permission declined for ${spec.name}.`;
        return;
      }
      if (providerId === "custom") {
        settings = await saveSettings({
          customBaseUrl: customUrl || "http://localhost:8000/v1",
          customEnabled: true,
          primaryProvider: "custom"
        });
        if (rawKey) await setApiKey("custom", rawKey);
      } else {
        if (!rawKey) {
          keyFeedback.dataset.kind = "err";
          keyFeedback.textContent = `Paste a ${spec.name} API key first.`;
          return;
        }
        await setApiKey(providerId, rawKey);
        settings = await saveSettings({ primaryProvider: providerId });
      }
      apiKeyInput.value = "";
      presenceMap = await getSavedKeyPresenceMap();
      renderQueueSummary();
      renderSelectedProvider();
      if (providersDisclosure) providersDisclosure.open = false;
      keyFeedback.dataset.kind = "ok";
      keyFeedback.textContent = syncProfile?.connected ? `${spec.name} saved locally and syncing\u2026` : `${spec.name} saved and active in queue.`;
      if (syncProfile?.connected) {
        const syncRes = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_NOW });
        if (syncRes?.ok && syncRes.profile) {
          syncProfile = syncRes.profile;
          renderSyncStatus();
          keyFeedback.textContent = `${spec.name} saved and encrypted in Neon Postgres.`;
        }
      }
    });
    testKeyBtn.addEventListener("click", async () => {
      const providerId = providerSelect.value;
      const customUrl = customUrlInput.value.trim();
      await requestProviderOrigin(providerId, customUrl);
      testKeyBtn.disabled = true;
      keyFeedback.dataset.kind = "";
      keyFeedback.textContent = "Testing connection\u2026";
      const res = await sendRuntime({
        type: RUNTIME_MESSAGE.TEST_PROVIDER,
        providerId,
        unsavedApiKey: apiKeyInput.value.trim(),
        customBaseUrl: customUrl
      });
      testKeyBtn.disabled = false;
      if (res?.ok) {
        keyFeedback.dataset.kind = "ok";
        keyFeedback.textContent = `Verified ${res.providerName} (${res.latencyMs} ms).`;
      } else {
        keyFeedback.dataset.kind = "err";
        keyFeedback.textContent = res?.error || "Connection test failed.";
      }
    });
    popupGetCodeBtn?.addEventListener("click", () => {
      const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
      const url = `${base}/?view=library&ext_connect=1`;
      if (chrome.tabs?.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });
    async function handlePopupConnectLocalCode() {
      const token = (popupLocalCodeInput?.value || "").trim();
      if (!token) {
        if (popupSyncFeedback) {
          popupSyncFeedback.dataset.kind = "err";
          popupSyncFeedback.textContent = "Paste your lms_ local code first.";
        }
        popupLocalCodeInput?.focus();
        return;
      }
      const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
      const granted = await requestSyncServerOrigin(base);
      if (!granted) {
        if (popupSyncFeedback) {
          popupSyncFeedback.dataset.kind = "err";
          popupSyncFeedback.textContent = "Permission denied for sync service.";
        }
        return;
      }
      if (popupConnectCodeBtn) popupConnectCodeBtn.disabled = true;
      if (popupSyncFeedback) {
        popupSyncFeedback.dataset.kind = "";
        popupSyncFeedback.textContent = "Connecting local code\u2026";
      }
      const res = await sendRuntime({
        type: RUNTIME_MESSAGE.SYNC_SIGNIN,
        token
      });
      if (popupConnectCodeBtn) popupConnectCodeBtn.disabled = false;
      if (!res?.ok) {
        if (popupSyncFeedback) {
          popupSyncFeedback.dataset.kind = "err";
          popupSyncFeedback.textContent = res?.error || "Invalid or expired local code.";
        }
        return;
      }
      if (popupLocalCodeInput) popupLocalCodeInput.value = "";
      [settings, presenceMap, cacheList, syncProfile] = await Promise.all([
        getSettings(),
        getSavedKeyPresenceMap(),
        getSubtitleCacheList(),
        getCloudSyncProfile()
      ]);
      renderQueueSummary();
      renderSelectedProvider();
      renderSyncStatus();
      renderLastStatus();
      renderExportBar();
      if (popupSyncFeedback) {
        popupSyncFeedback.dataset.kind = "ok";
        popupSyncFeedback.textContent = "Connected and synced.";
      }
    }
    popupConnectCodeBtn?.addEventListener("click", handlePopupConnectLocalCode);
    popupLocalCodeInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handlePopupConnectLocalCode();
      }
    });
    popupSyncNowBtn?.addEventListener("click", async () => {
      popupSyncNowBtn.disabled = true;
      popupSyncNowBtn.textContent = "Syncing\u2026";
      const res = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_NOW });
      popupSyncNowBtn.disabled = false;
      popupSyncNowBtn.textContent = "Sync";
      if (res?.ok && res.profile) {
        syncProfile = res.profile;
        [settings, presenceMap, cacheList] = await Promise.all([
          getSettings(),
          getSavedKeyPresenceMap(),
          getSubtitleCacheList()
        ]);
        renderQueueSummary();
        renderSelectedProvider();
        renderSyncStatus();
        renderLastStatus();
        renderExportBar();
      } else if (res?.error) {
        popupSyncSummary.textContent = res.error;
      }
    });
    generateNowBtn.addEventListener("click", () => {
      if (!activeTabId) return;
      generateNowBtn.disabled = true;
      chrome.tabs.sendMessage(
        activeTabId,
        { type: RUNTIME_MESSAGE.TRIGGER_ACTIVE_VIDEO, force: true },
        (res) => {
          generateNowBtn.disabled = false;
          if (chrome.runtime.lastError || !res?.ok) {
            tabDescription.textContent = res?.error || "Open a Video Overview in NotebookLM Studio and click again.";
            return;
          }
          tabDescription.textContent = `Transcribing "${res.title || "Video Overview"}"\u2026`;
        }
      );
    });
    const bindExportButton = (btn, fmt) => {
      btn?.addEventListener("click", () => {
        const target = resolveExportTarget();
        if (!target) return;
        exportSubtitleEntry(target, fmt);
      });
    };
    bindExportButton(downloadLatestSrtBtn, "srt");
    bindExportButton(downloadLatestVttBtn, "vtt");
    bindExportButton(downloadLatestTxtBtn, "txt");
    bindExportButton(downloadLatestMdBtn, "md");
    bindExportButton(downloadLatestJsonBtn, "json");
    popupEnableOsNotifBtn?.addEventListener("click", async () => {
      if (chrome.permissions?.request) {
        try {
          await chrome.permissions.request({ permissions: ["notifications"] });
        } catch {
        }
      }
      settings = await saveSettings({ desktopNotifications: true });
      await sendRuntime({ type: RUNTIME_MESSAGE.TEST_DESKTOP_NOTIFICATION });
      notifications = await getNotifications();
      renderNotifications();
      await inspectOsNotificationPermission();
    });
    popupMarkReadBtn?.addEventListener("click", async () => {
      const res = await sendRuntime({
        type: RUNTIME_MESSAGE.MARK_NOTIFICATIONS_READ
      });
      notifications = res?.notifications || await getNotifications();
      renderNotifications();
    });
    popupClearNotifBtn?.addEventListener("click", async () => {
      await sendRuntime({ type: RUNTIME_MESSAGE.CLEAR_NOTIFICATIONS });
      notifications = [];
      renderNotifications();
    });
    copyLatestTxtBtn?.addEventListener("click", async () => {
      const target = resolveExportTarget();
      if (!target) return;
      const txt = formatTxt(target.cues, {
        includeTimestamps: true,
        title: target.title
      });
      try {
        await navigator.clipboard.writeText(txt);
        copyLatestTxtBtn.textContent = "Copied";
      } catch {
        exportSubtitleEntry(target, "txt");
        copyLatestTxtBtn.textContent = "Saved";
      }
      setTimeout(() => {
        copyLatestTxtBtn.textContent = "Copy";
      }, 1200);
    });
    try {
      chrome.storage?.onChanged?.addListener(async (changes, areaName) => {
        if (areaName !== "local") return;
        if (changes.subtitleCache || changes.lastStatus) {
          [lastStatus, cacheList] = await Promise.all([
            getLastStatus(),
            getSubtitleCacheList()
          ]);
          renderLastStatus();
          renderExportBar();
        }
        if (changes.notifications) {
          notifications = await getNotifications();
          renderNotifications();
        }
      });
    } catch {
    }
    const openOptions = () => chrome.runtime.openOptionsPage();
    openQueueBtn.addEventListener("click", openOptions);
    openOptionsBtn.addEventListener("click", openOptions);
    popupOpenSyncBtn?.addEventListener("click", openOptions);
  }
  document.addEventListener("DOMContentLoaded", initPopup);
})();

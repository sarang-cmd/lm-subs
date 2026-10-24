(() => {
  // src/config/selectors.js
  var NOTEBOOK_URL_ID_REGEX = /\/notebook\/([A-Za-z0-9_-]{8,})/;
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

  // src/lib/audio-extract.js
  var FOURCC_Encoder = new TextEncoder();
  function encodeMonoWav16Bit(float32Samples, sampleRate = 16e3) {
    const numSamples = float32Samples.length;
    const dataBytes = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buffer);
    const out = new Uint8Array(buffer);
    out.set(FOURCC_Encoder.encode("RIFF"), 0);
    view.setUint32(4, 36 + dataBytes, true);
    out.set(FOURCC_Encoder.encode("WAVE"), 8);
    out.set(FOURCC_Encoder.encode("fmt "), 12);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    out.set(FOURCC_Encoder.encode("data"), 36);
    view.setUint32(40, dataBytes, true);
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const clamped = Math.max(-1, Math.min(1, float32Samples[i]));
      const int16 = clamped < 0 ? clamped * 32768 : clamped * 32767;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
    return out;
  }
  function slicePcmIntoWavChunks(float32Samples, sampleRate = 16e3, maxChunkBytes = 18 * 1024 * 1024) {
    const usablePayloadBytes = Math.max(4096, maxChunkBytes - 44);
    const maxSamplesPerChunk = Math.floor(usablePayloadBytes / 2);
    const totalSamples = float32Samples.length;
    if (totalSamples === 0) {
      return [
        {
          bytes: encodeMonoWav16Bit(new Float32Array(0), sampleRate),
          mimeType: "audio/wav",
          fileName: "audio-chunk-1.wav",
          startOffsetSec: 0,
          durationSec: 0
        }
      ];
    }
    const chunks = [];
    let cursor = 0;
    let index = 1;
    while (cursor < totalSamples) {
      const end = Math.min(totalSamples, cursor + maxSamplesPerChunk);
      const slice = float32Samples.subarray(cursor, end);
      chunks.push({
        bytes: encodeMonoWav16Bit(slice, sampleRate),
        mimeType: "audio/wav",
        fileName: `audio-chunk-${index}.wav`,
        startOffsetSec: cursor / sampleRate,
        durationSec: slice.length / sampleRate
      });
      cursor = end;
      index++;
    }
    return chunks;
  }

  // src/lib/batchexecute.js
  var FIFE_NOTEBOOKLM_TOKEN_RE = /\/notebooklm\/([A-Za-z0-9_-]{16,})/;
  function isTrustedGoogleMediaUrl(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl) return false;
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return false;
    }
    if (parsed.protocol !== "https:") return false;
    const host = (parsed.hostname || "").toLowerCase();
    if (!host || host.includes("%") || host.includes("\\") || host.includes("/")) {
      return false;
    }
    return TRUSTED_GOOGLE_MEDIA_DOMAINS.some((suffix) => {
      const bare = suffix.startsWith(".") ? suffix.slice(1) : suffix;
      return host === bare || host.endsWith(suffix);
    });
  }
  function extractMediaToken(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl) return null;
    const fifeMatch = rawUrl.match(FIFE_NOTEBOOKLM_TOKEN_RE);
    if (fifeMatch) {
      return fifeMatch[1];
    }
    try {
      const u = new URL(rawUrl);
      const cleanPath = u.pathname.replace(/=m\d+(?:-dv)?$/i, "");
      return `${u.hostname}${cleanPath}`;
    } catch {
      return null;
    }
  }

  // src/lib/decide.js
  function compileExcludePatterns(patterns) {
    if (!Array.isArray(patterns)) return [];
    const compiled = [];
    for (const raw of patterns) {
      if (typeof raw !== "string") continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      try {
        compiled.push(new RegExp(trimmed, "i"));
      } catch {
      }
    }
    return compiled;
  }
  function matchesExcludePattern(title, patterns) {
    if (!title || typeof title !== "string") return false;
    const regexes = compileExcludePatterns(patterns);
    return regexes.some((rx) => rx.test(title));
  }
  function resolveSubtitleCacheKey({ artifactId, mediaToken, mediaUrl } = {}) {
    if (typeof artifactId === "string" && artifactId.trim()) {
      return `artifact:${artifactId.trim()}`;
    }
    if (typeof mediaToken === "string" && mediaToken.trim()) {
      return `token:${mediaToken.trim()}`;
    }
    if (typeof mediaUrl === "string" && mediaUrl.trim()) {
      try {
        const u = new URL(mediaUrl.trim());
        return `url:${u.hostname}${u.pathname}`;
      } catch {
        return `url:${mediaUrl.trim()}`;
      }
    }
    return null;
  }
  function shouldGenerateSubtitles({
    settings = {},
    trigger = "generate",
    // "generate" | "player_open" | "manual"
    force = false,
    typeCode = BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW,
    status = "ready",
    title = "",
    artifactId = null,
    mediaToken = null,
    mediaUrl = null,
    cachedKeys = /* @__PURE__ */ new Set(),
    inFlightKeys = /* @__PURE__ */ new Set(),
    exhaustedKeys = /* @__PURE__ */ new Set()
  } = {}) {
    const isManual = trigger === "manual";
    if (!isManual && settings.enabled === false) {
      return { allow: false, reason: "extension_disabled", cacheKey: null };
    }
    if (typeCode !== BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW) {
      return { allow: false, reason: "not_video_overview", cacheKey: null };
    }
    if (status !== "ready") {
      return { allow: false, reason: `artifact_${status || "not_ready"}`, cacheKey: null };
    }
    const cacheKey = resolveSubtitleCacheKey({ artifactId, mediaToken, mediaUrl });
    if (!cacheKey) {
      return { allow: false, reason: "missing_identifier", cacheKey: null };
    }
    if (!mediaUrl || typeof mediaUrl !== "string") {
      return { allow: false, reason: "missing_media_url", cacheKey };
    }
    const inFlightSet = inFlightKeys instanceof Set ? inFlightKeys : new Set(inFlightKeys || []);
    if (inFlightSet.has(cacheKey)) {
      return { allow: false, reason: "already_in_flight", cacheKey };
    }
    if (!isManual && !force) {
      const exhaustedSet = exhaustedKeys instanceof Set ? exhaustedKeys : new Set(exhaustedKeys || []);
      if (exhaustedSet.has(cacheKey)) {
        return { allow: false, reason: "retries_exhausted", cacheKey };
      }
      const cachedSet = cachedKeys instanceof Set ? cachedKeys : new Set(cachedKeys || []);
      if (cachedSet.has(cacheKey)) {
        return { allow: false, reason: "already_cached", cacheKey };
      }
      if (trigger === "player_open" && settings.autoOnExistingVideos === false) {
        return { allow: false, reason: "auto_existing_disabled", cacheKey };
      }
      if (trigger === "generate" && settings.autoOnGenerate === false) {
        return { allow: false, reason: "auto_generate_disabled", cacheKey };
      }
      if (matchesExcludePattern(title, settings.excludePatterns)) {
        return { allow: false, reason: "excluded_by_pattern", cacheKey };
      }
    }
    return { allow: true, reason: "eligible", cacheKey };
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
  async function getSubtitleCacheList(storageArea) {
    const store = resolveStorage(storageArea);
    const raw = await store.get(STORAGE_KEYS.SUBTITLE_CACHE);
    const list = raw?.[STORAGE_KEYS.SUBTITLE_CACHE];
    return Array.isArray(list) ? list : [];
  }
  async function getCachedKeysList(storageArea) {
    const list = await getSubtitleCacheList(storageArea);
    const keys = [];
    for (const item of list) {
      if (item?.cacheKey) keys.push(item.cacheKey);
      if (item?.artifactId) keys.push(`artifact:${item.artifactId}`);
      if (item?.mediaToken) keys.push(`token:${item.mediaToken}`);
    }
    return [...new Set(keys)];
  }

  // src/lib/subtitles.js
  var DEFAULT_MAX_LINE_CHARS = 42;
  var DEFAULT_MIN_DURATION_SEC = 0.85;
  function stripLlmFences(rawText) {
    if (typeof rawText !== "string") return "";
    let s = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "");
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
  function parseSubtitleText(input, offsetSec = 0) {
    const cleaned = stripLlmFences(input);
    if (!cleaned) return [];
    const lines = cleaned.replace(/^\uFEFF/, "").split(/\r?\n/);
    const rawCues = [];
    let i = 0;
    if (lines[0] && /^WEBVTT\b/i.test(lines[0].trim())) {
      i = 1;
      while (i < lines.length && lines[i].trim() !== "") i++;
    }
    while (i < lines.length) {
      while (i < lines.length && lines[i].trim() === "") i++;
      if (i >= lines.length) break;
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
      const rightSide = timeLine.slice(arrowIdx + 3).trim().split(/\s+/)[0];
      const startSec = parseTimestampSec(startStr);
      const endSec = parseTimestampSec(rightSide);
      i++;
      const textLines = [];
      while (i < lines.length && lines[i].trim() !== "") {
        const stripped = lines[i].replace(/<[^>]+>/g, "").trim();
        if (stripped) textLines.push(stripped);
        i++;
      }
      if (Number.isFinite(startSec) && textLines.length > 0) {
        rawCues.push({
          startSec,
          endSec,
          text: textLines.join("\n")
        });
      }
    }
    return normalizeAndSortCues(rawCues, offsetSec);
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
  function findActiveCue(cues, timeSec) {
    if (!Array.isArray(cues) || cues.length === 0 || !Number.isFinite(timeSec)) {
      return null;
    }
    let lo = 0;
    let hi = cues.length - 1;
    let candidateIdx = -1;
    while (lo <= hi) {
      const mid = lo + hi >>> 1;
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

  // src/content/player-overlay.js
  var FONT_SIZES = ["small", "medium", "large", "xlarge"];
  var FONT_SCALE_MAP = {
    small: "clamp(13px, 1.85cqh, 16px)",
    medium: "clamp(15px, 2.35cqh, 21px)",
    large: "clamp(18px, 2.95cqh, 26px)",
    xlarge: "clamp(21px, 3.55cqh, 32px)"
  };
  var OVERLAY_CSS = `
  :host {
    all: initial;
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2147483640;
    container-type: size;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
  }
  .toolbar {
    position: absolute;
    top: 12px;
    right: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    border-radius: 7px;
    background: rgba(17, 19, 22, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.32);
    pointer-events: auto;
    opacity: 0.94;
    transition: opacity 160ms ease;
  }
  .toolbar[data-idle="true"] {
    opacity: 0.22;
  }
  .toolbar:hover,
  .toolbar:focus-within {
    opacity: 1 !important;
  }
  button {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 4px 7px;
    border-radius: 5px;
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1;
    color: #e5e7eb;
    background: transparent;
    transition: background-color 120ms ease, color 120ms ease;
    user-select: none;
    white-space: nowrap;
  }
  button:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }
  button:focus-visible {
    outline: 2px solid #f3f4f6;
    outline-offset: 1px;
  }
  button[data-active="true"] {
    background: #f3f4f6;
    color: #111315;
  }
  button[data-primary="true"] {
    background: #16a34a;
    color: #ffffff;
  }
  button[data-primary="true"]:hover {
    background: #15803d;
  }
  button:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .sep {
    width: 1px;
    height: 13px;
    background: rgba(255, 255, 255, 0.16);
    margin: 0 2px;
  }
  .status-pill {
    font-size: 11px;
    font-weight: 500;
    color: #d1d5db;
    padding: 2px 6px;
    white-space: nowrap;
  }
  .status-pill[data-state="working"] {
    color: #fbbf24;
  }
  .status-pill[data-state="error"] {
    color: #fca5a5;
  }
  .caption-stage {
    position: absolute;
    left: 6%;
    right: 6%;
    bottom: 54px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    pointer-events: none;
  }
  .caption-box {
    display: none;
    max-width: min(92%, 780px);
    padding: 6px 14px 7px;
    border-radius: 6px;
    background: rgba(12, 14, 16, 0.82);
    color: #f9fafb;
    text-align: center;
    font-weight: 500;
    line-height: 1.38;
    letter-spacing: 0.005em;
    white-space: pre-line;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .caption-box[data-visible="true"] {
    display: inline-block;
  }
  input[type="file"] {
    display: none;
  }
`;
  function slugifyFilename(title) {
    const slug = String(title || "notebooklm-video-overview").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
    return slug || "notebooklm-video-overview";
  }
  function triggerTextDownload(doc, content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement("a");
    a.href = url;
    a.download = filename;
    doc.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }
  var VideoSubtitleController = class {
    constructor(video, {
      doc = globalThis.document,
      initialFontSize = "medium",
      initialOffsetSec = 0,
      onRequestGenerate = () => {
      },
      onOffsetChange = () => {
      },
      onFontSizeChange = () => {
      },
      onImportSubtitles = () => {
      }
    } = {}) {
      this.video = video;
      this.doc = doc;
      this.cues = [];
      this.title = "NotebookLM Video Overview";
      this.ccEnabled = true;
      this.fontSize = FONT_SIZES.includes(initialFontSize) ? initialFontSize : "medium";
      this.offsetSec = Number.isFinite(initialOffsetSec) ? initialOffsetSec : 0;
      this.statusState = "idle";
      this.statusLabel = "";
      this.nativeTrack = null;
      this.inPiP = false;
      this.idleTimer = null;
      this.syncTimer = null;
      this.onRequestGenerate = onRequestGenerate;
      this.onOffsetChange = onOffsetChange;
      this.onFontSizeChange = onFontSizeChange;
      this.onImportSubtitles = onImportSubtitles;
      this._mount();
      this._bindEvents();
    }
    _mount() {
      const parent = this.video.parentElement;
      if (!parent) return;
      const computedPos = globalThis.getComputedStyle?.(parent)?.position;
      if (!computedPos || computedPos === "static") {
        parent.style.position = "relative";
      }
      const old = parent.querySelector(`.${DOM_SELECTORS.OVERLAY_HOST_CLASS}`);
      if (old) old.remove();
      this.host = this.doc.createElement("div");
      this.host.className = DOM_SELECTORS.OVERLAY_HOST_CLASS;
      const shadow = this.host.attachShadow({ mode: "closed" });
      const style = this.doc.createElement("style");
      style.textContent = OVERLAY_CSS;
      this.toolbar = this.doc.createElement("div");
      this.toolbar.className = "toolbar";
      this.ccBtn = this.doc.createElement("button");
      this.ccBtn.type = "button";
      this.ccBtn.title = "Toggle subtitles (C)";
      this.ccBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.cues.length === 0 && this.statusState !== "working") {
          this.onRequestGenerate({ force: true });
          return;
        }
        this.ccEnabled = !this.ccEnabled;
        this._syncTrackVisibility();
        this._renderToolbar();
        this._renderActiveCue();
      });
      this.statusEl = this.doc.createElement("span");
      this.statusEl.className = "status-pill";
      this.controlsGroup = this.doc.createElement("span");
      this.controlsGroup.style.display = "inline-flex";
      this.controlsGroup.style.alignItems = "center";
      this.controlsGroup.style.gap = "3px";
      const sep1 = this.doc.createElement("span");
      sep1.className = "sep";
      this.sizeDownBtn = this._makeBtn(
        "A-",
        "Smaller captions",
        () => this._stepFontSize(-1)
      );
      this.sizeUpBtn = this._makeBtn(
        "A+",
        "Larger captions",
        () => this._stepFontSize(1)
      );
      const sep2 = this.doc.createElement("span");
      sep2.className = "sep";
      this.offsetMinusBtn = this._makeBtn(
        "-0.25s",
        "Shift subtitles earlier",
        () => this._adjustOffset(-0.25)
      );
      this.offsetLabelBtn = this._makeBtn(
        "0.0s",
        "Reset timing offset",
        () => this._resetOffset()
      );
      this.offsetPlusBtn = this._makeBtn(
        "+0.25s",
        "Shift subtitles later",
        () => this._adjustOffset(0.25)
      );
      const sep3 = this.doc.createElement("span");
      sep3.className = "sep";
      this.srtBtn = this._makeBtn(".SRT", "Download SubRip (.srt)", () => {
        if (this.cues.length === 0) return;
        triggerTextDownload(
          this.doc,
          formatSrt(this._shiftedCues()),
          `${slugifyFilename(this.title)}.srt`,
          "application/x-subrip;charset=utf-8"
        );
      });
      this.vttBtn = this._makeBtn(".VTT", "Download WebVTT (.vtt)", () => {
        if (this.cues.length === 0) return;
        triggerTextDownload(
          this.doc,
          formatVtt(this._shiftedCues()),
          `${slugifyFilename(this.title)}.vtt`,
          "text/vtt;charset=utf-8"
        );
      });
      this.fileInput = this.doc.createElement("input");
      this.fileInput.type = "file";
      this.fileInput.accept = ".srt,.vtt,text/vtt,text/plain";
      this.fileInput.addEventListener("change", async () => {
        const file = this.fileInput.files?.[0];
        if (!file) return;
        const raw = await file.text();
        const parsed = parseSubtitleText(raw);
        if (parsed.length > 0) {
          this.setCues(parsed, { title: this.title || file.name });
          this.onImportSubtitles(parsed, file.name);
        }
        this.fileInput.value = "";
      });
      this.importBtn = this._makeBtn("Import", "Load external .srt or .vtt file", () => {
        this.fileInput.click();
      });
      this.regenBtn = this._makeBtn("Retry", "Regenerate subtitles with AI", () => {
        this.onRequestGenerate({ force: true });
      });
      this.controlsGroup.append(
        sep1,
        this.sizeDownBtn,
        this.sizeUpBtn,
        sep2,
        this.offsetMinusBtn,
        this.offsetLabelBtn,
        this.offsetPlusBtn,
        sep3,
        this.srtBtn,
        this.vttBtn
      );
      this.toolbar.append(
        this.ccBtn,
        this.statusEl,
        this.controlsGroup,
        this.importBtn,
        this.regenBtn,
        this.fileInput
      );
      const stage = this.doc.createElement("div");
      stage.className = "caption-stage";
      this.captionBox = this.doc.createElement("div");
      this.captionBox.className = "caption-box";
      stage.appendChild(this.captionBox);
      shadow.append(style, stage, this.toolbar);
      parent.appendChild(this.host);
      this._applyFontSize();
      this._renderToolbar();
    }
    _makeBtn(label, title, onClick) {
      const btn = this.doc.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.title = title;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
      });
      return btn;
    }
    _bindEvents() {
      this._onTimeChange = () => this._renderActiveCue();
      this._onPlay = () => {
        this._startHighFreqSync();
        this._scheduleIdleFade();
      };
      this._onPause = () => {
        this._stopHighFreqSync();
        if (this.toolbar) this.toolbar.dataset.idle = "false";
        this._renderActiveCue();
      };
      this._onEnterPiP = () => {
        this.inPiP = true;
        this._syncTrackVisibility();
        this._renderActiveCue();
      };
      this._onLeavePiP = () => {
        this.inPiP = false;
        this._syncTrackVisibility();
        this._renderActiveCue();
      };
      this._onPointerMove = () => this._scheduleIdleFade();
      this.video.addEventListener("timeupdate", this._onTimeChange);
      this.video.addEventListener("seeking", this._onTimeChange);
      this.video.addEventListener("seeked", this._onTimeChange);
      this.video.addEventListener("play", this._onPlay);
      this.video.addEventListener("pause", this._onPause);
      this.video.addEventListener("enterpictureinpicture", this._onEnterPiP);
      this.video.addEventListener("leavepictureinpicture", this._onLeavePiP);
      this.video.parentElement?.addEventListener("mousemove", this._onPointerMove, {
        passive: true
      });
    }
    _startHighFreqSync() {
      if (this.syncTimer) return;
      this.syncTimer = setInterval(() => this._renderActiveCue(), 100);
    }
    _stopHighFreqSync() {
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
      }
    }
    _scheduleIdleFade() {
      if (!this.toolbar) return;
      this.toolbar.dataset.idle = "false";
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (!this.video.paused && this.statusState !== "working") {
        this.idleTimer = setTimeout(() => {
          if (this.toolbar && !this.video.paused) {
            this.toolbar.dataset.idle = "true";
          }
        }, 2800);
      }
    }
    _stepFontSize(delta) {
      const idx = FONT_SIZES.indexOf(this.fontSize);
      const nextIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
      this.fontSize = FONT_SIZES[nextIdx];
      this._applyFontSize();
      this.onFontSizeChange(this.fontSize);
    }
    _applyFontSize() {
      if (this.captionBox) {
        this.captionBox.style.fontSize = FONT_SCALE_MAP[this.fontSize] || FONT_SCALE_MAP.medium;
      }
    }
    _adjustOffset(delta) {
      this.offsetSec = Math.round((this.offsetSec + delta) * 100) / 100;
      this._syncNativeTextTrack();
      this._renderToolbar();
      this._renderActiveCue();
      this.onOffsetChange(this.offsetSec);
    }
    _resetOffset() {
      this.offsetSec = 0;
      this._syncNativeTextTrack();
      this._renderToolbar();
      this._renderActiveCue();
      this.onOffsetChange(0);
    }
    _shiftedCues() {
      if (!this.offsetSec) return this.cues;
      return this.cues.map((c) => ({
        ...c,
        startSec: Math.max(0, Math.round((c.startSec + this.offsetSec) * 1e3) / 1e3),
        endSec: Math.max(0.25, Math.round((c.endSec + this.offsetSec) * 1e3) / 1e3)
      }));
    }
    setSettings({ fontSize, subtitleOffsetSec } = {}) {
      if (fontSize && FONT_SIZES.includes(fontSize)) {
        this.fontSize = fontSize;
        this._applyFontSize();
      }
      if (Number.isFinite(subtitleOffsetSec)) {
        this.offsetSec = subtitleOffsetSec;
        this._syncNativeTextTrack();
        this._renderToolbar();
        this._renderActiveCue();
      }
    }
    setStatus(state, label = "") {
      this.statusState = state;
      this.statusLabel = label;
      if (this.toolbar && state === "working") {
        this.toolbar.dataset.idle = "false";
      }
      this._renderToolbar();
    }
    setCues(cues, { title, language = "en" } = {}) {
      this.cues = Array.isArray(cues) ? cues : [];
      if (title) this.title = title;
      this.language = language || "en";
      this.statusState = this.cues.length > 0 ? "ready" : "idle";
      this.statusLabel = "";
      this._syncNativeTextTrack();
      this._renderToolbar();
      this._renderActiveCue();
      this._scheduleIdleFade();
    }
    _syncNativeTextTrack() {
      if (typeof this.video.addTextTrack !== "function" || typeof VTTCue === "undefined") {
        return;
      }
      try {
        if (!this.nativeTrack) {
          this.nativeTrack = this.video.addTextTrack(
            "subtitles",
            "NotebookLM Subtitles",
            this.language || "en"
          );
        }
        if (this.nativeTrack.cues) {
          while (this.nativeTrack.cues.length > 0) {
            this.nativeTrack.removeCue(this.nativeTrack.cues[0]);
          }
        }
        for (const cue of this._shiftedCues()) {
          const vttCue = new VTTCue(cue.startSec, cue.endSec, cue.text);
          this.nativeTrack.addCue(vttCue);
        }
        this._syncTrackVisibility();
      } catch {
      }
    }
    _syncTrackVisibility() {
      if (!this.nativeTrack) return;
      this.nativeTrack.mode = this.ccEnabled && this.inPiP && this.cues.length > 0 ? "showing" : "hidden";
    }
    _renderToolbar() {
      if (!this.toolbar) return;
      const hasCues = this.cues.length > 0;
      const isWorking = this.statusState === "working";
      if (isWorking) {
        this.ccBtn.textContent = "CC";
        this.ccBtn.dataset.active = "false";
        this.ccBtn.dataset.primary = "false";
        this.ccBtn.disabled = true;
      } else if (hasCues) {
        this.ccBtn.textContent = "CC";
        this.ccBtn.dataset.active = this.ccEnabled ? "true" : "false";
        this.ccBtn.dataset.primary = "false";
        this.ccBtn.disabled = false;
      } else {
        this.ccBtn.textContent = "CC \xB7 Generate Subtitles";
        this.ccBtn.dataset.active = "false";
        this.ccBtn.dataset.primary = "true";
        this.ccBtn.disabled = false;
      }
      if (this.statusLabel) {
        this.statusEl.style.display = "inline-block";
        this.statusEl.dataset.state = this.statusState;
        this.statusEl.textContent = this.statusLabel;
      } else {
        this.statusEl.style.display = "none";
      }
      this.controlsGroup.style.display = hasCues ? "inline-flex" : "none";
      this.regenBtn.style.display = hasCues || this.statusState === "error" ? "inline-flex" : "none";
      this.regenBtn.textContent = hasCues ? "Regen" : "Retry";
      this.regenBtn.disabled = isWorking;
      const sign = this.offsetSec > 0 ? "+" : "";
      this.offsetLabelBtn.textContent = `${sign}${this.offsetSec.toFixed(2)}s`;
    }
    _renderActiveCue() {
      if (!this.captionBox) return;
      if (!this.ccEnabled || this.inPiP || this.cues.length === 0) {
        this.captionBox.dataset.visible = "false";
        return;
      }
      const effectiveTime = (this.video.currentTime || 0) - this.offsetSec;
      const active = findActiveCue(this.cues, effectiveTime);
      if (!active) {
        this.captionBox.dataset.visible = "false";
        return;
      }
      const prefix = active.speaker ? `[${active.speaker}] ` : "";
      this.captionBox.textContent = `${prefix}${active.text}`;
      this.captionBox.dataset.visible = "true";
    }
    destroy() {
      this._stopHighFreqSync();
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.video.removeEventListener("timeupdate", this._onTimeChange);
      this.video.removeEventListener("seeking", this._onTimeChange);
      this.video.removeEventListener("seeked", this._onTimeChange);
      this.video.removeEventListener("play", this._onPlay);
      this.video.removeEventListener("pause", this._onPause);
      this.video.removeEventListener("enterpictureinpicture", this._onEnterPiP);
      this.video.removeEventListener("leavepictureinpicture", this._onLeavePiP);
      this.host?.remove();
    }
  };

  // src/content/toast.js
  var TOAST_CSS = `
  :host {
    all: initial;
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483646;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
  }
  .toast {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 380px;
    padding: 10px 14px;
    border-radius: 8px;
    background: #14171a;
    color: #f3f4f6;
    border: 1px solid #2a2f36;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.36);
    font-size: 12.5px;
    line-height: 1.4;
    letter-spacing: -0.005em;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 150ms ease, transform 150ms ease;
    pointer-events: auto;
  }
  .toast[data-visible="true"] {
    opacity: 1;
    transform: translateY(0);
  }
  @media (prefers-reduced-motion: reduce) {
    .toast {
      transition: none;
      transform: none;
    }
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    flex-shrink: 0;
    background: #9ca3af;
  }
  .toast[data-kind="working"] .dot {
    background: #f59e0b;
  }
  .toast[data-kind="success"] .dot {
    background: #22c55e;
  }
  .toast[data-kind="error"] .dot {
    background: #ef4444;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .title {
    font-weight: 600;
    color: #f9fafb;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .detail {
    font-size: 11.5px;
    color: #9ca3af;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
  function createToastManager(doc = globalThis.document) {
    let host = null;
    let toastEl = null;
    let titleEl = null;
    let detailEl = null;
    let hideTimer = null;
    function ensureMounted() {
      if (!doc || !doc.body) return false;
      if (host && doc.body.contains(host)) return true;
      const existing = doc.getElementById(DOM_SELECTORS.TOAST_HOST_ID);
      if (existing) existing.remove();
      host = doc.createElement("div");
      host.id = DOM_SELECTORS.TOAST_HOST_ID;
      const shadow = host.attachShadow({ mode: "closed" });
      const style = doc.createElement("style");
      style.textContent = TOAST_CSS;
      toastEl = doc.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      const dot = doc.createElement("span");
      dot.className = "dot";
      const body = doc.createElement("div");
      body.className = "body";
      titleEl = doc.createElement("div");
      titleEl.className = "title";
      detailEl = doc.createElement("div");
      detailEl.className = "detail";
      body.append(titleEl, detailEl);
      toastEl.append(dot, body);
      shadow.append(style, toastEl);
      doc.body.appendChild(host);
      return true;
    }
    function show({ title, detail = "", kind = "info", durationMs = 4200 } = {}) {
      if (!ensureMounted()) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      toastEl.dataset.kind = kind;
      titleEl.textContent = String(title || "Subtitles for NotebookLM");
      detailEl.textContent = String(detail || "");
      detailEl.style.display = detail ? "block" : "none";
      toastEl.dataset.visible = "true";
      if (durationMs > 0) {
        hideTimer = setTimeout(() => {
          if (toastEl) toastEl.dataset.visible = "false";
        }, durationMs);
      }
    }
    function hide() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (toastEl) {
        toastEl.dataset.visible = "false";
      }
    }
    return { show, hide };
  }

  // src/content/content.js
  var MAX_AUTO_RETRIES = 2;
  var RETRY_BASE_DELAY_MS = 1800;
  function initContentCoordinator({
    win = globalThis.window,
    doc = globalThis.document,
    runtime = globalThis.chrome?.runtime,
    storageArea = globalThis.chrome?.storage?.local
  } = {}) {
    if (!win || !doc || win.__notebooklmSubtitlesContentActive__) return null;
    win.__notebooklmSubtitlesContentActive__ = true;
    const toast = createToastManager(doc);
    const artifactsById = /* @__PURE__ */ new Map();
    const artifactsByToken = /* @__PURE__ */ new Map();
    const generatingArtifactIds = /* @__PURE__ */ new Set();
    const inFlightKeys = /* @__PURE__ */ new Set();
    const exhaustedKeys = /* @__PURE__ */ new Set();
    const retryCounts = /* @__PURE__ */ new Map();
    const controllers = /* @__PURE__ */ new WeakMap();
    const trackedVideos = /* @__PURE__ */ new Set();
    let awaitingCreatedArtifact = false;
    let cachedKeysSet = /* @__PURE__ */ new Set();
    let currentSettings = { ...DEFAULT_SETTINGS };
    function currentNotebookId() {
      const m = String(win.location?.pathname || "").match(NOTEBOOK_URL_ID_REGEX);
      return m ? m[1] : null;
    }
    function syncRpcOverridesToPage() {
      if (!currentSettings.rpcOverrides) return;
      try {
        win.postMessage(
          {
            source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
            type: PAGE_MESSAGE.SYNC_RPC_OVERRIDES,
            rpcOverrides: currentSettings.rpcOverrides
          },
          win.location.origin
        );
      } catch {
      }
    }
    function sendRuntimeMessage(message) {
      if (!runtime?.sendMessage) return Promise.resolve(null);
      return new Promise((resolve) => {
        try {
          runtime.sendMessage(message, (res) => {
            if (runtime.lastError) {
              resolve({ ok: false, error: runtime.lastError.message });
              return;
            }
            resolve(res || null);
          });
        } catch (err) {
          resolve({ ok: false, error: err?.message || String(err) });
        }
      });
    }
    async function refreshLocalState() {
      try {
        const [settings, keys] = await Promise.all([
          getSettings(storageArea),
          getCachedKeysList(storageArea)
        ]);
        currentSettings = settings;
        cachedKeysSet = new Set(keys);
        syncRpcOverridesToPage();
        for (const video of trackedVideos) {
          controllers.get(video)?.setSettings({
            fontSize: currentSettings.fontSize,
            subtitleOffsetSec: currentSettings.subtitleOffsetSec
          });
        }
      } catch {
      }
    }
    function showToastIfEnabled(opts) {
      if (!currentSettings.showToast && opts?.kind !== "error") return;
      toast.show(opts);
    }
    function resolveArtifactForVideo(video) {
      const src = video?.currentSrc || video?.src || "";
      const token = extractMediaToken(src);
      if (token && artifactsByToken.has(token)) {
        return artifactsByToken.get(token);
      }
      const notebookId = currentNotebookId();
      const readyCandidates = [...artifactsById.values()].filter(
        (a) => a.status === "ready" && a.mediaUrl && (!notebookId || !a.notebookId || a.notebookId === notebookId)
      );
      if (readyCandidates.length === 1) {
        return readyCandidates[0];
      }
      if (readyCandidates.length > 1) {
        const container = video.closest('[role="dialog"], .video-player, [class*="video"]') || doc.body;
        const containerText = (container?.textContent || "").toLowerCase();
        for (const candidate of readyCandidates) {
          if (candidate.title && containerText.includes(candidate.title.toLowerCase())) {
            return candidate;
          }
        }
        if (Number.isFinite(video.duration) && video.duration > 0) {
          const byDuration = readyCandidates.find(
            (c) => c.durationSeconds && Math.abs(c.durationSeconds - video.duration) <= 3
          );
          if (byDuration) return byDuration;
        }
        return readyCandidates[0];
      }
      if (isTrustedGoogleMediaUrl(src)) {
        return {
          artifactId: null,
          notebookId,
          title: doc.title?.replace(/\s*-\s*NotebookLM.*$/i, "") || "Video Overview",
          typeCode: 3,
          status: "ready",
          language: null,
          durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
          mediaUrl: src,
          mediaToken: token,
          audioVariantUrls: [],
          videoVariantUrls: [src]
        };
      }
      return null;
    }
    function findControllersMatching({ cacheKey, artifactId, mediaToken }) {
      const matched = [];
      for (const video of trackedVideos) {
        if (!doc.contains(video)) {
          trackedVideos.delete(video);
          continue;
        }
        const ctrl = controllers.get(video);
        if (!ctrl) continue;
        const art = resolveArtifactForVideo(video);
        const vKey = resolveSubtitleCacheKey({
          artifactId: art?.artifactId,
          mediaToken: art?.mediaToken || extractMediaToken(video.currentSrc || video.src),
          mediaUrl: art?.mediaUrl || video.currentSrc || video.src
        });
        if (cacheKey && vKey === cacheKey || artifactId && art?.artifactId === artifactId || mediaToken && art?.mediaToken === mediaToken) {
          matched.push(ctrl);
        }
      }
      return matched;
    }
    async function requestSubtitlesForArtifact(artifact, { trigger = "player_open", force = false } = {}) {
      if (!artifact) return;
      const cacheKey = resolveSubtitleCacheKey({
        artifactId: artifact.artifactId,
        mediaToken: artifact.mediaToken,
        mediaUrl: artifact.mediaUrl
      });
      if (!force && cacheKey) {
        const cachedRes = await sendRuntimeMessage({
          type: RUNTIME_MESSAGE.GET_CACHED_SUBTITLES,
          cacheKey,
          artifactId: artifact.artifactId,
          mediaToken: artifact.mediaToken
        });
        if (cachedRes?.ok && cachedRes.entry?.cues?.length > 0) {
          cachedKeysSet.add(cacheKey);
          applyCuesToMatchingPlayers(cachedRes.entry);
          return;
        }
      }
      const decision = shouldGenerateSubtitles({
        settings: currentSettings,
        trigger,
        force,
        typeCode: artifact.typeCode ?? 3,
        status: artifact.status || "ready",
        title: artifact.title || "",
        artifactId: artifact.artifactId,
        mediaToken: artifact.mediaToken,
        mediaUrl: artifact.mediaUrl,
        cachedKeys: cachedKeysSet,
        inFlightKeys,
        exhaustedKeys
      });
      if (!decision.allow || !decision.cacheKey) {
        return;
      }
      const key = decision.cacheKey;
      inFlightKeys.add(key);
      const matchingCtrls = findControllersMatching({
        cacheKey: key,
        artifactId: artifact.artifactId,
        mediaToken: artifact.mediaToken
      });
      for (const c of matchingCtrls) {
        c.setStatus("working", "Extracting audio\u2026");
      }
      showToastIfEnabled({
        title: "Generating Video Overview subtitles\u2026",
        detail: artifact.title || "Extracting compact audio track",
        kind: "working",
        durationMs: 0
      });
      const response = await sendRuntimeMessage({
        type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
        force,
        artifact: {
          ...artifact,
          cacheKey: key,
          notebookId: artifact.notebookId || currentNotebookId()
        }
      });
      inFlightKeys.delete(key);
      if (response?.ok && response.entry?.cues?.length > 0) {
        retryCounts.delete(key);
        exhaustedKeys.delete(key);
        cachedKeysSet.add(key);
        applyCuesToMatchingPlayers(response.entry);
        const providerBadge = response.entry.failoverUsed ? `${response.entry.provider} (failover)` : response.entry.provider;
        showToastIfEnabled({
          title: `Subtitles ready \xB7 ${response.entry.cues.length} cues`,
          detail: `Transcribed via ${providerBadge}`,
          kind: "success",
          durationMs: 4200
        });
        return;
      }
      const errMsg = response?.error || "Subtitle generation failed.";
      const prevRetries = retryCounts.get(key) || 0;
      const isAuthOrConfigError = /no stt api key|missing api key|401|403/i.test(errMsg);
      if (!force && !isAuthOrConfigError && prevRetries < MAX_AUTO_RETRIES) {
        const nextAttempt = prevRetries + 1;
        retryCounts.set(key, nextAttempt);
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, prevRetries);
        for (const c of matchingCtrls) {
          c.setStatus("working", `Retrying (${nextAttempt}/${MAX_AUTO_RETRIES})\u2026`);
        }
        setTimeout(() => {
          requestSubtitlesForArtifact(artifact, { trigger, force: false });
        }, delayMs);
        return;
      }
      exhaustedKeys.add(key);
      for (const c of matchingCtrls) {
        c.setStatus("error", "Subtitle error");
      }
      showToastIfEnabled({
        title: "Could not generate subtitles",
        detail: errMsg,
        kind: "error",
        durationMs: 6500
      });
    }
    function applyCuesToMatchingPlayers(entry) {
      if (!entry?.cues?.length) return;
      const matched = findControllersMatching({
        cacheKey: entry.cacheKey,
        artifactId: entry.artifactId,
        mediaToken: entry.mediaToken
      });
      for (const ctrl of matched) {
        ctrl.setCues(entry.cues, {
          title: entry.title,
          language: entry.language
        });
      }
    }
    function attachControllerToVideo(video) {
      if (!video || controllers.has(video)) return;
      trackedVideos.add(video);
      const ctrl = new VideoSubtitleController(video, {
        doc,
        initialFontSize: currentSettings.fontSize,
        initialOffsetSec: currentSettings.subtitleOffsetSec,
        onRequestGenerate: ({ force } = {}) => {
          const art = resolveArtifactForVideo(video);
          if (!art) {
            showToastIfEnabled({
              title: "Waiting for Video Overview stream",
              detail: "Press Play once so NotebookLM loads the video source.",
              kind: "info",
              durationMs: 4e3
            });
            return;
          }
          requestSubtitlesForArtifact(art, {
            trigger: "manual",
            force: Boolean(force)
          });
        },
        onOffsetChange: (offsetSec) => {
          currentSettings.subtitleOffsetSec = offsetSec;
          saveSettings({ subtitleOffsetSec: offsetSec }, storageArea).catch(() => {
          });
        },
        onFontSizeChange: (fontSize) => {
          currentSettings.fontSize = fontSize;
          saveSettings({ fontSize }, storageArea).catch(() => {
          });
        },
        onImportSubtitles: (cues, fileName) => {
          const art = resolveArtifactForVideo(video);
          const cacheKey = resolveSubtitleCacheKey({
            artifactId: art?.artifactId,
            mediaToken: art?.mediaToken,
            mediaUrl: art?.mediaUrl || video.currentSrc || video.src
          }) || `import:${Date.now()}`;
          sendRuntimeMessage({
            type: RUNTIME_MESSAGE.SAVE_IMPORTED_SUBTITLES,
            entry: {
              cacheKey,
              artifactId: art?.artifactId || null,
              notebookId: art?.notebookId || currentNotebookId(),
              mediaToken: art?.mediaToken || null,
              title: art?.title || fileName.replace(/\.(srt|vtt)$/i, ""),
              provider: "imported",
              model: fileName,
              cues
            }
          });
          showToastIfEnabled({
            title: `Imported ${cues.length} subtitle cues`,
            detail: fileName,
            kind: "success"
          });
        }
      });
      controllers.set(video, ctrl);
      const tryBindVideo = () => {
        const art = resolveArtifactForVideo(video);
        if (art) {
          requestSubtitlesForArtifact(art, { trigger: "player_open", force: false });
        }
      };
      video.addEventListener("loadedmetadata", tryBindVideo);
      video.addEventListener("play", tryBindVideo, { once: true });
      if (video.readyState >= 1 || video.currentSrc || video.src) {
        tryBindVideo();
      }
    }
    function scanForVideos(root = doc) {
      if (!root?.querySelectorAll) return;
      const videos = root.querySelectorAll(DOM_SELECTORS.VIDEO_ELEMENT);
      for (const v of videos) {
        attachControllerToVideo(v);
      }
    }
    function handleBatchexecuteMessage(payload) {
      if (!payload || typeof payload !== "object") return;
      if (payload.isCreateVideoRequest) {
        awaitingCreatedArtifact = true;
        showToastIfEnabled({
          title: "Video Overview requested",
          detail: "Subtitles will be generated automatically as soon as video rendering finishes.",
          kind: "working",
          durationMs: 5e3
        });
      }
      const artifacts = Array.isArray(payload.artifacts) ? payload.artifacts : [];
      for (const art of artifacts) {
        if (!art?.artifactId) continue;
        const previous = artifactsById.get(art.artifactId);
        artifactsById.set(art.artifactId, art);
        if (art.mediaToken) {
          artifactsByToken.set(art.mediaToken, art);
        }
        if (art.status === "processing" || art.status === "initializing" || art.status === "initialized") {
          generatingArtifactIds.add(art.artifactId);
          awaitingCreatedArtifact = false;
          continue;
        }
        if (art.status === "ready" && art.mediaUrl) {
          const wasGenerating = generatingArtifactIds.has(art.artifactId) || awaitingCreatedArtifact && !previous;
          generatingArtifactIds.delete(art.artifactId);
          if (wasGenerating) {
            awaitingCreatedArtifact = false;
            requestSubtitlesForArtifact(art, { trigger: "generate", force: false });
          } else {
            for (const video of trackedVideos) {
              const resolved = resolveArtifactForVideo(video);
              if (resolved && resolved.artifactId === art.artifactId) {
                requestSubtitlesForArtifact(art, {
                  trigger: "player_open",
                  force: false
                });
              }
            }
          }
        }
      }
    }
    win.addEventListener("message", (event) => {
      if (event.source !== win) return;
      if (win.location?.origin && win.location.origin !== "null" && event.origin !== win.location.origin) {
        return;
      }
      const msg = event.data;
      if (msg && msg.source === PAGE_MESSAGE.BRIDGE_SOURCE_PAGE && msg.type === PAGE_MESSAGE.BATCH_ARTIFACTS) {
        handleBatchexecuteMessage(msg.payload);
      }
    });
    runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
      if (!msg || typeof msg.type !== "string") return false;
      if (msg.type === RUNTIME_MESSAGE.SUBTITLES_PROGRESS) {
        const matched = findControllersMatching({
          cacheKey: msg.cacheKey,
          artifactId: msg.artifactId,
          mediaToken: msg.mediaToken
        });
        for (const c of matched) {
          c.setStatus("working", msg.label || "Transcribing\u2026");
        }
        if (msg.label) {
          showToastIfEnabled({
            title: msg.label,
            detail: msg.detail || "",
            kind: "working",
            durationMs: 0
          });
        }
        sendResponse?.({ ok: true });
        return false;
      }
      if (msg.type === RUNTIME_MESSAGE.SUBTITLES_READY && msg.entry) {
        cachedKeysSet.add(msg.entry.cacheKey);
        applyCuesToMatchingPlayers(msg.entry);
        sendResponse?.({ ok: true });
        return false;
      }
      if (msg.type === RUNTIME_MESSAGE.GET_ACTIVE_TAB_STATE) {
        const activeVideos = [...trackedVideos].filter((v) => doc.contains(v));
        const primaryVideo = activeVideos[0] || null;
        const art = primaryVideo ? resolveArtifactForVideo(primaryVideo) : [...artifactsById.values()].find((a) => a.status === "ready") || null;
        sendResponse?.({
          ok: true,
          hasVideoElement: activeVideos.length > 0,
          readyArtifactCount: [...artifactsById.values()].filter(
            (a) => a.status === "ready"
          ).length,
          generatingCount: generatingArtifactIds.size,
          activeArtifact: art
        });
        return false;
      }
      if (msg.type === RUNTIME_MESSAGE.TRIGGER_ACTIVE_VIDEO) {
        const activeVideos = [...trackedVideos].filter((v) => doc.contains(v));
        const primaryVideo = activeVideos[0] || null;
        const art = primaryVideo ? resolveArtifactForVideo(primaryVideo) : [...artifactsById.values()].find((a) => a.status === "ready") || null;
        if (!art) {
          sendResponse?.({
            ok: false,
            error: "No ready Video Overview found on this tab yet. Open or generate a Video Overview in Studio first."
          });
          return false;
        }
        requestSubtitlesForArtifact(art, {
          trigger: "manual",
          force: Boolean(msg.force)
        });
        sendResponse?.({ ok: true, started: true, title: art.title });
        return false;
      }
      if (msg.type === "NOTEBOOKLM_SUBTITLES_DECODE_WAV_FALLBACK" && msg.base64Media) {
        (async () => {
          try {
            const bin = atob(msg.base64Media);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const AudioCtx = win.AudioContext || win.webkitAudioContext;
            const ctx = new AudioCtx();
            const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
            await ctx.close();
            const targetRate = 16e3;
            const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
            const offline = new win.OfflineAudioContext(1, length, targetRate);
            const src = offline.createBufferSource();
            src.buffer = decoded;
            src.connect(offline.destination);
            src.start(0);
            const rendered = await offline.startRendering();
            const samples = rendered.getChannelData(0);
            const wavChunks = slicePcmIntoWavChunks(samples, targetRate);
            const encodedChunks = wavChunks.map((ch, idx) => {
              let s = "";
              const CHUNK = 32768;
              for (let i = 0; i < ch.bytes.length; i += CHUNK) {
                s += String.fromCharCode.apply(
                  null,
                  ch.bytes.subarray(i, i + CHUNK)
                );
              }
              return {
                base64: btoa(s),
                mimeType: "audio/wav",
                fileName: ch.fileName || `chunk-${idx + 1}.wav`,
                startOffsetSec: ch.startOffsetSec,
                durationSec: ch.durationSec
              };
            });
            sendResponse?.({ ok: true, chunks: encodedChunks });
          } catch (err) {
            sendResponse?.({ ok: false, error: err?.message || String(err) });
          }
        })();
        return true;
      }
      return false;
    });
    globalThis.chrome?.storage?.onChanged?.addListener((changes, areaName) => {
      if (areaName === "local" && (changes.settings || changes.subtitleCache)) {
        refreshLocalState();
      }
    });
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === "VIDEO") {
            attachControllerToVideo(node);
          } else if (node.querySelectorAll) {
            scanForVideos(node);
          }
        }
      }
    });
    const start = async () => {
      await refreshLocalState();
      scanForVideos(doc);
      if (doc.documentElement) {
        observer.observe(doc.documentElement, {
          childList: true,
          subtree: true
        });
      }
    };
    start();
    return {
      handleBatchexecuteMessage,
      scanForVideos,
      artifactsById
    };
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    initContentCoordinator();
  }
})();

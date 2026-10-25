(() => {
  // src/config/selectors.js
  var MESSAGE_NAMESPACE = "LM_SUBS_";
  var KEEPALIVE_PORT_NAME = "LM_SUBS_KEEPALIVE";
  var HOSTED_CLOUD_URL = "https://lm-subs.vercel.app";
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
    SYNC_STATUS: "LM_SUBS_SYNC_STATUS"
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
  var FIFE_NOTEBOOKLM_TOKEN_RE = /\/(?:rd-)?notebook(?:lm)?\/([A-Za-z0-9_-]{16,})/;
  var FIFE_SUFFIX_RE = /=[A-Za-z0-9_,.-]+$/;
  function isNotebookLmHost(hostname) {
    if (typeof hostname !== "string" || !hostname) return false;
    return NOTEBOOKLM_HOSTS.includes(hostname.toLowerCase());
  }
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
  function isThumbnailOrManifestUrl(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl) return false;
    if (/\.(?:m3u8|mpd|jpe?g|png|webp|gif|svg)(?:$|\?)/i.test(rawUrl)) {
      return true;
    }
    const suffixMatch = rawUrl.match(FIFE_SUFFIX_RE);
    if (!suffixMatch) return false;
    const suffix = suffixMatch[0].slice(1).toLowerCase();
    if (/^(?:s\d+|w\d+|h\d+|c\b|p\b)/.test(suffix)) return true;
    if (/(?:^|-)s\d+(?:-|$)/.test(suffix)) return true;
    if (/^mm,(?:hls|dash)$/i.test(suffix)) return true;
    return false;
  }
  function summarizeMediaUrlForDebug(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl) return "(empty)";
    if (rawUrl.startsWith("blob:")) return rawUrl.slice(0, 48);
    try {
      const u = new URL(rawUrl);
      const suffixMatch = u.pathname.match(FIFE_SUFFIX_RE);
      const suffix = suffixMatch ? suffixMatch[0] : "";
      const tokenMatch = u.pathname.match(FIFE_NOTEBOOKLM_TOKEN_RE);
      if (tokenMatch) {
        const tok = tokenMatch[1];
        const shortTok = tok.length > 14 ? `${tok.slice(0, 8)}\u2026${tok.slice(-4)}` : tok;
        const prefix = u.pathname.includes("/rd-notebooklm/") ? "/rd-notebooklm/" : "/notebooklm/";
        return `${u.origin}${prefix}${shortTok}${suffix}`;
      }
      return `${u.origin}${u.pathname.slice(0, 36)}${suffix}`;
    } catch {
      return String(rawUrl).slice(0, 60);
    }
  }
  function extractMediaToken(rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl) return null;
    const fifeMatch = rawUrl.match(FIFE_NOTEBOOKLM_TOKEN_RE);
    if (fifeMatch) {
      return fifeMatch[1];
    }
    try {
      const u = new URL(rawUrl);
      if (u.protocol === "blob:") return null;
      const idParam = u.searchParams.get("id") || u.searchParams.get("docid");
      if (idParam) return idParam;
      const cleanPath = u.pathname.replace(FIFE_SUFFIX_RE, "");
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
    LAST_STATUS: "lastStatus",
    DEBUG_LOGS: "debugLogs",
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
  function sanitizeDebugMessage(text) {
    if (typeof text !== "string") return String(text ?? "");
    return text.replace(/\b(?:gsk_|sk-|AIza|hf_|xi-|lms_)[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_KEY]").replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]").replace(/Bearer\s+[A-Za-z0-9._:-]+/gi, "Bearer [REDACTED]").slice(0, 600);
  }
  var DEFAULT_SYNC_PREFERENCES = Object.freeze({
    syncApiKeys: true,
    syncTranscripts: true,
    syncSettings: true
  });
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

  // src/content/debug-drawer.js
  var DRAWER_CSS = (
    /* css */
    `
  :host {
    all: initial;
    position: fixed;
    left: 14px;
    bottom: 14px;
    z-index: 2147483646;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    color: #e6edf3;
    pointer-events: auto;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 11px;
    background: rgba(13, 17, 23, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 7px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    color: #e6edf3;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
  }

  .pill:hover {
    border-color: rgba(255, 255, 255, 0.32);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #3fb950;
  }
  .dot.error {
    background: #f85149;
  }

  .panel {
    width: 440px;
    max-width: calc(100vw - 28px);
    background: rgba(13, 17, 23, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.55);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel[hidden], .pill[hidden] {
    display: none !important;
  }

  .hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background: #161b22;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11.5px;
    font-weight: 600;
  }

  .hdr-actions {
    display: flex;
    gap: 5px;
  }

  button.act {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: #21262d;
    color: #e6edf3;
    border-radius: 5px;
    padding: 3px 7px;
    font-family: inherit;
    font-size: 10.5px;
    cursor: pointer;
  }
  button.act:hover {
    background: #30363d;
  }
  button.act.primary {
    border-color: rgba(56, 139, 253, 0.5);
    background: rgba(56, 139, 253, 0.18);
    color: #79c0ff;
  }

  .summary {
    padding: 6px 10px;
    font-size: 10.5px;
    line-height: 1.45;
    color: #8b949e;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: #0d1117;
  }

  .summary strong {
    color: #c9d1d9;
  }

  .logs {
    max-height: 210px;
    overflow-y: auto;
    padding: 6px 10px;
    font-size: 10.5px;
    line-height: 1.45;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .row {
    word-break: break-word;
    color: #c9d1d9;
  }
  .row .ts {
    color: #6e7681;
    margin-right: 5px;
  }
  .row .tag {
    display: inline-block;
    padding: 0 4px;
    border-radius: 3px;
    margin-right: 5px;
    font-size: 9.5px;
    font-weight: 700;
    background: rgba(110, 118, 129, 0.25);
    color: #c9d1d9;
  }
  .row.error {
    color: #ffa198;
  }
  .row.error .tag {
    background: rgba(248, 81, 73, 0.25);
    color: #ff7b72;
  }
  .row.ok .tag {
    background: rgba(63, 185, 80, 0.22);
    color: #56d364;
  }
`
  );
  var DebugDrawer = class {
    constructor({
      doc = globalThis.document,
      onForceScan = null,
      onCopyReport = null,
      onClear = null
    } = {}) {
      this.doc = doc;
      this.onForceScan = onForceScan;
      this.onCopyReport = onCopyReport;
      this.onClear = onClear;
      this.host = null;
      this.collapsed = false;
      this.entries = [];
      this.summaryState = {
        artifacts: 0,
        videos: 0,
        status: "idle",
        permissionsOk: true
      };
    }
    mount() {
      if (this.host || !this.doc?.body) return;
      const existing = this.doc.getElementById?.(DOM_SELECTORS.DEBUG_DRAWER_HOST_ID);
      if (existing) existing.remove?.();
      const host = this.doc.createElement("div");
      host.id = DOM_SELECTORS.DEBUG_DRAWER_HOST_ID;
      const shadow = host.attachShadow({ mode: "open" });
      const style = this.doc.createElement("style");
      style.textContent = DRAWER_CSS;
      const pill = this.doc.createElement("div");
      pill.className = "pill";
      pill.hidden = true;
      const dot = this.doc.createElement("span");
      dot.className = "dot";
      const pillLabel = this.doc.createElement("span");
      pillLabel.textContent = "LM Subs \xB7 Debug (0)";
      pill.append(dot, pillLabel);
      pill.addEventListener("click", () => {
        this.collapsed = false;
        this._syncVisibility();
      });
      const panel = this.doc.createElement("div");
      panel.className = "panel";
      const hdr = this.doc.createElement("div");
      hdr.className = "hdr";
      const title = this.doc.createElement("span");
      title.textContent = "LM Subs \xB7 Pipeline Monitor";
      const actions = this.doc.createElement("div");
      actions.className = "hdr-actions";
      const mkBtn = (label, cls, fn) => {
        const b = this.doc.createElement("button");
        b.type = "button";
        b.className = cls ? `act ${cls}` : "act";
        b.textContent = label;
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          fn(b);
        });
        return b;
      };
      const scanBtn = mkBtn("Scan / Retry", "primary", () => this.onForceScan?.());
      const copyBtn = mkBtn("Copy Report", "", async (btn) => {
        if (!this.onCopyReport) return;
        const ok = await this.onCopyReport();
        btn.textContent = ok ? "Copied!" : "Copy Failed";
        setTimeout(() => {
          btn.textContent = "Copy Report";
        }, 1600);
      });
      const clearBtn = mkBtn("Clear", "", () => {
        this.entries = [];
        this.renderLogs();
        this.onClear?.();
      });
      const minBtn = mkBtn("_", "", () => {
        this.collapsed = true;
        this._syncVisibility();
      });
      actions.append(scanBtn, copyBtn, clearBtn, minBtn);
      hdr.append(title, actions);
      const summary = this.doc.createElement("div");
      summary.className = "summary";
      const logs = this.doc.createElement("div");
      logs.className = "logs";
      panel.append(hdr, summary, logs);
      shadow.append(style, pill, panel);
      this.doc.body.appendChild(host);
      this.host = host;
      this.els = { pill, dot, pillLabel, panel, summary, logs };
      this.renderSummary();
      this.renderLogs();
      this._syncVisibility();
    }
    _syncVisibility() {
      if (!this.els) return;
      this.els.pill.hidden = !this.collapsed;
      this.els.panel.hidden = this.collapsed;
    }
    updateSummary(partial = {}) {
      this.summaryState = { ...this.summaryState, ...partial };
      this.renderSummary();
    }
    renderSummary() {
      if (!this.els) return;
      const s = this.summaryState;
      const permText = s.permissionsOk ? "OK" : "MISSING CDN PERM";
      this.els.summary.textContent = `Artifacts: ${s.artifacts}  |  <video> bound: ${s.videos}  |  State: ${s.status}  |  Perms: ${permText}`;
    }
    pushEntry(entry) {
      if (!entry) return;
      this.entries.push(entry);
      if (this.entries.length > 80) {
        this.entries.shift();
      }
      this.renderLogs();
    }
    setEntries(list = []) {
      this.entries = Array.isArray(list) ? list.slice(-80) : [];
      this.renderLogs();
    }
    renderLogs() {
      if (!this.els) return;
      const hasError = this.entries.some((e) => e.level === "error");
      this.els.dot.className = hasError ? "dot error" : "dot";
      this.els.pillLabel.textContent = `LM Subs \xB7 Debug (${this.entries.length})`;
      const container = this.els.logs;
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      if (this.entries.length === 0) {
        const empty = this.doc.createElement("div");
        empty.className = "row";
        empty.textContent = "Waiting for NotebookLM Video Overview activity...";
        container.appendChild(empty);
        return;
      }
      for (const item of this.entries.slice(-50)) {
        const row = this.doc.createElement("div");
        row.className = item.level === "error" ? "row error" : item.level === "ok" ? "row ok" : "row";
        const ts = this.doc.createElement("span");
        ts.className = "ts";
        ts.textContent = String(item.ts || "").slice(11, 19) || "--:--:--";
        const tag = this.doc.createElement("span");
        tag.className = "tag";
        tag.textContent = item.layer || "LOG";
        const msg = this.doc.createElement("span");
        msg.textContent = `${item.event ? item.event + ": " : ""}${item.detail || ""}`;
        row.append(ts, tag, msg);
        container.appendChild(row);
      }
      container.scrollTop = container.scrollHeight;
    }
    destroy() {
      if (this.host) {
        this.host.remove?.();
        this.host = null;
        this.els = null;
      }
    }
  };

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
    const trimmed = cleaned.replace(/^\uFEFF/, "").trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsedJson = JSON.parse(trimmed);
        const cueArray = Array.isArray(parsedJson) ? parsedJson : Array.isArray(parsedJson?.cues) ? parsedJson.cues : null;
        if (cueArray) {
          return normalizeAndSortCues(
            cueArray.map((c) => ({
              startSec: Number(c.startSec ?? c.start ?? 0),
              endSec: Number(c.endSec ?? c.end ?? 0),
              text: String(c.text || ""),
              ...c.speaker ? { speaker: String(c.speaker) } : {}
            })),
            offsetSec
          );
        }
      } catch {
      }
    }
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
    font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .toolbar {
    position: absolute;
    top: 52px;
    right: 14px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 4px 6px;
    border-radius: 7px;
    background: rgba(23, 26, 31, 0.95);
    border: 1px solid #272b33;
    pointer-events: auto;
    opacity: 0.96;
    font-variant-numeric: tabular-nums;
    transition: opacity 120ms ease;
  }
  .toolbar[data-idle="true"] {
    opacity: 0.24;
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
    gap: 4px;
    padding: 4px 7px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    color: #e5e7eb;
    background: transparent;
    transition: background-color 100ms ease, color 100ms ease;
    user-select: none;
    white-space: nowrap;
  }
  button:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fdfdfe;
  }
  button:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
  }
  button[data-active="true"] {
    background: #0055d4;
    color: #fdfdfe;
  }
  button[data-primary="true"] {
    background: #0055d4;
    color: #fdfdfe;
  }
  button[data-primary="true"]:hover {
    background: #0044aa;
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
    color: #93c5fd;
  }
  .status-pill[data-state="error"] {
    color: #f87171;
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
    padding: 7px 15px 8px;
    border-radius: 7px;
    background: rgba(11, 13, 16, 0.88);
    color: #fdfdfe;
    text-align: center;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.005em;
    white-space: pre-line;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .caption-box[data-visible="true"] {
    display: inline-block;
  }
  input[type="file"] {
    display: none;
  }
`;
  function triggerTextDownload(doc, content, filename, mimeType, mountContainer = null) {
    const blob = new Blob(["\uFEFF", content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    a.addEventListener("click", (ev) => {
      ev.stopPropagation();
    });
    const container = mountContainer || doc.fullscreenElement || doc.body || doc.documentElement;
    container?.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4e3);
  }
  function flashButtonLabel(btn, tempLabel, durationMs = 1200) {
    if (!btn) return;
    const original = btn.dataset.origLabel || btn.textContent;
    btn.dataset.origLabel = original;
    btn.textContent = tempLabel;
    btn.dataset.active = "true";
    setTimeout(() => {
      btn.textContent = original;
      btn.dataset.active = "false";
    }, durationMs);
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
    _resolveMountParent() {
      if (this.video?.parentElement) {
        return this.video.parentElement;
      }
      const root = this.video?.getRootNode?.();
      if (root && root !== this.doc && typeof root.appendChild === "function") {
        return root;
      }
      return null;
    }
    _ensureMounted() {
      const parent = this._resolveMountParent();
      if (!parent) return false;
      if (!this.host) {
        this._mount();
        return Boolean(this.host);
      }
      if (this.host.parentElement !== parent && parent !== this.host.getRootNode?.()) {
        try {
          if (parent.style) {
            const computedPos = globalThis.getComputedStyle?.(parent)?.position;
            if (!computedPos || computedPos === "static") {
              parent.style.position = "relative";
            }
          }
          parent.appendChild(this.host);
        } catch {
        }
      }
      return true;
    }
    _mount() {
      const parent = this._resolveMountParent();
      if (!parent) return;
      if (parent.style) {
        const computedPos = globalThis.getComputedStyle?.(parent)?.position;
        if (!computedPos || computedPos === "static") {
          parent.style.position = "relative";
        }
      }
      const old = parent.querySelector?.(`.${DOM_SELECTORS.OVERLAY_HOST_CLASS}`);
      if (old) old.remove();
      this.host = this.doc.createElement("div");
      this.host.className = DOM_SELECTORS.OVERLAY_HOST_CLASS;
      const shadow = this.host.attachShadow({ mode: "closed" });
      this.shadow = shadow;
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
      this.srtBtn = this._makeBtn(".SRT", "Export SubRip (.srt)", () => {
        if (this.cues.length === 0) return;
        this.exportSubtitles("srt");
        flashButtonLabel(this.srtBtn, "Saved");
      });
      this.vttBtn = this._makeBtn(".VTT", "Export WebVTT (.vtt)", () => {
        if (this.cues.length === 0) return;
        this.exportSubtitles("vtt");
        flashButtonLabel(this.vttBtn, "Saved");
      });
      this.txtBtn = this._makeBtn(".TXT", "Export readable plain-text transcript (.txt)", () => {
        if (this.cues.length === 0) return;
        this.exportSubtitles("txt");
        flashButtonLabel(this.txtBtn, "Saved");
      });
      this.copyBtn = this._makeBtn("Copy", "Copy transcript to clipboard", async () => {
        if (this.cues.length === 0) return;
        const text = formatTxt(this._shiftedCues(), {
          includeTimestamps: true,
          title: this.title
        });
        try {
          await globalThis.navigator?.clipboard?.writeText(text);
          flashButtonLabel(this.copyBtn, "Copied");
        } catch {
          this.exportSubtitles("txt");
          flashButtonLabel(this.copyBtn, "Saved");
        }
      });
      this.fileInput = this.doc.createElement("input");
      this.fileInput.type = "file";
      this.fileInput.accept = ".srt,.vtt,.json,text/vtt,text/plain,application/json";
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
      this.importBtn = this._makeBtn("Import", "Load external .srt, .vtt, or .json file", () => {
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
        this.vttBtn,
        this.txtBtn,
        this.copyBtn
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
      this._onTimeChange = () => {
        this._ensureMounted();
        this._renderActiveCue();
      };
      this._onPlay = () => {
        this._ensureMounted();
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
      this._ensureMounted();
      this.statusState = state;
      this.statusLabel = label;
      if (this.toolbar && state === "working") {
        this.toolbar.dataset.idle = "false";
      }
      this._renderToolbar();
    }
    toggleSubtitles() {
      if (this.cues.length === 0) return;
      this.ccEnabled = !this.ccEnabled;
      this._syncTrackVisibility();
      this._renderToolbar();
      this._renderActiveCue();
    }
    setCues(cues, { title, language = "en" } = {}) {
      this._ensureMounted();
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
    getExportCues() {
      return this._shiftedCues();
    }
    exportSubtitles(format = "srt") {
      if (this.cues.length === 0) return false;
      const { content, filename, mimeType } = serializeSubtitles(
        this._shiftedCues(),
        format,
        {
          title: this.title,
          language: this.language || "en"
        }
      );
      const openDialog = this.video?.closest?.("dialog[open]") || null;
      triggerTextDownload(
        this.doc,
        content,
        filename,
        mimeType,
        this.shadow || openDialog
      );
      return true;
    }
    _syncNativeTextTrack() {
      if (typeof this.video.addTextTrack !== "function" || typeof VTTCue === "undefined") {
        return;
      }
      try {
        if (!this.nativeTrack) {
          this.nativeTrack = this.video.addTextTrack(
            "subtitles",
            DOM_SELECTORS.TRACK_LABEL || "LM Subs",
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
    font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .toast {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 380px;
    padding: 10px 14px;
    border-radius: 8px;
    background: #111315;
    color: #f6f7f8;
    border: 1px solid #272b33;
    font-size: 12px;
    line-height: 1.4;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 120ms ease, transform 120ms ease;
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
    border-radius: 50%;
    flex-shrink: 0;
    background: #9ca3af;
  }
  .toast[data-kind="working"] .dot {
    background: #3b82f6;
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
    color: #fdfdfe;
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
      titleEl.textContent = String(title || "LM Subs");
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
  var GUARD_FLAG = "__notebooklmSubtitlesContentLoaded__";
  var BLOB_EXTRACT_TIMEOUT_MS = 4e3;
  var MAX_WAV_CHUNK_BYTES = 14 * 1024 * 1024;
  function uint8ToBase64(bytes) {
    let s = "";
    const CHUNK = 32768;
    for (let i = 0; i < bytes.byteLength; i += CHUNK) {
      s += String.fromCharCode.apply(
        null,
        bytes.subarray(i, Math.min(bytes.byteLength, i + CHUNK))
      );
    }
    return btoa(s);
  }
  function base64ToUint8(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function waitForBody(doc, callback) {
    if (doc?.body) {
      callback();
      return;
    }
    const check = () => {
      if (doc?.body) {
        doc.removeEventListener?.("DOMContentLoaded", check);
        callback();
      }
    };
    doc?.addEventListener?.("DOMContentLoaded", check);
    setTimeout(check, 250);
  }
  function collectVideosDeep(root, out = [], depth = 0) {
    if (!root || depth > 6) return out;
    try {
      if (root.tagName === "VIDEO" && !out.includes(root)) {
        out.push(root);
      }
      if (typeof root.querySelectorAll === "function") {
        const videos = root.querySelectorAll(DOM_SELECTORS.VIDEO_ELEMENT);
        for (const v of videos) {
          if (!out.includes(v)) out.push(v);
        }
        const allEls = root.querySelectorAll("*");
        for (const el of allEls) {
          if (el.shadowRoot) {
            collectVideosDeep(el.shadowRoot, out, depth + 1);
          }
        }
      }
    } catch {
    }
    return out;
  }
  async function initContentCoordinator({
    win = globalThis.window,
    doc = globalThis.document,
    runtime = globalThis.chrome?.runtime,
    storage = globalThis.chrome?.storage
  } = {}) {
    if (!win || !doc || !runtime) return null;
    if (!isNotebookLmHost(win.location?.hostname || "")) return null;
    if (win[GUARD_FLAG]) return win[GUARD_FLAG];
    const artifactsById = /* @__PURE__ */ new Map();
    const artifactsByToken = /* @__PURE__ */ new Map();
    const pendingGeneratedVideoIds = /* @__PURE__ */ new Set();
    const cachedKeys = /* @__PURE__ */ new Set();
    const inFlightKeys = /* @__PURE__ */ new Set();
    const exhaustedKeys = /* @__PURE__ */ new Set();
    const controllers = /* @__PURE__ */ new Map();
    const pendingPageRequests = /* @__PURE__ */ new Map();
    let pageReqSeq = 1;
    let createIntentTimestamp = 0;
    let lastActiveVideo = null;
    let permissionsOk = true;
    let settings = { ...DEFAULT_SETTINGS };
    let toast = null;
    let debugDrawer = null;
    const localDebugBuffer = [];
    let keepalivePort = null;
    let keepaliveTimer = null;
    function sendRuntimeMessage(message) {
      return new Promise((resolve) => {
        try {
          runtime.sendMessage(message, (res) => {
            const err = globalThis.chrome?.runtime?.lastError;
            if (err) {
              resolve({ ok: false, error: err.message });
              return;
            }
            resolve(res || { ok: false, error: "No response from background worker" });
          });
        } catch (err) {
          resolve({ ok: false, error: err?.message || String(err) });
        }
      });
    }
    function startKeepalive() {
      if (keepalivePort || !runtime?.connect) return;
      try {
        keepalivePort = runtime.connect({ name: KEEPALIVE_PORT_NAME });
        keepalivePort.onDisconnect.addListener(() => {
          keepalivePort = null;
          if (keepaliveTimer) {
            clearInterval(keepaliveTimer);
            keepaliveTimer = null;
          }
        });
        keepaliveTimer = setInterval(() => {
          try {
            keepalivePort?.postMessage({ ping: Date.now() });
          } catch {
          }
        }, 2e4);
      } catch {
      }
    }
    function stopKeepaliveIfIdle() {
      if (inFlightKeys.size > 0) return;
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }
      if (keepalivePort) {
        try {
          keepalivePort.disconnect();
        } catch {
        }
        keepalivePort = null;
      }
    }
    function recordDebug(layer, event, detail, level = "info") {
      const entry = {
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        layer,
        event,
        detail: sanitizeDebugMessage(detail),
        level
      };
      localDebugBuffer.push(entry);
      if (localDebugBuffer.length > 80) localDebugBuffer.shift();
      if (debugDrawer) {
        debugDrawer.pushEntry(entry);
        debugDrawer.updateSummary({
          artifacts: artifactsById.size,
          videos: controllers.size,
          permissionsOk
        });
      }
      if (settings.debugMode) {
        sendRuntimeMessage({
          type: RUNTIME_MESSAGE.APPEND_DEBUG_LOG,
          entry
        }).catch(() => {
        });
      }
    }
    function syncDebugDrawerLifecycle() {
      if (!settings.debugMode) {
        if (debugDrawer) {
          debugDrawer.destroy();
          debugDrawer = null;
        }
        return;
      }
      waitForBody(doc, () => {
        if (!settings.debugMode || debugDrawer) return;
        debugDrawer = new DebugDrawer({
          doc,
          onForceScan: () => {
            recordDebug("CONTENT", "manual.scan", "Manual scan & state replay requested");
            requestPageStateSnapshot();
            scanForVideos();
            const target = pickTargetVideoEntry();
            if (target) {
              ensureSubtitlesForEntry(target, { force: true, trigger: "manual" });
            } else {
              recordDebug(
                "CONTENT",
                "manual.scan",
                "No active <video> element in DOM yet \u2014 open a Studio Video Overview player",
                "error"
              );
            }
          },
          onCopyReport: async () => {
            const res = await sendRuntimeMessage({
              type: RUNTIME_MESSAGE.GET_DEBUG_REPORT,
              tabContext: buildTabDiagnosticSnapshot()
            });
            const text = res?.reportText || JSON.stringify(buildTabDiagnosticSnapshot(), null, 2);
            try {
              await win.navigator?.clipboard?.writeText(text);
              return true;
            } catch {
              return false;
            }
          },
          onClear: () => {
            localDebugBuffer.length = 0;
            sendRuntimeMessage({ type: RUNTIME_MESSAGE.CLEAR_DEBUG_LOGS }).catch(
              () => {
              }
            );
          }
        });
        debugDrawer.mount();
        debugDrawer.setEntries(localDebugBuffer);
        debugDrawer.updateSummary({
          artifacts: artifactsById.size,
          videos: controllers.size,
          status: pickTargetVideoEntry()?.controller?.statusState || "idle",
          permissionsOk
        });
      });
    }
    function ensureToast() {
      if (!toast && doc.body) {
        toast = createToastManager(doc);
      }
      return toast;
    }
    function showToast(title, detail = "", kind = "info", durationMs = 3800) {
      if (!settings.showToast || !settings.enabled) return;
      waitForBody(doc, () => {
        ensureToast()?.show({ title, detail, kind, durationMs });
      });
    }
    function hideToast() {
      toast?.hide?.();
    }
    function getPostOrigin() {
      return win.location?.origin && win.location.origin !== "null" ? win.location.origin : "*";
    }
    function syncRpcOverridesToPage() {
      try {
        win.postMessage(
          {
            source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
            type: PAGE_MESSAGE.SYNC_RPC_OVERRIDES,
            rpcOverrides: settings.rpcOverrides || {}
          },
          getPostOrigin()
        );
      } catch {
      }
    }
    function requestPageStateSnapshot() {
      try {
        win.postMessage(
          {
            source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
            type: PAGE_MESSAGE.REQUEST_PAGE_STATE
          },
          getPostOrigin()
        );
      } catch {
      }
    }
    function requestPageBlobExtraction({ videoCurrentSrc }) {
      return new Promise((resolve) => {
        const requestId = `extract_${Date.now()}_${pageReqSeq++}`;
        const timer = setTimeout(() => {
          pendingPageRequests.delete(requestId);
          resolve({
            ok: false,
            error: "Timed out reading in-memory Blob stream."
          });
        }, BLOB_EXTRACT_TIMEOUT_MS);
        pendingPageRequests.set(requestId, { resolve, timer });
        try {
          win.postMessage(
            {
              source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
              type: PAGE_MESSAGE.EXTRACT_AUDIO_REQUEST,
              payload: {
                requestId,
                candidateUrls: [],
                videoCurrentSrc,
                blobOnly: true
              }
            },
            getPostOrigin()
          );
        } catch (err) {
          clearTimeout(timer);
          pendingPageRequests.delete(requestId);
          resolve({ ok: false, error: err?.message || String(err) });
        }
      });
    }
    function getNotebookIdFromUrl() {
      const match = (win.location?.pathname || "").match(NOTEBOOK_URL_ID_REGEX);
      return match ? match[1] : null;
    }
    function getNotebookTitleFallback() {
      return (doc.title || "NotebookLM Video Overview").replace(/\s*[-–|]\s*(?:NotebookLM|Gemini Notebook).*$/i, "").trim() || "NotebookLM Video Overview";
    }
    function isLikelySilentCardPreviewVideo(video) {
      try {
        const src = video.currentSrc || video.src || "";
        if (src && isThumbnailOrManifestUrl(src)) {
          const insideDialog = Boolean(
            video.closest?.(
              '[role="dialog"], .cdk-overlay-container, mat-dialog-container'
            )
          );
          if (!insideDialog) return true;
        }
        if (video.muted && video.loop && video.videoWidth > 0 && video.videoWidth <= 520 && !video.controls) {
          return true;
        }
      } catch {
      }
      return false;
    }
    function matchArtifactForVideo(video) {
      const src = video.currentSrc || video.src || "";
      const token = extractMediaToken(src);
      if (token && artifactsByToken.has(token)) {
        return artifactsByToken.get(token);
      }
      const readyList = [...artifactsById.values()].filter(
        (a) => a.status === "ready" && (a.mediaUrl || a.progressiveUrl || a.mediaVariants?.length)
      );
      if (readyList.length === 1) {
        return readyList[0];
      }
      if (Number.isFinite(video.duration) && video.duration > 0) {
        let best = null;
        let bestDiff = Infinity;
        for (const art of readyList) {
          if (typeof art.durationSeconds === "number") {
            const diff = Math.abs(art.durationSeconds - video.duration);
            if (diff < 3 && diff < bestDiff) {
              best = art;
              bestDiff = diff;
            }
          }
        }
        if (best) return best;
      }
      return readyList[readyList.length - 1] || null;
    }
    function discoverResourceTimingMediaUrls() {
      const urls = [];
      try {
        const entries = win.performance?.getEntriesByType?.("resource") || [];
        for (let i = entries.length - 1; i >= 0; i--) {
          const e = entries[i];
          const url = e?.name || "";
          if (!isTrustedGoogleMediaUrl(url)) continue;
          if (e.initiatorType === "img" || e.initiatorType === "css") continue;
          if (isThumbnailOrManifestUrl(url)) continue;
          if (e.initiatorType === "video" || e.initiatorType === "audio" || e.initiatorType === "media" || /videoplayback|=m(?:18|22|37|140)(?:-dv)?(?:$|\?)/i.test(url)) {
            if (!urls.includes(url)) urls.push(url);
          }
        }
      } catch {
      }
      return urls;
    }
    async function stageBlobChunksToServiceWorker(blobResult) {
      const stagedJobId = `blob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const totalChunks = blobResult.chunks.length;
      for (let i = 0; i < totalChunks; i++) {
        const ch = blobResult.chunks[i];
        const bytes = new Uint8Array(ch.buffer);
        const res = await sendRuntimeMessage({
          type: RUNTIME_MESSAGE.STAGE_AUDIO_CHUNK,
          stagedJobId,
          index: i,
          totalChunks,
          originalBytes: blobResult.originalBytes,
          extractedBytes: blobResult.extractedBytes,
          chunk: {
            base64: uint8ToBase64(bytes),
            mimeType: ch.mimeType,
            fileName: ch.fileName,
            startOffsetSec: ch.startOffsetSec,
            durationSec: ch.durationSec
          }
        });
        if (!res?.ok) {
          return null;
        }
      }
      return stagedJobId;
    }
    async function decodeBase64MediaToWavFallback(base64Media) {
      const AudioCtx = win.AudioContext || win.webkitAudioContext;
      const OfflineCtx = win.OfflineAudioContext || win.webkitOfflineAudioContext;
      if (!AudioCtx || !OfflineCtx) {
        throw new Error("WebAudio unavailable for WAV fallback.");
      }
      const raw = base64ToUint8(base64Media);
      const ctx = new AudioCtx();
      let decoded;
      try {
        const copy = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
        decoded = await ctx.decodeAudioData(copy);
      } finally {
        try {
          await ctx.close();
        } catch {
        }
      }
      const sampleRate = decoded.duration > 600 ? 12e3 : 16e3;
      const totalSamples = Math.max(1, Math.ceil(decoded.duration * sampleRate));
      const offline = new OfflineCtx(1, totalSamples, sampleRate);
      const src = offline.createBufferSource();
      src.buffer = decoded;
      src.connect(offline.destination);
      src.start(0);
      const rendered = await offline.startRendering();
      const wavChunks = slicePcmIntoWavChunks(
        rendered.getChannelData(0),
        sampleRate,
        MAX_WAV_CHUNK_BYTES
      );
      return wavChunks.map((c) => ({
        base64: uint8ToBase64(c.bytes),
        mimeType: c.mimeType,
        fileName: c.fileName,
        startOffsetSec: c.startOffsetSec,
        durationSec: c.durationSec
      }));
    }
    async function ensureSubtitlesForEntry(entry, { force = false, trigger = "player_open" } = {}) {
      if (!entry || entry.inFlight) return;
      const { video, controller } = entry;
      lastActiveVideo = video;
      let artifact = matchArtifactForVideo(video);
      if (!artifact) {
        requestPageStateSnapshot();
        artifact = matchArtifactForVideo(video);
      }
      const rawSrc = video.currentSrc || video.src || "";
      const timingUrls = discoverResourceTimingMediaUrls();
      const mediaVariants = [];
      const pushVariant = (u) => {
        if (typeof u === "string" && isTrustedGoogleMediaUrl(u) && !mediaVariants.includes(u)) {
          mediaVariants.push(u);
        }
      };
      if (artifact?.directAudioUrl) pushVariant(artifact.directAudioUrl);
      if (Array.isArray(artifact?.mediaVariants)) {
        for (const v of artifact.mediaVariants) pushVariant(v);
      }
      if (artifact?.progressiveUrl && !isThumbnailOrManifestUrl(artifact.progressiveUrl)) {
        pushVariant(artifact.progressiveUrl);
      }
      if (artifact?.mediaUrl && !isThumbnailOrManifestUrl(artifact.mediaUrl)) {
        pushVariant(artifact.mediaUrl);
      }
      if (isTrustedGoogleMediaUrl(rawSrc) && !isThumbnailOrManifestUrl(rawSrc)) {
        pushVariant(rawSrc);
      }
      for (const u of timingUrls) pushVariant(u);
      const primaryMediaUrl = mediaVariants[0] || artifact?.progressiveUrl || artifact?.mediaUrl || (isTrustedGoogleMediaUrl(rawSrc) ? rawSrc : "") || (rawSrc.startsWith("blob:") ? rawSrc : "");
      const isBlobSrc = rawSrc.startsWith("blob:");
      if (!primaryMediaUrl) {
        recordDebug(
          "CONTENT",
          "ensure.waiting_url",
          `Waiting for media URL (artifacts=${artifactsById.size}, src=${summarizeMediaUrlForDebug(rawSrc)})`
        );
        return;
      }
      const artifactId = artifact?.artifactId || null;
      const mediaToken = artifact?.mediaToken || extractMediaToken(primaryMediaUrl) || null;
      const title = artifact?.title || getNotebookTitleFallback();
      const isNewlyGenerated = Boolean(
        artifactId && pendingGeneratedVideoIds.has(artifactId)
      );
      const effectiveTrigger = force ? "manual" : isNewlyGenerated ? "generate" : trigger;
      const decision = shouldGenerateSubtitles({
        settings,
        trigger: effectiveTrigger,
        force,
        status: "ready",
        title,
        artifactId: artifactId || (!mediaToken && isBlobSrc ? `blob_${Math.round((video.duration || 1) * 10)}` : null),
        mediaToken,
        mediaUrl: primaryMediaUrl,
        cachedKeys,
        inFlightKeys,
        exhaustedKeys
      });
      if (!decision.allow) {
        if (decision.reason === "already_cached" && controller.cues.length === 0) {
          const cached = await sendRuntimeMessage({
            type: RUNTIME_MESSAGE.GET_CACHED_SUBTITLES,
            cacheKey: decision.cacheKey,
            artifactId,
            mediaToken
          });
          if (cached?.ok && cached.entry?.cues?.length > 0) {
            controller.setCues(cached.entry.cues, {
              title: cached.entry.title || title,
              language: cached.entry.language || "en"
            });
            recordDebug(
              "CONTENT",
              "ensure.cache_mount",
              `Mounted ${cached.entry.cues.length} cached cues on <video>`,
              "ok"
            );
            return;
          }
        }
        recordDebug(
          "CONTENT",
          "ensure.skipped",
          `Decision gate skipped (${decision.reason}) for "${title.slice(0, 38)}"`
        );
        return;
      }
      const cacheKey = decision.cacheKey;
      entry.inFlight = true;
      entry.artifactId = artifactId;
      entry.cacheKey = cacheKey;
      inFlightKeys.add(cacheKey);
      startKeepalive();
      controller.setStatus("working", "Generating subtitles\u2026");
      debugDrawer?.updateSummary({ status: "working" });
      recordDebug(
        "CONTENT",
        "ensure.start",
        `Pipeline started for "${title.slice(0, 34)}" (key=${cacheKey.slice(
          0,
          22
        )}, variants=${mediaVariants.length}, blob=${isBlobSrc})`
      );
      try {
        if (!force) {
          const cachedRes = await sendRuntimeMessage({
            type: RUNTIME_MESSAGE.GET_CACHED_SUBTITLES,
            cacheKey,
            artifactId,
            mediaToken
          });
          if (cachedRes?.ok && cachedRes.entry?.cues?.length > 0) {
            cachedKeys.add(cacheKey);
            controller.setCues(cachedRes.entry.cues, {
              title: cachedRes.entry.title || title,
              language: cachedRes.entry.language || artifact?.language || "en"
            });
            debugDrawer?.updateSummary({
              status: `ready (${cachedRes.entry.cues.length} cached)`
            });
            recordDebug(
              "CONTENT",
              "ensure.cache_hit",
              `Loaded ${cachedRes.entry.cues.length} cached cues (${cachedRes.entry.provider})`,
              "ok"
            );
            showToast(
              "Loaded cached subtitles",
              `${cachedRes.entry.cues.length} cues \xB7 ${title}`,
              "success",
              2600
            );
            return;
          }
        }
        showToast(
          "Extracting audio from Video Overview\u2026",
          title,
          "working",
          0
        );
        let stagedJobId = null;
        if (isBlobSrc) {
          const blobResult = await requestPageBlobExtraction({
            videoCurrentSrc: rawSrc
          });
          if (blobResult?.ok && Array.isArray(blobResult.chunks) && blobResult.chunks.length > 0) {
            stagedJobId = await stageBlobChunksToServiceWorker(blobResult);
            if (stagedJobId) {
              recordDebug(
                "CONTENT",
                "blob.staged",
                `Staged ${Math.round((blobResult.extractedBytes || 0) / 1024)} KB in-memory audio to Service Worker`,
                "ok"
              );
            }
          }
        }
        recordDebug(
          "CONTENT",
          "ensure.sw_dispatch",
          `Sending ENSURE_SUBTITLES to Service Worker (variants=${mediaVariants.length}, staged=${Boolean(
            stagedJobId
          )})`
        );
        const res = await sendRuntimeMessage({
          type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
          stagedJobId,
          force: Boolean(force),
          artifact: {
            cacheKey,
            artifactId,
            notebookId: artifact?.notebookId || getNotebookIdFromUrl(),
            mediaToken,
            title,
            language: artifact?.language || null,
            mediaUrl: primaryMediaUrl,
            progressiveUrl: artifact?.progressiveUrl && !isThumbnailOrManifestUrl(artifact.progressiveUrl) && artifact.progressiveUrl || primaryMediaUrl,
            mediaVariants,
            durationSeconds: artifact?.durationSeconds || (Number.isFinite(video.duration) ? video.duration : null)
          }
        });
        if (!res?.ok || !res.entry?.cues?.length) {
          if (res?.missingPermissions) {
            permissionsOk = false;
            debugDrawer?.updateSummary({ permissionsOk: false });
          }
          exhaustedKeys.add(cacheKey);
          throw new Error(res?.error || "Subtitle generation failed.");
        }
        const saved = res.entry;
        cachedKeys.add(cacheKey);
        exhaustedKeys.delete(cacheKey);
        if (artifactId) pendingGeneratedVideoIds.delete(artifactId);
        controller.setCues(saved.cues, {
          title: saved.title || title,
          language: saved.language || artifact?.language || "en"
        });
        debugDrawer?.updateSummary({ status: `ready (${saved.cues.length} cues)` });
        const ratioDetail = saved.extractedBytes && saved.originalBytes ? ` \xB7 ${(saved.extractedBytes / 1048576).toFixed(1)} MB audio` : "";
        recordDebug(
          "CONTENT",
          "ensure.ok",
          `Rendered ${saved.cues.length} cues via ${saved.provider || "AI"}${ratioDetail}`,
          "ok"
        );
        showToast(
          res.cached ? `Loaded cached subtitles (${saved.cues.length} cues)` : `Subtitles ready (${saved.cues.length} cues)`,
          `${saved.provider || "AI"}${ratioDetail} \xB7 ${saved.title || title}`,
          "success",
          4e3
        );
      } catch (err) {
        const msg = err?.message || String(err);
        controller.setStatus("error", "Subtitle error");
        debugDrawer?.updateSummary({ status: "error" });
        recordDebug("CONTENT", "ensure.error", msg, "error");
        showToast("Subtitle generation failed", msg, "error", 6200);
      } finally {
        entry.inFlight = false;
        inFlightKeys.delete(cacheKey);
        stopKeepaliveIfIdle();
      }
    }
    function bindVideoElement(video) {
      if (!video || controllers.has(video)) return controllers.get(video) || null;
      if (isLikelySilentCardPreviewVideo(video)) {
        return null;
      }
      const entry = {
        video,
        controller: null,
        artifactId: null,
        cacheKey: null,
        inFlight: false
      };
      const controller = new VideoSubtitleController(video, {
        doc,
        initialFontSize: settings.fontSize,
        initialOffsetSec: settings.subtitleOffsetSec,
        onRequestGenerate: ({ force } = {}) => {
          ensureSubtitlesForEntry(entry, {
            force: Boolean(force),
            trigger: "manual"
          });
        },
        onFontSizeChange: (fontSize) => {
          settings.fontSize = fontSize;
          saveSettings({ fontSize }).catch(() => {
          });
        },
        onOffsetChange: (subtitleOffsetSec) => {
          settings.subtitleOffsetSec = subtitleOffsetSec;
          saveSettings({ subtitleOffsetSec }).catch(() => {
          });
        },
        onImportSubtitles: (cues, fileName) => {
          const artifact = matchArtifactForVideo(video);
          const mediaUrl = artifact?.mediaUrl || video.currentSrc || video.src || "";
          const mediaToken = artifact?.mediaToken || extractMediaToken(mediaUrl);
          const cacheKey = resolveSubtitleCacheKey({
            artifactId: artifact?.artifactId,
            mediaToken,
            mediaUrl
          }) || `import:${fileName}`;
          sendRuntimeMessage({
            type: RUNTIME_MESSAGE.SAVE_IMPORTED_SUBTITLES,
            entry: {
              cacheKey,
              artifactId: artifact?.artifactId || null,
              mediaToken: mediaToken || null,
              title: artifact?.title || getNotebookTitleFallback(),
              language: artifact?.language || "en",
              provider: "imported",
              model: fileName,
              cues
            }
          });
          cachedKeys.add(cacheKey);
          showToast(
            `Imported ${cues.length} cues`,
            fileName,
            "success",
            3200
          );
        }
      });
      entry.controller = controller;
      controllers.set(video, entry);
      lastActiveVideo = video;
      recordDebug(
        "CONTENT",
        "video.bound",
        `Bound <video> overlay (mounted=${Boolean(
          controller.host
        )}, src=${summarizeMediaUrlForDebug(video.currentSrc || video.src || "")})`
      );
      const onMediaReady = () => {
        lastActiveVideo = video;
        controller._ensureMounted?.();
        ensureSubtitlesForEntry(entry, { force: false, trigger: "player_open" });
      };
      video.addEventListener("loadedmetadata", onMediaReady);
      video.addEventListener("play", onMediaReady);
      if (video.readyState >= 1 || video.currentSrc || video.src) {
        ensureSubtitlesForEntry(entry, { force: false, trigger: "player_open" });
      }
      return entry;
    }
    function scanForVideos() {
      for (const [video, entry] of controllers.entries()) {
        if (!video.isConnected) {
          entry.controller.destroy();
          controllers.delete(video);
        } else {
          entry.controller._ensureMounted?.();
        }
      }
      const videos = collectVideosDeep(doc);
      for (const video of videos) {
        bindVideoElement(video);
      }
    }
    function ingestArtifactsList(artifacts = [], isCreateVideoRequest = false) {
      if (isCreateVideoRequest) {
        createIntentTimestamp = Date.now();
        showToast(
          "Video Overview queued",
          "Subtitles will generate automatically as soon as rendering finishes.",
          "info",
          4e3
        );
      }
      if (!Array.isArray(artifacts) || artifacts.length === 0) return;
      let newlyReadyCount = 0;
      for (const art of artifacts) {
        if (!art?.artifactId) continue;
        const previous = artifactsById.get(art.artifactId);
        if (art.status === "initializing" || art.status === "processing" || isCreateVideoRequest && !previous || Date.now() - createIntentTimestamp < 45e3) {
          pendingGeneratedVideoIds.add(art.artifactId);
        }
        artifactsById.set(art.artifactId, art);
        if (art.mediaToken) {
          artifactsByToken.set(art.mediaToken, art);
        }
        if (art.status === "ready" && (art.mediaUrl || art.progressiveUrl || art.mediaVariants?.length) && previous?.status !== "ready") {
          newlyReadyCount++;
          recordDebug(
            "CONTENT",
            "artifact.ready",
            `Artifact ${art.artifactId.slice(0, 8)} ready ("${(art.title || "Untitled").slice(0, 34)}") variants=${art.mediaVariants?.length || 0}`,
            "ok"
          );
        }
      }
      if (debugDrawer) {
        debugDrawer.updateSummary({
          artifacts: artifactsById.size,
          videos: controllers.size
        });
      }
      if (newlyReadyCount > 0) {
        for (const entry of controllers.values()) {
          if (entry.controller.cues.length === 0 && !entry.inFlight) {
            ensureSubtitlesForEntry(entry, {
              force: false,
              trigger: "player_open"
            });
          }
        }
      }
      for (const art of artifacts) {
        if (art.status === "ready" && (art.mediaUrl || art.progressiveUrl || art.mediaVariants?.length) && pendingGeneratedVideoIds.has(art.artifactId)) {
          const primaryUrl = art.mediaVariants?.[0] || art.progressiveUrl || art.mediaUrl;
          const decision = shouldGenerateSubtitles({
            settings,
            trigger: "generate",
            force: false,
            status: "ready",
            title: art.title || getNotebookTitleFallback(),
            artifactId: art.artifactId,
            mediaToken: art.mediaToken,
            mediaUrl: primaryUrl,
            cachedKeys,
            inFlightKeys,
            exhaustedKeys
          });
          if (decision.allow) {
            pendingGeneratedVideoIds.delete(art.artifactId);
            inFlightKeys.add(decision.cacheKey);
            startKeepalive();
            showToast(
              "Video Overview ready \u2014 generating subtitles\u2026",
              art.title || "Untitled",
              "working",
              4500
            );
            sendRuntimeMessage({
              type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
              force: false,
              artifact: {
                cacheKey: decision.cacheKey,
                artifactId: art.artifactId,
                notebookId: art.notebookId || getNotebookIdFromUrl(),
                mediaToken: art.mediaToken,
                title: art.title || getNotebookTitleFallback(),
                language: art.language || null,
                mediaUrl: primaryUrl,
                progressiveUrl: art.progressiveUrl || primaryUrl,
                mediaVariants: art.mediaVariants || [],
                durationSeconds: art.durationSeconds || null
              }
            }).then((res) => {
              if (res?.ok && res.entry?.cues?.length > 0) {
                cachedKeys.add(decision.cacheKey);
                showToast(
                  `Subtitles ready (${res.entry.cues.length} cues)`,
                  `Open "${art.title || "Video Overview"}" to watch with CC`,
                  "success",
                  4500
                );
                scanForVideos();
              }
            }).finally(() => {
              inFlightKeys.delete(decision.cacheKey);
              stopKeepaliveIfIdle();
            });
          }
        }
      }
    }
    function pickTargetVideoEntry() {
      if (lastActiveVideo && controllers.has(lastActiveVideo)) {
        return controllers.get(lastActiveVideo);
      }
      return [...controllers.values()].pop() || null;
    }
    function buildTabDiagnosticSnapshot() {
      const videos = [];
      for (const [video, entry] of controllers.entries()) {
        videos.push({
          connected: Boolean(video.isConnected),
          overlayMounted: Boolean(entry.controller?.host?.isConnected),
          status: entry.controller?.statusState || "idle",
          cueCount: entry.controller?.cues?.length || 0,
          duration: Number.isFinite(video.duration) ? Math.round(video.duration * 10) / 10 : null,
          readyState: video.readyState,
          srcSummary: summarizeMediaUrlForDebug(video.currentSrc || video.src || "")
        });
      }
      const artifacts = [...artifactsById.values()].map((a) => ({
        id: a.artifactId?.slice(0, 12),
        status: a.status,
        origin: a.origin || "rpc",
        variantCount: a.mediaVariants?.length || 0,
        mediaSummary: summarizeMediaUrlForDebug(
          a.mediaVariants?.[0] || a.progressiveUrl || a.mediaUrl || ""
        )
      }));
      return {
        host: win.location?.hostname || "",
        pathname: win.location?.pathname || "",
        artifactCount: artifacts.length,
        videoCount: videos.length,
        permissionsOk,
        artifacts,
        videos
      };
    }
    win.addEventListener("message", (event) => {
      if (event.source !== win) return;
      const msg = event.data;
      if (!msg || msg.source !== PAGE_MESSAGE.BRIDGE_SOURCE_PAGE) return;
      if (msg.type === PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE) {
        const reqId = msg.payload?.requestId;
        const pending = reqId ? pendingPageRequests.get(reqId) : null;
        if (pending) {
          clearTimeout(pending.timer);
          pendingPageRequests.delete(reqId);
          pending.resolve(msg.payload);
        }
        return;
      }
      if (msg.type === PAGE_MESSAGE.PAGE_DEBUG_EVENT) {
        const p = msg.payload || {};
        recordDebug(p.layer || "PAGE", p.event || "event", p.detail || "");
        if (p.event === "video.play") {
          scanForVideos();
        }
        return;
      }
      if (msg.type === PAGE_MESSAGE.PAGE_STATE_SNAPSHOT) {
        const snap = msg.payload || {};
        if (Array.isArray(snap.artifacts) && snap.artifacts.length > 0) {
          ingestArtifactsList(snap.artifacts, false);
        }
        recordDebug(
          "PAGE",
          "state.snapshot",
          `Synced ${snap.artifacts?.length || 0} artifact(s), ${snap.rpcTrace?.length || 0} RPC(s), ssrScanned=${Boolean(snap.ssrScanned)}`
        );
        return;
      }
      if (msg.type === PAGE_MESSAGE.BATCH_ARTIFACTS) {
        ingestArtifactsList(
          msg.payload?.artifacts || [],
          Boolean(msg.payload?.isCreateVideoRequest)
        );
      }
    });
    const handleCapturedMediaEvent = (event) => {
      try {
        const path = typeof event.composedPath === "function" ? event.composedPath() : [];
        const candidate = path[0] || event.target;
        if (candidate && candidate.tagName === "VIDEO") {
          const entry = bindVideoElement(candidate);
          if (entry && (event.type === "play" || event.type === "loadedmetadata")) {
            ensureSubtitlesForEntry(entry, {
              force: false,
              trigger: "player_open"
            });
          }
        }
      } catch {
      }
    };
    for (const mediaEvt of ["loadedmetadata", "canplay", "play"]) {
      doc.addEventListener?.(mediaEvt, handleCapturedMediaEvent, true);
    }
    doc.addEventListener?.("keydown", (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== "c" && e.key !== "C") return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable) {
        return;
      }
      const active = pickTargetVideoEntry();
      if (active) {
        active.controller.toggleSubtitles();
      }
    });
    runtime.onMessage?.addListener((msg, _sender, sendResponse) => {
      if (!msg || typeof msg.type !== "string") return false;
      if (!msg.type.startsWith(MESSAGE_NAMESPACE)) return false;
      if (msg.type === RUNTIME_MESSAGE.SUBTITLES_PROGRESS) {
        const active = pickTargetVideoEntry();
        if (active && active.inFlight) {
          active.controller.setStatus("working", msg.label || "Transcribing\u2026");
        }
        if (msg.label) {
          showToast(msg.label, msg.detail || "", "working", 0);
        }
        return false;
      }
      if (msg.type === RUNTIME_MESSAGE.SUBTITLES_PARTIAL && Array.isArray(msg.cues)) {
        const active = pickTargetVideoEntry();
        if (active && msg.cues.length > 0) {
          active.controller.setCues(msg.cues, {
            title: msg.title || active.controller.title || "Video Overview",
            language: msg.language || "en"
          });
        }
        showToast(
          `Live captions active (${msg.completedChunks}/${msg.totalChunks} segments)`,
          `${msg.cues.length} cues mounted while remaining audio transcribes`,
          "working",
          0
        );
        return false;
      }
      if (msg.type === RUNTIME_MESSAGE.DECODE_WAV_FALLBACK && msg.base64Media) {
        decodeBase64MediaToWavFallback(msg.base64Media).then((chunks) => sendResponse({ ok: true, chunks })).catch(
          (err) => sendResponse({ ok: false, error: err?.message || String(err) })
        );
        return true;
      }
      if (msg.type === RUNTIME_MESSAGE.GET_ACTIVE_TAB_STATE) {
        requestPageStateSnapshot();
        scanForVideos();
        const target = pickTargetVideoEntry();
        const allArts = [...artifactsById.values()];
        const readyArts = allArts.filter((a) => a.status === "ready");
        const generatingArts = allArts.filter(
          (a) => a.status === "initializing" || a.status === "processing"
        );
        const matched = target ? matchArtifactForVideo(target.video) : readyArts[readyArts.length - 1] || null;
        const hasLiveCues = Boolean(target && target.controller.cues.length > 0);
        sendResponse({
          ok: true,
          hasVideoElement: controllers.size > 0,
          videoCount: controllers.size,
          readyArtifactCount: readyArts.length,
          generatingCount: generatingArts.length,
          hasSubtitles: hasLiveCues,
          activeArtifact: matched ? { artifactId: matched.artifactId, title: matched.title } : target ? { title: target.controller.title || getNotebookTitleFallback() } : null,
          activeSubtitles: hasLiveCues ? {
            title: matched?.title || target.controller.title || getNotebookTitleFallback(),
            language: target.controller.language || "en",
            cues: target.controller.getExportCues()
          } : null,
          diagnostics: buildTabDiagnosticSnapshot()
        });
        return false;
      }
      if (msg.type === RUNTIME_MESSAGE.TRIGGER_ACTIVE_VIDEO) {
        requestPageStateSnapshot();
        scanForVideos();
        const target = pickTargetVideoEntry();
        if (!target) {
          const readyArt = [...artifactsById.values()].filter((a) => a.status === "ready" && (a.mediaUrl || a.progressiveUrl || a.mediaVariants?.length)).pop();
          if (!readyArt) {
            sendResponse({
              ok: false,
              error: "Open a Video Overview in NotebookLM Studio first, then click Generate."
            });
            return false;
          }
          const primaryUrl = readyArt.mediaVariants?.[0] || readyArt.progressiveUrl || readyArt.mediaUrl;
          const cacheKey = resolveSubtitleCacheKey({
            artifactId: readyArt.artifactId,
            mediaToken: readyArt.mediaToken,
            mediaUrl: primaryUrl
          });
          showToast(
            "Generating subtitles in background\u2026",
            readyArt.title || "Video Overview",
            "working",
            0
          );
          sendRuntimeMessage({
            type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
            force: Boolean(msg.force),
            artifact: {
              cacheKey,
              artifactId: readyArt.artifactId,
              notebookId: readyArt.notebookId || getNotebookIdFromUrl(),
              mediaToken: readyArt.mediaToken,
              title: readyArt.title || getNotebookTitleFallback(),
              language: readyArt.language || null,
              mediaUrl: primaryUrl,
              progressiveUrl: readyArt.progressiveUrl || primaryUrl,
              mediaVariants: readyArt.mediaVariants || [],
              durationSeconds: readyArt.durationSeconds || null
            }
          }).then((res) => {
            if (res?.ok && res.entry?.cues?.length > 0) {
              cachedKeys.add(cacheKey);
              showToast(
                `Subtitles ready (${res.entry.cues.length} cues)`,
                `Open "${readyArt.title || "Video Overview"}" to watch with CC`,
                "success",
                4500
              );
            } else {
              showToast(
                "Subtitle generation failed",
                res?.error || "Failed",
                "error",
                6e3
              );
            }
          });
          sendResponse({
            ok: true,
            title: readyArt.title || getNotebookTitleFallback()
          });
          return false;
        }
        const matched = matchArtifactForVideo(target.video);
        const title = matched?.title || target.controller.title || getNotebookTitleFallback();
        ensureSubtitlesForEntry(target, {
          force: Boolean(msg.force),
          trigger: "manual"
        });
        sendResponse({
          ok: true,
          title,
          cueCount: target.controller.cues.length
        });
        return false;
      }
      return false;
    });
    try {
      storage?.onChanged?.addListener((changes, areaName) => {
        if (areaName !== "local" || !changes?.settings?.newValue) return;
        settings = { ...settings, ...changes.settings.newValue };
        syncRpcOverridesToPage();
        syncDebugDrawerLifecycle();
        for (const entry of controllers.values()) {
          entry.controller.setSettings({
            fontSize: settings.fontSize,
            subtitleOffsetSec: settings.subtitleOffsetSec
          });
        }
      });
    } catch {
    }
    try {
      settings = await getSettings();
    } catch {
      settings = { ...DEFAULT_SETTINGS };
    }
    syncRpcOverridesToPage();
    syncDebugDrawerLifecycle();
    recordDebug(
      "CONTENT",
      "coordinator.ready",
      `Initialized on ${win.location?.hostname}${win.location?.pathname || ""}`
    );
    requestPageStateSnapshot();
    if (doc.readyState === "loading") {
      doc.addEventListener?.(
        "DOMContentLoaded",
        () => {
          requestPageStateSnapshot();
          scanForVideos();
        },
        { once: true }
      );
    }
    const attachObserver = () => {
      const rootNode = doc.body || doc.documentElement;
      if (!rootNode || typeof MutationObserver === "undefined") {
        scanForVideos();
        return null;
      }
      let scanScheduled = false;
      const obs = new MutationObserver(() => {
        if (scanScheduled) return;
        scanScheduled = true;
        setTimeout(() => {
          scanScheduled = false;
          scanForVideos();
        }, 60);
      });
      obs.observe(rootNode, { childList: true, subtree: true });
      scanForVideos();
      return obs;
    };
    let observer = attachObserver();
    if (!observer && doc.readyState === "loading") {
      doc.addEventListener?.(
        "DOMContentLoaded",
        () => {
          observer = attachObserver();
        },
        { once: true }
      );
    }
    const api = {
      scanForVideos,
      controllers,
      artifactsById,
      requestPageStateSnapshot,
      getDiagnostics: buildTabDiagnosticSnapshot,
      hideToast,
      destroy() {
        observer?.disconnect();
        debugDrawer?.destroy();
        for (const entry of controllers.values()) {
          entry.controller.destroy();
        }
        controllers.clear();
      }
    };
    win[GUARD_FLAG] = api;
    return api;
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    initContentCoordinator().catch(() => {
    });
  }
})();

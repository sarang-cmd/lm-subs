(() => {
  // src/config/selectors.js
  var HOSTED_CLOUD_URL = "https://lm-subs.vercel.app";
  var ALARM_NAMES = Object.freeze({
    UPDATE_CHECK: "lmsubs-update-check",
    CLOUD_SYNC: "lmsubs-cloud-sync"
  });
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
      AUDIO_METADATA: 6,
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
  var ARTIFACT_TYPE = BATCHEXECUTE.ARTIFACT_TYPES;
  var DOM_SELECTORS = Object.freeze({
    VIDEO_ELEMENT: "video",
    AUDIO_ELEMENT: "audio",
    MEDIA_ELEMENTS: "video, audio",
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
    AUDIO_ICON_LIGATURES: Object.freeze([
      "podcasts",
      "graphic_eq",
      "headphones",
      "spatial_audio_off",
      "volume_up",
      "mic"
    ]),
    GENERATE_VIDEO_BUTTONS: Object.freeze([
      'button[aria-label*="Video Overview" i]',
      'button[aria-label*="Generate video" i]',
      'button[aria-label*="Create video" i]',
      'button.primary-action-button[aria-label*="video" i]',
      'button[aria-label*="Audio Overview" i]',
      'button[aria-label*="Generate audio" i]',
      'button[aria-label*="Deep Dive" i]'
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
    EXTRACT_AUDIO_RESPONSE: "LM_SUBS_EXTRACT_AUDIO_RESPONSE",
    REMOTE_AUDIO_STATE: "LM_SUBS_REMOTE_AUDIO_STATE",
    REMOTE_AUDIO_COMMAND: "LM_SUBS_REMOTE_AUDIO_COMMAND"
  });
  var EXTERNAL_MESSAGE = Object.freeze({
    WEB_HANDSHAKE: "LM_SUBS_WEB_HANDSHAKE",
    WEB_SAVE_PROVIDER_KEY: "LM_SUBS_WEB_SAVE_PROVIDER_KEY",
    WEB_UPDATE_SETUP_PREFS: "LM_SUBS_WEB_UPDATE_SETUP_PREFS",
    WEB_CONNECT_CLOUD_TOKEN: "LM_SUBS_WEB_CONNECT_CLOUD_TOKEN"
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
    UPDATE_CACHED_SUBTITLES: "LM_SUBS_UPDATE_CACHED_SUBTITLES",
    CHECK_FOR_UPDATES: "LM_SUBS_CHECK_FOR_UPDATES",
    GET_UPDATE_STATUS: "LM_SUBS_GET_UPDATE_STATUS",
    APPLY_UNPACKED_UPDATE: "LM_SUBS_APPLY_UNPACKED_UPDATE",
    SUBTITLES_UPDATED: "LM_SUBS_SUBTITLES_UPDATED",
    BACKGROUND_SYNC_TICK: "LM_SUBS_BACKGROUND_SYNC_TICK",
    RECORD_NOTEBOOKLM_TELEMETRY: "LM_SUBS_RECORD_NOTEBOOKLM_TELEMETRY",
    GET_NOTEBOOKLM_STATS: "LM_SUBS_GET_NOTEBOOKLM_STATS",
    PLAY_NOTIFICATION_SOUND: "LM_SUBS_PLAY_NOTIFICATION_SOUND"
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

  // src/lib/release-notes.js
  var RELEASE_NOTES = Object.freeze({
    "0.2.8": Object.freeze({
      headline: "A lighter site, a deeper blog, and pages Google can read",
      highlights: Object.freeze([
        "Product screenshots load as WebP with a PNG fallback, cutting image weight by roughly two thirds",
        "The home page shows a two by two gallery of the player, the docked controls, statistics, and the install page",
        "Four new guides join the blog, and every article carries an on page index, a reading time, and next and previous links",
        "The setup guide, statistics, library, about, and welcome pages now ship real HTML, so search engines read them without running JavaScript",
        "Statistics labels match the extension exactly, including caption cues and median speed",
        "Caption buttons dock as one group in front of NotebookLM\u2019s right-hand cluster, a narrow play bar trims the extras instead of crowding the native controls, and the duplicate playback speed button is gone"
      ])
    }),
    "0.2.7": Object.freeze({
      headline: "Long Audio Overviews finish, and updates explain themselves",
      highlights: Object.freeze([
        "Audio Overviews download across six parallel streams, so a 20 minute podcast no longer outlives the background worker",
        "The update alert now lists what the new version changes instead of only naming the version",
        "Every page got roomier padding and wider content gutters, including the welcome page that opens on install",
        "New social preview cards for the site, blog and install page"
      ])
    }),
    "0.2.6": Object.freeze({
      headline: "Controls live in the play bar, and captions scale with the player",
      highlights: Object.freeze([
        "CC and caption controls dock inside NotebookLM's own bottom play bar and fade with it, so nothing blinks between cues",
        "Captions resize with the player and sidebar, from the compact Studio view to fullscreen",
        "Picture in Picture keeps live subtitles",
        "Statistics match across the website, settings page and popup",
        "Six notification chime presets replace the system beep"
      ])
    })
  });
  function getReleaseNotes(version) {
    const key = String(version || "").trim();
    const entry = RELEASE_NOTES[key];
    if (!entry) return null;
    return {
      version: key,
      headline: String(entry.headline || ""),
      highlights: Array.isArray(entry.highlights) ? [...entry.highlights] : []
    };
  }
  function resolveReleaseNotes(version, remoteNotes = null) {
    const local = getReleaseNotes(version);
    const remoteHeadline = String(remoteNotes?.headline || "");
    const remoteHighlights = Array.isArray(remoteNotes?.highlights) ? remoteNotes.highlights.filter((line) => typeof line === "string" && line.trim()) : [];
    if (local && remoteHighlights.length === 0 && !remoteHeadline) return local;
    if (remoteHighlights.length === 0 && !remoteHeadline && !local) return null;
    return {
      version: String(version || local?.version || ""),
      headline: remoteHeadline || local?.headline || "",
      highlights: remoteHighlights.length ? remoteHighlights : local?.highlights || []
    };
  }
  function renderReleaseNotes(container, notes, { version = "" } = {}) {
    if (!container || typeof document === "undefined") return false;
    while (container.firstChild) container.removeChild(container.firstChild);
    const resolved = resolveReleaseNotes(version, notes);
    if (!resolved || resolved.highlights.length === 0) {
      container.style.display = "none";
      return false;
    }
    container.style.display = "block";
    const heading = document.createElement("div");
    heading.className = "update-notes-heading";
    heading.appendChild(
      document.createTextNode(`What's new in v${resolved.version || version}`)
    );
    container.appendChild(heading);
    if (resolved.headline) {
      const lede = document.createElement("div");
      lede.className = "update-notes-lede";
      lede.appendChild(document.createTextNode(resolved.headline));
      container.appendChild(lede);
    }
    const list = document.createElement("ul");
    list.className = "update-notes-list";
    for (const line of resolved.highlights) {
      const item = document.createElement("li");
      item.appendChild(document.createTextNode(line));
      list.appendChild(item);
    }
    container.appendChild(list);
    return true;
  }

  // src/lib/chime.js
  var SOUND_PRESETS = Object.freeze([
    {
      id: "chime",
      label: "Acoustic fifth chime (C5 to G5)",
      durationSec: 0.46,
      wave: "triangle",
      decayRate: 10.2,
      overtoneRatio: 2,
      overtoneGain: 0.24,
      notes: [
        { offset: 0, dur: 0.24, freq: 523.25 },
        { offset: 0.11, dur: 0.32, freq: 783.99 }
      ]
    },
    {
      id: "marimba",
      label: "Studio triad marimba (C5, E5, G5)",
      durationSec: 0.52,
      wave: "sine",
      decayRate: 14.5,
      overtoneRatio: 4,
      overtoneGain: 0.18,
      notes: [
        { offset: 0, dur: 0.18, freq: 523.25 },
        { offset: 0.085, dur: 0.19, freq: 659.25 },
        { offset: 0.17, dur: 0.31, freq: 783.99 }
      ]
    },
    {
      id: "bell",
      label: "Crystal desk bell (A5 shimmer)",
      durationSec: 0.56,
      wave: "sine",
      decayRate: 8.4,
      overtoneRatio: 2.756,
      overtoneGain: 0.2,
      notes: [
        { offset: 0, dur: 0.52, freq: 880 },
        { offset: 0.03, dur: 0.46, freq: 1318.51 }
      ]
    },
    {
      id: "pulse",
      label: "Crisp double pulse (F5 to A5)",
      durationSec: 0.38,
      wave: "triangle",
      decayRate: 16,
      overtoneRatio: 2,
      overtoneGain: 0.15,
      notes: [
        { offset: 0, dur: 0.12, freq: 698.46 },
        { offset: 0.11, dur: 0.22, freq: 880 }
      ]
    },
    {
      id: "soft-pop",
      label: "Warm acoustic pluck (D5 to A5)",
      durationSec: 0.34,
      wave: "sine",
      decayRate: 18.5,
      overtoneRatio: 3,
      overtoneGain: 0.14,
      notes: [
        { offset: 0, dur: 0.13, freq: 587.33 },
        { offset: 0.07, dur: 0.22, freq: 880 }
      ]
    },
    {
      id: "none",
      label: "Silent (visual alerts only)",
      durationSec: 0,
      wave: "sine",
      decayRate: 10,
      overtoneRatio: 2,
      overtoneGain: 0,
      notes: []
    }
  ]);
  var SOUND_PRESET_IDS = Object.freeze(SOUND_PRESETS.map((p) => p.id));
  var sharedCtx = null;
  var cachedWavUris = /* @__PURE__ */ new Map();
  var lastChimeEpochMs = 0;
  function getSoundPresetSpec(presetId = "chime") {
    return SOUND_PRESETS.find((p) => p.id === presetId) || SOUND_PRESETS[0];
  }
  function bytesToBase64(bytes) {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(bytes).toString("base64");
    }
    let binary = "";
    const chunk = 32768;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return globalThis.btoa(binary);
  }
  function buildChimeWavBytes(sampleRate = 44100, presetId = "chime") {
    const spec = presetId === "none" ? SOUND_PRESETS[0] : getSoundPresetSpec(presetId);
    const durationSec = Math.max(0.28, spec.durationSec || 0.44);
    const numSamples = Math.floor(sampleRate * durationSec);
    const dataBytes = numSamples * 2;
    const buf = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buf);
    const writeAscii = (offset, str) => {
      for (let i = 0; i < str.length; i += 1) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    writeAscii(0, "RIFF");
    view.setUint32(4, 36 + dataBytes, true);
    writeAscii(8, "WAVE");
    writeAscii(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeAscii(36, "data");
    view.setUint32(40, dataBytes, true);
    for (let i = 0; i < numSamples; i += 1) {
      const t = i / sampleRate;
      let sample = 0;
      for (const note of spec.notes) {
        if (t >= note.offset && t <= note.offset + note.dur) {
          const lt = t - note.offset;
          const attack = Math.min(1, lt / 0.01);
          const decay = Math.exp(-lt * spec.decayRate);
          const env = attack * decay;
          const fundamental = Math.sin(2 * Math.PI * note.freq * lt);
          const harmonic = spec.overtoneGain * Math.sin(2 * Math.PI * note.freq * spec.overtoneRatio * lt);
          sample += env * (fundamental + harmonic) * 0.34;
        }
      }
      const clamped = Math.max(-0.95, Math.min(0.95, sample));
      view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
    }
    return new Uint8Array(buf);
  }
  function getChimeWavDataUri(presetId = "chime") {
    const key = SOUND_PRESET_IDS.includes(presetId) && presetId !== "none" ? presetId : "chime";
    if (!cachedWavUris.has(key)) {
      const wavBytes = buildChimeWavBytes(44100, key);
      cachedWavUris.set(key, `data:audio/wav;base64,${bytesToBase64(wavBytes)}`);
    }
    return cachedWavUris.get(key);
  }
  function getOrCreateAudioContext(win = globalThis) {
    if (sharedCtx && sharedCtx.state !== "closed") {
      return sharedCtx;
    }
    const AudioCtx = win?.AudioContext || win?.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      sharedCtx = new AudioCtx();
      return sharedCtx;
    } catch {
      return null;
    }
  }
  function unlockChimeAudio(win = globalThis) {
    try {
      const ctx = getOrCreateAudioContext(win);
      if (!ctx) return false;
      if (ctx.state === "suspended" && typeof ctx.resume === "function") {
        ctx.resume().catch(() => {
        });
      }
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      return true;
    } catch {
      return false;
    }
  }
  async function playWavElementFallback(win = globalThis, presetId = "chime", volumePct = 75) {
    try {
      const AudioCtor = win?.Audio || globalThis.Audio;
      if (typeof AudioCtor !== "function") return false;
      const audio = new AudioCtor(getChimeWavDataUri(presetId));
      audio.__lmSubsInternal = true;
      audio.volume = Math.max(0.05, Math.min(1, (Number(volumePct) || 75) / 100));
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        await playPromise;
      }
      return true;
    } catch {
      return false;
    }
  }
  async function playCompletionChimeSound({
    win = globalThis,
    preset = "chime",
    volume = 75,
    force = false,
    dedupeMs = 1100
  } = {}) {
    if (preset === "none") return false;
    const spec = getSoundPresetSpec(preset);
    if (!spec.notes.length) return false;
    const nowMs = Date.now();
    if (!force && dedupeMs > 0 && nowMs - lastChimeEpochMs < dedupeMs) {
      return false;
    }
    lastChimeEpochMs = nowMs;
    const volScale = Math.max(0.08, Math.min(1, (Number(volume) || 75) / 100));
    const peakGain = 0.28 * volScale;
    try {
      const ctx = getOrCreateAudioContext(win);
      if (ctx) {
        if (ctx.state === "suspended" && typeof ctx.resume === "function") {
          await Promise.race([
            ctx.resume().catch(() => {
            }),
            new Promise((r) => setTimeout(r, 140))
          ]);
        }
        if (ctx.state === "running") {
          const t0 = ctx.currentTime;
          for (const n of spec.notes) {
            const osc = ctx.createOscillator();
            const overtone = ctx.createOscillator();
            const gain = ctx.createGain();
            const overtoneGain = ctx.createGain();
            osc.type = spec.wave || "triangle";
            osc.frequency.setValueAtTime(n.freq, t0 + n.offset);
            overtone.type = "sine";
            overtone.frequency.setValueAtTime(
              n.freq * (spec.overtoneRatio || 2),
              t0 + n.offset
            );
            overtoneGain.gain.setValueAtTime(spec.overtoneGain || 0.2, t0 + n.offset);
            gain.gain.setValueAtTime(1e-4, t0 + n.offset);
            gain.gain.linearRampToValueAtTime(peakGain, t0 + n.offset + 0.012);
            gain.gain.exponentialRampToValueAtTime(7e-4, t0 + n.offset + n.dur);
            osc.connect(gain);
            overtone.connect(overtoneGain);
            overtoneGain.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0 + n.offset);
            overtone.start(t0 + n.offset);
            osc.stop(t0 + n.offset + n.dur + 0.02);
            overtone.stop(t0 + n.offset + n.dur + 0.02);
          }
          return true;
        }
      }
    } catch {
    }
    return playWavElementFallback(win, spec.id, volume);
  }

  // src/lib/stats-model.js
  function formatMegabytesValue(bytes) {
    const b = Math.max(0, Number(bytes) || 0);
    if (b >= 1073741824) {
      return `${(b / 1073741824).toFixed(2)} GB`;
    }
    return `${(b / 1048576).toFixed(1)} MB`;
  }
  function formatMinutesLabel(totalSeconds) {
    const sec = Math.max(0, Number(totalSeconds) || 0);
    const mins = Math.round(sec / 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const rem = mins % 60;
      return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
    }
    return `${mins} min`;
  }
  function buildLast14DayKeys(now = /* @__PURE__ */ new Date()) {
    const keys = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 864e5);
      keys.push(d.toISOString().slice(0, 10));
    }
    return keys;
  }
  function buildUnifiedStatsReport({
    cacheList = [],
    historyList = [],
    notebookLmStats = null,
    cloudStats = null,
    now = /* @__PURE__ */ new Date()
  } = {}) {
    const dayKeys = buildLast14DayKeys(now);
    const dailyMap = new Map(
      dayKeys.map((date) => [
        date,
        { date, videos: 0, cues: 0, savedBytes: 0, studyMinutes: 0 }
      ])
    );
    const seenKeys = /* @__PURE__ */ new Set();
    const localRecords = [];
    for (const item of [...cacheList || [], ...historyList || []]) {
      if (!item) continue;
      const key = item.cacheKey || item.artifactId || `${item.title || "overview"}_${item.createdAt || ""}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      localRecords.push(item);
    }
    let localCues = 0;
    let localSavedBytes = 0;
    let localSpokenSec = 0;
    let localFailovers = 0;
    let localBookmarksInCues = 0;
    const latencies = [];
    const providerAgg = /* @__PURE__ */ new Map();
    for (const rec of localRecords) {
      const cueCount = Number(rec.cueCount || rec.cues?.length || 0);
      localCues += cueCount;
      if (Array.isArray(rec.cues) && rec.cues.length > 0) {
        const lastCue = rec.cues[rec.cues.length - 1];
        localSpokenSec += Math.max(
          Number(rec.durationSeconds) || 0,
          Number(lastCue?.endSec) || 0
        );
        for (const c of rec.cues) {
          if (c?.bookmarked) localBookmarksInCues += 1;
        }
      } else if (Number(rec.durationSeconds) > 0) {
        localSpokenSec += Number(rec.durationSeconds);
      }
      const byteInfo = resolveAvoidedVideoBytes({
        originalBytes: rec.originalBytes,
        extractedBytes: rec.extractedBytes,
        durationSeconds: rec.durationSeconds,
        cues: rec.cues
      });
      localSavedBytes += byteInfo.savedBytes;
      if (rec.failoverUsed) localFailovers += 1;
      if (Number(rec.latencyMs) > 0) latencies.push(Number(rec.latencyMs));
      const prov = String(rec.provider || "groq").toLowerCase();
      const prevProv = providerAgg.get(prov) || {
        provider: prov,
        videos: 0,
        totalLatencyMs: 0,
        latencySamples: 0
      };
      prevProv.videos += 1;
      if (Number(rec.latencyMs) > 0) {
        prevProv.totalLatencyMs += Number(rec.latencyMs);
        prevProv.latencySamples += 1;
      }
      providerAgg.set(prov, prevProv);
      const createdDay = String(rec.updatedAt || rec.createdAt || "").slice(0, 10);
      if (dailyMap.has(createdDay)) {
        const slot = dailyMap.get(createdDay);
        slot.videos += 1;
        slot.cues += cueCount;
        slot.savedBytes += byteInfo.savedBytes;
      }
    }
    latencies.sort((a, b) => a - b);
    const localMedianLatencyMs = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : null;
    const rawNotebooks = notebookLmStats?.notebooks && typeof notebookLmStats.notebooks === "object" ? notebookLmStats.notebooks : {};
    const nbMap = Array.isArray(rawNotebooks) ? Object.fromEntries(
      rawNotebooks.map((nb, idx) => [nb?.notebookId || `notebook_${idx}`, nb])
    ) : rawNotebooks;
    const nbEntries = Object.values(nbMap).sort(
      (a, b) => String(b.lastSeenAt || "").localeCompare(String(a.lastSeenAt || ""))
    );
    let totalSourcesIndexed = 0;
    let totalVideosFound = 0;
    let totalAudiosFound = 0;
    let totalStudioArtifacts = 0;
    for (const nb of nbEntries) {
      totalSourcesIndexed += Math.max(0, Number(nb.sourceCount) || 0);
      totalVideosFound += Math.max(0, Number(nb.videoCount) || 0);
      totalAudiosFound += Math.max(0, Number(nb.audioCount) || 0);
      totalStudioArtifacts += Math.max(
        Number(nb.studioArtifactCount) || 0,
        (Number(nb.videoCount) || 0) + (Number(nb.audioCount) || 0) + (Number(nb.reportCount) || 0)
      );
    }
    const nbTotals = notebookLmStats?.totals || {};
    const watchSeconds = Math.max(0, Number(nbTotals.watchSeconds) || 0);
    const listenSeconds = Math.max(0, Number(nbTotals.listenSeconds) || 0);
    const activeStudySeconds = watchSeconds + listenSeconds;
    const speedSavedSeconds = Math.max(0, Number(nbTotals.speedSavedSeconds) || 0);
    if (notebookLmStats?.dailyStudy) {
      for (const [dayKey, ds] of Object.entries(notebookLmStats.dailyStudy)) {
        if (dailyMap.has(dayKey)) {
          dailyMap.get(dayKey).studyMinutes = Math.round(
            (Number(ds?.activeSeconds) || 0) / 60
          );
        }
      }
    }
    const cloudTotals = cloudStats?.totals || null;
    const videosCaptioned = Math.max(
      Number(cloudTotals?.videosCaptioned) || 0,
      localRecords.length
    );
    const totalCues = Math.max(Number(cloudTotals?.totalCues) || 0, localCues);
    const spokenMinutes = Math.max(
      Number(cloudTotals?.spokenMinutes) || 0,
      Math.round(localSpokenSec / 60)
    );
    const bandwidthSavedBytes = Math.max(
      Number(cloudTotals?.bandwidthSavedBytes) || 0,
      localSavedBytes
    );
    const medianLatencyMs = cloudTotals?.medianLatencyMs || localMedianLatencyMs || null;
    const failoverCount = Math.max(
      Number(cloudTotals?.failoverCount) || 0,
      localFailovers
    );
    const exportCount = Math.max(
      Number(cloudTotals?.exportCount) || 0,
      Number(nbTotals.exportsCount) || 0
    );
    const cloudHitCount = Number(cloudTotals?.cloudHitCount) || 0;
    const cloudSeriesByDate = new Map(
      (cloudStats?.dailySeries || []).map((d) => [d.date, d])
    );
    const dailySeries = dayKeys.map((date) => {
      const loc = dailyMap.get(date);
      const cld = cloudSeriesByDate.get(date);
      return {
        date,
        videos: Math.max(loc.videos, Number(cld?.videos) || 0),
        cues: Math.max(loc.cues, Number(cld?.cues) || 0),
        savedBytes: Math.max(loc.savedBytes, Number(cld?.savedBytes) || 0),
        studyMinutes: loc.studyMinutes || 0
      };
    });
    let byProvider = [];
    if (Array.isArray(cloudStats?.byProvider) && cloudStats.byProvider.length > 0) {
      byProvider = cloudStats.byProvider;
    } else if (providerAgg.size > 0) {
      const totalProvVideos = Math.max(
        1,
        [...providerAgg.values()].reduce((acc, p) => acc + p.videos, 0)
      );
      byProvider = [...providerAgg.values()].sort((a, b) => b.videos - a.videos).map((p) => ({
        provider: p.provider,
        videos: p.videos,
        sharePct: Math.round(p.videos / totalProvVideos * 100),
        avgLatencyMs: p.latencySamples > 0 ? Math.round(p.totalLatencyMs / p.latencySamples) : null
      }));
    }
    let recentVideos = [];
    if (Array.isArray(cloudStats?.recentVideos) && cloudStats.recentVideos.length > 0) {
      recentVideos = cloudStats.recentVideos;
    } else {
      recentVideos = localRecords.slice(0, 8).map((r) => {
        const byteInfo = resolveAvoidedVideoBytes({
          originalBytes: r.originalBytes,
          extractedBytes: r.extractedBytes,
          durationSeconds: r.durationSeconds,
          cues: r.cues
        });
        return {
          cacheKey: r.cacheKey || "",
          title: r.title || "NotebookLM Overview",
          provider: r.provider || "groq",
          language: r.language || "en",
          cueCount: Number(r.cueCount || r.cues?.length || 0),
          savedBytes: byteInfo.savedBytes,
          latencyMs: r.latencyMs || null,
          updatedAt: r.updatedAt || r.createdAt || null
        };
      });
    }
    const cloudNotebookLm = cloudStats?.notebookLm || null;
    const notebooksCount = Math.max(
      nbEntries.length,
      Number(cloudNotebookLm?.notebooksCount) || 0,
      videosCaptioned > 0 && nbEntries.length === 0 ? 1 : 0
    );
    return {
      totals: {
        videosCaptioned,
        totalCues,
        spokenMinutes,
        bandwidthSavedBytes,
        medianLatencyMs,
        failoverCount,
        exportCount,
        cloudHitCount
      },
      notebookLm: {
        notebooksCount,
        sourcesIndexed: Math.max(
          totalSourcesIndexed,
          Number(cloudNotebookLm?.sourcesIndexed) || 0
        ),
        studioArtifactsCount: Math.max(
          totalStudioArtifacts,
          videosCaptioned,
          Number(cloudNotebookLm?.studioArtifactsCount) || 0
        ),
        videoOverviewsCount: Math.max(
          totalVideosFound,
          Number(cloudNotebookLm?.videoOverviewsCount) || 0
        ),
        audioOverviewsCount: Math.max(
          totalAudiosFound,
          Number(cloudNotebookLm?.audioOverviewsCount) || 0
        ),
        activeStudyMinutes: Math.max(
          Math.round(activeStudySeconds / 60),
          Number(cloudNotebookLm?.activeStudyMinutes) || 0
        ),
        watchSeconds,
        listenSeconds,
        speedSavedMinutes: Math.max(
          Math.round(speedSavedSeconds / 60),
          Number(cloudNotebookLm?.speedSavedMinutes) || 0
        ),
        bookmarksCount: Math.max(
          Number(nbTotals.bookmarksCount) || 0,
          localBookmarksInCues,
          Number(cloudNotebookLm?.bookmarksCount) || 0
        ),
        citationsCount: Math.max(
          Number(nbTotals.citationsCount) || 0,
          Number(cloudNotebookLm?.citationsCount) || 0
        ),
        loopsCount: Math.max(
          Number(nbTotals.loopsCount) || 0,
          Number(cloudNotebookLm?.loopsCount) || 0
        ),
        pipSessionsCount: Math.max(
          Number(nbTotals.pipSessionsCount) || 0,
          Number(cloudNotebookLm?.pipSessionsCount) || 0
        ),
        notebooks: nbEntries.slice(0, 8)
      },
      dailySeries,
      byProvider,
      recentVideos
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
      badge: "Best Free Tier, 8 hrs/day",
      freeTierSummary: "Permanent free plan, no card: 20 RPM, 2,000 req/day, 7,200 audio sec/hr (2h/hr), 28,800 sec/day (8h/day).",
      accountRequirements: "Free Google, GitHub, or email sign-in. No credit card needed.",
      keyFormatHint: "Starts with gsk_ (about 56 characters)",
      setupSteps: Object.freeze([
        "Open console.groq.com/keys in a new tab.",
        "Click Log in or Sign up and continue with your Google account, GitHub account, or email address.",
        "Once inside GroqCloud, click API Keys in the left navigation bar.",
        "Click the Create API Key button, type LM Subs as the display name, and click Submit.",
        "Click Copy beside the new gsk_... key right away (Groq shows it once), paste it into LM Subs, and click Save key then Test."
      ]),
      defaultModel: "whisper-large-v3-turbo",
      models: ["whisper-large-v3-turbo", "whisper-large-v3"],
      requiresKey: true,
      keyPlaceholder: "gsk_...",
      keyUrl: "https://console.groq.com/keys",
      originPattern: "https://api.groq.com/*",
      maxUploadBytes: 24 * 1024 * 1024,
      protocol: "openai-stt",
      endpoint: "https://api.groq.com/openai/v1/audio/transcriptions"
    }),
    mistral: Object.freeze({
      id: "mistral",
      name: "Mistral (Voxtral)",
      badge: "Free Studio Tier, No Card",
      freeTierSummary: "Mistral Studio Experiment plan (free, no card). Voxtral Transcribe 3 returns accurate segment timestamps in 50+ languages.",
      accountRequirements: "Free Google, Microsoft, Apple, or email sign-in with phone verification on Experiment tier.",
      keyFormatHint: "32-character alphanumeric Mistral key",
      setupSteps: Object.freeze([
        "Open console.mistral.ai/api-keys in a new tab.",
        "Sign up or sign in using Google, Microsoft, Apple, or your email and password.",
        "If prompted to choose a workspace plan, select the free Experiment plan (no credit card required).",
        "Open API Keys in the left sidebar, click Create new key, name it LM Subs, and click Create new key.",
        "Copy the generated key string immediately, paste it into LM Subs, and click Save key then Test."
      ]),
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
      badge: "Free Daily Tier + Translation",
      freeTierSummary: "Google AI Studio free tier, no card. Multimodal audio-to-SRT with optional single-pass subtitle translation.",
      accountRequirements: "Uses the same Google account you already use for Google NotebookLM. No billing setup needed for free tier.",
      keyFormatHint: "Starts with AIzaSy (39 characters)",
      setupSteps: Object.freeze([
        "Open aistudio.google.com/apikey while signed into your Google account.",
        "Accept the Google AI Studio terms prompt if this is your first visit.",
        "Click the blue Create API key button near the top-right corner.",
        "Select Create API key in new project (or pick an existing Google Cloud project).",
        "Click Copy on the AIzaSy... key, paste it into LM Subs, and click Save key then Test."
      ]),
      defaultModel: "gemini-2.5-flash",
      models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
      requiresKey: true,
      keyPlaceholder: "AIzaSy...",
      keyUrl: "https://aistudio.google.com/apikey",
      originPattern: "https://generativelanguage.googleapis.com/*",
      maxUploadBytes: 18 * 1024 * 1024,
      protocol: "gemini-stt",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models"
    }),
    deepgram: Object.freeze({
      id: "deepgram",
      name: "Deepgram",
      badge: "$200 Free Credit, ~700 hrs",
      freeTierSummary: "$200 signup credit with no credit card (~700+ hours of Nova-3 batch audio with word-level timestamps).",
      accountRequirements: "Free Google, GitHub, or email sign-up. Includes $200 promotional credit without entering a card.",
      keyFormatHint: "40-character hexadecimal secret key",
      setupSteps: Object.freeze([
        "Open console.deepgram.com in a new tab.",
        "Click Sign Up (or Log In) with Google, GitHub, or email to claim the free $200 credit.",
        "In the left sidebar of your Default Project, click API Keys.",
        "Click Create a New API Key, enter LM Subs as the friendly name, leave Member permissions selected, and click Create Key.",
        "Copy the secret key before closing the modal, paste it into LM Subs, and click Save key then Test."
      ]),
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
      badge: "$50 Free Credit, ~330 hrs",
      freeTierSummary: "$50 free signup credit with no card (~330 hours on Universal-2 with word-level timestamps).",
      accountRequirements: "Free Google, GitHub, or email sign-up with $50 starter credit.",
      keyFormatHint: "32-character lowercase hexadecimal API key",
      setupSteps: Object.freeze([
        "Open assemblyai.com/app/account in a new tab.",
        "Create a free account or sign in using Google, GitHub, or email.",
        "After signing in, open the API Keys section on your dashboard home or Account page.",
        "Click Copy next to your Default API key (or click Create new API key and name it LM Subs).",
        "Paste the key into LM Subs and click Save key then Test."
      ]),
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
      badge: "Free Monthly Hours, Solaria-1",
      freeTierSummary: "Free monthly transcription hours on Solaria-1 pre-recorded speech-to-text with native SRT/VTT generation.",
      accountRequirements: "Free Google, GitHub, or email sign-up.",
      keyFormatHint: "UUID-formatted Gladia API key (xxxxxxxx-xxxx-...)",
      setupSteps: Object.freeze([
        "Open app.gladia.io in a new tab.",
        "Sign up or log in with Google, GitHub, or your email address.",
        "Click API keys in the left dashboard menu (or copy the default key shown on the home card).",
        "Click Generate new key if needed, label it LM Subs, and copy the UUID token.",
        "Paste the token into LM Subs and click Save key then Test."
      ]),
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
      accountRequirements: "Free Cloudflare account (email, Google, or Apple). Uses combined ACCOUNT_ID:API_TOKEN format.",
      keyFormatHint: "Combined format: your_account_id:your_api_token",
      setupSteps: Object.freeze([
        "Open dash.cloudflare.com and sign in or create a free Cloudflare account.",
        "In the left sidebar, expand AI and click Workers AI, then click Use REST API.",
        "Click Create a Workers AI API Token, confirm permissions (Workers AI Read/Edit), and copy the generated API Token.",
        "On that same REST API page, copy your 32-character Account ID.",
        "Combine both values with a colon in between as account_id:api_token, paste into LM Subs, and click Save key then Test."
      ]),
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
      accountRequirements: "Free ElevenLabs account via Google, Apple, GitHub, or email.",
      keyFormatHint: "Starts with sk_...",
      setupSteps: Object.freeze([
        "Open elevenlabs.io/app/settings/api-keys in a new tab.",
        "Sign in or register for a free ElevenLabs account.",
        "Click Create API Key in the API Keys panel and name it LM Subs.",
        "Ensure the Speech-to-Text endpoint permission is enabled (or leave unrestricted), then click Create.",
        "Copy the sk_... key, paste it into LM Subs, and click Save key then Test."
      ]),
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
      freeTierSummary: "Free monthly Serverless Inference credits using any hf_... inference token.",
      accountRequirements: "Free Hugging Face account with verified email address.",
      keyFormatHint: "Starts with hf_...",
      setupSteps: Object.freeze([
        "Open huggingface.co/settings/tokens in a new tab and sign in (or click Sign Up to register and verify your email).",
        "Click the Create new token button.",
        "Choose Fine-grained (and check Make calls to Inference Providers) or Read, and name the token LM Subs.",
        "Click Create token at the bottom of the form.",
        "Copy the hf_... token immediately, paste it into LM Subs, and click Save key then Test."
      ]),
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
      freeTierSummary: "Unified OpenAI-compatible /api/v1/audio/transcriptions router across Voxtral and Whisper backends.",
      accountRequirements: "OpenRouter account (Google, GitHub, MetaMask, or email); audio models use pay-as-you-go credits.",
      keyFormatHint: "Starts with sk-or-v1-...",
      setupSteps: Object.freeze([
        "Open openrouter.ai/keys in a new tab and sign in with Google, GitHub, or email.",
        "If your credit balance is $0, add a small prepaid balance under Credits for audio transcription endpoints.",
        "Click Create Key, enter LM Subs as the name, optionally set a spending limit, and click Create.",
        "Copy the sk-or-v1-... secret string right away.",
        "Paste the key into LM Subs and click Save key then Test."
      ]),
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
      freeTierSummary: "Official OpenAI whisper-1 endpoint ($0.006/min) with word and segment verbose_json timestamps.",
      accountRequirements: "OpenAI Platform developer account (separate billing from ChatGPT Plus, minimum $5 prepaid credit).",
      keyFormatHint: "Starts with sk-proj-... or sk-...",
      setupSteps: Object.freeze([
        "Open platform.openai.com/api-keys and log in with your OpenAI developer account.",
        "Note that ChatGPT Plus subscriptions do not include API credits; ensure Billing has an active balance.",
        "Click Create new secret key in the top-right corner, name it LM Subs, and keep All permissions (or Audio enabled).",
        "Click Create secret key and copy the sk-proj-... token.",
        "Paste the key into LM Subs and click Save key then Test."
      ]),
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
      badge: "100% Free, Unlimited Local",
      freeTierSummary: "Point at local speaches, faster-whisper-server, whisper.cpp, or LocalAI (http://localhost:8000/v1) for unlimited offline transcription.",
      accountRequirements: "Zero account, zero sign-up, and zero API key required. Runs 100% offline on your own CPU or GPU.",
      keyFormatHint: "Base URL http://localhost:8000/v1 (API key optional / blank)",
      setupSteps: Object.freeze([
        "Install Docker or Python and start an OpenAI-compatible local Whisper server such as speaches (docker run -p 8000:8000 ghcr.io/speaches-ai/speaches:latest-cpu).",
        "Verify http://localhost:8000/v1 is reachable on your machine.",
        "In LM Subs, enter http://localhost:8000/v1 as the OpenAI-compatible base URL.",
        "Leave the API key field blank unless your local server requires a custom Bearer token.",
        "Enable Local / Custom Whisper and click Save URL / Enable so audio stays completely on your machine."
      ]),
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
    UPDATE_STATUS: "updateStatus",
    CLOUD_SYNC_PROFILE: "cloudSyncProfile",
    CLOUD_SYNC_SECRET: "cloudSyncSecret",
    SETUP_STATE: "setupState",
    NOTEBOOKLM_STATS: "notebooklmStats"
  });
  var CAPTION_FONT_SIZES = Object.freeze([
    "small",
    "medium",
    "large",
    "xlarge",
    "xxlarge"
  ]);
  var CAPTION_STYLES = Object.freeze([
    "classic",
    "contrast",
    "minimal",
    "cinema",
    "paper",
    "amber"
  ]);
  var CAPTION_FONT_FAMILIES = Object.freeze([
    "sans",
    "serif",
    "mono",
    "dyslexic"
  ]);
  var CAPTION_COLORS = Object.freeze([
    "white",
    "yellow",
    "cyan",
    "green",
    "ink"
  ]);
  var CAPTION_POSITIONS = Object.freeze(["bottom", "raised", "top"]);
  var CAPTION_WIDTHS = Object.freeze(["compact", "balanced", "wide"]);
  var PLAYBAR_DOCK_MODES = Object.freeze(["native", "hover", "always"]);
  var NOTIFICATION_SOUND_PRESETS = Object.freeze([
    "chime",
    "marimba",
    "bell",
    "pulse",
    "soft-pop",
    "none"
  ]);
  var PLAYBACK_SPEEDS = Object.freeze([
    0.5,
    0.75,
    1,
    1.25,
    1.5,
    1.75,
    2,
    2.5
  ]);
  var DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    debugMode: false,
    autoOnGenerate: true,
    autoOnExistingVideos: true,
    autoOnAudioOverviews: true,
    primaryProvider: "groq",
    queueOrder: [...DEFAULT_QUEUE_ORDER],
    providerModels: {},
    customBaseUrl: "",
    customEnabled: false,
    languageHint: "auto",
    translateTo: "original",
    fontSize: "medium",
    // "small" | "medium" | "large" | "xlarge" | "xxlarge"
    captionStyle: "classic",
    // "classic" | "contrast" | "minimal" | "cinema" | "paper" | "amber"
    captionFontFamily: "sans",
    // "sans" | "serif" | "mono" | "dyslexic"
    captionColor: "white",
    // "white" | "yellow" | "cyan" | "green" | "ink"
    captionBgOpacity: 88,
    // 0..100
    captionPosition: "bottom",
    // "bottom" | "raised" | "top"
    captionMaxWidth: "balanced",
    // "compact" | "balanced" | "wide"
    karaokeHighlight: true,
    karaokeDelayMs: 0,
    // -1500..3000 ms delay applied to word-by-word highlight
    showSpeakerLabels: true,
    pauseOnCaptionHover: false,
    clickCaptionToCopy: true,
    defaultPlaybackSpeed: 1,
    subtitleOffsetSec: 0,
    fineGrainedControls: false,
    dynamicCaptionScaling: true,
    captionScaleFactor: 100,
    // 50..200 (%)
    captionMinFontPx: 10,
    // 8..18 (px)
    captionMaxFontPx: 42,
    // 20..64 (px)
    captionPaddingY: 7,
    // 2..20 (px)
    captionPaddingX: 15,
    // 6..40 (px)
    captionBorderRadius: 7,
    // 0..32 (px)
    captionLineHeight: 142,
    // 115..185 (%)
    captionBottomOffsetPx: 54,
    // 24..180 (px)
    captionTextStrokePx: 0,
    // 0..3 (px)
    karaokeHighlightOpacity: 48,
    // 15..95 (%)
    upcomingWordOpacity: 64,
    // 25..100 (%)
    playBarDockMode: "native",
    // "native" | "hover" | "always"
    hoverFadeDelayMs: 2200,
    // 400..6000 (ms)
    keepSubtitlesInPiP: true,
    skipSilenceEnabled: false,
    skipSilenceGapSec: 1.6,
    // 0.6..5.0 (s)
    skipSilenceRate: 2.2,
    // 1.4..3.0 (x)
    audioBoostPercent: 100,
    // 100..250 (%)
    showToast: true,
    desktopNotifications: true,
    soundAlerts: true,
    notificationSoundPreset: "chime",
    notificationSoundVolume: 75,
    badgeAlerts: true,
    notifyOnFailover: true,
    notifyOnSync: false,
    autoUpdateExtension: true,
    autoBackgroundSync: true,
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
      autoOnAudioOverviews: typeof saved.autoOnAudioOverviews === "boolean" ? saved.autoOnAudioOverviews : DEFAULT_SETTINGS.autoOnAudioOverviews,
      primaryProvider,
      queueOrder,
      providerModels,
      customBaseUrl: typeof saved.customBaseUrl === "string" ? saved.customBaseUrl.trim() : "",
      customEnabled: Boolean(saved.customEnabled),
      languageHint: typeof saved.languageHint === "string" && saved.languageHint ? saved.languageHint : "auto",
      translateTo: typeof saved.translateTo === "string" && saved.translateTo ? saved.translateTo : "original",
      fontSize: CAPTION_FONT_SIZES.includes(saved.fontSize) ? saved.fontSize : "medium",
      captionStyle: CAPTION_STYLES.includes(saved.captionStyle) ? saved.captionStyle : "classic",
      captionFontFamily: CAPTION_FONT_FAMILIES.includes(saved.captionFontFamily) ? saved.captionFontFamily : "sans",
      captionColor: CAPTION_COLORS.includes(saved.captionColor) ? saved.captionColor : "white",
      captionBgOpacity: Number.isFinite(Number(saved.captionBgOpacity)) ? Math.max(0, Math.min(100, Math.round(Number(saved.captionBgOpacity)))) : DEFAULT_SETTINGS.captionBgOpacity,
      captionPosition: CAPTION_POSITIONS.includes(saved.captionPosition) ? saved.captionPosition : "bottom",
      captionMaxWidth: CAPTION_WIDTHS.includes(saved.captionMaxWidth) ? saved.captionMaxWidth : "balanced",
      karaokeHighlight: typeof saved.karaokeHighlight === "boolean" ? saved.karaokeHighlight : DEFAULT_SETTINGS.karaokeHighlight,
      karaokeDelayMs: Number.isFinite(Number(saved.karaokeDelayMs)) ? Math.max(-1500, Math.min(3e3, Math.round(Number(saved.karaokeDelayMs) / 10) * 10)) : DEFAULT_SETTINGS.karaokeDelayMs,
      showSpeakerLabels: typeof saved.showSpeakerLabels === "boolean" ? saved.showSpeakerLabels : DEFAULT_SETTINGS.showSpeakerLabels,
      pauseOnCaptionHover: typeof saved.pauseOnCaptionHover === "boolean" ? saved.pauseOnCaptionHover : DEFAULT_SETTINGS.pauseOnCaptionHover,
      clickCaptionToCopy: typeof saved.clickCaptionToCopy === "boolean" ? saved.clickCaptionToCopy : DEFAULT_SETTINGS.clickCaptionToCopy,
      defaultPlaybackSpeed: PLAYBACK_SPEEDS.includes(Number(saved.defaultPlaybackSpeed)) ? Number(saved.defaultPlaybackSpeed) : DEFAULT_SETTINGS.defaultPlaybackSpeed,
      subtitleOffsetSec: Number.isFinite(Number(saved.subtitleOffsetSec)) ? Math.max(-10, Math.min(10, Number(saved.subtitleOffsetSec))) : 0,
      fineGrainedControls: typeof saved.fineGrainedControls === "boolean" ? saved.fineGrainedControls : DEFAULT_SETTINGS.fineGrainedControls,
      dynamicCaptionScaling: typeof saved.dynamicCaptionScaling === "boolean" ? saved.dynamicCaptionScaling : DEFAULT_SETTINGS.dynamicCaptionScaling,
      captionScaleFactor: Number.isFinite(Number(saved.captionScaleFactor)) ? Math.max(50, Math.min(200, Math.round(Number(saved.captionScaleFactor)))) : DEFAULT_SETTINGS.captionScaleFactor,
      captionMinFontPx: Number.isFinite(Number(saved.captionMinFontPx)) ? Math.max(8, Math.min(18, Math.round(Number(saved.captionMinFontPx)))) : DEFAULT_SETTINGS.captionMinFontPx,
      captionMaxFontPx: Number.isFinite(Number(saved.captionMaxFontPx)) ? Math.max(20, Math.min(64, Math.round(Number(saved.captionMaxFontPx)))) : DEFAULT_SETTINGS.captionMaxFontPx,
      captionPaddingY: Number.isFinite(Number(saved.captionPaddingY)) ? Math.max(2, Math.min(20, Math.round(Number(saved.captionPaddingY)))) : DEFAULT_SETTINGS.captionPaddingY,
      captionPaddingX: Number.isFinite(Number(saved.captionPaddingX)) ? Math.max(6, Math.min(40, Math.round(Number(saved.captionPaddingX)))) : DEFAULT_SETTINGS.captionPaddingX,
      captionBorderRadius: Number.isFinite(Number(saved.captionBorderRadius)) ? Math.max(0, Math.min(32, Math.round(Number(saved.captionBorderRadius)))) : DEFAULT_SETTINGS.captionBorderRadius,
      captionLineHeight: Number.isFinite(Number(saved.captionLineHeight)) ? Math.max(115, Math.min(185, Math.round(Number(saved.captionLineHeight)))) : DEFAULT_SETTINGS.captionLineHeight,
      captionBottomOffsetPx: Number.isFinite(Number(saved.captionBottomOffsetPx)) ? Math.max(24, Math.min(180, Math.round(Number(saved.captionBottomOffsetPx)))) : DEFAULT_SETTINGS.captionBottomOffsetPx,
      captionTextStrokePx: Number.isFinite(Number(saved.captionTextStrokePx)) ? Math.max(0, Math.min(3, Math.round(Number(saved.captionTextStrokePx) * 2) / 2)) : DEFAULT_SETTINGS.captionTextStrokePx,
      karaokeHighlightOpacity: Number.isFinite(Number(saved.karaokeHighlightOpacity)) ? Math.max(15, Math.min(95, Math.round(Number(saved.karaokeHighlightOpacity)))) : DEFAULT_SETTINGS.karaokeHighlightOpacity,
      upcomingWordOpacity: Number.isFinite(Number(saved.upcomingWordOpacity)) ? Math.max(25, Math.min(100, Math.round(Number(saved.upcomingWordOpacity)))) : DEFAULT_SETTINGS.upcomingWordOpacity,
      playBarDockMode: PLAYBAR_DOCK_MODES.includes(saved.playBarDockMode) ? saved.playBarDockMode : DEFAULT_SETTINGS.playBarDockMode,
      hoverFadeDelayMs: Number.isFinite(Number(saved.hoverFadeDelayMs)) ? Math.max(400, Math.min(6e3, Math.round(Number(saved.hoverFadeDelayMs) / 100) * 100)) : DEFAULT_SETTINGS.hoverFadeDelayMs,
      keepSubtitlesInPiP: typeof saved.keepSubtitlesInPiP === "boolean" ? saved.keepSubtitlesInPiP : DEFAULT_SETTINGS.keepSubtitlesInPiP,
      skipSilenceEnabled: typeof saved.skipSilenceEnabled === "boolean" ? saved.skipSilenceEnabled : DEFAULT_SETTINGS.skipSilenceEnabled,
      skipSilenceGapSec: Number.isFinite(Number(saved.skipSilenceGapSec)) ? Math.max(0.6, Math.min(5, Math.round(Number(saved.skipSilenceGapSec) * 10) / 10)) : DEFAULT_SETTINGS.skipSilenceGapSec,
      skipSilenceRate: Number.isFinite(Number(saved.skipSilenceRate)) ? Math.max(1.4, Math.min(3, Math.round(Number(saved.skipSilenceRate) * 10) / 10)) : DEFAULT_SETTINGS.skipSilenceRate,
      audioBoostPercent: Number.isFinite(Number(saved.audioBoostPercent)) ? Math.max(100, Math.min(250, Math.round(Number(saved.audioBoostPercent) / 5) * 5)) : DEFAULT_SETTINGS.audioBoostPercent,
      showToast: typeof saved.showToast === "boolean" ? saved.showToast : DEFAULT_SETTINGS.showToast,
      desktopNotifications: typeof saved.desktopNotifications === "boolean" ? saved.desktopNotifications : DEFAULT_SETTINGS.desktopNotifications,
      soundAlerts: typeof saved.soundAlerts === "boolean" ? saved.soundAlerts : DEFAULT_SETTINGS.soundAlerts,
      notificationSoundPreset: NOTIFICATION_SOUND_PRESETS.includes(
        saved.notificationSoundPreset
      ) ? saved.notificationSoundPreset : DEFAULT_SETTINGS.notificationSoundPreset,
      notificationSoundVolume: Number.isFinite(Number(saved.notificationSoundVolume)) ? Math.max(10, Math.min(100, Math.round(Number(saved.notificationSoundVolume)))) : DEFAULT_SETTINGS.notificationSoundVolume,
      badgeAlerts: typeof saved.badgeAlerts === "boolean" ? saved.badgeAlerts : DEFAULT_SETTINGS.badgeAlerts,
      notifyOnFailover: typeof saved.notifyOnFailover === "boolean" ? saved.notifyOnFailover : DEFAULT_SETTINGS.notifyOnFailover,
      notifyOnSync: typeof saved.notifyOnSync === "boolean" ? saved.notifyOnSync : DEFAULT_SETTINGS.notifyOnSync,
      autoUpdateExtension: typeof saved.autoUpdateExtension === "boolean" ? saved.autoUpdateExtension : DEFAULT_SETTINGS.autoUpdateExtension,
      autoBackgroundSync: typeof saved.autoBackgroundSync === "boolean" ? saved.autoBackgroundSync : DEFAULT_SETTINGS.autoBackgroundSync,
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
    if (partial && "karaokeDelayMs" in partial) {
      next.karaokeDelayMs = Number.isFinite(Number(partial.karaokeDelayMs)) ? Math.max(-1500, Math.min(3e3, Math.round(Number(partial.karaokeDelayMs) / 10) * 10)) : DEFAULT_SETTINGS.karaokeDelayMs;
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
  function normalizeReleaseNotes(raw) {
    if (!raw || typeof raw !== "object") return null;
    const highlights = Array.isArray(raw.highlights) ? raw.highlights.filter((line) => typeof line === "string" && line.trim()).slice(0, 6) : [];
    const headline = String(raw.headline || "");
    const version = String(raw.version || "");
    if (!headline && highlights.length === 0) return null;
    return { version, headline, highlights };
  }
  async function getUpdateStatus(storageArea) {
    try {
      const store = resolveStorage(storageArea);
      const raw = await store.get(STORAGE_KEYS.UPDATE_STATUS);
      const saved = raw?.[STORAGE_KEYS.UPDATE_STATUS];
      if (!saved || typeof saved !== "object") {
        return {
          updateAvailable: false,
          currentVersion: "0.2.8",
          currentBuildId: "",
          latestVersion: "0.2.8",
          latestBuildId: "",
          zipUrl: "/releases/lm-subs-latest.zip",
          zipSha256: "",
          notifiedReleaseKey: "",
          checkedAt: null,
          autoAppliedAt: null,
          linkedFolderName: "",
          latestNotes: null
        };
      }
      return {
        updateAvailable: Boolean(saved.updateAvailable),
        currentVersion: String(saved.currentVersion || "0.2.8"),
        currentBuildId: String(saved.currentBuildId || ""),
        latestVersion: String(saved.latestVersion || saved.currentVersion || "0.2.8"),
        latestBuildId: String(saved.latestBuildId || ""),
        zipUrl: String(saved.zipUrl || "/releases/lm-subs-latest.zip"),
        zipSha256: String(saved.zipSha256 || ""),
        notifiedReleaseKey: String(saved.notifiedReleaseKey || ""),
        checkedAt: saved.checkedAt || null,
        autoAppliedAt: saved.autoAppliedAt || null,
        linkedFolderName: String(saved.linkedFolderName || ""),
        latestNotes: normalizeReleaseNotes(saved.latestNotes)
      };
    } catch {
      return {
        updateAvailable: false,
        currentVersion: "0.2.8",
        currentBuildId: "",
        latestVersion: "0.2.8",
        latestBuildId: "",
        zipUrl: "/releases/lm-subs-latest.zip",
        zipSha256: "",
        notifiedReleaseKey: "",
        checkedAt: null,
        autoAppliedAt: null,
        linkedFolderName: "",
        latestNotes: null
      };
    }
  }
  async function saveUpdateStatus(partial, storageArea) {
    const store = resolveStorage(storageArea);
    const current = await getUpdateStatus(store);
    const next = { ...current, ...partial || {} };
    await store.set({ [STORAGE_KEYS.UPDATE_STATUS]: next });
    return next;
  }
  async function getSetupState(storageArea) {
    try {
      const store = resolveStorage(storageArea);
      const raw = await store.get(STORAGE_KEYS.SETUP_STATE);
      const saved = raw?.[STORAGE_KEYS.SETUP_STATE];
      if (!saved || typeof saved !== "object") {
        return {
          installedAt: null,
          welcomeOpenedAt: null,
          popupOpenedCount: 0,
          lastPopupOpenedAt: null,
          completedAt: null
        };
      }
      return {
        installedAt: saved.installedAt || null,
        welcomeOpenedAt: saved.welcomeOpenedAt || null,
        popupOpenedCount: Number.isFinite(Number(saved.popupOpenedCount)) ? Number(saved.popupOpenedCount) : 0,
        lastPopupOpenedAt: saved.lastPopupOpenedAt || null,
        completedAt: saved.completedAt || null
      };
    } catch {
      return {
        installedAt: null,
        welcomeOpenedAt: null,
        popupOpenedCount: 0,
        lastPopupOpenedAt: null,
        completedAt: null
      };
    }
  }
  async function saveSetupState(partial, storageArea) {
    const store = resolveStorage(storageArea);
    const current = await getSetupState(store);
    const next = { ...current, ...partial || {} };
    await store.set({ [STORAGE_KEYS.SETUP_STATE]: next });
    return next;
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
      const secondaryText = typeof item.secondaryText === "string" && item.secondaryText.trim() ? item.secondaryText.trim() : null;
      const bookmarked = Boolean(item.bookmarked);
      cleaned.push({
        startSec,
        endSec,
        text,
        ...speaker ? { speaker } : {},
        ...secondaryText ? { secondaryText } : {},
        ...bookmarked ? { bookmarked: true } : {}
      });
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
    const bookmarkedCues = normalized.filter((c) => c.bookmarked);
    if (bookmarkedCues.length > 0) {
      lines.push("## Saved study bookmarks", "");
      for (const cue of bookmarkedCues) {
        const stamp = formatTimestamp(cue.startSec, ".").slice(3, 8);
        const clean = cue.text.replace(/\s*\n\s*/g, " ").trim();
        lines.push(`- \`[${stamp}]\` ${clean}`);
      }
      lines.push("");
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
  function escapeCsvCell(val) {
    const s = String(val ?? "");
    if (/[",\r\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }
  function formatCsvSubtitles(cues) {
    const normalized = normalizeAndSortCues(cues);
    const header = "index,start_sec,end_sec,timestamp,speaker,bookmarked,text";
    if (normalized.length === 0) return `${header}
`;
    const rows = normalized.map((cue, idx) => {
      const cleanText = String(cue.text || "").replace(/\s*\n\s*/g, " ").trim();
      return [
        idx + 1,
        cue.startSec.toFixed(3),
        cue.endSec.toFixed(3),
        formatShortTimestamp(cue.startSec),
        escapeCsvCell(cue.speaker || ""),
        cue.bookmarked ? "true" : "false",
        escapeCsvCell(cleanText)
      ].join(",");
    });
    return `${header}
${rows.join("\n")}
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
    if (fmt === "md" || fmt === "markdown") {
      return {
        content: formatMarkdownNotes(cues, meta),
        extension: "md",
        mimeType: "text/markdown;charset=utf-8",
        filename: `${base}-notes.md`
      };
    }
    if (fmt === "csv") {
      return {
        content: formatCsvSubtitles(cues),
        extension: "csv",
        mimeType: "text/csv;charset=utf-8",
        filename: `${base}.csv`
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

  // src/lib/unpacked-updater.js
  var IDB_NAME = "lmsubs_updater_db";
  var IDB_STORE = "handles";
  var IDB_DIR_KEY = "extension_root_dir";
  var CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    return table;
  })();
  function openHandlesDb() {
    if (typeof globalThis.indexedDB === "undefined") {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      try {
        const req = globalThis.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  async function saveLinkedExtensionDirHandle(dirHandle) {
    const db = await openHandlesDb();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(dirHandle, IDB_DIR_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          resolve(false);
        };
      } catch {
        db.close();
        resolve(false);
      }
    });
  }
  async function loadLinkedExtensionDirHandle() {
    const db = await openHandlesDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(IDB_DIR_KEY);
        req.onsuccess = () => {
          db.close();
          resolve(req.result || null);
        };
        req.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    });
  }
  async function inspectLinkedDirPermission(dirHandle) {
    if (!dirHandle) return { linked: false, permission: "none", folderName: "" };
    try {
      const perm = await dirHandle.queryPermission?.({ mode: "readwrite" }) || "granted";
      return {
        linked: true,
        permission: perm,
        folderName: dirHandle.name || "lm-subs"
      };
    } catch {
      return {
        linked: true,
        permission: "prompt",
        folderName: dirHandle.name || "lm-subs"
      };
    }
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
    const downloadLatestCsvBtn = document.getElementById("download-latest-csv-btn");
    const downloadLatestJsonBtn = document.getElementById("download-latest-json-btn");
    const copyLatestTxtBtn = document.getElementById("copy-latest-txt-btn");
    const popupNotifBadge = document.getElementById("popup-notif-badge");
    const popupNotifSummary = document.getElementById("popup-notif-summary");
    const popupSoundPreset = document.getElementById("popup-sound-preset");
    const popupPreviewSoundBtn = document.getElementById("popup-preview-sound-btn");
    const popupRefreshStatsBtn = document.getElementById("popup-refresh-stats-btn");
    const popupOpenStatsBtn = document.getElementById("popup-open-stats-btn");
    const popupEnableOsNotifBtn = document.getElementById("popup-enable-os-notif-btn");
    const popupCheckUpdatesBtn = document.getElementById("popup-check-updates-btn");
    const popupUpdateStatusHint = document.getElementById("popup-update-status-hint");
    const popupMarkReadBtn = document.getElementById("popup-mark-read-btn");
    const popupClearNotifBtn = document.getElementById("popup-clear-notif-btn");
    const popupNotifList = document.getElementById("popup-notif-list");
    const popupUpdateBanner = document.getElementById("popup-update-banner");
    const popupUpdateTitle = document.getElementById("popup-update-title");
    const popupUpdateDetail = document.getElementById("popup-update-detail");
    const popupUpdateNotes = document.getElementById("popup-update-notes");
    const popupApplyUpdateBtn = document.getElementById("popup-apply-update-btn");
    const popupDownloadUpdateLink = document.getElementById("popup-download-update-link");
    const lastStatusCard = document.getElementById("last-status-card");
    const lastStatusBadge = document.getElementById("last-status-badge");
    const lastStatusTitle = document.getElementById("last-status-title");
    const lastStatusMeta = document.getElementById("last-status-meta");
    const permWarningCard = document.getElementById("permission-warning-card");
    const grantGooglePermsBtn = document.getElementById("grant-google-perms-btn");
    const debugModeToggle = document.getElementById("debug-mode-toggle");
    const copyDebugBtn = document.getElementById("copy-debug-btn");
    getSetupState().then(
      (st) => saveSetupState({
        popupOpenedCount: (st?.popupOpenedCount || 0) + 1,
        lastPopupOpenedAt: (/* @__PURE__ */ new Date()).toISOString()
      })
    ).catch(() => {
    });
    const specs = listProviderSpecs();
    for (const spec of specs) {
      const opt = document.createElement("option");
      opt.value = spec.id;
      opt.textContent = `${spec.name} (${spec.badge})`;
      providerSelect.appendChild(opt);
    }
    let [
      settings,
      presenceMap,
      lastStatus,
      cacheList,
      syncProfile,
      notifications,
      updateStatus
    ] = await Promise.all([
      getSettings(),
      getSavedKeyPresenceMap(),
      getLastStatus(),
      getSubtitleCacheList(),
      getCloudSyncProfile(),
      getNotifications(),
      getUpdateStatus()
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
    async function renderPopupStats() {
      const el = (id) => document.getElementById(id);
      const notebookStatsRes = await sendRuntime({
        type: RUNTIME_MESSAGE.GET_NOTEBOOKLM_STATS
      });
      const notebookLmStats = notebookStatsRes?.ok ? notebookStatsRes.stats : null;
      let cloudStats = null;
      if (syncProfile?.connected) {
        const res = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_GET_STATS });
        if (res?.ok && res.totals) cloudStats = res;
      }
      const report = buildUnifiedStatsReport({
        cacheList,
        notebookLmStats,
        cloudStats
      });
      const t = report.totals;
      const nb = report.notebookLm;
      const set = (id, value) => {
        const node = el(id);
        if (node) node.textContent = value;
      };
      set("popup-stat-videos", String(t.videosCaptioned || 0));
      set("popup-stat-cues", String(t.totalCues || 0));
      set("popup-stat-saved", formatMegabytesValue(t.bandwidthSavedBytes || 0));
      set(
        "popup-stat-latency",
        t.medianLatencyMs ? `${(t.medianLatencyMs / 1e3).toFixed(1)}s` : "n/a"
      );
      set("popup-stat-notebooks", String(nb.notebooksCount || 0));
      set("popup-stat-sources", String(nb.sourcesIndexed || 0));
      set("popup-stat-study", formatMinutesLabel((nb.activeStudyMinutes || 0) * 60));
      set("popup-stat-citations", String(nb.citationsCount || 0));
      const summary = el("popup-stats-summary");
      if (summary) {
        summary.textContent = `${t.videosCaptioned || 0} captioned \xB7 ${nb.notebooksCount || 0} notebooks`;
      }
      const note = el("popup-stats-note");
      if (note) {
        note.textContent = syncProfile?.connected ? "Merged live account telemetry with this browser's local cache." : "Computed on this device. Sign in to merge cross-device numbers.";
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
    let setupTabConnected = false;
    async function inspectActiveTab() {
      if (!chrome.tabs?.query) return;
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs?.[0];
      let host = "";
      let pathname = "";
      try {
        const parsed = tab?.url ? new URL(tab.url) : null;
        host = parsed ? parsed.hostname.toLowerCase() : "";
        pathname = parsed ? parsed.pathname : "";
      } catch {
        host = "";
        pathname = "";
      }
      const isSetupOrigin = host === "lm-subs.vercel.app" || host.endsWith(".vercel.app") || host === "localhost" || host === "127.0.0.1";
      if (tab?.id && isSetupOrigin && (pathname.startsWith("/welcome") || pathname.startsWith("/setup") || pathname.startsWith("/guide"))) {
        setupTabConnected = true;
        tabBadge.textContent = "Setup linked";
        tabBadge.className = "badge badge-saved";
        tabDescription.textContent = "Two-way setup wizard verified. Pin LM Subs above, then open NotebookLM.";
        generateNowBtn.textContent = "Open NotebookLM";
        generateNowBtn.disabled = false;
        return;
      }
      setupTabConnected = false;
      generateNowBtn.textContent = "Generate subtitles";
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
          const isPodcast = state.mediaKind === "audio" || Boolean(state.hasAudioElement);
          const kindLabel = isPodcast ? "Podcast" : "Video";
          const kindFull = isPodcast ? "Audio Overview" : "Video Overview";
          if (state.hasVideoElement || state.readyArtifactCount > 0) {
            tabBadge.textContent = `${Math.max(1, state.readyArtifactCount)} ready`;
            tabBadge.className = "badge badge-saved";
            tabDescription.textContent = state.activeArtifact?.title ? `${kindLabel}: "${state.activeArtifact.title}"` : `${kindFull} ready for captioning.`;
            generateNowBtn.disabled = false;
          } else if (state.generatingCount > 0) {
            tabBadge.textContent = "Rendering";
            tabBadge.className = "badge badge-warn";
            tabDescription.textContent = `Studio is rendering the ${kindFull}. Captions start automatically when ready.`;
            generateNowBtn.disabled = true;
          } else {
            tabBadge.textContent = "Idle";
            tabBadge.className = "badge";
            tabDescription.textContent = "Open a Video or Audio Overview in NotebookLM Studio to generate captions.";
            generateNowBtn.disabled = false;
          }
        }
      );
    }
    async function renderUpdateBanner() {
      const dirHandle = await loadLinkedExtensionDirHandle();
      const dirInfo = await inspectLinkedDirPermission(dirHandle);
      const curVer = chrome.runtime?.getManifest?.()?.version || updateStatus?.currentVersion || "0.2.8";
      if (popupUpdateStatusHint) {
        const folderPart = dirInfo.linked ? `Folder linked (${dirInfo.folderName})` : "Auto-check active";
        popupUpdateStatusHint.textContent = updateStatus?.updateAvailable ? `Update v${updateStatus.latestVersion} available \xB7 ${folderPart}` : `Installed v${curVer} \xB7 ${folderPart}`;
      }
      if (!popupUpdateBanner) return;
      if (!updateStatus?.updateAvailable) {
        popupUpdateBanner.style.display = "none";
        return;
      }
      popupUpdateBanner.style.display = "block";
      if (popupUpdateTitle) {
        popupUpdateTitle.textContent = `Update ready: LM Subs v${updateStatus.latestVersion}`;
      }
      if (popupUpdateDetail) {
        popupUpdateDetail.textContent = dirInfo.linked ? `Ready to update ${dirInfo.folderName} and reload automatically.` : "Select your unzipped lm-subs folder once for automatic in-place updates.";
      }
      renderReleaseNotes(popupUpdateNotes, updateStatus.latestNotes, {
        version: updateStatus.latestVersion
      });
      if (popupApplyUpdateBtn) {
        popupApplyUpdateBtn.textContent = dirInfo.linked ? "Update and reload" : "Link folder and update";
      }
      if (popupDownloadUpdateLink && updateStatus.zipUrl) {
        popupDownloadUpdateLink.href = updateStatus.zipUrl;
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
        const logo = document.createElement("img");
        logo.src = "icons/icon32.png";
        logo.alt = "";
        logo.width = 20;
        logo.height = 20;
        logo.className = "notif-row-logo";
        const content = document.createElement("div");
        content.className = "notif-row-content";
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
        content.appendChild(head);
        if (item.body) {
          const body = document.createElement("div");
          body.className = "notif-row-body";
          body.textContent = item.body;
          content.appendChild(body);
        }
        row.append(logo, content);
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
    renderUpdateBanner();
    inspectGoogleHostPermissions();
    inspectActiveTab();
    if (popupSoundPreset) {
      popupSoundPreset.textContent = "";
      for (const preset of SOUND_PRESETS) {
        const option = document.createElement("option");
        option.value = preset.id;
        option.textContent = preset.label;
        popupSoundPreset.appendChild(option);
      }
      popupSoundPreset.value = settings.notificationSoundPreset || "chime";
    }
    sendRuntime({
      type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK,
      includeUpdateCheck: true
    }).catch(() => {
    });
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
      if (setupTabConnected) {
        if (chrome.tabs?.create) {
          chrome.tabs.create({ url: "https://notebooklm.google.com/" });
        } else {
          window.open("https://notebooklm.google.com/", "_blank", "noopener,noreferrer");
        }
        return;
      }
      if (!activeTabId) return;
      generateNowBtn.disabled = true;
      chrome.tabs.sendMessage(
        activeTabId,
        { type: RUNTIME_MESSAGE.TRIGGER_ACTIVE_VIDEO, force: true },
        (res) => {
          generateNowBtn.disabled = false;
          if (chrome.runtime.lastError || !res?.ok) {
            tabDescription.textContent = res?.error || "Open a Video or Audio Overview in NotebookLM Studio and click again.";
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
    bindExportButton(downloadLatestCsvBtn, "csv");
    bindExportButton(downloadLatestJsonBtn, "json");
    popupEnableOsNotifBtn?.addEventListener("click", async () => {
      settings = await saveSettings({ desktopNotifications: true });
      await sendRuntime({ type: RUNTIME_MESSAGE.TEST_DESKTOP_NOTIFICATION });
      notifications = await getNotifications();
      renderNotifications();
    });
    popupCheckUpdatesBtn?.addEventListener("click", async () => {
      popupCheckUpdatesBtn.disabled = true;
      popupCheckUpdatesBtn.textContent = "Checking\u2026";
      const res = await sendRuntime({ type: RUNTIME_MESSAGE.CHECK_FOR_UPDATES });
      popupCheckUpdatesBtn.disabled = false;
      popupCheckUpdatesBtn.textContent = "Check updates";
      updateStatus = res?.status || await getUpdateStatus();
      notifications = await getNotifications();
      renderNotifications();
      await renderUpdateBanner();
    });
    popupApplyUpdateBtn?.addEventListener("click", async () => {
      popupApplyUpdateBtn.disabled = true;
      try {
        let dirHandle = await loadLinkedExtensionDirHandle();
        if (!dirHandle && typeof window.showDirectoryPicker === "function") {
          dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
          await saveLinkedExtensionDirHandle(dirHandle);
          await saveUpdateStatus({ linkedFolderName: dirHandle.name || "lm-subs" });
        }
        if (dirHandle?.requestPermission) {
          await dirHandle.requestPermission({ mode: "readwrite" });
        }
        popupApplyUpdateBtn.textContent = "Updating\u2026";
        const res = await sendRuntime({
          type: RUNTIME_MESSAGE.APPLY_UNPACKED_UPDATE
        });
        if (!res?.ok && popupUpdateDetail) {
          popupUpdateDetail.textContent = res?.error || "Could not apply update automatically. Use Download .zip.";
        }
      } catch (err) {
        if (popupUpdateDetail && err?.name !== "AbortError") {
          popupUpdateDetail.textContent = err?.message || "Folder selection canceled.";
        }
      } finally {
        popupApplyUpdateBtn.disabled = false;
        updateStatus = await getUpdateStatus();
        await renderUpdateBanner();
      }
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
        if (changes.updateStatus) {
          updateStatus = await getUpdateStatus();
          await renderUpdateBanner();
        }
        if (changes.settings?.newValue) {
          settings = { ...settings, ...changes.settings.newValue };
        }
      });
      chrome.runtime?.onMessage?.addListener((msg) => {
        if (msg?.type === RUNTIME_MESSAGE.SUBTITLES_READY && settings.soundAlerts) {
          playCompletionChimeSound({
            win: window,
            preset: settings.notificationSoundPreset || "chime",
            volume: Number(settings.notificationSoundVolume) || 75
          }).catch(() => {
          });
        }
        if (msg?.type === RUNTIME_MESSAGE.PLAY_NOTIFICATION_SOUND) {
          playCompletionChimeSound({
            win: window,
            preset: msg.preset || settings.notificationSoundPreset || "chime",
            volume: Number(msg.volume ?? settings.notificationSoundVolume) || 75,
            force: true
          }).catch(() => {
          });
        }
        return false;
      });
    } catch {
    }
    const openOptions = () => chrome.runtime.openOptionsPage();
    openQueueBtn.addEventListener("click", openOptions);
    openOptionsBtn.addEventListener("click", openOptions);
    popupOpenSyncBtn?.addEventListener("click", openOptions);
    popupOpenStatsBtn?.addEventListener("click", () => {
      const url = "https://lm-subs.vercel.app/stats";
      if (chrome.tabs?.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });
    popupRefreshStatsBtn?.addEventListener("click", () => {
      renderPopupStats();
    });
    popupSoundPreset?.addEventListener("change", async () => {
      unlockChimeAudio(window);
      settings = await saveSettings({
        notificationSoundPreset: popupSoundPreset.value || "chime"
      });
      await playCompletionChimeSound({
        win: window,
        preset: popupSoundPreset.value,
        volume: Number(settings.notificationSoundVolume) || 75,
        force: true
      });
    });
    popupPreviewSoundBtn?.addEventListener("click", async () => {
      unlockChimeAudio(window);
      await playCompletionChimeSound({
        win: window,
        preset: popupSoundPreset?.value || settings.notificationSoundPreset || "chime",
        volume: Number(settings.notificationSoundVolume) || 75,
        force: true
      });
    });
    await renderPopupStats();
  }
  document.addEventListener("DOMContentLoaded", initPopup);
})();

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
        "Caption buttons dock as one group in front of NotebookLM\u2019s right-hand cluster, and a narrow play bar trims the extras instead of crowding the native controls"
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
    const optAutoAudio = document.getElementById("opt-auto-audio");
    const optShowToast = document.getElementById("opt-show-toast");
    const optLanguageHint = document.getElementById("opt-language-hint");
    const optTranslateTo = document.getElementById("opt-translate-to");
    const optFontSize = document.getElementById("opt-font-size");
    const optCaptionStyle = document.getElementById("opt-caption-style");
    const optCaptionFont = document.getElementById("opt-caption-font");
    const optCaptionColor = document.getElementById("opt-caption-color");
    const optCaptionPosition = document.getElementById("opt-caption-position");
    const optCaptionWidth = document.getElementById("opt-caption-width");
    const optCaptionOpacity = document.getElementById("opt-caption-opacity");
    const optCaptionOpacityLabel = document.getElementById("opt-caption-opacity-label");
    const optKaraokeDelay = document.getElementById("opt-karaoke-delay");
    const optKaraokeDelayLabel = document.getElementById("opt-karaoke-delay-label");
    const optPlaybackSpeed = document.getElementById("opt-playback-speed");
    const optPlayBarDock = document.getElementById("opt-play-bar-dock");
    const optFineGrained = document.getElementById("opt-fine-grained");
    const advancedControlsBody = document.getElementById("advanced-controls-body");
    const optCaptionScale = document.getElementById("opt-caption-scale");
    const optCaptionScaleLabel = document.getElementById("opt-caption-scale-label");
    const optDynamicScaling = document.getElementById("opt-dynamic-scaling");
    const optCaptionMin = document.getElementById("opt-caption-min");
    const optCaptionMax = document.getElementById("opt-caption-max");
    const optCaptionPadY = document.getElementById("opt-caption-pad-y");
    const optCaptionPadX = document.getElementById("opt-caption-pad-x");
    const optCaptionRadius = document.getElementById("opt-caption-radius");
    const optCaptionLeading = document.getElementById("opt-caption-leading");
    const optCaptionLeadingLabel = document.getElementById("opt-caption-leading-label");
    const optCaptionBottom = document.getElementById("opt-caption-bottom");
    const optCaptionStroke = document.getElementById("opt-caption-stroke");
    const optKaraokeAlpha = document.getElementById("opt-karaoke-alpha");
    const optKaraokeAlphaLabel = document.getElementById("opt-karaoke-alpha-label");
    const optUpcomingAlpha = document.getElementById("opt-upcoming-alpha");
    const optUpcomingAlphaLabel = document.getElementById("opt-upcoming-alpha-label");
    const optSkipGap = document.getElementById("opt-skip-gap");
    const optSkipGapLabel = document.getElementById("opt-skip-gap-label");
    const optSkipRate = document.getElementById("opt-skip-rate");
    const optSkipRateLabel = document.getElementById("opt-skip-rate-label");
    const optAudioBoost = document.getElementById("opt-audio-boost");
    const optAudioBoostLabel = document.getElementById("opt-audio-boost-label");
    const optHoverFade = document.getElementById("opt-hover-fade");
    const optHoverFadeLabel = document.getElementById("opt-hover-fade-label");
    const optKeepPip = document.getElementById("opt-keep-pip");
    const optSkipSilence = document.getElementById("opt-skip-silence");
    const saveAdvancedBtn = document.getElementById("save-advanced-btn");
    const resetAdvancedBtn = document.getElementById("reset-advanced-btn");
    const optSoundPreset = document.getElementById("opt-sound-preset");
    const optSoundVolume = document.getElementById("opt-sound-volume");
    const optSoundVolumeLabel = document.getElementById("opt-sound-volume-label");
    const optSoundBadge = document.getElementById("opt-sound-badge");
    const optPreviewSoundBtn = document.getElementById("opt-preview-sound-btn");
    const optSoundFeedback = document.getElementById("opt-sound-feedback");
    const optKaraokeHighlight = document.getElementById("opt-karaoke-highlight");
    const optShowSpeakers = document.getElementById("opt-show-speakers");
    const optHoverPause = document.getElementById("opt-hover-pause");
    const optClickCopy = document.getElementById("opt-click-copy");
    const resetCaptionStyleBtn = document.getElementById("reset-caption-style-btn");
    const optPreviewStage = document.getElementById("opt-caption-preview-stage");
    const optPreviewBox = document.getElementById("opt-caption-preview-box");
    const optOffsetSec = document.getElementById("opt-offset-sec");
    const optExcludePatterns = document.getElementById("opt-exclude-patterns");
    const saveBehaviorBtn = document.getElementById("save-behavior-btn");
    const savedPill = document.getElementById("settings-saved-pill");
    const optNotifUnreadBadge = document.getElementById("opt-notif-unread-badge");
    const optAutoUpdate = document.getElementById("opt-auto-update");
    const optAutoBgSync = document.getElementById("opt-auto-bg-sync");
    const optDesktopNotifications = document.getElementById("opt-desktop-notifications");
    const optBadgeAlerts = document.getElementById("opt-badge-alerts");
    const optSoundAlerts = document.getElementById("opt-sound-alerts");
    const optNotifyFailover = document.getElementById("opt-notify-failover");
    const optNotifySync = document.getElementById("opt-notify-sync");
    const optTestNotifBtn = document.getElementById("opt-test-notif-btn");
    const optTestChimeBtn = document.getElementById("opt-test-chime-btn");
    const optMarkNotifReadBtn = document.getElementById("opt-mark-notif-read-btn");
    const optClearNotifBtn = document.getElementById("opt-clear-notif-btn");
    const optNotifList = document.getElementById("opt-notif-list");
    const optUpdateCard = document.getElementById("opt-update-card");
    const optUpdateBadge = document.getElementById("opt-update-badge");
    const optUpdateSummary = document.getElementById("opt-update-summary");
    const optUpdateNotes = document.getElementById("opt-update-notes");
    const optCheckUpdatesBtn = document.getElementById("opt-check-updates-btn");
    const optLinkFolderBtn = document.getElementById("opt-link-folder-btn");
    const optApplyUpdateBtn = document.getElementById("opt-apply-update-btn");
    const optUpdateFeedback = document.getElementById("opt-update-feedback");
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
    const statNotebooks = document.getElementById("stat-notebooks");
    const statSources = document.getElementById("stat-sources");
    const statArtifacts = document.getElementById("stat-artifacts");
    const statStudy = document.getElementById("stat-study");
    const statVideoOv = document.getElementById("stat-video-ov");
    const statAudioOv = document.getElementById("stat-audio-ov");
    const statCitations = document.getElementById("stat-citations");
    const statBookmarks = document.getElementById("stat-bookmarks");
    const notebookLmTableWrap = document.getElementById("notebook-lm-table-wrap");
    const notebookLmTbody = document.getElementById("notebook-lm-tbody");
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
    let [settings, presenceMap, cacheList, syncProfile, notifications, updateStatus] = await Promise.all([
      getSettings(),
      getSavedKeyPresenceMap(),
      getSubtitleCacheList(),
      getCloudSyncProfile(),
      getNotifications(),
      getUpdateStatus()
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
    async function computeUnifiedStats() {
      const [historyList, notebookLmStats] = await Promise.all([
        sendRuntime({ type: RUNTIME_MESSAGE.GET_DEBUG_REPORT }).then(() => []).catch(() => []),
        sendRuntime({ type: RUNTIME_MESSAGE.GET_NOTEBOOKLM_STATS }).then((res) => res?.ok ? res.stats : null).catch(() => null)
      ]);
      let cloudStats = null;
      if (syncProfile?.connected) {
        const res = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_GET_STATS });
        if (res?.ok && res.totals) cloudStats = res;
      }
      return buildUnifiedStatsReport({
        cacheList,
        historyList,
        notebookLmStats,
        cloudStats
      });
    }
    function renderNotebookLmTable(notebooks = []) {
      if (!notebookLmTableWrap || !notebookLmTbody) return;
      notebookLmTbody.textContent = "";
      if (!notebooks.length) {
        notebookLmTableWrap.style.display = "none";
        return;
      }
      notebookLmTableWrap.style.display = "block";
      for (const nb of notebooks) {
        const tr = document.createElement("tr");
        const tdTitle = document.createElement("td");
        tdTitle.style.fontWeight = "600";
        tdTitle.textContent = nb.title || "Untitled notebook";
        const tdSources = document.createElement("td");
        tdSources.dataset.num = "true";
        tdSources.textContent = String(nb.sourceCount || 0);
        const tdVideo = document.createElement("td");
        tdVideo.dataset.num = "true";
        tdVideo.textContent = String(nb.videoCount || 0);
        const tdAudio = document.createElement("td");
        tdAudio.dataset.num = "true";
        tdAudio.textContent = String(nb.audioCount || 0);
        const tdWatch = document.createElement("td");
        tdWatch.dataset.num = "true";
        tdWatch.textContent = formatMinutesLabel(
          (Number(nb.watchSeconds) || 0) + (Number(nb.listenSeconds) || 0)
        );
        const tdLast = document.createElement("td");
        tdLast.dataset.num = "true";
        tdLast.textContent = nb.lastSeenAt ? new Date(nb.lastSeenAt).toLocaleDateString() : "n/a";
        tr.append(tdTitle, tdSources, tdVideo, tdAudio, tdWatch, tdLast);
        notebookLmTbody.appendChild(tr);
      }
    }
    async function renderStatisticsPanel() {
      if (!statVideos) return;
      const report = await computeUnifiedStats();
      const t = report.totals;
      const nb = report.notebookLm;
      statVideos.textContent = String(t.videosCaptioned || 0);
      statCues.textContent = String(t.totalCues || 0);
      statSaved.textContent = formatMegabytesValue(t.bandwidthSavedBytes || 0);
      statLatency.textContent = t.medianLatencyMs ? `${(t.medianLatencyMs / 1e3).toFixed(1)}s` : "n/a";
      if (statNotebooks) statNotebooks.textContent = String(nb.notebooksCount || 0);
      if (statSources) statSources.textContent = String(nb.sourcesIndexed || 0);
      if (statArtifacts) {
        statArtifacts.textContent = String(nb.studioArtifactsCount || 0);
      }
      if (statStudy) statStudy.textContent = formatMinutesLabel(nb.activeStudyMinutes * 60);
      if (statVideoOv) statVideoOv.textContent = String(nb.videoOverviewsCount || 0);
      if (statAudioOv) statAudioOv.textContent = String(nb.audioOverviewsCount || 0);
      if (statCitations) statCitations.textContent = String(nb.citationsCount || 0);
      if (statBookmarks) statBookmarks.textContent = String(nb.bookmarksCount || 0);
      renderNotebookLmTable(nb.notebooks);
      if (statsSummaryNote) {
        statsSummaryNote.textContent = syncProfile?.connected ? `Live account metrics merged with this browser: ${t.spokenMinutes || 0} spoken minutes across ${t.videosCaptioned || 0} captioned overviews in ${nb.notebooksCount || 0} notebooks.` : `Computed on this device from ${t.videosCaptioned || 0} captioned overviews and ${nb.notebooksCount || 0} Google NotebookLM notebooks. Sign in above to merge cross-device numbers.`;
      }
    }
    async function reloadAllLocalState() {
      [settings, presenceMap, cacheList, syncProfile, notifications, updateStatus] = await Promise.all([
        getSettings(),
        getSavedKeyPresenceMap(),
        getSubtitleCacheList(),
        getCloudSyncProfile(),
        getNotifications(),
        getUpdateStatus()
      ]);
      populateForm();
      renderSyncPanel();
      renderProviderQueue();
      renderNotificationsPanel();
      await renderUpdatePanel();
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
    function renderCaptionPreview() {
      if (!optPreviewStage || !optPreviewBox) return;
      const size = optFontSize?.value || settings.fontSize || "medium";
      const style = optCaptionStyle?.value || settings.captionStyle || "classic";
      const font = optCaptionFont?.value || settings.captionFontFamily || "sans";
      const color = optCaptionColor?.value || settings.captionColor || "white";
      const pos = optCaptionPosition?.value || settings.captionPosition || "bottom";
      const width = optCaptionWidth?.value || settings.captionMaxWidth || "balanced";
      const opacity = Number(optCaptionOpacity?.value ?? settings.captionBgOpacity ?? 88);
      const karaoke = Boolean(optKaraokeHighlight?.checked);
      const showSpk = optShowSpeakers ? Boolean(optShowSpeakers.checked) : true;
      if (optCaptionOpacityLabel) {
        optCaptionOpacityLabel.textContent = `${opacity}%`;
      }
      if (optKaraokeDelayLabel && optKaraokeDelay) {
        const kdVal = Number(optKaraokeDelay.value) || 0;
        optKaraokeDelayLabel.textContent = `${kdVal > 0 ? "+" : ""}${kdVal} ms`;
      }
      optPreviewStage.dataset.pos = pos;
      const sizePx = {
        small: "13px",
        medium: "15px",
        large: "17.5px",
        xlarge: "20px",
        xxlarge: "23px"
      }[size] || "15px";
      const fontCss = {
        sans: "var(--font-sans)",
        serif: "Charter, Georgia, Cambria, serif",
        mono: "var(--font-mono)",
        dyslexic: '"Trebuchet MS", Verdana, sans-serif'
      }[font] || "var(--font-sans)";
      const colorHex = {
        white: "#fdfdfe",
        yellow: "#fde047",
        cyan: "#67e8f9",
        green: "#86efac",
        ink: "#111315"
      }[color] || "#fdfdfe";
      const maxWidthCss = {
        compact: "68%",
        balanced: "86%",
        wide: "98%"
      }[width] || "86%";
      const alpha = Math.max(0.2, Math.min(1, opacity / 100));
      let bg = `rgba(11, 13, 16, ${alpha.toFixed(2)})`;
      let border = "1px solid rgba(255, 255, 255, 0.14)";
      let radius = "7px";
      let shadow = "none";
      let resolvedText = colorHex;
      if (style === "contrast") {
        bg = `rgba(5, 6, 8, ${Math.max(0.75, alpha).toFixed(2)})`;
        border = "1.5px solid #3b82f6";
      } else if (style === "minimal") {
        bg = "transparent";
        border = "1px solid transparent";
        shadow = "0 1px 3px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.85)";
        if (color === "ink") resolvedText = "#fdfdfe";
      } else if (style === "cinema") {
        radius = "999px";
      } else if (style === "paper") {
        bg = `rgba(253, 253, 254, ${Math.max(0.82, alpha).toFixed(2)})`;
        border = "1px solid rgba(17, 19, 21, 0.2)";
        if (color === "white") resolvedText = "#111315";
      } else if (style === "amber") {
        bg = `rgba(28, 22, 12, ${Math.max(0.78, alpha).toFixed(2)})`;
        border = "1px solid rgba(251, 191, 36, 0.35)";
        if (color === "white") resolvedText = "#fde68a";
      }
      optPreviewBox.style.fontSize = sizePx;
      optPreviewBox.style.fontFamily = fontCss;
      optPreviewBox.style.maxWidth = maxWidthCss;
      optPreviewBox.style.background = bg;
      optPreviewBox.style.border = border;
      optPreviewBox.style.borderRadius = radius;
      optPreviewBox.style.textShadow = shadow;
      optPreviewBox.style.color = resolvedText;
      optPreviewBox.style.letterSpacing = font === "dyslexic" ? "0.045em" : "0.005em";
      optPreviewBox.style.wordSpacing = font === "dyslexic" ? "0.12em" : "normal";
      while (optPreviewBox.firstChild) {
        optPreviewBox.removeChild(optPreviewBox.firstChild);
      }
      const prefix = showSpk ? "[Host] " : "";
      if (!karaoke) {
        optPreviewBox.textContent = `${prefix}Logical qubits suppress phase errors across physical stabilizer arrays.`;
      } else {
        const done = document.createElement("span");
        done.textContent = `${prefix}Logical qubits suppress `;
        const activeWord = document.createElement("span");
        activeWord.style.background = style === "paper" ? "rgba(0, 85, 212, 0.16)" : "rgba(29, 92, 246, 0.48)";
        activeWord.style.color = style === "paper" ? "#0055d4" : "#ffffff";
        activeWord.style.padding = "1px 5px";
        activeWord.style.borderRadius = "4px";
        activeWord.style.fontWeight = "600";
        activeWord.textContent = "phase errors";
        const upcoming = document.createElement("span");
        upcoming.style.opacity = "0.64";
        upcoming.textContent = " across physical stabilizer arrays.";
        optPreviewBox.append(done, activeWord, upcoming);
      }
    }
    function populateForm() {
      optEnabled.checked = settings.enabled;
      if (optDebugMode) optDebugMode.checked = Boolean(settings.debugMode);
      optAutoGenerate.checked = settings.autoOnGenerate;
      optAutoExisting.checked = settings.autoOnExistingVideos;
      if (optAutoAudio) optAutoAudio.checked = settings.autoOnAudioOverviews !== false;
      optShowToast.checked = settings.showToast;
      if (optAutoUpdate) optAutoUpdate.checked = Boolean(settings.autoUpdateExtension);
      if (optAutoBgSync) optAutoBgSync.checked = Boolean(settings.autoBackgroundSync);
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
      if (optCaptionFont) optCaptionFont.value = settings.captionFontFamily || "sans";
      if (optCaptionColor) optCaptionColor.value = settings.captionColor || "white";
      if (optCaptionPosition) optCaptionPosition.value = settings.captionPosition || "bottom";
      if (optCaptionWidth) optCaptionWidth.value = settings.captionMaxWidth || "balanced";
      if (optCaptionOpacity) optCaptionOpacity.value = String(settings.captionBgOpacity ?? 88);
      if (optKaraokeDelay) optKaraokeDelay.value = String(settings.karaokeDelayMs ?? 0);
      if (optPlaybackSpeed) optPlaybackSpeed.value = String(settings.defaultPlaybackSpeed || 1);
      if (optPlayBarDock) optPlayBarDock.value = settings.playBarDockMode || "native";
      if (optFineGrained) optFineGrained.checked = Boolean(settings.fineGrainedControls);
      if (advancedControlsBody) {
        advancedControlsBody.style.display = settings.fineGrainedControls ? "block" : "none";
      }
      if (optCaptionScale) optCaptionScale.value = String(settings.captionScaleFactor ?? 100);
      if (optCaptionScaleLabel) {
        optCaptionScaleLabel.textContent = `${settings.captionScaleFactor ?? 100}%`;
      }
      if (optDynamicScaling) {
        optDynamicScaling.checked = settings.dynamicCaptionScaling !== false;
      }
      if (optCaptionMin) optCaptionMin.value = String(settings.captionMinFontPx ?? 11);
      if (optCaptionMax) optCaptionMax.value = String(settings.captionMaxFontPx ?? 40);
      if (optCaptionPadY) optCaptionPadY.value = String(settings.captionPaddingY ?? 7);
      if (optCaptionPadX) optCaptionPadX.value = String(settings.captionPaddingX ?? 15);
      if (optCaptionRadius) {
        optCaptionRadius.value = String(settings.captionBorderRadius ?? 7);
      }
      if (optCaptionLeading) {
        optCaptionLeading.value = String(settings.captionLineHeight ?? 142);
      }
      if (optCaptionLeadingLabel) {
        optCaptionLeadingLabel.textContent = `${settings.captionLineHeight ?? 142}%`;
      }
      if (optCaptionBottom) {
        optCaptionBottom.value = String(settings.captionBottomOffsetPx ?? 54);
      }
      if (optCaptionStroke) {
        optCaptionStroke.value = String(settings.captionTextStrokePx ?? 0);
      }
      if (optKaraokeAlpha) {
        optKaraokeAlpha.value = String(settings.karaokeHighlightOpacity ?? 48);
      }
      if (optKaraokeAlphaLabel) {
        optKaraokeAlphaLabel.textContent = `${settings.karaokeHighlightOpacity ?? 48}%`;
      }
      if (optUpcomingAlpha) {
        optUpcomingAlpha.value = String(settings.upcomingWordOpacity ?? 64);
      }
      if (optUpcomingAlphaLabel) {
        optUpcomingAlphaLabel.textContent = `${settings.upcomingWordOpacity ?? 64}%`;
      }
      if (optSkipGap) optSkipGap.value = String(settings.skipSilenceGapSec ?? 1.6);
      if (optSkipGapLabel) optSkipGapLabel.textContent = `${settings.skipSilenceGapSec ?? 1.6}s`;
      if (optSkipRate) optSkipRate.value = String(settings.skipSilenceRate ?? 2.2);
      if (optSkipRateLabel) {
        optSkipRateLabel.textContent = `${settings.skipSilenceRate ?? 2.2}x`;
      }
      if (optAudioBoost) optAudioBoost.value = String(settings.audioBoostPercent ?? 100);
      if (optAudioBoostLabel) {
        optAudioBoostLabel.textContent = `${settings.audioBoostPercent ?? 100}%`;
      }
      if (optHoverFade) optHoverFade.value = String(settings.hoverFadeDelayMs ?? 2200);
      if (optHoverFadeLabel) {
        optHoverFadeLabel.textContent = `${settings.hoverFadeDelayMs ?? 2200} ms`;
      }
      if (optKeepPip) optKeepPip.checked = settings.keepSubtitlesInPiP !== false;
      if (optSkipSilence) optSkipSilence.checked = Boolean(settings.skipSilenceEnabled);
      if (optSoundPreset) {
        optSoundPreset.textContent = "";
        for (const preset of SOUND_PRESETS) {
          const option = document.createElement("option");
          option.value = preset.id;
          option.textContent = preset.label;
          optSoundPreset.appendChild(option);
        }
        optSoundPreset.value = settings.notificationSoundPreset || "chime";
      }
      if (optSoundVolume) {
        optSoundVolume.value = String(settings.notificationSoundVolume ?? 75);
      }
      if (optSoundVolumeLabel) {
        optSoundVolumeLabel.textContent = `${settings.notificationSoundVolume ?? 75}%`;
      }
      if (optSoundBadge) {
        const spec = SOUND_PRESETS.find(
          (p) => p.id === (settings.notificationSoundPreset || "chime")
        );
        optSoundBadge.textContent = spec ? spec.label.split(" (")[0] : "Chime";
      }
      if (optKaraokeHighlight) optKaraokeHighlight.checked = Boolean(settings.karaokeHighlight);
      if (optShowSpeakers) optShowSpeakers.checked = settings.showSpeakerLabels !== false;
      if (optHoverPause) optHoverPause.checked = Boolean(settings.pauseOnCaptionHover);
      if (optClickCopy) optClickCopy.checked = settings.clickCaptionToCopy !== false;
      optOffsetSec.value = String(settings.subtitleOffsetSec || 0);
      optExcludePatterns.value = (settings.excludePatterns || []).join("\n");
      rpcCreateInput.value = settings.rpcOverrides?.CREATE_STUDIO || "";
      rpcPollInput.value = settings.rpcOverrides?.POLL_STUDIO || "";
      renderCaptionPreview();
    }
    async function renderUpdatePanel() {
      if (!optUpdateCard) return;
      const dirHandle = await loadLinkedExtensionDirHandle();
      const dirInfo = await inspectLinkedDirPermission(dirHandle);
      const curVer = chrome.runtime?.getManifest?.()?.version || updateStatus?.currentVersion || "0.2.8";
      const avail = Boolean(updateStatus?.updateAvailable);
      optUpdateCard.dataset.available = avail ? "true" : "false";
      if (optUpdateBadge) {
        optUpdateBadge.textContent = avail ? `Update v${updateStatus.latestVersion}` : `v${curVer} current`;
        optUpdateBadge.className = avail ? "badge badge-saved" : "badge";
      }
      if (optLinkFolderBtn) {
        optLinkFolderBtn.textContent = dirInfo.linked ? `Linked folder: ${dirInfo.folderName}` : "Link unpacked folder";
      }
      if (optApplyUpdateBtn) {
        optApplyUpdateBtn.style.display = avail ? "inline-flex" : "none";
        optApplyUpdateBtn.textContent = dirInfo.linked ? "Update and reload" : "Link folder and update";
      }
      if (optUpdateSummary) {
        if (avail) {
          optUpdateSummary.textContent = dirInfo.linked ? `LM Subs v${updateStatus.latestVersion} is ready to write into ${dirInfo.folderName} and reload.` : `LM Subs v${updateStatus.latestVersion} is available. Link your unzipped lm-subs folder to update in place.`;
        } else {
          optUpdateSummary.textContent = dirInfo.linked ? `Installed v${curVer}. Linked to ${dirInfo.folderName} for automatic in-place updates.` : `Installed v${curVer}. Link your unzipped lm-subs folder once so updates write directly without manual zip extraction.`;
        }
      }
      renderReleaseNotes(optUpdateNotes, updateStatus.latestNotes, {
        version: avail ? updateStatus.latestVersion : curVer
      });
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
        const logo = document.createElement("img");
        logo.src = "icons/icon32.png";
        logo.alt = "";
        logo.width = 22;
        logo.height = 22;
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
        time.textContent = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
        head.append(title, time);
        content.appendChild(head);
        if (item.body) {
          const body = document.createElement("div");
          body.className = "notif-row-body";
          body.textContent = item.body;
          content.appendChild(body);
        }
        row.append(logo, content);
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
          const guide = document.createElement("details");
          guide.className = "key-guide";
          guide.open = !isSaved;
          const guideSummary = document.createElement("summary");
          guideSummary.className = "key-guide-summary";
          guideSummary.textContent = `How to get a ${spec.name} key, step by step`;
          const guideBody = document.createElement("div");
          guideBody.className = "key-guide-body";
          const reqLine = document.createElement("p");
          reqLine.className = "key-guide-req";
          reqLine.textContent = spec.accountRequirements || "";
          guideBody.appendChild(reqLine);
          const steps = document.createElement("ol");
          steps.className = "key-guide-steps";
          for (const stepText of spec.setupSteps || []) {
            const li = document.createElement("li");
            li.textContent = stepText;
            steps.appendChild(li);
          }
          guideBody.appendChild(steps);
          const formatLine = document.createElement("p");
          formatLine.className = "key-guide-format";
          formatLine.textContent = `Key format: ${spec.keyFormatHint || "provider secret"}`;
          guideBody.appendChild(formatLine);
          const openLink = document.createElement("a");
          openLink.className = "link";
          openLink.href = spec.keyUrl;
          openLink.target = "_blank";
          openLink.rel = "noopener noreferrer";
          openLink.textContent = `Open the ${spec.name} key page in a new tab`;
          guideBody.appendChild(openLink);
          guide.append(guideSummary, guideBody);
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
        const csvBtn = makeFormatButton(item, ".CSV", "csv");
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
        actRow.append(editBtn, srtBtn, vttBtn, txtBtn, mdBtn, csvBtn, jsonBtn, copyBtn, delBtn);
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
    renderUpdatePanel();
    renderCacheTable();
    renderStatisticsPanel();
    sendRuntime({
      type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK,
      includeUpdateCheck: true
    }).catch(() => {
    });
    cacheSearchInput?.addEventListener("input", () => {
      cacheFilterQuery = cacheSearchInput.value || "";
      renderCacheTable();
    });
    async function saveNotificationToggles() {
      settings = await saveSettings({
        autoUpdateExtension: optAutoUpdate ? Boolean(optAutoUpdate.checked) : settings.autoUpdateExtension,
        autoBackgroundSync: optAutoBgSync ? Boolean(optAutoBgSync.checked) : settings.autoBackgroundSync,
        desktopNotifications: Boolean(optDesktopNotifications?.checked),
        badgeAlerts: Boolean(optBadgeAlerts?.checked),
        soundAlerts: Boolean(optSoundAlerts?.checked),
        notifyOnFailover: Boolean(optNotifyFailover?.checked),
        notifyOnSync: Boolean(optNotifySync?.checked)
      });
      flashSavedPill();
      await sendRuntime({ type: RUNTIME_MESSAGE.GET_NOTIFICATIONS });
    }
    optAutoUpdate?.addEventListener("change", saveNotificationToggles);
    optAutoBgSync?.addEventListener("change", saveNotificationToggles);
    optDesktopNotifications?.addEventListener("change", saveNotificationToggles);
    optBadgeAlerts?.addEventListener("change", saveNotificationToggles);
    optSoundAlerts?.addEventListener("change", async () => {
      await saveNotificationToggles();
      if (optSoundAlerts.checked) {
        unlockChimeAudio(window);
        await playCompletionChimeSound({ win: window, force: true });
      }
    });
    optNotifyFailover?.addEventListener("change", saveNotificationToggles);
    optNotifySync?.addEventListener("change", saveNotificationToggles);
    optCheckUpdatesBtn?.addEventListener("click", async () => {
      optCheckUpdatesBtn.disabled = true;
      optCheckUpdatesBtn.textContent = "Checking\u2026";
      const res = await sendRuntime({ type: RUNTIME_MESSAGE.CHECK_FOR_UPDATES });
      optCheckUpdatesBtn.disabled = false;
      optCheckUpdatesBtn.textContent = "Check for updates";
      updateStatus = res?.status || await getUpdateStatus();
      notifications = await getNotifications();
      renderNotificationsPanel();
      await renderUpdatePanel();
      if (optUpdateFeedback) {
        optUpdateFeedback.dataset.kind = res?.ok ? "ok" : "err";
        optUpdateFeedback.textContent = res?.ok ? res.autoApplied ? "Updated automatically and reloading\u2026" : res.updateAvailable ? `New version v${updateStatus.latestVersion} is ready.` : "You are running the latest build." : res?.error || "Could not check for updates.";
      }
    });
    async function pickAndSaveExtensionFolder() {
      if (typeof window.showDirectoryPicker !== "function") {
        throw new Error("Folder linking requires Chrome, Brave, Edge, or Arc.");
      }
      const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      await dirHandle.requestPermission?.({ mode: "readwrite" });
      await saveLinkedExtensionDirHandle(dirHandle);
      updateStatus = await saveUpdateStatus({
        linkedFolderName: dirHandle.name || "lm-subs"
      });
      await renderUpdatePanel();
      return dirHandle;
    }
    optLinkFolderBtn?.addEventListener("click", async () => {
      try {
        const dirHandle = await pickAndSaveExtensionFolder();
        if (optUpdateFeedback) {
          optUpdateFeedback.dataset.kind = "ok";
          optUpdateFeedback.textContent = `Linked ${dirHandle.name || "lm-subs"} for automatic updates.`;
        }
      } catch (err) {
        if (optUpdateFeedback && err?.name !== "AbortError") {
          optUpdateFeedback.dataset.kind = "err";
          optUpdateFeedback.textContent = err?.message || "Folder linking canceled.";
        }
      }
    });
    optApplyUpdateBtn?.addEventListener("click", async () => {
      optApplyUpdateBtn.disabled = true;
      try {
        let dirHandle = await loadLinkedExtensionDirHandle();
        if (!dirHandle) {
          dirHandle = await pickAndSaveExtensionFolder();
        } else {
          await dirHandle.requestPermission?.({ mode: "readwrite" });
        }
        optApplyUpdateBtn.textContent = "Updating\u2026";
        const res = await sendRuntime({
          type: RUNTIME_MESSAGE.APPLY_UNPACKED_UPDATE
        });
        if (!res?.ok && optUpdateFeedback) {
          optUpdateFeedback.dataset.kind = "err";
          optUpdateFeedback.textContent = res?.error || "Could not write update files.";
        }
      } catch (err) {
        if (optUpdateFeedback && err?.name !== "AbortError") {
          optUpdateFeedback.dataset.kind = "err";
          optUpdateFeedback.textContent = err?.message || "Update canceled.";
        }
      } finally {
        optApplyUpdateBtn.disabled = false;
        updateStatus = await getUpdateStatus();
        await renderUpdatePanel();
      }
    });
    optTestNotifBtn?.addEventListener("click", async () => {
      if (optDesktopNotifications) optDesktopNotifications.checked = true;
      settings = await saveSettings({ desktopNotifications: true });
      if (optSoundAlerts?.checked) {
        unlockChimeAudio(window);
        playCompletionChimeSound({ win: window, force: true }).catch(() => {
        });
      }
      await sendRuntime({ type: RUNTIME_MESSAGE.TEST_DESKTOP_NOTIFICATION });
      notifications = await getNotifications();
      renderNotificationsPanel();
    });
    optTestChimeBtn?.addEventListener("click", async () => {
      unlockChimeAudio(window);
      optTestChimeBtn.textContent = "Playing\u2026";
      await playCompletionChimeSound({
        win: window,
        preset: settings.notificationSoundPreset || "chime",
        volume: Number(settings.notificationSoundVolume) || 75,
        force: true
      });
      setTimeout(() => {
        optTestChimeBtn.textContent = "Preview chime";
      }, 650);
    });
    try {
      chrome.runtime?.onMessage?.addListener((msg) => {
        if (msg?.type === RUNTIME_MESSAGE.SUBTITLES_READY && settings.soundAlerts) {
          playCompletionChimeSound({ win: window }).catch(() => {
          });
        }
        return false;
      });
    } catch {
    }
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
    function collectCaptionBehaviorPatch() {
      const patterns = optExcludePatterns.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      return {
        autoOnGenerate: optAutoGenerate.checked,
        autoOnExistingVideos: optAutoExisting.checked,
        autoOnAudioOverviews: optAutoAudio ? Boolean(optAutoAudio.checked) : settings.autoOnAudioOverviews !== false,
        showToast: optShowToast.checked,
        languageHint: optLanguageHint.value,
        translateTo: optTranslateTo.value,
        fontSize: optFontSize.value,
        captionStyle: optCaptionStyle ? optCaptionStyle.value : settings.captionStyle,
        captionFontFamily: optCaptionFont ? optCaptionFont.value : settings.captionFontFamily,
        captionColor: optCaptionColor ? optCaptionColor.value : settings.captionColor,
        captionPosition: optCaptionPosition ? optCaptionPosition.value : settings.captionPosition,
        captionMaxWidth: optCaptionWidth ? optCaptionWidth.value : settings.captionMaxWidth,
        captionBgOpacity: optCaptionOpacity ? Number(optCaptionOpacity.value) : settings.captionBgOpacity,
        karaokeDelayMs: optKaraokeDelay ? Number(optKaraokeDelay.value) : settings.karaokeDelayMs,
        defaultPlaybackSpeed: optPlaybackSpeed ? Number(optPlaybackSpeed.value) : settings.defaultPlaybackSpeed,
        karaokeHighlight: optKaraokeHighlight ? Boolean(optKaraokeHighlight.checked) : settings.karaokeHighlight,
        showSpeakerLabels: optShowSpeakers ? Boolean(optShowSpeakers.checked) : settings.showSpeakerLabels,
        pauseOnCaptionHover: optHoverPause ? Boolean(optHoverPause.checked) : settings.pauseOnCaptionHover,
        clickCaptionToCopy: optClickCopy ? Boolean(optClickCopy.checked) : settings.clickCaptionToCopy,
        subtitleOffsetSec: Number(optOffsetSec.value) || 0,
        playBarDockMode: optPlayBarDock ? optPlayBarDock.value : settings.playBarDockMode,
        excludePatterns: patterns
      };
    }
    function collectAdvancedPatch() {
      return {
        fineGrainedControls: optFineGrained ? Boolean(optFineGrained.checked) : settings.fineGrainedControls,
        dynamicCaptionScaling: optDynamicScaling ? Boolean(optDynamicScaling.checked) : settings.dynamicCaptionScaling,
        captionScaleFactor: optCaptionScale ? Number(optCaptionScale.value) : settings.captionScaleFactor,
        captionMinFontPx: optCaptionMin ? Number(optCaptionMin.value) : settings.captionMinFontPx,
        captionMaxFontPx: optCaptionMax ? Number(optCaptionMax.value) : settings.captionMaxFontPx,
        captionPaddingY: optCaptionPadY ? Number(optCaptionPadY.value) : settings.captionPaddingY,
        captionPaddingX: optCaptionPadX ? Number(optCaptionPadX.value) : settings.captionPaddingX,
        captionBorderRadius: optCaptionRadius ? Number(optCaptionRadius.value) : settings.captionBorderRadius,
        captionLineHeight: optCaptionLeading ? Number(optCaptionLeading.value) : settings.captionLineHeight,
        captionBottomOffsetPx: optCaptionBottom ? Number(optCaptionBottom.value) : settings.captionBottomOffsetPx,
        captionTextStrokePx: optCaptionStroke ? Number(optCaptionStroke.value) : settings.captionTextStrokePx,
        karaokeHighlightOpacity: optKaraokeAlpha ? Number(optKaraokeAlpha.value) : settings.karaokeHighlightOpacity,
        upcomingWordOpacity: optUpcomingAlpha ? Number(optUpcomingAlpha.value) : settings.upcomingWordOpacity,
        skipSilenceEnabled: optSkipSilence ? Boolean(optSkipSilence.checked) : settings.skipSilenceEnabled,
        skipSilenceGapSec: optSkipGap ? Number(optSkipGap.value) : settings.skipSilenceGapSec,
        skipSilenceRate: optSkipRate ? Number(optSkipRate.value) : settings.skipSilenceRate,
        audioBoostPercent: optAudioBoost ? Number(optAudioBoost.value) : settings.audioBoostPercent,
        hoverFadeDelayMs: optHoverFade ? Number(optHoverFade.value) : settings.hoverFadeDelayMs,
        keepSubtitlesInPiP: optKeepPip ? Boolean(optKeepPip.checked) : settings.keepSubtitlesInPiP
      };
    }
    for (const liveCtrl of [
      optAutoGenerate,
      optAutoExisting,
      optAutoAudio,
      optShowToast,
      optFontSize,
      optCaptionStyle,
      optCaptionFont,
      optCaptionColor,
      optCaptionPosition,
      optCaptionWidth,
      optCaptionOpacity,
      optKaraokeDelay,
      optPlaybackSpeed,
      optKaraokeHighlight,
      optShowSpeakers,
      optHoverPause,
      optClickCopy
    ]) {
      liveCtrl?.addEventListener("input", renderCaptionPreview);
      liveCtrl?.addEventListener("change", async () => {
        renderCaptionPreview();
        settings = await saveSettings(collectCaptionBehaviorPatch());
        flashSavedPill();
      });
    }
    resetCaptionStyleBtn?.addEventListener("click", async () => {
      settings = await saveSettings({
        fontSize: "medium",
        captionStyle: "classic",
        captionFontFamily: "sans",
        captionColor: "white",
        captionPosition: "bottom",
        captionMaxWidth: "balanced",
        captionBgOpacity: 88,
        defaultPlaybackSpeed: 1,
        karaokeHighlight: true,
        karaokeDelayMs: 0,
        showSpeakerLabels: true,
        pauseOnCaptionHover: false,
        clickCaptionToCopy: true,
        subtitleOffsetSec: 0
      });
      populateForm();
      flashSavedPill();
      await triggerAutoSyncIfConnected({ pushOnly: true });
    });
    saveBehaviorBtn.addEventListener("click", async () => {
      settings = await saveSettings(collectCaptionBehaviorPatch());
      flashSavedPill();
      await triggerAutoSyncIfConnected({ pushOnly: true });
    });
    optFineGrained?.addEventListener("change", async () => {
      settings = await saveSettings({
        fineGrainedControls: Boolean(optFineGrained.checked)
      });
      if (advancedControlsBody) {
        advancedControlsBody.style.display = optFineGrained.checked ? "block" : "none";
      }
      flashSavedPill();
      await triggerAutoSyncIfConnected({ pushOnly: true });
    });
    const bindRangeLabel = (input, labelEl, format) => {
      if (!input || !labelEl) return;
      input.addEventListener("input", () => {
        labelEl.textContent = format(Number(input.value));
      });
    };
    bindRangeLabel(optCaptionScale, optCaptionScaleLabel, (v) => `${v}%`);
    bindRangeLabel(optCaptionLeading, optCaptionLeadingLabel, (v) => `${v}%`);
    bindRangeLabel(optKaraokeAlpha, optKaraokeAlphaLabel, (v) => `${v}%`);
    bindRangeLabel(optUpcomingAlpha, optUpcomingAlphaLabel, (v) => `${v}%`);
    bindRangeLabel(optSkipGap, optSkipGapLabel, (v) => `${v.toFixed(1)}s`);
    bindRangeLabel(optSkipRate, optSkipRateLabel, (v) => `${v.toFixed(1)}x`);
    bindRangeLabel(optAudioBoost, optAudioBoostLabel, (v) => `${v}%`);
    bindRangeLabel(optHoverFade, optHoverFadeLabel, (v) => `${v} ms`);
    bindRangeLabel(optSoundVolume, optSoundVolumeLabel, (v) => `${v}%`);
    saveAdvancedBtn?.addEventListener("click", async () => {
      settings = await saveSettings(collectAdvancedPatch());
      flashSavedPill();
      await triggerAutoSyncIfConnected({ pushOnly: true });
    });
    resetAdvancedBtn?.addEventListener("click", async () => {
      settings = await saveSettings({
        fineGrainedControls: false,
        dynamicCaptionScaling: true,
        captionScaleFactor: 100,
        captionMinFontPx: 11,
        captionMaxFontPx: 40,
        captionPaddingY: 7,
        captionPaddingX: 15,
        captionBorderRadius: 7,
        captionLineHeight: 142,
        captionBottomOffsetPx: 54,
        captionTextStrokePx: 0,
        karaokeHighlightOpacity: 48,
        upcomingWordOpacity: 64,
        playBarDockMode: "native",
        hoverFadeDelayMs: 2200,
        keepSubtitlesInPiP: true,
        skipSilenceEnabled: false,
        skipSilenceGapSec: 1.6,
        skipSilenceRate: 2.2,
        audioBoostPercent: 100
      });
      populateForm();
      flashSavedPill();
    });
    async function saveSoundPreset() {
      settings = await saveSettings({
        notificationSoundPreset: optSoundPreset?.value || "chime",
        notificationSoundVolume: optSoundVolume ? Number(optSoundVolume.value) : 75
      });
      if (optSoundBadge) {
        const spec = SOUND_PRESETS.find(
          (p) => p.id === (settings.notificationSoundPreset || "chime")
        );
        optSoundBadge.textContent = spec ? spec.label.split(" (")[0] : "Chime";
      }
      flashSavedPill();
      await triggerAutoSyncIfConnected({ pushOnly: true });
    }
    optSoundPreset?.addEventListener("change", async () => {
      unlockChimeAudio(globalThis);
      await saveSoundPreset();
      await playCompletionChimeSound({
        preset: optSoundPreset.value,
        volume: optSoundVolume ? Number(optSoundVolume.value) : 75,
        force: true
      });
    });
    optSoundVolume?.addEventListener("change", async () => {
      unlockChimeAudio(globalThis);
      await saveSoundPreset();
      await playCompletionChimeSound({
        preset: optSoundPreset?.value || "chime",
        volume: Number(optSoundVolume.value),
        force: true
      });
    });
    optPreviewSoundBtn?.addEventListener("click", async () => {
      unlockChimeAudio(globalThis);
      const preset = optSoundPreset?.value || "chime";
      if (optSoundFeedback) {
        optSoundFeedback.dataset.kind = "";
        optSoundFeedback.textContent = preset === "none" ? "Sound is set to silent." : "Playing\u2026";
      }
      const played = await playCompletionChimeSound({
        preset,
        volume: optSoundVolume ? Number(optSoundVolume.value) : 75,
        force: true
      });
      if (optSoundFeedback) {
        optSoundFeedback.dataset.kind = played ? "ok" : "err";
        optSoundFeedback.textContent = played ? `Played ${SOUND_PRESETS.find((p) => p.id === preset)?.label || preset}.` : "Browser blocked playback. Click anywhere on the page and try again.";
      }
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
        if (changes.updateStatus) {
          updateStatus = await getUpdateStatus();
          await renderUpdatePanel();
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

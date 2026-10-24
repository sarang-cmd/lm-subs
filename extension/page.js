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

  // src/lib/batchexecute.js
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var FIFE_NOTEBOOKLM_TOKEN_RE = /\/notebooklm\/([A-Za-z0-9_-]{16,})/;
  function isBatchExecuteUrl(url) {
    if (typeof url !== "string" || !url) return false;
    return BATCHEXECUTE.PATH_SUBSTRINGS.some((sub) => url.includes(sub));
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
  function deriveGoogleMediaVariants(mediaUrl) {
    if (typeof mediaUrl !== "string" || !mediaUrl) return [];
    const out = [];
    const pushUnique = (u) => {
      if (u && !out.includes(u)) out.push(u);
    };
    if (isTrustedGoogleMediaUrl(mediaUrl) && FIFE_NOTEBOOKLM_TOKEN_RE.test(mediaUrl)) {
      const base = mediaUrl.replace(/=(?:m\d+(?:-dv)?|mm,[a-z]+)$/i, "");
      if (base !== mediaUrl) {
        pushUnique(`${base}=m140-dv`);
        pushUnique(`${base}=m18`);
        pushUnique(`${base}=m22-dv`);
      }
    }
    pushUnique(mediaUrl);
    return out;
  }
  function normalizeStatusCode(code) {
    switch (code) {
      case BATCHEXECUTE.ARTIFACT_STATUS.INITIALIZED:
        return "initializing";
      case BATCHEXECUTE.ARTIFACT_STATUS.PROCESSING:
        return "processing";
      case BATCHEXECUTE.ARTIFACT_STATUS.READY:
        return "ready";
      case BATCHEXECUTE.ARTIFACT_STATUS.FAILED:
        return "failed";
      default:
        return "unknown";
    }
  }
  function extractFreqParam(body) {
    if (!body) return null;
    if (typeof body === "string") {
      if (body.includes("f.req=")) {
        try {
          const params = new URLSearchParams(body);
          return params.get("f.req");
        } catch {
          return null;
        }
      }
      const trimmed = body.trim();
      if (trimmed.startsWith("[")) return trimmed;
      return null;
    }
    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
      return body.get("f.req");
    }
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      const val = body.get("f.req");
      return typeof val === "string" ? val : null;
    }
    return null;
  }
  function parseBatchExecuteRequest(body, rpcOverrides = {}) {
    const createRpcId = rpcOverrides?.CREATE_STUDIO || BATCHEXECUTE.RPC_IDS.CREATE_STUDIO;
    const freqRaw = extractFreqParam(body);
    if (!freqRaw) return null;
    let outer;
    try {
      outer = JSON.parse(freqRaw);
    } catch {
      return null;
    }
    if (!Array.isArray(outer)) return null;
    const calls = Array.isArray(outer[0]) && Array.isArray(outer[0][0]) ? outer[0] : outer;
    for (const call of calls) {
      if (!Array.isArray(call) || call.length < 2) continue;
      const rpcId = call[0];
      const paramsJson = call[1];
      if (typeof rpcId !== "string" || typeof paramsJson !== "string") continue;
      let params;
      try {
        params = JSON.parse(paramsJson);
      } catch {
        continue;
      }
      if (!Array.isArray(params) || params.length < 3) continue;
      const notebookId = typeof params[1] === "string" ? params[1] : null;
      const content = params[2];
      const isCreateIdMatch = rpcId === createRpcId;
      const isStructuralVideoCreate = Array.isArray(content) && content[2] === BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW && Array.isArray(content[3]);
      if ((isCreateIdMatch || isStructuralVideoCreate) && Array.isArray(content) && content[2] === BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW) {
        const videoOpts = content[BATCHEXECUTE.ROW_POS.VIDEO_METADATA];
        const innerOpts = Array.isArray(videoOpts) ? videoOpts[2] : null;
        const language = Array.isArray(innerOpts) && typeof innerOpts[1] === "string" ? innerOpts[1] : null;
        const focusPrompt = Array.isArray(innerOpts) && typeof innerOpts[2] === "string" ? innerOpts[2] : null;
        return {
          isVideoCreate: true,
          rpcId,
          notebookId,
          language,
          focusPrompt
        };
      }
    }
    return null;
  }
  function extractVideoMetadataFromRow(row) {
    if (!Array.isArray(row)) return null;
    const typeCode = row[BATCHEXECUTE.ROW_POS.TYPE];
    if (typeCode !== BATCHEXECUTE.ARTIFACT_TYPES.VIDEO_OVERVIEW) return null;
    const artifactId = row[BATCHEXECUTE.ROW_POS.ID];
    if (typeof artifactId !== "string" || !artifactId) return null;
    const title = typeof row[BATCHEXECUTE.ROW_POS.TITLE] === "string" ? row[BATCHEXECUTE.ROW_POS.TITLE].trim() : "";
    const statusCode = typeof row[BATCHEXECUTE.ROW_POS.STATUS] === "number" ? row[BATCHEXECUTE.ROW_POS.STATUS] : 0;
    const status = normalizeStatusCode(statusCode);
    const videoBlock = row[BATCHEXECUTE.ROW_POS.VIDEO_METADATA];
    let mediaUrl = null;
    let progressiveUrl = null;
    let language = null;
    let durationSeconds = null;
    if (Array.isArray(videoBlock)) {
      const progCandidate = videoBlock[BATCHEXECUTE.VIDEO_META_POS.PROGRESSIVE_URL];
      if (typeof progCandidate === "string" && isTrustedGoogleMediaUrl(progCandidate)) {
        progressiveUrl = progCandidate;
      }
      const genOpts = videoBlock[BATCHEXECUTE.VIDEO_META_POS.GENERATION_OPTIONS];
      if (Array.isArray(genOpts) && typeof genOpts[1] === "string" && genOpts[1]) {
        language = genOpts[1];
      }
      const dlCandidate = videoBlock[BATCHEXECUTE.VIDEO_META_POS.DOWNLOAD_URL];
      if (typeof dlCandidate === "string" && isTrustedGoogleMediaUrl(dlCandidate)) {
        mediaUrl = dlCandidate;
      }
      const mediaList = videoBlock[BATCHEXECUTE.VIDEO_META_POS.MEDIA_LIST];
      if (Array.isArray(mediaList)) {
        let fallbackMp4 = null;
        for (const entry of mediaList) {
          if (!Array.isArray(entry) || typeof entry[0] !== "string") continue;
          const url = entry[0];
          const kind = entry[1];
          const mime = entry[2];
          if (!isTrustedGoogleMediaUrl(url)) continue;
          if (mime === "video/mp4" && kind === BATCHEXECUTE.MEDIA_KIND.DOWNLOAD) {
            mediaUrl = url;
            break;
          }
          if (mime === "video/mp4" && !fallbackMp4) {
            fallbackMp4 = url;
          }
        }
        if (!mediaUrl && fallbackMp4) {
          mediaUrl = fallbackMp4;
        }
      }
      if (!mediaUrl && progressiveUrl) {
        mediaUrl = progressiveUrl;
      }
      const durTuple = videoBlock[BATCHEXECUTE.VIDEO_META_POS.DURATION];
      if (Array.isArray(durTuple) && typeof durTuple[0] === "number") {
        const secs = durTuple[0];
        const nanos = typeof durTuple[1] === "number" ? durTuple[1] : 0;
        durationSeconds = Math.round((secs + nanos / 1e9) * 100) / 100;
      }
    }
    const looksLikeArtifactRow = UUID_RE.test(artifactId) || Boolean(mediaUrl) || Array.isArray(row[BATCHEXECUTE.ROW_POS.SOURCES]);
    if (!looksLikeArtifactRow) return null;
    return {
      artifactId,
      title,
      typeCode,
      statusCode,
      status,
      language,
      mediaUrl,
      progressiveUrl: progressiveUrl || mediaUrl,
      mediaVariants: mediaUrl ? deriveGoogleMediaVariants(mediaUrl) : [],
      mediaToken: extractMediaToken(mediaUrl || progressiveUrl || ""),
      durationSeconds
    };
  }
  function collectVideoRowsFromPayload(node, out, seenIds, depth = 0) {
    if (!Array.isArray(node) || depth > 5) return;
    const maybeVideo = extractVideoMetadataFromRow(node);
    if (maybeVideo) {
      if (!seenIds.has(maybeVideo.artifactId)) {
        seenIds.add(maybeVideo.artifactId);
        out.push(maybeVideo);
      }
      return;
    }
    for (const child of node) {
      if (Array.isArray(child)) {
        collectVideoRowsFromPayload(child, out, seenIds, depth + 1);
      }
    }
  }
  function parseBatchExecuteResponse(responseText, rpcOverrides = {}) {
    if (typeof responseText !== "string" || !responseText) {
      return [];
    }
    const createRpcId = rpcOverrides?.CREATE_STUDIO || BATCHEXECUTE.RPC_IDS.CREATE_STUDIO;
    const pollRpcId = rpcOverrides?.POLL_STUDIO || BATCHEXECUTE.RPC_IDS.POLL_STUDIO;
    let body = responseText.trimStart();
    if (body.startsWith(BATCHEXECUTE.XSSI_PREFIX)) {
      body = body.slice(BATCHEXECUTE.XSSI_PREFIX.length).trimStart();
    }
    const results = [];
    const seenIds = /* @__PURE__ */ new Set();
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith("[")) continue;
      let frames;
      try {
        frames = JSON.parse(line);
      } catch {
        continue;
      }
      if (!Array.isArray(frames)) continue;
      for (const frame of frames) {
        if (!Array.isArray(frame) || frame[0] !== BATCHEXECUTE.ENVELOPE_TAG || typeof frame[2] !== "string") {
          continue;
        }
        const rpcId = frame[1];
        let inner;
        try {
          inner = JSON.parse(frame[2]);
        } catch {
          continue;
        }
        const beforeCount = results.length;
        collectVideoRowsFromPayload(inner, results, seenIds, 0);
        for (let i = beforeCount; i < results.length; i++) {
          results[i].rpcId = rpcId;
          results[i].origin = rpcId === createRpcId ? "create" : rpcId === pollRpcId ? "poll" : "structural";
        }
      }
    }
    return results;
  }

  // src/page/inject.js
  var GUARD_FLAG = "__notebooklmSubtitlesMainHooked__";
  function installMainWorldObserver(win = globalThis) {
    if (!win || win[GUARD_FLAG]) return;
    win[GUARD_FLAG] = true;
    let rpcOverrides = {};
    win.addEventListener("message", (event) => {
      if (event.source !== win) return;
      const msg = event.data;
      if (msg && msg.source === PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT && msg.type === PAGE_MESSAGE.SYNC_RPC_OVERRIDES && msg.rpcOverrides && typeof msg.rpcOverrides === "object") {
        rpcOverrides = { ...msg.rpcOverrides };
      }
    });
    function emitPayload(payload) {
      try {
        const targetOrigin = win.location && win.location.origin && win.location.origin !== "null" ? win.location.origin : "*";
        win.postMessage(
          {
            source: PAGE_MESSAGE.BRIDGE_SOURCE_PAGE,
            type: PAGE_MESSAGE.BATCH_ARTIFACTS,
            payload
          },
          targetOrigin
        );
      } catch {
      }
    }
    function inspectTransaction(requestBody, responseText) {
      try {
        const reqMeta = parseBatchExecuteRequest(requestBody, rpcOverrides);
        const artifacts = responseText ? parseBatchExecuteResponse(responseText, rpcOverrides).map((art) => ({
          ...art,
          notebookId: reqMeta?.notebookId || null
        })) : [];
        const isCreateVideoRequest = Boolean(reqMeta?.isVideoCreate);
        if (isCreateVideoRequest || artifacts.length > 0) {
          emitPayload({
            isCreateVideoRequest,
            notebookId: reqMeta?.notebookId || null,
            artifacts,
            observedAt: Date.now()
          });
        }
      } catch {
      }
    }
    if (typeof win.fetch === "function") {
      const nativeFetch = win.fetch;
      win.fetch = function patchedFetch(input, init) {
        let url = "";
        let reqBody = "";
        try {
          url = typeof input === "string" ? input : input?.url || "";
          if (isBatchExecuteUrl(url) && init?.body) {
            reqBody = init.body;
          }
        } catch {
          url = "";
        }
        const promise = Reflect.apply(nativeFetch, this, arguments);
        if (isBatchExecuteUrl(url)) {
          promise.then((res) => {
            if (!res || typeof res.clone !== "function") return;
            return res.clone().text().then((text) => inspectTransaction(reqBody, text));
          }).catch(() => {
          });
        }
        return promise;
      };
    }
    const XHR = win.XMLHttpRequest;
    if (XHR && XHR.prototype) {
      const nativeOpen = XHR.prototype.open;
      const nativeSend = XHR.prototype.send;
      const metaMap = /* @__PURE__ */ new WeakMap();
      XHR.prototype.open = function patchedOpen(_method, url) {
        try {
          const urlStr = typeof url === "string" ? url : String(url || "");
          if (isBatchExecuteUrl(urlStr)) {
            metaMap.set(this, { url: urlStr, body: "" });
          }
        } catch {
        }
        return Reflect.apply(nativeOpen, this, arguments);
      };
      XHR.prototype.send = function patchedSend(body) {
        const meta = metaMap.get(this);
        if (meta) {
          meta.body = body || "";
          this.addEventListener(
            "load",
            () => {
              try {
                if ((!this.responseType || this.responseType === "text") && typeof this.responseText === "string") {
                  inspectTransaction(meta.body, this.responseText);
                }
              } catch {
              }
            },
            { once: true }
          );
        }
        return Reflect.apply(nativeSend, this, arguments);
      };
    }
  }
  if (typeof window !== "undefined") {
    installMainWorldObserver(window);
  }
})();

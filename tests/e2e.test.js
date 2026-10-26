import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRuntimeDispatcher } from "../src/background/service-worker.js";
import { PAGE_MESSAGE, RUNTIME_MESSAGE } from "../src/config/selectors.js";
import { collectVideosDeep } from "../src/content/content.js";
import { createSyntheticMp4WithVideoAndAudio } from "../src/lib/audio-extract.js";
import {
  getSavedKeyPresenceMap,
  saveSettings,
  setApiKey,
} from "../src/lib/storage.js";
import { installMainWorldObserver } from "../src/page/inject.js";

function createMemoryStorage() {
  const db = {};
  return {
    async get(keys) {
      if (typeof keys === "string") {
        return { [keys]: db[keys] };
      }
      if (Array.isArray(keys)) {
        const out = {};
        for (const k of keys) out[k] = db[k];
        return out;
      }
      return { ...db };
    },
    async set(items) {
      Object.assign(db, items);
    },
  };
}

function invokeDispatcher(dispatcher, msg, sender = { tab: { id: 7 } }) {
  return new Promise((resolve) => {
    let didRespond = false;
    let syncResponse;
    let handledAsync;
    handledAsync = dispatcher(msg, sender, (response) => {
      didRespond = true;
      syncResponse = response;
      if (handledAsync !== undefined) {
        resolve({ handledAsync, response });
      }
    });
    if (didRespond) {
      resolve({ handledAsync, response: syncResponse });
    } else if (!handledAsync) {
      resolve({ handledAsync: false, response: undefined });
    }
  });
}

test("Security invariant: getApiKey & getSecretApiKeysMap are strictly isolated to service-worker.js", () => {
  const srcRoot = path.resolve("src");
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) files = files.concat(walk(full));
      else if (e.name.endsWith(".js")) files.push(full);
    }
    return files;
  };

  const allowedFiles = new Set([
    path.resolve("src/lib/storage.js"),
    path.resolve("src/background/service-worker.js"),
  ]);

  for (const file of walk(srcRoot)) {
    if (allowedFiles.has(file)) continue;
    const code = fs.readFileSync(file, "utf8");
    assert.ok(
      !/\bgetApiKey\b|\bgetSecretApiKeysMap\b|\bgetSecretCloudSyncToken\b|\bsetSecretCloudSyncToken\b|\bmergeSecretApiKeysFromCloud\b/.test(
        code
      ),
      `Security violation: ${file} must never reference raw secret API keys or sync tokens`
    );
  }
});

test("Manifest V3 least-privilege & Access-requested pinning invariant: storage/notifications/alarms/activeTab permissions, externally_connectable setup bridge, Google CDN redirect coverage, and strict CSP", () => {
  const manifest = JSON.parse(fs.readFileSync("extension/manifest.json", "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, [
    "storage",
    "notifications",
    "alarms",
    "activeTab",
  ]);
  // Crucial for Chrome top-of-puzzle-menu "Access requested" UX on /welcome:
  // lm-subs.vercel.app must NOT be pre-granted in host_permissions
  assert.ok(
    !manifest.host_permissions.includes("https://lm-subs.vercel.app/*"),
    "lm-subs.vercel.app must not be pre-granted in host_permissions so Chrome surfaces LM Subs at the top under Access requested on /welcome"
  );
  assert.ok(
    manifest.externally_connectable?.matches?.includes(
      "https://lm-subs.vercel.app/*"
    ),
    "manifest.externally_connectable must allow two-way setup messages from https://lm-subs.vercel.app/*"
  );
  assert.ok(
    manifest.content_security_policy.extension_pages.includes("script-src 'self'")
  );
  // Regression guard: Google CDN 302 redirect domains must be in host_permissions so fetch() never throws Failed to fetch
  for (const requiredOrigin of [
    "https://notebooklm.google.com/*",
    "https://notebook.google.com/*",
    "https://*.googleusercontent.com/*",
    "https://*.usercontent.google.com/*",
    "https://*.googlevideo.com/*",
    "https://*.gvt1.com/*",
    "https://api.groq.com/*",
    "https://api.mistral.ai/*",
  ]) {
    assert.ok(
      manifest.host_permissions.includes(requiredOrigin),
      `Missing required host_permission: ${requiredOrigin}`
    );
  }
  // Regression guard: both page.js and content.js must run at document_start so early RPCs are never dropped
  for (const cs of manifest.content_scripts) {
    assert.equal(
      cs.run_at,
      "document_start",
      `Expected content_script ${cs.js.join(",")} to run at document_start`
    );
  }
});

test("Full E2E Pipeline: MAIN-world XHR capture -> MP4 audio extraction -> Groq 429 -> Mistral failover -> Cache hit", async () => {
  const storage = createMemoryStorage();
  await setApiKey("groq", "gsk_e2e_groq_key_123456", storage);
  await setApiKey("mistral", "mst_e2e_mistral_key_654321", storage);
  await saveSettings(
    {
      enabled: true,
      queueOrder: ["groq", "mistral"],
    },
    storage
  );

  // UI helper only sees boolean flags, never raw keys
  const presence = await getSavedKeyPresenceMap(storage);
  assert.equal(presence.groq, true);
  assert.equal(presence.mistral, true);

  // 1. Simulate NotebookLM `MAIN` world XHR traffic observed by `inject.js`
  const bridgeMessages = [];
  class MockXHR {
    open(method, url) {
      this._method = method;
      this._url = url;
    }
    addEventListener(evt, fn) {
      if (evt === "load") this._onload = fn;
    }
    send(body) {
      this._body = body;
      this.responseType = "";
      this.responseText = this._mockResponseText || "";
      if (this._onload) this._onload();
    }
  }

  const mockWin = {
    location: { origin: "https://notebooklm.google.com" },
    addEventListener: () => {},
    postMessage: (msg) => bridgeMessages.push(msg),
    XMLHttpRequest: MockXHR,
  };
  installMainWorldObserver(mockWin);

  const token = "ANd9GcE2ETokenForNotebookLmVideoOverview999";
  const cdnVideoUrl = `https://lh3.googleusercontent.com/notebooklm/${token}=m22-dv`;
  const readyRow = [
    "99999999-1111-4222-8333-444444444444",
    "Quantum Cryptography Video Overview",
    3,
    [[["src-a"]]],
    3,
    null,
    null,
    null,
    [null, cdnVideoUrl.replace("=m22-dv", "=m22"), [[["src-a"]], "en", ""], cdnVideoUrl, [[cdnVideoUrl, 4, "video/mp4"]], [95, 0]],
  ];
  const pollFrame = [["wrb.fr", "gArtLc", JSON.stringify([[readyRow]]), null, null, null, "generic"]];
  const pollText = `)]}'\n\n${JSON.stringify(pollFrame).length}\n${JSON.stringify(pollFrame)}\n`;

  const xhr = new mockWin.XMLHttpRequest();
  xhr._mockResponseText = pollText;
  xhr.open("POST", "https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute?rpcids=gArtLc");
  xhr.send("f.req=%5B%5D");

  const batchMsg = bridgeMessages.find((m) => m.type === PAGE_MESSAGE.BATCH_ARTIFACTS);
  assert.ok(batchMsg, "Expected BATCH_ARTIFACTS bridge message");
  const capturedArtifact = batchMsg.payload.artifacts[0];
  assert.equal(capturedArtifact.title, "Quantum Cryptography Video Overview");

  // 2. Build a synthetic dual-track MP4 (80 KB video + 8 bytes audio) served by Google CDN
  const syntheticMp4 = createSyntheticMp4WithVideoAndAudio({
    videoPayloads: [new Uint8Array(40_000).fill(0x55), new Uint8Array(40_000).fill(0x66)],
    audioPayloads: [new Uint8Array([1, 2, 3, 4]), new Uint8Array([5, 6, 7, 8])],
  });

  let uploadedAudioByteLength = 0;
  const mockFetch = async (url, init) => {
    const urlStr = String(url);
    if (urlStr.includes("lh3.googleusercontent.com")) {
      // Simulate =m140-dv returning 404, =m22-dv returning the dual-track MP4
      if (urlStr.endsWith("=m140-dv")) {
        return new Response("Not Found", { status: 404 });
      }
      return new Response(syntheticMp4, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    }
    if (urlStr.includes("api.groq.com")) {
      return new Response(JSON.stringify({ error: { message: "429 TPM rate limit" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
    if (urlStr.includes("api.mistral.ai")) {
      const fileBlob = init.body.get("file");
      uploadedAudioByteLength = fileBlob.size;
      return new Response(
        JSON.stringify({
          segments: [
            { start: 0.5, end: 4.2, text: "Quantum key distribution guarantees eavesdropper detection." },
            { start: 4.5, end: 8.8, text: "BB84 encodes bits in orthogonal photon polarization bases." },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    throw new Error(`Unexpected fetch URL: ${urlStr}`);
  };

  const dispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl: mockFetch,
  });

  // Non-namespaced messages must return `false` synchronously
  const unrelated = await invokeDispatcher(dispatcher, { type: "OTHER_EXT_MSG" });
  assert.equal(unrelated.handledAsync, false);

  // Execute full subtitle generation pipeline
  const { response } = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
    artifact: capturedArtifact,
  });

  assert.equal(response.ok, true);
  assert.equal(response.cached, false);
  assert.equal(response.entry.provider, "mistral");
  assert.equal(response.entry.failoverUsed, true);
  assert.equal(response.entry.cues.length, 2);
  // Prove only stripped .m4a audio (< 2 KB) was uploaded instead of the 80 KB video MP4!
  assert.ok(
    uploadedAudioByteLength > 100 && uploadedAudioByteLength < 2000,
    `Expected compact .m4a upload (<2 KB), got ${uploadedAudioByteLength} bytes`
  );

  // Subsequent lookup hits local LRU cache immediately without touching network
  const cachedLookup = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.GET_CACHED_SUBTITLES,
    mediaToken: token,
  });
  assert.equal(cachedLookup.response.ok, true);
  assert.equal(cachedLookup.response.entry.cues.length, 2);
});

test("Regression (Gemini Notebook 'Failed to fetch'): Layer 1 first-party page extraction + STAGE_AUDIO_CHUNK avoids Service Worker CDN fetch", async () => {
  const storage = createMemoryStorage();
  await setApiKey("groq", "gsk_layer1_test_key_999", storage);
  await saveSettings({ enabled: true, queueOrder: ["groq"] }, storage);

  const syntheticMp4 = createSyntheticMp4WithVideoAndAudio({
    videoPayloads: [new Uint8Array(30_000).fill(0x22)],
    audioPayloads: [new Uint8Array([9, 8, 7, 6])],
  });

  // Simulate NotebookLM MAIN world (`page.js`) with first-party session cookies
  const listeners = [];
  const posted = [];
  const mockWin = {
    location: { origin: "https://notebook.google.com" },
    addEventListener: (evt, fn) => {
      if (evt === "message") listeners.push(fn);
    },
    postMessage: (msg) => posted.push(msg),
    fetch: async (url, init) => {
      assert.equal(init.credentials, "include");
      return new Response(syntheticMp4, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    },
  };
  installMainWorldObserver(mockWin);

  // Trigger EXTRACT_AUDIO_REQUEST from content.js -> page.js
  for (const fn of listeners) {
    fn({
      source: mockWin,
      origin: "https://notebook.google.com",
      data: {
        source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
        type: PAGE_MESSAGE.EXTRACT_AUDIO_REQUEST,
        payload: {
          requestId: "req-mass-spec-1",
          candidateUrls: [
            "https://lh3.googleusercontent.com/notebooklm/ANd9GcMassSpecToken12345=m22",
          ],
          durationSeconds: 504,
        },
      },
    });
  }

  // Wait for async extraction postMessage
  await new Promise((r) => setTimeout(r, 25));
  const extractMsg = posted.find(
    (m) => m.type === PAGE_MESSAGE.EXTRACT_AUDIO_RESPONSE
  );
  assert.ok(extractMsg, "Expected EXTRACT_AUDIO_RESPONSE from page.js");
  assert.equal(extractMsg.payload.ok, true);
  assert.equal(extractMsg.payload.chunks.length, 1);
  assert.ok(extractMsg.payload.extractedBytes < 2000);

  // Stage extracted compact .m4a chunk into Service Worker
  let cdnTouchedByServiceWorker = false;
  const swFetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes("googleusercontent.com")) {
      cdnTouchedByServiceWorker = true;
      throw new TypeError("Failed to fetch");
    }
    if (urlStr.includes("api.groq.com")) {
      return new Response(
        JSON.stringify({
          segments: [
            {
              start: 0.0,
              end: 4.1,
              text: "Mass spectrometry measures the mass-to-charge ratio of ions.",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    throw new Error(`Unexpected URL: ${urlStr}`);
  };

  const dispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl: swFetch,
  });

  const chunk = extractMsg.payload.chunks[0];
  const stageRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.STAGE_AUDIO_CHUNK,
    stagedJobId: "stage-mass-spec",
    index: 0,
    totalChunks: 1,
    originalBytes: extractMsg.payload.originalBytes,
    extractedBytes: extractMsg.payload.extractedBytes,
    chunk: {
      base64: Buffer.from(chunk.buffer).toString("base64"),
      mimeType: chunk.mimeType,
      fileName: chunk.fileName,
      startOffsetSec: chunk.startOffsetSec,
      durationSec: chunk.durationSec,
    },
  });
  assert.equal(stageRes.response.ok, true);

  const ensureRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
    stagedJobId: "stage-mass-spec",
    artifact: {
      artifactId: "77777777-aaaa-4bbb-8ccc-555555555555",
      title: "Mass Spectrometry Blueprint",
      mediaUrl:
        "https://lh3.googleusercontent.com/notebooklm/ANd9GcMassSpecToken12345=m22",
      durationSeconds: 504,
    },
  });

  assert.equal(ensureRes.response.ok, true);
  assert.equal(cdnTouchedByServiceWorker, false);
  assert.equal(ensureRes.response.entry.cues.length, 1);
  assert.match(ensureRes.response.entry.cues[0].text, /Mass spectrometry/);
});

test("Regression: Layer 2 Service Worker falls back from credentials:'include' to 'omit' and handles blob: URLs clearly", async () => {
  const storage = createMemoryStorage();
  await setApiKey("groq", "gsk_layer2_test_key_888", storage);
  await saveSettings({ enabled: true, queueOrder: ["groq"] }, storage);

  const syntheticMp4 = createSyntheticMp4WithVideoAndAudio({
    videoPayloads: [new Uint8Array(10_000).fill(0x11)],
    audioPayloads: [new Uint8Array([1, 3, 5, 7])],
  });

  const seenCredentials = [];
  const swFetch = async (url, init) => {
    const urlStr = String(url);
    if (
      urlStr.includes("googleusercontent.com") ||
      urlStr.includes("usercontent.google.com")
    ) {
      seenCredentials.push(init?.credentials);
      // Simulate wildcard CORS rejecting credentials: 'include' with TypeError: Failed to fetch
      if (init?.credentials === "include") {
        throw new TypeError("Failed to fetch");
      }
      return new Response(syntheticMp4, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    }
    if (urlStr.includes("api.groq.com")) {
      return new Response(
        JSON.stringify({
          segments: [{ start: 0.2, end: 3.0, text: "Ionization source ready." }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    throw new Error(`Unexpected URL: ${urlStr}`);
  };

  const dispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl: swFetch,
  });

  const okRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
    artifact: {
      artifactId: "88888888-aaaa-4bbb-8ccc-666666666666",
      title: "Redirected Stream Video",
      mediaUrl:
        "https://lh3-rt.usercontent.google.com/notebooklm/ANd9GcRedirectToken98765=m22",
    },
  });
  assert.equal(okRes.response.ok, true);
  assert.deepEqual(seenCredentials.slice(0, 2), ["include", "omit"]);

  // Verify blob:-only uncaptured MediaSource stream gives actionable reload instructions instead of opaque error
  const blobRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
    artifact: {
      cacheKey: "blob-only-test",
      title: "Already Loaded Blob Video",
      mediaUrl: "blob:https://notebook.google.com/1234-5678",
    },
  });
  assert.equal(blobRes.response.ok, false);
  assert.match(blobRes.response.error, /Reload this NotebookLM tab once/);
});

test("Regression (notebook.google.com Lot dialog): REQUEST_PAGE_STATE replays SSR AF_initDataCallback & collectVideosDeep pierces Shadow DOM", () => {
  const token = "ABzcPv3nfeEqLiveNotebookLmToken987654";
  const ssrRow = [
    "93731fdd-7bbd-4b5a-9d79-4873d75b4f1d",
    "Notebook Studio Overview",
    3,
    [[["src-1"]]],
    3,
    null,
    null,
    null,
    [
      null,
      `https://lh3.googleusercontent.com/notebooklm/${token}=mm,22`,
      [[["src-1"]], "en", ""],
      `https://lh3.googleusercontent.com/notebooklm/${token}=m22-dv`,
      [[`https://lh3.googleusercontent.com/notebooklm/${token}=m22-dv`, 4, "video/mp4"]],
      [150, 0],
    ],
  ];

  const listeners = [];
  const posted = [];
  const mockDoc = {
    readyState: "complete",
    querySelectorAll: (sel) =>
      sel === "script"
        ? [
            {
              textContent: `AF_initDataCallback({key: 'ds:1', data: ${JSON.stringify(
                [[ssrRow]]
              )}});`,
            },
          ]
        : [],
  };
  const mockWin = {
    location: { origin: "https://notebook.google.com" },
    document: mockDoc,
    addEventListener: (evt, fn) => {
      if (evt === "message") listeners.push(fn);
    },
    postMessage: (msg) => posted.push(msg),
  };

  installMainWorldObserver(mockWin);

  // Simulate content.js requesting buffered state after attaching its listener
  for (const fn of listeners) {
    fn({
      source: mockWin,
      data: {
        source: PAGE_MESSAGE.BRIDGE_SOURCE_CONTENT,
        type: PAGE_MESSAGE.REQUEST_PAGE_STATE,
      },
    });
  }

  const snapshot = posted.find((m) => m.type === PAGE_MESSAGE.PAGE_STATE_SNAPSHOT);
  assert.ok(snapshot, "Expected PAGE_STATE_SNAPSHOT reply from page.js");
  assert.equal(snapshot.payload.artifacts.length, 1);
  assert.equal(
    snapshot.payload.artifacts[0].artifactId,
    "93731fdd-7bbd-4b5a-9d79-4873d75b4f1d"
  );

  // Verify Shadow-DOM piercing finds `<video>` inside nested custom element shadowRoot
  const shadowVideo = { tagName: "VIDEO" };
  const nestedShadowRoot = {
    querySelectorAll: (sel) => (sel === "video" ? [shadowVideo] : []),
  };
  const customPlayerHost = { shadowRoot: nestedShadowRoot };
  const rootDoc = {
    querySelectorAll: (sel) => (sel === "video" ? [] : [customPlayerHost]),
  };
  const discoveredVideos = collectVideosDeep(rootDoc);
  assert.equal(discoveredVideos.length, 1);
  assert.equal(discoveredVideos[0], shadowVideo);
});

test("Regression: Service Worker skips silent video-only preview MP4 (=s512-mm,22) and transcribes audio-bearing variant", async () => {
  const storage = createMemoryStorage();
  await setApiKey("groq", "gsk_super_secret_live_key_999999", storage);
  await saveSettings({ enabled: true, debugMode: true, queueOrder: ["groq"] }, storage);

  const silentPreviewMp4 = createSyntheticMp4WithVideoAndAudio({
    videoPayloads: [new Uint8Array(2048).fill(0x33)],
    audioPayloads: [], // Silent video-only preview!
  });
  const realMuxedMp4 = createSyntheticMp4WithVideoAndAudio({
    videoPayloads: [new Uint8Array(4096).fill(0x44)],
    audioPayloads: [new Uint8Array([10, 20, 30, 40])],
  });

  const triedUrls = [];
  const swFetch = async (url) => {
    const u = String(url);
    triedUrls.push(u);
    if (u.endsWith("=m140")) {
      // Simulate silent motion preview accidentally returned on first variant
      return new Response(silentPreviewMp4, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    }
    if (u.includes("googleusercontent.com")) {
      return new Response(realMuxedMp4, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    }
    if (u.includes("api.groq.com")) {
      return new Response(
        JSON.stringify({
          segments: [{ start: 0.1, end: 2.9, text: "Real audio track transcribed." }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    throw new Error(`Unexpected URL: ${u}`);
  };

  const dispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl: swFetch,
  });

  const res = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
    artifact: {
      artifactId: "12121212-aaaa-4bbb-8ccc-343434343434",
      title: "Silent Preview Skip Test",
      mediaUrl:
        "https://lh3.googleusercontent.com/notebooklm/ABzcSilentSkipToken123456=mm,22",
    },
  });

  assert.equal(res.response.ok, true);
  assert.ok(triedUrls.length >= 2, "Expected SW to advance past silent video-only MP4");
  assert.equal(res.response.entry.cues[0].text, "Real audio track transcribed.");

  // Verify GET_DEBUG_REPORT contains full timeline and strictly redacts raw API keys
  await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.APPEND_DEBUG_LOG,
    entry: {
      layer: "TEST",
      event: "leak.check",
      detail: "Accidental key echo gsk_super_secret_live_key_999999 in log",
    },
  });

  const debugRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.GET_DEBUG_REPORT,
    tabContext: {
      host: "notebook.google.com",
      pathname: "/notebook/3c9b8b97",
      artifactCount: 1,
      videoCount: 1,
    },
  });

  assert.equal(debugRes.response.ok, true);
  assert.match(debugRes.response.reportText, /media\.skip_silent/);
  assert.match(debugRes.response.reportText, /stt\.ok/);
  assert.ok(
    !debugRes.response.reportText.includes("gsk_super_secret_live_key_999999"),
    "Debug report must never leak raw API keys"
  );
});

test("Diagnostics: Withheld Google CDN host_permissions are detected and flagged with missingPermissions: true", async () => {
  const storage = createMemoryStorage();
  await setApiKey("groq", "gsk_perm_test_key_12345", storage);
  await saveSettings({ enabled: true, queueOrder: ["groq"] }, storage);

  const dispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl: async () => {
      throw new TypeError("Failed to fetch");
    },
    permissionsApi: {
      contains: async ({ origins }) => !origins.includes("https://*.google.com/*"),
    },
  });

  const res = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
    artifact: {
      artifactId: "56565656-aaaa-4bbb-8ccc-787878787878",
      title: "Withheld Permission Video",
      mediaUrl:
        "https://lh3.googleusercontent.com/notebooklm/ABzcWithheldPermToken123456=m22",
    },
  });

  assert.equal(res.response.ok, false);
  assert.equal(res.response.missingPermissions, true);
  assert.match(res.response.error, /Grant Google Media Access/);
});

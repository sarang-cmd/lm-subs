import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  createExternalMessageDispatcher,
  createRuntimeDispatcher,
  installBackgroundAutomation,
  isAllowedExternalWebSender,
} from "../src/background/service-worker.js";
import {
  ARTIFACT_TYPE,
  EXTERNAL_MESSAGE,
  PAGE_MESSAGE,
  RUNTIME_MESSAGE,
} from "../src/config/selectors.js";
import { collectMediaElementsDeep } from "../src/content/content.js";
import { VideoSubtitleController } from "../src/content/player-overlay.js";
import { parseAfInitDataPayloads } from "../src/lib/batchexecute.js";
import {
  getApiKey,
  getSettings,
  getSetupState,
  saveSetupState,
  setSecretCloudSyncToken,
} from "../src/lib/storage.js";
import { installMainWorldObserver } from "../src/page/inject.js";

function createMemoryStorage() {
  const db = {};
  return {
    async get(keys) {
      if (typeof keys === "string") return { [keys]: db[keys] };
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

function invokeExternal(dispatcher, msg, sender) {
  return new Promise((resolve) => {
    let settled = false;
    dispatcher(msg, sender, (res) => {
      settled = true;
      resolve(res);
    });
    if (!settled) {
      setTimeout(() => {
        if (!settled) resolve(undefined);
      }, 60);
    }
  });
}

function createMockDom() {
  function makeNode(tag) {
    const node = {
      tagName: String(tag || "div").toUpperCase(),
      className: "",
      id: "",
      type: "",
      title: "",
      textContent: "",
      value: "",
      style: {},
      dataset: {},
      children: [],
      parentElement: null,
      isConnected: true,
      shadowRoot: null,
      _attrs: {},
      _listeners: {},
      appendChild(child) {
        if (!child) return child;
        child.parentElement = node;
        child.isConnected = node.isConnected;
        node.children.push(child);
        return child;
      },
      append(...items) {
        for (const it of items) {
          if (typeof it === "string") {
            const span = makeNode("span");
            span.textContent = it;
            node.appendChild(span);
          } else if (it) {
            node.appendChild(it);
          }
        }
      },
      remove() {
        if (node.parentElement) {
          node.parentElement.children = node.parentElement.children.filter(
            (c) => c !== node
          );
          node.parentElement = null;
        }
        node.isConnected = false;
      },
      setAttribute(k, v) {
        node._attrs[k] = String(v);
      },
      getAttribute(k) {
        return node._attrs[k] ?? null;
      },
      addEventListener(type, fn) {
        if (!node._listeners[type]) node._listeners[type] = [];
        node._listeners[type].push(fn);
      },
      removeEventListener(type, fn) {
        if (!node._listeners[type]) return;
        node._listeners[type] = node._listeners[type].filter((f) => f !== fn);
      },
      dispatchEvent(evt) {
        for (const fn of node._listeners[evt.type] || []) {
          fn(evt);
        }
      },
      attachShadow() {
        const sr = makeNode("shadow-root");
        node._closedShadow = sr;
        return sr;
      },
      querySelector(sel) {
        if (sel.startsWith(".")) {
          const cls = sel.slice(1);
          return (
            node.children.find((c) =>
              String(c.className || "").split(/\s+/).includes(cls)
            ) || null
          );
        }
        return null;
      },
      querySelectorAll(sel) {
        const tags = sel
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        const found = [];
        const walk = (cur) => {
          for (const c of cur.children || []) {
            if (tags.includes("*") || tags.includes(c.tagName)) {
              found.push(c);
            }
            walk(c);
          }
        };
        walk(node);
        return found;
      },
    };
    return node;
  }

  const body = makeNode("body");
  const doc = {
    body,
    documentElement: body,
    createElement: (tag) => makeNode(tag),
    createElementNS: (_ns, tag) => makeNode(tag),
    createTextNode: (t) => {
      const n = makeNode("#text");
      n.textContent = String(t ?? "");
      return n;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelectorAll: (sel) => body.querySelectorAll(sel),
  };
  return { doc, body, makeNode };
}

test("Audio Overviews & Podcasts: SSR/RPC extraction, Shadow DOM <audio> discovery, detached new Audio() bridge, and Podcast Caption Dock", async () => {
  // 1. SSR payload with an Audio Overview (`typeCode === 1`)
  const audioSsrPayload = [
    [
      [
        "aaaa1111-bbbb-4ccc-8ddd-eeee22223333",
        "Deep Dive: Transformer Self-Attention",
        ARTIFACT_TYPE.AUDIO_OVERVIEW,
        [[["src-99"]]],
        3,
        null,
        [
          null,
          "https://lh3.googleusercontent.com/notebooklm/ABzcPodcastStreamToken9876543210=m140",
          null,
          null,
          null,
          [420, 0],
        ],
      ],
    ],
  ];
  const ssrScript = `AF_initDataCallback({key: 'ds:1', hash: '2', data:${JSON.stringify(
    audioSsrPayload
  )}, sideChannel: {}});`;
  const ssrArtifacts = parseAfInitDataPayloads([ssrScript]);
  assert.equal(ssrArtifacts.length, 1);
  assert.equal(ssrArtifacts[0].typeCode, ARTIFACT_TYPE.AUDIO_OVERVIEW);
  assert.equal(ssrArtifacts[0].mediaKind, "audio");
  assert.equal(ssrArtifacts[0].durationSeconds, 420);

  // 2. collectMediaElementsDeep discovers both <video> and Shadow DOM <audio>, ignoring internal chimes
  const { doc, body, makeNode } = createMockDom();
  const videoEl = makeNode("video");
  body.appendChild(videoEl);

  const podcastCard = makeNode("div");
  const shadow = makeNode("shadow-root");
  podcastCard.shadowRoot = shadow;
  const podcastAudio = makeNode("audio");
  podcastAudio.currentTime = 4.2;
  podcastAudio.duration = 180;
  podcastAudio.paused = true;
  shadow.appendChild(podcastAudio);

  const internalChime = makeNode("audio");
  internalChime.__lmSubsInternal = true;
  shadow.appendChild(internalChime);

  body.appendChild(podcastCard);

  const mediaFound = collectMediaElementsDeep(doc);
  assert.equal(mediaFound.length, 2);
  assert.ok(mediaFound.includes(videoEl));
  assert.ok(mediaFound.includes(podcastAudio));
  assert.ok(!mediaFound.includes(internalChime));

  // 3. VideoSubtitleController in `audio` mode mounts on document.body with `data-mode="audio"` and `Podcast` badge
  const audioCtrl = new VideoSubtitleController(podcastAudio, {
    doc,
    initialKaraokeHighlight: true,
    initialKaraokeDelayMs: 150,
  });
  assert.equal(audioCtrl.mediaKind, "audio");
  assert.equal(audioCtrl.host.parentElement, body);
  assert.equal(audioCtrl.host.getAttribute("data-mode"), "audio");
  assert.equal(audioCtrl.audioTagEl.textContent, "Podcast");
  assert.equal(audioCtrl.pipBtn.style.display, "none");

  audioCtrl.setCues([
    {
      startSec: 2.0,
      endSec: 8.0,
      text: "[Host 1] Self-attention compares every sequence token in parallel.",
    },
  ]);
  podcastAudio.currentTime = 4.5;
  audioCtrl._renderActiveCue();
  assert.equal(audioCtrl.captionBox.dataset.visible, "true");
  const hasCurrentWord = audioCtrl.captionBox.children.some((c) =>
    String(c.className || "").includes("caption-word-current")
  );
  assert.equal(hasCurrentWord, true);
  audioCtrl.destroy();

  // 4. Detached `new Audio()` in main world bridges `REMOTE_AUDIO_STATE` to content script
  const postedMessages = [];
  function FakeMediaEl() {}
  FakeMediaEl.prototype.play = function () {
    return Promise.resolve();
  };
  const fakeWin = {
    location: { origin: "https://notebooklm.google.com" },
    HTMLMediaElement: FakeMediaEl,
    postMessage(msg) {
      postedMessages.push(msg);
    },
    addEventListener() {},
  };
  installMainWorldObserver(fakeWin);

  const detachedPodcast = new FakeMediaEl();
  detachedPodcast.tagName = "AUDIO";
  detachedPodcast.isConnected = false;
  detachedPodcast.currentSrc =
    "https://lh3.googleusercontent.com/notebooklm/ABzcDetachedAudio9999999999=m140";
  detachedPodcast.currentTime = 12.4;
  detachedPodcast.duration = 240;
  detachedPodcast.paused = true;
  await detachedPodcast.play();

  const remoteStateMsg = postedMessages.find(
    (m) => m.type === PAGE_MESSAGE.REMOTE_AUDIO_STATE
  );
  assert.ok(
    remoteStateMsg,
    "Detached new Audio().play() must bridge REMOTE_AUDIO_STATE to content.js"
  );
  assert.equal(remoteStateMsg.payload.currentTime, 12.4);
  assert.equal(remoteStateMsg.payload.duration, 240);
});

test("Service Worker E2E: Audio Overview (.mp3 / .ogg) transcribes directly via Fast Path B without video inflation", async () => {
  const storage = createMemoryStorage();
  const fakeMp3Bytes = new Uint8Array(4096).fill(0x55);

  const swFetch = async (url) => {
    const u = String(url);
    if (u.includes("googleusercontent.com")) {
      return new Response(fakeMp3Bytes, {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      });
    }
    if (u.includes("api.groq.com")) {
      return new Response(
        JSON.stringify({
          segments: [
            {
              start: 0.0,
              end: 4.8,
              text: "[Host 1] Welcome to our Deep Dive Audio Overview.",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    throw new Error(`Unexpected URL: ${u}`);
  };

  const runtimeDispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl: swFetch,
    runtimeApi: {
      id: "abcdefghijklmnopabcdefghijklmnop",
      getManifest: () => ({ version: "0.2.8" }),
    },
  });

  // Save Groq key via the two-way website <-> extension external setup bridge first!
  const extDispatcher = createExternalMessageDispatcher(runtimeDispatcher, {
    storageArea: storage,
    runtimeApi: {
      id: "abcdefghijklmnopabcdefghijklmnop",
      getManifest: () => ({ version: "0.2.8" }),
    },
  });

  const saveKeyRes = await invokeExternal(
    extDispatcher,
    {
      type: EXTERNAL_MESSAGE.WEB_SAVE_PROVIDER_KEY,
      provider: "groq",
      apiKey: "gsk_welcome_wizard_key_123456",
      makePrimary: true,
    },
    { origin: "https://lm-subs.vercel.app" }
  );
  assert.equal(saveKeyRes.ok, true);
  assert.deepEqual(saveKeyRes.configuredProviders, ["groq"]);
  assert.equal(await getApiKey("groq", storage), "gsk_welcome_wizard_key_123456");

  // Transcribe Audio Overview
  const ensureRes = await new Promise((resolve) => {
    runtimeDispatcher(
      {
        type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
        artifact: {
          artifactId: "aaaa1111-bbbb-4ccc-8ddd-eeee22223333",
          title: "Deep Dive Podcast",
          mediaUrl:
            "https://lh3.googleusercontent.com/notebooklm/ABzcPodcastMp3Stream1234567890=m140",
          durationSeconds: 180,
        },
      },
      { tab: { id: 11 } },
      (r) => resolve(r)
    );
  });

  assert.equal(ensureRes.ok, true);
  assert.equal(
    ensureRes.entry.cues[0].text.replace(/\s+/g, " "),
    "[Host 1] Welcome to our Deep Dive Audio Overview."
  );
});

test("Auto-Welcome on Extension Install & Two-Way Setup Wizard Security Invariants", async () => {
  const storage = createMemoryStorage();
  await setSecretCloudSyncToken("lms_super_secret_cloud_token", storage);

  const createdTabs = [];
  let onInstalledListener = null;

  const runtimeApi = {
    id: "abcdefghijklmnopabcdefghijklmnop",
    getManifest: () => ({ version: "0.2.8" }),
    onInstalled: {
      addListener(fn) {
        onInstalledListener = fn;
      },
    },
    onStartup: { addListener() {} },
    onUpdateAvailable: { addListener() {} },
  };

  const runtimeDispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl: async () => new Response("{}", { status: 404 }),
    runtimeApi,
  });

  installBackgroundAutomation(runtimeDispatcher, {
    runtimeApi,
    storageArea: storage,
    tabsApi: {
      create(opts) {
        createdTabs.push(opts);
      },
    },
    alarmsApi: { create() {}, onAlarm: { addListener() {} } },
    notificationsApi: { onClicked: { addListener() {} } },
  });

  assert.equal(typeof onInstalledListener, "function");

  // 1. Simulate fresh extension install -> must open /welcome?installed=1&v=0.2.8&extId=...
  onInstalledListener({ reason: "install" });
  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].active, true);
  assert.match(
    createdTabs[0].url,
    /^https:\/\/lm-subs\.vercel\.app\/welcome\?installed=1&v=0\.2\.8&extId=abcdefghijklmnopabcdefghijklmnop$/
  );

  // 2. Simulate routine extension update -> must NOT spam-open a welcome tab
  onInstalledListener({ reason: "update" });
  assert.equal(createdTabs.length, 1);

  // 3. Verify external sender allowlist blocks untrusted sites while allowing Vercel & localhost
  assert.equal(isAllowedExternalWebSender({ origin: "https://evil.example.com" }), false);
  assert.equal(isAllowedExternalWebSender({ origin: "http://lm-subs.vercel.app" }), false);
  assert.equal(isAllowedExternalWebSender({ origin: "https://lm-subs.vercel.app" }), true);
  assert.equal(
    isAllowedExternalWebSender({ origin: "https://lm-subs-preview-123.vercel.app" }),
    true
  );
  assert.equal(isAllowedExternalWebSender({ origin: "http://localhost:4173" }), true);

  const extDispatcher = createExternalMessageDispatcher(runtimeDispatcher, {
    storageArea: storage,
    runtimeApi,
  });

  const blockedRes = await invokeExternal(
    extDispatcher,
    { type: EXTERNAL_MESSAGE.WEB_HANDSHAKE },
    { origin: "https://attacker.invalid" }
  );
  assert.equal(blockedRes.ok, false);

  // 4. Simulate user clicking LM Subs under "Access requested" in Chrome puzzle menu (popup increments count)
  await saveSetupState({ popupOpenedCount: 1, lastPopupOpenedAt: new Date().toISOString() }, storage);

  const handshake = await invokeExternal(
    extDispatcher,
    { type: EXTERNAL_MESSAGE.WEB_HANDSHAKE },
    { origin: "https://lm-subs.vercel.app" }
  );
  assert.equal(handshake.ok, true);
  assert.equal(handshake.version, "0.2.8");
  assert.equal(handshake.setupState.popupOpenedCount, 1);
  // Handshake must NEVER leak raw secret keys or cloud sync tokens
  const serialized = JSON.stringify(handshake);
  assert.ok(!serialized.includes("lms_super_secret_cloud_token"));

  // 5. Two-way preference toggle from /welcome updates chrome.storage.local live
  const prefRes = await invokeExternal(
    extDispatcher,
    {
      type: EXTERNAL_MESSAGE.WEB_UPDATE_SETUP_PREFS,
      preferences: {
        autoOnAudioOverviews: false,
        soundAlerts: true,
        karaokeDelayMs: 250,
      },
      completedSetup: true,
    },
    { origin: "https://lm-subs.vercel.app" }
  );
  assert.equal(prefRes.ok, true);
  assert.equal(prefRes.settings.autoOnAudioOverviews, false);
  assert.equal(prefRes.settings.soundAlerts, true);
  assert.equal(prefRes.settings.karaokeDelayMs, 250);
  assert.ok(prefRes.setupState.completedAt);

  const savedSettings = await getSettings(storage);
  assert.equal(savedSettings.autoOnAudioOverviews, false);
  assert.equal(savedSettings.soundAlerts, true);
  assert.equal(savedSettings.karaokeDelayMs, 250);

  const savedSetup = await getSetupState(storage);
  assert.ok(savedSetup.completedAt);

  // 6. Verify website Download CTA triggers /welcome?downloading=1 and WelcomeView renders Access requested guide
  const appCode = fs.readFileSync("src/web/App.jsx", "utf8");
  const welcomeCode = fs.readFileSync("src/web/WelcomeView.jsx", "utf8");
  assert.match(appCode, /\/welcome\?downloading=1/);
  assert.match(welcomeCode, /Access requested/);
  assert.match(welcomeCode, /To give an extension access to this site, click it\./);
});

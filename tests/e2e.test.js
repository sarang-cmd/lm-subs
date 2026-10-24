import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRuntimeDispatcher } from "../src/background/service-worker.js";
import { PAGE_MESSAGE, RUNTIME_MESSAGE } from "../src/config/selectors.js";
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
    const handledAsync = dispatcher(msg, sender, (response) => {
      resolve({ handledAsync, response });
    });
    if (!handledAsync) {
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
      !/\bgetApiKey\b|\bgetSecretApiKeysMap\b/.test(code),
      `Security violation: ${file} must never reference getApiKey or getSecretApiKeysMap`
    );
  }
});

test("Manifest V3 least-privilege invariant: only 'storage' permission and strict CSP", () => {
  const manifest = JSON.parse(fs.readFileSync("extension/manifest.json", "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.ok(
    manifest.content_security_policy.extension_pages.includes("script-src 'self'")
  );
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

  assert.equal(bridgeMessages.length, 1);
  assert.equal(bridgeMessages[0].type, PAGE_MESSAGE.BATCH_ARTIFACTS);
  const capturedArtifact = bridgeMessages[0].payload.artifacts[0];
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

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { loadConfigFromFile } from "@neon/config/v1";
import { exportJWK, generateKeyPair, jwtVerify, SignJWT, createLocalJWKSet } from "jose";
import { createSyncApp } from "../server/app.js";
import {
  decryptApiKeyForUser,
  encryptApiKeyForUser,
} from "../server/crypto.js";
import { createDatabaseClient } from "../server/db.js";
import { createRuntimeDispatcher } from "../src/background/service-worker.js";
import { RUNTIME_MESSAGE } from "../src/config/selectors.js";
import { VideoSubtitleController } from "../src/content/player-overlay.js";
import {
  createSyntheticMp4WithVideoAndAudio,
  extractAudioTrackFromMp4,
  extractAudioViaHttpRange,
} from "../src/lib/audio-extract.js";
import { transcribeWithQueue } from "../src/lib/providers/index.js";
import {
  getSecretApiKeysMap,
  getSettings,
  setApiKey,
} from "../src/lib/storage.js";

function createMemoryStorage() {
  const data = {};
  return {
    data,
    async get(key) {
      if (typeof key === "string") return { [key]: data[key] };
      return { ...data };
    },
    async set(obj) {
      Object.assign(data, obj);
    },
  };
}

function invokeDispatcher(dispatcher, msg, sender = { tab: { id: 7 } }) {
  return new Promise((resolve) => {
    dispatcher(msg, sender, (res) => resolve(res));
  });
}

test("Neon IaC neon.ts validates cleanly with @neon/config/v1 (auth: true + 7d preview TTL)", async () => {
  const loaded = await loadConfigFromFile("neon.ts");
  const cfg = loaded.config || loaded;
  assert.equal(cfg.auth, true);
  assert.equal(typeof cfg.branch, "function");
  assert.deepEqual(cfg.branch({ isDefault: false, exists: false }), { ttl: "7d" });
  assert.deepEqual(cfg.branch({ isDefault: true, exists: true }), {});
  assert.ok(fs.existsSync(path.resolve("db/schema.sql")));
});

test("AES-256-GCM per-user API key encryption isolates users via HKDF + AAD", () => {
  const secret = "unit-test-master-secret-32-bytes-minimum!!";
  const encA = encryptApiKeyForUser("usr_alice", "gsk_live_secret_alice_9xQ2", secret);
  assert.equal(encA.keyHint, "gsk_••••9xQ2");
  assert.notEqual(encA.ciphertextB64, "gsk_live_secret_alice_9xQ2");

  const decA = decryptApiKeyForUser("usr_alice", encA, secret);
  assert.equal(decA, "gsk_live_secret_alice_9xQ2");

  // User B cannot decrypt User A's ciphertext (HKDF info + GCM AAD mismatch)
  assert.throws(() => {
    decryptApiKeyForUser("usr_mallory", encA, secret);
  });
});

test("Neon Sync API E2E: Signup, Signin, AES-256-GCM API-key sync, Settings & Subtitle Vault isolation", async () => {
  const db = await createDatabaseClient({ inMemory: true });
  const app = createSyncApp({
    dbPromise: Promise.resolve(db),
    encryptionSecret: "e2e-test-secret-material-for-lm-subs-v020",
  });

  try {
    // 1. Health endpoint queries live Postgres
    const healthRes = await app.request("http://localhost/api/health");
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.equal(health.databaseMode, "pglite-postgres");

    // 2. User A creates a Neon account
    const signupRes = await app.request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@lmsubs.dev",
        password: "correct-horse-battery",
        name: "Alice",
      }),
    });
    assert.equal(signupRes.status, 201);
    const signup = await signupRes.json();
    assert.equal(signup.ok, true);
    assert.ok(signup.token.startsWith("lms_"));

    // 3. Push settings, 2 API keys, and 1 subtitle transcript
    const pushRes = await app.request("http://localhost/api/sync/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signup.token}`,
      },
      body: JSON.stringify({
        settings: { primaryProvider: "mistral", fontSize: "large" },
        apiKeys: {
          groq: "gsk_super_secret_groq_key_1111",
          mistral: "mst_super_secret_mistral_2222",
        },
        subtitles: [
          {
            cacheKey: "artifact:raft-001",
            artifactId: "raft-001",
            title: "Raft Consensus Overview",
            language: "en",
            provider: "groq",
            model: "whisper-large-v3-turbo",
            cues: [{ index: 1, startSec: 0, endSec: 3.5, text: "Hello from Raft." }],
          },
        ],
      }),
    });
    assert.equal(pushRes.status, 200);

    // Verify raw keys are NEVER stored in plaintext inside Postgres!
    const rawDbCheck = await db.query(
      "SELECT provider_id, ciphertext_b64, key_hint FROM lmsubs_user_api_keys"
    );
    assert.equal(rawDbCheck.rows.length, 2);
    for (const r of rawDbCheck.rows) {
      assert.ok(!r.ciphertext_b64.includes("super_secret"));
    }

    // 4. Web UI pull (`includeSecrets=0`) returns masked hints ONLY — never raw keys
    const webPullRes = await app.request("http://localhost/api/sync/pull?includeSecrets=0", {
      headers: { Authorization: `Bearer ${signup.token}` },
    });
    const webPull = await webPullRes.json();
    assert.equal(webPull.ok, true);
    assert.equal(webPull.apiKeys, undefined);
    assert.equal(webPull.keyHints.groq, "gsk_••••1111");
    assert.equal(webPull.settings.primaryProvider, "mistral");
    assert.equal(webPull.subtitles.length, 1);

    // 5. Service Worker pull (`includeSecrets=1`) decrypts exact keys
    const swPullRes = await app.request("http://localhost/api/sync/pull?includeSecrets=1", {
      headers: { Authorization: `Bearer ${signup.token}` },
    });
    const swPull = await swPullRes.json();
    assert.equal(swPull.apiKeys.groq, "gsk_super_secret_groq_key_1111");
    assert.equal(swPull.apiKeys.mistral, "mst_super_secret_mistral_2222");

    // 6. User B signs up and cannot see User A's keys, settings, or subtitles
    const bobRes = await app.request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "bob@lmsubs.dev",
        password: "bob-password-1234",
      }),
    });
    const bob = await bobRes.json();
    const bobPullRes = await app.request("http://localhost/api/sync/pull?includeSecrets=1", {
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    const bobPull = await bobPullRes.json();
    assert.deepEqual(bobPull.apiKeys, {});
    assert.equal(bobPull.subtitles.length, 0);
  } finally {
    await db.close();
  }
});

test("Neon Managed Better Auth Ed25519 JWT verification via JWKS works seamlessly", async () => {
  const db = await createDatabaseClient({ inMemory: true });
  const { publicKey, privateKey } = await generateKeyPair("EdDSA");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "neon-auth-ed25519-1";
  jwk.alg = "EdDSA";
  const localJwks = createLocalJWKSet({ keys: [jwk] });
  const issuer = "https://ep-falling-cherry.neonauth.us-east-2.aws.neon.tech";

  const app = createSyncApp({
    dbPromise: Promise.resolve(db),
    encryptionSecret: "neon-jwks-test-secret",
    jwksVerifier: async (token) => {
      const { payload } = await jwtVerify(token, localJwks, { issuer });
      return payload;
    },
  });

  try {
    const jwt = await new SignJWT({
      email: "managed-user@neon.tech",
      name: "Neon Managed User",
    })
      .setProtectedHeader({ alg: "EdDSA", kid: "neon-auth-ed25519-1" })
      .setSubject("neon_usr_998877")
      .setIssuer(issuer)
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(privateKey);

    const meRes = await app.request("http://localhost/api/auth/me", {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    assert.equal(meRes.status, 200);
    const me = await meRes.json();
    assert.equal(me.user.email, "managed-user@neon.tech");
    assert.equal(me.user.id, "neon_usr_998877");
  } finally {
    await db.close();
  }
});

test("Chrome Extension Service Worker <-> Neon Postgres syncs API keys across devices & hits cloud subtitle cache", async () => {
  const db = await createDatabaseClient({ inMemory: true });
  const app = createSyncApp({
    dbPromise: Promise.resolve(db),
    encryptionSecret: "sw-sync-secret-key",
  });

  const routedFetch = async (url, init) => {
    const u = String(url);
    if (u.startsWith("https://sync.lmsubs.test/")) {
      const rewritten = u.replace("https://sync.lmsubs.test", "http://localhost");
      return app.request(rewritten, init);
    }
    throw new Error(`Unexpected external fetch in cloud-cache test: ${u}`);
  };

  try {
    // Device 1: Saves Groq key locally, creates Neon account, and syncs to Postgres
    const store1 = createMemoryStorage();
    await setApiKey("groq", "gsk_device1_synced_key_7788", store1);
    const sw1 = createRuntimeDispatcher({
      storageArea: store1,
      fetchImpl: routedFetch,
    });

    const signupRes = await invokeDispatcher(sw1, {
      type: RUNTIME_MESSAGE.SYNC_SIGNUP,
      serverUrl: "https://sync.lmsubs.test",
      email: "crossdevice@lmsubs.dev",
      password: "secure-sync-password",
      name: "Cross Device",
    });
    assert.equal(signupRes.ok, true);
    assert.equal(signupRes.profile.connected, true);

    // Seed a cloud subtitle on the account
    await invokeDispatcher(sw1, {
      type: RUNTIME_MESSAGE.SAVE_IMPORTED_SUBTITLES,
      entry: {
        cacheKey: "artifact:cloud-vid-42",
        artifactId: "cloud-vid-42",
        title: "Cloud Cached Lecture",
        language: "en",
        provider: "groq",
        cues: [{ index: 1, startSec: 0, endSec: 4, text: "Instant hit from Neon Postgres." }],
      },
    });
    await invokeDispatcher(sw1, { type: RUNTIME_MESSAGE.SYNC_NOW });

    // Device 2 (fresh install): Signs in and receives decrypted Groq key + settings + instant cloud subtitle!
    const store2 = createMemoryStorage();
    const sw2 = createRuntimeDispatcher({
      storageArea: store2,
      fetchImpl: routedFetch,
    });

    const signinRes = await invokeDispatcher(sw2, {
      type: RUNTIME_MESSAGE.SYNC_SIGNIN,
      serverUrl: "https://sync.lmsubs.test",
      email: "crossdevice@lmsubs.dev",
      password: "secure-sync-password",
    });
    assert.equal(signinRes.ok, true);

    const syncedKeysOnDevice2 = await getSecretApiKeysMap(store2);
    assert.equal(syncedKeysOnDevice2.groq, "gsk_device1_synced_key_7788");

    // Verify diagnostic report strictly redacts both API keys and `lms_` sync tokens
    const debugReport = await invokeDispatcher(sw2, {
      type: RUNTIME_MESSAGE.GET_DEBUG_REPORT,
    });
    assert.equal(debugReport.ok, true);
    assert.ok(!debugReport.reportText.includes("gsk_device1_synced_key_7788"));
    assert.ok(!debugReport.reportText.includes("lms_"));

    // Verify ENSURE_SUBTITLES for a new uncached local key hits `/api/sync/subtitle` on Neon without media download!
    const store3 = createMemoryStorage();
    const sw3 = createRuntimeDispatcher({
      storageArea: store3,
      fetchImpl: routedFetch,
    });
    await invokeDispatcher(sw3, {
      type: RUNTIME_MESSAGE.SYNC_SIGNIN,
      serverUrl: "https://sync.lmsubs.test",
      email: "crossdevice@lmsubs.dev",
      password: "secure-sync-password",
    });
    // Clear local subtitle cache on store3 to prove `fetchCloudSubtitleIfAvailable` hits Neon directly
    store3.data.subtitleCache = [];

    const cloudHit = await invokeDispatcher(sw3, {
      type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
      artifact: {
        cacheKey: "artifact:cloud-vid-42",
        artifactId: "cloud-vid-42",
        title: "Cloud Cached Lecture",
        mediaUrl: "https://lh3.googleusercontent.com/notebooklm/ANd9GcTokenCloudVid42000000=m22",
      },
    });
    assert.equal(cloudHit.ok, true);
    assert.equal(cloudHit.cloudCached, true);
    assert.equal(cloudHit.entry.cues[0].text, "Instant hit from Neon Postgres.");
  } finally {
    await db.close();
  }
});

test("Speed Optimization Suite: pure-audio =m140 skips WAV IPC, Groq omits slow 'word' DTW, and HTTP 206 Range skips video frames", async () => {
  // Part A: HTTP 206 Range extracts byte-identical audio from a muxed MP4 without full-body download
  const syntheticMp4 = createSyntheticMp4WithVideoAndAudio({
    videoPayloads: Array.from({ length: 6 }, (_, i) => new Uint8Array(256_000).fill(i + 1)),
    audioPayloads: Array.from({ length: 6 }, (_, i) => new Uint8Array(1024).fill(0xa0 + i)),
  });
  const directRemux = extractAudioTrackFromMp4(syntheticMp4);
  assert.ok(directRemux);

  let rangeCalls = 0;
  let downloadedSliceBytes = 0;
  const rangedRemux = await extractAudioViaHttpRange({
    url: "https://lh3.googleusercontent.com/notebooklm/ANd9GcRangeToken1234567890=m22",
    totalBytes: syntheticMp4.byteLength,
    probeBytes: 4096,
    fetchImpl: async (_url, init) => {
      rangeCalls += 1;
      const rangeHdr = init?.headers?.Range || "";
      const m = rangeHdr.match(/^bytes=(\d+)-(\d+)$/);
      assert.ok(m, `Expected Range header, got ${rangeHdr}`);
      const start = Number(m[1]);
      const end = Math.min(syntheticMp4.byteLength - 1, Number(m[2]));
      const slice = syntheticMp4.subarray(start, end + 1);
      downloadedSliceBytes += slice.byteLength;
      return new Response(slice, {
        status: 206,
        headers: {
          "content-type": "video/mp4",
          "content-range": `bytes ${start}-${end}/${syntheticMp4.byteLength}`,
        },
      });
    },
  });

  assert.ok(rangedRemux);
  assert.ok(rangeCalls >= 2);
  assert.ok(
    downloadedSliceBytes < syntheticMp4.byteLength * 0.15,
    `Expected HTTP Range to download <15% of video, downloaded ${downloadedSliceBytes}/${syntheticMp4.byteLength}`
  );
  assert.deepEqual(rangedRemux.bytes, directRemux.bytes);

  // Part B: Pure-audio `=m140` fragmented stream NEVER triggers `DECODE_WAV_FALLBACK` and Groq sends `"segment"` only
  const store = createMemoryStorage();
  await setApiKey("groq", "gsk_fastpath_test_key_9999", store);

  let wavDecodeTriggered = false;
  let capturedGranularities = [];

  const sw = createRuntimeDispatcher({
    storageArea: store,
    tabsApi: {
      sendMessage(_tabId, msg, cb) {
        if (msg?.type === RUNTIME_MESSAGE.DECODE_WAV_FALLBACK) {
          wavDecodeTriggered = true;
        }
        cb?.({ ok: false });
      },
    },
    fetchImpl: async (url, init) => {
      const u = String(url);
      if (u.includes("=m140")) {
        // Simulate a 4 KB fragmented DASH audio/mp4 stream (no `stco` table -> `extractAudioTrackFromMp4` returns null)
        const fakeDashM4a = new Uint8Array(4096);
        fakeDashM4a.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], 0); // ftyp
        return new Response(fakeDashM4a, {
          status: 200,
          headers: { "content-type": "audio/mp4" },
        });
      }
      if (u.includes("api.groq.com")) {
        const form = init.body;
        capturedGranularities = form.getAll("timestamp_granularities[]");
        return new Response(
          JSON.stringify({
            segments: [{ start: 0.0, end: 2.8, text: "Fast segment-only caption." }],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      throw new Error(`Unexpected URL: ${u}`);
    },
  });

  const res = await invokeDispatcher(sw, {
    type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
    artifact: {
      cacheKey: "artifact:fast-m140",
      artifactId: "fast-m140",
      title: "Fast Audio Test",
      mediaUrl: "https://lh3.googleusercontent.com/notebooklm/ANd9GcFastPathToken1234567890=m22-dv",
    },
  });

  assert.equal(res.ok, true);
  assert.equal(wavDecodeTriggered, false, "Pure audio =m140 must NOT trigger IPC WAV inflation");
  assert.deepEqual(
    capturedGranularities,
    ["segment"],
    "Groq upload must request segment timestamps only (never slow DTW 'word')"
  );
});

test("Concurrent multi-chunk STT runs 3 chunks in parallel and emits progressive onPartialCues", async () => {
  const partialSnapshots = [];
  let activeInFlight = 0;
  let maxConcurrentObserved = 0;

  const chunks = [0, 10, 20].map((offset, idx) => ({
    bytes: new Uint8Array([1, 2, 3, idx]),
    mimeType: "audio/wav",
    fileName: `part-${idx}.wav`,
    startOffsetSec: offset,
    durationSec: 10,
  }));

  const result = await transcribeWithQueue({
    chunks,
    candidates: [{ providerId: "groq", apiKey: "gsk_parallel_test_key" }],
    chunkConcurrency: 3,
    onPartialCues: (snap) => partialSnapshots.push(snap),
    fetchImpl: async () => {
      activeInFlight += 1;
      maxConcurrentObserved = Math.max(maxConcurrentObserved, activeInFlight);
      await new Promise((r) => setTimeout(r, 45));
      activeInFlight -= 1;
      return new Response(
        JSON.stringify({
          segments: [{ start: 0.5, end: 3.0, text: "Concurrent chunk cue." }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    },
  });

  assert.equal(maxConcurrentObserved, 3);
  assert.equal(result.cues.length, 3);
  assert.ok(partialSnapshots.length >= 1);
  assert.equal(result.cues[2].startSec, 20.5);
});

test("In-Player VideoSubtitleController.exportSubtitles mounts download anchor inside ShadowRoot (<dialog>-inert safe)", () => {
  const appendedToBody = [];
  const shadowChildren = [];
  const clickedDownloads = [];

  const makeEl = (tag) => {
    const listeners = {};
    const children = [];
    const el = {
      tagName: tag.toUpperCase(),
      style: {},
      dataset: {},
      children,
      textContent: "",
      href: "",
      download: "",
      rel: "",
      appendChild(c) {
        children.push(c);
        if (this === mockDoc.body) appendedToBody.push(c);
        return c;
      },
      append(...nodes) {
        children.push(...nodes);
      },
      querySelector() {
        return null;
      },
      remove() {},
      addEventListener(ev, fn) {
        listeners[ev] = listeners[ev] || [];
        listeners[ev].push(fn);
      },
      removeEventListener() {},
      click() {
        let stopped = false;
        for (const fn of listeners.click || []) {
          fn({
            stopPropagation() {
              stopped = true;
            },
          });
        }
        clickedDownloads.push({
          download: el.download,
          href: el.href,
          stoppedPropagation: stopped,
        });
      },
      attachShadow() {
        return {
          append(...nodes) {
            shadowChildren.push(...nodes);
          },
          appendChild(node) {
            shadowChildren.push(node);
            return node;
          },
        };
      },
    };
    return el;
  };

  const mockDoc = {
    body: makeEl("body"),
    documentElement: makeEl("html"),
    fullscreenElement: null,
    createElement: makeEl,
  };

  const parentContainer = makeEl("div");
  const mockVideo = makeEl("video");
  mockVideo.paused = true;
  mockVideo.currentTime = 1.0;
  mockVideo.parentElement = parentContainer;
  mockVideo.closest = () => makeEl("dialog");

  const controller = new VideoSubtitleController(mockVideo, {
    doc: mockDoc,
    initialOffsetSec: 0.5,
  });
  controller.setCues(
    [{ index: 1, startSec: 1.0, endSec: 3.5, text: "Exported inside Lot dialog." }],
    { title: "Quantum Error Correction" }
  );

  assert.equal(controller.exportSubtitles("srt"), true);
  assert.equal(controller.exportSubtitles("vtt"), true);
  assert.equal(controller.exportSubtitles("txt"), true);
  assert.equal(controller.exportSubtitles("json"), true);

  assert.equal(clickedDownloads.length, 4);
  assert.deepEqual(
    clickedDownloads.map((d) => d.download),
    [
      "quantum-error-correction.srt",
      "quantum-error-correction.vtt",
      "quantum-error-correction.txt",
      "quantum-error-correction.json",
    ]
  );
  // Critical regression check: never appended to inert `document.body` outside `<dialog>`!
  assert.equal(appendedToBody.length, 0);
  assert.ok(clickedDownloads.every((d) => d.stoppedPropagation));
  assert.equal(controller.getExportCues()[0].startSec, 1.5);
  controller.destroy();
});

test("Neon Sync API /api/sync/export and /api/sync/export-all stream .srt/.vtt/.txt/.json file downloads", async () => {
  const db = await createDatabaseClient({ inMemory: true });
  const app = createSyncApp({
    dbPromise: Promise.resolve(db),
    encryptionSecret: "export-endpoint-test-secret",
  });

  try {
    const signup = await (
      await app.request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "exporter@lmsubs.dev",
          password: "exporter-password-123",
        }),
      })
    ).json();

    await app.request("http://localhost/api/sync/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signup.token}`,
      },
      body: JSON.stringify({
        subtitles: [
          {
            cacheKey: "artifact:exp-99",
            artifactId: "exp-99",
            title: "Distributed Consensus Deep Dive",
            language: "en",
            provider: "groq",
            cues: [{ index: 1, startSec: 2, endSec: 5.5, text: "Export endpoint verified." }],
          },
        ],
      }),
    });

    for (const fmt of ["srt", "vtt", "txt", "json"]) {
      const expRes = await app.request(
        `http://localhost/api/sync/export?cacheKey=artifact%3Aexp-99&format=${fmt}`,
        { headers: { Authorization: `Bearer ${signup.token}` } }
      );
      assert.equal(expRes.status, 200);
      assert.match(
        expRes.headers.get("content-disposition") || "",
        new RegExp(`distributed-consensus-deep-dive\\.${fmt}`)
      );
      const bodyText = await expRes.text();
      assert.ok(bodyText.includes("Export endpoint verified."));
    }

    const allRes = await app.request("http://localhost/api/sync/export-all", {
      headers: { Authorization: `Bearer ${signup.token}` },
    });
    assert.equal(allRes.status, 200);
    assert.match(allRes.headers.get("content-disposition") || "", /lm-subs-vault-.*\.json/);
    const allJson = await allRes.json();
    assert.equal(allJson.schema, "lm-subs-vault/v1");
    assert.equal(allJson.count, 1);
  } finally {
    await db.close();
  }
});

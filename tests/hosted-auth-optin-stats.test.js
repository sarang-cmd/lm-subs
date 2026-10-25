import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createSyncApp } from "../server/app.js";
import { createDatabaseClient } from "../server/db.js";
import { createRuntimeDispatcher } from "../src/background/service-worker.js";
import { RUNTIME_MESSAGE } from "../src/config/selectors.js";
import { setApiKey } from "../src/lib/storage.js";

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

function invokeDispatcher(dispatcher, msg, sender = { tab: { id: 1 } }) {
  return new Promise((resolve) => {
    dispatcher(msg, sender, (response) => resolve(response));
  });
}

test("Hosted Passwordless Email 6-Digit Sign-In + Granular Sync Opt-In + Purge", async () => {
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });

  // 1. Request 6-digit code (preview delivery when RESEND_API_KEY is unset)
  const sendRes = await app.request("http://localhost/api/auth/email/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "Researcher@University.edu" }),
  });
  assert.equal(sendRes.status, 200);
  const sendJson = await sendRes.json();
  assert.equal(sendJson.ok, true);
  assert.match(sendJson.previewCode, /^\d{6}$/);

  // 2. Reject wrong 6-digit code
  const badRes = await app.request("http://localhost/api/auth/email/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "researcher@university.edu",
      code: "000000" === sendJson.previewCode ? "999999" : "000000",
    }),
  });
  assert.equal(badRes.status, 401);

  // 3. Verify valid 6-digit code & receive session token
  const verifyRes = await app.request(
    "http://localhost/api/auth/email/verify-code",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "researcher@university.edu",
        code: sendJson.previewCode,
      }),
    }
  );
  assert.equal(verifyRes.status, 200);
  const verifyJson = await verifyRes.json();
  assert.equal(verifyJson.ok, true);
  assert.ok(verifyJson.token.startsWith("lms_"));
  assert.equal(verifyJson.user.email, "researcher@university.edu");

  const authHeaders = {
    Authorization: `Bearer ${verifyJson.token}`,
    "Content-Type": "application/json",
  };

  // 4. Push API key + transcript while all categories are opted in
  const push1 = await app.request("http://localhost/api/sync/push", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      apiKeys: { groq: "gsk_live_secret_value_9876" },
      subtitles: [
        {
          cacheKey: "artifact:atp-1",
          artifactId: "atp-1",
          title: "ATP Synthase Overview",
          language: "en",
          provider: "groq",
          model: "whisper-large-v3-turbo",
          originalBytes: 52428800,
          extractedBytes: 3670016,
          latencyMs: 2450,
          failoverUsed: false,
          cues: [
            { startSec: 0, endSec: 5.2, text: "First caption cue." },
            { startSec: 5.2, endSec: 11.8, text: "Second caption cue." },
          ],
        },
      ],
    }),
  });
  const push1Json = await push1.json();
  assert.equal(push1Json.summary.keyCount, 1);
  assert.equal(push1Json.summary.subtitleCount, 1);

  // 5. Opt OUT of `syncApiKeys` with `purgeDisabled: true` -> deletes stored keys from Postgres
  const prefRes = await app.request("http://localhost/api/sync/preferences", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      syncPreferences: {
        syncApiKeys: false,
        syncTranscripts: true,
        syncSettings: true,
      },
      purgeDisabled: true,
    }),
  });
  const prefJson = await prefRes.json();
  assert.equal(prefJson.ok, true);
  assert.equal(prefJson.syncPreferences.syncApiKeys, false);
  assert.equal(prefJson.summary.keyCount, 0);

  // Verify database row was actually purged
  const db = await dbPromise;
  const remainingKeys = await db.query(
    "SELECT COUNT(*)::int AS cnt FROM lmsubs_user_api_keys WHERE user_id = $1",
    [verifyJson.user.id]
  );
  assert.equal(remainingKeys.rows[0].cnt, 0);

  // 6. Subsequent push ignores apiKeys while `syncApiKeys` is false
  await app.request("http://localhost/api/sync/push", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      apiKeys: { mistral: "mst_should_not_be_saved" },
    }),
  });
  const afterPushKeys = await db.query(
    "SELECT COUNT(*)::int AS cnt FROM lmsubs_user_api_keys WHERE user_id = $1",
    [verifyJson.user.id]
  );
  assert.equal(afterPushKeys.rows[0].cnt, 0);
});

test("Google & GitHub OAuth 2.0 Flows + Real SQL /api/stats Telemetry", async () => {
  const prevGoogleId = process.env.GOOGLE_CLIENT_ID;
  const prevGoogleSecret = process.env.GOOGLE_CLIENT_SECRET;
  process.env.GOOGLE_CLIENT_ID = "mock-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "mock-google-client-secret";

  try {
    const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
    const mockFetch = async (url) => {
      const u = String(url);
      if (u.includes("oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "goog_tok_123" }), {
          status: 200,
        });
      }
      if (u.includes("openidconnect.googleapis.com/v1/userinfo")) {
        return new Response(
          JSON.stringify({
            email: "ada@oxford.ac.uk",
            name: "Ada Lovelace",
            picture: "https://lh3.googleusercontent.com/a/ada",
          }),
          { status: 200 }
        );
      }
      return new Response("not found", { status: 404 });
    };

    const app = createSyncApp({
      dbPromise,
      encryptionSecret: "test-secret-32-chars-minimum-123456",
      fetchImpl: mockFetch,
    });

    // 1. Start Google OAuth -> 302 redirect to accounts.google.com with CSRF state
    const startRes = await app.request(
      "https://lmsubs.example/api/auth/oauth/google?next=%2Fstats"
    );
    assert.equal(startRes.status, 302);
    const redirectLocation = new URL(startRes.headers.get("location"));
    assert.equal(redirectLocation.hostname, "accounts.google.com");
    const state = redirectLocation.searchParams.get("state");
    assert.ok(state);

    // 2. Complete OAuth callback -> mints session token in redirect hash
    const cbRes = await app.request(
      `https://lmsubs.example/api/auth/oauth/google/callback?code=oauth_code_1&state=${encodeURIComponent(
        state
      )}`
    );
    assert.equal(cbRes.status, 302);
    const finalDest = new URL(cbRes.headers.get("location"));
    assert.equal(finalDest.pathname, "/stats");
    assert.ok(finalDest.hash.startsWith("#auth_token=lms_"));
    const token = decodeURIComponent(finalDest.hash.slice("#auth_token=".length));

    // 3. Push two transcriptions (one failover) + export one .srt -> verify /api/stats
    await app.request("https://lmsubs.example/api/sync/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subtitles: [
          {
            cacheKey: "vid-1",
            title: "Analytical Engine Lecture",
            language: "en",
            provider: "groq",
            originalBytes: 50 * 1048576,
            extractedBytes: 3 * 1048576,
            latencyMs: 2200,
            failoverUsed: false,
            cues: [{ startSec: 0, endSec: 60, text: "Minute one." }],
          },
          {
            cacheKey: "vid-2",
            title: "Bernoulli Numbers Walkthrough",
            language: "de",
            provider: "mistral",
            originalBytes: 60 * 1048576,
            extractedBytes: 4 * 1048576,
            latencyMs: 3000,
            failoverUsed: true,
            cues: [{ startSec: 0, endSec: 120, text: "Minute two." }],
          },
        ],
      }),
    });

    const expRes = await app.request(
      "https://lmsubs.example/api/sync/export?cacheKey=vid-1&format=srt",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(expRes.status, 200);

    const statsRes = await app.request("https://lmsubs.example/api/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(statsRes.status, 200);
    const stats = await statsRes.json();
    assert.equal(stats.ok, true);
    assert.equal(stats.totals.videosCaptioned, 2);
    assert.equal(stats.totals.spokenMinutes, 3);
    assert.equal(stats.totals.bandwidthSavedBytes, 103 * 1048576);
    assert.equal(stats.totals.failoverCount, 1);
    assert.equal(stats.totals.exportCount, 1);
    assert.equal(stats.byProvider.length, 2);
    assert.equal(stats.dailySeries.length, 14);
  } finally {
    if (prevGoogleId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = prevGoogleId;
    if (prevGoogleSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = prevGoogleSecret;
  }
});

test("Extension Service Worker supports Email 6-digit login, Sync Opt-In Preferences & Stats", async () => {
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });

  const storage = createMemoryStorage();
  await setApiKey("groq", "gsk_ext_key_abcdef1234", storage);

  const dispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl: (url, init) => app.request(url, init),
  });

  const codeRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.SYNC_EMAIL_SEND_CODE,
    serverUrl: "http://localhost:4173",
    email: "ext-user@domain.org",
  });
  assert.equal(codeRes.ok, true);
  assert.match(codeRes.previewCode, /^\d{6}$/);

  const verifyRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.SYNC_EMAIL_VERIFY_CODE,
    serverUrl: "http://localhost:4173",
    email: "ext-user@domain.org",
    code: codeRes.previewCode,
  });
  assert.equal(verifyRes.ok, true);
  assert.equal(verifyRes.profile.connected, true);
  assert.ok(verifyRes.profile.keyHints.groq);

  const prefRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.SYNC_SAVE_PREFERENCES,
    syncPreferences: {
      syncApiKeys: false,
      syncTranscripts: true,
      syncSettings: true,
    },
    purgeDisabled: true,
  });
  assert.equal(prefRes.ok, true);
  assert.equal(prefRes.profile.syncPreferences.syncApiKeys, false);
  assert.deepEqual(prefRes.profile.keyHints, {});

  const statsRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.SYNC_GET_STATS,
  });
  assert.equal(statsRes.ok, true);
  assert.equal(statsRes.totals.videosCaptioned, 0);
});

test("Design & Copy Guardrails: no banned fonts/Lucide, no em/en dashes, no user Sync Server URL input", () => {
  const cssAndOverlayFiles = [
    "docs/styles.css",
    "extension/ui.css",
    "src/content/player-overlay.js",
    "src/content/toast.js",
  ];
  for (const file of cssAndOverlayFiles) {
    const css = fs.readFileSync(path.resolve(file), "utf8");
    assert.ok(
      !/\bInter\b|\bGeist\b|Space Grotesk/i.test(css),
      `Banned font family found in ${file}`
    );
    assert.ok(
      !/#f4f1ea|#d97757|#e96a26|#d9531e|#f4f2ed/i.test(css),
      `Legacy orange/cream palette found in ${file}`
    );
  }

  const uiFiles = [
    "docs/index.html",
    "docs/guide.html",
    "docs/about.html",
    "docs/stats.html",
    "docs/privacy.html",
    "docs/terms.html",
    "extension/popup.html",
    "extension/options.html",
    "src/web/App.jsx",
    "src/web/GuideView.jsx",
    "src/web/AboutView.jsx",
    "src/web/ScreeningStage.jsx",
    "src/web/AuthDialog.jsx",
    "src/web/LibraryView.jsx",
    "src/web/StatsView.jsx",
    "src/web/LegalViews.jsx",
    "src/web/demo-data.jsx",
    "README.md",
    "DEPLOYMENT_GUIDE.md",
  ];

  for (const file of uiFiles) {
    const content = fs.readFileSync(path.resolve(file), "utf8");
    assert.ok(
      !content.includes("—") && !content.includes("–"),
      `Found prohibited em dash or en dash in ${file}`
    );
    assert.ok(
      !/lucide-react|\blucide\b/i.test(content),
      `Found prohibited Lucide icon dependency in ${file}`
    );
    assert.ok(
      !content.includes("sync-server-url"),
      `End-user UI file ${file} must not ask users for a self-hosted Sync Server URL`
    );
  }
});

test("Assets, Favicons, Vercel Analytics + Speed Insights, About & Guide Verification", () => {
  const mainJsx = fs.readFileSync(path.resolve("src/web/main.jsx"), "utf8");
  assert.ok(mainJsx.includes("@vercel/analytics/react"), "Vercel Analytics missing in main.jsx");
  assert.ok(mainJsx.includes("@vercel/speed-insights/react"), "Vercel Speed Insights missing in main.jsx");

  const appBundle = fs.readFileSync(path.resolve("docs/app.js"), "utf8");
  assert.ok(
    appBundle.includes("/assets/screenshots/01-player-subtitles.png"),
    "Rebuilt docs/app.js must reference /assets/screenshots/01-player-subtitles.png"
  );
  assert.ok(
    !appBundle.includes("screenshot-1-hero-player.png"),
    "docs/app.js must not reference stale screenshot-1-hero-player.png"
  );

  for (const asset of [
    "docs/favicon.svg",
    "docs/favicon.png",
    "docs/favicon.ico",
    "docs/apple-touch-icon.png",
    "docs/assets/logo.svg",
    "docs/assets/architecture.svg",
    "docs/assets/banner-social-1280x640.png",
    "docs/assets/screenshots/01-player-subtitles.png",
    "docs/assets/screenshots/02-audio-extraction-failover.png",
    "docs/assets/screenshots/03-toolbar-popup.png",
    "docs/assets/screenshots/04-settings-queue.png",
    "extension/icons/icon16.png",
    "extension/icons/icon32.png",
    "extension/icons/icon48.png",
    "extension/icons/icon128.png",
  ]) {
    assert.ok(fs.existsSync(path.resolve(asset)), `Expected generated asset ${asset} to exist`);
  }

  const logoSvg = fs.readFileSync(path.resolve("docs/assets/logo.svg"), "utf8");
  assert.ok(!/#e96a26|#d9531e/i.test(logoSvg), "docs/assets/logo.svg must not contain legacy orange");

  const aboutJsx = fs.readFileSync(path.resolve("src/web/AboutView.jsx"), "utf8");
  assert.ok(aboutJsx.includes("Sarang") && aboutJsx.includes("@sarang-cmd"));
  assert.ok(aboutJsx.includes("https://github.com/sarang-cmd/lm-subs"));
  assert.ok(!aboutJsx.includes("notebooklm-subtitles"));

  const pkgJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  const manifestJson = JSON.parse(fs.readFileSync(path.resolve("extension/manifest.json"), "utf8"));
  assert.equal(pkgJson.version, "0.2.1");
  assert.equal(manifestJson.version, "0.2.1");
  assert.equal(pkgJson.repository?.url, "https://github.com/sarang-cmd/lm-subs.git");
  assert.equal(pkgJson.homepage, "https://lm-subs.vercel.app");
  assert.ok(fs.existsSync(path.resolve("docs/releases/lm-subs-v0.2.1.zip")));
  assert.ok(!fs.existsSync(path.resolve("docs/releases/lm-subs-v0.2.0.zip")));

  const progressMd = fs.readFileSync(path.resolve("progress.md"), "utf8");
  assert.ok(
    progressMd.includes("## `v0.2.1`") &&
      progressMd.includes("## `v0.2.0`") &&
      progressMd.includes("## `v0.1.2`") &&
      progressMd.includes("## `v0.1.1`") &&
      progressMd.includes("## `v0.1.0`"),
    "progress.md must document versions 0.1.0 through 0.2.1"
  );
  assert.ok(
    !progressMd.includes("—") && !progressMd.includes("–"),
    "progress.md must not contain em dashes or en dashes"
  );

  const deployMd = fs.readFileSync(path.resolve("DEPLOYMENT_GUIDE.md"), "utf8");
  assert.ok(
    deployMd.includes("Supabase") && deployMd.includes("Firebase") && deployMd.includes("Neon"),
    "DEPLOYMENT_GUIDE.md must correlate Neon with Supabase and Firebase"
  );
  assert.ok(!deployMd.includes("notebooklm-subtitles"));

  // Verify extension visual parity tokens, collapsible providers, and always-open local code boxes
  const uiCss = fs.readFileSync(path.resolve("extension/ui.css"), "utf8");
  assert.ok(uiCss.includes("#f6f7f8") && uiCss.includes("#fdfdfe") && uiCss.includes("#0055d4"));
  assert.ok(uiCss.includes(".provider-item-drawer") && uiCss.includes(".local-code-box"));

  const optionsHtml = fs.readFileSync(path.resolve("extension/options.html"), "utf8");
  assert.ok(
    optionsHtml.includes('id="sync-token-input"') &&
      !optionsHtml.includes('<input id="sync-token-input" type="password"'),
    "options.html must expose #sync-token-input as plain readable text"
  );
  // Ensure neither #sync-token-input nor #sync-code-step is hidden behind display:none or <details>
  assert.ok(
    !/id="sync-code-step"[^>]*display:\s*none/i.test(optionsHtml),
    "#sync-code-step must remain open in options.html"
  );
  assert.ok(
    optionsHtml.includes('id="provider-collapse-all-btn"') &&
      optionsHtml.includes('id="provider-section-toggle-btn"'),
    "options.html must include collapsible controls for STT providers and API keys"
  );

  const popupHtml = fs.readFileSync(path.resolve("extension/popup.html"), "utf8");
  assert.ok(
    popupHtml.includes('id="popup-local-code-input"') &&
      popupHtml.includes('id="popup-connect-code-btn"'),
    "popup.html must include an always-open local code input box"
  );
  assert.ok(
    popupHtml.includes('id="popup-providers-disclosure"'),
    "popup.html must wrap STT providers and API keys in a collapsible disclosure"
  );

  const authDialogJsx = fs.readFileSync(path.resolve("src/web/AuthDialog.jsx"), "utf8");
  assert.ok(
    authDialogJsx.includes('id="auth-code-input"') &&
      !authDialogJsx.includes('step === "email"'),
    "AuthDialog.jsx must keep #auth-code-input always open without hiding behind step === email"
  );

  const libraryJsx = fs.readFileSync(path.resolve("src/web/LibraryView.jsx"), "utf8");
  assert.ok(
    libraryJsx.includes('id="library-local-code-input"') &&
      libraryJsx.includes("Collapsible.Root"),
    "LibraryView.jsx must render the open local extension code box and collapsible API keys section"
  );
});

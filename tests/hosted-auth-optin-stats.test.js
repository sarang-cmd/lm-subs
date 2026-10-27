import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createSyncApp } from "../server/app.js";
import { createDatabaseClient } from "../server/db.js";
import {
  createRuntimeDispatcher,
  installBackgroundAutomation,
} from "../src/background/service-worker.js";
import { ALARM_NAMES, RUNTIME_MESSAGE } from "../src/config/selectors.js";
import { createToastManager } from "../src/content/toast.js";
import { VideoSubtitleController } from "../src/content/player-overlay.js";
import { LM_SUBS_LOGO_DATA_URI, createBrandLogoElement } from "../src/lib/brand-logo.js";
import {
  buildChimeWavBytes,
  getChimeWavDataUri,
  playCompletionChimeSound,
} from "../src/lib/chime.js";
import { PROJECT_STATS } from "../src/lib/project-stats.js";
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  setApiKey,
} from "../src/lib/storage.js";
import { extractZipArchive } from "../src/lib/unpacked-updater.js";

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
    "src/web/NotificationCenter.jsx",
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
  // ProductShot serves WebP first with a PNG fallback, so the bundle carries
  // both extensions under one extension-less base path.
  // ProductShot builds the URL as `${src}.webp?v=10`, so the bundle carries the
  // extension-less base path and the two extensions separately.
  assert.ok(
    appBundle.includes("/assets/screenshots/01-player-subtitles"),
    "Rebuilt docs/app.js must reference the player screenshot"
  );
  assert.ok(
    appBundle.includes(".webp?v=10") && appBundle.includes(".png?v=10"),
    "docs/app.js must serve WebP with a PNG fallback"
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
    "docs/assets/screenshots/02-statistics-dashboard.png",
    "docs/assets/screenshots/03-toolbar-popup.png",
    "docs/assets/screenshots/04-settings-statistics.png",
    "docs/assets/screenshots/05-fine-grained-controls.png",
    "docs/assets/screenshots/06-api-key-guide.png",
    "docs/assets/screenshots/07-blog-article.png",
    "docs/assets/screenshots/08-docked-fine-controls.png",
    "docs/assets/screenshots/09-welcome-install-page.png",
    "docs/blog/index.html",
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
  assert.equal(pkgJson.version, "0.2.8");
  assert.equal(manifestJson.version, "0.2.8");
  assert.equal(pkgJson.repository?.url, "https://github.com/sarang-cmd/lm-subs.git");
  assert.equal(pkgJson.homepage, "https://lm-subs.vercel.app");
  assert.ok(fs.existsSync(path.resolve("docs/releases/lm-subs-v0.2.8.zip")));
  assert.ok(fs.existsSync(path.resolve("docs/releases/lm-subs-latest.zip")));
  assert.ok(fs.existsSync(path.resolve("docs/releases/latest.json")));
  assert.ok(!fs.existsSync(path.resolve("docs/releases/lm-subs-v0.2.4.zip")));
  assert.ok(!fs.existsSync(path.resolve("docs/releases/lm-subs-v0.2.3.zip")));
  assert.ok(!fs.existsSync(path.resolve("docs/releases/lm-subs-v0.2.2.zip")));
  assert.ok(!fs.existsSync(path.resolve("docs/releases/lm-subs-v0.2.1.zip")));
  assert.ok(!fs.existsSync(path.resolve("docs/releases/lm-subs-v0.2.0.zip")));

  const progressMd = fs.readFileSync(path.resolve("progress.md"), "utf8");
  assert.ok(
    progressMd.includes("## `v0.2.4`") &&
      progressMd.includes("## `v0.2.3`") &&
      progressMd.includes("## `v0.2.2`") &&
      progressMd.includes("## `v0.2.1`") &&
      progressMd.includes("## `v0.2.0`") &&
      progressMd.includes("## `v0.1.2`") &&
      progressMd.includes("## `v0.1.1`") &&
      progressMd.includes("## `v0.1.0`"),
    "progress.md must document versions 0.1.0 through 0.2.4"
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

  assert.deepEqual(manifestJson.permissions, [
    "storage",
    "notifications",
    "alarms",
    "activeTab",
  ]);
});

test("Notifications Center, Desktop OS Alerts, Toolbar Badge, Inline Cue Editor, and Markdown Study Notes", async () => {
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });

  // 1. Authenticate user
  const sendRes = await app.request("http://localhost/api/auth/email/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alerts@university.edu" }),
  });
  const { previewCode } = await sendRes.json();
  const verifyRes = await app.request("http://localhost/api/auth/email/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alerts@university.edu", code: previewCode }),
  });
  const { token } = await verifyRes.json();
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 2. Push a new subtitle and verify unread cloud notification is created
  const pushRes = await app.request("http://localhost/api/sync/push", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      subtitles: [
        {
          cacheKey: "art:notif-test-1",
          artifactId: "notif-test-1",
          title: "Distributed Systems Overview",
          language: "en",
          provider: "groq",
          model: "whisper-large-v3-turbo",
          failoverUsed: true,
          originalBytes: 34_000_000,
          extractedBytes: 2_800_000,
          latencyMs: 2400,
          cues: [
            { startSec: 1.0, endSec: 4.5, text: "Consensus requires quorum intersection." },
            { startSec: 5.0, endSec: 9.2, text: "State machine replication orders client commands." },
          ],
        },
      ],
    }),
  });
  assert.equal(pushRes.status, 200);

  const notifRes1 = await app.request("http://localhost/api/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(notifRes1.status, 200);
  const notifJson1 = await notifRes1.json();
  assert.equal(notifJson1.ok, true);
  assert.ok(notifJson1.unreadCount >= 1);
  assert.ok(
    notifJson1.notifications.some(
      (n) => n.kind === "ready" && n.title.includes("Distributed Systems Overview")
    )
  );

  // 3. Edit cues inline via PUT /api/sync/subtitle and export .md study notes
  const editRes = await app.request("http://localhost/api/sync/subtitle", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      cacheKey: "art:notif-test-1",
      title: "Distributed Systems Overview (Edited)",
      cues: [
        { startSec: 1.0, endSec: 4.5, text: "Paxos and Raft rely on majority quorums." },
        { startSec: 5.0, endSec: 9.2, text: "State machine replication orders client commands." },
      ],
    }),
  });
  assert.equal(editRes.status, 200);
  const editJson = await editRes.json();
  assert.equal(editJson.entry.title, "Distributed Systems Overview (Edited)");
  assert.equal(editJson.entry.cues[0].text, "Paxos and Raft rely on majority quorums.");

  const mdExportRes = await app.request(
    "http://localhost/api/sync/export?cacheKey=art:notif-test-1&format=md",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  assert.equal(mdExportRes.status, 200);
  const mdText = await mdExportRes.text();
  assert.ok(mdText.includes("# Distributed Systems Overview (Edited)"));
  assert.ok(mdText.includes("Paxos and Raft rely on majority quorums."));

  // 4. Mark cloud notifications read and clear
  const markReadRes = await app.request("http://localhost/api/notifications/read", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ all: true }),
  });
  const markReadJson = await markReadRes.json();
  assert.equal(markReadJson.unreadCount, 0);

  const clearNotifRes = await app.request("http://localhost/api/notifications", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const clearNotifJson = await clearNotifRes.json();
  assert.equal(clearNotifJson.notifications.length, 0);

  // 5. Extension runtime dispatcher: toolbar badge + desktop OS alert + UPDATE_CACHED_SUBTITLES
  const extStorage = createMemoryStorage();
  await setApiKey("groq", "gsk_ext_notif_test_key_12345", extStorage);

  const badgeTexts = [];
  const osAlerts = [];
  const tabMessages = [];

  const dispatcher = createRuntimeDispatcher({
    storageArea: extStorage,
    actionApi: {
      setBadgeText: async ({ text }) => badgeTexts.push(text),
      setBadgeBackgroundColor: async () => {},
    },
    notificationsApi: {
      create: (id, opts, cb) => {
        osAlerts.push({ id, opts });
        cb?.(id);
      },
    },
    permissionsApi: {
      contains: async ({ permissions }) =>
        Array.isArray(permissions) && permissions.includes("notifications")
          ? true
          : true,
    },
    tabsApi: {
      sendMessage: (tabId, payload, cb) => {
        tabMessages.push({ tabId, payload });
        cb?.({ ok: false });
      },
    },
    fetchImpl: async (url) => {
      const u = String(url);
      if (u.includes("googleusercontent.com")) {
        const buf = new Uint8Array(2048).fill(7);
        return new Response(buf, {
          status: 200,
          headers: {
            "content-type": "audio/mp4",
            "content-length": "2048",
          },
        });
      }
      if (u.includes("api.groq.com")) {
        return new Response(
          JSON.stringify({
            text: "Hello world.",
            segments: [{ start: 0.5, end: 2.5, text: "Hello world." }],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      throw new Error(`Unexpected URL: ${u}`);
    },
  });

  const ensureRes = await invokeDispatcher(
    dispatcher,
    {
      type: RUNTIME_MESSAGE.ENSURE_SUBTITLES,
      artifact: {
        artifactId: "99999999-aaaa-4bbb-8ccc-111111111111",
        title: "Quantum Computing Overview",
        mediaUrl: "https://lh3.googleusercontent.com/notebooklm/ABzcNotifToken=m140",
      },
    },
    { tab: { id: 42 } }
  );
  assert.equal(ensureRes.ok, true);
  assert.ok(badgeTexts.includes("..."), "Toolbar badge should display '...' during transcription");
  assert.equal(badgeTexts.at(-1), "1", "Toolbar badge should show unread count '1' on completion");
  assert.equal(osAlerts.length, 1, "OS desktop notification should fire when permitted");
  assert.ok(osAlerts[0].opts.title.includes("Quantum Computing Overview"));
  assert.equal(
    osAlerts[0].opts.iconUrl,
    "icons/icon128.png",
    "OS desktop notification must include the LM Subs 128px logo icon"
  );
  assert.ok(
    tabMessages.some((m) => m.tabId === 42 && m.payload.type === RUNTIME_MESSAGE.SUBTITLES_READY),
    "Background worker should notify originating tab via SUBTITLES_READY"
  );

  // Verify brand logo presence across Web NotificationCenter, Manifest web_accessible_resources, and In-Page Shadow Toast
  const notifCenterSrc = fs.readFileSync(
    path.resolve("src/web/NotificationCenter.jsx"),
    "utf8"
  );
  assert.ok(
    notifCenterSrc.includes('icon: "/assets/icon-128.png"') &&
      notifCenterSrc.includes('src="/assets/logo.svg"'),
    "NotificationCenter.jsx must render /assets/logo.svg and pass /assets/icon-128.png to OS notifications"
  );

  const manifestJson = JSON.parse(
    fs.readFileSync(path.resolve("extension/manifest.json"), "utf8")
  );
  assert.ok(
    manifestJson.web_accessible_resources?.[0]?.resources?.includes("icons/icon128.png"),
    "manifest.json must expose icons/icon128.png to NotebookLM origins for tab OS notifications"
  );
  assert.ok(LM_SUBS_LOGO_DATA_URI.startsWith("data:image/svg+xml;utf8,"));

  // Verify Trusted-Types-safe toast mounts the LM Subs squircle SVG logo inside closed ShadowRoot
  const shadowNodes = [];
  const makeNode = (tag) => {
    const attrs = {};
    const children = [];
    return {
      tagName: String(tag).toUpperCase(),
      style: {},
      dataset: {},
      attrs,
      children,
      set innerHTML(_v) {
        throw new Error("TrustedHTML violation: toast must never assign innerHTML");
      },
      setAttribute(k, v) {
        attrs[k] = String(v);
      },
      append(...items) {
        children.push(...items);
      },
      appendChild(item) {
        children.push(item);
        return item;
      },
      addEventListener() {},
      contains() {
        return true;
      },
      remove() {},
      attachShadow() {
        return {
          append(...items) {
            shadowNodes.push(...items);
          },
        };
      },
    };
  };
  const mockToastDoc = {
    body: makeNode("body"),
    getElementById: () => null,
    createElement: makeNode,
    createElementNS: (_ns, tag) => makeNode(tag),
  };
  const svgMark = createBrandLogoElement(mockToastDoc, { size: 26 });
  assert.equal(svgMark.tagName, "SVG");
  assert.equal(svgMark.children.length, 6);

  const toastMgr = createToastManager(mockToastDoc);
  toastMgr.show({
    title: "Subtitles ready (18 cues)",
    detail: "Groq · Video Overview",
    kind: "success",
    durationMs: 0,
  });
  const mountedToast = shadowNodes.find((n) => n.className === "toast");
  assert.ok(mountedToast, "Toast element must mount inside closed ShadowRoot");
  assert.equal(
    mountedToast.children[0].className,
    "logo-wrap",
    "Toast must lead with .logo-wrap containing the LM Subs brand mark"
  );
  assert.equal(mountedToast.children[0].children[0].tagName, "SVG");

  // Update cached subtitles via UPDATE_CACHED_SUBTITLES
  const updateCachedRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.UPDATE_CACHED_SUBTITLES,
    cacheKey: ensureRes.entry.cacheKey,
    title: "Quantum Computing Overview (Revised)",
    cues: [{ startSec: 0.5, endSec: 3.0, text: "Logical qubits suppress phase errors." }],
  });
  assert.equal(updateCachedRes.ok, true);
  assert.equal(updateCachedRes.entry.cues[0].text, "Logical qubits suppress phase errors.");

  // Mark extension notifications read -> toolbar badge clears to ""
  const markExtRead = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.MARK_NOTIFICATIONS_READ,
  });
  assert.equal(markExtRead.ok, true);
  assert.equal(badgeTexts.at(-1), "", "Toolbar badge should clear when notifications are marked read");
});

test("Automatic Extension Notifications, SHA-256 Verified Unpacked Folder Auto-Update, and Background Cloud Hot-Reload", async () => {
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });

  // 1. Verify /api/version and real release .zip extraction + CRC-32 check
  const verRes = await app.request("http://localhost:4173/api/version");
  assert.equal(verRes.status, 200);
  const verJson = await verRes.json();
  assert.equal(verJson.ok, true);
  assert.equal(verJson.version, "0.2.8");

  const realZipBytes = new Uint8Array(
    fs.readFileSync(path.resolve("docs/releases/lm-subs-latest.zip"))
  );
  const latestMeta = JSON.parse(
    fs.readFileSync(path.resolve("docs/releases/latest.json"), "utf8")
  );
  assert.equal(latestMeta.version, "0.2.8");
  assert.match(latestMeta.buildId, /^[0-9a-f]{12}$/);
  assert.match(latestMeta.zipSha256, /^[0-9a-f]{64}$/);

  const extractedFiles = await extractZipArchive(realZipBytes);
  assert.ok(extractedFiles.length >= 13);
  assert.ok(extractedFiles.some((f) => f.path === "manifest.json"));
  assert.ok(extractedFiles.some((f) => f.path === "icons/icon128.png"));

  // 2. Verify background alarm registration (update-check + cloud-sync)
  const createdAlarms = [];
  const extStorage = createMemoryStorage();
  const badges = [];
  const desktopAlerts = [];
  const tabBroadcasts = [];
  let reloadCalls = 0;
  let linkedDir = null;

  // Virtual FileSystemDirectoryHandle for testing zero-click unpacked folder auto-updates
  function createVirtualDir(name = "lm-subs", initialFiles = { "manifest.json": new Uint8Array([123, 125]) }) {
    const filesMap = new Map(Object.entries(initialFiles));
    const subDirs = new Map();
    return {
      name,
      filesMap,
      subDirs,
      async queryPermission() {
        return "granted";
      },
      async getFileHandle(fileName, { create = false } = {}) {
        if (!filesMap.has(fileName)) {
          if (!create) throw new Error(`ENOENT: ${fileName}`);
          filesMap.set(fileName, new Uint8Array(0));
        }
        return {
          name: fileName,
          async createWritable() {
            let pending = new Uint8Array(0);
            return {
              async write(data) {
                pending = data instanceof Uint8Array ? data : new Uint8Array(data);
              },
              async close() {
                filesMap.set(fileName, pending);
              },
            };
          },
        };
      },
      async getDirectoryHandle(dirName, { create = false } = {}) {
        if (!subDirs.has(dirName)) {
          if (!create) throw new Error(`ENOENT dir: ${dirName}`);
          subDirs.set(dirName, createVirtualDir(dirName, {}));
        }
        return subDirs.get(dirName);
      },
    };
  }

  const dispatcher = createRuntimeDispatcher({
    storageArea: extStorage,
    actionApi: {
      setBadgeText: async ({ text }) => badges.push(text),
      setBadgeBackgroundColor: async () => {},
    },
    notificationsApi: {
      create: (id, opts, cb) => {
        desktopAlerts.push({ id, opts });
        cb?.(id);
      },
    },
    tabsApi: {
      query: (_q, cb) => {
        const list = [{ id: 77 }];
        cb?.(list);
        return Promise.resolve(list);
      },
      sendMessage: (tabId, payload, cb) => {
        tabBroadcasts.push({ tabId, payload });
        cb?.({ ok: true });
      },
    },
    runtimeApi: {
      getManifest: () => ({ version: "0.2.1" }),
      getURL: (rel) => `icons/${rel.replace(/^icons\//, "")}`,
      reload: (/* sync test signature */ _flag) => {
        reloadCalls += 1;
      },
    },
    dirHandleLoader: async () => linkedDir,
    fetchImpl: async (url, init) => {
      const u = String(url);
      if (u.endsWith("/releases/latest.json")) {
        return new Response(JSON.stringify(latestMeta), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (u.endsWith("/releases/lm-subs-latest.zip")) {
        return new Response(realZipBytes, {
          status: 200,
          headers: { "content-type": "application/zip" },
        });
      }
      return app.request(u, init);
    },
  });

  installBackgroundAutomation(dispatcher, {
    alarmsApi: {
      create: (name, opts) => createdAlarms.push({ name, opts }),
      onAlarm: { addListener: () => {} },
    },
    runtimeApi: {
      onStartup: { addListener: () => {} },
      onInstalled: { addListener: () => {} },
      onUpdateAvailable: { addListener: () => {} },
    },
    notificationsApi: {
      onClicked: { addListener: () => {} },
    },
  });

  assert.ok(createdAlarms.some((a) => a.name === ALARM_NAMES.UPDATE_CHECK));
  assert.ok(createdAlarms.some((a) => a.name === ALARM_NAMES.CLOUD_SYNC));

  // 3. Unlinked folder: CHECK_FOR_UPDATES automatically sets 'UPD' badge and fires OS desktop alert with logo
  const checkUnlinked = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.CHECK_FOR_UPDATES,
  });
  assert.equal(checkUnlinked.ok, true);
  assert.equal(checkUnlinked.updateAvailable, true);
  assert.equal(checkUnlinked.autoApplied, false);
  assert.equal(badges.at(-1), "UPD");
  assert.equal(desktopAlerts.length, 1);
  assert.match(desktopAlerts[0].opts.title, /Update available: LM Subs v0\.2\.8/);
  assert.equal(desktopAlerts[0].opts.iconUrl, "icons/icon128.png");

  // 4. Linked unpacked folder: CHECK_FOR_UPDATES automatically verifies SHA-256, writes all files, notifies, and reloads!
  linkedDir = createVirtualDir("lm-subs");
  const checkLinked = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.CHECK_FOR_UPDATES,
  });
  assert.equal(checkLinked.ok, true);
  assert.equal(checkLinked.autoApplied, true);
  assert.equal(checkLinked.updateAvailable, false);
  assert.equal(reloadCalls, 1, "Extension must reload automatically after writing verified files");
  assert.ok(linkedDir.filesMap.has("background.js"));
  assert.ok(linkedDir.subDirs.get("icons")?.filesMap.has("icon128.png"));
  assert.match(desktopAlerts.at(-1).opts.title, /LM Subs updated automatically/);

  // 5. Sign in and verify BACKGROUND_SYNC_TICK automatically pulls remote captions, fires OS alert, and hot-reloads open NotebookLM tabs
  const sendRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.SYNC_EMAIL_SEND_CODE,
    serverUrl: "http://localhost:4173",
    email: "autoupdate@university.edu",
  });
  const verifyRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.SYNC_EMAIL_VERIFY_CODE,
    serverUrl: "http://localhost:4173",
    email: "autoupdate@university.edu",
    code: sendRes.previewCode,
  });
  assert.equal(verifyRes.ok, true);

  // Simulate another device pushing a new transcript directly to Cloud API
  const webSend = await app.request("http://localhost:4173/api/auth/email/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "autoupdate@university.edu" }),
  });
  const { previewCode: webCode } = await webSend.json();
  const webVerify = await app.request("http://localhost:4173/api/auth/email/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "autoupdate@university.edu", code: webCode }),
  });
  const { token: webToken } = await webVerify.json();

  await app.request("http://localhost:4173/api/sync/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${webToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subtitles: [
        {
          cacheKey: "art:remote-auto-1",
          artifactId: "remote-auto-1",
          title: "Topology Lecture",
          cues: [{ startSec: 0.5, endSec: 3.5, text: "Homeomorphisms preserve open sets." }],
        },
      ],
    }),
  });

  const alertsBeforeTick = desktopAlerts.length;
  const tickRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK,
  });
  assert.equal(tickRes.ok, true);
  assert.equal(
    desktopAlerts.length,
    alertsBeforeTick,
    "Background cloud sync must run quietly without firing OS desktop popup notifications"
  );
  assert.ok(
    tabBroadcasts.some(
      (b) =>
        b.tabId === 77 &&
        b.payload.type === RUNTIME_MESSAGE.SUBTITLES_UPDATED &&
        b.payload.entries.some((e) => e.cacheKey === "art:remote-auto-1")
    ),
    "Background cloud tick must still broadcast SUBTITLES_UPDATED to open NotebookLM tabs for live hot-reload"
  );

  // Second background tick with unchanged transcripts must NOT report false updates from push/pull timestamp echo
  const secondTickRes = await invokeDispatcher(dispatcher, {
    type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK,
  });
  assert.equal(secondTickRes.ok, true);
  const secondMerge = secondTickRes.sync?.syncRes?.mergeResult;
  assert.equal(secondMerge?.addedEntries?.length || 0, 0);
  assert.equal(
    secondMerge?.updatedEntries?.length || 0,
    0,
    "Unchanged synced transcripts must never trigger false updatedEntries on subsequent background ticks"
  );
  assert.equal(desktopAlerts.length, alertsBeforeTick);
});

test("Caption Studio Customizations, NotebookLM Study Controls, Split-Grid Overflow Fix, and Project Codebase Telemetry", async () => {
  // 1. Regression guard for options.html + ui.css split-grid button overflow bug
  const uiCss = fs.readFileSync(path.resolve("extension/ui.css"), "utf8");
  const optionsHtml = fs.readFileSync(path.resolve("extension/options.html"), "utf8");
  assert.match(uiCss, /\.ext-split\s*>\s*\*\s*\{[^}]*min-width:\s*0/s);
  assert.match(uiCss, /\.action-cluster\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(uiCss, /\.switch-row-item\s*>\s*:first-child\s*\{[^}]*min-width:\s*0/s);
  assert.ok(optionsHtml.includes('id="opt-caption-preview-stage"'));
  assert.ok(optionsHtml.includes('class="action-cluster"'));

  // 2. Storage round-trip for all new caption customization & playback fields
  const mem = createMemoryStorage();
  const saved = await saveSettings(
    {
      fontSize: "xxlarge",
      captionStyle: "amber",
      captionFontFamily: "dyslexic",
      captionColor: "yellow",
      captionBgOpacity: 65,
      captionPosition: "top",
      captionMaxWidth: "wide",
      karaokeHighlight: true,
      showSpeakerLabels: false,
      pauseOnCaptionHover: true,
      clickCaptionToCopy: true,
      defaultPlaybackSpeed: 1.5,
    },
    mem
  );
  assert.equal(saved.fontSize, "xxlarge");
  assert.equal(saved.captionStyle, "amber");
  assert.equal(saved.captionFontFamily, "dyslexic");
  assert.equal(saved.captionColor, "yellow");
  assert.equal(saved.captionBgOpacity, 65);
  assert.equal(saved.captionPosition, "top");
  assert.equal(saved.captionMaxWidth, "wide");
  assert.equal(saved.karaokeHighlight, true);
  assert.equal(saved.defaultPlaybackSpeed, 1.5);
  const loaded = await getSettings(mem);
  assert.equal(loaded.captionStyle, "amber");
  assert.equal(loaded.captionPosition, "top");

  // 3. VideoSubtitleController: live styler, karaoke word highlight, cue loop, cue jump, bookmark, speed, chapters
  function makeMockNode(tag) {
    const el = {
      tagName: String(tag).toUpperCase(),
      className: "",
      dataset: {},
      style: {},
      children: [],
      textContent: "",
      value: "",
      firstChild: null,
      appendChild(child) {
        this.children.push(child);
        this.firstChild = this.children[0] || null;
        return child;
      },
      append(...nodes) {
        for (const n of nodes) this.appendChild(n);
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
        this.firstChild = this.children[0] || null;
      },
      remove() {},
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      querySelector() {
        return null;
      },
      attachShadow() {
        return makeMockNode("shadow");
      },
    };
    return el;
  }

  const mockDoc = {
    createElement: (t) => makeMockNode(t),
    createTextNode: (txt) => ({ nodeType: 3, textContent: txt }),
    body: makeMockNode("body"),
  };
  const parent = makeMockNode("div");
  const mockVideo = {
    parentElement: parent,
    currentTime: 1.5,
    paused: false,
    playbackRate: 1,
    addEventListener() {},
    removeEventListener() {},
  };

  let mutatedCues = null;
  let lastStylePatch = null;
  const ctrl = new VideoSubtitleController(mockVideo, {
    doc: mockDoc,
    initialFontSize: "xlarge",
    initialCaptionStyle: "paper",
    initialFontFamily: "serif",
    initialCaptionColor: "yellow",
    initialBgOpacity: 75,
    initialCaptionPosition: "raised",
    initialKaraokeHighlight: true,
    initialPlaybackSpeed: 1.25,
    onStylePatchChange: (p) => {
      lastStylePatch = p;
    },
    onCuesMutated: (cues) => {
      mutatedCues = cues;
    },
  });

  ctrl.setCues(
    [
      { startSec: 0, endSec: 4, text: "First spoken technical sentence." },
      { startSec: 5, endSec: 9, text: "Second spoken technical sentence." },
      { startSec: 70, endSec: 75, text: "Next chapter opening sentence." },
    ],
    { title: "Study Demo" }
  );

  assert.equal(mockVideo.playbackRate, 1.25);
  assert.equal(ctrl.stageEl.dataset.pos, "raised");
  assert.equal(ctrl.captionBox.dataset.style, "paper");
  assert.ok(
    ctrl.captionBox.children.some((c) => c.className === "caption-word-done"),
    "Karaoke word highlight must progressively mark spoken words"
  );

  // Cycle playback speed -> 1.5x
  assert.equal(ctrl.cyclePlaybackSpeed(1), 1.5);
  assert.equal(mockVideo.playbackRate, 1.5);
  assert.deepEqual(lastStylePatch, { defaultPlaybackSpeed: 1.5 });

  // Jump to next cue (K) & toggle single-sentence loop (L)
  ctrl.seekRelativeCue(1);
  assert.ok(mockVideo.currentTime >= 5);
  assert.equal(ctrl.toggleCueLoop(), true);
  mockVideo.currentTime = 9.2;
  ctrl._enforceCueLoop();
  assert.ok(mockVideo.currentTime < 5.5, "Cue loop must rewind to start of looped sentence");

  // Bookmark active cue (M) -> persists via onCuesMutated
  assert.equal(ctrl.toggleBookmarkActiveCue(), true);
  assert.equal(mutatedCues[1].bookmarked, true);

  // Open Transcript Drawer & switch to Smart Chapters tab
  ctrl.toggleTranscriptDrawer(true);
  ctrl._setDrawerTab("chapters");
  assert.ok(
    ctrl.drawerListEl.children.some((c) => c.className === "chapter-row"),
    "Chapters tab must render clickable smart chapter rows"
  );

  // Toggle Style Studio popover
  assert.equal(ctrl.toggleStylePopover(), true);
  assert.equal(ctrl.drawerOpen, false, "Opening Style popover closes Transcript drawer cleanly");
  ctrl.destroy();

  // 4. Verify real machine-counted PROJECT_STATS for /about
  assert.equal(PROJECT_STATS.version, "0.2.8");
  assert.ok(PROJECT_STATS.totalLoc > 25000, "PROJECT_STATS must reflect real repository LOC");
  assert.ok(PROJECT_STATS.nonBlankLoc > 20000);
  assert.ok(PROJECT_STATS.sourceFiles >= 40);
  assert.equal(PROJECT_STATS.subsystems.length, 7);
  assert.ok(PROJECT_STATS.automatedTests >= 50);
  assert.equal(PROJECT_STATS.exportFormats, 6);
  const aboutSrc = fs.readFileSync(path.resolve("src/web/AboutView.jsx"), "utf8");
  assert.ok(aboutSrc.includes("PROJECT_STATS") && aboutSrc.includes("Project and codebase metrics"));
});

test("v0.2.4: Bottom play-bar controls, 3-state word highlight delay (karaokeDelayMs), and audible RIFF WAV chime", async () => {
  // 1. Default settings turn on highlighted captions with 0 ms delay; karaokeDelayMs persists & clamps
  assert.equal(DEFAULT_SETTINGS.karaokeHighlight, true);
  assert.equal(DEFAULT_SETTINGS.karaokeDelayMs, 0);

  const mem = createMemoryStorage();
  const saved = await saveSettings({ karaokeDelayMs: 350 }, mem);
  assert.equal(saved.karaokeDelayMs, 350);
  const clampedHigh = await saveSettings({ karaokeDelayMs: 9900 }, mem);
  assert.equal(clampedHigh.karaokeDelayMs, 3000);
  const clampedLow = await saveSettings({ karaokeDelayMs: -9900 }, mem);
  assert.equal(clampedLow.karaokeDelayMs, -1500);

  // 2. Verify compact bottom play-bar pill + secondary tools popover + word-highlight delay timing
  function makeNode(tag) {
    return {
      tagName: String(tag).toUpperCase(),
      className: "",
      dataset: {},
      style: {},
      children: [],
      textContent: "",
      value: "",
      firstChild: null,
      appendChild(child) {
        this.children.push(child);
        this.firstChild = this.children[0] || null;
        return child;
      },
      append(...nodes) {
        for (const n of nodes) this.appendChild(n);
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
        this.firstChild = this.children[0] || null;
      },
      remove() {},
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      querySelector() {
        return null;
      },
      attachShadow() {
        return makeNode("shadow");
      },
    };
  }

  const mockDoc = {
    createElement: (t) => makeNode(t),
    createTextNode: (txt) => ({ nodeType: 3, textContent: txt }),
    body: makeNode("body"),
  };
  const parent = makeNode("div");
  const mockVideo = {
    parentElement: parent,
    currentTime: 0.4,
    paused: false,
    playbackRate: 1,
    addEventListener() {},
    removeEventListener() {},
  };

  let patchedDelay = null;
  const ctrl = new VideoSubtitleController(mockVideo, {
    doc: mockDoc,
    initialKaraokeDelayMs: 0,
    onStylePatchChange: (p) => {
      if ("karaokeDelayMs" in p) patchedDelay = p.karaokeDelayMs;
    },
  });

  // Compact bottom play-bar pill keeps only primary controls + hidden file input
  assert.equal(ctrl.karaokeHighlight, true);
  assert.equal(ctrl.toolbar.children.length, 5);
  assert.equal(ctrl.toggleToolsPopover(), true);
  assert.equal(ctrl.toolsPopoverEl.dataset.open, "true");

  ctrl.setCues(
    [{ startSec: 0, endSec: 4, text: "Multi-head self-attention computes context in parallel." }],
    { title: "Transformer Overview" }
  );

  // At t=0.4s with 0ms delay, word 1 is highlighted as `.caption-word-current`
  assert.ok(
    ctrl.captionBox.children.some((c) =>
      String(c.className || "").includes("caption-word-current")
    ),
    "Active spoken word must receive .caption-word-current pill"
  );

  // Delay word highlight by +600ms -> at t=0.4s, delayedTime = -0.2s < startSec, so no word is highlighted yet
  assert.equal(ctrl.adjustKaraokeDelay(600), 600);
  assert.equal(patchedDelay, 600);
  assert.equal(
    ctrl.captionBox.children.some((c) =>
      String(c.className || "").includes("caption-word-current")
    ),
    false,
    "With +600ms delay at t=0.4s, active-word highlight waits until syllable onset"
  );
  assert.ok(
    ctrl.captionBox.children.every(
      (c) => !c.className || c.className === "caption-word-upcoming"
    )
  );

  // Advance video past the +600ms delay (t=0.8s) -> word 1 now highlights!
  mockVideo.currentTime = 0.8;
  ctrl._renderActiveCue();
  assert.ok(
    ctrl.captionBox.children.some((c) =>
      String(c.className || "").includes("caption-word-current")
    ),
    "Once playback passes startSec + karaokeDelayMs, word highlight activates"
  );
  ctrl.destroy();

  // 3. Verify 16-bit 44.1 kHz RIFF PCM WAV completion chime generator & fallback playback
  const wav = buildChimeWavBytes();
  assert.equal(Buffer.from(wav.slice(0, 4)).toString("ascii"), "RIFF");
  assert.equal(Buffer.from(wav.slice(8, 12)).toString("ascii"), "WAVE");
  assert.ok(wav.byteLength > 20000, "Chime WAV must contain synthesized 44.1 kHz PCM samples");
  const uri = getChimeWavDataUri();
  assert.ok(uri.startsWith("data:audio/wav;base64,"));

  let playedFallback = 0;
  const mockWin = {
    Audio: class {
      constructor(src) {
        this.src = src;
        this.volume = 1;
      }
      play() {
        playedFallback += 1;
        return Promise.resolve();
      }
    },
  };
  const okChime = await playCompletionChimeSound({ win: mockWin, force: true });
  assert.equal(okChime, true);
  assert.equal(playedFallback, 1);

  // Ensure scripts/generate-assets.mjs contains zero synthetic screenshot or banner generators
  const genAssetsSrc = fs.readFileSync(path.resolve("scripts/generate-assets.mjs"), "utf8");
  assert.equal(genAssetsSrc.includes("01-player-subtitles"), false);
  assert.equal(genAssetsSrc.includes("BANNER_SVG"), false);
});




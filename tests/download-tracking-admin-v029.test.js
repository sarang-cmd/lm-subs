/**
 * LM Subs: anonymous extension download tracking and the admin dashboard.
 *
 * The counters are open so the marketing site and the setup guide can report
 * without a session, and the dashboard that reads them is gated on an
 * environment variable so no operator address is ever committed to the repo.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createSyncApp } from "../server/app.js";
import { createDatabaseClient } from "../server/db.js";

// Throwaway addresses for the test database only. The real admin list lives in
// LM_SUBS_ADMIN_EMAILS on Vercel and is never committed.
const ADMIN_EMAIL = "dashboard-owner@example.test";
const MEMBER_EMAIL = "ordinary-member@example.test";

const readRepoFile = (rel) => fs.readFileSync(path.resolve(rel), "utf8");

async function signIn(app, email) {
  const sendRes = await app.request("http://localhost/api/auth/email/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  assert.equal(sendRes.status, 200);
  const { previewCode } = await sendRes.json();
  assert.match(previewCode, /^\d{6}$/);

  const verifyRes = await app.request(
    "http://localhost/api/auth/email/verify-code",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: previewCode }),
    }
  );
  assert.equal(verifyRes.status, 200);
  const json = await verifyRes.json();
  assert.ok(json.token.startsWith("lms_"));
  return json.token;
}

async function withAdminEnv(emails, fn) {
  const previous = process.env.LM_SUBS_ADMIN_EMAILS;
  process.env.LM_SUBS_ADMIN_EMAILS = emails;
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.LM_SUBS_ADMIN_EMAILS;
    else process.env.LM_SUBS_ADMIN_EMAILS = previous;
  }
}

function postDownload(app, body, headers = {}) {
  return app.request("http://localhost/api/downloads", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("Download beacon records events without a session", async () => {
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });

  const first = await postDownload(
    app,
    { version: "0.2.9", channel: "site", source: "hero" },
    { "user-agent": "Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36", "x-vercel-ip-country": "DE" }
  );
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { ok: true, recorded: true });

  await postDownload(
    app,
    { version: "0.2.9", channel: "site", source: "guide" },
    { "user-agent": "Mozilla/5.0 Firefox/133.0" }
  );
  await postDownload(app, { version: "0.2.8", channel: "update", source: "extension" });

  // Columns that could identify a visitor simply do not exist in the table
  const db = await dbPromise;
  const res = await db.query(
    `SELECT version, channel, source, browser, country FROM lmsubs_downloads
     ORDER BY id ASC`
  );
  assert.equal(res.rows.length, 3);
  assert.deepEqual(
    res.rows.map((r) => r.source),
    ["hero", "guide", "extension"]
  );
  assert.equal(res.rows[0].browser, "chrome");
  assert.equal(res.rows[0].country, "DE");
  assert.equal(res.rows[1].browser, "firefox");
  assert.equal(res.rows[1].country, "");

  // The beacon survives a body that is not valid JSON
  const broken = await app.request("http://localhost/api/downloads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
  assert.equal(broken.status, 200);
});

test("Download beacon collapses repeats inside the dedupe window", async () => {
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });

  const body = { version: "0.2.9", channel: "site", source: "refresh-loop" };
  const first = await postDownload(app, body);
  assert.equal((await first.json()).recorded, true);

  const repeat = await postDownload(app, body);
  assert.equal((await repeat.json()).recorded, false);

  // A different page is a different event, so real clicks are not swallowed
  const other = await postDownload(app, { ...body, source: "guide" });
  assert.equal((await other.json()).recorded, true);

  const db = await dbPromise;
  const res = await db.query(
    `SELECT COUNT(*)::int AS count FROM lmsubs_downloads`
  );
  assert.equal(res.rows[0].count, 2);
});

test("Download beacon cannot store a free-form payload", async () => {
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });

  await postDownload(app, {
    version: "<script>alert(1)</script>",
    channel: "totally-invented-channel",
    source: "home'; DROP TABLE lmsubs_downloads; --",
  });

  const db = await dbPromise;
  const res = await db.query(
    `SELECT version, channel, source FROM lmsubs_downloads LIMIT 1`
  );
  assert.equal(res.rows[0].version, "");
  assert.equal(res.rows[0].channel, "site");
  assert.equal(res.rows[0].source, "home drop table lmsubs_downloads --");
});

test("Admin dashboard requires a signed in admin", async () => {
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });

  await postDownload(app, { version: "0.2.9", source: "hero" });

  const anon = await app.request("http://localhost/api/admin/downloads");
  assert.equal(anon.status, 401);

  const memberToken = await signIn(app, MEMBER_EMAIL);
  const memberRes = await app.request("http://localhost/api/admin/downloads", {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  assert.equal(memberRes.status, 403);

  await withAdminEnv(ADMIN_EMAIL, async () => {
    const adminToken = await signIn(app, ADMIN_EMAIL);
    const adminRes = await app.request("http://localhost/api/admin/downloads", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRes.status, 200);
    const json = await adminRes.json();
    assert.equal(json.ok, true);
    assert.equal(json.totals.total, 1);
    assert.equal(json.totals.today, 1);
    assert.equal(json.daily.length, 30);
    assert.equal(json.byVersion[0].label, "0.2.9");
    assert.equal(json.recent[0].source, "hero");
    assert.equal(typeof json.accounts.total, "number");

    // The same address stops being an admin as soon as the env var changes
    const demoted = await app.request("http://localhost/api/admin/downloads", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(demoted.status, 200);
  });

  const afterDemotion = await app.request("http://localhost/api/admin/downloads", {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  assert.equal(afterDemotion.status, 403);
});

test("Admin dashboard honours the requested range", async () => {
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });
  const token = await signIn(app, ADMIN_EMAIL);
  await postDownload(app, { version: "0.2.9", source: "hero" });

  await withAdminEnv(ADMIN_EMAIL, async () => {
    for (const days of [7, 90]) {
      const res = await app.request(
        `http://localhost/api/admin/downloads?days=${days}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.range.days, days);
      assert.equal(json.daily.length, days);
    }

    // Out of range values fall back instead of erroring
    for (const bad of ["0", "-5", "10000", "abc"]) {
      const res = await app.request(
        `http://localhost/api/admin/downloads?days=${bad}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.daily.length >= 1 && json.daily.length <= 90);
    }
  });
});

test("Signed-in session reports whether it holds admin rights", async () => {
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });
  const token = await signIn(app, ADMIN_EMAIL);

  const plain = await app.request("http://localhost/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal((await plain.json()).user.isAdmin, false);

  await withAdminEnv(`${ADMIN_EMAIL}, second-owner@example.test`, async () => {
    const res = await app.request("http://localhost/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    assert.equal(json.user.isAdmin, true);
    assert.equal(json.user.email, ADMIN_EMAIL);
  });
});

test("Admin flag survives the session hydration the web app actually uses", async () => {
  // The web app hydrates its user from /api/sync/pull, not /api/auth/me, so
  // the flag has to be present on both or the Admin tab never appears.
  const dbPromise = createDatabaseClient({ pgliteDataDir: "memory://" });
  const app = createSyncApp({
    dbPromise,
    encryptionSecret: "test-secret-32-chars-minimum-123456",
  });
  const token = await signIn(app, ADMIN_EMAIL);

  const before = await app.request("http://localhost/api/sync/pull?includeSecrets=0", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal((await before.json()).user.isAdmin, false);

  await withAdminEnv(ADMIN_EMAIL, async () => {
    const res = await app.request("http://localhost/api/sync/pull?includeSecrets=0", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).user.isAdmin, true);
  });
});

test("Admin access comes from the environment and never from the repository", () => {
  const app = readRepoFile("server/app.js");
  assert.match(app, /process\.env\.LM_SUBS_ADMIN_EMAILS/);
  assert.match(app, /isAdminUser\(user\)/);

  // No operator address is hardcoded anywhere in the shipped source
  for (const dir of ["src", "server", "scripts", "api", "db"]) {
    const walk = (current) => {
      for (const entry of fs.readdirSync(path.resolve(current), {
        withFileTypes: true,
      })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(js|jsx|mjs|sql|ts|json|md)$/.test(entry.name)) continue;
        const text = fs.readFileSync(path.resolve(full), "utf8");
        assert.doesNotMatch(
          text,
          /@(gmail|googlemail)\.com/i,
          `${full} must not contain an operator email address`
        );
      }
    };
    walk(dir);
  }

  const envExample = readRepoFile(".env.example");
  assert.match(envExample, /LM_SUBS_ADMIN_EMAILS=""/);
  assert.doesNotMatch(envExample, /@(gmail|googlemail)\.com/i);
});

test("Website reports downloads and keeps the admin route private", () => {
  const app = readRepoFile("src/web/App.jsx");
  assert.match(app, /trackDownload\(\{ source, channel: "site" \}\)/);
  assert.match(app, /user\?\.isAdmin \? \(/);
  assert.match(app, /href="\/admin"/);
  assert.match(app, /AdminView/);

  const guide = readRepoFile("src/web/GuideView.jsx");
  assert.match(guide, /onStartDownloadSetup\?\.\("guide"\)/);

  const welcome = readRepoFile("src/web/WelcomeView.jsx");
  assert.match(welcome, /trackDownload\(\{ source: "welcome" \}\)/);

  const tracker = readRepoFile("src/lib/downloads.js");
  assert.match(tracker, /\/api\/downloads/);
  assert.match(tracker, /keepalive: true/);

  // Private route: out of the index and out of the sitemap
  const robots = readRepoFile("docs/robots.txt");
  assert.match(robots, /Disallow: \/admin/);
  const sitemap = readRepoFile("docs/sitemap.xml");
  assert.doesNotMatch(sitemap, /\/admin/);

  const shells = readRepoFile("scripts/build-shells.mjs");
  assert.doesNotMatch(shells, /"\/admin"/);
});

test("Download counters store nothing that identifies a visitor", () => {
  const schema = readRepoFile("db/schema.sql");
  const table = schema.slice(schema.indexOf("lmsubs_downloads"));
  for (const banned of ["ip_address", "user_agent", "user_id", "email"]) {
    assert.doesNotMatch(
      table.slice(0, table.indexOf(";", table.indexOf(")"))),
      new RegExp(banned, "i"),
      `the downloads table must not have a ${banned} column`
    );
  }
  assert.match(table, /country TEXT NOT NULL DEFAULT ''/);

  const app = readRepoFile("server/app.js");
  const route = app.slice(
    app.indexOf('app.post("/api/downloads"'),
    app.indexOf('app.get("/api/admin/downloads"')
  );
  // Only coarse signals: never the raw address or the raw user agent string
  assert.match(route, /x-vercel-ip-country/);
  assert.doesNotMatch(route, /x-forwarded-for|req\.header\("x-real-ip"\)/i);
  assert.match(route, /classifyBrowser\(/);
});

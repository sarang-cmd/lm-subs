import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { handle } from "hono/vercel";
import { createVercelDispatcher, normalizeVercelRequest } from "../api/index.js";
import { createSyncApp } from "../server/app.js";
import { createDatabaseClient } from "../server/db.js";
import { SCHEMA_SQL } from "../server/schema-sql.js";

test("Vercel serverless routing: /api/auth/oauth/google?next=%2Flibrary resolves cleanly in both rewrite modes", async () => {
  const db = await createDatabaseClient({ inMemory: true });
  const prevId = process.env.GOOGLE_CLIENT_ID;
  const prevSec = process.env.GOOGLE_CLIENT_SECRET;
  const prevPub = process.env.PUBLIC_APP_URL;
  process.env.GOOGLE_CLIENT_ID = "google-client-id-123.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "google-client-secret-xyz";
  process.env.PUBLIC_APP_URL = "https://lm-subs.vercel.app";

  try {
    const app = createSyncApp({ dbPromise: Promise.resolve(db) });
    const dispatch = createVercelDispatcher(handle(app));

    // Mode A: Vercel rewrites pathname to /api/index and appends __lms_path
    const resRewritten = await dispatch(
      new Request(
        "https://lm-subs.vercel.app/api/index?next=%2Flibrary&__lms_path=auth%2Foauth%2Fgoogle",
        {
          headers: {
            host: "lm-subs.vercel.app",
            "x-forwarded-host": "lm-subs.vercel.app",
            "x-forwarded-proto": "https, http",
          },
        }
      )
    );
    assert.equal(resRewritten.status, 302);
    const locA = new URL(resRewritten.headers.get("location"));
    assert.equal(locA.origin, "https://accounts.google.com");
    assert.equal(
      locA.searchParams.get("redirect_uri"),
      "https://lm-subs.vercel.app/api/auth/oauth/google/callback"
    );

    // Mode B: Vercel preserves incoming request.url pathname (/api/auth/oauth/google)
    const resPreserved = await dispatch(
      new Request(
        "https://lm-subs.vercel.app/api/auth/oauth/google?next=%2Flibrary&__lms_path=auth%2Foauth%2Fgoogle",
        {
          headers: {
            host: "lm-subs.vercel.app",
            "x-forwarded-proto": "https",
          },
        }
      )
    );
    assert.equal(resPreserved.status, 302);
    const locB = new URL(resPreserved.headers.get("location"));
    assert.equal(locB.origin, "https://accounts.google.com");
    assert.equal(
      locB.searchParams.get("redirect_uri"),
      "https://lm-subs.vercel.app/api/auth/oauth/google/callback"
    );

    // Verify normalizeVercelRequest strips __lms_path while keeping next=/library
    const normalized = normalizeVercelRequest(
      new Request(
        "https://lm-subs.vercel.app/api/index?next=%2Flibrary&__lms_path=auth/oauth/google"
      )
    );
    assert.equal(
      normalized.url,
      "https://lm-subs.vercel.app/api/auth/oauth/google?next=%2Flibrary"
    );
  } finally {
    if (prevId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = prevId;
    if (prevSec === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = prevSec;
    if (prevPub === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = prevPub;
    await db.close();
  }
});

test("AUTH_EMAIL_FROM and bundled SCHEMA_SQL stay in sync with Vercel config", async () => {
  const diskSql = fs.readFileSync(path.resolve("db/schema.sql"), "utf8");
  assert.equal(SCHEMA_SQL.trim(), diskSql.trim());

  const vercelCfg = JSON.parse(fs.readFileSync(path.resolve("vercel.json"), "utf8"));
  assert.equal(vercelCfg.outputDirectory, "docs");
  assert.equal(vercelCfg.buildCommand, "npm run build");
  assert.ok(fs.existsSync(path.resolve("api/index.js")));
  assert.ok(!fs.existsSync(path.resolve("api/[...route].js")));

  const db = await createDatabaseClient({ inMemory: true });
  const prevResend = process.env.RESEND_API_KEY;
  const prevFrom = process.env.AUTH_EMAIL_FROM;
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.AUTH_EMAIL_FROM = "LM Subs <auth@lm-subs.app>";

  let capturedBody = null;
  try {
    const app = createSyncApp({
      dbPromise: Promise.resolve(db),
      fetchImpl: async (_url, init) => {
        capturedBody = JSON.parse(init.body);
        return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
      },
    });
    const res = await app.request("https://lm-subs.vercel.app/api/auth/email/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });
    assert.equal(res.status, 200);
    assert.equal(capturedBody.from, "LM Subs <auth@lm-subs.app>");
  } finally {
    if (prevResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevResend;
    if (prevFrom === undefined) delete process.env.AUTH_EMAIL_FROM;
    else process.env.AUTH_EMAIL_FROM = prevFrom;
    await db.close();
  }
});

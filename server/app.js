/**
 * LM Subs Hosted Cloud API (`server/app.js`).
 *
 * Portable Fetch-standard Hono application operated by the LM Subs maintainer on:
 * - Vercel Serverless / Fluid Compute (`api/index.js`)
 * - Neon Functions (`server/neon-function.js`)
 * - Node HTTP server (`serve-docs.mjs`)
 *
 * Authentication methods for end users:
 * - Google OAuth 2.0 (`/api/auth/oauth/google`)
 * - GitHub OAuth 2.0 (`/api/auth/oauth/github`)
 * - Passwordless 6-digit Email Code (`/api/auth/email/send-code` & `/api/auth/email/verify-code`)
 * - Neon Managed Auth Ed25519 JWTs (`NEON_AUTH_JWKS_URL`) + session bearer tokens (`lms_...`)
 *
 * Security & privacy invariants:
 * - Every query is strictly scoped to `WHERE user_id = $1`.
 * - BYOK API keys are encrypted per user with `HKDF-SHA256` + `AES-256-GCM`.
 * - Users opt in per category (`syncApiKeys`, `syncTranscripts`, `syncSettings`) and can purge disabled categories immediately.
 */

import crypto from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { normalizeAndSortCues, serializeSubtitles } from "../src/lib/subtitles.js";
import { resolveAvoidedVideoBytes } from "../src/lib/audio-extract.js";
import {
  decryptApiKeyForUser,
  encryptApiKeyForUser,
  generateSessionToken,
  hashPassword,
  sha256Hex,
  verifyPassword,
} from "./crypto.js";
import { getSharedDatabase } from "./db.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TTL_DAYS = 90;
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

export const DEFAULT_SYNC_PREFERENCES = Object.freeze({
  syncApiKeys: true,
  syncTranscripts: true,
  syncSettings: true,
});

export function normalizeSyncPreferences(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SYNC_PREFERENCES };
  }
  return {
    syncApiKeys:
      typeof raw.syncApiKeys === "boolean"
        ? raw.syncApiKeys
        : DEFAULT_SYNC_PREFERENCES.syncApiKeys,
    syncTranscripts:
      typeof raw.syncTranscripts === "boolean"
        ? raw.syncTranscripts
        : DEFAULT_SYNC_PREFERENCES.syncTranscripts,
    syncSettings:
      typeof raw.syncSettings === "boolean"
        ? raw.syncSettings
        : DEFAULT_SYNC_PREFERENCES.syncSettings,
  };
}

function estimateSpokenSeconds(cues) {
  if (!Array.isArray(cues) || cues.length === 0) return 0;
  let maxEnd = 0;
  for (const cue of cues) {
    const end = Number(cue?.endSec ?? cue?.end ?? 0);
    if (Number.isFinite(end) && end > maxEnd) maxEnd = end;
  }
  return Math.max(0, Math.round(maxEnd));
}

export function resolveRequestOrigin(c) {
  const reqUrl = new URL(c.req.url);
  const rawHost = (
    c.req.header("x-forwarded-host") ||
    c.req.header("host") ||
    reqUrl.host ||
    ""
  )
    .split(",")[0]
    .trim();
  const isLocalHost =
    rawHost.startsWith("localhost") || rawHost.startsWith("127.0.0.1");

  if (!isLocalHost && process.env.PUBLIC_APP_URL) {
    try {
      const configured = new URL(process.env.PUBLIC_APP_URL.trim());
      if (configured.host === rawHost || !rawHost) {
        return configured.origin;
      }
    } catch {
      // Fall back to forwarded headers below
    }
  }

  const rawProto = (
    c.req.header("x-forwarded-proto") ||
    reqUrl.protocol.replace(":", "") ||
    "https"
  )
    .split(",")[0]
    .trim();

  return `${rawProto}://${rawHost || reqUrl.host}`;
}

function sanitizeRelativeRedirect(raw) {
  const s = String(raw || "").trim();
  if (!s.startsWith("/") || s.startsWith("//")) return "/?view=library";
  return s.slice(0, 240);
}

export function createSyncApp({
  dbPromise = null,
  encryptionSecret = "",
  jwksVerifier = null,
  fetchImpl = globalThis.fetch,
} = {}) {
  const resolveDb = () => dbPromise || getSharedDatabase();
  let cachedRemoteJwks = null;
  let cachedJwksUrl = "";

  function getNeonJwksVerifier() {
    if (jwksVerifier) return jwksVerifier;
    const jwksUrl = process.env.NEON_AUTH_JWKS_URL || "";
    const baseUrl = process.env.NEON_AUTH_BASE_URL || "";
    if (!jwksUrl || !baseUrl) return null;

    if (cachedRemoteJwks && cachedJwksUrl === jwksUrl) {
      return cachedRemoteJwks;
    }
    const jwks = createRemoteJWKSet(new URL(jwksUrl));
    const issuer = new URL(baseUrl).origin;
    cachedJwksUrl = jwksUrl;
    cachedRemoteJwks = async (token) => {
      const { payload } = await jwtVerify(token, jwks, { issuer });
      return payload;
    };
    return cachedRemoteJwks;
  }

  async function authenticateRequest(c, db) {
    const authHeader = c.req.header("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return null;
    }
    const rawToken = authHeader.slice(7).trim();
    if (!rawToken) return null;

    if (rawToken.startsWith("lms_")) {
      const tokenHash = sha256Hex(rawToken);
      const res = await db.query(
        `SELECT u.id, u.email, u.name, u.avatar_url, u.auth_provider, s.token_hash
         FROM lmsubs_sessions s
         JOIN lmsubs_users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
      );
      if (res.rows.length === 0) return null;
      return {
        id: res.rows[0].id,
        email: res.rows[0].email,
        name: res.rows[0].name || "",
        avatarUrl: res.rows[0].avatar_url || "",
        authProvider: res.rows[0].auth_provider || "email",
        tokenHash: res.rows[0].token_hash,
      };
    }

    const verifyNeonJwt = getNeonJwksVerifier();
    if (!verifyNeonJwt) return null;

    try {
      const payload = await verifyNeonJwt(rawToken);
      const sub = typeof payload?.sub === "string" ? payload.sub : "";
      if (!sub) return null;
      const email =
        typeof payload.email === "string" && payload.email
          ? payload.email.toLowerCase()
          : `${sub}@neon-auth.local`;
      const name = typeof payload.name === "string" ? payload.name : "";

      const upserted = await db.query(
        `INSERT INTO lmsubs_users (id, email, name, auth_provider, updated_at)
         VALUES ($1, $2, $3, 'neon-managed', NOW())
         ON CONFLICT (email) DO UPDATE
           SET name = COALESCE(NULLIF(EXCLUDED.name, ''), lmsubs_users.name),
               updated_at = NOW()
         RETURNING id, email, name, avatar_url, auth_provider`,
        [sub, email, name]
      );
      const row = upserted.rows[0];
      return {
        id: row.id,
        email: row.email,
        name: row.name || "",
        avatarUrl: row.avatar_url || "",
        authProvider: row.auth_provider || "neon-managed",
        tokenHash: null,
      };
    } catch {
      return null;
    }
  }

  async function issueSessionForUser(db, userId, deviceLabel = "web") {
    const token = generateSessionToken();
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(
      Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    await db.query(
      `INSERT INTO lmsubs_sessions (token_hash, user_id, device_label, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [tokenHash, userId, String(deviceLabel || "web").slice(0, 64), expiresAt]
    );
    return { token, expiresAt };
  }

  async function upsertAccountByEmail(
    db,
    { email, name = "", avatarUrl = "", provider = "email" }
  ) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const generatedId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const fallbackName = name.trim() || normalizedEmail.split("@")[0];

    const res = await db.query(
      `INSERT INTO lmsubs_users (id, email, name, avatar_url, auth_provider, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (email) DO UPDATE
         SET name = COALESCE(NULLIF(EXCLUDED.name, ''), lmsubs_users.name),
             avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), lmsubs_users.avatar_url),
             auth_provider = CASE
               WHEN lmsubs_users.auth_provider = 'email' THEN EXCLUDED.auth_provider
               ELSE lmsubs_users.auth_provider
             END,
             updated_at = NOW()
       RETURNING id, email, name, avatar_url, auth_provider`,
      [generatedId, normalizedEmail, fallbackName.slice(0, 80), avatarUrl.slice(0, 400), provider]
    );
    return res.rows[0];
  }

  async function readUserSyncPreferences(db, userId) {
    const res = await db.query(
      `SELECT sync_prefs_json FROM lmsubs_user_settings WHERE user_id = $1`,
      [userId]
    );
    return normalizeSyncPreferences(res.rows[0]?.sync_prefs_json);
  }

  async function recordUsageEvent(db, userId, event) {
    const id = `evt_${crypto.randomUUID().replace(/-/g, "").slice(0, 22)}`;
    await db.query(
      `INSERT INTO lmsubs_usage_events
         (id, user_id, event_type, cache_key, provider, language, format,
          cue_count, spoken_seconds, original_bytes, extracted_bytes, latency_ms, failover_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        userId,
        String(event.eventType || "transcription").slice(0, 32),
        event.cacheKey ? String(event.cacheKey).slice(0, 200) : null,
        event.provider ? String(event.provider).slice(0, 40) : null,
        event.language ? String(event.language).slice(0, 16) : null,
        event.format ? String(event.format).slice(0, 16) : null,
        Math.max(0, Math.round(Number(event.cueCount) || 0)),
        Math.max(0, Math.round(Number(event.spokenSeconds) || 0)),
        Math.max(0, Math.round(Number(event.originalBytes) || 0)),
        Math.max(0, Math.round(Number(event.extractedBytes) || 0)),
        Number.isFinite(Number(event.latencyMs)) ? Math.round(Number(event.latencyMs)) : null,
        Boolean(event.failoverUsed),
      ]
    );
  }

  async function recordUserNotification(
    db,
    userId,
    { kind = "info", title = "LM Subs", body = "", cacheKey = null } = {}
  ) {
    const id = `ntf_${crypto.randomUUID().replace(/-/g, "").slice(0, 22)}`;
    await db.query(
      `INSERT INTO lmsubs_notifications
         (id, user_id, kind, title, body, cache_key, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())`,
      [
        id,
        userId,
        String(kind || "info").slice(0, 24),
        String(title || "LM Subs").slice(0, 160),
        String(body || "").slice(0, 320),
        cacheKey ? String(cacheKey).slice(0, 200) : null,
      ]
    );
    await db.query(
      `DELETE FROM lmsubs_notifications
       WHERE user_id = $1
         AND id NOT IN (
           SELECT id FROM lmsubs_notifications
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 60
         )`,
      [userId]
    );
  }

  async function readSyncSummary(db, userId) {
    const [keysRes, subsRes, settingsRes] = await Promise.all([
      db.query(
        `SELECT provider_id, key_hint, updated_at
         FROM lmsubs_user_api_keys
         WHERE user_id = $1
         ORDER BY provider_id ASC`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS count, MAX(updated_at) AS latest
         FROM lmsubs_subtitles
         WHERE user_id = $1`,
        [userId]
      ),
      db.query(
        `SELECT sync_prefs_json, updated_at
         FROM lmsubs_user_settings
         WHERE user_id = $1`,
        [userId]
      ),
    ]);

    const syncPreferences = normalizeSyncPreferences(
      settingsRes.rows[0]?.sync_prefs_json
    );
    const keyHints = {};
    if (syncPreferences.syncApiKeys) {
      for (const r of keysRes.rows) {
        keyHints[r.provider_id] = r.key_hint;
      }
    }

    return {
      keyCount: syncPreferences.syncApiKeys ? keysRes.rows.length : 0,
      keyHints,
      subtitleCount: syncPreferences.syncTranscripts
        ? subsRes.rows[0]?.count || 0
        : 0,
      syncPreferences,
      lastSyncedAt:
        subsRes.rows[0]?.latest ||
        settingsRes.rows[0]?.updated_at ||
        keysRes.rows[0]?.updated_at ||
        null,
    };
  }

  const app = new Hono();

  app.use(
    "/api/*",
    cors({
      origin: (origin) => origin || "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400,
    })
  );

  app.get("/api/health", async (c) => {
    const db = await resolveDb();
    const ping = await db.query("SELECT NOW() AS server_time");
    return c.json({
      ok: true,
      service: "lm-subs-neon-sync",
      version: "0.2.1",
      neonProjectId: db.projectId || "falling-cherry-16443194",
      databaseMode: db.mode,
      neonManagedAuth: Boolean(process.env.NEON_AUTH_BASE_URL),
      oauthProviders: {
        google: Boolean(
          process.env.GOOGLE_CLIENT_ID || process.env.NEON_AUTH_BASE_URL
        ),
        github: Boolean(
          process.env.GITHUB_CLIENT_ID || process.env.NEON_AUTH_BASE_URL
        ),
        email: true,
      },
      serverTime: ping.rows[0]?.server_time || new Date().toISOString(),
    });
  });

  app.get("/api/auth/providers", (c) => {
    const googleDirect = Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );
    const githubDirect = Boolean(
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    );
    const neonManaged = Boolean(process.env.NEON_AUTH_BASE_URL);
    return c.json({
      ok: true,
      email: { enabled: true, mode: process.env.RESEND_API_KEY ? "email" : "code" },
      google: {
        enabled: googleDirect || neonManaged,
        mode: googleDirect ? "oauth2" : neonManaged ? "neon-auth" : "unconfigured",
      },
      github: {
        enabled: githubDirect || neonManaged,
        mode: githubDirect ? "oauth2" : neonManaged ? "neon-auth" : "unconfigured",
      },
    });
  });

  // Passwordless 6-digit Email Sign-In: Step 1 (Request Code)
  app.post("/api/auth/email/send-code", async (c) => {
    const db = await resolveDb();
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid request body." }, 400);
    }

    const email = String(body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return c.json({ ok: false, error: "Enter a valid email address." }, 400);
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = sha256Hex(`${email}:${code}`);
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString();

    await db.query(
      `INSERT INTO lmsubs_email_codes (email, code_hash, attempts, expires_at, created_at)
       VALUES ($1, $2, 0, $3, NOW())
       ON CONFLICT (email) DO UPDATE
         SET code_hash = EXCLUDED.code_hash,
             attempts = 0,
             expires_at = EXCLUDED.expires_at,
             created_at = NOW()`,
      [email, codeHash, expiresAt]
    );

    const resendKey = process.env.RESEND_API_KEY || "";
    const fromEmail =
      process.env.AUTH_EMAIL_FROM ||
      process.env.AUTH_FROM_EMAIL ||
      "LM Subs <onboarding@resend.dev>";

    if (resendKey) {
      const sendRes = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: `${code} is your LM Subs sign-in code`,
          text: `Your LM Subs verification code is ${code}. It expires in 10 minutes.`,
        }),
      });
      if (!sendRes.ok) {
        return c.json(
          { ok: false, error: "Could not deliver verification email. Check email settings." },
          502
        );
      }
      return c.json({
        ok: true,
        delivery: "email",
        expiresInSec: 600,
      });
    }

    // Preview / sandbox fallback when transactional email credentials are not set yet
    return c.json({
      ok: true,
      delivery: "preview",
      previewCode: code,
      expiresInSec: 600,
    });
  });

  // Passwordless 6-digit Email Sign-In: Step 2 (Verify Code)
  app.post("/api/auth/email/verify-code", async (c) => {
    const db = await resolveDb();
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid request body." }, 400);
    }

    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").replace(/\s+/g, "");
    const name = String(body?.name || "").trim();
    const deviceLabel = String(body?.deviceLabel || "web").slice(0, 64);

    if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
      return c.json(
        { ok: false, error: "Enter your email address and the 6-digit code." },
        400
      );
    }

    const codeRowRes = await db.query(
      `SELECT code_hash, attempts, expires_at
       FROM lmsubs_email_codes
       WHERE email = $1
       LIMIT 1`,
      [email]
    );
    const codeRow = codeRowRes.rows[0];
    if (!codeRow) {
      return c.json(
        { ok: false, error: "Request a new 6-digit code first." },
        401
      );
    }

    if (new Date(codeRow.expires_at).getTime() < Date.now()) {
      await db.query("DELETE FROM lmsubs_email_codes WHERE email = $1", [email]);
      return c.json(
        { ok: false, error: "This code expired. Request a new code." },
        401
      );
    }

    if (Number(codeRow.attempts) >= MAX_CODE_ATTEMPTS) {
      await db.query("DELETE FROM lmsubs_email_codes WHERE email = $1", [email]);
      return c.json(
        { ok: false, error: "Too many attempts. Request a new code." },
        429
      );
    }

    const expectedBuf = Buffer.from(codeRow.code_hash, "hex");
    const candidateBuf = Buffer.from(sha256Hex(`${email}:${code}`), "hex");
    const matches =
      expectedBuf.length === candidateBuf.length &&
      crypto.timingSafeEqual(expectedBuf, candidateBuf);

    if (!matches) {
      await db.query(
        "UPDATE lmsubs_email_codes SET attempts = attempts + 1 WHERE email = $1",
        [email]
      );
      return c.json(
        { ok: false, error: "Incorrect code. Check the 6 digits and try again." },
        401
      );
    }

    await db.query("DELETE FROM lmsubs_email_codes WHERE email = $1", [email]);

    const account = await upsertAccountByEmail(db, {
      email,
      name,
      provider: "email",
    });
    const session = await issueSessionForUser(db, account.id, deviceLabel);
    const summary = await readSyncSummary(db, account.id);

    return c.json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: account.id,
        email: account.email,
        name: account.name || "",
        avatarUrl: account.avatar_url || "",
        authProvider: account.auth_provider || "email",
      },
      summary,
    });
  });

  // Social OAuth 2.0 Start (`google` | `github`)
  app.get("/api/auth/oauth/:provider", async (c) => {
    const provider = String(c.req.param("provider") || "").toLowerCase();
    if (provider !== "google" && provider !== "github") {
      return c.json({ ok: false, error: "Unsupported provider." }, 400);
    }

    const origin = resolveRequestOrigin(c);
    const redirectAfter = sanitizeRelativeRedirect(
      c.req.query("next") || "/?view=library"
    );
    const deviceLabel = String(c.req.query("device") || "web").slice(0, 64);

    const db = await resolveDb();
    const state = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.query(
      `INSERT INTO lmsubs_oauth_states (state, provider, redirect_after, device_label, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [state, provider, redirectAfter, deviceLabel, expiresAt]
    );

    const callbackUrl = `${origin}/api/auth/oauth/${provider}/callback`;

    if (
      provider === "google" &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
    ) {
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", callbackUrl);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("prompt", "select_account");
      return c.redirect(authUrl.toString(), 302);
    }

    if (
      provider === "github" &&
      process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET
    ) {
      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", callbackUrl);
      authUrl.searchParams.set("scope", "read:user user:email");
      authUrl.searchParams.set("state", state);
      return c.redirect(authUrl.toString(), 302);
    }

    // Fallback when OAuth env credentials have not been set on the deployment yet
    const back = new URL(redirectAfter, origin);
    back.searchParams.set("oauth_notice", provider);
    return c.redirect(back.toString(), 302);
  });

  // Social OAuth 2.0 Callback (`google` | `github`)
  app.get("/api/auth/oauth/:provider/callback", async (c) => {
    const provider = String(c.req.param("provider") || "").toLowerCase();
    const code = c.req.query("code") || "";
    const state = c.req.query("state") || "";
    const origin = resolveRequestOrigin(c);

    if (!code || !state) {
      return c.redirect(`${origin}/?view=library&auth_error=oauth_cancelled`, 302);
    }

    const db = await resolveDb();
    const stateRes = await db.query(
      `DELETE FROM lmsubs_oauth_states
       WHERE state = $1 AND provider = $2 AND expires_at > NOW()
       RETURNING redirect_after, device_label`,
      [state, provider]
    );
    const stateRow = stateRes.rows[0];
    if (!stateRow) {
      return c.redirect(`${origin}/?view=library&auth_error=invalid_state`, 302);
    }

    const callbackUrl = `${origin}/api/auth/oauth/${provider}/callback`;

    try {
      let email = "";
      let name = "";
      let avatarUrl = "";

      if (provider === "google") {
        const tokenRes = await fetchImpl("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            redirect_uri: callbackUrl,
            grant_type: "authorization_code",
          }),
        });
        const tokenJson = await tokenRes.json();
        if (!tokenRes.ok || !tokenJson.access_token) {
          throw new Error("Google token exchange failed");
        }
        const profileRes = await fetchImpl(
          "https://openidconnect.googleapis.com/v1/userinfo",
          { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
        );
        const profile = await profileRes.json();
        email = String(profile.email || "").toLowerCase();
        name = String(profile.name || "");
        avatarUrl = String(profile.picture || "");
      } else if (provider === "github") {
        const tokenRes = await fetchImpl(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              client_id: process.env.GITHUB_CLIENT_ID || "",
              client_secret: process.env.GITHUB_CLIENT_SECRET || "",
              code,
              redirect_uri: callbackUrl,
            }),
          }
        );
        const tokenJson = await tokenRes.json();
        if (!tokenRes.ok || !tokenJson.access_token) {
          throw new Error("GitHub token exchange failed");
        }
        const ghHeaders = {
          Authorization: `Bearer ${tokenJson.access_token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "LM-Subs",
        };
        const [userRes, emailsRes] = await Promise.all([
          fetchImpl("https://api.github.com/user", { headers: ghHeaders }),
          fetchImpl("https://api.github.com/user/emails", { headers: ghHeaders }),
        ]);
        const ghUser = await userRes.json();
        const ghEmails = await emailsRes.json();
        const primary = Array.isArray(ghEmails)
          ? ghEmails.find((e) => e.primary && e.verified) ||
            ghEmails.find((e) => e.verified)
          : null;
        email = String(primary?.email || ghUser?.email || "").toLowerCase();
        name = String(ghUser?.name || ghUser?.login || "");
        avatarUrl = String(ghUser?.avatar_url || "");
      }

      if (!EMAIL_RE.test(email)) {
        return c.redirect(`${origin}/?view=library&auth_error=missing_email`, 302);
      }

      const account = await upsertAccountByEmail(db, {
        email,
        name,
        avatarUrl,
        provider,
      });
      const session = await issueSessionForUser(
        db,
        account.id,
        stateRow.device_label || "web"
      );

      const dest = new URL(stateRow.redirect_after || "/?view=library", origin);
      dest.hash = `auth_token=${encodeURIComponent(session.token)}`;
      return c.redirect(dest.toString(), 302);
    } catch {
      return c.redirect(`${origin}/?view=library&auth_error=oauth_failed`, 302);
    }
  });

  // Backward-compatible email + password registration & sign-in
  app.post("/api/auth/signup", async (c) => {
    const db = await resolveDb();
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON body." }, 400);
    }

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const name = String(body?.name || "").trim().slice(0, 80);
    const deviceLabel = String(body?.deviceLabel || "web").slice(0, 64);

    if (!EMAIL_RE.test(email)) {
      return c.json({ ok: false, error: "Enter a valid email address." }, 400);
    }
    if (password.length < 8) {
      return c.json(
        { ok: false, error: "Password must be at least 8 characters." },
        400
      );
    }

    const existing = await db.query(
      "SELECT id FROM lmsubs_users WHERE email = $1 LIMIT 1",
      [email]
    );
    if (existing.rows.length > 0) {
      return c.json(
        { ok: false, error: "An account with this email already exists. Sign in instead." },
        409
      );
    }

    const userId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const passwordHash = await hashPassword(password);

    await db.query(
      `INSERT INTO lmsubs_users (id, email, name, password_hash, auth_provider)
       VALUES ($1, $2, $3, $4, 'neon-postgres')`,
      [userId, email, name || email.split("@")[0], passwordHash]
    );

    const session = await issueSessionForUser(db, userId, deviceLabel);
    const summary = await readSyncSummary(db, userId);

    return c.json(
      {
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt,
        user: {
          id: userId,
          email,
          name: name || email.split("@")[0],
        },
        summary,
      },
      201
    );
  });

  app.post("/api/auth/signin", async (c) => {
    const db = await resolveDb();
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON body." }, 400);
    }

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const deviceLabel = String(body?.deviceLabel || "web").slice(0, 64);

    if (!email || !password) {
      return c.json(
        { ok: false, error: "Email and password are required." },
        400
      );
    }

    const found = await db.query(
      `SELECT id, email, name, avatar_url, auth_provider, password_hash
       FROM lmsubs_users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );
    const userRow = found.rows[0];
    if (!userRow || !userRow.password_hash) {
      return c.json({ ok: false, error: "Invalid email or password." }, 401);
    }

    const valid = await verifyPassword(password, userRow.password_hash);
    if (!valid) {
      return c.json({ ok: false, error: "Invalid email or password." }, 401);
    }

    const session = await issueSessionForUser(db, userRow.id, deviceLabel);
    const summary = await readSyncSummary(db, userRow.id);

    return c.json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name || "",
        avatarUrl: userRow.avatar_url || "",
        authProvider: userRow.auth_provider || "email",
      },
      summary,
    });
  });

  app.post("/api/auth/signout", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (user?.tokenHash) {
      await db.query("DELETE FROM lmsubs_sessions WHERE token_hash = $1", [
        user.tokenHash,
      ]);
    }
    return c.json({ ok: true });
  });

  app.get("/api/auth/me", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }
    const summary = await readSyncSummary(db, user.id);
    return c.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || "",
        authProvider: user.authProvider || "email",
      },
      summary,
    });
  });

  app.post("/api/auth/extension-token", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }
    const session = await issueSessionForUser(db, user.id, "chrome-extension");
    return c.json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
    });
  });

  // Granular Sync Opt-In Preferences (`syncApiKeys`, `syncTranscripts`, `syncSettings`)
  app.get("/api/sync/preferences", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }
    const syncPreferences = await readUserSyncPreferences(db, user.id);
    return c.json({ ok: true, syncPreferences });
  });

  app.put("/api/sync/preferences", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON body." }, 400);
    }

    const current = await readUserSyncPreferences(db, user.id);
    const nextPrefs = normalizeSyncPreferences({
      ...current,
      ...(body?.syncPreferences || body || {}),
    });

    await db.query(
      `INSERT INTO lmsubs_user_settings (user_id, settings_json, sync_prefs_json, updated_at)
       VALUES ($1, '{}'::jsonb, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET sync_prefs_json = EXCLUDED.sync_prefs_json,
             updated_at = NOW()`,
      [user.id, JSON.stringify(nextPrefs)]
    );

    if (body?.purgeDisabled) {
      if (!nextPrefs.syncApiKeys) {
        await db.query("DELETE FROM lmsubs_user_api_keys WHERE user_id = $1", [
          user.id,
        ]);
      }
      if (!nextPrefs.syncTranscripts) {
        await db.query("DELETE FROM lmsubs_subtitles WHERE user_id = $1", [
          user.id,
        ]);
      }
      if (!nextPrefs.syncSettings) {
        await db.query(
          "UPDATE lmsubs_user_settings SET settings_json = '{}'::jsonb WHERE user_id = $1",
          [user.id]
        );
      }
    }

    const summary = await readSyncSummary(db, user.id);
    return c.json({ ok: true, syncPreferences: nextPrefs, summary });
  });

  app.get("/api/sync/pull", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    const includeSecrets = c.req.query("includeSecrets") === "1";

    const [settingsRes, keysRes, subsRes] = await Promise.all([
      db.query(
        `SELECT settings_json, sync_prefs_json, updated_at
         FROM lmsubs_user_settings
         WHERE user_id = $1`,
        [user.id]
      ),
      db.query(
        `SELECT provider_id, ciphertext_b64, iv_b64, tag_b64, key_hint, updated_at
         FROM lmsubs_user_api_keys
         WHERE user_id = $1
         ORDER BY provider_id ASC`,
        [user.id]
      ),
      db.query(
        `SELECT cache_key, artifact_id, notebook_id, media_token, title, language,
                provider, model, cue_count, spoken_seconds, original_bytes, extracted_bytes,
                latency_ms, failover_used, cues_json, updated_at
         FROM lmsubs_subtitles
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 60`,
        [user.id]
      ),
    ]);

    const syncPreferences = normalizeSyncPreferences(
      settingsRes.rows[0]?.sync_prefs_json
    );

    const keyHints = {};
    const keyPresence = {};
    const apiKeys = {};

    if (syncPreferences.syncApiKeys) {
      for (const row of keysRes.rows) {
        keyHints[row.provider_id] = row.key_hint;
        keyPresence[row.provider_id] = true;
        if (includeSecrets) {
          try {
            apiKeys[row.provider_id] = decryptApiKeyForUser(
              user.id,
              {
                ciphertextB64: row.ciphertext_b64,
                ivB64: row.iv_b64,
                tagB64: row.tag_b64,
              },
              encryptionSecret
            );
          } catch {
            // Skip undecryptable legacy key without breaking sync
          }
        }
      }
    }

    const subtitles = syncPreferences.syncTranscripts
      ? subsRes.rows.map((r) => ({
          cacheKey: r.cache_key,
          artifactId: r.artifact_id,
          notebookId: r.notebook_id,
          mediaToken: r.media_token,
          title: r.title,
          language: r.language,
          provider: r.provider,
          model: r.model,
          cueCount: Number(r.cue_count) || 0,
          spokenSeconds: r.spoken_seconds ? Number(r.spoken_seconds) : null,
          originalBytes: r.original_bytes ? Number(r.original_bytes) : null,
          extractedBytes: r.extracted_bytes ? Number(r.extracted_bytes) : null,
          latencyMs: r.latency_ms ? Number(r.latency_ms) : null,
          failoverUsed: Boolean(r.failover_used),
          cues: Array.isArray(r.cues_json) ? r.cues_json : [],
          savedAt: r.updated_at,
        }))
      : [];

    const rawSettings = settingsRes.rows[0]?.settings_json || null;
    const effectiveSettings =
      syncPreferences.syncSettings &&
      rawSettings &&
      Object.keys(rawSettings).length > 0
        ? rawSettings
        : null;

    return c.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || "",
        authProvider: user.authProvider || "email",
      },
      syncPreferences,
      settings: effectiveSettings,
      settingsUpdatedAt: settingsRes.rows[0]?.updated_at || null,
      keyHints,
      keyPresence,
      ...(includeSecrets ? { apiKeys } : {}),
      subtitles,
      syncedAt: new Date().toISOString(),
    });
  });

  app.post("/api/sync/push", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON body." }, 400);
    }

    let syncPreferences = await readUserSyncPreferences(db, user.id);
    if (body?.syncPreferences && typeof body.syncPreferences === "object") {
      syncPreferences = normalizeSyncPreferences({
        ...syncPreferences,
        ...body.syncPreferences,
      });
      await db.query(
        `INSERT INTO lmsubs_user_settings (user_id, settings_json, sync_prefs_json, updated_at)
         VALUES ($1, '{}'::jsonb, $2::jsonb, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET sync_prefs_json = EXCLUDED.sync_prefs_json,
               updated_at = NOW()`,
        [user.id, JSON.stringify(syncPreferences)]
      );
    }

    if (
      syncPreferences.syncSettings &&
      body?.settings &&
      typeof body.settings === "object"
    ) {
      const cleanSettings = { ...body.settings };
      delete cleanSettings.syncToken;
      delete cleanSettings.syncPreferences;
      await db.query(
        `INSERT INTO lmsubs_user_settings (user_id, settings_json, sync_prefs_json, updated_at)
         VALUES ($1, $2::jsonb, $3::jsonb, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET settings_json = EXCLUDED.settings_json,
               updated_at = NOW()`,
        [user.id, JSON.stringify(cleanSettings), JSON.stringify(syncPreferences)]
      );
    }

    if (Array.isArray(body?.deletedProviders) && body.deletedProviders.length > 0) {
      for (const providerId of body.deletedProviders) {
        if (typeof providerId === "string" && providerId.trim()) {
          await db.query(
            `DELETE FROM lmsubs_user_api_keys
             WHERE user_id = $1 AND provider_id = $2`,
            [user.id, providerId.trim()]
          );
        }
      }
    }

    if (
      syncPreferences.syncApiKeys &&
      body?.apiKeys &&
      typeof body.apiKeys === "object"
    ) {
      for (const [providerId, rawKey] of Object.entries(body.apiKeys)) {
        if (typeof providerId !== "string" || !providerId.trim()) continue;
        const trimmedKey = typeof rawKey === "string" ? rawKey.trim() : "";
        if (!trimmedKey) continue;

        const enc = encryptApiKeyForUser(user.id, trimmedKey, encryptionSecret);
        await db.query(
          `INSERT INTO lmsubs_user_api_keys
             (user_id, provider_id, ciphertext_b64, iv_b64, tag_b64, key_hint, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (user_id, provider_id) DO UPDATE
             SET ciphertext_b64 = EXCLUDED.ciphertext_b64,
                 iv_b64 = EXCLUDED.iv_b64,
                 tag_b64 = EXCLUDED.tag_b64,
                 key_hint = EXCLUDED.key_hint,
                 updated_at = NOW()`,
          [
            user.id,
            providerId.trim(),
            enc.ciphertextB64,
            enc.ivB64,
            enc.tagB64,
            enc.keyHint,
          ]
        );
      }
    }

    if (Array.isArray(body?.deletedCacheKeys) && body.deletedCacheKeys.length > 0) {
      for (const ck of body.deletedCacheKeys) {
        if (typeof ck === "string" && ck.trim()) {
          await db.query(
            `DELETE FROM lmsubs_subtitles WHERE user_id = $1 AND cache_key = $2`,
            [user.id, ck.trim()]
          );
        }
      }
    }

    if (syncPreferences.syncTranscripts && Array.isArray(body?.subtitles)) {
      for (const sub of body.subtitles.slice(0, 60)) {
        if (!sub?.cacheKey || !Array.isArray(sub.cues) || sub.cues.length === 0) {
          continue;
        }
        const cacheKeyStr = String(sub.cacheKey);
        const existingSub = await db.query(
          `SELECT 1 FROM lmsubs_subtitles WHERE user_id = $1 AND cache_key = $2 LIMIT 1`,
          [user.id, cacheKeyStr]
        );

        const spokenSecs = Number.isFinite(Number(sub.spokenSeconds))
          ? Math.round(Number(sub.spokenSeconds))
          : estimateSpokenSeconds(sub.cues);
        const rawOrigBytes = Number.isFinite(Number(sub.originalBytes))
          ? Number(sub.originalBytes)
          : 0;
        const rawExtBytes = Number.isFinite(Number(sub.extractedBytes))
          ? Number(sub.extractedBytes)
          : 0;
        const byteStats = resolveAvoidedVideoBytes({
          originalBytes: rawOrigBytes,
          extractedBytes: rawExtBytes,
          durationSeconds: spokenSecs,
          cues: sub.cues,
        });
        const origBytes = byteStats.originalBytes > 0 ? byteStats.originalBytes : null;
        const extBytes = byteStats.extractedBytes > 0 ? byteStats.extractedBytes : null;
        const latMs = Number.isFinite(Number(sub.latencyMs))
          ? Math.round(Number(sub.latencyMs))
          : null;
        const prov = sub.provider ? String(sub.provider).slice(0, 40) : null;
        const lang = String(sub.language || "en").slice(0, 16);
        const failover = Boolean(sub.failoverUsed);

        await db.query(
          `INSERT INTO lmsubs_subtitles
             (user_id, cache_key, artifact_id, notebook_id, media_token, title,
              language, provider, model, cue_count, spoken_seconds, original_bytes,
              extracted_bytes, latency_ms, failover_used, cues_json, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, NOW())
           ON CONFLICT (user_id, cache_key) DO UPDATE
             SET artifact_id = COALESCE(EXCLUDED.artifact_id, lmsubs_subtitles.artifact_id),
                 notebook_id = COALESCE(EXCLUDED.notebook_id, lmsubs_subtitles.notebook_id),
                 media_token = COALESCE(EXCLUDED.media_token, lmsubs_subtitles.media_token),
                 title = EXCLUDED.title,
                 language = EXCLUDED.language,
                 provider = EXCLUDED.provider,
                 model = EXCLUDED.model,
                 cue_count = EXCLUDED.cue_count,
                 spoken_seconds = EXCLUDED.spoken_seconds,
                 original_bytes = EXCLUDED.original_bytes,
                 extracted_bytes = EXCLUDED.extracted_bytes,
                 latency_ms = EXCLUDED.latency_ms,
                 failover_used = EXCLUDED.failover_used,
                 cues_json = EXCLUDED.cues_json,
                 updated_at = NOW()`,
          [
            user.id,
            cacheKeyStr,
            sub.artifactId || null,
            sub.notebookId || null,
            sub.mediaToken || null,
            String(sub.title || "Video Overview").slice(0, 240),
            lang,
            prov,
            sub.model ? String(sub.model).slice(0, 80) : null,
            sub.cues.length,
            spokenSecs,
            origBytes,
            extBytes,
            latMs,
            failover,
            JSON.stringify(sub.cues),
          ]
        );

        if (existingSub.rows.length === 0) {
          await recordUsageEvent(db, user.id, {
            eventType: "transcription",
            cacheKey: cacheKeyStr,
            provider: prov,
            language: lang,
            cueCount: sub.cues.length,
            spokenSeconds: spokenSecs,
            originalBytes: origBytes || 0,
            extractedBytes: extBytes || 0,
            latencyMs: latMs,
            failoverUsed: failover,
          });
          await recordUserNotification(db, user.id, {
            kind: "ready",
            title: `Transcript synced: ${String(sub.title || "Video Overview").slice(0, 100)}`,
            body: `${sub.cues.length} cues stored via ${prov || "AI"}.`,
            cacheKey: cacheKeyStr,
          });
          if (failover) {
            await recordUserNotification(db, user.id, {
              kind: "failover",
              title: `Failover completed via ${prov || "backup provider"}`,
              body: `Automatic provider switch completed "${String(sub.title || "Video Overview").slice(0, 90)}".`,
              cacheKey: cacheKeyStr,
            });
          }
        }
      }
    }

    const summary = await readSyncSummary(db, user.id);
    return c.json({
      ok: true,
      syncedAt: new Date().toISOString(),
      summary,
    });
  });

  app.get("/api/sync/subtitle", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    const syncPreferences = await readUserSyncPreferences(db, user.id);
    if (!syncPreferences.syncTranscripts) {
      return c.json({ ok: true, entry: null });
    }

    const cacheKey = c.req.query("cacheKey") || "";
    const artifactId = c.req.query("artifactId") || "";
    const mediaToken = c.req.query("mediaToken") || "";

    if (!cacheKey && !artifactId && !mediaToken) {
      return c.json({ ok: true, entry: null });
    }

    const res = await db.query(
      `SELECT cache_key, artifact_id, notebook_id, media_token, title, language,
              provider, model, cue_count, spoken_seconds, original_bytes, extracted_bytes,
              latency_ms, failover_used, cues_json, updated_at
       FROM lmsubs_subtitles
       WHERE user_id = $1
         AND (
           ($2 <> '' AND cache_key = $2)
           OR ($3 <> '' AND artifact_id = $3)
           OR ($4 <> '' AND media_token = $4)
         )
       ORDER BY updated_at DESC
       LIMIT 1`,
      [user.id, cacheKey, artifactId, mediaToken]
    );

    if (res.rows.length === 0) {
      return c.json({ ok: true, entry: null });
    }

    const r = res.rows[0];
    await recordUsageEvent(db, user.id, {
      eventType: "cloud_hit",
      cacheKey: r.cache_key,
      provider: r.provider,
      language: r.language,
      cueCount: Number(r.cue_count) || 0,
    });

    return c.json({
      ok: true,
      entry: {
        cacheKey: r.cache_key,
        artifactId: r.artifact_id,
        notebookId: r.notebook_id,
        mediaToken: r.media_token,
        title: r.title,
        language: r.language,
        provider: r.provider,
        model: r.model,
        cueCount: Number(r.cue_count) || 0,
        spokenSeconds: r.spoken_seconds ? Number(r.spoken_seconds) : null,
        originalBytes: r.original_bytes ? Number(r.original_bytes) : null,
        extractedBytes: r.extracted_bytes ? Number(r.extracted_bytes) : null,
        latencyMs: r.latency_ms ? Number(r.latency_ms) : null,
        failoverUsed: Boolean(r.failover_used),
        cues: Array.isArray(r.cues_json) ? r.cues_json : [],
        savedAt: r.updated_at,
      },
    });
  });

  // Inline Caption Cue Editor API
  app.put("/api/sync/subtitle", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON body." }, 400);
    }

    const cacheKey = String(body?.cacheKey || "").trim();
    if (!cacheKey) {
      return c.json({ ok: false, error: "cacheKey is required." }, 400);
    }

    const normalizedCues = normalizeAndSortCues(body?.cues || []);
    if (normalizedCues.length === 0) {
      return c.json(
        { ok: false, error: "Transcript must keep at least one valid cue." },
        400
      );
    }

    const found = await db.query(
      `SELECT cache_key, title, language
       FROM lmsubs_subtitles
       WHERE user_id = $1 AND cache_key = $2
       LIMIT 1`,
      [user.id, cacheKey]
    );
    if (found.rows.length === 0) {
      return c.json({ ok: false, error: "Subtitle transcript not found." }, 404);
    }

    const nextTitle =
      typeof body?.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 240)
        : found.rows[0].title;
    const nextLang =
      typeof body?.language === "string" && body.language.trim()
        ? body.language.trim().slice(0, 16)
        : found.rows[0].language || "en";
    const spokenSecs = estimateSpokenSeconds(normalizedCues);

    const updated = await db.query(
      `UPDATE lmsubs_subtitles
       SET title = $3,
           language = $4,
           cue_count = $5,
           spoken_seconds = $6,
           cues_json = $7::jsonb,
           updated_at = NOW()
       WHERE user_id = $1 AND cache_key = $2
       RETURNING cache_key, artifact_id, notebook_id, media_token, title, language,
                 provider, model, cue_count, spoken_seconds, original_bytes,
                 extracted_bytes, latency_ms, failover_used, cues_json, updated_at`,
      [
        user.id,
        cacheKey,
        nextTitle,
        nextLang,
        normalizedCues.length,
        spokenSecs,
        JSON.stringify(normalizedCues),
      ]
    );

    const r = updated.rows[0];
    await recordUserNotification(db, user.id, {
      kind: "edit",
      title: `Edited cues: ${r.title}`,
      body: `Saved ${normalizedCues.length} updated cues to cloud storage.`,
      cacheKey: r.cache_key,
    });

    return c.json({
      ok: true,
      entry: {
        cacheKey: r.cache_key,
        artifactId: r.artifact_id,
        notebookId: r.notebook_id,
        mediaToken: r.media_token,
        title: r.title,
        language: r.language,
        provider: r.provider,
        model: r.model,
        cueCount: Number(r.cue_count) || 0,
        spokenSeconds: r.spoken_seconds ? Number(r.spoken_seconds) : null,
        cues: Array.isArray(r.cues_json) ? r.cues_json : normalizedCues,
        savedAt: r.updated_at,
      },
    });
  });

  // Cloud Notification Center API
  app.get("/api/notifications", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    const res = await db.query(
      `SELECT id, kind, title, body, cache_key, is_read, created_at
       FROM lmsubs_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );

    const notifications = res.rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      cacheKey: r.cache_key,
      read: Boolean(r.is_read),
      createdAt: r.created_at,
    }));
    const unreadCount = notifications.filter((n) => !n.read).length;

    return c.json({
      ok: true,
      unreadCount,
      notifications,
    });
  });

  app.post("/api/notifications/read", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    let body = {};
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    if (body?.id && typeof body.id === "string") {
      await db.query(
        `UPDATE lmsubs_notifications
         SET is_read = TRUE
         WHERE user_id = $1 AND id = $2`,
        [user.id, body.id.trim()]
      );
    } else {
      await db.query(
        `UPDATE lmsubs_notifications
         SET is_read = TRUE
         WHERE user_id = $1 AND is_read = FALSE`,
        [user.id]
      );
    }

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM lmsubs_notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [user.id]
    );
    return c.json({
      ok: true,
      unreadCount: Number(countRes.rows[0]?.count) || 0,
    });
  });

  app.delete("/api/notifications", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    await db.query(`DELETE FROM lmsubs_notifications WHERE user_id = $1`, [
      user.id,
    ]);
    return c.json({ ok: true, unreadCount: 0, notifications: [] });
  });

  app.get("/api/sync/export", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    const cacheKey = c.req.query("cacheKey") || "";
    const artifactId = c.req.query("artifactId") || "";
    const format = (c.req.query("format") || "srt").toLowerCase();

    if (!cacheKey && !artifactId) {
      return c.json({ ok: false, error: "cacheKey or artifactId is required." }, 400);
    }

    const res = await db.query(
      `SELECT cache_key, artifact_id, title, language, provider, model, cues_json, updated_at
       FROM lmsubs_subtitles
       WHERE user_id = $1
         AND (($2 <> '' AND cache_key = $2) OR ($3 <> '' AND artifact_id = $3))
       ORDER BY updated_at DESC
       LIMIT 1`,
      [user.id, cacheKey, artifactId]
    );

    if (res.rows.length === 0) {
      return c.json({ ok: false, error: "Subtitle transcript not found." }, 404);
    }

    const r = res.rows[0];
    const cues = Array.isArray(r.cues_json) ? r.cues_json : [];
    const serialized = serializeSubtitles(cues, format, {
      title: r.title,
      language: r.language || "en",
      provider: r.provider,
      model: r.model,
      artifactId: r.artifact_id,
    });

    await recordUsageEvent(db, user.id, {
      eventType: "export",
      cacheKey: r.cache_key,
      provider: r.provider,
      language: r.language,
      format: serialized.extension,
      cueCount: cues.length,
    });

    return new Response(serialized.content, {
      status: 200,
      headers: {
        "Content-Type": serialized.mimeType,
        "Content-Disposition": `attachment; filename="${serialized.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });

  app.get("/api/sync/export-all", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    const res = await db.query(
      `SELECT cache_key, artifact_id, notebook_id, media_token, title, language,
              provider, model, cue_count, spoken_seconds, original_bytes, extracted_bytes,
              latency_ms, failover_used, cues_json, updated_at
       FROM lmsubs_subtitles
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [user.id]
    );

    const transcripts = res.rows.map((r) => ({
      cacheKey: r.cache_key,
      artifactId: r.artifact_id,
      notebookId: r.notebook_id,
      mediaToken: r.media_token,
      title: r.title,
      language: r.language,
      provider: r.provider,
      model: r.model,
      cueCount: Number(r.cue_count) || 0,
      spokenSeconds: r.spoken_seconds ? Number(r.spoken_seconds) : null,
      cues: Array.isArray(r.cues_json) ? r.cues_json : [],
      savedAt: r.updated_at,
    }));

    await recordUsageEvent(db, user.id, {
      eventType: "export",
      format: "vault-json",
      cueCount: transcripts.reduce((sum, t) => sum + t.cueCount, 0),
    });

    const filename = `lm-subs-vault-${new Date().toISOString().slice(0, 10)}.json`;
    const body = `${JSON.stringify(
      {
        schema: "lm-subs-vault/v1",
        exportedAt: new Date().toISOString(),
        count: transcripts.length,
        transcripts,
      },
      null,
      2
    )}\n`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });

  // Real User Statistics & Metrics API
  app.post("/api/stats/event", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON body." }, 400);
    }
    await recordUsageEvent(db, user.id, body || {});
    return c.json({ ok: true });
  });

  app.get("/api/stats", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    const [subsRes, eventsRes, keysRes] = await Promise.all([
      db.query(
        `SELECT cache_key, title, language, provider, model, cue_count, spoken_seconds,
                original_bytes, extracted_bytes, latency_ms, failover_used, cues_json, updated_at
         FROM lmsubs_subtitles
         WHERE user_id = $1
         ORDER BY updated_at DESC`,
        [user.id]
      ),
      db.query(
        `SELECT event_type, provider, language, format, cue_count, spoken_seconds,
                original_bytes, extracted_bytes, latency_ms, failover_used, created_at
         FROM lmsubs_usage_events
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 500`,
        [user.id]
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM lmsubs_user_api_keys WHERE user_id = $1`,
        [user.id]
      ),
    ]);

    const subs = subsRes.rows;
    const events = eventsRes.rows;

    let totalCues = 0;
    let totalSpokenSeconds = 0;
    let totalOriginalBytes = 0;
    let totalExtractedBytes = 0;
    let failoverCount = 0;
    const latencies = [];
    const providerMap = new Map();
    const languageMap = new Map();
    const dayMap = new Map();

    // Seed last 14 days in UTC so the timeline always has continuous dates
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dayMap.set(d, { date: d, videos: 0, cues: 0, savedBytes: 0 });
    }

    for (const r of subs) {
      const cues = Array.isArray(r.cues_json) ? r.cues_json : [];
      const cueCount = Number(r.cue_count) || cues.length;
      const spokenSec = Number(r.spoken_seconds) || estimateSpokenSeconds(cues);
      const byteStats = resolveAvoidedVideoBytes({
        originalBytes: Number(r.original_bytes) || 0,
        extractedBytes: Number(r.extracted_bytes) || 0,
        durationSeconds: spokenSec,
        cues,
      });
      const origB = byteStats.originalBytes;
      const extB = byteStats.extractedBytes;
      const savedB = byteStats.savedBytes;
      const lat = Number(r.latency_ms);

      totalCues += cueCount;
      totalSpokenSeconds += spokenSec;
      totalOriginalBytes += origB;
      totalExtractedBytes += extB;
      if (r.failover_used) failoverCount += 1;
      if (Number.isFinite(lat) && lat > 0) latencies.push(lat);

      const provKey = String(r.provider || "manual").toLowerCase();
      const prevProv = providerMap.get(provKey) || {
        provider: provKey,
        videos: 0,
        cues: 0,
        latencies: [],
      };
      prevProv.videos += 1;
      prevProv.cues += cueCount;
      if (Number.isFinite(lat) && lat > 0) prevProv.latencies.push(lat);
      providerMap.set(provKey, prevProv);

      const langKey = String(r.language || "en").toLowerCase();
      languageMap.set(langKey, (languageMap.get(langKey) || 0) + 1);

      const dayKey = new Date(r.updated_at || Date.now())
        .toISOString()
        .slice(0, 10);
      if (dayMap.has(dayKey)) {
        const bucket = dayMap.get(dayKey);
        bucket.videos += 1;
        bucket.cues += cueCount;
        bucket.savedBytes += savedB;
      }
    }

    latencies.sort((a, b) => a - b);
    const medianLatencyMs =
      latencies.length === 0
        ? null
        : latencies[Math.floor(latencies.length / 2)];
    const avgLatencyMs =
      latencies.length === 0
        ? null
        : Math.round(
            latencies.reduce((sum, v) => sum + v, 0) / latencies.length
          );

    const exportCount = events.filter((e) => e.event_type === "export").length;
    const cloudHitCount = events.filter(
      (e) => e.event_type === "cloud_hit"
    ).length;

    const totalVideos = subs.length;
    const byProvider = [...providerMap.values()]
      .sort((a, b) => b.videos - a.videos)
      .map((p) => ({
        provider: p.provider,
        videos: p.videos,
        cues: p.cues,
        sharePct:
          totalVideos > 0 ? Math.round((p.videos / totalVideos) * 100) : 0,
        avgLatencyMs:
          p.latencies.length > 0
            ? Math.round(
                p.latencies.reduce((s, v) => s + v, 0) / p.latencies.length
              )
            : null,
      }));

    const byLanguage = [...languageMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([language, videos]) => ({ language, videos }));

    return c.json({
      ok: true,
      totals: {
        videosCaptioned: totalVideos,
        totalCues,
        spokenSeconds: totalSpokenSeconds,
        spokenMinutes: Math.round((totalSpokenSeconds / 60) * 10) / 10,
        originalMediaBytes: totalOriginalBytes,
        extractedAudioBytes: totalExtractedBytes,
        bandwidthSavedBytes: Math.max(0, totalOriginalBytes - totalExtractedBytes),
        medianLatencyMs,
        avgLatencyMs,
        failoverCount,
        exportCount,
        cloudHitCount,
        encryptedKeyCount: Number(keysRes.rows[0]?.count) || 0,
      },
      byProvider,
      byLanguage,
      dailySeries: [...dayMap.values()],
      recentTranscripts: subs.slice(0, 15).map((r) => ({
        cacheKey: r.cache_key,
        title: r.title,
        language: r.language,
        provider: r.provider,
        model: r.model,
        cueCount: Number(r.cue_count) || 0,
        spokenSeconds: r.spoken_seconds ? Number(r.spoken_seconds) : null,
        originalBytes: r.original_bytes ? Number(r.original_bytes) : null,
        extractedBytes: r.extracted_bytes ? Number(r.extracted_bytes) : null,
        latencyMs: r.latency_ms ? Number(r.latency_ms) : null,
        failoverUsed: Boolean(r.failover_used),
        savedAt: r.updated_at,
      })),
    });
  });

  app.onError((err, c) => {
    console.error("[LM Subs API Error]", err?.message || err);
    return c.json(
      {
        ok: false,
        error: "Server error while processing request. Check server logs.",
      },
      500
    );
  });

  return app;
}

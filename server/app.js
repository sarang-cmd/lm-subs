/**
 * LM Subs — Hono Cloud Sync & Neon Auth API (`server/app.js`).
 *
 * Portable Web-Standard `fetch(request)` application that runs identically on:
 * 1. Neon Functions (`server/neon-function.js` via `neon dev` / `neon deploy`)
 * 2. Vercel Serverless / Fluid Compute (`api/[...route].js`)
 * 3. Local Node Server (`serve-docs.mjs` via `npm run site` / `npm start`)
 *
 * Security invariants:
 * - Every `/api/sync/*` query is strictly scoped to the authenticated `user.id` (`WHERE user_id = $1`).
 * - BYOK API keys are encrypted at rest with per-user HKDF-SHA256 + AES-256-GCM (`lmsubs_user_api_keys`).
 * - Supports both Neon Managed Better Auth Ed25519 JWTs (`NEON_AUTH_JWKS_URL`) and
 *   built-in `lmsubs_sessions` bearer tokens (`lms_...`).
 */

import crypto from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRemoteJWKSet, jwtVerify } from "jose";
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

export function createSyncApp({
  dbPromise = null,
  encryptionSecret = "",
  jwksVerifier = null,
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

    // Path 1: Hashed `lmsubs_sessions` token (`lms_...`)
    if (rawToken.startsWith("lms_")) {
      const tokenHash = sha256Hex(rawToken);
      const res = await db.query(
        `SELECT u.id, u.email, u.name, s.token_hash
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
        tokenHash: res.rows[0].token_hash,
      };
    }

    // Path 2: Neon Managed Better Auth JWT verified against `NEON_AUTH_JWKS_URL`
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
         RETURNING id, email, name`,
        [sub, email, name]
      );
      const row = upserted.rows[0];
      return {
        id: row.id,
        email: row.email,
        name: row.name || "",
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
        `SELECT updated_at FROM lmsubs_user_settings WHERE user_id = $1`,
        [userId]
      ),
    ]);

    const keyHints = {};
    for (const r of keysRes.rows) {
      keyHints[r.provider_id] = r.key_hint;
    }

    return {
      keyCount: keysRes.rows.length,
      keyHints,
      subtitleCount: subsRes.rows[0]?.count || 0,
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
      version: "0.2.0",
      neonProjectId: db.projectId || "falling-cherry-16443194",
      databaseMode: db.mode,
      neonManagedAuth: Boolean(process.env.NEON_AUTH_BASE_URL),
      serverTime: ping.rows[0]?.server_time || new Date().toISOString(),
    });
  });

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
      `SELECT id, email, name, password_hash
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
      user: { id: user.id, email: user.email, name: user.name },
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

  app.get("/api/sync/pull", async (c) => {
    const db = await resolveDb();
    const user = await authenticateRequest(c, db);
    if (!user) {
      return c.json({ ok: false, error: "Unauthorized" }, 401);
    }

    const includeSecrets = c.req.query("includeSecrets") === "1";

    const [settingsRes, keysRes, subsRes] = await Promise.all([
      db.query(
        `SELECT settings_json, updated_at
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
                provider, model, cue_count, original_bytes, extracted_bytes,
                latency_ms, cues_json, updated_at
         FROM lmsubs_subtitles
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 50`,
        [user.id]
      ),
    ]);

    const keyHints = {};
    const keyPresence = {};
    const apiKeys = {};

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
          // Ignore key encrypted under rotated secret
        }
      }
    }

    const subtitles = subsRes.rows.map((r) => ({
      cacheKey: r.cache_key,
      artifactId: r.artifact_id,
      notebookId: r.notebook_id,
      mediaToken: r.media_token,
      title: r.title,
      language: r.language,
      provider: r.provider,
      model: r.model,
      cueCount: Number(r.cue_count) || 0,
      originalBytes: r.original_bytes ? Number(r.original_bytes) : null,
      extractedBytes: r.extracted_bytes ? Number(r.extracted_bytes) : null,
      latencyMs: r.latency_ms ? Number(r.latency_ms) : null,
      cues: Array.isArray(r.cues_json) ? r.cues_json : [],
      savedAt: r.updated_at,
    }));

    return c.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
      settings: settingsRes.rows[0]?.settings_json || null,
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

    if (body?.settings && typeof body.settings === "object") {
      const cleanSettings = { ...body.settings };
      // Never persist cloud auth tokens inside settings JSON
      delete cleanSettings.syncToken;
      await db.query(
        `INSERT INTO lmsubs_user_settings (user_id, settings_json, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET settings_json = EXCLUDED.settings_json,
               updated_at = NOW()`,
        [user.id, JSON.stringify(cleanSettings)]
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

    if (body?.apiKeys && typeof body.apiKeys === "object") {
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

    if (Array.isArray(body?.subtitles)) {
      for (const sub of body.subtitles.slice(0, 50)) {
        if (!sub?.cacheKey || !Array.isArray(sub.cues) || sub.cues.length === 0) {
          continue;
        }
        await db.query(
          `INSERT INTO lmsubs_subtitles
             (user_id, cache_key, artifact_id, notebook_id, media_token, title,
              language, provider, model, cue_count, original_bytes, extracted_bytes,
              latency_ms, cues_json, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, NOW())
           ON CONFLICT (user_id, cache_key) DO UPDATE
             SET artifact_id = COALESCE(EXCLUDED.artifact_id, lmsubs_subtitles.artifact_id),
                 notebook_id = COALESCE(EXCLUDED.notebook_id, lmsubs_subtitles.notebook_id),
                 media_token = COALESCE(EXCLUDED.media_token, lmsubs_subtitles.media_token),
                 title = EXCLUDED.title,
                 language = EXCLUDED.language,
                 provider = EXCLUDED.provider,
                 model = EXCLUDED.model,
                 cue_count = EXCLUDED.cue_count,
                 original_bytes = EXCLUDED.original_bytes,
                 extracted_bytes = EXCLUDED.extracted_bytes,
                 latency_ms = EXCLUDED.latency_ms,
                 cues_json = EXCLUDED.cues_json,
                 updated_at = NOW()`,
          [
            user.id,
            String(sub.cacheKey),
            sub.artifactId || null,
            sub.notebookId || null,
            sub.mediaToken || null,
            String(sub.title || "Video Overview").slice(0, 240),
            String(sub.language || "en").slice(0, 16),
            sub.provider ? String(sub.provider).slice(0, 40) : null,
            sub.model ? String(sub.model).slice(0, 80) : null,
            sub.cues.length,
            Number.isFinite(Number(sub.originalBytes)) ? Number(sub.originalBytes) : null,
            Number.isFinite(Number(sub.extractedBytes)) ? Number(sub.extractedBytes) : null,
            Number.isFinite(Number(sub.latencyMs)) ? Math.round(Number(sub.latencyMs)) : null,
            JSON.stringify(sub.cues),
          ]
        );
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

    const cacheKey = c.req.query("cacheKey") || "";
    const artifactId = c.req.query("artifactId") || "";
    const mediaToken = c.req.query("mediaToken") || "";

    if (!cacheKey && !artifactId && !mediaToken) {
      return c.json({ ok: true, entry: null });
    }

    const res = await db.query(
      `SELECT cache_key, artifact_id, notebook_id, media_token, title, language,
              provider, model, cue_count, original_bytes, extracted_bytes,
              latency_ms, cues_json, updated_at
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
        originalBytes: r.original_bytes ? Number(r.original_bytes) : null,
        extractedBytes: r.extracted_bytes ? Number(r.extracted_bytes) : null,
        latencyMs: r.latency_ms ? Number(r.latency_ms) : null,
        cues: Array.isArray(r.cues_json) ? r.cues_json : [],
        savedAt: r.updated_at,
      },
    });
  });

  return app;
}

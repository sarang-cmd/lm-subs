# LM Subs — Deployment & Operations Guide

Complete production runbook for provisioning **Neon** (Lakebase Postgres + Managed Better Auth), deploying the **LM Subs Web Console & Sync API** (Vercel, Neon Functions, or Node/Docker), and distributing the **Chrome Manifest V3 Extension**.

---

## Table of Contents

1. [Architecture & Runtime Targets](#1-architecture--runtime-targets)
2. [Environment Variables Reference](#2-environment-variables-reference)
3. [Step-by-Step: Provisioning Neon (`neon.ts`)](#3-step-by-step-provisioning-neon-neonts)
4. [Database Schema & Migrations (`db/schema.sql`)](#4-database-schema--migrations-dbschemasql)
5. [Deploying to Vercel (Recommended Web + API Host)](#5-deploying-to-vercel-recommended-web--api-host)
6. [Deploying to Neon Functions](#6-deploying-to-neon-functions)
7. [Self-Hosting with Node.js / VPS / Docker](#7-self-hosting-with-nodejs--vps--docker)
8. [Connecting the Chrome Extension & Packaging Releases](#8-connecting-the-chrome-extension--packaging-releases)
9. [API & Subtitle Export Endpoints Verification](#9-api--subtitle-export-endpoints-verification)
10. [Security & Key-Rotation Operations](#10-security--key-rotation-operations)

---

## 1. Architecture & Runtime Targets

LM Subs splits cleanly into two deployable artifacts built from one repository:

| Component | Entrypoint / Artifact | Role |
| :--- | :--- | :--- |
| **Chrome MV3 Extension** | `extension/` · `docs/releases/lm-subs-v0.2.0.zip` | Captures NotebookLM Video Overview audio (`=m140` / `HTTP 206` Range), runs the 12-provider BYOK STT failover queue, renders synchronized captions, exports `.SRT`/`.VTT`/`.TXT`/`.JSON`, and syncs encrypted state with Neon. |
| **Web Console + Sync API** | `docs/` + `server/app.js` (`api/[...route].js` / `server/neon-function.js` / `serve-docs.mjs`) | Serves the static Braun Web Console and `/api/*` Hono endpoints backed by **Neon Lakebase Postgres** (`pg.Pool` + `attachDatabasePool`). |

---

## 2. Environment Variables Reference

Copy `.env.example` to `.env.local` (or configure in your hosting dashboard):

| Variable | Required | Source | Purpose |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** *(Prod)* | Auto-injected by `neon deploy` | **Pooled** Lakebase Postgres connection string (`-pooler` host) used by runtime `/api/*` queries (`pg.Pool`, `max: 5`). |
| `DATABASE_URL_UNPOOLED` | Recommended | Auto-injected by `neon deploy` | **Direct** Postgres connection string used by `npm run db:migrate` DDL migrations. Falls back to `DATABASE_URL` if unset. |
| `LM_SUBS_ENCRYPTION_SECRET` | **Yes** *(Prod)* | Generate via `openssl rand -base64 32` | Master secret for `HKDF-SHA256` per-user key derivation + `AES-256-GCM` encryption of BYOK API keys in `lmsubs_user_api_keys`. |
| `NEON_AUTH_BASE_URL` | Optional | Auto-injected by `neon deploy` (`auth: true`) | Issuer origin for **Neon Managed Better Auth** session tokens. |
| `NEON_AUTH_JWKS_URL` | Optional | Auto-injected by `neon deploy` (`auth: true`) | Ed25519 JWKS endpoint verified via `jose` (`createRemoteJWKSet`). Built-in `scrypt` + `lms_...` session tokens work out-of-the-box even when unset. |
| `NEON_PROJECT_ID` | Optional | `.neon` (`falling-cherry-16443194`) | Surfaced in `/api/health` diagnostics. |
| `PORT` | Optional | Default `4173` | Listening port when running `npm start` (`serve-docs.mjs`). |

> **Local Zero-Config Mode**: When `DATABASE_URL` is omitted locally, `server/db.js` automatically starts an embedded `@electric-sql/pglite` PostgreSQL 18 instance (`.data/pglite` or in-memory during `npm test`) running the exact same `db/schema.sql`.

---

## 3. Step-by-Step: Provisioning Neon (`neon.ts`)

This repository is pre-configured with `@neon/config/v1` Infrastructure-as-Code in [`neon.ts`](neon.ts) for:
- **Organization ID**: `org-snowy-moon-42934547`
- **Project ID**: `falling-cherry-16443194`
- **Default Branch**: `production` (with automatic `7d` TTL on non-default preview branches)

### 3.1 Install & Authenticate Neon CLI

```bash
npm install -g neon@latest
neon login
```

### 3.2 Link Project (if cloning fresh)

`.neon` is gitignored per Neon best practices so local branch bindings stay per-developer. Initialize or link your checkout:

```bash
neon init -y \
  --org-id org-snowy-moon-42934547 \
  --project-id falling-cherry-16443194 \
  --branch production \
  --services postgres
```

### 3.3 Deploy `neon.ts` & Pull Credentials

```bash
neon deploy
```

`neon deploy` reads `neon.ts` (`auth: true`), enables **Neon Auth** and **Lakebase Postgres** on your branch, and writes `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_JWKS_URL` into `.env.local`.

### 3.4 Generate Your Master Encryption Secret

Generate a high-entropy 256-bit secret and append it to `.env.local` (and save a copy in your password manager / Vercel Secrets):

```bash
echo "LM_SUBS_ENCRYPTION_SECRET=$(openssl rand -base64 32)" >> .env.local
```

---

## 4. Database Schema & Migrations (`db/schema.sql`)

All DDL in [`db/schema.sql`](db/schema.sql) is strictly idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). While `server/db.js` automatically ensures the schema on cold boot, run migrations explicitly against `DATABASE_URL_UNPOOLED` during CI/CD:

```bash
npm run db:migrate
```

### Tables Created in Lakebase Postgres

| Table | Primary Key / Unique | Contents |
| :--- | :--- | :--- |
| `lmsubs_users` | `id` (`TEXT`), `UNIQUE(email)` | User profile + `scrypt` password hash (or `neon-managed` marker for Neon Auth JWT users). |
| `lmsubs_sessions` | `id` (`TEXT`), `UNIQUE(token_sha256)` | `SHA-256` hashed `lms_...` bearer tokens for Chrome MV3 Service Workers & Web Console sessions (90-day sliding expiry). |
| `lmsubs_user_settings` | `user_id` (`TEXT`) | JSONB provider queue order, language/translation hints, caption size, sync offset, and regex exclusions. |
| `lmsubs_user_api_keys` | `(user_id, provider_id)` | `ciphertext_b64`, 96-bit `iv_b64`, 128-bit `tag_b64`, and masked `key_hint` (`gsk_••••9xQ2`). Plaintext API keys are **never** stored. |
| `lmsubs_subtitles` | `(user_id, cache_key)` | Synced Video Overview `.SRT`/`.VTT`/`.TXT`/`.JSON` cue arrays (`cues_json` JSONB), byte-savings telemetry, and indexes on `(user_id, artifact_id)` and `(user_id, media_token)`. |

---

## 5. Deploying to Vercel (Recommended Web + API Host)

[`vercel.json`](vercel.json) and [`api/[...route].js`](api/[...route].js) are pre-wired so a single Vercel deployment hosts **both**:
- Static Web Console & release `.zip` (`docs/` at `/`)
- Serverless / Fluid Compute Neon Sync & Export API (`/api/*` -> `api/[...route].js`)

### 5.1 Connect Neon + Vercel

Option A — **Vercel Marketplace Neon Integration** (auto-syncs preview database branches per PR):
1. Import `sarang-cmd/notebooklm-subtitles` in Vercel.
2. Connect the **Neon** integration to project `falling-cherry-16443194`.
3. Add `LM_SUBS_ENCRYPTION_SECRET` under **Project Settings → Environment Variables** (`Production`, `Preview`, `Development`).

Option B — **Vercel CLI**:

```bash
npm i -g vercel
vercel link
vercel env add DATABASE_URL production
vercel env add DATABASE_URL_UNPOOLED production
vercel env add LM_SUBS_ENCRYPTION_SECRET production
vercel env add NEON_AUTH_BASE_URL production      # optional if using Neon Managed Auth
vercel env add NEON_AUTH_JWKS_URL production      # optional if using Neon Managed Auth
vercel --prod
```

> **Connection Pooling Note**: `server/db.js` instantiates `pg.Pool({ max: 5 })` at module scope and attaches it via `attachDatabasePool(pool)` (`@neon/functions`), preventing idle connection leaks across Fluid Compute / serverless invocations. Always pass Neon's `-pooler` URL in `DATABASE_URL`.

---

## 6. Deploying to Neon Functions

[`server/neon-function.js`](server/neon-function.js) exports a standard Fetch handler compatible with **Neon Functions**.

> **Region Availability**: Neon Functions currently support projects in `aws-us-east-2`, `aws-us-east-1`, `aws-eu-central-1`, and `aws-ap-southeast-1`.

If your Neon project is in one of those regions, add the `functions` block to `neon.ts`:

```ts
import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  functions: {
    lmsubs: {
      name: "LM Subs Sync API",
      source: "server/neon-function.js",
    },
  },
  branch: (branch) => (branch.isDefault || branch.exists ? {} : { ttl: "7d" }),
});
```

Then deploy and stream logs with:

```bash
neon dev       # Local live reload against a Neon dev branch
neon deploy    # Deploy Postgres + Auth + Function to production
neon logs      # Tail function execution logs
```

---

## 7. Self-Hosting with Node.js / VPS / Docker

[`serve-docs.mjs`](serve-docs.mjs) serves both the static `docs/` Web Console and all `/api/*` routes from a single lightweight Node 20+ HTTP server bound to `0.0.0.0`:

```bash
npm ci --omit=dev
export DATABASE_URL="postgresql://user:pass@ep-example-pooler.region.aws.neon.tech/neondb?sslmode=require"
export LM_SUBS_ENCRYPTION_SECRET="$(openssl rand -base64 32)"
export PORT=4173
npm start
```

Put Caddy, Nginx, or Cloudflare Tunnel in front of `127.0.0.1:4173` for automatic TLS (`https://subs.yourdomain.com`).

---

## 8. Connecting the Chrome Extension & Packaging Releases

### 8.1 Build & Package `lm-subs-v0.2.0.zip`

```bash
npm install
npm run assets   # Regenerate icons, badges, architecture SVG & screenshots
npm run build    # Bundle 5 MV3 entrypoints into extension/
npm run zip      # Produce docs/releases/lm-subs-v0.2.0.zip
npm test         # Run all unit, security, speed & Postgres E2E tests
```

### 8.2 Pointing the Extension to Your Deployed Sync URL

1. Open **LM Subs → Settings** (`extension/options.html`).
2. In **Section `01 · Neon Account & Encrypted Postgres Sync`**, set **Sync Server URL** to your deployed origin (for example `https://lm-subs.vercel.app`).
3. Sign up with email + password **or** paste an `lms_...` **Extension Sync Token** minted from your Web Console (`POST /api/auth/extension-token`).
4. Chrome prompts once via `optional_host_permissions` to grant access to your Sync Server origin — after approval, all API keys (encrypted via `AES-256-GCM`), provider queue settings, and generated subtitles sync automatically across devices.

---

## 9. API & Subtitle Export Endpoints Verification

Once deployed, run this smoke check against your production URL (`export APP_URL="https://your-deployment.vercel.app"`):

```bash
# 1. Verify server + Lakebase Postgres connectivity
curl -sS "$APP_URL/api/health" | jq .

# 2. Create an account & capture bearer token
TOKEN=$(curl -sS -X POST "$APP_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"ops-check@example.com","password":"change-me-immediately"}' | jq -r .token)

# 3. Push encrypted API key + sample subtitle cue
curl -sS -X POST "$APP_URL/api/sync/push" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKeys": {"groq": "gsk_sample_verification_key"},
    "subtitles": [{
      "cacheKey": "artifact:demo-1",
      "artifactId": "demo-1",
      "title": "Verification Overview",
      "language": "en",
      "cues": [{"index":1,"startSec":0,"endSec":3.2,"text":"Deployment verified."}]
    }]
  }' | jq .

# 4. Export subtitles in .SRT, .VTT, .TXT, or .JSON
curl -sS "$APP_URL/api/sync/export?cacheKey=artifact:demo-1&format=srt" \
  -H "Authorization: Bearer $TOKEN"

# 5. Export full subtitle vault backup (.JSON)
curl -sS "$APP_URL/api/sync/export-all" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Subtitle Export Surfaces Summary

Users can export subtitles anytime in **4 formats + clipboard**:
- **`.SRT`** (SubRip — Premiere Pro, DaVinci Resolve, VLC, YouTube)
- **`.VTT`** (WebVTT — HTML5 `<track>` standard)
- **`.TXT`** (Timestamped readable notes for Notion, Obsidian, Google Docs, or NotebookLM)
- **`.JSON`** (Structured `lm-subs/v1` cue data + `Export All (.JSON)` full vault backup)
- **`Copy`** (Instant one-click clipboard transcript)

Available across all 4 surfaces:
1. **In-Player Broadcast HUD** (`notebooklm.google.com` & `notebook.google.com` `<dialog>` / Fullscreen safe)
2. **Chrome Toolbar Popup** (`03 · Active Tab → Export Subtitles`)
3. **Extension Settings Page** (`04 · Subtitle Vault & Export`)
4. **Web Console & REST API** (`Synced Subtitle Transcripts` + `/api/sync/export`)

---

## 10. Security & Key-Rotation Operations

- **Rotating `LM_SUBS_ENCRYPTION_SECRET`**: Because `server/crypto.js` binds each encrypted row with `HKDF-SHA256(secret, userId)` + `AES-256-GCM`, changing `LM_SUBS_ENCRYPTION_SECRET` invalidates existing rows in `lmsubs_user_api_keys` (the server gracefully skips undecryptable legacy ciphertexts without crashing `GET /api/sync/pull`, allowing each signed-in Chrome extension to re-push its keys on next `Sync Now`).
- **Revoking Extension Devices**: `DELETE FROM lmsubs_sessions WHERE user_id = $1;` (or clicking **Sign Out** in Web Console / Extension Settings) immediately invalidates issued `lms_...` tokens.
- **Least-Privilege Extension Audit**: Run `npm test` before every release — static-analysis gates in `tests/e2e.test.js` guarantee `extension/manifest.json` requests only `"storage"` and that UI bundles never access raw API keys or sync bearer tokens.

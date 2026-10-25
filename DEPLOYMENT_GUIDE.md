# LM Subs Maintainer Deployment Guide

Operator runbook for hosting the central **LM Subs** cloud service on **Neon Lakebase Postgres** (`falling-cherry-16443194`) and **Vercel**.

End users never deploy a database or configure a server URL. You host one central Neon + Vercel deployment, and users sign in from the web app or Chrome extension using **Google**, **GitHub**, or a **6-digit email verification code**.

---

## 1. Architecture Overview

| Artifact | Entrypoint | Role |
| :--- | :--- | :--- |
| **Web Application** | `src/web/` -> `docs/app.js` + `docs/styles.css` | Product overview, interactive NotebookLM player preview, Cloud Library (`/` + `/library`), Statistics (`/stats`), Privacy Policy (`/privacy.html`), and Terms of Service (`/terms.html`). |
| **Hosted Cloud API** | `server/app.js` (`api/[...route].js` on Vercel) | Google OAuth, GitHub OAuth, 6-digit passwordless email sign-in, granular sync opt-in enforcement, per-user AES-256-GCM API key encryption, and SQL usage statistics (`GET /api/stats`). |
| **Chrome MV3 Extension** | `extension/` (`docs/releases/lm-subs-v0.2.0.zip`) | Captures NotebookLM Video Overview audio streams (`=m140` / HTTP `206` byte ranges), runs the 12-provider BYOK speech-to-text queue, renders captions, and syncs opted-in categories with the hosted service. |

---

## 2. Environment Variables (Operator Only)

Configure these variables on your Vercel project (or in `.env.local` for local verification):

| Variable | Required | Purpose |
| :--- | :---: | :--- |
| `DATABASE_URL` | **Yes** | Pooled Neon Postgres connection string (`-pooler` host) used by runtime `/api/*` requests (`pg.Pool`, `max: 5`). |
| `DATABASE_URL_UNPOOLED` | Recommended | Direct Neon Postgres connection string used by `npm run db:migrate`. |
| `LM_SUBS_ENCRYPTION_SECRET` | **Yes** | 32-byte secret (`openssl rand -base64 32`) for `HKDF-SHA256` + `AES-256-GCM` encryption of user BYOK API keys in `lmsubs_user_api_keys`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Recommended | Enables "Continue with Google" OAuth (`https://<your-domain>/api/auth/oauth/google/callback`). |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Recommended | Enables "Continue with GitHub" OAuth (`https://<your-domain>/api/auth/oauth/github/callback`). |
| `RESEND_API_KEY` | Recommended | Delivers 6-digit passwordless sign-in codes via email (`AUTH_FROM_EMAIL`). When omitted locally, `/api/auth/email/send-code` returns a clearly labeled preview code for local testing. |
| `NEON_AUTH_BASE_URL` / `NEON_AUTH_JWKS_URL` | Optional | Optional Ed25519 JWKS verification if also accepting Neon Managed Auth tokens. |

> When `DATABASE_URL` is omitted during local development or automated tests, `server/db.js` boots an embedded `@electric-sql/pglite` Postgres instance running the exact `db/schema.sql` schema.

---

## 3. Provisioning Neon Lakebase Postgres

`neon.ts` is pre-configured for Organization `org-snowy-moon-42934547` and Project `falling-cherry-16443194` (`production` branch):

```bash
npm install -g neon@latest
neon login
neon init -y \
  --org-id org-snowy-moon-42934547 \
  --project-id falling-cherry-16443194 \
  --branch production \
  --services postgres
neon deploy
echo "LM_SUBS_ENCRYPTION_SECRET=$(openssl rand -base64 32)" >> .env.local
npm run db:migrate
```

### Database Tables (`db/schema.sql`)

| Table | Purpose |
| :--- | :--- |
| `lmsubs_users` | User accounts (`id`, `email`, `name`, `avatar_url`, `auth_provider`). |
| `lmsubs_sessions` | SHA-256 hashed `lms_...` session tokens (90-day expiry). |
| `lmsubs_email_codes` | Short-lived (10-minute) SHA-256 hashed 6-digit email verification codes with attempt limits. |
| `lmsubs_oauth_states` | CSRF state nonces for Google and GitHub OAuth 2.0 flows. |
| `lmsubs_user_settings` | User preferences (`settings_json`) and granular opt-in sync flags (`sync_prefs_json`: `syncApiKeys`, `syncTranscripts`, `syncSettings`). |
| `lmsubs_user_api_keys` | Per-user `AES-256-GCM` encrypted BYOK API keys (`ciphertext_b64`, `iv_b64`, `tag_b64`, `key_hint`). |
| `lmsubs_subtitles` | Synced Video Overview transcripts (`cues_json`, `spoken_seconds`, `original_bytes`, `extracted_bytes`, `latency_ms`, `failover_used`). |
| `lmsubs_usage_events` | Transcription, cache-hit, and export telemetry powering `GET /api/stats`. |

---

## 4. Deploying to Vercel

1. Import `sarang-cmd/notebooklm-subtitles` into Vercel (or run `vercel --prod`).
2. Attach the Neon integration for project `falling-cherry-16443194` so `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are populated automatically.
3. Add `LM_SUBS_ENCRYPTION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `RESEND_API_KEY` in Vercel Project Settings.
4. Register these OAuth callback URLs in Google Cloud Console and GitHub Developer Settings:
   - `https://<your-domain>/api/auth/oauth/google/callback`
   - `https://<your-domain>/api/auth/oauth/github/callback`
5. If using a custom domain instead of `https://notebooklm-subtitles.vercel.app`, update `HOSTED_CLOUD_URL` in `src/config/selectors.js` and run `npm run zip` before publishing the Chrome extension package.

---

## 5. Build, Package & Verification Commands

```bash
npm install
npm run zip      # Builds extension/ + docs/app.js and packages docs/releases/lm-subs-v0.2.0.zip
npm test         # Runs full unit, security, audio fast-path, and Postgres API tests
npm start        # Serves docs/ and /api/* locally on http://0.0.0.0:4173
```

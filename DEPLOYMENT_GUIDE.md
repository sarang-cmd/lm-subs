# Neon + Vercel Architecture and Deployment Guide

This guide has two parts:

1. **Neon explained for Supabase and Firebase developers:** how SQL migrations, storage buckets, Google/GitHub OAuth, and security rules compare across Firebase, Supabase, and Neon + Vercel.
2. **Step-by-step production deployment:** exact clicks to connect your Neon database (`falling-cherry-16443194`), Google OAuth, GitHub OAuth, and 6-digit email login on Vercel.

---

## Part 1: Neon Explained for Supabase and Firebase Developers

If you have built apps with **Firebase** or **Supabase**, those platforms bundle four separate products under one roof: a database, user authentication, binary file buckets, and client SDKs.

**Neon** takes a focused UNIX-style approach: Neon is a **serverless PostgreSQL database** (with instant Git-style database branching and optional managed auth), and **Vercel** runs your frontend and `/api/*` backend routes right next to it.

### 1. Side-by-side mental model

| Layer | Firebase | Supabase | Neon + Vercel (how LM Subs works) |
| :--- | :--- | :--- | :--- |
| **Database engine** | Firestore (NoSQL documents) | PostgreSQL | **Serverless PostgreSQL** (identical SQL dialect to Supabase) |
| **Where you run SQL / migrations** | None (schemaless collections) | Supabase **SQL Editor** or `supabase db push` | Neon **SQL Editor** in browser, `npm run db:migrate`, AND auto-bootstrap on API boot |
| **File / data buckets** | Firebase Cloud Storage (`gs://`) | Supabase Storage (S3 buckets) | **Not needed for LM Subs** (no audio/video files touch your server; pair Cloudflare R2 or Vercel Blob only when storing large binary files) |
| **User authentication** | Firebase Auth (Google auto-configured) | Supabase Auth (bring Google/GitHub OAuth keys) | **Built into `server/app.js`** (Google OAuth, GitHub OAuth, 6-digit email codes stored in Neon tables; also supports Neon Auth JWKS) |
| **How frontend talks to DB** | Browser SDK + Firebase Security Rules | Browser SDK (`anon` key) + Postgres RLS | Browser calls Vercel `/api/*` -> Hono server queries Neon via private `DATABASE_URL` |
| **Dev / PR environments** | Separate Firebase project | Paid/preview branches | **Instant Neon branches** (copy-on-write clone of Postgres in under 1 second) |

---

### 2. "Do I have to run migrations in a SQL Editor?"

**Yes, Neon has a browser SQL Editor almost identical to Supabase's SQL Editor, AND LM Subs also auto-migrates for you.**

* **Option A: Neon Browser SQL Editor (most familiar from Supabase)**
  1. Open [console.neon.tech](https://console.neon.tech) and select your project (`falling-cherry-16443194`).
  2. Click **SQL Editor** in the left sidebar.
  3. Copy the contents of [`db/schema.sql`](db/schema.sql), paste them into the editor, and click **Run**.
  4. Click **Tables** in the left sidebar: you will immediately see all 8 `lmsubs_*` tables (`lmsubs_users`, `lmsubs_sessions`, `lmsubs_email_codes`, `lmsubs_oauth_states`, `lmsubs_user_api_keys`, `lmsubs_user_settings`, `lmsubs_subtitles`, `lmsubs_transcription_events`).
* **Option B: Terminal CLI migration**
  Run `DATABASE_URL="postgresql://..." npm run db:migrate` from your machine.
* **Option C: Automatic boot safety net**
  Every `CREATE TABLE` and `ALTER TABLE` statement in `server/db.js` is idempotent (`IF NOT EXISTS`). Even on a brand-new Neon branch, the first request to `/api/health` creates any missing tables automatically.

---

### 3. "Are there data buckets in Neon?"

* **Does Neon have Supabase-style Storage Buckets?**
  No. Supabase bundles an S3 wrapper called *Supabase Storage* alongside Postgres. Neon focuses purely on serverless PostgreSQL (when a Neon app needs to host gigabytes of raw user-uploaded images or MP4 videos, developers pair Neon Postgres with **Cloudflare R2**, **Vercel Blob**, or **AWS S3**).
* **Does LM Subs need a data bucket at all?**
  **No bucket is needed anywhere in LM Subs.** Here is why:
  1. When a user plays a NotebookLM Video Overview, the Chrome extension extracts the compact ~3.4 MB audio stream inside the browser and sends it **directly from Chrome to Groq, Mistral, or Gemini**.
  2. Raw MP4 videos and audio files **never upload to your Vercel API or Neon database**.
  3. Your Neon database only stores compact text and JSONB rows: user accounts, `AES-256-GCM` encrypted API key strings (~120 bytes each), settings JSON, and timed subtitle cues (`cues_json`, ~8 KB per video). Tens of thousands of captioned videos fit comfortably inside Neon's free Postgres storage tier.

---

### 4. "In Firebase I didn't have to touch Google Cloud Console for Google OAuth. Why is this different, and how does it work?"

That difference comes down to **who owns the cloud platform**:

1. **Why Firebase feels automatic for Google Sign-In:**
   Every Firebase project **is** a Google Cloud Platform (GCP) project under the hood. Because Google owns both Firebase and Google Identity, toggling "Enable Google Sign-In" in Firebase Console gives Google permission to silently create an OAuth 2.0 Web Client ID, Client Secret, and OAuth Consent Screen inside your underlying GCP project for `your-app.firebaseapp.com`. (Notice that if you enable *GitHub* Sign-In in Firebase, Firebase still makes you go to GitHub Developer Settings to copy a Client ID and Secret, because Google does not own GitHub!)
2. **Why Supabase, NextAuth, and Vercel + Neon ask for a Google Cloud OAuth Client ID:**
   Neither Supabase nor Vercel nor Neon is owned by Google. Google's OAuth security rules require **you** (the app owner) to register an OAuth 2.0 Client ID in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) so Google knows:
   * What app name and logo to display on the *"Sign in with Google"* screen (`LM Subs`).
   * Which exact callback URL is allowed to receive the login code (`https://<your-vercel-domain>/api/auth/oauth/google/callback`).
3. **How Neon's own Auth tab compares to LM Subs's built-in auth:**
   * Neon Console has an optional **Auth** tab (powered by Better Auth). For quick *development testing*, Neon Auth lends you shared Neon dev OAuth credentials so Google/GitHub login works in dev without opening Google Cloud Console; for *production* on your own domain, Neon Auth still asks for your own Google Cloud Client ID + Secret.
   * In **LM Subs**, our Hono backend (`server/app.js`) already implements **Google OAuth 2.0, GitHub OAuth, and passwordless 6-digit email verification** directly in your Neon Postgres tables, so you have zero beta SDK dependencies and full control over Chrome Extension token handoff (`lms_...` Bearer tokens). It also verifies Neon Auth JWTs if `NEON_AUTH_JWKS_URL` is set.

---

### 5. Security model: Supabase RLS vs LM Subs Server Vault

* In **Firebase** and **Supabase**, your frontend JavaScript holds a public `anon` key and queries the database directly from the browser, relying on Security Rules or Postgres Row-Level Security (`auth.uid() = user_id`) to block cross-user reads.
* In **LM Subs**, the browser and Chrome extension **never** talk directly to Postgres and never hold a database credential:
  1. Only your Vercel Serverless Function (`api/index.js`) sees `DATABASE_URL` and `LM_SUBS_ENCRYPTION_SECRET`.
  2. Every API route authenticates the `lms_...` session token via SHA-256 hash lookup (`lmsubs_sessions`) and scopes every SQL query by `WHERE user_id = $1`.
  3. Before any user's Groq or Mistral API key is written to `lmsubs_user_api_keys`, `server/crypto.js` derives a per-user key via `HKDF-SHA256(LM_SUBS_ENCRYPTION_SECRET, userId)` and encrypts the key with `AES-256-GCM`. Even if someone read a raw database backup, user API keys remain encrypted ciphertext.

---

## Part 2: Step-by-Step Deployment Checklist (Neon + Vercel)

End users **never** deploy anything: once you complete the 4 steps below on your Vercel deployment, every visitor and extension user simply signs in with **Google**, **GitHub**, or a **6-digit email code**.

### Your Neon project identifiers

 Configured in [`neon.ts`](neon.ts):
* **Organization ID:** `org-snowy-moon-42934547`
* **Project ID:** `falling-cherry-16443194`
* **Production Branch:** `production`

---

### Step 1: Initialize Neon Postgres and copy `DATABASE_URL` (2 minutes)

1. Sign in to [console.neon.tech](https://console.neon.tech) and open project **`falling-cherry-16443194`** (`production` branch).
2. *(Optional visual check)* Click **SQL Editor** in the left sidebar, paste [`db/schema.sql`](db/schema.sql), and click **Run** to see all 8 `lmsubs_*` tables created right away.
3. Click **Connect** near the top-right of the Neon dashboard:
   * Toggle **Connection pooling** **ON** (recommended for Vercel serverless functions; hostname contains `-pooler`).
   * Copy the connection string:
     ```text
     postgresql://neondb_owner:...@ep-...-pooler....aws.neon.tech/neondb?sslmode=require
     ```
   * Save this value for Vercel as `DATABASE_URL`.

---

### Step 2: Generate your `LM_SUBS_ENCRYPTION_SECRET` (15 seconds)

Run this command in any terminal to generate a random 32-byte secret used to encrypt user API keys with `AES-256-GCM`:

```bash
openssl rand -base64 32
```

Save the output string for Vercel as `LM_SUBS_ENCRYPTION_SECRET`. *(Keep this secret stable in production so previously saved user keys can always be decrypted.)*

---

### Step 3: Create your Sign-In Provider Credentials

Let `<YOUR_VERCEL_URL>` be your live Vercel URL without a trailing slash (for example `https://lm-subs.vercel.app`).

#### 3A. Google Sign-In (`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`)
1. Open [Google Cloud Console -> Credentials](https://console.cloud.google.com/apis/credentials) (create a new project named `LM Subs` if you do not have one).
2. If prompted to configure the **OAuth consent screen** (Google Auth Platform -> Branding / Audience):
   * Choose **External**, enter App name **`LM Subs`**, enter your support email, and click **Save**.
   * Under **Audience**, click **Publish App** so any Google user (not only test users) can sign in. No sensitive Google scopes are requested (`openid email profile` only, so Google requires zero app verification review!).
3. Go to **Credentials** -> click **+ Create Credentials** -> **OAuth client ID**:
   * **Application type:** `Web application`
   * **Name:** `LM Subs Web`
   * **Authorized JavaScript origins:** `https://<your-vercel-domain>`
   * **Authorized redirect URIs:**
     ```text
     https://<your-vercel-domain>/api/auth/oauth/google/callback
     ```
4. Click **Create** and copy **`GOOGLE_CLIENT_ID`** and **`GOOGLE_CLIENT_SECRET`**.

#### 3B. GitHub Sign-In (`GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`)
1. Open [GitHub -> Settings -> Developer settings -> OAuth Apps](https://github.com/settings/developers) and click **New OAuth App**.
2. Fill in the four fields:
   * **Application name:** `LM Subs`
   * **Homepage URL:** `https://<your-vercel-domain>`
   * **Authorization callback URL:**
     ```text
     https://<your-vercel-domain>/api/auth/oauth/github/callback
     ```
3. Click **Register application**, copy **`GITHUB_CLIENT_ID`**, then click **Generate a new client secret** and copy **`GITHUB_CLIENT_SECRET`**.

#### 3C. 6-Digit Email Verification Codes (`RESEND_API_KEY` + `AUTH_EMAIL_FROM`)
1. Create a free account at [resend.com](https://resend.com) (free tier includes 3,000 emails/month).
2. Verify your sending domain under **Domains** (or use `onboarding@resend.dev` while testing your own email address).
3. Click **API Keys** -> **Create API Key** and copy `re_...` as **`RESEND_API_KEY`**.
4. Set **`AUTH_EMAIL_FROM`** to `LM Subs <login@yourdomain.com>`.

---

### Step 4: Add Environment Variables in Vercel and Redeploy

1. Open your project on [vercel.com/dashboard](https://vercel.com/dashboard) -> **Settings** -> **Build and Deployment**:
   * **Root Directory:** Leave empty (`.` repository root). Do **not** set Root Directory to `docs`, because `api/index.js`, `server/`, `package.json`, and `vercel.json` live at the repository root while `vercel.json` already sets `"outputDirectory": "docs"` for static files.
   * **Build Command:** `npm run build`
   * **Output Directory:** `docs`
2. Open **Settings** -> **Environment Variables** and add the variables below for **Production** (and **Preview** if desired):

| Variable | Required | Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | Pooled Neon PostgreSQL URL from Step 1 |
| `LM_SUBS_ENCRYPTION_SECRET` | **Yes** | 32-byte random base64 string from Step 2 |
| `PUBLIC_APP_URL` | **Yes** | `https://<your-vercel-domain>` (no trailing slash) |
| `GOOGLE_CLIENT_ID` | For Google login | From Step 3A |
| `GOOGLE_CLIENT_SECRET` | For Google login | From Step 3A |
| `GITHUB_CLIENT_ID` | For GitHub login | From Step 3B |
| `GITHUB_CLIENT_SECRET` | For GitHub login | From Step 3B |
| `RESEND_API_KEY` | For Email OTP | From Step 3C (`re_...`) |
| `AUTH_EMAIL_FROM` | For Email OTP | e.g. `LM Subs <login@yourdomain.com>` |

3. Go to **Deployments** in Vercel and click **Redeploy** on the latest deployment so the new environment variables take effect.
4. *(If your production URL differs from `https://lm-subs.vercel.app`)* Update `HOSTED_CLOUD_URL` in `src/config/selectors.js` and run `npm run zip` before publishing the Chrome extension so the extension automatically points at your domain.

---

### Step 5: Smoke-Test Your Live Deployment (30 seconds)

Run this health check against your Vercel URL:

```bash
curl -sS https://<your-vercel-domain>/api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "lm-subs-sync",
  "version": "0.2.1",
  "database": "neon-postgresql",
  "authProviders": {
    "emailCode": true,
    "google": true,
    "github": true,
    "neonManaged": false
  }
}
```

Then open `https://<your-vercel-domain>` in your browser:
1. Click **Sign in** and test **Continue with Google**, **Continue with GitHub**, or **6-digit email verification**.
2. Toggle the opt-in switches (`Sync API keys`, `Sync transcriptions`, `Sync preferences`) under `/library`.
3. Open `/stats` to verify live SQL aggregations from Neon Postgres.

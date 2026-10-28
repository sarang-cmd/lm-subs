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
   * **Root Directory:** Your live project is set to `docs` with **Include source files outside of the Root Directory** switched on, which is why `vercel.json` ships a build command that handles both cases (`if [ -f package.json ]; then node scripts/vercel-build.mjs; else node ../scripts/vercel-build.mjs; fi`). It is deployed and working that way, so leave it alone unless a build breaks.
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
| `LM_SUBS_ADMIN_EMAILS` | For `/admin` | Comma separated list of account addresses that may open the download dashboard |

3. Go to **Deployments** in Vercel and click **Redeploy** on the latest deployment so the new environment variables take effect.
4. *(Optional)* Set `LM_SUBS_ADMIN_EMAILS` to the account addresses that should reach the private download dashboard, for example `you@example.com,second@example.com`. Keep this in Vercel only. The address is deliberately never written to the repository, so the app reads it from the environment on every request and `LM_SUBS_ADMIN_EMAILS=""` in `.env.example` stays empty as the placeholder.

5. *(If your production URL differs from `https://lm-subs.vercel.app`)* Update `HOSTED_CLOUD_URL` in `src/config/selectors.js` and run `npm run zip` before publishing the Chrome extension so the extension automatically points at your domain.

---

### Step 4b: Turn on the download dashboard (2 minutes)

The site counts every extension download and shows the totals on `/admin`, a
private route that is disallowed in `robots.txt`, left out of `sitemap.xml`, and
gated server side on `LM_SUBS_ADMIN_EMAILS`.

1. Add `LM_SUBS_ADMIN_EMAILS` in Vercel with the addresses that should have
   access, separated by commas.
2. Redeploy so the function picks up the new value.
3. Sign in on the site with one of those addresses, then open
   `https://<your-vercel-domain>/admin`. An **Admin** tab appears in the top bar
   for those accounts only.

What is recorded per download:

| Field | Example | Notes |
| :--- | :--- | :--- |
| Version | `0.2.8` | Taken from the release the visitor clicked |
| Channel | `site` | `site`, `github` or `update` |
| Source | `hero` | Which page offered the file |
| Browser | `chrome` | Family only, never the full user agent string |
| Country | `DE` | From the `x-vercel-ip-country` edge header |

No IP address, no account identifier and no user agent string is stored. The
endpoint is open so the marketing pages can report without a session, and it
collapses repeated identical events inside a ten second window so refresh loops
and prefetch cannot inflate the numbers.

Bash check once deployed:

```bash
# Anonymous beacon, no session required
curl -sS -X POST https://<your-vercel-domain>/api/downloads \
  -H 'Content-Type: application/json' \
  -d '{"version":"0.2.8","channel":"site","source":"curl-test"}'
# -> {"ok":true,"recorded":true}
```

Reading the totals requires a session token from an admin account:

```bash
curl -sS 'https://<your-vercel-domain>/api/admin/downloads?days=30' \
  -H "Authorization: Bearer <admin-session-token>"
```

Non-admin accounts get `403`, and anonymous callers get `401`.

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
  "service": "lm-subs-neon-sync",
  "version": "0.2.4",
  "neonProjectId": "falling-cherry-16443194",
  "databaseMode": "neon-postgresql",
  "neonManagedAuth": false,
  "oauthProviders": { "google": true, "github": true, "email": true },
  "serverTime": "2026-10-28T06:35:00.000Z"
}
```

Two fields tell you most of what can go wrong. `databaseMode` must read
`neon-postgresql`; if it reads `pglite-postgres`, the function is running on the
embedded fallback because `DATABASE_URL` did not arrive. `oauthProviders.google`
and `.github` turn true only when the matching client IDs are non-empty, so they
confirm the OAuth variables are filled in rather than merely present.

Then open `https://<your-vercel-domain>` in your browser:
1. Click **Sign in** and test **Continue with Google**, **Continue with GitHub**, or **6-digit email verification**.
2. Toggle the opt-in switches (`Sync API keys`, `Sync transcriptions`, `Sync preferences`) under `/library`.
3. Open `/stats` to verify live SQL aggregations from Neon Postgres.


---

## Part 3: What's Left to Do

Checked against the live Vercel project on 2026-10-28. Where a step says *not
started*, it is genuinely outstanding on your account right now.

| Piece | Status |
| :--- | :--- |
| Project | `lm-subs`, team `sarang-dev`, production branch `main` |
| Live URL | `https://lm-subs.vercel.app` |
| Latest production deploy | `cb4fa34` (PR #26), 2026-10-28 06:35 UTC, state `READY` |
| Database | Neon `falling-cherry-16443194`, connected |
| Environment variables | 9 set, all on the Production target only |
| Still missing | `LM_SUBS_ADMIN_EMAILS` |
| Analytics | Web Analytics and Speed Insights both enabled and receiving |

Quick checklist, in the order that pays off fastest:

- [ ] Add `LM_SUBS_ADMIN_EMAILS` in Vercel and redeploy
- [ ] Run `npm run db:migrate` and confirm 10 tables
- [ ] Submit the sitemap in Search Console, then request indexing on the five main pages
- [ ] Submit the extension to the Chrome Web Store, then update the install copy
- [ ] Refresh `docs/CHROME_WEB_STORE_GUIDE.md`, which still describes v0.2.1
- [ ] Bump to 0.2.9, run `npm run zip`, merge, and tag the release

### 1. Turn the download dashboard on (5 minutes, not started)

`LM_SUBS_ADMIN_EMAILS` is the one variable that has not been created yet, and
until it exists no account is an admin, so `/admin` refuses everyone.

1. Vercel, then Settings, then Environment Variables. Add
   `LM_SUBS_ADMIN_EMAILS` with the addresses that should have access, separated
   by commas. Tick **Production**, and **Preview** too if you want to test the
   dashboard on pull request builds.
2. Deployments, then Redeploy the latest production deployment. Env changes
   only reach functions on a new build.
3. Sign in with one of those addresses and open
   `https://lm-subs.vercel.app/admin`. An **Admin** tab appears in the top bar.

Verify the gate from outside, which is the part worth doing before you trust it:

```bash
# No session at all, expect 401
curl -sS -o /dev/null -w '%{http_code}\n' \
  'https://lm-subs.vercel.app/api/admin/downloads?days=7'

# Signed in as a normal account, expect 403
curl -sS -o /dev/null -w '%{http_code}\n' \
  'https://lm-subs.vercel.app/api/admin/downloads?days=7' \
  -H "Authorization: Bearer <a-non-admin-session-token>"
```

If you get 200 while signed out, the variable is missing rather than empty, or
the deployment predates the change.

### 2. Confirm the downloads table reached Neon (2 minutes)

You do not have to run a migration. `server/db.js` applies the bundled DDL with
`CREATE TABLE IF NOT EXISTS` on every cold start, so `lmsubs_downloads` appears
with the first request after the deploy. This step just proves it happened.

```bash
# Needs a .env.local in the repo root with DATABASE_URL_UNPOOLED,
# which you can generate with `npx neonctl env get` or copy from the Neon console.
npm run db:migrate
```

Expect `Verified 10 LM Subs tables:` with `lmsubs_downloads` in the list. Nine
means the function has not served traffic since the deploy, so open
`/api/health` once and run it again.

### 3. Prove the counters work end to end (5 minutes)

```bash
# Fire a test event, no session needed
curl -sS -X POST https://lm-subs.vercel.app/api/downloads \
  -H 'Content-Type: application/json' \
  -d '{"version":"0.2.8","channel":"site","source":"manual-check"}'
# -> {"ok":true,"recorded":true}
```

Then load `/admin` and confirm the version breakdown and the recent list show
it. Country reads `Unknown` for requests that carry no `x-vercel-ip-country`
header, which is normal when you call the API from a terminal. Browser clicks
from real visitors get a two letter country code.

### 4. Get the site into Google (30 minutes, then waiting)

Your `google-site-verification` token is committed and sits in the `<head>` of
every page the site serves, so the property should verify without touching DNS.

1. Search Console, then Add property, then URL prefix, then
   `https://lm-subs.vercel.app`. The HTML tag method should pass immediately.
2. Sitemaps, then submit `https://lm-subs.vercel.app/sitemap.xml`. It lists 19
   URLs and is served from `docs/sitemap.xml`, so it updates on every deploy.
3. URL Inspection on the five pages that matter most
   (`/`, `/guide`, `/install`, `/welcome`, `/about`), then Request indexing.
   Indexing a handful of URLs at a time is more effective than bulk submitting.
4. Check `https://lm-subs.vercel.app/robots.txt` is reachable and readable. It
   allows every crawler including the AI answer engines, and disallows only
   `/api/` and `/admin`.
5. Give it one to two weeks. `vercel.app` is a shared hostname used by a very
   large number of projects, which is the usual reason these take longer than a
   domain of your own. A custom domain on Vercel takes about five minutes and is
   the durable fix if you want faster, more predictable indexing.

### 5. Publish on the Chrome Web Store (about an hour, plus review time)

The extension is still install by hand only, which is the single biggest limit
on downloads today, and every page on the site tells people to load it unpacked.

1. Pay the one time five dollar developer registration fee and open the Chrome
   Developer Dashboard.
2. `npm run zip`, then upload `docs/releases/lm-subs-latest.zip`.
3. Copy the listing fields from `docs/CHROME_WEB_STORE_GUIDE.md`, including the
   permission justifications, which is the part reviewers most often reject.
4. Point the privacy policy field at `https://lm-subs.vercel.app/privacy`. That
   page is generated from `docs/PRIVACY_POLICY.md` and is already live.
5. Upload the screenshots from `store-assets/`.
6. Submit for review, then expect a few days for the first review.

Once it is live, update the install copy so it no longer leads with developer
mode. These are the places that mention unpacking:

```bash
grep -rIn "unpacked" src scripts
# src/web/App.jsx, src/web/GuideView.jsx, src/web/WelcomeView.jsx,
# scripts/build-shells.mjs, scripts/build-blog.mjs
```

### 6. Refresh the store guide for the current release (10 minutes)

`docs/CHROME_WEB_STORE_GUIDE.md` still says `v0.2.1` and points at
`docs/releases/lm-subs-v0.2.1.zip`, which no longer exists. The current build is
`0.2.8`. Two of the four screenshots it recommends (`02-audio-extraction-failover.png`
and `04-settings-queue.png`) no longer match the UI, so capture fresh ones or
drop them from the list.

### 7. Cut v0.2.9 (20 minutes)

`progress.md` has a batch of work sitting under `Unreleased`: the top bar that
now stays on one line, the download counters, and the admin dashboard. Shipping
them means:

1. Bump the version in three places that must agree: `package.json`,
   `extension/manifest.json`, and `LATEST_NOTES_VERSION` in
   `src/lib/release-notes.js` alongside a new notes entry.
2. `npm run zip`, which rebuilds the extension bundles, repackages
   `docs/releases/lm-subs-v0.2.9.zip` and `lm-subs-latest.zip`, and rewrites
   `docs/releases/latest.json` with the new sha256 the extension checks for
   updates.
3. `npm test`, then push, open a PR, and merge.
4. Create the GitHub release and attach the zip by dragging it onto the release
   page. Command line asset upload is unreliable, so the release page on GitHub
   is the dependable path.

### 8. Optional, when you have time

- **Add the environment variables to the Preview target.** Today all nine are
  Production only, so pull request previews boot the embedded PGlite database.
  They work, but every sign-in there is throwaway, which makes previews hard to
  use for testing sync.
- **Add a custom domain.** Faster indexing, a shorter link to put in the Reddit
  post, and it survives any change to the Vercel project name.
- **Set `AUTH_EMAIL_FROM` to a verified Resend domain.** Email codes work from
  the default sender, but deliverability improves once the sending domain is
  verified.

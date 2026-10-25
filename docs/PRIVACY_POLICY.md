# Privacy Policy: LM Subs

**Effective Date:** October 25, 2026

**LM Subs** ([`github.com/sarang-cmd/lm-subs`](https://github.com/sarang-cmd/lm-subs), hosted web app [`lm-subs.vercel.app`](https://lm-subs.vercel.app)) is an open-source, Bring-Your-Own-Key (BYOK) Chrome Manifest V3 extension with an optional hosted Neon Postgres cloud library.

## 1. Local Browser Storage (`chrome.storage.local`)

By default, all extension data stays locally on your machine:

* **API Keys & Sync Tokens (`secretApiKeys`, `cloudSyncSecret`):** Accessed strictly inside the isolated MV3 Background Service Worker (`src/background/service-worker.js`). UI bundles (`popup.js`, `options.js`, `content.js`) never read raw secret values.
* **Preferences (`settings`):** Provider priority queue, model selections, caption font size, timing offset, language hints, and regex exclusion patterns.
* **Subtitle Vault (`subtitleCache`):** Up to 35 cached Video Overview subtitle tracks for instant replay and `.SRT`/`.VTT`/`.TXT`/`.JSON` export.

## 2. Optional Hosted Cloud Account & Granular Opt-In Sync

Only when you explicitly sign in with Google, GitHub, or a 6-digit email verification code:

* **Encrypted API Keys (`lmsubs_user_api_keys`):** When `Sync API keys` is enabled, keys are encrypted per user via `HKDF-SHA256` + `AES-256-GCM` with `${userId}:${providerId}` as authenticated AAD. Web UI pulls (`includeSecrets=0`) return masked hints (`gsk_••••9xQ2`) only.
* **Transcriptions & Settings (`lmsubs_subtitles`, `lmsubs_user_settings`):** Stored per `user_id` according to your opt-in switches (`Sync transcriptions`, `Sync preferences`). Turning off any switch lets you immediately purge stored cloud rows for that category.
* **Web App Diagnostics:** The public web app at `lm-subs.vercel.app` uses Vercel Web Analytics and Vercel Speed Insights for aggregated page performance metrics. The Chrome extension itself bundles zero analytics or tracking scripts.

## 3. Media & Audio Flow

1. When you open or generate a NotebookLM Studio **Video Overview**, LM Subs fetches the compact `=m140` audio stream (or `HTTP 206` audio byte ranges) from Google's CDN using your authenticated browser session.
2. Only the extracted audio payload is sent over HTTPS (or `localhost`) directly from your browser to the Speech-to-Text provider(s) you configured. Raw audio and video files never upload to LM Subs servers.

## 4. User Control, Export & Deletion

You can export transcripts in `.SRT`, `.VTT`, `.TXT`, or `.JSON`, clear saved API keys, delete cached transcripts, purge opted-out cloud categories, revoke sync tokens via **Sign out**, or uninstall the extension at any time.

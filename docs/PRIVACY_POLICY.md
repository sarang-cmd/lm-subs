# Privacy Policy — LM Subs

**Effective Date:** October 25, 2026

**LM Subs** is an open-source, Bring-Your-Own-Key (BYOK) Chrome Manifest V3 extension with optional self-hostable Neon Lakebase Postgres cloud sync. We include zero analytics, tracking pixels, or telemetry SDKs.

## 1. Local Browser Storage (`chrome.storage.local`)

By default, all extension data stays locally on your machine:

- **API Keys & Sync Tokens (`secretApiKeys`, `cloudSyncSecret`)**: Accessed strictly inside the isolated MV3 Background Service Worker (`src/background/service-worker.js`). UI bundles (`popup.js`, `options.js`, `content.js`) never read raw secret values.
- **Preferences (`settings`)**: Provider priority queue, model selections, caption font size, timing offset, language hints, and regex exclusion patterns.
- **Subtitle Vault (`subtitleCache`)**: Up to 35 cached Video Overview subtitle tracks for instant replay and `.SRT`/`.VTT`/`.TXT`/`.JSON` export.

## 2. Optional Neon Lakebase Postgres Sync

Only when you explicitly sign in to a configured Sync Server URL:

- **Encrypted API Keys (`lmsubs_user_api_keys`)**: Encrypted per user via `HKDF-SHA256` + `AES-256-GCM` with `${userId}:${providerId}` as authenticated AAD. Web UI pulls (`includeSecrets=0`) return masked hints (`gsk_••••9xQ2`) only.
- **Settings & Subtitles (`lmsubs_user_settings`, `lmsubs_subtitles`)**: Stored per `user_id` so captions and settings sync across your browsers without re-transcribing media.

## 3. Media & Audio Flow

1. When you open or generate a NotebookLM Studio **Video Overview**, LM Subs fetches the compact `=m140` audio stream (or `HTTP 206` audio byte ranges) from Google's CDN using your authenticated browser session.
2. Only the extracted audio payload is sent over HTTPS (or `localhost`) directly to the Speech-to-Text provider(s) you configured.

## 4. User Control, Export & Deletion

You can export transcripts in `.SRT`, `.VTT`, `.TXT`, or `.JSON`, clear saved API keys, delete cached transcripts, revoke sync tokens via **Sign Out**, or uninstall the extension at any time.

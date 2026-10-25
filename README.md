<div align="center">

<img src="docs/assets/logo.svg" width="84" height="84" alt="LM Subs Logo" />

# LM Subs

**Sub-5-second synchronized captions, `.SRT`/`.VTT` export, and encrypted Neon Postgres sync for Google NotebookLM Video Overviews.**

[![Manifest V3](docs/assets/badges/manifest-v3.svg)](#security--privacy-architecture)
[![Audio Fast-Path](docs/assets/badges/audio-extract.svg)](#how-v020-cut-latency-from-5-minutes-to-32-seconds)
[![12 BYOK Providers](docs/assets/badges/providers.svg)](#supported-byok-stt-providers-12)
[![Neon Sync](docs/assets/badges/neon-sync.svg)](#neon-account--encrypted-postgres-sync)
[![Tests](docs/assets/badges/tests.svg)](#development--testing)
[![License: MIT](docs/assets/badges/license.svg)](LICENSE)

[**Download `lm-subs-v0.2.0.zip`**](docs/releases/lm-subs-v0.2.0.zip) · [**Web App & Neon Cloud Sync Console (`docs/`)**](docs/index.html) · [**Deployment Guide (`DEPLOYMENT_GUIDE.md`)**](DEPLOYMENT_GUIDE.md) · [**Architecture**](#system-architecture) · [**Setup Guide**](#quick-start)

<br />

<img src="docs/assets/banner-social-1280x640.png" width="100%" alt="LM Subs v0.2.0 — Fast NotebookLM Video Overview Subtitles & Neon Postgres Sync" />

</div>

---

## Why LM Subs?

Google NotebookLM generates narrated **Studio Video Overviews**, but its built-in player ships **without closed captions, `.SRT`/`.VTT` export, or cross-device transcript persistence**.

Earlier naive approaches either upload 80–120 MB HD `.mp4` videos or decode compressed audio into 40+ MB of uncompressed PCM `.wav` chunks — turning a 3-minute Video Overview into a **5-minute wait**.

**LM Subs (`v0.2.0`)** reduces end-to-end subtitle latency from **~5 minutes down to ~3.2 seconds** while adding **optional Neon Lakebase Postgres account sync** (including **AES-256-GCM per-user encrypted API keys**) and a clean, zero-clutter **Dieter Rams / Braun** industrial interface:

| Metric | Naive Video / WAV Upload (`v0.1.x`) | LM Subs (`v0.2.0`) |
| :--- | :--- | :--- |
| **Media payload** | 50–120 MB `.mp4` + 42 MB IPC `.wav` | **3–6 MB `=m140` AAC** (or HTTP `206` `soun` byte ranges) |
| **Audio prep overhead** | 45–90 s full download + WAV inflation | **0 ms** direct `=m140` passthrough (`<1.2 s` Range remux) |
| **Whisper timestamp mode** | Slow DTW `"word"` cross-attention | **`"segment"`-only (~200x real-time)** + smart clause splitter |
| **Long-video chunking** | Sequential 1-by-1 upload | **3x concurrent workers + live `SUBTITLES_PARTIAL` cues** |
| **Repeat / 2nd-device open** | Re-downloads & re-transcribes | **~50 ms Neon Postgres cache hit** (`0` media bytes fetched) |

---

## Visual Tour (`v0.2.0` Braun Specification UI)

### 01 · In-Player Broadcast Captions & Multi-Format Export Bar
Synchronized two-line broadcast captions (`CC`, `A-`/`A+`, `±0.25s` offset, `.SRT`/`.VTT`/`.TXT`/`.JSON` export, one-click `Copy`, `.srt`/`.vtt`/`.json` import, `Regen`) mounted directly inside NotebookLM's `<video>` container and Shadow DOM `Lot` dialogs.

<p align="center">
  <img src="docs/assets/screenshots/01-player-subtitles.png" width="100%" alt="In-Player Subtitles & Control Bar on Google NotebookLM" />
</p>

### 02 · Sub-5-Second Audio Pipeline & Automatic Queue Failover
Probes Google's ~4 MB `=m140` audio-only stream first (`0 ms` IPC overhead), falls back to parallel `HTTP 206` Range `soun` chunk extraction on large `.mp4` streams, fails over across your 12-provider queue on `HTTP 429`, and syncs to Neon Postgres.

<p align="center">
  <img src="docs/assets/screenshots/02-audio-extraction-failover.png" width="100%" alt="Direct =m140 & HTTP 206 Audio Extraction + Queue Failover + Neon Sync" />
</p>

### 03 · Toolbar Popup & One-Click Neon Cloud Sync
Paste a free Groq or Mistral key, check Neon Cloud Sync status, trigger subtitles on the active NotebookLM tab, or export `.SRT` transcripts in two clicks.

<p align="center">
  <img src="docs/assets/screenshots/03-toolbar-popup.png" width="100%" alt="LM Subs Toolbar Popup" />
</p>

### 04 · Full Settings Ledger, Priority Queue & Encrypted Key Vault
Sign in to Neon Lakebase Postgres (`falling-cherry-16443194`), reorder all 12 STT providers, inspect masked key hints (`gsk_••••9xQ2`), and tune caption preferences.

<p align="center">
  <img src="docs/assets/screenshots/04-settings-queue.png" width="100%" alt="LM Subs Settings & Encrypted Key Queue" />
</p>

---

## How `v0.2.0` Cut Latency from 5 Minutes to ~3.2 Seconds

1. **Zero-Decode Pure-Audio `=m140` Fast-Path (`0 ms` IPC)**
   Google's FIFE `=m140` endpoint serves a ~3–6 MB fragmented DASH `audio/mp4` stream (`mvex`/`moof` boxes with zero `stco` offsets). Instead of falling back to `OfflineAudioContext` and inflating 5 MB of AAC into **42 MB of uncompressed PCM `.wav`**, `service-worker.js` inspects `inspectMp4Tracks()` + `Content-Type` and forwards pure-audio payloads <=24 MB straight to your STT provider untouched.
2. **Parallel `HTTP 206 Partial Content` Audio Byte-Range Extraction (`extractAudioViaHttpRange`)**
   When a CDN edge only serves a muxed 60–120 MB `=m22`/`=m18` `video/mp4`, LM Subs aborts the full-body download immediately after reading headers, probes the head/tail `moov` atom via `Range: bytes=...`, coalesces `soun` chunk offsets, and downloads **only the 3–6 MB AAC audio slices** over 6 parallel `HTTP 206` streams — skipping >93% of H.264 video frames over the wire.
3. **`"segment"`-Only Whisper Timestamps (~200x Real-Time)**
   Requesting `timestamp_granularities[] = "word"` on Whisper endpoints forces expensive server-side Dynamic Time Warping (DTW) cross-attention alignment. Switching OpenAI/Groq/Local Whisper to `"segment"`-only and balancing lines client-side via `cuesFromSegments()` cuts STT API latency by 4–8x.
4. **3x Concurrent Chunk Workers + Live Progressive Cues (`SUBTITLES_PARTIAL`)**
   Long recordings (>24 MB) transcribe 3 audio chunks concurrently (`chunkConcurrency = 3`) and push `SUBTITLES_PARTIAL` cues to the `<video>` overlay the instant chunk 1 finishes — captions start playing while the back half of a 45-minute overview is still transcribing.
5. **Pre-Download Neon Postgres Cache Hit (~50 ms)**
   Before touching Google's CDN at all, `service-worker.js` checks local storage and `GET /api/sync/subtitle?cacheKey=...` on Neon Postgres — returning cached captions in a single lightweight JSON round-trip across any signed-in browser.

---

## System Architecture

<p align="center">
  <img src="docs/assets/architecture.svg" width="100%" alt="LM Subs 4-Plane MV3 + Neon Lakebase Postgres Architecture" />
</p>

- **MAIN World (`src/content/page-hook.js` at `document_start`)**: Passively hooks `LabsTailwindUi` / `CloudNotebookLmUi` `batchexecute` RPCs (`R7cb6c`, `gArtLc`), replays SSR `AF_initDataCallback` hydrated payloads, and pierces Shadow DOM (`Lot` modal dialogs) without touching credentials.
- **ISOLATED World (`src/content/content.js` + `player-overlay.js`)**: Attaches both a native `<track kind="subtitles" label="LM Subs">` and a crisp custom two-line broadcast caption overlay + `CC` control bar, handling `SUBTITLES_PARTIAL` live cue updates.
- **MV3 Service Worker (`src/background/service-worker.js`)**: Sole holder of raw `secretApiKeys` and `cloudSyncSecret` bearer tokens in `chrome.storage.local`. Runs `=m140` / `HTTP 206` Range audio extraction, 12-provider failover queue, and encrypted Neon sync.
- **Neon Lakebase Postgres + Web Console (`server/`, `db/schema.sql`, `docs/`)**: Hono REST API (`api/[...route].js` on Vercel / `server/neon-function.js` on Neon Functions / `serve-docs.mjs` locally) backed by PostgreSQL tables `lmsubs_users`, `lmsubs_sessions`, `lmsubs_user_settings`, `lmsubs_user_api_keys`, and `lmsubs_subtitles`.

---

## Neon Account & Encrypted Postgres Sync

LM Subs ships with first-class **Neon** (`@neon/config/v1` IaC + Lakebase Postgres + Neon Managed Better Auth JWKS) configured for project `falling-cherry-16443194` (`org-snowy-moon-42934547`, branch `production`).

### How API Keys Are Protected in Postgres
- **Per-User Key Derivation (`HKDF-SHA256`)**: `server/crypto.js` derives a distinct 256-bit AES key per `user_id` from `LM_SUBS_ENCRYPTION_SECRET` (or `DATABASE_URL` fallback).
- **Authenticated Encryption (`AES-256-GCM` + AAD)**: Every provider API key is encrypted with a fresh random 96-bit IV, verified by a 128-bit GCM authentication tag, and cryptographically bound to `${userId}:${providerId}` as Additional Authenticated Data (AAD) — preventing cross-user ciphertext transplantation even at the database row level.
- **Least-Privilege Secret Boundary**:
  - Web Console pulls (`GET /api/sync/pull?includeSecrets=0`) receive **masked key hints only** (`gsk_••••9xQ2`) — raw plaintext keys are never returned to web page JavaScript.
  - Only the isolated MV3 Service Worker (`includeSecrets=1`) pulls decrypted keys directly into `chrome.storage.local` (`secretApiKeys`).
- **Dual Auth Verification**: Supports both **Neon Managed Better Auth** Ed25519 JWTs verified via `jose` (`NEON_AUTH_JWKS_URL` + `NEON_AUTH_BASE_URL` issuer check) and `scrypt`-backed `lms_...` extension bearer tokens (`SHA-256` hashed at rest in `lmsubs_sessions`).

### Provisioning & Deploying Your Own Neon Backend

See [**`DEPLOYMENT_GUIDE.md`**](DEPLOYMENT_GUIDE.md) for the complete production runbook (Neon IaC, `LM_SUBS_ENCRYPTION_SECRET`, Vercel Fluid Compute, Neon Functions, self-hosted Node/Docker, and `/api/sync/export` verification).

```bash
# 1. Authenticate with Neon in your browser and deploy neon.ts
npx neon login
npx neon deploy

# 2. Apply idempotent Lakebase Postgres schema (also runs automatically on server boot)
npm run db:migrate

# 3. Start the unified LM Subs Web Console + Sync API server (0.0.0.0:4173)
npm start
```

> **Zero-config local fallback**: When `DATABASE_URL` is unset in local development or CI, `server/db.js` automatically boots an embedded `@electric-sql/pglite` PostgreSQL 18 engine running the exact same `db/schema.sql` DDL and parameterized SQL queries.

---

## Supported BYOK STT Providers (12)

Configure one key or stack several in priority order — if provider `#1` returns `HTTP 429` or `5xx`, LM Subs fails over to `#2` automatically:

| # | Provider | Default Model | Free Tier / Credits | Highlights |
| :-: | :--- | :--- | :--- | :--- |
| **01** | **Groq** *(Recommended #1)* | `whisper-large-v3-turbo` | **Permanent Free Tier** (~8 hrs/day, no card) | ~200x real-time segment STT |
| **02** | **Mistral AI** *(Recommended #2)* | `voxtral-mini-transcribe-3` | **Free La Plateforme Tier** | 48 MB file cap, crisp segment timestamps |
| **03** | **Google Gemini** | `gemini-2.5-flash` | **Free Google AI Studio Tier** | Native single-pass caption translation |
| **04** | **Deepgram** | `nova-3` | **$200 Free Credit** | Sub-second streaming-grade utterance timing |
| **05** | **AssemblyAI** | `universal-2` | **$50 Free Credit** | High-accuracy technical terminology |
| **06** | **Gladia** | `solaria-1` | **10 Free Hours/Month** | Multilingual switching |
| **07** | **Cloudflare Workers AI** | `@cf/openai/whisper-large-v3-turbo` | **10,000 Neurons/Day Free** | Serverless edge inference |
| **08** | **ElevenLabs** | `scribe_v2` | **Free Starter Quota** | 99-language Scribe v2 transcription |
| **09** | **Hugging Face** | `openai/whisper-large-v3-turbo` | **Free Monthly Inference Credits** | Open-weights ecosystem |
| **10** | **OpenRouter** | `google/gemini-2.5-flash` | **Free / Pay-as-you-go** | Unified multi-model router |
| **11** | **OpenAI** | `whisper-1` | Pay-as-you-go (`$0.006/min`) | Classic Whisper reference endpoint |
| **12** | **Local / Self-Hosted** | `Systran/faster-whisper-small` | **100% Free & Offline** | Works with `faster-whisper-server` / `whisper.cpp` |

---

## Security & Privacy Architecture

- **Minimal Manifest V3 Permissions**: Requests **only `"storage"`** (`extension/manifest.json`) plus narrow host permissions for NotebookLM (`notebooklm.google.com`, `notebook.google.com`) and Google media CDNs (`*.googleusercontent.com`, `*.googlevideo.com`, `lh3.google.com`). Custom sync/self-hosted origins use runtime `optional_host_permissions`.
- **Service-Worker Secret Isolation**: Automated static-analysis tests (`tests/e2e.test.js`) enforce that `content.js`, `page.js`, `popup.js`, and `options.js` **never** import `getApiKey`, `getSecretApiKeysMap`, or `getSecretCloudSyncToken`.
- **SSRF & Diagnostic Redaction**: Media fetches validate against `isTrustedGoogleMediaUrl()`, and `GET_DEBUG_REPORT` scrubs `Bearer` headers, `lms_...` tokens, `gsk_...`/`sk-...`/`AIza...` keys, and signed FIFE query strings.

---

## Quick Start

### Load the Chrome Extension
1. Download [**`lm-subs-v0.2.0.zip`**](docs/releases/lm-subs-v0.2.0.zip) and unzip it *(or run `npm install && npm run build` to build into `extension/`)*.
2. Open `chrome://extensions` and toggle **Developer mode** ON.
3. Click **Load unpacked** and select the `extension/` folder.
4. Click the **LM Subs** toolbar icon, paste a free [Groq](https://console.groq.com/keys) or [Mistral](https://console.mistral.ai/api-keys/) API key *(or sign in to your Neon Sync account)*, and open any Video Overview on `notebooklm.google.com` or `notebook.google.com`.

### Development & Testing

```bash
npm install          # Install build, server, and test dependencies (0 vulnerabilities)
npm run build        # Bundle all 5 MV3 entrypoints via esbuild (~50 ms)
npm run assets       # Regenerate Braun SVG/PNG icons, badges, diagrams & 4 screenshots
npm run zip          # Package docs/releases/lm-subs-v0.2.0.zip
npm test             # Run all 40 unit, security, speed, export & Postgres E2E tests
npm start            # Start unified Web Console + /api/* Neon Sync server on 0.0.0.0:4173
```

---

## License

Released under the [MIT License](LICENSE). Independent open-source project; not affiliated with or endorsed by Google LLC.

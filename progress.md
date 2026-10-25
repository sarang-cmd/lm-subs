# LM Subs Version History and Progress Log

This file tracks every release of **LM Subs** ([`sarang-cmd/lm-subs`](https://github.com/sarang-cmd/lm-subs), live at [`lm-subs.vercel.app`](https://lm-subs.vercel.app)), organized version by version into what was added, improved, fixed, and changed.

---

## `v0.2.1` (2026-10-25)

 Unifies the hosted cloud experience, visual identity, real browser UI screenshots, non-technical onboarding, Vercel telemetry, and the `sarang-cmd/lm-subs` repository rename across PRs #5 through #11.

### Added
* **Hosted Google, GitHub, and 6-digit email sign-in (`server/app.js`, `src/web/AuthDialog.jsx`, `extension/options.html`):** End users sign in directly to the maintainer-hosted cloud library (`https://lm-subs.vercel.app`) via Google OAuth 2.0, GitHub OAuth, or passwordless 6-digit email verification codes without configuring a database or server URL.
* **Granular sync opt-in switches and one-click cloud purge (`lmsubs_users.sync_preferences_json`, `PUT /api/sync/preferences`):** Independent toggles for **Sync API keys**, **Sync transcriptions**, and **Sync preferences** in both the web app (`/library`) and extension settings. Disabling any category lets users purge stored cloud rows for that category while keeping local Chrome data intact.
* **Real SQL transcription statistics (`/stats`, `GET /api/stats`, `lmsubs_transcription_events`):** Live Postgres aggregations showing videos captioned, spoken minutes indexed, total synchronized cues, upload bandwidth saved (`original_bytes - extracted_bytes`), 14-day daily transcription volume, and per-provider latency/share breakdown.
* **Multi-format export everywhere (`GET /api/sync/export`, `GET /api/sync/export-all`):** Direct `.srt`, `.vtt`, `.txt`, `.json`, clipboard `Copy`, and bulk `Export all` archive downloads across the in-player caption bar, toolbar popup, extension settings vault, and web cloud library.
* **Step-by-step non-technical setup guide (`/guide`, `src/web/GuideView.jsx`, `extension/popup.html`, `extension/options.html`, `README.md`):** Plain-language 4-step walkthrough with macOS and Windows unzip tabs, one-click `chrome://extensions` copy, free Groq key instructions (no credit card), and an auto-expanding first-run helper inside the extension popup when zero keys are configured.
* **Creator and architecture `/about` page (`src/web/AboutView.jsx`, `docs/about.html`):** Credits creator **Sarang** (`@sarang-cmd`) and documents the four-plane Manifest V3 + Neon Postgres architecture.
* **Vercel Web Analytics and Vercel Speed Insights (`src/web/main.jsx`):** Integrated `@vercel/analytics` (PR #8) and `@vercel/speed-insights` (PR #7) side by side on the hosted web app.
* **Neon vs Supabase and Firebase engineering guide (`DEPLOYMENT_GUIDE.md`):** First-principles comparison of SQL Editor migrations, why LM Subs requires zero object-storage buckets, how Google Cloud OAuth credentials differ from Firebase Auth, and a step-by-step Vercel + Neon deployment checklist.

### Improved
* **React 19 + Radix UI + Motion web application (`src/web/`):** Rebuilt the public website and cloud library in an Alabaster (`#F6F7F8`), Graphite (`#111315`), and Optical Cobalt (`#0055D4`) design system with accessible Radix `Dialog`, `Tabs`, and `Switch` primitives and an interactive NotebookLM caption preview stage (`ScreeningStage.jsx`).
* **Custom geometric brand mark and cache-busted favicons:** Vectorized the new LM Subs brand mark (perspective folded notebook page + three vertical acoustic soundwave bars + Optical Cobalt caption bracket) across `docs/favicon.svg`, `docs/favicon.png`, `docs/favicon.ico`, `docs/apple-touch-icon.png`, `docs/assets/icon-512.png`, `extension/icons/icon16..128.png`, `src/ui/brand-icon.js`, and `src/web/App.jsx`.
* **Shadow DOM player overlay and toast alignment (`src/content/player-overlay.js`, `src/content/toast.js`):** Unified the in-player caption control bar and status toasts on `notebooklm.google.com` with the Graphite and Optical Cobalt palette and `Plus Jakarta Sans` typography.
* **Authentic Chromium UI screenshots (`docs/assets/screenshots/01..04.png`, `store-assets/01..04.png`):** Replaced synthetic wireframe illustrations with real headless Chromium captures of the live extension popup, extension settings page, Shadow DOM in-player caption bar, and hosted web library.

### Fixed
* **Broken in-player screenshot on the overview page:** Rebuilt `docs/app.js` to eliminate a stale `/assets/screenshot-1-hero-player.png` bundle reference and serve `/assets/screenshots/01-player-subtitles.png` cleanly.
* **Top-layer `<dialog>` inert download blocking (`src/content/player-overlay.js`):** Mounted temporary file-download `<a>` anchors inside the active closed `ShadowRoot` / fullscreen container rather than `document.body` so NotebookLM's modal `<dialog>` top-layer `inert` rules never block `.srt`, `.vtt`, `.txt`, or `.json` downloads.
* **PR #7 and PR #8 bundle conflict:** Resolved the `package.json`, `package-lock.json`, `src/web/main.jsx`, and `docs/app.js` merge conflicts between Vercel Web Analytics and Vercel Speed Insights.

### Changed
* **Repository and internal namespace alignment (`sarang-cmd/lm-subs`):** Updated `package.json`, web links, documentation, `HOSTED_CLOUD_URL` (`https://lm-subs.vercel.app`), Shadow DOM host IDs (`lm-subs-*`), and runtime message constants (`LM_SUBS_*`) to match the `lm-subs` repository name and unified package version `0.2.1` (`lm-subs-v0.2.1.zip`).

---

## `v0.2.0` (2026-10-24)

 Major speed and cloud-sync release (PR #4) rebranding **Subtitles for NotebookLM** to **LM Subs** and cutting end-to-end caption latency from multi-minute full-video downloads down to ~3.2 seconds.

### Added
* **Neon Serverless PostgreSQL encrypted sync backend (`server/`, `db/schema.sql`, `neon.ts`, `api/[...route].js`):** Hono REST API backed by PostgreSQL (with automatic `@electric-sql/pglite` embedded fallback for local development and CI) storing user sessions, settings, cached subtitle tracks, and `HKDF-SHA256` + `AES-256-GCM` per-user encrypted API keys bound to `${userId}:${providerId}` as authenticated AAD.
* **Neon Managed Auth JWKS verification (`jose`):** Added Ed25519/RS256 JWT verification against `NEON_AUTH_JWKS_URL` alongside `scrypt` and `SHA-256` hashed `lms_...` extension bearer tokens.
* **Zero-decode `=m140` pure-audio passthrough (`src/background/service-worker.js`):** Inspects `inspectMp4Tracks()` and `Content-Type` so fragmented DASH `audio/mp4` streams (`<=24 MB`) pass straight to speech-to-text providers with `0 ms` PCM `.wav` inflation overhead.
* **Parallel `HTTP 206 Partial Content` byte-range audio extractor (`extractAudioViaHttpRange` in `src/lib/audio-extract.js`):** Probes head/tail `moov` atoms on large muxed `=m22` MP4s and fetches only the 3 to 6 MB `soun` audio byte ranges across 6 concurrent `HTTP 206` streams, skipping over 93% of H.264 video frames.
* **Progressive live cues (`SUBTITLES_PARTIAL`):** Streams partial cues to the active `<video>` element as soon as chunk 1 finishes while remaining chunks transcribe across 3 concurrent workers.

### Improved
* **Segment-level Whisper timestamp mode (`src/lib/providers/openai-compat.js`):** Switched OpenAI, Groq, and custom Whisper requests from slow word-level Dynamic Time Warping (`"word"`) to `"segment"` granularity (~200x real-time) paired with client-side clause balancing (`cuesFromSegments()`).
* **Pre-download cloud cache lookup:** Checks local storage and `GET /api/sync/subtitle?cacheKey=...` before touching Google's media CDN (~50 ms cross-browser cache hit).

### Changed
* **Rebranded to `LM Subs`:** Updated extension manifest name, toolbar titles, track labels, and package scripts (`lm-subs`).

---

## `v0.1.2` (2026-10-24)

 Live compatibility release (PR #3) for Google Workspace `notebook.google.com` modal `Lot` video dialogs and SSR-hydrated notebooks.

### Added
* **SSR `AF_initDataCallback` payload parser (`parseAfInitDataPayloads` in `src/lib/batchexecute.js`):** Discovers ready Video Overviews hydrated inline inside initial HTML `<script>` blocks on page refresh even when zero `batchexecute` XHR calls fire.
* **Cross-world `REQUEST_PAGE_STATE` snapshot replay (`src/content/page-hook.js`):** Allows `content.js` to request an immediate replay of all discovered SSR and RPC video artifacts whenever a modal player opens.
* **In-page Shadow DOM Debug Drawer (`src/content/debug-drawer.js`) and redacted diagnostic report (`GET_DEBUG_REPORT`):** Optional live pipeline monitor on NotebookLM with one-click copy that scrubs API keys, bearer tokens, and signed query strings.

### Fixed
* **Shadow DOM `<video>` discovery inside `Lot` modal dialogs (`collectVideosDeep` in `src/content/content.js`):** Recursively traverses open ShadowRoots and attaches overlays cleanly when `<video>` elements live directly under a ShadowRoot boundary.
* **Silent preview MP4 skip (`inspectMp4Tracks` in `src/lib/audio-extract.js`):** Detects video-only `=s512-mm,22` thumbnail previews (`vide` track with zero `soun` track) and advances automatically to audio-bearing `=m140` / `=m22` streams.

---

## `v0.1.1` (2026-10-24)

 Network reliability release (PR #2) resolving `TypeError: Failed to fetch` on Workspace "Gemini Notebook" (`notebook.google.com`) media redirects.

### Added
* **First-party MAIN-world audio extraction (`page-hook.js` + `STAGE_AUDIO_CHUNK`):** Extracts audio inside the first-party NotebookLM page context using ambient session cookies before staging compact audio slices to the Service Worker, avoiding cross-origin Service Worker redirect blocks.
* **Runtime Google CDN permission detector (`extension/popup.html`, `src/popup/popup.js`):** Detects withheld host permissions and provides a one-click `chrome.permissions.request` grant button in the popup.

### Fixed
* **Google FIFE 302 redirect host coverage (`extension/manifest.json`, `src/config/selectors.js`):** Added `*.usercontent.google.com`, `*.googlevideo.com`, `*.gvt1.com`, and `*.ggpht.com` to `host_permissions` and SSRF allowlists, plus `credentials: "include"` -> `"omit"` fallback on wildcard-CORS CDN responses.

---

## `v0.1.0` (2026-10-24)

 Initial open-source release (PR #1) of the Manifest V3 Chrome extension, client-side ISO-BMFF MP4 audio demuxer, and 12-provider BYOK speech-to-text queue.

### Added
* **Manifest V3 four-world isolation (`page.js`, `content.js`, `background.js`, `popup.js`/`options.js`):** Passive `batchexecute` (`R7cb6c`, `gArtLc`) observer in `MAIN` world, closed ShadowRoot two-line caption overlay + native `VTTCue` Picture-in-Picture bridge in `ISOLATED` world, and strict secret key storage isolated to `service-worker.js` (`permissions: ["storage"]` only).
* **Pure-JavaScript ISO-BMFF MP4 audio extractor (`extractAudioTrackFromMp4` in `src/lib/audio-extract.js`):** Strips H.264/VP9 video tracks in memory and rebuilds valid `.m4a` (`ftyp`/`moov`/`mdat`) containers with recalculated 32-bit `stco` / 64-bit `co64` chunk offsets, plus 16 kHz mono PCM `.wav` chunking for recordings exceeding provider upload limits.
* **12-provider BYOK speech-to-text queue with automatic `HTTP 429` failover (`src/lib/providers/`):** Built-in adapters for Groq, Mistral AI, Google Gemini, Deepgram, AssemblyAI, Gladia, Cloudflare Workers AI, ElevenLabs, Hugging Face, OpenRouter, OpenAI, and custom local Whisper endpoints.
* **Automated test suite (`node --test`):** Unit, security-isolation, subtitle parser/formatter, MP4 binary remuxing, and full end-to-end failover tests.

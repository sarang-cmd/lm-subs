# LM Subs Version History and Progress Log

This file tracks every release of **LM Subs** ([`sarang-cmd/lm-subs`](https://github.com/sarang-cmd/lm-subs), live at [`lm-subs.vercel.app`](https://lm-subs.vercel.app)), organized version by version into what was added, improved, fixed, and changed.

---

## `v0.2.3` (2026-10-25)

Adds the live Caption Customization Studio (6 backdrop themes, 4 typefaces, 5 text colors, 5 sizes, 3 vertical positions, continuous opacity, and progressive spoken-word highlight), NotebookLM study tools (smart topic chapters, cue bookmarks, chat citation insertion, sentence loop, cue jump, playback speed, Picture-in-Picture, and `.CSV` export), machine-counted codebase telemetry on `/about`, and fixes split-column button clipping in extension settings.

### Added
* **Live Caption Customization Studio (`src/content/player-overlay.js`, `src/lib/storage.js`, `extension/options.html`, `src/options/options.js`):** Customize caption size (`small` to `xxlarge`), backdrop theme (`Dark box`, `High contrast`, `Clean floating text`, `Cinema rounded pill`, `Light paper card`, `Warm night-study`), typeface (`Plus Jakarta Sans`, `Editorial serif`, `JetBrains Mono`, `Readable wide spacing`), text color (`White`, `Yellow`, `Cyan`, `Green`, `Ink`), vertical position (`Lower third`, `Raised above scrubber`, `Top lecture banner`), line width, continuous backdrop opacity (`20%` to `100%`), progressive spoken-word highlight, hover-to-pause, and click-caption-to-copy, complete with an in-player `Style` popover (`S`) and a live preview frame in Settings.
* **NotebookLM study and playback enhancements (`src/content/player-overlay.js`, `src/content/content.js`, `src/lib/subtitles.js`):** Added auto-generated Smart Chapters (`Chapters` tab), timestamped cue bookmarks (`M` or `Save` button, synced via `UPDATE_CACHED_SUBTITLES`), one-click `Cite` insertion directly into NotebookLM's chat prompt textarea, single-sentence repeat loop (`L`), previous/next cue jump (`J` / `K`), playback speed stepper (`0.75x` to `2x`, `<` / `>`), Picture-in-Picture toggle (`P`), and `.CSV` spreadsheet/Anki export alongside `.SRT`, `.VTT`, `.TXT`, `.MD`, and `.JSON`.
* **Machine-counted project and codebase telemetry on `/about` (`scripts/generate-project-stats.mjs`, `src/lib/project-stats.js`, `src/web/AboutView.jsx`):** Build-time source analyzer computes real lines of code, file counts, architectural subsystem shares, language breakdown, test counts, active build hours, commits, pull requests, and extension archive footprint.

### Fixed
* **Settings split-grid button overflow (`extension/ui.css`, `extension/options.html`):** Enforced `min-width: 0` on `.ext-split` and `.switch-row-item` children and wrapped left-column action rows (`.action-cluster`) so action buttons (`Test desktop alert`, `Mark all read`, `Clear feed`) never protrude beneath the right-hand `.sheet` card.
* **Live tab hot-reload map reference (`src/content/content.js`):** Fixed `LM_SUBS_SUBTITLES_UPDATED` listener to iterate `controllers.entries()` so background-synced captions hot-reload active `<video>` cues reliably.

---

## `v0.2.2` (2026-10-25)

Adds automatic out-of-the-box extension notifications, scheduled background release checks, SHA-256 verified in-place unpacked folder auto-updates, and automatic background cloud sync with live player hot-reload.

### Added
* **Automatic out-of-the-box notifications and MV3 background alarms (`extension/manifest.json`, `src/background/service-worker.js`):** Promoted `"notifications"` and `"alarms"` into manifest `permissions` (`["storage", "notifications", "alarms"]`) so native OS desktop alerts with the LM Subs logo and periodic background checks (`lmsubs-update-check` every 15 minutes and `lmsubs-cloud-sync` every 5 minutes) run automatically on load without a manual permission prompt.
* **Automatic release detection and SHA-256 verified unpacked folder auto-updater (`src/lib/unpacked-updater.js`, `scripts/package-zip.mjs`, `scripts/vercel-build.mjs`, `GET /api/version`):** Every build stamps a deterministic 12-character content `buildId` (`extension/build-meta.json` and `docs/releases/latest.json`) and SHA-256 digest (`docs/releases/lm-subs-latest.zip`). When a newer version or build is deployed to `lm-subs.vercel.app`, the extension notifies you automatically (`UPD` toolbar badge, OS desktop alert, and popup banner) and, once your unpacked `lm-subs` folder is linked via `FileSystemDirectoryHandle`, verifies SHA-256 and CRC-32, writes the updated files directly to disk, and reloads the extension automatically.
* **Automatic background cloud polling and live player hot-reload (`src/background/service-worker.js`, `src/content/content.js`):** Background cloud sync pulls new transcripts, edited cues, and unread cloud notifications automatically, fires OS desktop alerts, and broadcasts `LM_SUBS_SUBTITLES_UPDATED` to open NotebookLM tabs so active `<video>` captions update immediately without refreshing the page.

---

## `v0.2.1` (2026-10-25)

 Unifies the hosted cloud experience, editorial Chrome extension parity, faster media download and pure-audio extraction, always-open local sign-in code inputs, collapsible provider controls, and accurate avoided video upload telemetry across PRs #5 through #14.

### Added
* **LM Subs brand logo across all notification surfaces (`src/lib/brand-logo.js`, `src/content/toast.js`, `src/content/content.js`, `src/web/NotificationCenter.jsx`, `extension/manifest.json`):** Added the squircle LM Subs logo across OS desktop notifications (`icons/icon128.png` in Chrome, `/assets/icon-128.png` on the web, and `web_accessible_resources` for NotebookLM tabs), Trusted-Types-safe vector logo rendering inside NotebookLM's in-page closed-ShadowRoot toast, and brand logo marks across the web, popup, and extension settings Notification Centers.
* **Desktop OS notifications, Notification Center, and Chrome toolbar badge (`src/background/service-worker.js`, `src/web/NotificationCenter.jsx`, `server/app.js`, `db/schema.sql`):** Opt-in OS desktop alerts (`optional_permissions: ["notifications"]` in Chrome and Web `Notification` API on the web app), a persistent Notification Center with unread counts across the website, toolbar popup, and extension settings, Chrome toolbar icon status badges (`...`, unread count, `!`), optional two-note completion audio chimes, and interactive in-page action toasts (`Transcript`).
* **Interactive click-to-seek Transcript Drawer and keyboard shortcuts inside NotebookLM (`src/content/player-overlay.js`, `src/content/content.js`):** Docked closed-ShadowRoot transcript panel (`T`) with live spoken-word filtering, auto-scrolling active line highlight, click-to-seek timestamp navigation, caption backdrop switcher (`B`: Dark box, High contrast, Clean floating text), and an on-screen keyboard shortcut guide (`?`, `C`, `T`, `[`, `]`, `\`, `-`, `+`, `B`).
* **Full-text spoken cue search, inline caption editor, and `.MD` study notes export (`src/lib/subtitles.js`, `src/web/LibraryView.jsx`, `src/options/options.js`, `PUT /api/sync/subtitle`):** Search inside spoken caption words across your entire library, edit cue timestamps and text inline with cloud Postgres sync, and export structured Markdown study notes (`.md`) grouped into 90-second timestamped sections alongside `.srt`, `.vtt`, `.txt`, and `.json`.
* **Always-open local sign-in code inputs across web and Chrome extension (`src/web/AuthDialog.jsx`, `src/web/LibraryView.jsx`, `extension/options.html`, `extension/popup.html`):** Every sign-in surface keeps an open input box for pasting a local `lms_...` extension token or 6-digit email verification code without expanding hidden menus. Signing in on the web library (`/?view=library&ext_connect=1`) automatically mints and displays a copyable `lms_...` local code.
* **Collapsible speech-to-text provider and API key panels (`src/web/LibraryView.jsx`, `extension/options.html`, `extension/popup.html`):** Speech-to-text providers and API keys collapse into compact one-line rows across the web library, extension settings page, and toolbar popup so configured accounts stay uncluttered while keeping queue order and key editing one click away.
* **Hosted Google, GitHub, and 6-digit email sign-in (`server/app.js`, `src/web/AuthDialog.jsx`, `extension/options.html`):** End users sign in directly to the maintainer-hosted cloud library (`https://lm-subs.vercel.app`) via Google OAuth 2.0, GitHub OAuth, or passwordless 6-digit email verification codes without configuring a database or server URL.
* **Granular sync opt-in switches and one-click cloud purge (`lmsubs_users.sync_preferences_json`, `PUT /api/sync/preferences`):** Independent toggles for **Sync API keys**, **Sync transcriptions**, and **Sync preferences** in both the web app (`/library`) and extension settings. Disabling any category lets users purge stored cloud rows for that category while keeping local Chrome data intact.
* **Real SQL transcription statistics and accurate avoided upload telemetry (`src/lib/audio-extract.js`, `server/app.js`, `/stats`, `GET /api/stats`):** `resolveAvoidedVideoBytes` computes exact `originalBytes - extractedBytes` on muxed MP4 extractions and derives equivalent 720p `=m22` video container bytes avoided when pure-audio `=m140` streams bypass video download altogether, preventing `0.0 MB` under-reporting across popup, settings, and cloud stats.
* **Multi-format export everywhere (`GET /api/sync/export`, `GET /api/sync/export-all`):** Direct `.srt`, `.vtt`, `.txt`, `.json`, clipboard `Copy`, and bulk `Export all` archive downloads across the in-player caption bar, toolbar popup, extension settings vault, and web cloud library.
* **Step-by-step non-technical setup guide (`/guide`, `src/web/GuideView.jsx`, `extension/popup.html`, `extension/options.html`, `README.md`):** Plain-language 4-step walkthrough with macOS and Windows unzip tabs, one-click `chrome://extensions` copy, free Groq key instructions (no credit card), and an auto-expanding first-run helper inside the extension popup when zero keys are configured.
* **Creator and architecture `/about` page (`src/web/AboutView.jsx`, `docs/about.html`):** Credits creator **Sarang** (`@sarang-cmd`) and documents the four-plane Manifest V3 + Neon Postgres architecture.
* **Vercel Web Analytics and Vercel Speed Insights (`src/web/main.jsx`):** Integrated `@vercel/analytics` (PR #8) and `@vercel/speed-insights` (PR #7) side by side on the hosted web app.
* **Neon vs Supabase and Firebase engineering guide (`DEPLOYMENT_GUIDE.md`):** First-principles comparison of SQL Editor migrations, why LM Subs requires zero object-storage buckets, how Google Cloud OAuth credentials differ from Firebase Auth, and a step-by-step Vercel + Neon deployment checklist.

### Improved
* **Faster media probing, dead-mirror pruning, and parallel Range extraction (`src/background/service-worker.js`, `src/page/inject.js`, `src/lib/audio-extract.js`):** Added `4500 ms` initial header timeouts, immediate `res.body.cancel()` stream cancellation before `HTTP 206` Range extraction (`>3 MB`), dead FIFE suffix pruning (`=m140` / `=m18` 404/403 skipped across `lh3.googleusercontent.com` and `lh3.google.com` mirrors), 8-way parallel byte-range extraction with adaptive slice coalescing, and pure-audio passthrough in `inject.js` without PCM `.wav` inflation.
* **Chrome extension visual parity with website (`extension/ui.css`, `extension/options.html`, `extension/popup.html`, `src/options/options.js`, `src/popup/popup.js`):** Rebuilt the Chrome extension popup and settings pages on the same Mineral Alabaster (`#F6F7F8`), Quiet Sheet (`#FDFDFE`), Graphite (`#111315`), and Optical Cobalt (`#0055D4`) token system and `Plus Jakarta Sans` + `JetBrains Mono` typography as `docs/styles.css`.
* **React 19 + Radix UI + Motion web application (`src/web/`):** Rebuilt the public website and cloud library in an Alabaster (`#F6F7F8`), Graphite (`#111315`), and Optical Cobalt (`#0055D4`) design system with accessible Radix `Dialog`, `Tabs`, `Collapsible`, and `Switch` primitives and an interactive NotebookLM caption preview stage (`ScreeningStage.jsx`).
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

# Privacy Policy — Subtitles for NotebookLM

**Effective Date:** October 24, 2026

**Subtitles for NotebookLM** is an open-source, Bring-Your-Own-Key (BYOK) Chrome Manifest V3 extension. We do not operate any backend server, proxy, analytics tracker, or telemetry endpoint.

## 1. Information Stored Locally

All extension state is stored exclusively on your device inside `chrome.storage.local`:

- **API Keys (`apiKeys`)**: Stored locally and accessed strictly inside the isolated MV3 Background Service Worker (`src/background/service-worker.js`). Neither NotebookLM's page context nor UI pages read raw key strings.
- **Preferences (`settings`)**: Queue priority order, model selections, caption font size, timing offset, language hints, and regex exclusion patterns.
- **Subtitle LRU Cache (`subtitleCache` & `subtitleHistory`)**: Up to 35 generated or imported subtitle tracks so re-opening a Video Overview displays captions instantaneously without re-calling any API.

## 2. How Media & Audio Data Flow

1. When you generate or play a NotebookLM Studio **Video Overview**, the extension fetches the media stream from Google's CDN (`*.googleusercontent.com` / `*.googlevideo.com`) using your authenticated browser session.
2. Inside the local Service Worker, `extractAudioTrackFromMp4()` strips out all video tracks so only the compact audio track (`.m4a` or 16 kHz mono `.wav`) is retained in memory.
3. That extracted audio buffer is sent **directly from your browser over HTTPS** (or `localhost` if configured) to the Speech-to-Text provider(s) you explicitly configured and granted optional host permission for.

## 3. Zero Third-Party Sharing by the Developer

- Zero analytics or crash-reporting SDKs.
- Zero remote scripts (`script-src 'self'`).
- Error messages pass through `redactSecrets()` so API keys are never written to status logs.

## 4. User Control & Deletion

You can clear any saved API key or delete cached subtitle transcripts at any time via the extension's **Settings** page (`options.html`), or erase all local storage by uninstalling the extension.

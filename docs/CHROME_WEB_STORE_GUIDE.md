# Chrome Web Store Publishing Guide: LM Subs (`v0.2.1`)

Use the copy-pasteable fields below when submitting `docs/releases/lm-subs-v0.2.1.zip` (`https://github.com/sarang-cmd/lm-subs`, live web app `https://lm-subs.vercel.app`) in the Chrome Web Store Developer Dashboard.

---

## 1. Store Listing Copy

- **Title**: `LM Subs`
- **Summary (<= 132 chars)**:
  `Sub-5s synchronized captions, .SRT/.VTT/.TXT/.JSON export & encrypted Neon Postgres sync for Google NotebookLM Video Overviews.`
- **Category**: `Productivity` -> `Education` / `Workflow & Planning`

---

## 2. Privacy Tab: Permission Justifications

### Single Purpose Description
> Generates synchronized closed captions, multi-format subtitle exports (`.SRT`, `.VTT`, `.TXT`, `.JSON`), and optional encrypted cloud sync for Google NotebookLM Studio Video Overviews using the user's chosen Speech-to-Text API key.

### `storage` Permission Justification
> Stores the user's Speech-to-Text provider preferences, API keys, optional cloud sync session, caption styling settings, and a local 35-item LRU subtitle cache in `chrome.storage.local` so previously captioned Video Overviews load immediately without repeated API calls.

### `host_permissions` Justification (`notebooklm.google.com`, `notebook.google.com`, `*.googleusercontent.com`, `*.googlevideo.com`, STT APIs)
> Required to detect Studio Video Overview players on Google NotebookLM (`notebooklm.google.com` and Workspace `notebook.google.com`), read pure-audio `=m140` / `HTTP 206` Range audio slices from Google's media CDN, send extracted audio to the user's configured Speech-to-Text API, and render synchronized captions inside the video player.

### `optional_host_permissions` Justification
> Requested dynamically inside user click gestures only when the user configures a custom `localhost` Whisper endpoint or a custom Neon Sync server URL.

### Remote Code
> **No, I am not using Remote code.** All JavaScript is bundled statically via `esbuild` inside the extension package (`script-src 'self'`).

---

## 3. Store Visual Assets Included in `store-assets/`

- `store-assets/01-player-subtitles.png` (`1280x800`)
- `store-assets/02-audio-extraction-failover.png` (`1280x800`)
- `store-assets/03-toolbar-popup.png` (`1280x800`)
- `store-assets/04-settings-queue.png` (`1280x800`)
- `extension/icons/icon128.png` (`128x128`)

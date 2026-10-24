# Chrome Web Store Publishing Guide — Subtitles for NotebookLM

Use the copy-pasteable fields below when submitting `docs/releases/notebooklm-subtitles-v0.1.2.zip` in the Chrome Web Store Developer Dashboard.

---

## 1. Store Listing Copy

- **Title**: `Subtitles for NotebookLM`
- **Summary (<= 132 chars)**:
  `Automatic synchronized subtitles & .SRT/.VTT export for Google NotebookLM Video Overviews using audio-only BYOK Speech-to-Text.`
- **Category**: `Productivity` -> `Education` / `Workflow & Planning`

---

## 2. Privacy Tab — Permission Justifications

### Single Purpose Description
> Generates and displays synchronized closed captions (and `.SRT`/`.VTT` subtitle exports) for Google NotebookLM Studio Video Overviews using the user's chosen Speech-to-Text API key.

### `storage` Permission Justification
> Stores the user's Speech-to-Text provider preferences, API keys, caption styling settings, and a local 35-item LRU subtitle cache in `chrome.storage.local` so previously captioned Video Overviews load immediately without repeated API calls.

### `host_permissions` Justification (`notebooklm.google.com`, `notebook.google.com`, `*.googleusercontent.com`, `*.googlevideo.com`)
> Required to detect Studio Video Overview players on Google NotebookLM (`notebooklm.google.com` and Workspace `notebook.google.com`), download the user's Video Overview stream to strip the audio track locally in JavaScript, and render synchronized captions inside the video player.

### `optional_host_permissions` Justification (STT API Endpoints)
> Requested dynamically at runtime only when the user configures and saves an API key (or `localhost` URL) for a specific Speech-to-Text provider (`Groq`, `Mistral`, `Gemini`, `Deepgram`, `AssemblyAI`, `Gladia`, `Cloudflare`, `ElevenLabs`, `Hugging Face`, `OpenRouter`, `OpenAI`, or custom Whisper server).

### Remote Code
> **No, I am not using Remote code.** All JavaScript is bundled statically via `esbuild` inside the extension package (`script-src 'self'`).

---

## 3. Store Visual Assets Included in `store-assets/`

- `store-assets/01-player-subtitles.png` (`1280x800`)
- `store-assets/02-audio-extraction-failover.png` (`1280x800`)
- `store-assets/03-toolbar-popup.png` (`1280x800`)
- `store-assets/04-settings-queue.png` (`1280x800`)
- `extension/icons/icon128.png` (`128x128`)

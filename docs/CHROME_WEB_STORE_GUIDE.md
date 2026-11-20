# Chrome Web Store Publishing Guide: LM Subs (`v0.2.9`)

Use the copy-pasteable fields below when submitting the store-ready package in the Chrome Web Store Developer Dashboard. The store zip is `docs/releases/lm-subs-v0.2.9-store.zip` (manifest at the zip root, no `lm-subs/` folder prefix), built from `extension/` at build `7d46e91cb965`. The regular download zip `docs/releases/lm-subs-v0.2.9.zip` keeps the `lm-subs/` folder for manual "Load unpacked" installs and is not the file to upload to the store.

Source repository: `https://github.com/sarang-cmd/lm-subs`. Live web app: `https://lm-subs.vercel.app`. Privacy policy URL for the listing: `https://lm-subs.vercel.app/privacy.html`.

---

## 1. Store Listing Copy

- **Title**: `LM Subs`
- **Summary (<= 132 chars)**:
  `Sub-5s synchronized captions, .SRT/.VTT/.TXT/.JSON export & encrypted Neon Postgres sync for Google NotebookLM Video Overviews.`
- **Category**: `Productivity` -> `Education` / `Workflow & Planning`
- **Language**: `English (United States)`

### Full description (paste into the listing)

```
LM Subs adds synchronized closed captions, word-by-word highlighting, smart chapters, and six-format transcript export to Google NotebookLM Video Overviews and Audio Overview podcasts, which ship without any caption track.

How it works
- Captions generate in seconds. Instead of uploading a 50 to 120 MB video, LM Subs reads the compact audio-only stream from NotebookLM and sends just the audio to the speech-to-text provider you choose.
- Bring your own key. Twelve providers are supported (Groq, Mistral, Gemini, Deepgram, AssemblyAI, Gladia, Cloudflare, ElevenLabs, Hugging Face, OpenRouter, OpenAI, and a local Whisper endpoint). Groq and Mistral both offer permanent free tiers with no credit card.
- Automatic failover. If one provider rate-limits or errors, LM Subs moves to the next provider in your queue without losing the transcript.

What you get
- Synchronized captions rendered inside the NotebookLM player, with CC controls docked in the bottom play bar.
- Word-by-word highlighting with an adjustable delay, caption styling controls, and smart chapters.
- Export to SRT, VTT, TXT, MD, CSV, and JSON.
- Captions for Audio Overview podcasts with speaker labels preserved.
- Optional encrypted cloud sync: sign in to keep transcripts, settings, and API keys across browsers. Keys are encrypted per user (AES-256-GCM) before they reach the database, and you control separate switches for keys, transcripts, and settings.

Privacy
- Everything works locally by default. API keys live only in the extension's background service worker and never enter the NotebookLM page.
- Audio is sent only to the speech-to-text provider whose key you entered. Nothing is uploaded to LM Subs servers.
- The extension bundles zero analytics or tracking scripts.

LM Subs is free and open source under the MIT license. It is an independent tool and is not affiliated with Google LLC.
```

---

## 2. Privacy Tab: Permission Justifications

### Single Purpose Description
> Generates synchronized closed captions, multi-format subtitle exports (`.SRT`, `.VTT`, `.TXT`, `.MD`, `.CSV`, `.JSON`), and optional encrypted cloud sync for Google NotebookLM Studio Video Overviews and Audio Overviews using the user's chosen Speech-to-Text API key.

### `storage` Permission Justification
> Stores the user's Speech-to-Text provider preferences, API keys, optional cloud sync session, caption styling settings, and a local 35-item LRU subtitle cache in `chrome.storage.local` so previously captioned Video Overviews load immediately without repeated API calls.

### `notifications` and `alarms` Permission Justifications
> `notifications` is used only to tell the user that caption generation finished or that a sync completed. `alarms` schedules the periodic check that keeps the cloud sync session fresh and retries a failed caption job.

### `activeTab` Permission Justification
> Lets the toolbar popup read the active NotebookLM tab so it can show the current notebook and start caption generation for the overview that is already open, without requesting access to every tab.

### `host_permissions` Justification (`notebooklm.google.com`, `notebook.google.com`, `notebook.cloud.google.com`, Google media CDNs, STT APIs)
> Required to detect Studio Video Overview and Audio Overview players on Google NotebookLM (`notebooklm.google.com`, Workspace `notebook.google.com`, and `notebook.cloud.google.com`), read pure-audio `=m140` / `HTTP 206` Range audio slices from Google's media CDNs (`*.googleusercontent.com`, `*.googlevideo.com`, `*.gvt1.com`, `*.ggpht.com`), send the extracted audio to the user's configured Speech-to-Text API (Groq, Mistral, Gemini, Deepgram, AssemblyAI, Gladia, Cloudflare, ElevenLabs, Hugging Face, OpenRouter, OpenAI), and render synchronized captions inside the video player.

### `optional_host_permissions` Justification
> Requested dynamically inside user click gestures only when the user configures a custom `localhost` Whisper endpoint, a custom Neon Sync server URL, or a custom provider base URL. The extension never requests these hosts until the user asks for them.

### Remote Code
> **No, I am not using Remote code.** All JavaScript is bundled statically via `esbuild` inside the extension package (`script-src 'self'`). The only network calls are `fetch` requests to the hosts listed above.

### Data Usage (Privacy tab checkboxes)
- **Personalization**: No. The extension does not use personal data to personalize content.
- **User activity**: No. No browsing history, page content, or usage analytics leave the device except the audio the user explicitly transcribes.
- **Authentication info**: Yes, only when the user opts in. API keys and the optional cloud sync session are stored locally, and encrypted copies are stored in the hosted database only when the user turns on sync.
- **Location**: No.
- **Health info**: No.
- **Financial and payment info**: No. Users bring their own free-tier API keys; LM Subs never sees payment details.
- **Web history**: No.
- **Communications**: No.
- **Photos and files**: No. Audio is processed in memory and never saved as a file by the extension.

---

## 3. Store Visual Assets Included in `store-assets/`

- `store-assets/01-player-subtitles.png` (`1280x800`)
- `store-assets/02-audio-extraction-failover.png` (`1280x800`)
- `store-assets/03-toolbar-popup.png` (`1280x800`)
- `store-assets/04-settings-queue.png` (`1280x800`)
- `extension/icons/icon128.png` (`128x128`, store icon)

Screenshots must be at least `1280x800` (or `640x400`). All four captures above meet that minimum. The store icon must be a `128x128` PNG, which `extension/icons/icon128.png` is.

---

## 4. Submission Checklist

1. Pay the one-time $5 developer registration fee and verify the developer account.
2. Create a new item and upload `docs/releases/lm-subs-v0.2.9-store.zip`. Confirm the dashboard reads version `0.2.9` and that `manifest.json` sits at the zip root.
3. Paste the listing copy from section 1, set the category, and upload the four screenshots plus the `128x128` icon.
4. Fill the Privacy tab with the justifications from section 2 and set the privacy policy URL to `https://lm-subs.vercel.app/privacy.html`.
5. Answer the single-purpose and remote-code questions with the text above.
6. Submit for review. Typical review time is a few days. If a reviewer asks about the `*.google.com` host permission, point to the media CDN ranges the extension reads audio from and to the privacy policy.
7. After approval, update the website download buttons and the setup guide to link to the store listing, and keep the direct `.zip` download as a fallback for users on browsers without store access.

### Trademark note
The listing title is `LM Subs`, which does not start with "NotebookLM" and does not imply affiliation with Google. The description states plainly that LM Subs is an independent tool not affiliated with Google LLC, which matches the Chrome Web Store branding policy for third-party tools that work with a Google product.

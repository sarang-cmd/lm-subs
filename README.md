<div align="center">

<img src="docs/assets/logo.svg" width="76" height="76" alt="Subtitles for NotebookLM logo" />

# Subtitles for NotebookLM

**Automatic synchronized closed captions & `.SRT`/`.VTT` export for Google NotebookLM Video Overviews.**  
Client-side ISO-BMFF audio extraction (`-92%` payload size) · 12 BYOK Speech-to-Text providers · Zero backend · Zero telemetry.

[![Chrome Manifest V3](docs/assets/badges/manifest-v3.svg)](#architecture-deep-dive)
[![12 BYOK STT Providers](docs/assets/badges/providers.svg)](#supported-byok-providers--free-tiers)
[![-92% .m4a Audio Extraction](docs/assets/badges/audio-extract.svg)](#3-client-side-iso-bmff-audio-track-remuxing-mp4--m4a)
[![25 / 25 Tests Passing](docs/assets/badges/tests.svg)](#development--testing)
[![Zero Telemetry](docs/assets/badges/telemetry.svg)](docs/PRIVACY_POLICY.md)
[![MIT License](docs/assets/badges/license.svg)](LICENSE)

<br />

<img src="docs/assets/banner-social-1280x640.png" width="880" alt="Subtitles for NotebookLM overview banner" />

</div>

---

## Why This Exists

Google NotebookLM (`notebooklm.google.com` and Workspace `notebook.google.com`) generates narrated **Studio Video Overviews**, but its built-in `<video>` player ships **without closed captions, transcripts, or `.SRT`/`.VTT` export**.

Naive captioning approaches run into three hard walls:
1. **Free-tier upload caps**: A 5-minute 720p NotebookLM Video Overview MP4 weighs **50–80 MB**, immediately exceeding Groq's **25 MB** Whisper upload limit.
2. **WASM bundle bloat**: Shipping `ffmpeg.wasm` inside a browser extension adds ~30 MB of binary weight and hits strict Manifest V3 Content-Security-Policy restrictions.
3. **Single-provider rate limits**: Relying on a single free API key stalls when hitting per-minute RPM or audio-seconds-per-hour quotas.

**Subtitles for NotebookLM** solves all three cleanly inside a **78 KB** zero-dependency Manifest V3 package:
- **Extracts only the audio track locally in pure JavaScript** (`extractAudioTrackFromMp4`), stripping H.264 video frames and repacking the AAC `soun` track into a **~4 MB `.m4a`** in ~12 milliseconds (`-92%` bandwidth).
- **Supports 12 BYOK Speech-to-Text & Multimodal Audio providers** in a **reorderable priority failover queue** (e.g., `#1 Groq -> #2 Mistral -> #3 Gemini`), failing over automatically on HTTP `429` or `5xx` without re-downloading the video.
- **Injects synchronized captions into the NotebookLM player** via an isolated closed `ShadowRoot` overlay (`[CC]`, `A-/A+`, `±0.25s` sync nudge, `.SRT`/`.VTT` export, external subtitle import) paired with a native `VTTCue` track for **OS Picture-in-Picture**.

---

## Screenshots

| In-Player Synchronized Captions & HUD | Audio Slimming & Queue Failover |
| --- | --- |
| ![In-player captions](docs/assets/screenshots/01-player-subtitles.png) | ![Audio extraction & failover](docs/assets/screenshots/02-audio-extraction-failover.png) |
| **Toolbar Popup & 1-Click Key Test** | **12-Provider Queue & Export Vault** |
| ![Toolbar popup](docs/assets/screenshots/03-toolbar-popup.png) | ![Full settings & queue](docs/assets/screenshots/04-settings-queue.png) |

---

## 60-Second Installation

### Option A — Prebuilt Release `.zip` (No Build Step)

1. Download **[`notebooklm-subtitles-v0.1.1.zip`](docs/releases/notebooklm-subtitles-v0.1.1.zip)** and unzip it.
2. Open `chrome://extensions` (works in Chrome, Brave, Arc, Edge, Vivaldi) and toggle **Developer mode** ON.
3. Click **Load unpacked** and select the extracted `notebooklm-subtitles` folder.
4. Click the **Subtitles for NotebookLM** toolbar icon and paste a free **[Groq](https://console.groq.com/keys)** and/or **[Mistral](https://console.mistral.ai/api-keys)** API key (click **Queue** to arrange failover priority).
5. Open any notebook on `notebooklm.google.com` or `notebook.google.com` and generate or play a **Video Overview**.

### Option B — Build from Source

```bash
git clone https://github.com/sarang-cmd/notebooklm-subtitles.git
cd notebooklm-subtitles
npm install
npm run build   # Bundles src/ -> extension/ via esbuild in ~40ms
npm test        # Runs all 25 unit, security-invariant, and E2E tests
```

Then load the `extension/` directory at `chrome://extensions`.

---

## Supported BYOK Providers & Free Tiers

Providers execute top-to-bottom in your configured queue order. If Provider `#1` returns `429 Too Many Requests`, `5xx`, or exceeds its upload byte limit, the queue automatically fails over to Provider `#2`.

| Default Rank | Provider | Default Model | Free Tier / Quota Highlights | Timestamp Source |
| :--- | :--- | :--- | :--- | :--- |
| **#1** | **Groq** | `whisper-large-v3-turbo` | **Permanent free plan (no card)**: 8 hrs audio/day, 2 hrs/hr, 20 RPM, 25 MB cap | Word + Segment (`verbose_json`) |
| **#2** | **Mistral (Voxtral)** | `voxtral-mini-transcribe-3` | **Free Studio Experiment tier (no card)**: 50+ languages, 48 MB cap (auto-falls back to `voxtral-mini-latest`) | Segment + Speaker ID |
| **#3** | **Google Gemini** | `gemini-2.5-flash` | **Free Google AI Studio tier (no card)**: Direct `.srt` output + optional single-pass subtitle translation | SubRip (`.srt`) |
| **#4** | **Deepgram** | `nova-3` | **$200 signup credit (no card)** — ~700+ hours of Nova-3 batch audio | Word + Utterance |
| **#5** | **AssemblyAI** | `universal` | **$50 signup credit (no card)** — ~330 hours on Universal-2 | Word (ms precision) |
| **#6** | **Gladia** | `solaria-1` | **€50 signup credit** — ~80+ hours with native SRT generation | Native SRT + Utterance |
| **#7** | **Cloudflare Workers AI** | `@cf/openai/whisper-large-v3-turbo` | **10,000 free Neurons/day** (`ACCOUNT_ID:API_TOKEN`) | Word + WebVTT |
| **#8** | **ElevenLabs** | `scribe_v2` | **10,000 free credits/month** (~30 min/mo STT across 90+ languages) | Word (`scribe_v2`) |
| **#9** | **Hugging Face** | `openai/whisper-large-v3-turbo` | **Free monthly Serverless Inference quota** (`hf_...` token) | Chunk timestamps |
| **#10** | **OpenRouter** | `mistralai/voxtral-mini-transcribe` | Unified OpenAI-compatible `/api/v1/audio/transcriptions` router | Segment |
| **#11** | **OpenAI Whisper** | `whisper-1` | Standard pay-as-you-go ($0.006 / minute) | Word + Segment |
| **#12** | **Local / Custom URL** | `Systran/faster-whisper-small` | **100% free & unlimited local** (`speaches`, `faster-whisper-server`, `whisper.cpp`, `LocalAI`) | Verbose JSON / SRT |

---

## Architecture Deep Dive

<div align="center">
  <img src="docs/assets/architecture.svg" width="960" alt="Three-World MV3 Architecture Diagram" />
</div>

### 1. Strict Three-World Privilege Separation

Chrome Manifest V3 splits extension code across distinct JavaScript execution worlds with asymmetric capabilities. **Subtitles for NotebookLM** enforces hard security boundaries between all three:

| Runtime World | Bundle (`src/` → `extension/`) | Capabilities | Hard Security Invariants |
| :--- | :--- | :--- | :--- |
| **1. Page `MAIN` World** | `src/page/inject.js` → `extension/page.js` | Passively observes `batchexecute` RPCs, caches `URL.createObjectURL` media blobs, and extracts compact `.m4a`/`.wav` audio with first-party Google session cookies. | **Zero** access to `chrome.*` APIs or `chrome.storage`. Never mutates outgoing requests or incoming responses. Posts metadata & `Transferable` audio buffers restricted to `window.location.origin`. |
| **2. `ISOLATED` Content World** | `src/content/content.js` → `extension/content.js` | Reads DOM `<video>` elements, mounts closed Shadow-DOM HUD/toast, maintains an MV3 keepalive port heartbeat during long transcriptions, and stages compact audio chunks to the Service Worker. | **Never** imports or calls `getApiKey` / `getSecretApiKeysMap` (enforced by automated test in `tests/e2e.test.js`). Never uses `innerHTML` on untrusted data. |
| **3. MV3 Service Worker** | `src/background/service-worker.js` → `extension/background.js` | Sole reader of `apiKeys` in `chrome.storage.local`; executes Layer-2 CORS-bypass media fallback (`*.googleusercontent.com` / `*.usercontent.google.com` / `*.gvt1.com`) and BYOK STT failover calls. | Rejects non-Google CDN media URLs (`isTrustedGoogleMediaUrl`), rejects `text/html` auth walls (`validateMediaPayload`), and scrubs secrets from all errors via `redactSecrets()`. |

Meanwhile, **`popup.js`** and **`options.js`** only ever receive boolean presence flags (`{ groq: true, mistral: true, gemini: false }`) via `getSavedKeyPresenceMap()` — saved keys can be replaced or cleared, never read back into the DOM.

---

### 2. Passive `batchexecute` RPC Detection (`src/lib/batchexecute.js`)

NotebookLM's Angular / Google Wiz frontend communicates with its backend over `POST /_/LabsTailwindUi/data/batchexecute` (and `/_/CloudNotebookLmUi/data/batchexecute`), framing responses with an anti-XSSI prefix (`)]}'`) followed by length-prefixed JSON `wrb.fr` envelopes.

Because Angular's RPC client uses `XMLHttpRequest` (`Closure XhrIo`) while newer streaming helpers use `window.fetch`, `page.js` passively observes **both** transports without altering network timing:

1. **Creation Trigger (`CREATE_STUDIO = "R7cb6c"`)**: Parses URL-encoded `f.req` request bodies. When `params[2][2] === 3` (`ARTIFACT_TYPES.VIDEO_OVERVIEW`), `content.js` arms automatic generation for that artifact's completion and displays a calm status toast (while ignoring Audio Overviews where `typeCode === 1`).
2. **Artifact Polling (`POLL_STUDIO = "gArtLc"`)**: Extracts Studio Video Overview rows (`row[2] === 3`) and normalizes lifecycle status (`row[4] === 2` processing → `row[4] === 3` ready). Once ready, `row[8]` provides:
   - `row[8][1]`: Progressive MP4 URL (`https://lh3.googleusercontent.com/notebooklm/<token>=m22`)
   - `row[8][2][1]`: Spoken BCP-47 / ISO-639-1 language code (e.g. `"en"`)
   - `row[8][3]` & `row[8][4]`: Download MP4 URL (`...=m22-dv`) and streaming variants
   - `row[8][5]`: `[durationSeconds, durationNanos]`
3. **RPC-Rotation Resilience**: If Google rotates `R7cb6c` or `gArtLc` to new 6-character IDs, `parseBatchExecuteResponse()` falls back to structural row matching (`UUID` + `typeCode === 3` + `row[8]` media block), and users can also hot-patch RPC IDs live in **Settings → Section 4**.

---

### 3. Client-Side ISO-BMFF Audio-Track Remuxing (`.mp4` → `.m4a`)

Instead of uploading a 60 MB H.264+AAC `.mp4` video (or shipping 30 MB of `ffmpeg.wasm`), [`src/lib/audio-extract.js`](src/lib/audio-extract.js) implements a deterministic, zero-dependency **ISO Base Media File Format (ISO/IEC 14496-12) audio-track remuxer** in ~250 lines of pure JavaScript:

```text
Input Progressive MP4 (~58 MB):
┌──────┐ ┌──────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│ ftyp │ │ moov                                     │ │ mdat (interleaved video + audio)      │
└──────┘ │  ├── mvhd                                │ │  [H.264 slice][AAC][H.264 slice][AAC] │
         │  ├── trak (hdlr = "vide", avc1)  <─ DROP │ └───────────────────────────────────────┘
         │  └── trak (hdlr = "soun", mp4a)  <─ KEEP │
         └──────────────────────────────────────────┘
                              │
                   extractAudioTrackFromMp4()
                              ▼
Output Standalone M4A (~4.3 MB, -92.6%):
┌──────┐ ┌──────────────────────────────────────────┐ ┌───────────────────┐
│ ftyp │ │ moov (mvhd + soun trak w/ rebuilt stco)  │ │ mdat (AAC only)   │
└──────┘ └──────────────────────────────────────────┘ └───────────────────┘
```

1. **Box Tree Traversal**: `readIsoBoxes()` walks top-level and nested atoms (`moov` → `trak` → `mdia` → `hdlr` → `minf` → `stbl`), handling both standard 32-bit sizes and 64-bit `largesize` headers.
2. **Sample-to-Chunk Byte Mapping**: Reads `stsc` (sample-to-chunk runs), `stsz` (constant or per-sample byte tables), and `stco` / `co64` (32-bit or 64-bit chunk byte offsets) for the `soun` track to slice the exact compressed AAC frames out of `mdat` without re-encoding or quality loss.
3. **Two-Pass `stco` Offset Recalculation**: Rebuilds a clean `M4A ` `ftyp` header + `moov` containing only `mvhd` and the `soun` `trak`, computes the exact byte offset where the new compact `mdat` payload begins, writes updated 32-bit `stco` offsets, and emits a valid `audio/mp4` `.m4a` accepted natively by Groq, Mistral, Gemini, Deepgram, AssemblyAI, Gladia, ElevenLabs, and OpenAI.
4. **16 kHz Mono WAV Chunker Fallback**: For non-MP4 streams or multi-hour recordings, `slicePcmIntoWavChunks()` decodes via `OfflineAudioContext` at 16 kHz mono 16-bit PCM (`32 KB/sec`) into `<= 18 MB` `.wav` slices with exact `startOffsetSec` timestamps, stitching returned cues seamlessly across chunk boundaries.

---

### 4. Subtitle Reflow, Hallucination Filtering & Dual Rendering (`src/lib/subtitles.js`)

Raw STT outputs rarely make comfortable video captions out of the box — Whisper segments can span 25 words on a single line or emit phantom `"Thank you for watching!"` cues during trailing music/silence, while word-level APIs return hundreds of individual word objects.

`src/lib/subtitles.js` normalizes every provider's output through a single pipeline:
- **Word-Timestamp Grouping (`cuesFromWords`)**: Groups word tokens from Groq, Deepgram, AssemblyAI, ElevenLabs, Cloudflare, and OpenAI into natural phrases (`<= 84` chars, `<= 6.2s`), breaking cleanly on sentence punctuation (`.?!`), clauses (`,;:—`), speaker changes, and speech pauses (`>= 380 ms`).
- **Overlong-Segment Splitting & Silence Hallucination Filter (`cuesFromSegments`)**: Proportionally splits long Voxtral/Whisper segments into readable cues and drops high-`no_speech_prob` (`> 0.85`) Whisper silence hallucinations.
- **Balanced Two-Line Wrapping (`wrapSubtitleLines`)**: Splits cues `> 42` characters near their visual midpoint (preferring punctuation boundaries) so eyes never dart across wide single lines.
- **Dual Caption Rendering (`src/content/player-overlay.js`)**:
  - **Inline & Fullscreen**: Closed `ShadowRoot` stage (`O(log N)` binary-search lookup via `findActiveCue()` every `100 ms`) completely immune to NotebookLM CSS overrides.
  - **OS Picture-in-Picture**: Syncs programmatic `video.addTextTrack("subtitles", ...)` + `VTTCue` instances and toggles `track.mode = "showing"` automatically on `enterpictureinpicture` / `leavepictureinpicture`.

---

## Repository Structure

```text
notebooklm-subtitles/
├── extension/                       # Ready-to-load unpacked Chrome MV3 extension
│   ├── icons/                       # 16, 32, 48, 128px PNG icons
│   ├── manifest.json                # Least-privilege MV3 manifest ("storage" + optional STT origins)
│   ├── popup.html / options.html    # Toolbar popup & full priority-queue settings UI
│   ├── ui.css                       # Shared utilitarian light/dark stylesheet
│   └── *.js                         # Bundled zero-dependency scripts built by build.mjs
├── src/
│   ├── config/selectors.js          # Single source of truth: hosts, RPC IDs, wire positions, selectors
│   ├── page/inject.js               # MAIN-world passive XHR + fetch batchexecute observer
│   ├── content/
│   │   ├── content.js               # Isolated-world coordinator, cache lookup, bounded retries
│   │   ├── player-overlay.js        # Closed Shadow-DOM caption overlay, HUD controls & PiP bridge
│   │   └── toast.js                 # Non-intrusive Shadow-DOM progress notifications
│   ├── background/service-worker.js # Sole API key reader, SSRF guard, MP4->M4A extraction & queue
│   ├── popup/popup.js               # Toolbar quick-setup, 1-click key test & manual trigger
│   ├── options/options.js           # Reorderable 12-provider queue, preferences & export vault
│   ├── ui/brand-icon.js             # Geometric SVG brand mark builder
│   └── lib/
│       ├── batchexecute.js          # Pure parser for f.req & wrb.fr frames + FIFE URL variants
│       ├── audio-extract.js         # Pure-JS ISO-BMFF MP4->M4A remuxer & 16kHz WAV chunker
│       ├── subtitles.js             # SRT/VTT parser/formatter, word/segment reflow & binary search
│       ├── decide.js                # Pure decision gate (dedup, triggers, regex exclusions)
│       ├── storage.js               # chrome.storage.local wrapper & 35-item LRU subtitle cache
│       └── providers/               # 12 BYOK STT adapters + automatic priority failover queue
├── tests/                           # 25 automated unit, security-audit & E2E tests (node --test)
├── docs/                            # Static landing page + interactive simulator (Vercel outputDir)
│   ├── index.html / styles.css / site.js
│   ├── privacy-policy.html / PRIVACY_POLICY.md
│   ├── discovery-report.md / CHROME_WEB_STORE_GUIDE.md
│   ├── assets/                      # architecture.svg, flat badges, banner & 1280x800 screenshots
│   └── releases/                    # Prebuilt notebooklm-subtitles-v0.1.1.zip
├── scripts/
│   ├── generate-assets.mjs          # Deterministic @resvg/resvg-js asset & screenshot renderer
│   └── package-zip.mjs              # Pure-Node zlib ZIP bundler
├── build.mjs                        # Multi-target esbuild compiler
├── serve-docs.mjs                   # Local preview server for docs/
└── vercel.json                      # Zero-config Vercel static deployment config
```

---

## Development & Testing

| Command | Description |
| :--- | :--- |
| `npm run build` | Bundles all 5 MV3 entrypoints (`background`, `page`, `content`, `popup`, `options`) into `extension/`. |
| `npm test` | Runs all 25 automated tests across `tests/*.test.js` using Node's built-in test runner (`node --test`). |
| `npm run assets` | Regenerates extension icons, SVG badges, `architecture.svg`, social banner, and `1280x800` screenshots. |
| `npm run zip` | Builds `extension/` and packages `docs/releases/notebooklm-subtitles-v0.1.1.zip`. |
| `npm run site` | Serves the static landing page & interactive simulator (`docs/`) locally on `http://0.0.0.0:4173`. |

---

## Deploying the Landing Page to Vercel

This repository includes a root [`vercel.json`](vercel.json) configured with `"outputDirectory": "docs"` and zero build-step overhead:

1. Import `sarang-cmd/notebooklm-subtitles` on [Vercel](https://vercel.com/new).
2. Click **Deploy** — Vercel serves `docs/index.html`, the interactive pipeline simulator, `privacy-policy.html`, and the downloadable `.zip` archive out of the box.

---

## Updating Selectors or RPC IDs

Every NotebookLM hostname, `batchexecute` RPC ID (`R7cb6c`, `gArtLc`), artifact array index, and DOM selector is centralized in **[`src/config/selectors.js`](src/config/selectors.js)** and documented in **[`docs/discovery-report.md`](docs/discovery-report.md)**. Users can also override `CREATE_STUDIO` and `POLL_STUDIO` RPC IDs at runtime in **Settings → Section 4** without rebuilding.

---

## Privacy & License

- **Zero Telemetry**: No analytics, tracking pixels, remote code, or developer servers. Read the full [Privacy Policy](docs/PRIVACY_POLICY.md).
- **Disclaimer**: Independent open-source project; not affiliated with or endorsed by Google LLC.
- **License**: [MIT](LICENSE)

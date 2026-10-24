# Discovery & Wire Protocol Report — Google NotebookLM Video Overviews

This document records the exact network endpoints, protobuf-JSON (`wrb.fr`) wire positions, Google FIFE media URL variants, and DOM selectors used by **Subtitles for NotebookLM**, along with instructions for updating [`src/config/selectors.js`](../src/config/selectors.js) if Google changes them.

---

## 1. Hostnames

Google NotebookLM serves identical Wiz / Angular frontends across:

- `https://notebooklm.google.com/*` (Consumer & Edu/Workspace)
- `https://notebook.google.com/*` & `https://notebook.cloud.google.com/*` (Workspace "Gemini Notebook" alias)

---

## 2. `batchexecute` RPC Wire Format

Studio artifact creation and status polling run over:

- `POST /_/LabsTailwindUi/data/batchexecute`
- `POST /_/CloudNotebookLmUi/data/batchexecute`

### Key Studio RPC Method IDs

| Constant | Default ID | Direction | Purpose |
| --- | --- | --- | --- |
| `CREATE_STUDIO` | `R7cb6c` | Request (`f.req`) | Triggered when user clicks **Video Overview** (`params[2][2] === 3`). |
| `POLL_STUDIO` | `gArtLc` | Response (`wrb.fr`) | Lists Studio artifacts in the active notebook along with status & CDN URLs. |

> **Rotation Resilience**: Even if Google rotates `R7cb6c` or `gArtLc` to new 6-character RPC IDs, `parseBatchExecuteResponse()` in [`src/lib/batchexecute.js`](../src/lib/batchexecute.js) includes a structural row detector (`UUID` at `row[0]`, `row[2] === 3`, `row[8]` video metadata array), AND users can hot-patch RPC IDs immediately in **Settings -> Section 4** without rebuilding the extension.

### Studio Artifact Row Layout (`row` inside `gArtLc`)

```text
row[0]  -> artifactId (UUID string, e.g. "33333333-aaaa-4bbb-8ccc-444444444444")
row[1]  -> title (string, e.g. "Distributed Consensus Explained")
row[2]  -> typeCode (number: 1 = Audio Overview, 2 = Report, 3 = Video Overview, ...)
row[3]  -> sourceIds nested array
row[4]  -> statusCode (number: 1 = INITIALIZED, 2 = PROCESSING, 3 = READY, 4 = FAILED)
row[8]  -> explainerVideo metadata array (present when row[2] === 3):
           row[8][1]       -> progressive MP4 URL ("https://lh3.googleusercontent.com/notebooklm/<token>=m22")
           row[8][2][1]    -> BCP-47 / ISO-639-1 language code (e.g. "en")
           row[8][2][2]    -> optional user steering prompt
           row[8][3]       -> download MP4 URL ("https://lh3.googleusercontent.com/notebooklm/<token>=m22-dv")
           row[8][4]       -> media list: [[url, kindCode, mimeType], ...]
                              kindCode: 1 = progressive (=m22), 2 = HLS (=mm,hls), 3 = DASH (=mm,dash), 4 = download (=m22-dv)
           row[8][5]       -> [durationSeconds, durationNanos]
```

---

## 3. Google FIFE Media CDN Variants & SSRF Guard

NotebookLM hosts rendered Video Overviews on authenticated Google FIFE URLs (`https://lh3.googleusercontent.com/notebooklm/<token>=m22`).

- `deriveGoogleMediaVariants()` probes `=m140-dv` (audio-only MP4 itag 140 when available), `=m18` (compact 360p MP4 with full AAC audio), and `=m22-dv` (720p progressive MP4).
- `validateMediaPayload()` verifies non-empty binary media and sniffs the leading bytes to reject `<!DOCTYPE html>` / `<html` sign-in redirects when cookies expire.
- `extractAudioTrackFromMp4()` parses ISO-BMFF boxes (`ftyp`, `moov`, `trak`, `mdia`, `hdlr`, `minf`, `stbl`, `stsc`, `stsz`, `stco`/`co64`) and strips the `vide` track locally in pure JS.

---

## 4. How to Update Selectors If NotebookLM Changes

All hostnames, RPC IDs, array indices, and DOM selectors live in one file: **`src/config/selectors.js`**.

1. Open NotebookLM DevTools -> **Network** -> filter by `batchexecute`.
2. Click **Video Overview** in the Studio panel and inspect the `f.req` payload and `wrb.fr` response lines.
3. Update `BATCHEXECUTE.RPC_IDS` or `ROW_POS` / `VIDEO_META_POS` in `src/config/selectors.js`.
4. Run `npm run build && npm test` to verify all unit and E2E tests pass.

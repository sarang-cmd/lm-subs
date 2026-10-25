#!/usr/bin/env node
/**
 * Deterministically renders all LM Subs v0.2.0 extension icons, rectangular
 * Braun specification badges, 4-plane MV3 + Neon Lakebase architecture diagram,
 * OpenGraph banner, and 4 crisp 1280x800 UI screenshots using `@resvg/resvg-js`.
 *
 * Calibrated to Dieter Rams / Braun industrial specification design (`garden-skills`):
 * Warm off-white `#F4F2ED` / `#FCFBF8`, matte obsidian `#161615`, Signal Orange `#D9531E` / `#E96A26`,
 * sharp `3-4px` corner radii, flat `1px` hairline structure, zero gradients.
 */

import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const FONT_FILES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
].filter((p) => fs.existsSync(p));

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function renderSvgToPng(svgString, outPath, width) {
  const resvg = new Resvg(svgString, {
    fitTo: width ? { mode: "width", value: width } : { mode: "original" },
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: true,
      defaultFontFamily: "DejaVu Sans",
      sansSerifFamily: "DejaVu Sans",
      monospaceFamily: "DejaVu Sans Mono",
    },
  });
  const pngBytes = resvg.render().asPng();
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, pngBytes);
}

function writeText(outPath, content) {
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, content, "utf8");
}

// 1. LM Subs Brand Mark SVG + Extension Icons (16, 32, 48, 128)
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="16" fill="#161615"/>
  <rect x="2" y="2" width="124" height="124" rx="14" stroke="#2E2D2A" stroke-width="2"/>
  <path d="M50 32L82 51L50 70V32Z" fill="#F4F2ED"/>
  <rect x="22" y="86" width="50" height="10" rx="3" fill="#E96A26"/>
  <rect x="80" y="86" width="26" height="10" rx="3" fill="#F4F2ED"/>
  <rect x="22" y="102" width="64" height="8" rx="3" fill="#8C8980"/>
</svg>
`;

writeText("docs/assets/logo.svg", LOGO_SVG);
for (const size of [16, 32, 48, 128]) {
  renderSvgToPng(LOGO_SVG, `extension/icons/icon${size}.png`, size);
}

// 2. Crisp Rectangular Specification Badges (2px radius, Braun palette)
function makeBadge(left, right, rightColor = "#D9531E") {
  const leftW = Math.round(left.length * 6.9 + 18);
  const rightW = Math.round(right.length * 6.9 + 18);
  const totalW = leftW + rightW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${left}: ${right}">
  <rect width="${totalW}" height="20" rx="2" fill="#161615"/>
  <rect x="${leftW}" width="${rightW}" height="20" rx="2" fill="${rightColor}"/>
  <rect x="${leftW}" width="2" height="20" fill="${rightColor}"/>
  <g fill="#FCFBF8" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700">
    <text x="${(leftW / 2).toFixed(1)}" y="14">${left}</text>
    <text x="${(leftW + rightW / 2).toFixed(1)}" y="14">${right}</text>
  </g>
</svg>
`;
}

writeText("docs/assets/badges/manifest-v3.svg", makeBadge("CHROME", "MANIFEST V3", "#2E2D2A"));
writeText("docs/assets/badges/providers.svg", makeBadge("BYOK QUEUE", "12 STT PROVIDERS", "#D9531E"));
writeText("docs/assets/badges/audio-extract.svg", makeBadge("LATENCY", "~3.2S =M140 / HTTP 206", "#1B6E38"));
writeText("docs/assets/badges/neon-sync.svg", makeBadge("NEON SYNC", "AES-256-GCM POSTGRES", "#1B6E38"));
writeText("docs/assets/badges/tests.svg", makeBadge("TESTS", "40 / 40 PASSING", "#1B6E38"));
writeText("docs/assets/badges/telemetry.svg", makeBadge("TELEMETRY", "ZERO", "#45433E"));
writeText("docs/assets/badges/license.svg", makeBadge("LICENSE", "MIT", "#45433E"));

// 3. 4-Plane MV3 + Neon Lakebase Architecture Diagram (`docs/assets/architecture.svg`)
const ARCHITECTURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="460" viewBox="0 0 1120 460" fill="none" role="img" aria-label="LM Subs MV3 + Neon Lakebase Postgres Architecture Diagram">
  <style>
    .bg { fill: #F4F2ED; }
    .lane { fill: #FCFBF8; stroke: #D5D1C8; stroke-width: 1.5; }
    .box { fill: #F4F2ED; stroke: #B6B0A3; stroke-width: 1; }
    .box-hi { fill: #FCFBF8; stroke: #D9531E; stroke-width: 1.5; }
    .box-db { fill: #E3F1E7; stroke: #1B6E38; stroke-width: 1.5; }
    .hdr { font-family: DejaVu Sans Mono, monospace; font-size: 10.5px; font-weight: 700; fill: #D9531E; }
    .title { font-family: DejaVu Sans, sans-serif; font-size: 12.5px; font-weight: 700; fill: #161615; }
    .sub { font-family: DejaVu Sans Mono, monospace; font-size: 10px; fill: #5C5A55; }
    .lbl { font-family: DejaVu Sans Mono, monospace; font-size: 9.5px; font-weight: 700; fill: #161615; }
    .arrow { stroke: #D9531E; stroke-width: 1.5; fill: none; }
    .arrow-db { stroke: #1B6E38; stroke-width: 1.5; fill: none; }
  </style>
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#D9531E"/>
    </marker>
    <marker id="ahg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1B6E38"/>
    </marker>
  </defs>

  <rect width="1120" height="460" rx="4" class="bg"/>
  <rect x="1" y="1" width="1118" height="458" rx="4" stroke="#D5D1C8" stroke-width="1.5"/>

  <!-- Lane 01: MAIN World -->
  <rect x="20" y="20" width="252" height="420" rx="4" class="lane"/>
  <text x="34" y="42" class="hdr">01 · PAGE MAIN WORLD (page.js)</text>
  <text x="34" y="57" class="sub">Zero storage or secret access</text>

  <rect x="34" y="76" width="224" height="104" rx="3" class="box"/>
  <text x="46" y="98" class="title">SSR + RPC Stream Observer</text>
  <text x="46" y="117" class="sub">AF_initDataCallback + gArtLc</text>
  <text x="46" y="134" class="sub">Captures FIFE =m140 / =m22 URL</text>
  <text x="46" y="151" class="sub">notebook &amp; notebooklm.google</text>

  <rect x="34" y="202" width="224" height="96" rx="3" class="box"/>
  <text x="46" y="224" class="title">In-Memory Blob Extractor</text>
  <text x="46" y="243" class="sub">Hooks URL.createObjectURL</text>
  <text x="46" y="260" class="sub">Stages blob: audio chunks</text>
  <text x="46" y="277" class="sub">Zero cross-origin stalls</text>

  <rect x="34" y="320" width="224" height="98" rx="3" class="box"/>
  <text x="46" y="342" class="title">Studio &lt;video&gt; Element</text>
  <text x="46" y="361" class="sub">Lot dialog + Fullscreen</text>
  <text x="46" y="378" class="sub">Native VTTCue PiP track</text>

  <!-- Lane 02: ISOLATED World -->
  <rect x="292" y="20" width="252" height="420" rx="4" class="lane"/>
  <text x="306" y="42" class="hdr">02 · ISOLATED WORLD (content.js)</text>
  <text x="306" y="57" class="sub">document_start · Closed Shadow DOM</text>

  <rect x="306" y="76" width="224" height="112" rx="3" class="box"/>
  <text x="318" y="98" class="title">Decision Gate (decide.js)</text>
  <text x="318" y="117" class="sub">0 ms local LRU lookup</text>
  <text x="318" y="134" class="sub">Shadow-DOM &lt;video&gt; scanner</text>
  <text x="318" y="151" class="sub">Progressive live cue mount</text>
  <text x="318" y="168" class="sub">Keepalive port for long talks</text>

  <rect x="306" y="214" width="224" height="204" rx="3" class="box-hi"/>
  <text x="318" y="238" class="title">Broadcast Caption HUD</text>
  <text x="318" y="258" class="sub">Closed ShadowRoot isolation</text>
  <text x="318" y="276" class="sub">O(log N) binary-search sync</text>
  <text x="318" y="294" class="sub">[CC] [A-/A+] [+-0.25s] HUD</text>
  <text x="318" y="312" class="sub">1-click .SRT &amp; .VTT export</text>
  <text x="318" y="330" class="sub">External .SRT/.VTT import</text>
  <text x="318" y="348" class="sub">Live Debug Monitor drawer</text>

  <!-- Lane 03: Service Worker -->
  <rect x="564" y="20" width="262" height="420" rx="4" class="lane"/>
  <text x="578" y="42" class="hdr">03 · SERVICE WORKER (background.js)</text>
  <text x="578" y="57" class="sub">Sole reader of keys &amp; sync tokens</text>

  <rect x="578" y="76" width="234" height="116" rx="3" class="box-hi"/>
  <text x="590" y="98" class="title">Sub-5s Audio Fast-Path</text>
  <text x="590" y="117" class="sub">1. Direct =m140 AAC (~4 MB)</text>
  <text x="590" y="134" class="sub">2. HTTP 206 Range soun slices</text>
  <text x="590" y="151" class="sub">3. Pure-JS ISO-BMFF remuxer</text>
  <text x="590" y="168" class="sub">Skips 120 MB video &amp; WAV IPC</text>

  <rect x="578" y="210" width="234" height="114" rx="3" class="box-hi"/>
  <text x="590" y="232" class="title">12-Provider Parallel STT</text>
  <text x="590" y="251" class="sub">01 Groq -&gt; 02 Mistral -&gt; 03 Gemini</text>
  <text x="590" y="268" class="sub">Segment-only timestamps (no DTW)</text>
  <text x="590" y="285" class="sub">3x concurrent chunk workers</text>
  <text x="590" y="302" class="sub">Auto-failover on HTTP 429 / 5xx</text>

  <rect x="578" y="342" width="234" height="76" rx="3" class="box"/>
  <text x="590" y="364" class="title">Isolated Local Storage</text>
  <text x="590" y="382" class="sub">Popup/Options read booleans only</text>
  <text x="590" y="399" class="sub">Strict secret redaction on logs</text>

  <!-- Lane 04: Neon Lakebase Cloud Sync -->
  <rect x="846" y="20" width="254" height="420" rx="4" class="lane"/>
  <text x="860" y="42" class="hdr" style="fill:#1B6E38">04 · NEON LAKEBASE POSTGRES</text>
  <text x="860" y="57" class="sub">falling-cherry-16443194 · Auth</text>

  <rect x="860" y="76" width="226" height="106" rx="3" class="box-db"/>
  <text x="872" y="98" class="title">Neon Auth &amp; Sessions</text>
  <text x="872" y="117" class="sub">NEON_AUTH_JWKS_URL EdDSA JWT</text>
  <text x="872" y="134" class="sub">+ scrypt account signup/signin</text>
  <text x="872" y="151" class="sub">SHA-256 hashed lms_ tokens</text>

  <rect x="860" y="202" width="226" height="114" rx="3" class="box-db"/>
  <text x="872" y="224" class="title">AES-256-GCM Key Vault</text>
  <text x="872" y="243" class="sub">Per-user HKDF-SHA256 key</text>
  <text x="872" y="260" class="sub">96-bit IV + 128-bit GCM tag</text>
  <text x="872" y="277" class="sub">AAD bound to user_id</text>
  <text x="872" y="294" class="sub">UI sees masked hints only</text>

  <rect x="860" y="336" width="226" height="82" rx="3" class="box"/>
  <text x="872" y="358" class="title">Cross-Device Transcripts</text>
  <text x="872" y="376" class="sub">lmsubs_subtitles + settings</text>
  <text x="872" y="393" class="sub">50 ms cloud cache hit</text>

  <!-- Connectors -->
  <path d="M 258 128 L 303 128" class="arrow" marker-end="url(#ah)"/>
  <path d="M 530 132 L 575 132" class="arrow" marker-end="url(#ah)"/>
  <path d="M 695 192 L 695 207" class="arrow" marker-end="url(#ah)"/>
  <path d="M 578 272 L 533 272" class="arrow" marker-end="url(#ah)"/>
  <path d="M 306 355 L 261 355" class="arrow" marker-end="url(#ah)"/>
  <path d="M 812 135 L 857 135" class="arrow-db" marker-end="url(#ahg)"/>
  <path d="M 857 258 L 812 258" class="arrow-db" marker-end="url(#ahg)"/>
</svg>
`;
writeText("docs/assets/architecture.svg", ARCHITECTURE_SVG);

// 4. OpenGraph Social Specification Plate (`1280x640`)
const BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
  <rect width="1280" height="640" fill="#F4F2ED"/>
  <rect x="32" y="32" width="1216" height="576" rx="4" fill="#FCFBF8" stroke="#D5D1C8" stroke-width="1.5"/>

  <g transform="translate(80, 82)">
    <rect width="54" height="54" rx="6" fill="#161615"/>
    <path d="M21 13.5L35 21.5L21 29.5V13.5Z" fill="#F4F2ED"/>
    <rect x="9.5" y="36" width="21" height="4.5" rx="1.2" fill="#E96A26"/>
    <rect x="34" y="36" width="11" height="4.5" rx="1.2" fill="#F4F2ED"/>
    <rect x="9.5" y="43" width="27" height="3.5" rx="1.2" fill="#8C8980"/>

    <text x="72" y="25" font-family="DejaVu Sans Mono, monospace" font-size="13" font-weight="700" fill="#D9531E">CHROME MV3 · NEON LAKEBASE POSTGRES</text>
    <text x="72" y="47" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#5C5A55">VERSION 0.2.0 · MIT OPEN SOURCE</text>

    <text x="0" y="128" font-family="DejaVu Sans, sans-serif" font-size="54" font-weight="700" fill="#161615">LM Subs</text>
    <text x="0" y="172" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#5C5A55">Sub-5-second synchronized captions, .SRT/.VTT export,</text>
    <text x="0" y="199" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#5C5A55">and encrypted API-key sync for Google NotebookLM.</text>

    <!-- 2x2 Specification Ledger -->
    <g transform="translate(0, 248)">
      <rect width="516" height="196" rx="4" fill="#FCFBF8" stroke="#D5D1C8" stroke-width="1.5"/>
      <line x1="258" y1="0" x2="258" y2="196" stroke="#D5D1C8"/>
      <line x1="0" y1="98" x2="516" y2="98" stroke="#D5D1C8"/>

      <text x="18" y="42" font-family="DejaVu Sans Mono, monospace" font-size="25" font-weight="700" fill="#161615">~3.2s</text>
      <text x="18" y="68" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#5C5A55">=m140 direct audio + segment STT</text>

      <text x="276" y="42" font-family="DejaVu Sans Mono, monospace" font-size="25" font-weight="700" fill="#161615">-93.4%</text>
      <text x="276" y="68" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#5C5A55">HTTP 206 Range audio extraction</text>

      <text x="18" y="140" font-family="DejaVu Sans Mono, monospace" font-size="25" font-weight="700" fill="#161615">12 BYOK</text>
      <text x="18" y="166" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#5C5A55">Groq + Mistral priority failover</text>

      <text x="276" y="140" font-family="DejaVu Sans Mono, monospace" font-size="25" font-weight="700" fill="#1B6E38">AES-256</text>
      <text x="276" y="166" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#5C5A55">Encrypted Neon Postgres key sync</text>
    </g>
  </g>

  <!-- Right Broadcast Monitor Preview -->
  <g transform="translate(642, 82)">
    <rect width="546" height="472" rx="4" fill="#141413" stroke="#2E2D2A" stroke-width="1.5"/>
    <rect width="546" height="38" rx="4" fill="#1D1D1B"/>
    <line x1="0" y1="38" x2="546" y2="38" stroke="#2E2D2A"/>
    <text x="16" y="23" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9E9B93">MONITOR · STUDIO VIDEO OVERVIEW</text>

    <g transform="translate(310, 7)">
      <rect width="34" height="24" rx="2" fill="#E96A26"/>
      <text x="17" y="16" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#FFFFFF">CC</text>
      <text x="54" y="16" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#DFDDD6">A-</text>
      <text x="80" y="16" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#DFDDD6">A+</text>
      <text x="122" y="16" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9E9B93">0.00s</text>
      <text x="172" y="16" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#4ADE80">.SRT</text>
      <text x="210" y="16" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#DFDDD6">.VTT</text>
    </g>

    <text x="36" y="96" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#E96A26">02 · LOG REPLICATION &amp; COMMIT</text>
    <text x="36" y="132" font-family="DejaVu Sans, sans-serif" font-size="25" font-weight="700" fill="#F4F2ED">Distributed Consensus &amp; Raft</text>
    <text x="36" y="162" font-family="DejaVu Sans, sans-serif" font-size="14" fill="#9E9B93">Term-numbered heartbeats guarantee a single leader per quorum.</text>

    <rect x="36" y="192" width="224" height="72" rx="3" fill="#1D1D1B" stroke="#2E2D2A"/>
    <text x="52" y="218" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9E9B93">FAST-PATH AUDIO STREAM</text>
    <text x="52" y="244" font-family="DejaVu Sans Mono, monospace" font-size="14" font-weight="700" fill="#4ADE80">4.1 MB =m140 · 0 ms IPC</text>

    <rect x="278" y="192" width="232" height="72" rx="3" fill="#1D1D1B" stroke="#2E2D2A"/>
    <text x="294" y="218" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9E9B93">NEON POSTGRES VAULT</text>
    <text x="294" y="244" font-family="DejaVu Sans Mono, monospace" font-size="14" font-weight="700" fill="#F4F2ED">Synced · 64 Cues</text>

    <!-- Caption box -->
    <rect x="48" y="336" width="450" height="62" rx="3" fill="#0B0B0A" stroke="#2E2D2A"/>
    <text x="273" y="362" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="15.5" font-weight="600" fill="#FAF9F6">Once a majority of followers append the entry,</text>
    <text x="273" y="385" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="15.5" font-weight="600" fill="#FAF9F6">the leader marks it committed safely.</text>

    <rect x="28" y="432" width="490" height="4" rx="1" fill="#2E2D2A"/>
    <rect x="28" y="432" width="226" height="4" rx="1" fill="#E96A26"/>
    <rect x="250" y="428" width="6" height="12" rx="1" fill="#FAF9F6"/>
  </g>
</svg>
`;
renderSvgToPng(BANNER_SVG, "docs/assets/banner-social-1280x640.png", 1280);

// 5. Four Redesigned 1280x800 Screenshots (`docs/assets/screenshots/` + `store-assets/`)

// Screenshot 01: Live In-Player Broadcast HUD on `notebook.google.com`
const SCREENSHOT_1_PLAYER = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#EAE7E0"/>
  <rect x="36" y="28" width="1208" height="744" rx="4" fill="#FCFBF8" stroke="#B6B0A3" stroke-width="1.5"/>
  <rect x="36" y="28" width="1208" height="42" rx="4" fill="#F4F2ED"/>
  <line x1="36" y1="70" x2="1244" y2="70" stroke="#D5D1C8"/>
  <rect x="56" y="44" width="10" height="10" rx="1.5" fill="#B6B0A3"/>
  <rect x="74" y="44" width="10" height="10" rx="1.5" fill="#B6B0A3"/>
  <rect x="92" y="44" width="10" height="10" rx="1.5" fill="#B6B0A3"/>
  <rect x="124" y="37" width="540" height="24" rx="3" fill="#FCFBF8" stroke="#D5D1C8"/>
  <text x="138" y="53" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#5C5A55">https://notebook.google.com/notebook/8f4c2a1e-raft-consensus</text>

  <text x="68" y="108" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="700" fill="#161615">Distributed Systems Reading Group</text>
  <text x="68" y="127" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#5C5A55">NOTEBOOKLM STUDIO · VIDEO OVERVIEW DIALOG</text>

  <!-- Main Video Overview Player -->
  <g transform="translate(68, 148)">
    <rect width="836" height="532" rx="4" fill="#141413" stroke="#2E2D2A" stroke-width="1.5"/>

    <!-- Top-right LM Subs Broadcast Control Bar -->
    <g transform="translate(298, 16)">
      <rect width="522" height="32" rx="4" fill="#1D1D1B" stroke="#3A3833"/>
      <rect x="5" y="4" width="38" height="24" rx="2" fill="#E96A26"/>
      <text x="24" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#FFFFFF">CC</text>
      <line x1="50" y1="8" x2="50" y2="24" stroke="#3A3833"/>
      <text x="68" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#E6E4DE">A-</text>
      <text x="96" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#E6E4DE">A+</text>
      <line x1="114" y1="8" x2="114" y2="24" stroke="#3A3833"/>
      <text x="142" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#D6D3CB">-0.25s</text>
      <text x="190" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9E9B93">0.00s</text>
      <text x="240" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#D6D3CB">+0.25s</text>
      <line x1="270" y1="8" x2="270" y2="24" stroke="#3A3833"/>
      <text x="294" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#4ADE80">.SRT</text>
      <text x="330" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#E6E4DE">.VTT</text>
      <text x="366" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#E6E4DE">.TXT</text>
      <text x="404" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#D6D3CB">Copy</text>
      <text x="448" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#D6D3CB">Import</text>
      <text x="494" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9E9B93">Regen</text>
    </g>

    <!-- Slide visual -->
    <rect x="64" y="72" width="708" height="312" rx="4" fill="#1B1B19" stroke="#2E2D2A"/>
    <text x="98" y="118" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#E96A26">02 · LOG REPLICATION &amp; COMMIT SAFETY</text>
    <text x="98" y="158" font-family="DejaVu Sans, sans-serif" font-size="28" font-weight="700" fill="#F4F2ED">How Raft Commits Entries Safely</text>
    <text x="98" y="192" font-family="DejaVu Sans, sans-serif" font-size="14.5" fill="#9E9B93">AppendEntries RPCs replicate log entries from the elected leader to a majority</text>
    <text x="98" y="214" font-family="DejaVu Sans, sans-serif" font-size="14.5" fill="#9E9B93">quorum of followers before advancing the state machine commit index.</text>

    <g transform="translate(98, 250)">
      <rect width="196" height="84" rx="3" fill="#141413" stroke="#2E2D2A"/>
      <text x="16" y="28" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9E9B93">NODE S1 · LEADER</text>
      <text x="16" y="56" font-family="DejaVu Sans Mono, monospace" font-size="15" font-weight="700" fill="#F4F2ED">Index 42 · Term 3</text>

      <rect x="214" width="196" height="84" rx="3" fill="#141413" stroke="#2E2D2A"/>
      <text x="230" y="28" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9E9B93">NODE S2 · FOLLOWER</text>
      <text x="230" y="56" font-family="DejaVu Sans Mono, monospace" font-size="15" font-weight="700" fill="#4ADE80">ACK · Quorum 2/3</text>

      <rect x="428" width="196" height="84" rx="3" fill="#141413" stroke="#2E2D2A"/>
      <text x="444" y="28" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9E9B93">COMMIT STATE</text>
      <text x="444" y="56" font-family="DejaVu Sans Mono, monospace" font-size="15" font-weight="700" fill="#F4F2ED">Applied to FSM</text>
    </g>

    <!-- Synchronized Shadow-DOM Caption Box -->
    <rect x="138" y="408" width="560" height="62" rx="4" fill="#0E0E0D" stroke="#2E2D2A"/>
    <text x="418" y="434" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="17.5" font-weight="600" fill="#FAF9F6">Once a majority of followers append the entry,</text>
    <text x="418" y="458" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="17.5" font-weight="600" fill="#FAF9F6">the leader marks it committed and applies it safely.</text>

    <!-- Video timeline -->
    <rect x="28" y="496" width="780" height="4" rx="1" fill="#2E2D2A"/>
    <rect x="28" y="496" width="348" height="4" rx="1" fill="#E96A26"/>
    <rect x="373" y="491" width="6" height="14" rx="1" fill="#FAF9F6"/>
    <text x="28" y="518" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9E9B93">01:24 / 03:08</text>
  </g>

  <!-- Right Studio Ledger -->
  <g transform="translate(924, 148)">
    <rect width="288" height="532" rx="4" fill="#F4F2ED" stroke="#D5D1C8"/>
    <text x="18" y="30" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#5C5A55">STUDIO ARTIFACTS</text>

    <rect x="14" y="46" width="260" height="84" rx="3" fill="#FCFBF8" stroke="#D9531E" stroke-width="1.5"/>
    <text x="28" y="70" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#161615">Raft Consensus Overview</text>
    <text x="28" y="90" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700" fill="#1B6E38">64 CUES · 3.1S · GROQ TURBO</text>
    <text x="28" y="109" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#5C5A55">4.1 MB =m140 · Synced to Neon</text>

    <rect x="14" y="142" width="260" height="64" rx="3" fill="#FCFBF8" stroke="#D5D1C8"/>
    <text x="28" y="166" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="600" fill="#161615">Audio Deep Dive</text>
    <text x="28" y="186" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#5C5A55">AUDIO OVERVIEW · 11M 40S</text>
  </g>

  <!-- Bottom-right Shadow-DOM Status Toast -->
  <g transform="translate(882, 700)">
    <rect width="330" height="52" rx="4" fill="#161615" stroke="#2E2D2A"/>
    <rect x="16" y="22" width="7" height="7" rx="1.5" fill="#22C55E"/>
    <text x="32" y="23" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#F4F2ED">Subtitles ready (64 cues · 3.1s)</text>
    <text x="32" y="40" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9E9B93">groq · 4.1 MB audio · synced to Postgres</text>
  </g>
</svg>
`;

// Screenshot 02: Sub-5-Second Fast-Path & HTTP 206 Range Pipeline
const SCREENSHOT_2_FAILOVER = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#F4F2ED"/>
  <text x="72" y="64" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="700" fill="#D9531E">LM SUBS V0.2.0 · LATENCY ARCHITECTURE</text>
  <text x="72" y="98" font-family="DejaVu Sans, sans-serif" font-size="30" font-weight="700" fill="#161615">From 5 Minutes Down to ~3.2 Seconds</text>
  <text x="72" y="126" font-family="DejaVu Sans, sans-serif" font-size="15" fill="#5C5A55">Eliminates full-HD video downloads, uncompressed WAV IPC inflation, and DTW word-timestamp bottlenecks.</text>

  <!-- 3-Column Structural Ledger -->
  <g transform="translate(72, 160)">
    <rect width="1136" height="572" rx="4" fill="#FCFBF8" stroke="#D5D1C8" stroke-width="1.5"/>
    <line x1="378" y1="0" x2="378" y2="572" stroke="#D5D1C8"/>
    <line x1="757" y1="0" x2="757" y2="572" stroke="#D5D1C8"/>

    <!-- Stage 01 -->
    <g transform="translate(28, 30)">
      <rect width="84" height="22" rx="2" fill="#EAE7E0" stroke="#D5D1C8"/>
      <text x="42" y="15" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700" fill="#D9531E">STAGE 01</text>
      <text x="0" y="58" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#161615">Direct =m140 &amp; Range</text>
      <text x="0" y="84" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#5C5A55">Probes 4 MB pure-audio FIFE endpoints</text>
      <text x="0" y="103" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#5C5A55">first; falls back to HTTP 206 Range.</text>

      <rect x="0" y="132" width="322" height="168" rx="3" fill="#141413"/>
      <text x="16" y="160" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#4ADE80">1. =m140 / =m140-dv (4.1 MB AAC)</text>
      <text x="16" y="184" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#E8E6DF">   0 ms fast-path (no WAV IPC!)</text>
      <text x="16" y="214" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#E96A26">2. If =m22 HD MP4 (118 MB):</text>
      <text x="16" y="236" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#E8E6DF">   Abort full body -&gt; HTTP 206</text>
      <text x="16" y="258" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#4ADE80">   6x parallel soun byte ranges</text>
      <text x="16" y="280" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9E9B93">   Downloaded: 4.8 MB (-95.9%)</text>

      <rect x="0" y="324" width="322" height="186" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
      <text x="16" y="352" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#161615">BANDWIDTH COMPARISON</text>
      <text x="16" y="382" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#5C5A55">Full =m22 MP4: 118.0 MB</text>
      <rect x="16" y="392" width="286" height="16" rx="2" fill="#D5D1C8"/>
      <text x="16" y="436" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#1B6E38">LM Subs Audio:   4.1 MB</text>
      <rect x="16" y="446" width="14" height="16" rx="2" fill="#1B6E38"/>
    </g>

    <!-- Stage 02 -->
    <g transform="translate(406, 30)">
      <rect width="84" height="22" rx="2" fill="#EAE7E0" stroke="#D5D1C8"/>
      <text x="42" y="15" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700" fill="#D9531E">STAGE 02</text>
      <text x="0" y="58" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#161615">Segment STT + Failover</text>
      <text x="0" y="84" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#5C5A55">Drops slow DTW word alignment; runs</text>
      <text x="0" y="103" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#5C5A55">3x parallel chunks with live captions.</text>

      <rect x="0" y="132" width="322" height="76" rx="3" fill="#F9ECDB" stroke="#E5C59C"/>
      <text x="16" y="158" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#9A4A06">01 · Groq (whisper-large-v3-turbo)</text>
      <text x="16" y="182" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9A4A06">HTTP 429 RPM limit -&gt; instant failover</text>

      <rect x="0" y="220" width="322" height="80" rx="3" fill="#E3F1E7" stroke="#B6DEC2"/>
      <text x="16" y="246" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#1B6E38">02 · Mistral (voxtral-mini-transcribe-3)</text>
      <text x="16" y="270" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#1B6E38">HTTP 200 OK · 64 segment cues in 1.9s</text>

      <rect x="0" y="324" width="322" height="186" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
      <text x="16" y="352" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#161615">PROGRESSIVE LIVE CUES</text>
      <text x="16" y="380" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#5C5A55">• Segment-level timestamps (~200x RT)</text>
      <text x="16" y="404" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#5C5A55">• 3x concurrent chunk upload workers</text>
      <text x="16" y="428" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#5C5A55">• SUBTITLES_PARTIAL mounts chunk 1</text>
      <text x="16" y="452" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#5C5A55">  while remaining chunks finish</text>
    </g>

    <!-- Stage 03 -->
    <g transform="translate(785, 30)">
      <rect width="84" height="22" rx="2" fill="#E3F1E7" stroke="#B6DEC2"/>
      <text x="42" y="15" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700" fill="#1B6E38">STAGE 03</text>
      <text x="0" y="58" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#161615">Neon Postgres Sync</text>
      <text x="0" y="84" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#5C5A55">Encrypts API keys per user and syncs</text>
      <text x="0" y="103" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#5C5A55">settings + subtitles across browsers.</text>

      <rect x="0" y="132" width="322" height="168" rx="3" fill="#141413"/>
      <text x="16" y="160" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#4ADE80">PROJECT: falling-cherry-16443194</text>
      <text x="16" y="186" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#E8E6DF">• lmsubs_users (scrypt + Neon Auth)</text>
      <text x="16" y="210" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#E8E6DF">• lmsubs_user_api_keys (AES-256-GCM)</text>
      <text x="16" y="234" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#E8E6DF">• lmsubs_user_settings (JSONB)</text>
      <text x="16" y="258" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#4ADE80">• lmsubs_subtitles (50 ms hit!)</text>

      <rect x="0" y="324" width="322" height="186" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
      <text x="16" y="352" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#161615">ZERO-TRUST KEY ISOLATION</text>
      <text x="16" y="380" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#5C5A55">• HKDF-SHA256 per-user derived key</text>
      <text x="16" y="404" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#5C5A55">• Authenticated AAD = user_id</text>
      <text x="16" y="428" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#5C5A55">• Web UI sees masked hints only</text>
      <text x="16" y="452" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#5C5A55">  (gsk_••••9xQ2)</text>
    </g>
  </g>
</svg>
`;

// Screenshot 03: Redesigned 384px Toolbar Control Unit (`popup.html`)
const SCREENSHOT_3_POPUP = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#EAE7E0"/>
  <rect x="56" y="40" width="1168" height="720" rx="4" fill="#FCFBF8" stroke="#D5D1C8"/>
  <rect x="56" y="40" width="1168" height="44" rx="4" fill="#F4F2ED"/>
  <line x1="56" y1="84" x2="1224" y2="84" stroke="#D5D1C8"/>
  <text x="84" y="67" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="700" fill="#5C5A55">NOTEBOOK.GOOGLE.COM · TOOLBAR POPUP</text>

  <!-- Centered 384px Braun Control Unit -->
  <g transform="translate(436, 56)">
    <rect width="408" height="694" rx="4" fill="#F4F2ED" stroke="#B6B0A3" stroke-width="1.5"/>

    <!-- Header -->
    <g transform="translate(16, 16)">
      <rect width="32" height="32" rx="4" fill="#161615"/>
      <path d="M12.5 8L20.5 12.75L12.5 17.5V8Z" fill="#F4F2ED"/>
      <rect x="5.5" y="21.5" width="12.5" height="2.5" rx="0.75" fill="#E96A26"/>
      <rect x="20" y="21.5" width="6.5" height="2.5" rx="0.75" fill="#F4F2ED"/>
      <text x="44" y="15" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" fill="#161615">LM Subs</text>
      <text x="44" y="30" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#5C5A55">NOTEBOOKLM CAPTIONS · V0.2.0</text>

      <text x="304" y="21" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#5C5A55">AUTO</text>
      <rect x="340" y="9" width="36" height="18" rx="2" fill="#D9531E"/>
      <rect x="360" y="12" width="13" height="12" rx="1" fill="#FFFFFF"/>
    </g>
    <line x1="16" y1="60" x2="392" y2="60" stroke="#D5D1C8"/>

    <!-- Queue Strip -->
    <g transform="translate(16, 70)">
      <rect width="376" height="32" rx="3" fill="#EAE7E0" stroke="#D5D1C8"/>
      <text x="10" y="20" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#5C5A55">QUEUE: <tspan font-weight="700" fill="#161615">#1 Groq -&gt; #2 Mistral</tspan></text>
      <rect x="316" y="5" width="52" height="22" rx="2" fill="#FCFBF8" stroke="#B6B0A3"/>
      <text x="342" y="19" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#161615">Order</text>
    </g>

    <!-- Panel 01: STT Provider -->
    <g transform="translate(16, 112)">
      <rect width="376" height="202" rx="4" fill="#FCFBF8" stroke="#D5D1C8"/>
      <text x="12" y="24" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#161615">01 · STT Provider</text>
      <rect x="308" y="10" width="56" height="18" rx="2" fill="#E3F1E7" stroke="#B6DEC2"/>
      <text x="336" y="22" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" font-weight="700" fill="#1B6E38">SAVED</text>

      <rect x="12" y="34" width="352" height="32" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
      <text x="22" y="54" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#161615">Groq — Best Free Tier · 8 hrs/day</text>
      <text x="12" y="84" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#5C5A55">Permanent free plan, no card: 20 RPM, ~200x real-time.</text>

      <text x="12" y="112" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#161615">API Key</text>
      <text x="364" y="112" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="11" text-decoration="underline" fill="#161615">Get free key ↗</text>

      <rect x="12" y="120" width="224" height="32" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
      <text x="22" y="140" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#87847D">gsk_••••••••••••9xQ2</text>

      <rect x="242" y="120" width="60" height="32" rx="3" fill="#D9531E"/>
      <text x="272" y="140" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#FFFFFF">Save</text>

      <rect x="308" y="120" width="56" height="32" rx="3" fill="#FCFBF8" stroke="#B6B0A3"/>
      <text x="336" y="140" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#161615">Test</text>

      <text x="12" y="178" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#1B6E38">Saved &amp; encrypted in Neon Postgres (284 ms).</text>
    </g>

    <!-- Panel 02: Neon Cloud Sync -->
    <g transform="translate(16, 324)">
      <rect width="376" height="96" rx="4" fill="#FCFBF8" stroke="#D5D1C8"/>
      <text x="12" y="23" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#5C5A55">02 · NEON CLOUD SYNC</text>
      <rect x="304" y="9" width="60" height="18" rx="2" fill="#E3F1E7" stroke="#B6DEC2"/>
      <text x="334" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" font-weight="700" fill="#1B6E38">SYNCED</text>

      <text x="12" y="46" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#5C5A55">alex@studio.dev · 2 key(s) · 14 transcript(s)</text>

      <rect x="12" y="58" width="94" height="26" rx="3" fill="#D9531E"/>
      <text x="59" y="75" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF">Sync Now</text>

      <rect x="114" y="58" width="250" height="26" rx="3" fill="#FCFBF8" stroke="#B6B0A3"/>
      <text x="239" y="75" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#161615">Manage Account</text>
    </g>

    <!-- Panel 03: Active Tab + Multi-Format Subtitle Export -->
    <g transform="translate(16, 430)">
      <rect width="376" height="150" rx="4" fill="#FCFBF8" stroke="#D5D1C8"/>
      <text x="12" y="23" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#5C5A55">03 · ACTIVE TAB</text>
      <rect x="296" y="9" width="68" height="18" rx="2" fill="#E3F1E7" stroke="#B6DEC2"/>
      <text x="330" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" font-weight="700" fill="#1B6E38">1 READY</text>

      <text x="12" y="45" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#5C5A55">Video: "Raft Consensus Overview"</text>

      <rect x="12" y="56" width="352" height="30" rx="3" fill="#161615"/>
      <text x="188" y="75" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#FCFBF8">Generate Subtitles</text>

      <line x1="12" y1="96" x2="364" y2="96" stroke="#E0DDD5"/>
      <text x="12" y="112" font-family="DejaVu Sans Mono, monospace" font-size="9.5" font-weight="700" fill="#5C5A55">EXPORT SUBTITLES</text>
      <text x="364" y="112" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="9.5" fill="#5C5A55">64 CUES</text>

      <rect x="12" y="118" width="66" height="24" rx="2.5" fill="#FCFBF8" stroke="#B6B0A3"/>
      <text x="45" y="134" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700" fill="#161615">.SRT</text>
      <rect x="83" y="118" width="66" height="24" rx="2.5" fill="#FCFBF8" stroke="#B6B0A3"/>
      <text x="116" y="134" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700" fill="#161615">.VTT</text>
      <rect x="154" y="118" width="66" height="24" rx="2.5" fill="#FCFBF8" stroke="#B6B0A3"/>
      <text x="187" y="134" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700" fill="#161615">.TXT</text>
      <rect x="225" y="118" width="68" height="24" rx="2.5" fill="#FCFBF8" stroke="#B6B0A3"/>
      <text x="259" y="134" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700" fill="#161615">.JSON</text>
      <rect x="298" y="118" width="66" height="24" rx="2.5" fill="#FCFBF8" stroke="#B6B0A3"/>
      <text x="331" y="134" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700" fill="#161615">Copy</text>
    </g>

    <!-- Latest Output + Footer -->
    <g transform="translate(16, 590)">
      <rect width="376" height="58" rx="4" fill="#FCFBF8" stroke="#D5D1C8"/>
      <text x="12" y="22" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#161615">Raft Consensus Overview</text>
      <text x="12" y="42" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#1B6E38">64 cues · 3.1s · 4.1 MB audio (groq)</text>
    </g>

    <text x="16" y="674" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#5C5A55">DEBUG [OFF]</text>
    <text x="392" y="674" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="700" fill="#161615">REPORT · SETTINGS -&gt;</text>
  </g>
</svg>
`;

// Screenshot 04: Options Workspace (01 Neon Account Sync + 02 12-Provider Queue)
const SCREENSHOT_4_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#F4F2ED"/>
  <g transform="translate(120, 34)">
    <!-- Header -->
    <rect width="36" height="36" rx="4" fill="#161615"/>
    <path d="M14 9L23 14.5L14 20V9Z" fill="#F4F2ED"/>
    <rect x="6" y="24" width="14" height="3" rx="1" fill="#E96A26"/>
    <rect x="22" y="24" width="7" height="3" rx="1" fill="#F4F2ED"/>
    <text x="50" y="18" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="700" fill="#161615">LM Subs</text>
    <text x="50" y="35" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#5C5A55">FAST AUDIO EXTRACTION · 12 BYOK STT PROVIDERS · NEON POSTGRES ENCRYPTED SYNC</text>
    <line x1="0" y1="50" x2="1040" y2="50" stroke="#D5D1C8"/>

    <!-- Section 01: Neon Account & Encrypted Postgres Sync -->
    <g transform="translate(0, 66)">
      <rect width="1040" height="178" rx="4" fill="#FCFBF8" stroke="#D5D1C8"/>
      <text x="22" y="28" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#D9531E">01</text>
      <text x="46" y="28" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#5C5A55">NEON ACCOUNT &amp; ENCRYPTED POSTGRES SYNC</text>

      <rect x="892" y="13" width="126" height="20" rx="2" fill="#E3F1E7" stroke="#B6DEC2"/>
      <text x="955" y="27" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" font-weight="700" fill="#1B6E38">SYNCED · POSTGRES</text>

      <rect x="22" y="46" width="996" height="68" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
      <text x="38" y="72" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#161615">Alex Rivera (alex@studio.dev)</text>
      <text x="38" y="94" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#5C5A55">3 encrypted API key(s) · 14 synced transcript(s) · Project falling-cherry-16443194</text>

      <rect x="802" y="64" width="98" height="32" rx="3" fill="#D9531E"/>
      <text x="851" y="84" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">Sync Now</text>
      <rect x="910" y="64" width="92" height="32" rx="3" fill="#FCFBF8" stroke="#EBB6B1"/>
      <text x="956" y="84" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#B42318">Sign Out</text>

      <!-- Encrypted Key Hint Chips -->
      <g transform="translate(22, 128)">
        <rect width="156" height="26" rx="2" fill="#F4F2ED" stroke="#D5D1C8"/>
        <text x="78" y="17" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#161615">groq: gsk_••••9xQ2</text>

        <rect x="166" width="176" height="26" rx="2" fill="#F4F2ED" stroke="#D5D1C8"/>
        <text x="254" y="17" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#161615">mistral: mst_••••4kP8</text>

        <rect x="352" width="174" height="26" rx="2" fill="#F4F2ED" stroke="#D5D1C8"/>
        <text x="439" y="17" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#161615">gemini: AIza••••7mW1</text>
      </g>
    </g>

    <!-- Section 02: 12-Provider Priority Queue -->
    <g transform="translate(0, 260)">
      <rect width="1040" height="466" rx="4" fill="#FCFBF8" stroke="#D5D1C8"/>
      <text x="22" y="28" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#D9531E">02</text>
      <text x="46" y="28" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#5C5A55">BYOK PROVIDER PRIORITY QUEUE &amp; API KEYS</text>
      <text x="1018" y="28" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#5C5A55">RUNS TOP-TO-BOTTOM · HTTP 429 AUTO-FAILOVER</text>

      <rect x="22" y="44" width="996" height="398" rx="3" fill="#FCFBF8" stroke="#D5D1C8"/>

      <!-- Row 01 -->
      <g transform="translate(22, 44)">
        <text x="18" y="28" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#161615">[01]</text>
        <text x="58" y="28" font-family="DejaVu Sans, sans-serif" font-size="14" font-weight="700" fill="#161615">Groq</text>
        <rect x="108" y="13" width="164" height="20" rx="2" fill="#EAE7E0" stroke="#D5D1C8"/>
        <text x="190" y="27" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" font-weight="700" fill="#5C5A55">BEST FREE TIER · 8H/DAY</text>
        <rect x="280" y="13" width="166" height="20" rx="2" fill="#E3F1E7" stroke="#B6DEC2"/>
        <text x="363" y="27" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" font-weight="700" fill="#1B6E38">SYNCED (gsk_••••9xQ2)</text>

        <rect x="18" y="46" width="510" height="30" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
        <text x="28" y="65" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#87847D">Saved · enter new key to replace</text>
        <rect x="538" y="46" width="248" height="30" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
        <text x="548" y="65" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#161615">whisper-large-v3-turbo</text>
        <rect x="796" y="46" width="58" height="30" rx="3" fill="#D9531E"/>
        <text x="825" y="65" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#FFFFFF">Save</text>
        <rect x="860" y="46" width="56" height="30" rx="3" fill="#FCFBF8" stroke="#B6B0A3"/>
        <text x="888" y="65" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#161615">Test</text>
        <rect x="922" y="46" width="56" height="30" rx="3" fill="#FCFBF8" stroke="#EBB6B1"/>
        <text x="950" y="65" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#B42318">Clear</text>
        <line x1="0" y1="92" x2="996" y2="92" stroke="#D5D1C8"/>
      </g>

      <!-- Row 02 -->
      <g transform="translate(22, 136)">
        <text x="18" y="28" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#161615">[02]</text>
        <text x="58" y="28" font-family="DejaVu Sans, sans-serif" font-size="14" font-weight="700" fill="#161615">Mistral (Voxtral)</text>
        <rect x="190" y="13" width="164" height="20" rx="2" fill="#EAE7E0" stroke="#D5D1C8"/>
        <text x="272" y="27" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" font-weight="700" fill="#5C5A55">FREE STUDIO · 48 MB CAP</text>
        <rect x="362" y="13" width="166" height="20" rx="2" fill="#E3F1E7" stroke="#B6DEC2"/>
        <text x="445" y="27" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" font-weight="700" fill="#1B6E38">SYNCED (mst_••••4kP8)</text>

        <rect x="18" y="46" width="510" height="30" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
        <text x="28" y="65" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#87847D">Saved · enter new key to replace</text>
        <rect x="538" y="46" width="248" height="30" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
        <text x="548" y="65" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#161615">voxtral-mini-transcribe-3</text>
        <rect x="796" y="46" width="58" height="30" rx="3" fill="#D9531E"/>
        <text x="825" y="65" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#FFFFFF">Save</text>
        <rect x="860" y="46" width="56" height="30" rx="3" fill="#FCFBF8" stroke="#B6B0A3"/>
        <text x="888" y="65" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#161615">Test</text>
        <rect x="922" y="46" width="56" height="30" rx="3" fill="#FCFBF8" stroke="#EBB6B1"/>
        <text x="950" y="65" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#B42318">Clear</text>
        <line x1="0" y1="92" x2="996" y2="92" stroke="#D5D1C8"/>
      </g>

      <!-- Row 03 -->
      <g transform="translate(22, 228)">
        <text x="18" y="28" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#161615">[03]</text>
        <text x="58" y="28" font-family="DejaVu Sans, sans-serif" font-size="14" font-weight="700" fill="#161615">Google Gemini</text>
        <rect x="180" y="13" width="184" height="20" rx="2" fill="#EAE7E0" stroke="#D5D1C8"/>
        <text x="272" y="27" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" font-weight="700" fill="#5C5A55">FREE AI STUDIO · + TRANSLATE</text>
        <rect x="372" y="13" width="166" height="20" rx="2" fill="#E3F1E7" stroke="#B6DEC2"/>
        <text x="455" y="27" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10" font-weight="700" fill="#1B6E38">SYNCED (AIza••••7mW1)</text>

        <rect x="18" y="46" width="510" height="30" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
        <text x="28" y="65" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#87847D">Saved · enter new key to replace</text>
        <rect x="538" y="46" width="248" height="30" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
        <text x="548" y="65" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#161615">gemini-2.5-flash</text>
        <rect x="796" y="46" width="58" height="30" rx="3" fill="#D9531E"/>
        <text x="825" y="65" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#FFFFFF">Save</text>
        <rect x="860" y="46" width="56" height="30" rx="3" fill="#FCFBF8" stroke="#B6B0A3"/>
        <text x="888" y="65" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#161615">Test</text>
        <rect x="922" y="46" width="56" height="30" rx="3" fill="#FCFBF8" stroke="#EBB6B1"/>
        <text x="950" y="65" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#B42318">Clear</text>
        <line x1="0" y1="92" x2="996" y2="92" stroke="#D5D1C8"/>
      </g>

      <!-- Remaining 9 providers ledger summary -->
      <g transform="translate(22, 320)">
        <rect x="18" y="16" width="960" height="86" rx="3" fill="#F4F2ED" stroke="#D5D1C8"/>
        <text x="34" y="40" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#161615">04..12 STANDBY PROVIDERS IN PRIORITY QUEUE</text>
        <text x="34" y="63" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#5C5A55">[04] Deepgram ($200) · [05] AssemblyAI ($50) · [06] Gladia (EUR 50) · [07] Cloudflare AI · [08] ElevenLabs Scribe v2</text>
        <text x="34" y="83" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#5C5A55">[09] Hugging Face · [10] OpenRouter · [11] OpenAI Whisper-1 · [12] Local / Self-Hosted Whisper (localhost:8000)</text>
      </g>
    </g>
  </g>
</svg>
`;

const screenshots = [
  ["01-player-subtitles.png", SCREENSHOT_1_PLAYER],
  ["02-audio-extraction-failover.png", SCREENSHOT_2_FAILOVER],
  ["03-toolbar-popup.png", SCREENSHOT_3_POPUP],
  ["04-settings-queue.png", SCREENSHOT_4_SETTINGS],
];

for (const [filename, svg] of screenshots) {
  renderSvgToPng(svg, `docs/assets/screenshots/${filename}`, 1280);
  renderSvgToPng(svg, `store-assets/${filename}`, 1280);
}

console.log("Generated LM Subs v0.2.0 icons, badges, architecture.svg, social banner, and 4 1280x800 screenshots.");

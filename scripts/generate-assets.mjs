#!/usr/bin/env node
/**
 * Deterministically renders all extension icons, custom SVG badges, architecture
 * diagram, OpenGraph banner, and 1280x800 UI screenshots using `@resvg/resvg-js`.
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

// 1. Brand Logo SVG + Extension Icons (16, 32, 48, 128)
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="26" fill="#14171A"/>
  <rect x="3" y="3" width="122" height="122" rx="23" stroke="#2D333B" stroke-width="2"/>
  <path d="M52 33L84 52L52 71V33Z" fill="#F4F4F0"/>
  <rect x="24" y="84" width="48" height="10" rx="5" fill="#22C55E"/>
  <rect x="80" y="84" width="24" height="10" rx="5" fill="#F4F4F0"/>
  <rect x="34" y="100" width="60" height="9" rx="4.5" fill="#9CA3AF"/>
</svg>
`;

writeText("docs/assets/logo.svg", LOGO_SVG);
for (const size of [16, 32, 48, 128]) {
  renderSvgToPng(LOGO_SVG, `extension/icons/icon${size}.png`, size);
}

// 2. Clean Flat Utilitarian SVG Badges
function makeBadge(left, right, rightColor = "#15803d") {
  const leftW = Math.round(left.length * 6.8 + 18);
  const rightW = Math.round(right.length * 6.8 + 18);
  const totalW = leftW + rightW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${left}: ${right}">
  <rect width="${totalW}" height="20" rx="4" fill="#181b20"/>
  <rect x="${leftW}" width="${rightW}" height="20" rx="4" fill="${rightColor}"/>
  <rect x="${leftW}" width="4" height="20" fill="${rightColor}"/>
  <g fill="#f9fafb" text-anchor="middle" font-family="DejaVu Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11" font-weight="600">
    <text x="${(leftW / 2).toFixed(1)}" y="14">${left}</text>
    <text x="${(leftW + rightW / 2).toFixed(1)}" y="14">${right}</text>
  </g>
</svg>
`;
}

writeText("docs/assets/badges/manifest-v3.svg", makeBadge("Chrome", "Manifest V3", "#1f2937"));
writeText("docs/assets/badges/providers.svg", makeBadge("BYOK Queue", "12 STT Providers", "#15803d"));
writeText("docs/assets/badges/audio-extract.svg", makeBadge("Payload", "-92% .m4a Audio", "#0f766e"));
writeText("docs/assets/badges/tests.svg", makeBadge("Tests", "25 / 25 Passing", "#15803d"));
writeText("docs/assets/badges/telemetry.svg", makeBadge("Telemetry", "Zero", "#374151"));
writeText("docs/assets/badges/license.svg", makeBadge("License", "MIT", "#374151"));

// 3. Architecture Diagram (`docs/assets/architecture.svg`)
const ARCHITECTURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="460" viewBox="0 0 1040 460" fill="none" role="img" aria-label="Subtitles for NotebookLM 3-World MV3 Architecture Diagram">
  <style>
    .bg { fill: #0e1013; }
    .lane { fill: #15181d; stroke: #272c35; stroke-width: 1.5; }
    .box { fill: #1b1f26; stroke: #313844; stroke-width: 1.25; }
    .box-hi { fill: #132219; stroke: #22c55e; stroke-width: 1.5; }
    .hdr { font-family: DejaVu Sans, -apple-system, Segoe UI, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; fill: #4ade80; }
    .title { font-family: DejaVu Sans, -apple-system, Segoe UI, sans-serif; font-size: 13px; font-weight: 700; fill: #f3f4f6; }
    .sub { font-family: DejaVu Sans Mono, ui-monospace, monospace; font-size: 10.5px; fill: #9ca3af; }
    .lbl { font-family: DejaVu Sans, -apple-system, Segoe UI, sans-serif; font-size: 10.5px; font-weight: 600; fill: #d1d5db; }
    .num { fill: #16a34a; }
    .num-txt { font-family: DejaVu Sans, sans-serif; font-size: 10px; font-weight: 700; fill: #ffffff; text-anchor: middle; }
    .arrow { stroke: #22c55e; stroke-width: 1.75; fill: none; }
    .arrow-dim { stroke: #6b7280; stroke-width: 1.4; stroke-dasharray: 4 4; fill: none; }
  </style>
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#22c55e"/>
    </marker>
    <marker id="ahd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#6b7280"/>
    </marker>
  </defs>

  <rect width="1040" height="460" rx="12" class="bg"/>

  <!-- Column 1: MAIN World -->
  <rect x="22" y="22" width="310" height="416" rx="10" class="lane"/>
  <text x="40" y="46" class="hdr">1 · PAGE "MAIN" WORLD (page.js)</text>
  <text x="40" y="63" class="sub">Zero chrome.storage or API key access</text>

  <rect x="40" y="84" width="274" height="96" rx="8" class="box"/>
  <circle cx="57" cy="105" r="9" class="num"/><text x="57" y="109" class="num-txt">1</text>
  <text x="73" y="109" class="title">Passive RPC Stream Observer</text>
  <text x="54" y="130" class="sub">Hooks XHR + fetch on batchexecute</text>
  <text x="54" y="147" class="sub">Never mutates requests or responses</text>
  <text x="54" y="164" class="sub">Works on notebooklm &amp; notebook.google</text>

  <rect x="40" y="204" width="274" height="106" rx="8" class="box"/>
  <circle cx="57" cy="225" r="9" class="num"/><text x="57" y="229" class="num-txt">2</text>
  <text x="73" y="229" class="title">Proto Wire Frame Parser</text>
  <text x="54" y="250" class="sub">R7cb6c create + gArtLc poll frames</text>
  <text x="54" y="267" class="sub">Detects row[2]===3 (Video Overview)</text>
  <text x="54" y="284" class="sub">Extracts =m22-dv CDN URL &amp; language</text>
  <text x="54" y="300" class="sub">Structural fallback if RPC ID rotates</text>

  <rect x="40" y="334" width="274" height="84" rx="8" class="box"/>
  <text x="54" y="358" class="title">NotebookLM &lt;video&gt; Element</text>
  <text x="54" y="378" class="sub">Inline Studio player &amp; Fullscreen</text>
  <text x="54" y="395" class="sub">+ Native VTTCue track for OS PiP</text>

  <!-- Column 2: ISOLATED World -->
  <rect x="364" y="22" width="310" height="416" rx="10" class="lane"/>
  <text x="382" y="46" class="hdr">2 · ISOLATED WORLD (content.js)</text>
  <text x="382" y="63" class="sub">Origin-checked bridge · Closed Shadow DOM</text>

  <rect x="382" y="96" width="274" height="114" rx="8" class="box"/>
  <circle cx="399" cy="117" r="9" class="num"/><text x="399" y="121" class="num-txt">3</text>
  <text x="415" y="121" class="title">Decision Gate (decide.js)</text>
  <text x="396" y="142" class="sub">• Instant 0 ms lookup in LRU cache</text>
  <text x="396" y="159" class="sub">• Deduplicates in-flight &amp; retries</text>
  <text x="396" y="176" class="sub">• Checks regex title exclusions</text>
  <text x="396" y="193" class="sub">• Max 2 bounded backoff retries</text>

  <rect x="382" y="238" width="274" height="178" rx="8" class="box-hi"/>
  <circle cx="399" cy="259" r="9" class="num"/><text x="399" y="263" class="num-txt">6</text>
  <text x="415" y="263" class="title">Player Caption Overlay + HUD</text>
  <text x="396" y="285" class="sub">• Closed ShadowRoot (zero CSS bleed)</text>
  <text x="396" y="302" class="sub">• O(log N) binary-search cue sync</text>
  <text x="396" y="319" class="sub">• Balanced 2-line caption wrapping</text>
  <text x="396" y="336" class="sub">• [CC] [A-/A+] [±0.25s] controls</text>
  <text x="396" y="353" class="sub">• 1-click .SRT &amp; .VTT file export</text>
  <text x="396" y="370" class="sub">• External .SRT/.VTT file import</text>
  <text x="396" y="387" class="sub">• Bottom-right progress toast</text>

  <!-- Column 3: Service Worker -->
  <rect x="706" y="22" width="312" height="416" rx="10" class="lane"/>
  <text x="724" y="46" class="hdr">3 · MV3 SERVICE WORKER (background.js)</text>
  <text x="724" y="63" class="sub">Sole reader of BYOK keys in storage</text>

  <rect x="724" y="84" width="276" height="106" rx="8" class="box-hi"/>
  <circle cx="741" cy="105" r="9" class="num"/><text x="741" y="109" class="num-txt">4</text>
  <text x="757" y="109" class="title">ISO-BMFF Audio Extractor</text>
  <text x="738" y="130" class="sub">SSRF-checked Google CDN download</text>
  <text x="738" y="147" class="sub">Strips H.264 vide track in pure JS</text>
  <text x="738" y="164" class="sub">56 MB MP4 -&gt; ~4.2 MB .m4a (-92%)</text>
  <text x="738" y="180" class="sub">16 kHz mono WAV chunking fallback</text>

  <rect x="724" y="208" width="276" height="114" rx="8" class="box-hi"/>
  <circle cx="741" cy="229" r="9" class="num"/><text x="741" y="233" class="num-txt">5</text>
  <text x="757" y="233" class="title">12-Provider Failover Queue</text>
  <text x="738" y="254" class="sub">#1 Groq -&gt; #2 Mistral -&gt; #3 Gemini</text>
  <text x="738" y="271" class="sub">+ Deepgram / AssemblyAI / Gladia</text>
  <text x="738" y="288" class="sub">+ ElevenLabs / CF / HF / Local URL</text>
  <text x="738" y="305" class="sub">Auto-failover on HTTP 429 / 5xx</text>

  <rect x="724" y="340" width="276" height="78" rx="8" class="box"/>
  <text x="740" y="363" class="title">chrome.storage.local + UI</text>
  <text x="740" y="382" class="sub">API keys isolated to Service Worker</text>
  <text x="740" y="399" class="sub">Popup/Options read boolean flags only</text>

  <!-- Connectors -->
  <path d="M 177 180 L 177 201" class="arrow" marker-end="url(#ah)"/>
  <path d="M 314 242 L 379 156" class="arrow" marker-end="url(#ah)"/>
  <text x="319" y="184" class="lbl">postMessage</text>

  <path d="M 656 138 L 721 138" class="arrow" marker-end="url(#ah)"/>
  <text x="660" y="130" class="lbl">ENSURE</text>

  <path d="M 862 190 L 862 205" class="arrow" marker-end="url(#ah)"/>
  <path d="M 724 275 L 659 295" class="arrow" marker-end="url(#ah)"/>
  <text x="664" y="276" class="lbl">Timed Cues</text>

  <path d="M 382 355 L 317 372" class="arrow" marker-end="url(#ah)"/>
  <path d="M 862 340 L 862 325" class="arrow-dim" marker-end="url(#ahd)"/>
</svg>
`;
writeText("docs/assets/architecture.svg", ARCHITECTURE_SVG);

// 4. Social Banner (`1280x640`)
const BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
  <rect width="1280" height="640" fill="#F6F6F4"/>
  <rect x="36" y="36" width="1208" height="568" rx="16" fill="#FFFFFF" stroke="#DFE2E6" stroke-width="2"/>

  <!-- Left column -->
  <g transform="translate(88, 96)">
    <rect width="56" height="56" rx="12" fill="#14171A"/>
    <path d="M23 15L37 23.5L23 32V15Z" fill="#F4F4F0"/>
    <rect x="11" y="37" width="21" height="4.5" rx="2.25" fill="#22C55E"/>
    <rect x="35" y="37" width="10" height="4.5" rx="2.25" fill="#F4F4F0"/>
    <rect x="15" y="44" width="26" height="4" rx="2" fill="#9CA3AF"/>

    <text x="0" y="114" font-family="DejaVu Sans, sans-serif" font-size="44" font-weight="700" fill="#111315">Subtitles for</text>
    <text x="0" y="166" font-family="DejaVu Sans, sans-serif" font-size="44" font-weight="700" fill="#111315">NotebookLM</text>

    <text x="0" y="216" font-family="DejaVu Sans, sans-serif" font-size="19" fill="#525866">Automatic synchronized captions &amp; .SRT/.VTT export</text>
    <text x="0" y="244" font-family="DejaVu Sans, sans-serif" font-size="19" fill="#525866">for Google NotebookLM Video Overviews.</text>

    <!-- Stat chips -->
    <g transform="translate(0, 290)">
      <rect width="224" height="40" rx="8" fill="#DCFCE7" stroke="#BBF7D0"/>
      <text x="112" y="25" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#15803D">-92% Audio-Only Upload</text>

      <rect x="236" width="216" height="40" rx="8" fill="#F0F1F3" stroke="#DFE2E6"/>
      <text x="344" y="25" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">12 BYOK STT Providers</text>
    </g>
    <g transform="translate(0, 344)">
      <rect width="256" height="40" rx="8" fill="#F0F1F3" stroke="#DFE2E6"/>
      <text x="128" y="25" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">Groq + Mistral Auto-Failover</text>

      <rect x="268" width="184" height="40" rx="8" fill="#F0F1F3" stroke="#DFE2E6"/>
      <text x="360" y="25" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">Zero Telemetry · MIT</text>
    </g>
  </g>

  <!-- Right preview mock player -->
  <g transform="translate(650, 96)">
    <rect width="540" height="448" rx="12" fill="#111316" stroke="#2A2F37" stroke-width="2"/>
    <!-- Top player toolbar pill -->
    <g transform="translate(206, 18)">
      <rect width="316" height="32" rx="7" fill="#1B1F25" stroke="#343B46"/>
      <rect x="6" y="5" width="36" height="22" rx="4" fill="#F3F4F6"/>
      <text x="24" y="20" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#111315">CC</text>
      <text x="64" y="20" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#E5E7EB">A-</text>
      <text x="92" y="20" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#E5E7EB">A+</text>
      <text x="142" y="20" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9CA3AF">+0.00s</text>
      <text x="206" y="20" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#4ADE80">.SRT</text>
      <text x="248" y="20" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#E5E7EB">.VTT</text>
      <text x="291" y="20" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#9CA3AF">Import</text>
    </g>

    <!-- Slide graphic inside video -->
    <rect x="44" y="76" width="452" height="228" rx="8" fill="#181C22" stroke="#272D36"/>
    <text x="72" y="122" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#4ADE80">NOTEBOOKLM STUDIO · VIDEO OVERVIEW</text>
    <text x="72" y="158" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="700" fill="#F9FAFB">Distributed Consensus &amp; Raft</text>
    <rect x="72" y="182" width="180" height="8" rx="4" fill="#2E3540"/>
    <rect x="72" y="200" width="260" height="8" rx="4" fill="#2E3540"/>
    <rect x="72" y="232" width="144" height="44" rx="6" fill="#20262E" stroke="#36404E"/>
    <text x="144" y="259" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#D1D5DB">Leader · Term 4</text>
    <rect x="232" y="232" width="144" height="44" rx="6" fill="#20262E" stroke="#36404E"/>
    <text x="304" y="259" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#D1D5DB">Quorum · 3/5</text>

    <!-- Synchronized 2-line Subtitle Box -->
    <rect x="52" y="330" width="436" height="62" rx="7" fill="#0B0D0F" stroke="#2D333B"/>
    <text x="270" y="356" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="15.5" font-weight="600" fill="#F9FAFB">Leader election guarantees at most one leader</text>
    <text x="270" y="379" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="15.5" font-weight="600" fill="#F9FAFB">per term across a majority quorum of nodes.</text>

    <!-- Progress scrubber -->
    <rect x="28" y="416" width="484" height="4" rx="2" fill="#2B3038"/>
    <rect x="28" y="416" width="210" height="4" rx="2" fill="#22C55E"/>
    <circle cx="238" cy="418" r="6" fill="#F9FAFB"/>
  </g>
</svg>
`;
renderSvgToPng(BANNER_SVG, "docs/assets/banner-social-1280x640.png", 1280);

// 5. Four 1280x800 Screenshots (`docs/assets/screenshots/` + `store-assets/`)
const SCREENSHOT_1_PLAYER = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#F3F4F6"/>
  <!-- Browser chrome -->
  <rect x="40" y="28" width="1200" height="744" rx="12" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1.5"/>
  <rect x="40" y="28" width="1200" height="44" rx="12" fill="#F9FAFB"/>
  <line x1="40" y1="72" x2="1240" y2="72" stroke="#E5E7EB"/>
  <circle cx="66" cy="50" r="6" fill="#D1D5DB"/>
  <circle cx="86" cy="50" r="6" fill="#D1D5DB"/>
  <circle cx="106" cy="50" r="6" fill="#D1D5DB"/>
  <rect x="140" y="38" width="520" height="24" rx="6" fill="#F0F1F3"/>
  <text x="156" y="54" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#4B5563">https://notebooklm.google.com/notebook/8f4c2a1e-raft-consensus</text>

  <!-- NotebookLM Workspace Header -->
  <text x="72" y="110" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="700" fill="#111315">Distributed Systems Reading Group</text>
  <text x="72" y="130" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#6B7280">6 sources · Studio Video Overview Player</text>

  <!-- Main Video Overview Player -->
  <g transform="translate(72, 152)">
    <rect width="820" height="520" rx="12" fill="#101215" stroke="#262B33" stroke-width="1.5"/>

    <!-- Top-right Extension Control Pill -->
    <g transform="translate(362, 16)">
      <rect width="442" height="34" rx="7" fill="#171A1F" stroke="#323843"/>
      <rect x="6" y="5" width="38" height="24" rx="5" fill="#F3F4F6"/>
      <text x="25" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#111315">CC</text>
      <line x1="52" y1="9" x2="52" y2="25" stroke="#323843"/>
      <text x="70" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#E5E7EB">A-</text>
      <text x="98" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#E5E7EB">A+</text>
      <line x1="116" y1="9" x2="116" y2="25" stroke="#323843"/>
      <text x="144" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#D1D5DB">-0.25s</text>
      <text x="192" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9CA3AF">0.00s</text>
      <text x="242" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#D1D5DB">+0.25s</text>
      <line x1="272" y1="9" x2="272" y2="25" stroke="#323843"/>
      <text x="296" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#4ADE80">.SRT</text>
      <text x="334" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#E5E7EB">.VTT</text>
      <text x="378" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#D1D5DB">Import</text>
      <text x="418" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#9CA3AF">Regen</text>
    </g>

    <!-- Slide visual inside NotebookLM Video Overview -->
    <rect x="76" y="74" width="668" height="304" rx="10" fill="#171B21" stroke="#262C36"/>
    <text x="112" y="122" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#4ADE80">SECTION 02 · LOG REPLICATION &amp; SAFETY</text>
    <text x="112" y="162" font-family="DejaVu Sans, sans-serif" font-size="28" font-weight="700" fill="#F9FAFB">How Raft Commits Entries Safely</text>
    <text x="112" y="196" font-family="DejaVu Sans, sans-serif" font-size="15" fill="#9CA3AF">AppendEntries RPCs replicate log entries from the leader to followers</text>
    <text x="112" y="218" font-family="DejaVu Sans, sans-serif" font-size="15" fill="#9CA3AF">before advancing the state machine commit index.</text>

    <g transform="translate(112, 248)">
      <rect width="188" height="84" rx="8" fill="#1E242C" stroke="#313946"/>
      <text x="16" y="30" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9CA3AF">NODE S1 (LEADER)</text>
      <text x="16" y="56" font-family="DejaVu Sans, sans-serif" font-size="15.5" font-weight="700" fill="#F3F4F6">Index 42 · Term 3</text>

      <rect x="204" width="188" height="84" rx="8" fill="#1E242C" stroke="#313946"/>
      <text x="220" y="30" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9CA3AF">NODE S2 (FOLLOWER)</text>
      <text x="220" y="56" font-family="DejaVu Sans, sans-serif" font-size="15.5" font-weight="700" fill="#4ADE80">ACK · Quorum 2/3</text>

      <rect x="408" width="188" height="84" rx="8" fill="#1E242C" stroke="#313946"/>
      <text x="424" y="30" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9CA3AF">COMMIT STATE</text>
      <text x="424" y="56" font-family="DejaVu Sans, sans-serif" font-size="15.5" font-weight="700" fill="#F3F4F6">Applied to FSM</text>
    </g>

    <!-- Synchronized Shadow-DOM Caption Box -->
    <rect x="130" y="402" width="560" height="64" rx="7" fill="#0B0D10" stroke="#2D333C"/>
    <text x="410" y="429" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="600" fill="#F9FAFB">Once a majority of followers append the entry,</text>
    <text x="410" y="454" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="600" fill="#F9FAFB">the leader marks it committed and applies it safely.</text>

    <!-- Video timeline -->
    <rect x="28" y="488" width="764" height="5" rx="2.5" fill="#2A2F37"/>
    <rect x="28" y="488" width="340" height="5" rx="2.5" fill="#22C55E"/>
    <circle cx="368" cy="490.5" r="6.5" fill="#FFFFFF"/>
    <text x="28" y="509" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9CA3AF">01:24 / 03:08</text>
  </g>

  <!-- Right Studio Panel -->
  <g transform="translate(916, 152)">
    <rect width="292" height="520" rx="12" fill="#F9FAFB" stroke="#E5E7EB"/>
    <text x="20" y="34" font-family="DejaVu Sans, sans-serif" font-size="14" font-weight="700" fill="#111315">Studio Artifacts</text>

    <rect x="16" y="52" width="260" height="72" rx="8" fill="#FFFFFF" stroke="#16A34A" stroke-width="1.5"/>
    <text x="32" y="78" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#111315">Raft Consensus Overview</text>
    <text x="32" y="98" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#15803D">Video Overview · 64 subtitle cues</text>
    <text x="32" y="114" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#6B7280">54.8 MB MP4 -&gt; 4.1 MB .m4a (-93%)</text>

    <rect x="16" y="138" width="260" height="62" rx="8" fill="#FFFFFF" stroke="#E5E7EB"/>
    <text x="32" y="164" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="600" fill="#374151">Audio Deep Dive</text>
    <text x="32" y="184" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#6B7280">Audio Overview · 11m 40s</text>
  </g>

  <!-- Bottom-right Shadow-DOM Status Toast -->
  <g transform="translate(888, 694)">
    <rect width="320" height="56" rx="8" fill="#14171A" stroke="#2A2F36"/>
    <circle cx="22" cy="28" r="5" fill="#22C55E"/>
    <text x="38" y="24" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#F9FAFB">Subtitles ready · 64 cues</text>
    <text x="38" y="42" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#9CA3AF">Transcribed via groq (whisper-large-v3-turbo)</text>
  </g>
</svg>
`;

const SCREENSHOT_2_FAILOVER = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#F6F6F4"/>
  <text x="80" y="78" font-family="DejaVu Sans, sans-serif" font-size="28" font-weight="700" fill="#111315">Client-Side Audio Extraction &amp; Automatic Provider Failover</text>
  <text x="80" y="108" font-family="DejaVu Sans, sans-serif" font-size="15.5" fill="#525866">Full video never leaves your browser. Only the stripped .m4a audio track is sent across your BYOK queue.</text>

  <!-- Step 1 Card -->
  <g transform="translate(80, 150)">
    <rect width="352" height="560" rx="12" fill="#FFFFFF" stroke="#DFE2E6" stroke-width="1.5"/>
    <rect x="24" y="24" width="76" height="26" rx="5" fill="#F0F1F3"/>
    <text x="62" y="41" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#111315">STAGE 1</text>
    <text x="24" y="80" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#111315">Detect Video Overview</text>
    <text x="24" y="106" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Passive batchexecute observer detects</text>
    <text x="24" y="125" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Studio Video Overview completion.</text>

    <rect x="24" y="156" width="304" height="156" rx="8" fill="#14171A"/>
    <text x="40" y="184" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#4ADE80">POST /_/LabsTailwindUi/.../batchexecute</text>
    <text x="40" y="210" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#E5E7EB">rpcId: "gArtLc" (POLL_STUDIO)</text>
    <text x="40" y="232" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#E5E7EB">row[2]: 3 (VIDEO_OVERVIEW)</text>
    <text x="40" y="254" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#4ADE80">row[4]: 3 (STATUS_READY)</text>
    <text x="40" y="276" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9CA3AF">row[8][2][1]: "en" · 184.5s</text>

    <rect x="24" y="340" width="304" height="190" rx="8" fill="#F8F9FA" stroke="#E5E7EB"/>
    <text x="40" y="370" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#111315">Resilient Against Google Updates</text>
    <text x="40" y="396" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">• Works on notebooklm.google.com</text>
    <text x="40" y="418" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">• Works on notebook.google.com</text>
    <text x="40" y="440" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">• RPC-ID-agnostic row structure check</text>
    <text x="40" y="462" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">• Hot-patchable RPC IDs in Settings</text>
  </g>

  <!-- Step 2 Card -->
  <g transform="translate(464, 150)">
    <rect width="352" height="560" rx="12" fill="#FFFFFF" stroke="#DFE2E6" stroke-width="1.5"/>
    <rect x="24" y="24" width="76" height="26" rx="5" fill="#DCFCE7"/>
    <text x="62" y="41" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#15803D">STAGE 2</text>
    <text x="24" y="80" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#111315">Strip Video, Keep Audio</text>
    <text x="24" y="106" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Pure-JS ISO-BMFF remuxer drops H.264</text>
    <text x="24" y="125" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">frames and repacks AAC soun chunks.</text>

    <!-- Visual bar comparison -->
    <rect x="24" y="156" width="304" height="156" rx="8" fill="#F8F9FA" stroke="#E5E7EB"/>
    <text x="42" y="188" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#525866">Original 720p Video Overview (.mp4)</text>
    <rect x="42" y="198" width="268" height="24" rx="4" fill="#D1D5DB"/>
    <text x="52" y="214" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#111315">58.4 MB (exceeds Groq 25 MB cap)</text>

    <text x="42" y="254" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#15803D">Extracted Audio Track (.m4a)</text>
    <rect x="42" y="264" width="26" height="24" rx="4" fill="#16A34A"/>
    <text x="78" y="280" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="700" fill="#15803D">4.3 MB (-92.6% · 12 ms in JS)</text>

    <rect x="24" y="340" width="304" height="190" rx="8" fill="#F8F9FA" stroke="#E5E7EB"/>
    <text x="40" y="370" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#111315">Zero WASM Bloat</text>
    <text x="40" y="396" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">• No 30 MB ffmpeg.wasm binary</text>
    <text x="40" y="418" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">• Runs inside MV3 Service Worker</text>
    <text x="40" y="440" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">• Recalculates exact stco offsets</text>
    <text x="40" y="462" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">• 16 kHz mono WAV chunking fallback</text>
  </g>

  <!-- Step 3 Card -->
  <g transform="translate(848, 150)">
    <rect width="352" height="560" rx="12" fill="#FFFFFF" stroke="#DFE2E6" stroke-width="1.5"/>
    <rect x="24" y="24" width="76" height="26" rx="5" fill="#DCFCE7"/>
    <text x="62" y="41" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#15803D">STAGE 3</text>
    <text x="24" y="80" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#111315">Priority Queue Failover</text>
    <text x="24" y="106" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Rate-limited on Provider #1? Queue</text>
    <text x="24" y="125" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">automatically switches to Provider #2.</text>

    <g transform="translate(24, 156)">
      <rect width="304" height="68" rx="8" fill="#FEF3C7" stroke="#FDE68A"/>
      <text x="16" y="26" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#B45309">#1 Groq · whisper-large-v3-turbo</text>
      <text x="16" y="48" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#92400E">HTTP 429 RPM limit -&gt; instant failover</text>

      <rect y="82" width="304" height="74" rx="8" fill="#DCFCE7" stroke="#86EFAC"/>
      <text x="16" y="108" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#15803D">#2 Mistral · voxtral-mini-transcribe-3</text>
      <text x="16" y="130" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#166534">HTTP 200 OK · 64 timed cues in 1.9s</text>

      <rect y="170" width="304" height="60" rx="8" fill="#F8F9FA" stroke="#E5E7EB"/>
      <text x="16" y="196" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="600" fill="#374151">#3 Gemini / Deepgram / Local URL</text>
      <text x="16" y="215" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#6B7280">Standby in queue</text>
    </g>

    <rect x="24" y="410" width="304" height="120" rx="8" fill="#14171A"/>
    <text x="40" y="438" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#4ADE80">1</text>
    <text x="40" y="456" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9CA3AF">00:01:24,000 --&gt; 00:01:28,250</text>
    <text x="40" y="478" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#F9FAFB">Once a majority of followers append</text>
    <text x="40" y="498" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#F9FAFB">the entry, it commits safely.</text>
  </g>
</svg>
`;

const SCREENSHOT_3_POPUP = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#ECEEF1"/>
  <!-- Subtle background NotebookLM frame -->
  <rect x="60" y="44" width="1160" height="712" rx="14" fill="#FFFFFF" stroke="#D8DCE3"/>
  <rect x="60" y="44" width="1160" height="48" rx="14" fill="#F8F9FA"/>
  <text x="96" y="73" font-family="DejaVu Sans, sans-serif" font-size="14" font-weight="700" fill="#6B7280">NotebookLM · Studio</text>

  <!-- Crisp Toolbar Popup Card (centered focal subject) -->
  <g transform="translate(432, 96)">
    <rect width="416" height="608" rx="12" fill="#F6F6F4" stroke="#C8CDD5" stroke-width="2"/>

    <!-- Popup Header -->
    <g transform="translate(20, 20)">
      <rect width="34" height="34" rx="8" fill="#14171A"/>
      <path d="M14 9L23 14.5L14 20V9Z" fill="#F4F4F0"/>
      <rect x="7" y="23" width="13" height="3" rx="1.5" fill="#22C55E"/>
      <rect x="22" y="23" width="6" height="3" rx="1.5" fill="#F4F4F0"/>
      <text x="46" y="16" font-family="DejaVu Sans, sans-serif" font-size="15.5" font-weight="700" fill="#111315">Subtitles for NotebookLM</text>
      <text x="46" y="33" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#555D69">Audio-only BYOK captions · v0.1.1</text>
      <!-- Toggle switch -->
      <rect x="338" y="8" width="38" height="21" rx="10.5" fill="#16A34A"/>
      <circle cx="365.5" cy="18.5" r="8" fill="#FFFFFF"/>
    </g>

    <!-- Queue Summary Pill -->
    <g transform="translate(20, 68)">
      <rect width="376" height="36" rx="7" fill="#EAECEF"/>
      <text x="12" y="23" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#555D69">Failover queue: <tspan font-weight="700" fill="#111315">#1 Groq -&gt; #2 Mistral</tspan></text>
      <rect x="314" y="6" width="54" height="24" rx="5" fill="#FFFFFF" stroke="#D1D5DB"/>
      <text x="341" y="22" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Queue</text>
    </g>

    <!-- Provider Card -->
    <g transform="translate(20, 116)">
      <rect width="376" height="214" rx="9" fill="#FFFFFF" stroke="#DFE2E6"/>
      <text x="14" y="26" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#111315">Speech-to-Text Provider</text>
      <rect x="292" y="11" width="70" height="20" rx="10" fill="#DCFCE7" stroke="#BBF7D0"/>
      <text x="327" y="25" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#15803D">Key saved</text>

      <rect x="14" y="38" width="348" height="34" rx="6" fill="#F6F6F4" stroke="#DFE2E6"/>
      <text x="24" y="59" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#111315">Groq — Best Free Tier · 8 hrs/day</text>

      <text x="14" y="90" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#555D69">Permanent free plan, no card: 20 RPM, 8 hrs audio/day.</text>

      <text x="14" y="122" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#111315">API Key</text>
      <text x="362" y="122" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="11.5" text-decoration="underline" fill="#111315">Get free key ↗</text>

      <rect x="14" y="132" width="218" height="34" rx="6" fill="#F6F6F4" stroke="#DFE2E6"/>
      <text x="24" y="153" font-family="DejaVu Sans Mono, monospace" font-size="12.5" fill="#7B8494">••••••••••••••••••••</text>

      <rect x="238" y="132" width="62" height="34" rx="6" fill="#14171A"/>
      <text x="269" y="153" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">Save</text>

      <rect x="306" y="132" width="56" height="34" rx="6" fill="#FFFFFF" stroke="#DFE2E6"/>
      <text x="334" y="153" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">Test</text>

      <text x="14" y="192" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#15803D">Connected to Groq (318 ms).</text>
    </g>

    <!-- Active Tab Card -->
    <g transform="translate(20, 342)">
      <rect width="376" height="118" rx="9" fill="#FFFFFF" stroke="#DFE2E6"/>
      <text x="14" y="25" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#555D69">CURRENT NOTEBOOKLM TAB</text>
      <rect x="272" y="10" width="90" height="20" rx="10" fill="#DCFCE7" stroke="#BBF7D0"/>
      <text x="317" y="24" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#15803D">1 Video ready</text>

      <text x="14" y="50" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#555D69">Ready: "Raft Consensus Overview"</text>

      <rect x="14" y="66" width="284" height="36" rx="6" fill="#14171A"/>
      <text x="156" y="88" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#FFFFFF">Generate Subtitles Now</text>

      <rect x="306" y="66" width="56" height="36" rx="6" fill="#FFFFFF" stroke="#DFE2E6"/>
      <text x="334" y="88" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#111315">.SRT</text>
    </g>

    <!-- Latest Transcription Stats Card -->
    <g transform="translate(20, 472)">
      <rect width="376" height="82" rx="9" fill="#FFFFFF" stroke="#DFE2E6"/>
      <text x="14" y="24" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#555D69">LATEST TRANSCRIPTION</text>
      <rect x="306" y="9" width="56" height="20" rx="10" fill="#DCFCE7"/>
      <text x="334" y="23" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#15803D">groq</text>
      <text x="14" y="48" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#111315">Raft Consensus Overview</text>
      <text x="14" y="67" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#555D69">64 cues · 54.8 MB -&gt; 4.1 MB</text>
    </g>

    <text x="20" y="584" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#555D69">12 providers · Audio-only extraction</text>
    <text x="396" y="584" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#111315">Full Settings -&gt;</text>
  </g>
</svg>
`;

const SCREENSHOT_4_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#F6F6F4"/>
  <g transform="translate(150, 36)">
    <!-- Header -->
    <rect width="36" height="36" rx="8" fill="#14171A"/>
    <path d="M15 9.5L24 15L15 20.5V9.5Z" fill="#F4F4F0"/>
    <rect x="7" y="24" width="14" height="3" rx="1.5" fill="#22C55E"/>
    <rect x="23" y="24" width="6" height="3" rx="1.5" fill="#F4F4F0"/>
    <text x="48" y="18" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="700" fill="#111315">Subtitles for NotebookLM · Settings</text>
    <text x="48" y="36" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#555D69">Client-side audio extraction · 12-provider BYOK failover queue · Zero telemetry</text>

    <!-- Card 1: Priority Queue -->
    <g transform="translate(0, 58)">
      <rect width="980" height="428" rx="10" fill="#FFFFFF" stroke="#DFE2E6"/>
      <text x="22" y="30" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#555D69">1. BYOK PROVIDER PRIORITY QUEUE &amp; API KEYS</text>
      <text x="958" y="30" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#555D69">Top-to-bottom execution · HTTP 429 auto-failover</text>

      <!-- Row #1 Groq -->
      <g transform="translate(22, 46)">
        <rect width="936" height="82" rx="7" fill="#F6F6F4" stroke="#DFE2E6"/>
        <rect x="14" y="12" width="28" height="20" rx="4" fill="#EAECEF"/>
        <text x="28" y="26" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#374151">#1</text>
        <text x="52" y="26" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">Groq</text>
        <rect x="98" y="12" width="166" height="20" rx="10" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="181" y="26" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#555D69">Best Free Tier · 8 hrs/day</text>
        <rect x="272" y="12" width="74" height="20" rx="10" fill="#DCFCE7"/>
        <text x="309" y="26" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#15803D">Key saved</text>

        <rect x="14" y="42" width="460" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="24" y="60" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#7B8494">Saved · enter new key to replace</text>
        <rect x="484" y="42" width="236" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="494" y="60" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#111315">whisper-large-v3-turbo</text>
        <rect x="730" y="42" width="58" height="28" rx="5" fill="#14171A"/>
        <text x="759" y="60" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#FFFFFF">Save</text>
        <rect x="794" y="42" width="56" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="822" y="60" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Test</text>
        <rect x="856" y="42" width="64" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="888" y="60" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#B91C1C">Clear</text>
      </g>

      <!-- Row #2 Mistral -->
      <g transform="translate(22, 138)">
        <rect width="936" height="82" rx="7" fill="#F6F6F4" stroke="#DFE2E6"/>
        <rect x="14" y="12" width="28" height="20" rx="4" fill="#EAECEF"/>
        <text x="28" y="26" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#374151">#2</text>
        <text x="52" y="26" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">Mistral (Voxtral)</text>
        <rect x="184" y="12" width="166" height="20" rx="10" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="267" y="26" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#555D69">Free Studio Tier · No Card</text>
        <rect x="358" y="12" width="74" height="20" rx="10" fill="#DCFCE7"/>
        <text x="395" y="26" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#15803D">Key saved</text>

        <rect x="14" y="42" width="460" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="24" y="60" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#7B8494">Saved · enter new key to replace</text>
        <rect x="484" y="42" width="236" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="494" y="60" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#111315">voxtral-mini-transcribe-3</text>
        <rect x="730" y="42" width="58" height="28" rx="5" fill="#14171A"/>
        <text x="759" y="60" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#FFFFFF">Save</text>
        <rect x="794" y="42" width="56" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="822" y="60" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Test</text>
        <rect x="856" y="42" width="64" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="888" y="60" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#B91C1C">Clear</text>
      </g>

      <!-- Row #3 Gemini -->
      <g transform="translate(22, 230)">
        <rect width="936" height="82" rx="7" fill="#F6F6F4" stroke="#DFE2E6"/>
        <rect x="14" y="12" width="28" height="20" rx="4" fill="#EAECEF"/>
        <text x="28" y="26" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#374151">#3</text>
        <text x="52" y="26" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">Google Gemini (AI Studio)</text>
        <rect x="250" y="12" width="194" height="20" rx="10" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="347" y="26" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#555D69">Free Daily Tier · + Translation</text>
        <rect x="452" y="12" width="64" height="20" rx="10" fill="#EAECEF"/>
        <text x="484" y="26" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#555D69">Inactive</text>

        <rect x="14" y="42" width="460" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="24" y="60" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#9CA3AF">AIzaSy...</text>
        <rect x="484" y="42" width="236" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="494" y="60" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#111315">gemini-2.5-flash</text>
        <rect x="730" y="42" width="58" height="28" rx="5" fill="#14171A"/>
        <text x="759" y="60" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#FFFFFF">Save</text>
        <rect x="794" y="42" width="56" height="28" rx="5" fill="#FFFFFF" stroke="#DFE2E6"/>
        <text x="822" y="60" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Test</text>
      </g>

      <!-- Additional providers summary strip -->
      <g transform="translate(22, 324)">
        <rect width="936" height="84" rx="7" fill="#F8F9FA" stroke="#E5E7EB"/>
        <text x="18" y="25" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#111315">+ 9 Additional Providers Ready in Reorderable Queue:</text>
        <text x="18" y="47" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#555D69">#4 Deepgram ($200 free) · #5 AssemblyAI ($50 free) · #6 Gladia (€50 free) · #7 Cloudflare Workers AI · #8 ElevenLabs Scribe v2</text>
        <text x="18" y="67" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#555D69">#9 Hugging Face Inference · #10 OpenRouter · #11 OpenAI Whisper · #12 Local / Custom Whisper URL (localhost:8000)</text>
      </g>
    </g>

    <!-- Card 2: Cached Subtitles & Export Vault -->
    <g transform="translate(0, 504)">
      <rect width="980" height="224" rx="10" fill="#FFFFFF" stroke="#DFE2E6"/>
      <text x="22" y="30" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#555D69">3. CACHED SUBTITLES &amp; EXPORT VAULT (MAX 35 LRU)</text>

      <line x1="22" y1="64" x2="958" y2="64" stroke="#E5E7EB"/>
      <text x="22" y="54" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#6B7280">VIDEO OVERVIEW</text>
      <text x="360" y="54" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#6B7280">PROVIDER</text>
      <text x="530" y="54" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#6B7280">AUDIO SLIMMING</text>
      <text x="760" y="54" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#6B7280">CUES</text>
      <text x="840" y="54" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#6B7280">EXPORT</text>

      <!-- Row 1 -->
      <text x="22" y="96" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#111315">Raft Consensus Overview</text>
      <text x="360" y="96" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#15803D">groq</text>
      <text x="530" y="96" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#374151">54.8 MB -&gt; 4.1 MB (-93%)</text>
      <text x="760" y="96" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#111315">64</text>
      <rect x="840" y="78" width="48" height="24" rx="4" fill="#F6F6F4" stroke="#D1D5DB"/>
      <text x="864" y="94" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#111315">.SRT</text>
      <rect x="894" y="78" width="48" height="24" rx="4" fill="#F6F6F4" stroke="#D1D5DB"/>
      <text x="918" y="94" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#111315">.VTT</text>

      <line x1="22" y1="114" x2="958" y2="114" stroke="#F0F1F3"/>

      <!-- Row 2 -->
      <text x="22" y="146" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#111315">Quantum Error Correction</text>
      <text x="360" y="146" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#B45309">mistral (failover)</text>
      <text x="530" y="146" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#374151">62.1 MB -&gt; 4.6 MB (-93%)</text>
      <text x="760" y="146" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#111315">78</text>
      <rect x="840" y="128" width="48" height="24" rx="4" fill="#F6F6F4" stroke="#D1D5DB"/>
      <text x="864" y="144" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#111315">.SRT</text>
      <rect x="894" y="128" width="48" height="24" rx="4" fill="#F6F6F4" stroke="#D1D5DB"/>
      <text x="918" y="144" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#111315">.VTT</text>
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

console.log("Generated icons, badges, architecture.svg, social banner, and 4 1280x800 screenshots.");

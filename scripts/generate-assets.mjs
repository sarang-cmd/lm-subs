#!/usr/bin/env node
/**
 * Deterministically renders all LM Subs icons, favicons, specification badges,
 * 4-plane MV3 + Hosted Neon Postgres architecture diagram, OpenGraph social card,
 * and 4 crisp 1280x800 UI screenshots using `@resvg/resvg-js`.
 *
 * Design system:
 * - Ground: Alabaster stone (#F6F7F8) & Quiet sheet (#FDFDFE)
 * - Ink: Graphite (#111315) & Slate (#525866)
 * - Accent: Optical Cobalt (#0055D4 / #3B82F6) & Verified Forest (#166534)
 * - Zero orange, zero cream/terracotta, zero harsh gradients.
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

// 1. Fresh LM Subs Optical Screening-Aperture Brand Mark + Favicons + Extension Icons
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="28" fill="#111315"/>
  <rect x="2" y="2" width="124" height="124" rx="26" stroke="#262B35" stroke-width="2"/>
  <rect x="18" y="22" width="92" height="84" rx="14" fill="#181C22" stroke="#363D4A" stroke-width="2"/>
  <path d="M52 39.5C52 37.9 53.75 36.92 55.12 37.75L77.4 51.25C78.72 52.05 78.72 53.95 77.4 54.75L55.12 68.25C53.75 69.08 52 68.1 52 66.5V39.5Z" fill="#F6F7F8"/>
  <rect x="28" y="82" width="44" height="10" rx="5" fill="#3B82F6"/>
  <rect x="78" y="82" width="22" height="10" rx="5" fill="#F6F7F8"/>
</svg>
`;

writeText("docs/assets/logo.svg", LOGO_SVG);
writeText("docs/favicon.svg", LOGO_SVG);
renderSvgToPng(LOGO_SVG, "docs/favicon.png", 32);
renderSvgToPng(LOGO_SVG, "docs/apple-touch-icon.png", 180);
renderSvgToPng(LOGO_SVG, "docs/assets/icon-128.png", 128);

// Also write a standards-compliant multi-browser /favicon.ico wrapping the 32x32 PNG
{
  const png32 = fs.readFileSync("docs/favicon.png");
  const icoHeader = Buffer.alloc(6 + 16);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 image
  icoHeader.writeUInt8(32, 6);   // Width 32
  icoHeader.writeUInt8(32, 7);   // Height 32
  icoHeader.writeUInt8(0, 8);    // Palette
  icoHeader.writeUInt8(0, 9);    // Reserved
  icoHeader.writeUInt16LE(1, 10); // Color planes
  icoHeader.writeUInt16LE(32, 12); // Bits per pixel
  icoHeader.writeUInt32LE(png32.length, 14); // Size of PNG data
  icoHeader.writeUInt32LE(22, 18); // Offset to PNG data
  fs.writeFileSync("docs/favicon.ico", Buffer.concat([icoHeader, png32]));
}

for (const size of [16, 32, 48, 128]) {
  renderSvgToPng(LOGO_SVG, `extension/icons/icon${size}.png`, size);
}

// Helper: inline brand mark group scaled cleanly inside larger SVG illustrations
function inlineLogoGroup(x, y, size) {
  const scale = (size / 128).toFixed(4);
  return `<g transform="translate(${x}, ${y}) scale(${scale})">
    <rect width="128" height="128" rx="28" fill="#111315"/>
    <rect x="2" y="2" width="124" height="124" rx="26" stroke="#262B35" stroke-width="2"/>
    <rect x="18" y="22" width="92" height="84" rx="14" fill="#181C22" stroke="#363D4A" stroke-width="2"/>
    <path d="M52 39.5C52 37.9 53.75 36.92 55.12 37.75L77.4 51.25C78.72 52.05 78.72 53.95 77.4 54.75L55.12 68.25C53.75 69.08 52 68.1 52 66.5V39.5Z" fill="#F6F7F8"/>
    <rect x="28" y="82" width="44" height="10" rx="5" fill="#3B82F6"/>
    <rect x="78" y="82" width="22" height="10" rx="5" fill="#F6F7F8"/>
  </g>`;
}

// 2. Clean Specification Badges for README (Graphite + Cobalt / Forest, 4px radius)
function makeBadge(left, right, rightColor = "#0055D4") {
  const leftW = Math.round(left.length * 6.9 + 18);
  const rightW = Math.round(right.length * 6.9 + 18);
  const totalW = leftW + rightW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="22" role="img" aria-label="${left}: ${right}">
  <rect width="${totalW}" height="22" rx="4" fill="#111315"/>
  <rect x="${leftW}" width="${rightW}" height="22" rx="4" fill="${rightColor}"/>
  <rect x="${leftW}" width="4" height="22" fill="${rightColor}"/>
  <g fill="#FDFDFE" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="10.5" font-weight="700">
    <text x="${(leftW / 2).toFixed(1)}" y="14.5">${left}</text>
    <text x="${(leftW + rightW / 2).toFixed(1)}" y="14.5">${right}</text>
  </g>
</svg>
`;
}

writeText("docs/assets/badges/manifest-v3.svg", makeBadge("Chrome", "Manifest V3", "#343B48"));
writeText("docs/assets/badges/providers.svg", makeBadge("BYOK Queue", "12 STT Providers", "#0055D4"));
writeText("docs/assets/badges/audio-extract.svg", makeBadge("Fast Path", "~3.2s m140 Audio", "#0055D4"));
writeText("docs/assets/badges/neon-sync.svg", makeBadge("Cloud Sync", "Neon Postgres AES-256", "#166534"));
writeText("docs/assets/badges/tests.svg", makeBadge("Tests", "45 / 45 Passing", "#166534"));
writeText("docs/assets/badges/telemetry.svg", makeBadge("Sync Control", "Granular Opt-In", "#343B48"));
writeText("docs/assets/badges/license.svg", makeBadge("License", "MIT", "#343B48"));

// 3. 4-Plane MV3 + Hosted Neon Postgres Architecture Diagram (`docs/assets/architecture.svg`)
const ARCHITECTURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="460" viewBox="0 0 1120 460" fill="none" role="img" aria-label="LM Subs MV3 and Hosted Neon Postgres Architecture">
  <style>
    .bg { fill: #F6F7F8; }
    .lane { fill: #FDFDFE; stroke: #DFE3E8; stroke-width: 1.5; }
    .box { fill: #F6F7F8; stroke: #C5CBD4; stroke-width: 1; }
    .box-hi { fill: #FDFDFE; stroke: #0055D4; stroke-width: 1.5; }
    .box-db { fill: #E7F5EC; stroke: #166534; stroke-width: 1.5; }
    .hdr { font-family: DejaVu Sans, sans-serif; font-size: 11.5px; font-weight: 700; fill: #0055D4; }
    .title { font-family: DejaVu Sans, sans-serif; font-size: 12.5px; font-weight: 700; fill: #111315; }
    .sub { font-family: DejaVu Sans Mono, monospace; font-size: 10px; fill: #525866; }
    .arrow { stroke: #0055D4; stroke-width: 1.5; fill: none; }
    .arrow-db { stroke: #166534; stroke-width: 1.5; fill: none; }
  </style>
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#0055D4"/>
    </marker>
    <marker id="ahg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#166534"/>
    </marker>
  </defs>

  <rect width="1120" height="460" rx="10" class="bg"/>
  <rect x="1" y="1" width="1118" height="458" rx="10" stroke="#DFE3E8" stroke-width="1.5"/>

  <!-- Lane 1: MAIN World -->
  <rect x="20" y="20" width="252" height="420" rx="8" class="lane"/>
  <text x="34" y="44" class="hdr">Page Main World (page.js)</text>
  <text x="34" y="60" class="sub">Zero storage or secret access</text>

  <rect x="34" y="78" width="224" height="104" rx="6" class="box"/>
  <text x="46" y="100" class="title">SSR + RPC Stream Observer</text>
  <text x="46" y="119" class="sub">AF_initDataCallback + gArtLc</text>
  <text x="46" y="136" class="sub">Captures FIFE =m140 / =m22 URL</text>
  <text x="46" y="153" class="sub">notebooklm.google.com</text>

  <rect x="34" y="202" width="224" height="96" rx="6" class="box"/>
  <text x="46" y="224" class="title">In-Memory Audio Extractor</text>
  <text x="46" y="243" class="sub">Hooks URL.createObjectURL</text>
  <text x="46" y="260" class="sub">Stages compact audio slices</text>
  <text x="46" y="277" class="sub">Avoids full video upload</text>

  <rect x="34" y="320" width="224" height="98" rx="6" class="box"/>
  <text x="46" y="342" class="title">Studio &lt;video&gt; Element</text>
  <text x="46" y="361" class="sub">Modal dialog + Fullscreen</text>
  <text x="46" y="378" class="sub">Native VTTCue PiP track</text>

  <!-- Lane 2: ISOLATED World -->
  <rect x="292" y="20" width="252" height="420" rx="8" class="lane"/>
  <text x="306" y="44" class="hdr">Isolated World (content.js)</text>
  <text x="306" y="60" class="sub">document_start, Shadow DOM</text>

  <rect x="306" y="78" width="224" height="112" rx="6" class="box"/>
  <text x="318" y="100" class="title">Decision Gate (decide.js)</text>
  <text x="318" y="119" class="sub">0 ms local LRU lookup</text>
  <text x="318" y="136" class="sub">Shadow-DOM &lt;video&gt; scanner</text>
  <text x="318" y="153" class="sub">Progressive live cue mount</text>
  <text x="318" y="170" class="sub">Keepalive port for long talks</text>

  <rect x="306" y="214" width="224" height="204" rx="6" class="box-hi"/>
  <text x="318" y="238" class="title">In-Player Caption Bar</text>
  <text x="318" y="258" class="sub">Closed ShadowRoot isolation</text>
  <text x="318" y="276" class="sub">O(log N) binary-search sync</text>
  <text x="318" y="294" class="sub">CC, A-/A+, +-0.25s offset</text>
  <text x="318" y="312" class="sub">SRT, VTT, TXT, JSON export</text>
  <text x="318" y="330" class="sub">Clipboard copy + cue import</text>
  <text x="318" y="348" class="sub">Dialog-safe file download</text>

  <!-- Lane 3: Service Worker -->
  <rect x="564" y="20" width="262" height="420" rx="8" class="lane"/>
  <text x="578" y="44" class="hdr">Service Worker (background.js)</text>
  <text x="578" y="60" class="sub">Sole reader of keys and tokens</text>

  <rect x="578" y="78" width="234" height="114" rx="6" class="box-hi"/>
  <text x="590" y="100" class="title">Sub-5s Audio Fast-Path</text>
  <text x="590" y="119" class="sub">1. Direct =m140 AAC (~3.4 MB)</text>
  <text x="590" y="136" class="sub">2. HTTP 206 Range soun slices</text>
  <text x="590" y="153" class="sub">3. ISO-BMFF audio remuxer</text>
  <text x="590" y="170" class="sub">Skips 50+ MB video frames</text>

  <rect x="578" y="210" width="234" height="114" rx="6" class="box-hi"/>
  <text x="590" y="232" class="title">12-Provider BYOK Queue</text>
  <text x="590" y="251" class="sub">#1 Groq -&gt; #2 Mistral -&gt; #3 Gemini</text>
  <text x="590" y="268" class="sub">Segment timestamps (~200x RT)</text>
  <text x="590" y="285" class="sub">3x concurrent chunk workers</text>
  <text x="590" y="302" class="sub">Auto-failover on HTTP 429</text>

  <rect x="578" y="342" width="234" height="76" rx="6" class="box"/>
  <text x="590" y="364" class="title">Opt-In Sync Gate</text>
  <text x="590" y="382" class="sub">Enforces syncPreferences locally</text>
  <text x="590" y="399" class="sub">Popup reads booleans only</text>

  <!-- Lane 4: Hosted Neon Cloud -->
  <rect x="846" y="20" width="254" height="420" rx="8" class="lane"/>
  <text x="860" y="44" class="hdr" style="fill:#166534">Hosted Cloud (Neon + Vercel)</text>
  <text x="860" y="60" class="sub">Maintainer-hosted Postgres</text>

  <rect x="860" y="78" width="226" height="104" rx="6" class="box-db"/>
  <text x="872" y="100" class="title">Google, GitHub, Email Auth</text>
  <text x="872" y="119" class="sub">OAuth 2.0 + 6-digit email OTP</text>
  <text x="872" y="136" class="sub">SHA-256 hashed lms_ sessions</text>
  <text x="872" y="153" class="sub">No user server setup needed</text>

  <rect x="860" y="202" width="226" height="114" rx="6" class="box-db"/>
  <text x="872" y="224" class="title">AES-256-GCM Vault + Purge</text>
  <text x="872" y="243" class="sub">Per-user HKDF-SHA256 key</text>
  <text x="872" y="260" class="sub">Opt-in: keys, cues, settings</text>
  <text x="872" y="277" class="sub">1-click cloud purge on opt-out</text>
  <text x="872" y="294" class="sub">UI sees masked hints only</text>

  <rect x="860" y="336" width="226" height="82" rx="6" class="box"/>
  <text x="872" y="358" class="title">Library + SQL Statistics</text>
  <text x="872" y="376" class="sub">/library &amp; /stats telemetry</text>
  <text x="872" y="393" class="sub">50 ms cross-device cache hit</text>

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

// 4. OpenGraph Social Card (`1280x640`)
const BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
  <rect width="1280" height="640" fill="#F6F7F8"/>
  <rect x="32" y="32" width="1216" height="576" rx="14" fill="#FDFDFE" stroke="#DFE3E8" stroke-width="1.5"/>

  <g transform="translate(76, 78)">
    ${inlineLogoGroup(0, 0, 56)}
    <text x="72" y="25" font-family="DejaVu Sans, sans-serif" font-size="14" font-weight="700" fill="#0055D4">LM Subs for Google NotebookLM</text>
    <text x="72" y="46" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Chrome Extension + Hosted Cloud Library (MIT Open Source)</text>

    <text x="0" y="118" font-family="DejaVu Sans, sans-serif" font-size="38" font-weight="700" fill="#111315">Captions in seconds.</text>
    <text x="0" y="168" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#525866">Synchronized closed captions, SRT/VTT/TXT/JSON export,</text>
    <text x="0" y="195" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#525866">and opt-in encrypted cloud sync across browsers.</text>

    <!-- Unboxed 2x2 Hairline Metric Strip -->
    <g transform="translate(0, 244)">
      <line x1="0" y1="0" x2="520" y2="0" stroke="#DFE3E8"/>
      <line x1="0" y1="102" x2="520" y2="102" stroke="#DFE3E8"/>
      <line x1="0" y1="204" x2="520" y2="204" stroke="#DFE3E8"/>
      <line x1="260" y1="0" x2="260" y2="204" stroke="#DFE3E8"/>

      <text x="0" y="44" font-family="DejaVu Sans, sans-serif" font-size="28" font-weight="700" fill="#111315">3.4 MB</text>
      <text x="0" y="72" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Audio-only stream vs 52 MB video</text>

      <text x="280" y="44" font-family="DejaVu Sans, sans-serif" font-size="28" font-weight="700" fill="#111315">12 providers</text>
      <text x="280" y="72" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Free-tier Groq + Mistral failover</text>

      <text x="0" y="146" font-family="DejaVu Sans, sans-serif" font-size="28" font-weight="700" fill="#0055D4">Opt-in sync</text>
      <text x="0" y="174" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Google, GitHub, or 6-digit email</text>

      <text x="280" y="146" font-family="DejaVu Sans, sans-serif" font-size="28" font-weight="700" fill="#166534">AES-256-GCM</text>
      <text x="280" y="174" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Encrypted keys in Neon Postgres</text>
    </g>
  </g>

  <!-- Right Screening Stage Preview -->
  <g transform="translate(642, 78)">
    <rect width="546" height="484" rx="12" fill="#0F1114" stroke="#272B33" stroke-width="1.5"/>
    <rect width="546" height="42" rx="12" fill="#171A1F"/>
    <line x1="0" y1="42" x2="546" y2="42" stroke="#272B33"/>
    <text x="18" y="26" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#F3F4F6">NotebookLM Video Overview</text>

    <g transform="translate(306, 9)">
      <rect width="36" height="24" rx="5" fill="#2563EB"/>
      <text x="18" y="16" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF">CC</text>
      <text x="56" y="16" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#E5E7EB">A-</text>
      <text x="82" y="16" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#E5E7EB">A+</text>
      <text x="124" y="16" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9CA3AF">0.00s</text>
      <text x="172" y="16" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#93C5FD">.srt</text>
      <text x="210" y="16" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#E5E7EB">.vtt</text>
    </g>

    <text x="36" y="98" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#93C5FD">Slide 2 of 3</text>
    <text x="36" y="134" font-family="DejaVu Sans, sans-serif" font-size="25" font-weight="700" fill="#F9FAFB">ATP Synthase Rotary Catalysis</text>
    <text x="36" y="164" font-family="DejaVu Sans, sans-serif" font-size="14" fill="#9CA3AF">Protons return down their gradient through the F0 rotor channel.</text>

    <rect x="36" y="198" width="228" height="74" rx="8" fill="#171A1F" stroke="#272B33"/>
    <text x="52" y="224" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#9CA3AF">Extracted audio stream</text>
    <text x="52" y="250" font-family="DejaVu Sans Mono, monospace" font-size="14" font-weight="700" fill="#93C5FD">3.4 MB =m140 AAC</text>

    <rect x="280" y="198" width="230" height="74" rx="8" fill="#171A1F" stroke="#272B33"/>
    <text x="296" y="224" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#9CA3AF">Cloud transcript status</text>
    <text x="296" y="250" font-family="DejaVu Sans Mono, monospace" font-size="14" font-weight="700" fill="#4ADE80">Synced (64 cues)</text>

    <!-- Synchronized Caption Box -->
    <rect x="44" y="344" width="458" height="64" rx="8" fill="#0B0D10" stroke="#2B313C"/>
    <text x="273" y="370" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="15.5" font-weight="700" fill="#FDFDFE">That concentration difference drives protons</text>
    <text x="273" y="393" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="15.5" font-weight="700" fill="#FDFDFE">back through the F0 rotor of ATP synthase.</text>

    <rect x="28" y="442" width="490" height="4" rx="2" fill="#272B33"/>
    <rect x="28" y="442" width="232" height="4" rx="2" fill="#3B82F6"/>
    <circle cx="260" cy="444" r="6" fill="#FDFDFE"/>
  </g>
</svg>
`;
renderSvgToPng(BANNER_SVG, "docs/assets/banner-social-1280x640.png", 1280);

// 5. Four Redesigned 1280x800 Screenshots (`docs/assets/screenshots/` + `store-assets/`)

// Screenshot 01: In-Player Captions & Export Bar inside Google NotebookLM
const SCREENSHOT_1_PLAYER = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#EDEFF3"/>
  <rect x="36" y="28" width="1208" height="744" rx="12" fill="#FDFDFE" stroke="#C5CBD4" stroke-width="1.5"/>
  <rect x="36" y="28" width="1208" height="44" rx="12" fill="#F6F7F8"/>
  <line x1="36" y1="72" x2="1244" y2="72" stroke="#DFE3E8"/>
  <circle cx="62" cy="50" r="5.5" fill="#C5CBD4"/>
  <circle cx="80" cy="50" r="5.5" fill="#C5CBD4"/>
  <circle cx="98" cy="50" r="5.5" fill="#C5CBD4"/>
  <rect x="126" y="38" width="540" height="24" rx="6" fill="#FDFDFE" stroke="#DFE3E8"/>
  <text x="140" y="54" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#525866">https://notebooklm.google.com/notebook/atp-proton-gradients</text>

  ${inlineLogoGroup(68, 88, 34)}
  <text x="114" y="106" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="700" fill="#111315">Biochemistry Seminar Notes</text>
  <text x="114" y="124" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#525866">Google NotebookLM Studio Video Overview</text>

  <!-- Main Video Overview Player -->
  <g transform="translate(68, 146)">
    <rect width="836" height="534" rx="12" fill="#0F1114" stroke="#272B33" stroke-width="1.5"/>

    <!-- Top-right LM Subs Control Bar (Cobalt + Graphite) -->
    <g transform="translate(292, 16)">
      <rect width="528" height="34" rx="7" fill="#171A1F" stroke="#2E3440"/>
      <rect x="5" y="5" width="40" height="24" rx="5" fill="#2563EB"/>
      <text x="25" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#FFFFFF">CC</text>
      <line x1="52" y1="9" x2="52" y2="25" stroke="#2E3440"/>
      <text x="70" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#E5E7EB">A-</text>
      <text x="98" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#E5E7EB">A+</text>
      <line x1="116" y1="9" x2="116" y2="25" stroke="#2E3440"/>
      <text x="144" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#D1D5DB">-0.25s</text>
      <text x="192" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9CA3AF">0.00s</text>
      <text x="242" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#D1D5DB">+0.25s</text>
      <line x1="272" y1="9" x2="272" y2="25" stroke="#2E3440"/>
      <text x="296" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#93C5FD">.srt</text>
      <text x="330" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#E5E7EB">.vtt</text>
      <text x="364" y="21" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#E5E7EB">.txt</text>
      <text x="404" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#D1D5DB">Copy</text>
      <text x="450" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#D1D5DB">Import</text>
      <text x="498" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#9CA3AF">Regen</text>
    </g>

    <!-- Slide visual -->
    <rect x="64" y="72" width="708" height="310" rx="10" fill="#141820" stroke="#272B33"/>
    <text x="98" y="118" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#93C5FD">Video Overview (Slide 2 of 3)</text>
    <text x="98" y="158" font-family="DejaVu Sans, sans-serif" font-size="28" font-weight="700" fill="#F9FAFB">F0-F1 Rotary Motion Drives ATP Synthesis</text>
    <text x="98" y="192" font-family="DejaVu Sans, sans-serif" font-size="14.5" fill="#9CA3AF">Protons flow down their electrochemical gradient through the F0 channel,</text>
    <text x="98" y="214" font-family="DejaVu Sans, sans-serif" font-size="14.5" fill="#9CA3AF">driving 120-degree conformational steps in the catalytic beta subunits.</text>

    <g transform="translate(98, 250)">
      <rect width="196" height="84" rx="8" fill="#0F1114" stroke="#272B33"/>
      <text x="16" y="28" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#9CA3AF">Audio stream</text>
      <text x="16" y="56" font-family="DejaVu Sans Mono, monospace" font-size="15" font-weight="700" fill="#93C5FD">3.4 MB =m140</text>

      <rect x="214" width="196" height="84" rx="8" fill="#0F1114" stroke="#272B33"/>
      <text x="230" y="28" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#9CA3AF">Caption latency</text>
      <text x="230" y="56" font-family="DejaVu Sans Mono, monospace" font-size="15" font-weight="700" fill="#4ADE80">2.4s (Groq)</text>

      <rect x="428" width="196" height="84" rx="8" fill="#0F1114" stroke="#272B33"/>
      <text x="444" y="28" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#9CA3AF">Export formats</text>
      <text x="444" y="56" font-family="DejaVu Sans Mono, monospace" font-size="15" font-weight="700" fill="#F9FAFB">SRT, VTT, TXT</text>
    </g>

    <!-- Synchronized Shadow-DOM Caption Box -->
    <rect x="132" y="406" width="572" height="64" rx="8" fill="#090B0E" stroke="#2E3440"/>
    <text x="418" y="433" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="700" fill="#FDFDFE">That concentration difference drives protons back</text>
    <text x="418" y="457" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="700" fill="#FDFDFE">through the F0 rotor of ATP synthase.</text>

    <!-- Video timeline -->
    <rect x="28" y="496" width="780" height="4" rx="2" fill="#272B33"/>
    <rect x="28" y="496" width="352" height="4" rx="2" fill="#3B82F6"/>
    <circle cx="380" cy="498" r="6" fill="#FDFDFE"/>
    <text x="28" y="519" font-family="DejaVu Sans Mono, monospace" font-size="11" fill="#9CA3AF">01:18 / 03:24</text>
  </g>

  <!-- Right Studio Sidebar -->
  <g transform="translate(924, 146)">
    <rect width="288" height="534" rx="10" fill="#F6F7F8" stroke="#DFE3E8"/>
    <text x="18" y="32" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#111315">Studio library</text>

    <rect x="14" y="48" width="260" height="86" rx="8" fill="#FDFDFE" stroke="#0055D4" stroke-width="1.5"/>
    <text x="28" y="72" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#111315">Cellular ATP Synthesis</text>
    <text x="28" y="92" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#166534">74 cues ready in 2.4s</text>
    <text x="28" y="112" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#525866">3.4 MB audio, synced to cloud</text>

    <rect x="14" y="146" width="260" height="66" rx="8" fill="#FDFDFE" stroke="#DFE3E8"/>
    <text x="28" y="170" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="600" fill="#111315">Membrane Transport Notes</text>
    <text x="28" y="190" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Audio Overview (11m 40s)</text>
  </g>

  <!-- Bottom-right Status Toast -->
  <g transform="translate(876, 698)">
    <rect width="336" height="54" rx="8" fill="#111315" stroke="#272B33"/>
    <circle cx="22" cy="27" r="4.5" fill="#22C55E"/>
    <text x="36" y="24" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#F9FAFB">Captions ready (74 cues, 2.4s)</text>
    <text x="36" y="42" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#9CA3AF">groq, 3.4 MB audio, synced to account</text>
  </g>
</svg>
`;

// Screenshot 02: Audio-Only Stream Extraction + Automatic Failover + Opt-In Cloud Sync
const SCREENSHOT_2_FAILOVER = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#F6F7F8"/>
  ${inlineLogoGroup(72, 48, 42)}
  <text x="128" y="70" font-family="DejaVu Sans, sans-serif" font-size="26" font-weight="700" fill="#111315">Fast audio extraction, queue failover, and opt-in sync</text>
  <text x="128" y="94" font-family="DejaVu Sans, sans-serif" font-size="14.5" fill="#525866">Extracts compact audio in Chrome, retries automatically on HTTP 429, and syncs only what you choose.</text>

  <g transform="translate(72, 132)">
    <rect width="1136" height="604" rx="12" fill="#FDFDFE" stroke="#DFE3E8" stroke-width="1.5"/>
    <line x1="378" y1="0" x2="378" y2="604" stroke="#DFE3E8"/>
    <line x1="757" y1="0" x2="757" y2="604" stroke="#DFE3E8"/>

    <!-- Column 1 -->
    <g transform="translate(28, 32)">
      <rect width="92" height="24" rx="5" fill="#E8F0FE"/>
      <text x="46" y="16" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#0055D4">Audio stream</text>
      <text x="0" y="60" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#111315">3.4 MB audio vs 52 MB video</text>
      <text x="0" y="86" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Selects Google's =m140 audio stream</text>
      <text x="0" y="105" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">or HTTP 206 byte ranges in browser.</text>

      <rect x="0" y="136" width="322" height="172" rx="8" fill="#0F1114"/>
      <text x="16" y="166" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#93C5FD">1. Direct =m140 stream (3.4 MB)</text>
      <text x="16" y="190" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#E5E7EB">   0 ms decode overhead</text>
      <text x="16" y="220" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#93C5FD">2. Fallback on =m22 MP4 (52 MB):</text>
      <text x="16" y="242" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#E5E7EB">   HTTP 206 Range audio slices</text>
      <text x="16" y="264" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#4ADE80">   Skips 93% of video payload</text>

      <rect x="0" y="332" width="322" height="204" rx="8" fill="#F6F7F8" stroke="#DFE3E8"/>
      <text x="18" y="362" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#111315">Measured payload size</text>
      <text x="18" y="394" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#525866">Full HD Video Overview: 52.0 MB</text>
      <rect x="18" y="406" width="286" height="12" rx="4" fill="#9AA3B2"/>
      <text x="18" y="452" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#0055D4">LM Subs audio stream: 3.4 MB</text>
      <rect x="18" y="464" width="20" height="12" rx="4" fill="#0055D4"/>
    </g>

    <!-- Column 2 -->
    <g transform="translate(406, 32)">
      <rect width="104" height="24" rx="5" fill="#E8F0FE"/>
      <text x="52" y="16" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#0055D4">Queue failover</text>
      <text x="0" y="60" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#111315">12 speech-to-text providers</text>
      <text x="0" y="86" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Advances to the next configured key</text>
      <text x="0" y="105" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">automatically on HTTP 429 rate limits.</text>

      <rect x="0" y="136" width="322" height="78" rx="8" fill="#F6F7F8" stroke="#C5CBD4"/>
      <text x="16" y="164" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#111315">#1 Groq (whisper-large-v3-turbo)</text>
      <text x="16" y="188" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#525866">HTTP 429 rate limit -&gt; advancing</text>

      <rect x="0" y="228" width="322" height="80" rx="8" fill="#E7F5EC" stroke="#B8E1C6"/>
      <text x="16" y="256" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#166534">#2 Mistral (voxtral-mini-latest)</text>
      <text x="16" y="280" font-family="DejaVu Sans Mono, monospace" font-size="10.5" fill="#166534">HTTP 200 OK, 74 cues in 2.6s</text>

      <rect x="0" y="332" width="322" height="204" rx="8" fill="#F6F7F8" stroke="#DFE3E8"/>
      <text x="18" y="362" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#111315">Bring your own free-tier keys</text>
      <text x="18" y="392" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">Groq, Mistral, Google Gemini,</text>
      <text x="18" y="416" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">Deepgram, AssemblyAI, Gladia,</text>
      <text x="18" y="440" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">ElevenLabs, Cloudflare, OpenAI,</text>
      <text x="18" y="464" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">OpenRouter, Hugging Face, Local</text>
    </g>

    <!-- Column 3 -->
    <g transform="translate(785, 32)">
      <rect width="108" height="24" rx="5" fill="#E7F5EC"/>
      <text x="54" y="16" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="700" fill="#166534">Hosted account</text>
      <text x="0" y="60" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#111315">Cloud library and metrics</text>
      <text x="0" y="86" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Sign in with Google, GitHub, or</text>
      <text x="0" y="105" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">a 6-digit email verification code.</text>

      <rect x="0" y="136" width="322" height="172" rx="8" fill="#F6F7F8" stroke="#DFE3E8"/>
      <text x="16" y="166" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#111315">Granular sync switches</text>
      <text x="16" y="198" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#525866">Sync encrypted API keys</text>
      <rect x="268" y="184" width="36" height="18" rx="9" fill="#0055D4"/>
      <circle cx="295" cy="193" r="6.5" fill="#FFFFFF"/>
      <text x="16" y="232" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#525866">Sync transcriptions</text>
      <rect x="268" y="218" width="36" height="18" rx="9" fill="#0055D4"/>
      <circle cx="295" cy="227" r="6.5" fill="#FFFFFF"/>
      <text x="16" y="266" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#525866">Sync preferences</text>
      <rect x="268" y="252" width="36" height="18" rx="9" fill="#0055D4"/>
      <circle cx="295" cy="261" r="6.5" fill="#FFFFFF"/>

      <rect x="0" y="332" width="322" height="204" rx="8" fill="#F6F7F8" stroke="#DFE3E8"/>
      <text x="18" y="362" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="700" fill="#111315">Live statistics (/stats)</text>
      <text x="18" y="394" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">Videos captioned &amp; spoken minutes</text>
      <text x="18" y="420" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">Upload bandwidth saved (MB / GB)</text>
      <text x="18" y="446" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">14-day daily transcription chart</text>
      <text x="18" y="472" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">Provider share &amp; latency table</text>
    </g>
  </g>
</svg>
`;

// Screenshot 03: Redesigned Toolbar Popup (`extension/popup.html`)
const SCREENSHOT_3_POPUP = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#EDEFF3"/>
  <rect x="56" y="36" width="1168" height="728" rx="12" fill="#FDFDFE" stroke="#DFE3E8"/>
  <rect x="56" y="36" width="1168" height="44" rx="12" fill="#F6F7F8"/>
  <line x1="56" y1="80" x2="1224" y2="80" stroke="#DFE3E8"/>
  <text x="84" y="63" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#525866">Chrome toolbar popup on notebooklm.google.com</text>

  <!-- Centered 384px Popup Card -->
  <g transform="translate(436, 56)">
    <rect width="408" height="690" rx="12" fill="#F6F7F8" stroke="#C5CBD4" stroke-width="1.5"/>

    <!-- Header -->
    <g transform="translate(18, 16)">
      ${inlineLogoGroup(0, 0, 32)}
      <text x="42" y="15" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" fill="#111315">LM Subs</text>
      <text x="42" y="30" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">NotebookLM captions and transcripts</text>

      <text x="304" y="21" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Auto</text>
      <rect x="336" y="8" width="36" height="20" rx="10" fill="#0055D4"/>
      <circle cx="362" cy="18" r="7" fill="#FFFFFF"/>
    </g>
    <line x1="18" y1="60" x2="390" y2="60" stroke="#DFE3E8"/>

    <!-- Queue Strip -->
    <g transform="translate(18, 70)">
      <rect width="372" height="34" rx="6" fill="#EDEFF3" stroke="#DFE3E8"/>
      <text x="12" y="21" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#525866">Queue: <tspan font-weight="700" fill="#111315">#1 Groq -&gt; #2 Mistral</tspan></text>
      <rect x="312" y="5" width="52" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="338" y="21" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Order</text>
    </g>

    <!-- Provider Card -->
    <g transform="translate(18, 114)">
      <rect width="372" height="198" rx="8" fill="#FDFDFE" stroke="#DFE3E8"/>
      <text x="14" y="24" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#111315">Speech-to-text provider</text>
      <rect x="306" y="10" width="52" height="20" rx="4" fill="#E7F5EC" stroke="#B8E1C6"/>
      <text x="332" y="24" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="10.5" font-weight="600" fill="#166534">Saved</text>

      <rect x="14" y="36" width="344" height="32" rx="6" fill="#F6F7F8" stroke="#DFE3E8"/>
      <text x="24" y="56" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">Groq (Free tier, 8 hrs/day)</text>
      <text x="14" y="86" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Free plan without a card: 20 RPM, whisper-large-v3-turbo.</text>

      <text x="14" y="114" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">API key</text>
      <text x="358" y="114" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#0055D4">Get free key</text>

      <rect x="14" y="122" width="218" height="32" rx="6" fill="#F6F7F8" stroke="#DFE3E8"/>
      <text x="24" y="142" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#767D89">gsk_••••••••••••9xQ2</text>

      <rect x="238" y="122" width="58" height="32" rx="6" fill="#0055D4"/>
      <text x="267" y="142" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">Save</text>

      <rect x="302" y="122" width="56" height="32" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="330" y="142" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">Test</text>

      <text x="14" y="178" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#166534">Verified and synced to your cloud account (240 ms).</text>
    </g>

    <!-- Account & Cloud Sync Card -->
    <g transform="translate(18, 322)">
      <rect width="372" height="96" rx="8" fill="#FDFDFE" stroke="#DFE3E8"/>
      <text x="14" y="24" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#111315">Account and cloud sync</text>
      <rect x="302" y="10" width="56" height="20" rx="4" fill="#E7F5EC" stroke="#B8E1C6"/>
      <text x="330" y="24" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="10.5" font-weight="600" fill="#166534">Synced</text>

      <text x="14" y="46" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">sarang@university.edu, 2 keys, 14 transcripts</text>

      <rect x="14" y="58" width="96" height="26" rx="6" fill="#0055D4"/>
      <text x="62" y="75" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#FFFFFF">Sync now</text>

      <rect x="118" y="58" width="240" height="26" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="238" y="75" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Account and sync options</text>
    </g>

    <!-- Active Tab + Export -->
    <g transform="translate(18, 428)">
      <rect width="372" height="150" rx="8" fill="#FDFDFE" stroke="#DFE3E8"/>
      <text x="14" y="24" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#111315">Active tab</text>
      <rect x="294" y="10" width="64" height="20" rx="4" fill="#E7F5EC" stroke="#B8E1C6"/>
      <text x="326" y="24" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="10.5" font-weight="600" fill="#166534">1 ready</text>

      <text x="14" y="46" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Cellular ATP Synthesis (74 cues)</text>

      <rect x="14" y="56" width="344" height="30" rx="6" fill="#111315"/>
      <text x="186" y="75" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#F6F7F8">Generate captions</text>

      <line x1="14" y1="96" x2="358" y2="96" stroke="#DFE3E8"/>
      <text x="14" y="112" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#525866">Export captions</text>

      <rect x="14" y="118" width="64" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="46" y="134" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="600" fill="#111315">.srt</text>
      <rect x="84" y="118" width="64" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="116" y="134" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="600" fill="#111315">.vtt</text>
      <rect x="154" y="118" width="64" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="186" y="134" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="600" fill="#111315">.txt</text>
      <rect x="224" y="118" width="66" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="257" y="134" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="600" fill="#111315">.json</text>
      <rect x="296" y="118" width="62" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="327" y="134" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#111315">Copy</text>
    </g>

    <!-- Footer -->
    <g transform="translate(18, 592)">
      <rect width="372" height="54" rx="8" fill="#FDFDFE" stroke="#DFE3E8"/>
      <text x="14" y="22" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">Cellular ATP Synthesis</text>
      <text x="14" y="40" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#166534">74 cues, 2.4s, 3.4 MB audio (groq)</text>
    </g>

    <text x="18" y="672" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Diagnostics</text>
    <text x="390" y="672" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#0055D4">Setup guide  |  Settings</text>
  </g>
</svg>
`;

// Screenshot 04: Extension Settings (Account Opt-In Sync + Statistics + Provider Queue)
const SCREENSHOT_4_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#F6F7F8"/>
  <g transform="translate(110, 32)">
    <!-- Header -->
    ${inlineLogoGroup(0, 0, 38)}
    <text x="52" y="18" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="700" fill="#111315">LM Subs settings</text>
    <text x="52" y="36" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">Account sync, opt-in privacy switches, usage statistics, and speech-to-text queue</text>
    <line x1="0" y1="52" x2="1060" y2="52" stroke="#DFE3E8"/>

    <!-- Account & Opt-In Sync Card -->
    <g transform="translate(0, 68)">
      <rect width="1060" height="206" rx="10" fill="#FDFDFE" stroke="#DFE3E8"/>
      <text x="22" y="30" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" fill="#111315">Account and cloud sync</text>
      <rect x="966" y="14" width="72" height="22" rx="5" fill="#E7F5EC" stroke="#B8E1C6"/>
      <text x="1002" y="29" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#166534">Synced</text>

      <rect x="22" y="46" width="1016" height="62" rx="8" fill="#F6F7F8" stroke="#DFE3E8"/>
      <text x="38" y="71" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">sarang@university.edu (Signed in with Google)</text>
      <text x="38" y="92" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#525866">2 encrypted API keys, 25 synced transcripts, hosted Neon Postgres</text>

      <rect x="816" y="61" width="106" height="32" rx="6" fill="#0055D4"/>
      <text x="869" y="81" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">Sync now</text>
      <rect x="932" y="61" width="90" height="32" rx="6" fill="#FDFDFE" stroke="#F4BCBC"/>
      <text x="977" y="81" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#B91C1C">Sign out</text>

      <!-- 3 Opt-In Switches -->
      <g transform="translate(22, 122)">
        <rect width="328" height="66" rx="7" fill="#F6F7F8" stroke="#DFE3E8"/>
        <rect x="14" y="14" width="34" height="18" rx="9" fill="#0055D4"/>
        <circle cx="39" cy="23" r="6.5" fill="#FFFFFF"/>
        <text x="58" y="27" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#111315">Sync API keys</text>
        <text x="14" y="49" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#525866">AES-256-GCM encrypted per user</text>

        <rect x="344" width="328" height="66" rx="7" fill="#F6F7F8" stroke="#DFE3E8"/>
        <rect x="358" y="14" width="34" height="18" rx="9" fill="#0055D4"/>
        <circle cx="383" cy="23" r="6.5" fill="#FFFFFF"/>
        <text x="402" y="27" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#111315">Sync transcriptions</text>
        <text x="358" y="49" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#525866">Instant captions on other browsers</text>

        <rect x="688" width="328" height="66" rx="7" fill="#F6F7F8" stroke="#DFE3E8"/>
        <rect x="702" y="14" width="34" height="18" rx="9" fill="#0055D4"/>
        <circle cx="727" cy="23" r="6.5" fill="#FFFFFF"/>
        <text x="746" y="27" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#111315">Sync preferences</text>
        <text x="702" y="49" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#525866">Provider order and caption display</text>
      </g>
    </g>

    <!-- Statistics Strip Card -->
    <g transform="translate(0, 290)">
      <rect width="1060" height="122" rx="10" fill="#FDFDFE" stroke="#DFE3E8"/>
      <text x="22" y="28" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" fill="#111315">Transcription statistics</text>
      <line x1="22" y1="42" x2="1038" y2="42" stroke="#DFE3E8"/>
      <line x1="276" y1="42" x2="276" y2="108" stroke="#DFE3E8"/>
      <line x1="530" y1="42" x2="530" y2="108" stroke="#DFE3E8"/>
      <line x1="784" y1="42" x2="784" y2="108" stroke="#DFE3E8"/>

      <text x="22" y="76" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="700" fill="#111315">25</text>
      <text x="22" y="96" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Videos captioned</text>

      <text x="296" y="76" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="700" fill="#111315">1,710</text>
      <text x="296" y="96" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Synchronized cues</text>

      <text x="550" y="76" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="700" fill="#111315">1.14 GB</text>
      <text x="550" y="96" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Video upload avoided</text>

      <text x="804" y="76" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="700" fill="#0055D4">2.6s</text>
      <text x="804" y="96" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Median caption speed</text>
    </g>

    <!-- Speech-to-Text Providers Queue -->
    <g transform="translate(0, 428)">
      <rect width="1060" height="304" rx="10" fill="#FDFDFE" stroke="#DFE3E8"/>
      <text x="22" y="30" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" fill="#111315">Speech-to-text providers and API keys</text>
      <text x="1038" y="30" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#525866">Ordered top to bottom with automatic rate-limit failover</text>

      <rect x="22" y="46" width="1016" height="238" rx="8" fill="#FDFDFE" stroke="#DFE3E8"/>

      <!-- Row 1 -->
      <g transform="translate(22, 46)">
        <rect x="16" y="14" width="28" height="20" rx="4" fill="#EDEFF3"/>
        <text x="30" y="28" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#111315">#1</text>
        <text x="54" y="29" font-family="DejaVu Sans, sans-serif" font-size="14" font-weight="700" fill="#111315">Groq</text>
        <rect x="104" y="14" width="144" height="20" rx="4" fill="#E7F5EC"/>
        <text x="176" y="28" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="600" fill="#166534">Saved (gsk_••••9xQ2)</text>

        <rect x="16" y="46" width="520" height="32" rx="6" fill="#F6F7F8" stroke="#DFE3E8"/>
        <text x="28" y="66" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#767D89">Key saved, paste new key to replace</text>
        <rect x="546" y="46" width="256" height="32" rx="6" fill="#F6F7F8" stroke="#DFE3E8"/>
        <text x="558" y="66" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#111315">whisper-large-v3-turbo</text>
        <rect x="812" y="46" width="60" height="32" rx="6" fill="#0055D4"/>
        <text x="842" y="66" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">Save</text>
        <rect x="878" y="46" width="58" height="32" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="907" y="66" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">Test</text>
        <rect x="942" y="46" width="58" height="32" rx="6" fill="#FDFDFE" stroke="#F4BCBC"/>
        <text x="971" y="66" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#B91C1C">Clear</text>
        <line x1="0" y1="94" x2="1016" y2="94" stroke="#DFE3E8"/>
      </g>

      <!-- Row 2 -->
      <g transform="translate(22, 140)">
        <rect x="16" y="14" width="28" height="20" rx="4" fill="#EDEFF3"/>
        <text x="30" y="28" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="700" fill="#111315">#2</text>
        <text x="54" y="29" font-family="DejaVu Sans, sans-serif" font-size="14" font-weight="700" fill="#111315">Mistral (Voxtral)</text>
        <rect x="184" y="14" width="148" height="20" rx="4" fill="#E7F5EC"/>
        <text x="258" y="28" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="10.5" font-weight="600" fill="#166534">Saved (mst_••••4kP8)</text>

        <rect x="16" y="46" width="520" height="32" rx="6" fill="#F6F7F8" stroke="#DFE3E8"/>
        <text x="28" y="66" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#767D89">Key saved, paste new key to replace</text>
        <rect x="546" y="46" width="256" height="32" rx="6" fill="#F6F7F8" stroke="#DFE3E8"/>
        <text x="558" y="66" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#111315">voxtral-mini-latest</text>
        <rect x="812" y="46" width="60" height="32" rx="6" fill="#0055D4"/>
        <text x="842" y="66" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">Save</text>
        <rect x="878" y="46" width="58" height="32" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="907" y="66" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">Test</text>
        <rect x="942" y="46" width="58" height="32" rx="6" fill="#FDFDFE" stroke="#F4BCBC"/>
        <text x="971" y="66" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#B91C1C">Clear</text>
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

console.log("Generated new LM Subs logo, favicons, icons, badges, architecture.svg, social banner, and 4 1280x800 screenshots.");

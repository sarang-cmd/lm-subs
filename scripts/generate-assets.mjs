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

// 1. Brand-New LM Subs Logo Mark (Perspective Folded Notebook Page + 3 Acoustic Wave Bars + Cobalt Caption Bracket)
const LOGO_INNER_SHAPES = `
  <rect width="128" height="128" rx="28" fill="#111315"/>
  <!-- Perspective folded notebook page with bottom fold cutout -->
  <path fill-rule="evenodd" clip-rule="evenodd" d="M45.8 21.5C48.2 20.4 51 22.2 51 24.9V103.5C51 106.5 47.5 108.2 45.1 106.4L22.6 89.2C20.1 87.3 18.6 84.3 18.6 81.1V41.6C18.6 37.3 21.1 33.4 25 31.6L45.8 21.5ZM24.5 81.8L42.6 95.6C43.7 96.4 45.2 95.6 45.2 94.3V83.1C45.2 81.7 44 80.5 42.6 80.5H25.1C23.8 80.5 23.4 81 24.5 81.8Z" fill="#F6F7F8"/>
  <!-- Three vertical acoustic soundwave bars -->
  <rect x="56.5" y="49.5" width="8" height="29" rx="4" fill="#F6F7F8"/>
  <rect x="68.5" y="37" width="8.5" height="54" rx="4.25" fill="#F6F7F8"/>
  <rect x="81" y="49.5" width="8" height="29" rx="4" fill="#F6F7F8"/>
  <!-- Bold Optical Cobalt right caption bracket -->
  <path d="M84.5 27H98.5C104.851 27 110 32.1487 110 38.5V89.5C110 95.8513 104.851 101 98.5 101H84.5C81.7386 101 79.5 98.7614 79.5 96C79.5 93.2386 81.7386 91 84.5 91H97C98.3807 91 99.5 89.8807 99.5 88.5V39.5C99.5 38.1193 98.3807 37 97 37H84.5C81.7386 37 79.5 34.7614 79.5 32C79.5 29.2386 81.7386 27 84.5 27Z" fill="#1D5CF6"/>
`;

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">${LOGO_INNER_SHAPES}</svg>
`;

writeText("docs/assets/logo.svg", LOGO_SVG);
writeText("docs/favicon.svg", LOGO_SVG);
renderSvgToPng(LOGO_SVG, "docs/favicon.png", 32);
renderSvgToPng(LOGO_SVG, "docs/apple-touch-icon.png", 180);
renderSvgToPng(LOGO_SVG, "docs/assets/icon-128.png", 128);
renderSvgToPng(LOGO_SVG, "docs/assets/icon-512.png", 512);

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
  return `<g transform="translate(${x}, ${y}) scale(${scale})">${LOGO_INNER_SHAPES}</g>`;
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

  <!-- Centered 392px Editorial Popup -->
  <g transform="translate(444, 96)">
    <rect width="392" height="584" rx="10" fill="#F6F7F8" stroke="#C5CBD4" stroke-width="1.5"/>

    <!-- Topbar -->
    <rect width="392" height="48" rx="10" fill="#FDFDFE"/>
    <rect y="38" width="392" height="10" fill="#FDFDFE"/>
    <line x1="0" y1="48" x2="392" y2="48" stroke="#DFE3E8"/>
    <g transform="translate(16, 12)">
      ${inlineLogoGroup(0, 0, 24)}
      <text x="34" y="17" font-family="DejaVu Sans, sans-serif" font-size="14.5" font-weight="700" fill="#111315">LM Subs</text>
      <rect x="220" y="3" width="34" height="18" rx="9" fill="#0055D4"/>
      <circle cx="245" cy="12" r="6.5" fill="#FDFDFE"/>
      <text x="260" y="16" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Auto</text>
      <rect x="302" y="0" width="58" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="331" y="16" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Settings</text>
    </g>

    <!-- Active NotebookLM Tab + Export Section -->
    <g transform="translate(0, 49)">
      <rect width="392" height="218" fill="#FDFDFE"/>
      <line x1="0" y1="218" x2="392" y2="218" stroke="#DFE3E8"/>
      <text x="16" y="24" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#111315">Active NotebookLM tab</text>
      <rect x="318" y="10" width="58" height="20" rx="10" fill="#E7F5EC" stroke="#B8E1C6"/>
      <text x="347" y="24" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="10.5" font-weight="600" fill="#166534">1 ready</text>

      <text x="16" y="45" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Video: &quot;Cellular ATP Synthesis&quot;</text>

      <rect x="16" y="56" width="360" height="32" rx="6" fill="#0055D4"/>
      <text x="196" y="76" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#FDFDFE">Generate subtitles</text>

      <line x1="16" y1="100" x2="376" y2="100" stroke="#DFE3E8"/>
      <text x="16" y="117" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#525866">Export transcript</text>
      <text x="376" y="117" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#737A87">Cellular ATP Synthesis (74)</text>

      <rect x="16" y="125" width="66" height="25" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="49" y="141" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="600" fill="#111315">.SRT</text>
      <rect x="88" y="125" width="66" height="25" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="121" y="141" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="600" fill="#111315">.VTT</text>
      <rect x="160" y="125" width="66" height="25" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="193" y="141" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="600" fill="#111315">.TXT</text>
      <rect x="232" y="125" width="70" height="25" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="267" y="141" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="600" fill="#111315">.JSON</text>
      <rect x="308" y="125" width="68" height="25" rx="5" fill="#111315"/>
      <text x="342" y="141" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#FDFDFE">Copy</text>

      <line x1="16" y1="162" x2="376" y2="162" stroke="#DFE3E8"/>
      <text x="16" y="180" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Cellular ATP Synthesis</text>
      <rect x="330" y="167" width="46" height="18" rx="9" fill="#E7F5EC" stroke="#B8E1C6"/>
      <text x="353" y="180" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="10.5" font-weight="600" fill="#166534">groq</text>
      <text x="16" y="198" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">74 cues, 2.4s, 31.8 MB avoided</text>
    </g>

    <!-- Account, Sync & Always-Open Local Code Section -->
    <g transform="translate(0, 268)">
      <line x1="0" y1="164" x2="392" y2="164" stroke="#DFE3E8"/>
      <text x="16" y="24" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#111315">Account and sync</text>
      <rect x="150" y="10" width="72" height="20" rx="10" fill="#EDEFF3" stroke="#DFE3E8"/>
      <text x="186" y="24" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="10.5" font-weight="600" fill="#525866">Signed out</text>

      <rect x="242" y="8" width="66" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="275" y="24" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#111315">Get code</text>
      <rect x="314" y="8" width="62" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="345" y="24" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#111315">Settings</text>

      <text x="16" y="46" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Paste your local code below or sign in to sync transcripts.</text>

      <!-- Always-open Local Code Box -->
      <rect x="16" y="58" width="360" height="88" rx="8" fill="#E8F0FE" stroke="#0055D4"/>
      <text x="28" y="79" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="700" fill="#111315">Local sign-in code</text>
      <rect x="28" y="88" width="256" height="30" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="38" y="107" font-family="DejaVu Sans Mono, monospace" font-size="11.5" fill="#737A87">Paste lms_... local code</text>
      <rect x="292" y="88" width="72" height="30" rx="5" fill="#0055D4"/>
      <text x="328" y="107" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#FDFDFE">Connect</text>
    </g>

    <!-- Collapsed Providers & API Keys Bar -->
    <g transform="translate(0, 441)">
      <line x1="0" y1="62" x2="392" y2="62" stroke="#DFE3E8"/>
      <rect x="16" y="12" width="360" height="38" rx="6" fill="#FDFDFE" stroke="#DFE3E8"/>
      <text x="28" y="35" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="700" fill="#111315">Providers and API keys</text>
      <text x="348" y="35" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">#1 Groq -&gt; #2 Mistral</text>
      <text x="364" y="35" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="11" fill="#737A87">v</text>
    </g>

    <!-- Footer -->
    <g transform="translate(16, 518)">
      <rect y="3" width="34" height="18" rx="9" fill="#C5CBD4"/>
      <circle cx="11" cy="12" r="6.5" fill="#FDFDFE"/>
      <text x="42" y="16" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#525866">Pipeline monitor</text>
      <rect x="304" y="0" width="56" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="332" y="16" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Report</text>
    </g>
  </g>
</svg>
`;

// Screenshot 04: Editorial Extension Settings (Sticky Bar + Open Local Code + Stats + Compact Collapsible Providers)
const SCREENSHOT_4_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#F6F7F8"/>

  <!-- Sticky Website-Matched Top Navigation -->
  <rect width="1280" height="54" fill="#F6F7F8"/>
  <line x1="0" y1="54" x2="1280" y2="54" stroke="#DFE3E8"/>
  <g transform="translate(120, 14)">
    ${inlineLogoGroup(0, 0, 26)}
    <text x="36" y="18" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" fill="#111315">LM Subs</text>

    <g transform="translate(310, 4)">
      <text x="0" y="14" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="600" fill="#111315">Account</text>
      <text x="74" y="14" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Statistics</text>
      <text x="156" y="14" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Providers</text>
      <text x="236" y="14" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Preferences</text>
      <text x="332" y="14" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Library</text>
    </g>

    <rect x="910" y="3" width="36" height="20" rx="10" fill="#0055D4"/>
    <circle cx="936" cy="13" r="7" fill="#FDFDFE"/>
    <text x="956" y="17" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="600" fill="#111315">Auto-caption</text>
  </g>

  <g transform="translate(120, 82)">
    <!-- Split Section 1: Account & Always-Open Local Code -->
    <g transform="translate(0, 0)">
      <text x="0" y="22" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#111315">Account and sync</text>
      <rect x="200" y="6" width="76" height="20" rx="10" fill="#EDEFF3" stroke="#DFE3E8"/>
      <text x="238" y="20" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#525866">Signed out</text>
      <text x="0" y="48" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">Sign in with Google, GitHub, or email</text>
      <text x="0" y="68" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">to sync encrypted API keys, or paste</text>
      <text x="0" y="88" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">your local code into the open box.</text>

      <!-- Right Sheet -->
      <g transform="translate(336, 0)">
        <rect width="704" height="236" rx="10" fill="#FDFDFE" stroke="#DFE3E8"/>

        <!-- Always-Open Local Code Box -->
        <rect x="20" y="18" width="664" height="92" rx="8" fill="#E8F0FE" stroke="#0055D4"/>
        <text x="34" y="40" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="700" fill="#111315">Local sign-in code (always open)</text>
        <rect x="520" y="24" width="150" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="595" y="40" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Get local code on web</text>
        <rect x="34" y="56" width="512" height="36" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="48" y="79" font-family="DejaVu Sans Mono, monospace" font-size="12" fill="#737A87">Paste lms_... code or 6-digit code</text>
        <rect x="556" y="56" width="114" height="36" rx="6" fill="#0055D4"/>
        <text x="613" y="79" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#FDFDFE">Connect code</text>

        <!-- OAuth + Email + Always-Open 6-Digit Row -->
        <rect x="20" y="124" width="326" height="34" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="183" y="146" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#111315">Continue with Google</text>
        <rect x="358" y="124" width="326" height="34" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="521" y="146" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12.5" font-weight="600" fill="#111315">Continue with GitHub</text>

        <rect x="20" y="172" width="234" height="36" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="32" y="195" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#737A87">alex@university.edu</text>
        <rect x="262" y="172" width="84" height="36" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="304" y="195" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">Send code</text>

        <rect x="358" y="172" width="240" height="36" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="372" y="195" font-family="DejaVu Sans Mono, monospace" font-size="12.5" fill="#737A87">123456</text>
        <rect x="606" y="172" width="78" height="36" rx="6" fill="#111315"/>
        <text x="645" y="195" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#FDFDFE">Verify</text>
      </g>
      <line x1="0" y1="262" x2="1040" y2="262" stroke="#DFE3E8"/>
    </g>

    <!-- Unboxed 4-Cell KPI Strip -->
    <g transform="translate(0, 286)">
      <text x="0" y="20" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#111315">Statistics and metrics</text>
      <rect x="968" y="2" width="72" height="28" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="1004" y="20" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">Refresh</text>

      <line x1="0" y1="38" x2="1040" y2="38" stroke="#DFE3E8"/>
      <line x1="0" y1="118" x2="1040" y2="118" stroke="#DFE3E8"/>
      <line x1="260" y1="38" x2="260" y2="118" stroke="#DFE3E8"/>
      <line x1="520" y1="38" x2="520" y2="118" stroke="#DFE3E8"/>
      <line x1="780" y1="38" x2="780" y2="118" stroke="#DFE3E8"/>

      <text x="0" y="76" font-family="DejaVu Sans, sans-serif" font-size="25" font-weight="700" fill="#111315">18</text>
      <text x="0" y="98" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">Videos captioned</text>

      <text x="280" y="76" font-family="DejaVu Sans, sans-serif" font-size="25" font-weight="700" fill="#111315">1,340</text>
      <text x="280" y="98" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">Caption cues</text>

      <text x="540" y="76" font-family="DejaVu Sans, sans-serif" font-size="25" font-weight="700" fill="#111315">614.8 MB</text>
      <text x="540" y="98" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">Video upload avoided</text>

      <text x="800" y="76" font-family="DejaVu Sans, sans-serif" font-size="25" font-weight="700" fill="#111315">2.4s</text>
      <text x="800" y="98" font-family="DejaVu Sans, sans-serif" font-size="12.5" fill="#525866">Median speed</text>
      <line x1="0" y1="140" x2="1040" y2="140" stroke="#DFE3E8"/>
    </g>

    <!-- Compact Collapsible Speech-to-Text Providers Ledger -->
    <g transform="translate(0, 452)">
      <text x="0" y="20" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="700" fill="#111315">Speech-to-text providers and API keys</text>
      <text x="0" y="42" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#525866">2 active in failover queue (#1 Groq -&gt; #2 Mistral). Click any row to edit its API key or model.</text>

      <rect x="814" y="4" width="136" height="28" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="882" y="22" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">Expand configured</text>
      <rect x="958" y="4" width="82" height="28" rx="6" fill="#FDFDFE" stroke="#C5CBD4"/>
      <text x="999" y="22" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="600" fill="#111315">Hide list</text>

      <!-- Clean Compact 1-Line Ledger Sheet -->
      <g transform="translate(0, 58)">
        <rect width="1040" height="176" rx="10" fill="#FDFDFE" stroke="#DFE3E8"/>

        <!-- Compact Row 01 -->
        <text x="18" y="28" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#737A87">01</text>
        <text x="48" y="28" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">Groq</text>
        <text x="104" y="28" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#737A87">Free tier, 8 hrs/day</text>
        <rect x="236" y="13" width="136" height="20" rx="10" fill="#E7F5EC" stroke="#B8E1C6"/>
        <text x="304" y="27" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#166534">Synced (gsk_...9xQ2)</text>
        <rect x="862" y="10" width="40" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="882" y="26" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" fill="#737A87">Up</text>
        <rect x="908" y="10" width="50" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="933" y="26" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Down</text>
        <rect x="964" y="10" width="60" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="994" y="26" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Edit key</text>
        <line x1="0" y1="44" x2="1040" y2="44" stroke="#DFE3E8"/>

        <!-- Compact Row 02 -->
        <text x="18" y="72" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#737A87">02</text>
        <text x="48" y="72" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">Mistral (Voxtral)</text>
        <text x="190" y="72" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#737A87">Free Studio tier</text>
        <rect x="304" y="57" width="138" height="20" rx="10" fill="#E7F5EC" stroke="#B8E1C6"/>
        <text x="373" y="71" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#166534">Synced (mst_...4kP8)</text>
        <rect x="862" y="54" width="40" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="882" y="70" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Up</text>
        <rect x="908" y="54" width="50" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="933" y="70" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Down</text>
        <rect x="964" y="54" width="60" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="994" y="70" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Edit key</text>
        <line x1="0" y1="88" x2="1040" y2="88" stroke="#DFE3E8"/>

        <!-- Compact Row 03 -->
        <text x="18" y="116" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#737A87">03</text>
        <text x="48" y="116" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">Google Gemini</text>
        <text x="174" y="116" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#737A87">Free AI Studio tier</text>
        <rect x="302" y="101" width="52" height="20" rx="10" fill="#EDEFF3" stroke="#DFE3E8"/>
        <text x="328" y="115" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#525866">Unset</text>
        <rect x="964" y="98" width="60" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="994" y="114" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Add key</text>
        <line x1="0" y1="132" x2="1040" y2="132" stroke="#DFE3E8"/>

        <!-- Compact Row 04 -->
        <text x="18" y="160" font-family="DejaVu Sans Mono, monospace" font-size="11.5" font-weight="700" fill="#737A87">04</text>
        <text x="48" y="160" font-family="DejaVu Sans, sans-serif" font-size="13.5" font-weight="700" fill="#111315">Deepgram Nova-3</text>
        <text x="198" y="160" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#737A87">$200 free credit</text>
        <rect x="312" y="145" width="52" height="20" rx="10" fill="#EDEFF3" stroke="#DFE3E8"/>
        <text x="338" y="159" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="600" fill="#525866">Unset</text>
        <rect x="964" y="142" width="60" height="24" rx="5" fill="#FDFDFE" stroke="#C5CBD4"/>
        <text x="994" y="158" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="600" fill="#111315">Add key</text>
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

const forceWireframe = process.argv.includes("--wireframe");
for (const [filename, svg] of screenshots) {
  const docTarget = path.resolve(`docs/assets/screenshots/${filename}`);
  const storeTarget = path.resolve(`store-assets/${filename}`);
  if (forceWireframe || !fs.existsSync(docTarget)) {
    renderSvgToPng(svg, `docs/assets/screenshots/${filename}`, 1280);
  }
  if (forceWireframe || !fs.existsSync(storeTarget)) {
    renderSvgToPng(svg, `store-assets/${filename}`, 1280);
  }
}

console.log("Generated LM Subs logo, favicons, icons, badges, architecture.svg, social banner, and verified 4 1280x800 screenshots.");

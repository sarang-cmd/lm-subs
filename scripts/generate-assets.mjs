#!/usr/bin/env node
/**
 * Renders LM Subs vector brand marks, favicons, README specification badges,
 * and the 4-plane MV3 + Hosted Neon Postgres technical architecture diagram.
 *
 * Note: Product UI screenshots (`docs/assets/screenshots/*.png`) are captured
 * from the real rendered Chrome extension and web application in Chromium,
 * and `docs/assets/banner-social-1280x640.png` is the selected hero asset.
 * Neither is ever overwritten by synthetic SVG generation.
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

// 1. LM Subs Logo Mark (Perspective Folded Notebook Page + 3 Acoustic Wave Bars + Cobalt Caption Bracket)
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

// Multi-browser /favicon.ico wrapping the 32x32 PNG
{
  const png32 = fs.readFileSync("docs/favicon.png");
  const icoHeader = Buffer.alloc(6 + 16);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);
  icoHeader.writeUInt8(32, 6);
  icoHeader.writeUInt8(32, 7);
  icoHeader.writeUInt8(0, 8);
  icoHeader.writeUInt8(0, 9);
  icoHeader.writeUInt16LE(1, 10);
  icoHeader.writeUInt16LE(32, 12);
  icoHeader.writeUInt32LE(png32.length, 14);
  icoHeader.writeUInt32LE(22, 18);
  fs.writeFileSync("docs/favicon.ico", Buffer.concat([icoHeader, png32]));
}

for (const size of [16, 32, 48, 128]) {
  renderSvgToPng(LOGO_SVG, `extension/icons/icon${size}.png`, size);
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
writeText("docs/assets/badges/tests.svg", makeBadge("Tests", "53 / 53 Passing", "#166534"));
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
  <text x="46" y="361" class="sub">Bottom play-bar CC controls</text>
  <text x="46" y="378" class="sub">Word highlight + delay (ms)</text>

  <!-- Lane 2: ISOLATED World -->
  <rect x="292" y="20" width="252" height="420" rx="8" class="lane"/>
  <text x="306" y="44" class="hdr">Isolated World (content.js)</text>
  <text x="306" y="60" class="sub">document_start, Shadow DOM</text>

  <rect x="306" y="78" width="224" height="112" rx="6" class="box"/>
  <text x="318" y="100" class="title">Decision Gate (decide.js)</text>
  <text x="318" y="119" class="sub">Auto-generate vs manual rules</text>
  <text x="318" y="136" class="sub">Deduplicates in-flight jobs</text>
  <text x="318" y="153" class="sub">Audible WebAudio chime alert</text>

  <rect x="306" y="210" width="224" height="208" rx="6" class="box-hi"/>
  <text x="318" y="232" class="title">Play-Bar Caption Overlay</text>
  <text x="318" y="251" class="sub">Docked CC + Transcript pill</text>
  <text x="318" y="268" class="sub">3-state word highlight + delay</text>
  <text x="318" y="285" class="sub">6 styles, 4 fonts, 5 colors</text>
  <text x="318" y="302" class="sub">Inline cue editor + Notebook cite</text>
  <text x="318" y="319" class="sub">SRT, VTT, TXT, JSON, MD, CSV</text>

  <!-- Lane 3: MV3 Service Worker -->
  <rect x="564" y="20" width="268" height="420" rx="8" class="lane"/>
  <text x="578" y="44" class="hdr">MV3 Service Worker (background.js)</text>
  <text x="578" y="60" class="sub">Keyring, Failover Queue, Sync</text>

  <rect x="578" y="78" width="240" height="112" rx="6" class="box-hi"/>
  <text x="590" y="100" class="title">12-Provider STT Queue</text>
  <text x="590" y="119" class="sub">1. Groq Whisper Large v3 Turbo</text>
  <text x="590" y="136" class="sub">2. Mistral Voxtral Mini</text>
  <text x="590" y="153" class="sub">+10 BYOK providers on failover</text>

  <rect x="578" y="210" width="240" height="106" rx="6" class="box"/>
  <text x="590" y="232" class="title">Local Storage + Chime</text>
  <text x="590" y="251" class="sub">chrome.storage.local vault</text>
  <text x="590" y="268" class="sub">Badge status + desktop alert</text>
  <text x="590" y="285" class="sub">Quiet background sync</text>

  <rect x="578" y="336" width="240" height="82" rx="6" class="box"/>
  <text x="590" y="358" class="title">Release Auto-Updater</text>
  <text x="590" y="376" class="sub">/releases/latest.json poll</text>
  <text x="590" y="393" class="sub">1-click unpacked folder apply</text>

  <!-- Lane 4: Hosted Cloud -->
  <rect x="852" y="20" width="248" height="420" rx="8" class="lane"/>
  <text x="866" y="44" class="hdr">Hosted Cloud (Neon Postgres)</text>
  <text x="866" y="60" class="sub">Opt-in per category</text>

  <rect x="866" y="78" width="220" height="112" rx="6" class="box-db"/>
  <text x="878" y="100" class="title">Sign-In (No Self-Host)</text>
  <text x="878" y="119" class="sub">Google, GitHub, 6-digit Email</text>
  <text x="878" y="136" class="sub">Granular sync toggles</text>
  <text x="878" y="153" class="sub">Transcripts, Keys, Preferences</text>

  <rect x="866" y="210" width="220" height="106" rx="6" class="box-db"/>
  <text x="878" y="232" class="title">AES-256-GCM Key Vault</text>
  <text x="878" y="251" class="sub">HKDF-SHA256 per-user key</text>
  <text x="878" y="268" class="sub">Plaintext never returned to UI</text>
  <text x="878" y="285" class="sub">Masked hints only</text>

  <rect x="866" y="336" width="220" height="82" rx="6" class="box"/>
  <text x="878" y="358" class="title">Library + SQL Statistics</text>
  <text x="878" y="376" class="sub">/library &amp; /stats telemetry</text>
  <text x="878" y="393" class="sub">50 ms cross-device cache hit</text>

  <!-- Connectors -->
  <path d="M 258 128 L 303 128" class="arrow" marker-end="url(#ah)"/>
  <path d="M 530 132 L 575 132" class="arrow" marker-end="url(#ah)"/>
  <path d="M 695 192 L 695 207" class="arrow" marker-end="url(#ah)"/>
  <path d="M 578 272 L 533 272" class="arrow" marker-end="url(#ah)"/>
  <path d="M 306 355 L 261 355" class="arrow" marker-end="url(#ah)"/>
  <path d="M 818 135 L 863 135" class="arrow-db" marker-end="url(#ahg)"/>
  <path d="M 863 258 L 818 258" class="arrow-db" marker-end="url(#ahg)"/>
</svg>
`;
writeText("docs/assets/architecture.svg", ARCHITECTURE_SVG);

console.log("Generated LM Subs brand icons, badges, and technical architecture SVG.");

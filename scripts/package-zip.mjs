#!/usr/bin/env node
/**
 * Pure-Node ZIP packager (`scripts/package-zip.mjs`).
 *
 * Packages `extension/` into `docs/releases/lm-subs-v<version>.zip`
 * using Node's built-in `node:zlib` (`deflateRawSync`) with zero external CLI deps.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import { getReleaseNotes } from "../src/lib/release-notes.js";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function collectFiles(rootDir, prefix = "") {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const out = [];
  for (const entry of entries) {
    const abs = path.join(rootDir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...collectFiles(abs, rel));
    } else if (entry.isFile()) {
      out.push({ abs, rel });
    }
  }
  return out;
}

function createZipBuffer(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file.abs);
    const compressed = zlib.deflateRawSync(raw, { level: 9 });
    const useDeflate = compressed.length < raw.length;
    const payload = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;
    const sum = crc32(raw);
    const nameBytes = Buffer.from(file.rel, "utf8");

    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0x5559, 12); // 2026-10-25
    localHeader.writeUInt32LE(sum, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBytes.copy(localHeader, 30);

    const centralHeader = Buffer.alloc(46 + nameBytes.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5559, 14);
    centralHeader.writeUInt32LE(sum, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBytes.copy(centralHeader, 46);

    localParts.push(localHeader, payload);
    centralParts.push(centralHeader);
    offset += localHeader.length + payload.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

const manifest = JSON.parse(fs.readFileSync("extension/manifest.json", "utf8"));
const version = manifest.version || "0.2.2";

// Compute deterministic content buildId over all extension files (excluding build-meta.json)
const sourceFilesForHash = collectFiles("extension", "").filter(
  (f) => f.rel !== "build-meta.json"
);
const buildHasher = crypto.createHash("sha256");
for (const file of sourceFilesForHash) {
  buildHasher.update(file.rel);
  buildHasher.update("\0");
  buildHasher.update(fs.readFileSync(file.abs));
  buildHasher.update("\0");
}
const buildId = buildHasher.digest("hex").slice(0, 12);

fs.writeFileSync(
  path.join("extension", "build-meta.json"),
  `${JSON.stringify({ version, buildId }, null, 2)}\n`
);

const files = collectFiles("extension", "lm-subs");
const zipBuf = createZipBuffer(files);
const zipSha256 = crypto.createHash("sha256").update(zipBuf).digest("hex");

fs.mkdirSync("docs/releases", { recursive: true });
for (const existing of fs.readdirSync("docs/releases")) {
  if (/^lm-subs-v.*\.zip$/.test(existing)) {
    fs.unlinkSync(path.join("docs/releases", existing));
  }
}
const outFile = `docs/releases/lm-subs-v${version}.zip`;
const latestZipFile = "docs/releases/lm-subs-latest.zip";
fs.writeFileSync(outFile, zipBuf);
fs.writeFileSync(latestZipFile, zipBuf);

const notes = getReleaseNotes(version);

const latestManifest = {
  version,
  buildId,
  zipUrl: "/releases/lm-subs-latest.zip",
  versionedZipUrl: `/releases/lm-subs-v${version}.zip`,
  zipSha256,
  fileCount: files.length,
  // Ship the changelog with the release manifest so the update notification can
  // explain what the new version does, offline or not.
  notes: notes
    ? { version: notes.version, headline: notes.headline, highlights: notes.highlights }
    : null,
};
fs.writeFileSync(
  "docs/releases/latest.json",
  `${JSON.stringify(latestManifest, null, 2)}\n`
);

console.log(
  `Packaged ${files.length} files (build ${buildId}) -> ${outFile} & ${latestZipFile} (${(
    zipBuf.length / 1024
  ).toFixed(1)} KB)`
);

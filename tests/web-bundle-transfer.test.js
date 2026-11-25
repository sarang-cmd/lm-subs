import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("public web app lazy-loads secondary views and fingerprints the entry bundle", () => {
  const entry = read("docs/app.js");
  const homepage = read("docs/index.html");
  const shellBuilder = read("scripts/build-shells.mjs");
  const buildScript = read("build.mjs");
  const vercelBuilder = read("scripts/vercel-build.mjs");
  const bundleVersion = crypto.createHash("sha256").update(entry).digest("hex").slice(0, 12);
  const entrySize = fs.statSync(path.join(root, "docs/app.js")).size;
  const chunks = fs.readdirSync(path.join(root, "docs/chunks"));
  const htmlFiles = [];
  const collectHtml = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) collectHtml(absolute);
      else if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(absolute);
    }
  };
  collectHtml(path.join(root, "docs"));

  assert.ok(entrySize < 450_000, `entry bundle should remain split, got ${entrySize} bytes`);
  assert.ok(chunks.length >= 8, "lazy views should be emitted as separate chunks");
  assert.ok(entry.includes('import("./chunks/'));
  assert.ok(homepage.includes(`/app.js?v=${bundleVersion}`));
  for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, "utf8");
    const appScripts = [...html.matchAll(/src=[\"']([^\"']*\/app\.js(?:\?[^\"']*)?)[\"']/g)];
    for (const [, src] of appScripts) {
      assert.ok(src.includes(`/app.js?v=${bundleVersion}`), `${path.relative(root, htmlFile)} uses the current app hash`);
    }
  }
  assert.match(shellBuilder, /APP_BUNDLE_VERSION/);
  assert.ok(buildScript.includes("splitting: true"));
  assert.match(vercelBuilder, /max-age=31536000, immutable/);
  assert.match(vercelBuilder, /max-age=3600, stale-while-revalidate=86400/);
  assert.match(vercelBuilder, /stale-while-revalidate=604800/);
  assert.match(vercelBuilder, /lm-subs-v\[0-9\]/);
  for (const chunk of chunks) {
    assert.ok(fs.existsSync(path.join(root, "docs/chunks", chunk)), `${chunk} exists`);
  }
});

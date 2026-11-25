#!/usr/bin/env node
/**
 * Bundles `src/` modules into:
 * 1. Standalone zero-dependency MV3 scripts in `extension/`
 * 2. Production React + Radix web app in `docs/app.js` plus hashed lazy-load chunks
 */

import fs from "node:fs";
import { createHash } from "node:crypto";
import * as esbuild from "esbuild";
import { generateProjectStatsFile } from "./scripts/generate-project-stats.mjs";

generateProjectStatsFile();

const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  target: ["chrome116", "safari17", "firefox118"],
  logLevel: "info",
  legalComments: "none",
};

const targets = [
  {
    ...shared,
    entryPoints: ["src/background/service-worker.js"],
    outfile: "extension/background.js",
    format: "esm",
  },
  {
    ...shared,
    entryPoints: ["src/page/inject.js"],
    outfile: "extension/page.js",
    format: "iife",
  },
  {
    ...shared,
    entryPoints: ["src/content/content.js"],
    outfile: "extension/content.js",
    format: "iife",
  },
  {
    ...shared,
    entryPoints: ["src/popup/popup.js"],
    outfile: "extension/popup.js",
    format: "iife",
  },
  {
    ...shared,
    entryPoints: ["src/options/options.js"],
    outfile: "extension/options.js",
    format: "iife",
  },
];

if (fs.existsSync("src/web/main.jsx")) {
  targets.push({
    ...shared,
    entryPoints: ["src/web/main.jsx"],
    outdir: "docs",
    entryNames: "app",
    chunkNames: "chunks/[name]-[hash]",
    splitting: true,
    format: "esm",
    jsx: "automatic",
    minify: !watch,
    define: {
      "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production"),
    },
  });
}

if (!watch) {
  fs.rmSync("docs/chunks", { recursive: true, force: true });
}

if (watch) {
  const contexts = await Promise.all(targets.map((t) => esbuild.context(t)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("Watching src/ for changes...");
} else {
  await Promise.all(targets.map((t) => esbuild.build(t)));

  const appPath = "docs/app.js";
  if (fs.existsSync(appPath)) {
    const appVersion = createHash("sha256")
      .update(fs.readFileSync(appPath))
      .digest("hex")
      .slice(0, 12);
    const updateAppReferences = (directory) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === ".vercel") continue;
        const file = `${directory}/${entry.name}`;
        if (entry.isDirectory()) {
          updateAppReferences(file);
        } else if (entry.isFile() && entry.name.endsWith(".html")) {
          const html = fs.readFileSync(file, "utf8");
          const updated = html.replace(
            /(\bsrc=["'])\/app\.js(?:\?[^"']*)?(["'])/g,
            `$1/app.js?v=${appVersion}$2`
          );
          if (updated !== html) fs.writeFileSync(file, updated, "utf8");
        }
      }
    };
    updateAppReferences("docs");
  }
}

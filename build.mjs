#!/usr/bin/env node
/**
 * Bundles `src/` modules into:
 * 1. Standalone zero-dependency MV3 scripts in `extension/`
 * 2. Production React + Radix Primitives + Motion web bundle in `docs/app.js`
 */

import fs from "node:fs";
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
    outfile: "docs/app.js",
    format: "esm",
    jsx: "automatic",
    minify: !watch,
    define: {
      "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production"),
    },
  });
}

if (watch) {
  const contexts = await Promise.all(targets.map((t) => esbuild.context(t)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("Watching src/ for changes...");
} else {
  await Promise.all(targets.map((t) => esbuild.build(t)));
}

#!/usr/bin/env node
/**
 * Bundles `src/` modules into standalone zero-dependency MV3 scripts in `extension/`.
 */

import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  target: ["chrome116"],
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

if (watch) {
  const contexts = await Promise.all(targets.map((t) => esbuild.context(t)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("Watching src/ for changes...");
} else {
  await Promise.all(targets.map((t) => esbuild.build(t)));
}

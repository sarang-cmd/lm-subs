/**
 * Vercel Build Output API v3 Builder (`scripts/vercel-build.mjs`).
 *
 * Produces a self-contained `.vercel/output` bundle (static site + Node.js 24
 * Serverless Function `/api/index`) in `process.cwd()` so Vercel deployments
 * succeed identically whether the Vercel project's `rootDirectory` is set to
 * the repository root (`.`) or `docs`.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(REPO_ROOT, "docs");
const CWD = process.cwd();
const OUT_DIR = path.join(CWD, ".vercel", "output");
const STATIC_OUT = path.join(OUT_DIR, "static");
const FUNC_OUT = path.join(OUT_DIR, "functions", "api", "index.func");

// 1. Run standard extension + web bundle build AND release zip/manifest packager at repository root
execFileSync(process.execPath, [path.join(REPO_ROOT, "build.mjs")], {
  cwd: REPO_ROOT,
  stdio: "inherit",
});
execFileSync(
  process.execPath,
  [path.join(REPO_ROOT, "scripts", "package-zip.mjs")],
  {
    cwd: REPO_ROOT,
    stdio: "inherit",
  }
);

const latestMetaJson = fs.existsSync(path.join(DOCS_DIR, "releases", "latest.json"))
  ? fs.readFileSync(path.join(DOCS_DIR, "releases", "latest.json"), "utf8")
  : "";

// 2. Clean any previous .vercel/output directory
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(STATIC_OUT, { recursive: true });
fs.mkdirSync(FUNC_OUT, { recursive: true });

// 3. Copy static site files from docs/ into .vercel/output/static (skipping .vercel)
function copyStaticTree(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name === ".vercel" || entry.name === "node_modules") continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyStaticTree(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyStaticTree(DOCS_DIR, STATIC_OUT);

// Guarantee clean URLs like /welcome, /setup, /guide, /stats, /about, /library, /privacy, /terms also resolve directly
for (const page of ["welcome", "setup", "guide", "about", "stats", "library", "privacy", "terms"]) {
  const htmlFile = path.join(STATIC_OUT, `${page}.html`);
  if (fs.existsSync(htmlFile)) {
    const cleanDir = path.join(STATIC_OUT, page);
    fs.mkdirSync(cleanDir, { recursive: true });
    fs.copyFileSync(htmlFile, path.join(cleanDir, "index.html"));
  }
}

// 4. Bundle api/index.js + server/* + pg + hono + jose into a fast, zero-dependency ESM function
await build({
  entryPoints: [path.join(REPO_ROOT, "api", "index.js")],
  outfile: path.join(FUNC_OUT, "index.mjs"),
  bundle: true,
  platform: "node",
  target: ["node22"],
  format: "esm",
  sourcemap: false,
  legalComments: "none",
  external: ["@electric-sql/pglite", "pg-native"],
  define: {
    "process.env.LMSUBS_RELEASE_META_JSON": JSON.stringify(latestMetaJson),
  },
  banner: {
    js: "import { createRequire as __lmsCreateRequire } from 'node:module'; const require = __lmsCreateRequire(import.meta.url);",
  },
  logLevel: "info",
});

fs.writeFileSync(
  path.join(FUNC_OUT, "package.json"),
  JSON.stringify({ type: "module" }, null, 2)
);

fs.writeFileSync(
  path.join(FUNC_OUT, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs24.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      maxDuration: 60,
      shouldAddHelpers: true,
    },
    null,
    2
  )
);

// 5. Write Build Output API v3 config.json
fs.writeFileSync(
  path.join(OUT_DIR, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: "^/releases/(.*)$",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          },
          continue: true,
        },
        {
          src: "^/releases/(.*\\.zip)$",
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": "attachment",
          },
          continue: true,
        },
        {
          src: "^/(.*)$",
          headers: {
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
          continue: true,
        },
        {
          src: "^/api(?:/(.*))?$",
          dest: "/api/index?__lms_path=$1",
        },
        {
          handle: "filesystem",
        },
        {
          src: "^/(welcome|setup|guide|install|about|library|workspace|stats)/?$",
          dest: "/index.html",
        },
      ],
    },
    null,
    2
  )
);

console.log(`Built Vercel Output API v3 bundle -> ${OUT_DIR}`);

// If Vercel ran inside a subdirectory (e.g. rootDirectory="docs"), mirror .vercel/output to REPO_ROOT too
if (path.resolve(CWD) !== path.resolve(REPO_ROOT)) {
  const rootOutDir = path.join(REPO_ROOT, ".vercel", "output");
  fs.rmSync(rootOutDir, { recursive: true, force: true });
  fs.cpSync(OUT_DIR, rootOutDir, { recursive: true });
  console.log(`Mirrored Vercel Output API v3 bundle -> ${rootOutDir}`);
}

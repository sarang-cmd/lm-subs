#!/usr/bin/env node
/**
 * Zero-dependency static preview server for `docs/` (`npm run site`).
 * Binds to `0.0.0.0` so live browser previews work out of the box.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const PORT = Number(process.env.PORT) || 4173;
const DOCS_ROOT = path.resolve("docs");

const MIME_MAP = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".zip": "application/zip",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || "/", "http://localhost");
  let pathname = decodeURIComponent(reqUrl.pathname);
  if (pathname === "/") pathname = "/index.html";

  const resolved = path.resolve(DOCS_ROOT, `.${pathname}`);
  if (!resolved.startsWith(DOCS_ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  let target = resolved;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  } else if (!fs.existsSync(target) && fs.existsSync(`${target}.html`)) {
    target = `${target}.html`;
  }

  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(target).toLowerCase();
  const headers = {
    "Content-Type": MIME_MAP[ext] || "application/octet-stream",
    "Cache-Control": "no-cache",
  };
  if (ext === ".zip") {
    headers["Content-Disposition"] = `attachment; filename="${path.basename(target)}"`;
  }

  res.writeHead(200, headers);
  fs.createReadStream(target).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serving docs/ at http://0.0.0.0:${PORT}`);
});

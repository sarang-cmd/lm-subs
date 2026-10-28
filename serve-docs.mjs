#!/usr/bin/env node
/**
 * Unified local HTTP server for the LM Subs web application (`docs/`)
 * AND the Hono + Neon Lakebase Postgres Cloud Sync & Metrics API (`/api/*`).
 *
 * Binds to `0.0.0.0:4173` (or `PORT`) so Live Preview works cleanly.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createSyncApp } from "./server/app.js";

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const DOCS_DIR = path.resolve("docs");

const syncApp = createSyncApp();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".ico": "image/x-icon",
};

const SPA_ROUTES = new Set([
  "/",
  "/welcome",
  "/setup",
  "/guide",
  "/install",
  "/about",
  "/library",
  "/workspace",
  "/stats",
  "/admin",
  "/privacy",
  "/terms",
]);

async function forwardToHono(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || `localhost:${PORT}`;
  const fullUrl = `${proto}://${host}${req.url || "/"}`;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const bodyBuf = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) headers.set(k, v.join(", "));
    else if (typeof v === "string") headers.set(k, v);
  }

  const webReq = new Request(fullUrl, {
    method: req.method || "GET",
    headers,
    body:
      req.method === "GET" || req.method === "HEAD" ? undefined : bodyBuf,
  });

  const webRes = await syncApp.fetch(webReq);
  const resHeaders = {};
  webRes.headers.forEach((value, key) => {
    resHeaders[key] = value;
  });
  const arrayBuf = await webRes.arrayBuffer();
  res.writeHead(webRes.status, resHeaders);
  res.end(Buffer.from(arrayBuf));
}

const server = http.createServer(async (req, res) => {
  try {
    const rawUrl = (req.url || "/").split("?")[0].split("#")[0];

    if (rawUrl === "/api" || rawUrl.startsWith("/api/")) {
      await forwardToHono(req, res);
      return;
    }

    const normalized = rawUrl.replace(/\/+$/, "") || "/";
    let relPath = normalized === "/" ? "/index.html" : normalized;

    // Support clean URLs (/privacy -> /privacy.html), directory indexes
    // (/blog -> /blog/index.html), and SPA routes (/stats, /library)
    let candidate = path.resolve(DOCS_DIR, `.${relPath}`);
    if (
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isDirectory() &&
      fs.existsSync(path.join(candidate, "index.html"))
    ) {
      candidate = path.join(candidate, "index.html");
    } else if (
      !path.extname(candidate) &&
      fs.existsSync(`${candidate}.html`) &&
      fs.statSync(`${candidate}.html`).isFile()
    ) {
      candidate = `${candidate}.html`;
    } else if (
      SPA_ROUTES.has(normalized) &&
      (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile())
    ) {
      candidate = path.resolve(DOCS_DIR, "index.html");
    }

    if (!candidate.startsWith(DOCS_DIR)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(candidate).toLowerCase();
    const outHeaders = {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    };
    if (normalized.startsWith("/releases/")) {
      outHeaders["Access-Control-Allow-Origin"] = "*";
    }
    res.writeHead(200, outHeaders);
    fs.createReadStream(candidate).pipe(res);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({ ok: false, error: err?.message || "Server error" })
    );
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `LM Subs Web App + Cloud API listening on http://${HOST}:${PORT}`
  );
});

/**
 * Vercel Serverless / Fluid Compute universal API router (`api/index.js`).
 *
 * Supports both:
 * 1. Web Standard Fetch handlers (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`)
 * 2. Node.js `(req, res)` Serverless Launcher (`export default handler(req, res)`)
 *
 * Works deterministically whether Vercel preserves the incoming `request.url`
 * (`/api/auth/oauth/google?next=%2Flibrary`) or rewrites `request.url` to
 * `/api/index?__lms_path=auth%2Foauth%2Fgoogle&next=%2Flibrary`.
 */

import { handle } from "hono/vercel";
import { createSyncApp } from "../server/app.js";

const app = createSyncApp();
const baseHandler = handle(app);

export function normalizeVercelRequest(request) {
  const url = new URL(request.url);
  const rewrittenSubpath = url.searchParams.get("__lms_path");

  if (
    rewrittenSubpath !== null &&
    (url.pathname === "/api/index" ||
      url.pathname === "/api/index.js" ||
      url.pathname === "/api")
  ) {
    const cleanSub = rewrittenSubpath.replace(/^\/+/, "");
    url.pathname = cleanSub ? `/api/${cleanSub}` : "/api";
  }

  if (rewrittenSubpath !== null) {
    url.searchParams.delete("__lms_path");
    return new Request(url.toString(), request);
  }

  return request;
}

export async function nodeReqToWebRequest(req) {
  const protoHeader = String(req.headers?.["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();
  const hostHeader = String(
    req.headers?.["x-forwarded-host"] || req.headers?.host || "localhost"
  )
    .split(",")[0]
    .trim();
  const rawUrl = req.url || "/";
  const fullUrl = rawUrl.startsWith("http")
    ? rawUrl
    : `${protoHeader}://${hostHeader}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

  const method = String(req.method || "GET").toUpperCase();
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (Array.isArray(v)) {
      for (const item of v) headers.append(k, item);
    } else if (typeof v === "string") {
      headers.set(k, v);
    }
  }

  let body;
  if (method !== "GET" && method !== "HEAD") {
    if (req.body !== undefined && req.body !== null) {
      if (Buffer.isBuffer(req.body) || req.body instanceof Uint8Array) {
        body = req.body;
      } else if (typeof req.body === "string") {
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
      }
    } else if (typeof req[Symbol.asyncIterator] === "function") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      if (chunks.length > 0) {
        body = Buffer.concat(chunks);
      }
    }
  }

  return new Request(fullUrl, { method, headers, body });
}

export function createVercelDispatcher(handlerFn = baseHandler) {
  return async (reqOrRequest, maybeRes) => {
    // Node.js (IncomingMessage, ServerResponse) invocation path
    if (maybeRes && typeof maybeRes.end === "function") {
      const webReq = normalizeVercelRequest(
        await nodeReqToWebRequest(reqOrRequest)
      );
      const webRes = await handlerFn(webReq);
      maybeRes.statusCode = webRes.status;

      const setCookies =
        typeof webRes.headers.getSetCookie === "function"
          ? webRes.headers.getSetCookie()
          : [];
      if (setCookies.length > 0) {
        maybeRes.setHeader("set-cookie", setCookies);
      }
      webRes.headers.forEach((val, key) => {
        if (key.toLowerCase() === "set-cookie") return;
        maybeRes.setHeader(key, val);
      });

      if (webReq.method === "HEAD" || !webRes.body) {
        maybeRes.end();
        return;
      }
      const ab = await webRes.arrayBuffer();
      maybeRes.end(Buffer.from(ab));
      return;
    }

    // Standard Web Fetch Request -> Response invocation path
    return handlerFn(normalizeVercelRequest(reqOrRequest));
  };
}

const dispatch = createVercelDispatcher(baseHandler);

export default dispatch;
export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
export const OPTIONS = dispatch;
export const HEAD = dispatch;

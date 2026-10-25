/**
 * Vercel Serverless / Fluid Compute single-entry API router (`api/index.js`).
 *
 * Paired with `vercel.json` rewrites:
 * - `/api`        -> `/api/index?__lms_path=`
 * - `/api/:path*` -> `/api/index?__lms_path=:path*`
 *
 * Works deterministically whether Vercel's runtime preserves the original
 * incoming `request.url` (`/api/auth/oauth/google?next=%2Flibrary`) or rewrites
 * `request.url` to `/api/index?__lms_path=auth%2Foauth%2Fgoogle&next=%2Flibrary`.
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

export function createVercelDispatcher(handlerFn = baseHandler) {
  return (request) => handlerFn(normalizeVercelRequest(request));
}

const dispatch = createVercelDispatcher(baseHandler);

export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
export const OPTIONS = dispatch;
export const HEAD = dispatch;

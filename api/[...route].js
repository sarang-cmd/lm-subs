/**
 * Vercel Serverless / Fluid Compute catch-all handler (`api/[...route].js`).
 *
 * Routes `/api/*` requests on Vercel directly to the LM Subs Hono + Neon Lakebase Postgres app.
 */

import { handle } from "hono/vercel";
import { createSyncApp } from "../server/app.js";

const app = createSyncApp();

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

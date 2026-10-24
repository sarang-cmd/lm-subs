/**
 * Neon Functions entrypoint (`server/neon-function.js`).
 *
 * Exports a Web-standard `{ fetch(request) }` Hono handler with `DATABASE_URL`,
 * `NEON_AUTH_BASE_URL`, and `NEON_AUTH_JWKS_URL` injected automatically on the Neon branch.
 *
 * Deploy manually if desired in supported regions (`aws-us-east-1/2`, `aws-eu-central-1`, `aws-ap-southeast-1`):
 *   neon functions deploy lmsubs --src server/neon-function.js
 */

import { createSyncApp } from "./app.js";

const app = createSyncApp();

export default app;

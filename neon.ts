import { defineConfig } from "@neon/config/v1";

/**
 * Neon Infrastructure-as-Code (`neon.ts`) for LM Subs
 * Project: `falling-cherry-16443194` (`org-snowy-moon-42934547`, branch `production`).
 *
 * `neon deploy` provisions:
 * - Lakebase Postgres (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`)
 * - Neon Managed Better Auth (`NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`)
 * and pulls those environment variables into `.env.local` (or `.env`).
 */
export default defineConfig({
  auth: true,
  branch: (branch) => {
    if (branch.isDefault) {
      return {};
    }
    if (!branch.exists) {
      return { ttl: "7d" };
    }
    return {};
  },
});

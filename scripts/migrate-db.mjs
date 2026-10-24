#!/usr/bin/env node
/**
 * Applies `db/schema.sql` directly to Neon Lakebase Postgres using the direct
 * (unpooled) connection string `DATABASE_URL_UNPOOLED` (or `DATABASE_URL`),
 * per the `neon-postgres` migration best practices.
 */

import { createDatabaseClient, loadLocalEnvFiles } from "../server/db.js";

loadLocalEnvFiles();

const directUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";

const db = await createDatabaseClient({ connectionString: directUrl });
const check = await db.query(
  `SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name LIKE 'lmsubs_%'
   ORDER BY table_name`
);

console.log(
  `[${db.mode}] Verified ${check.rows.length} LM Subs tables:`,
  check.rows.map((r) => r.table_name).join(", ")
);
await db.close();

/**
 * Lakebase Postgres Connection & Schema Bootstrap (`server/db.js`).
 *
 * Follows Neon Agent Skills (`neon-postgres` & `neon-functions`):
 * - Uses `pg` (`Pool`) + `attachDatabasePool(pool)` from `@neon/functions` and
 *   validates `DATABASE_URL` via `@neon/env` (`parseEnv(neonConfig, ["DATABASE_URL"])`)
 *   when connected to Neon (`falling-cherry-16443194`) on Vercel, Neon Functions, or local `.env.local`.
 * - Automatically falls back to an embedded real PostgreSQL 16 instance (`@electric-sql/pglite`)
 *   when `DATABASE_URL` has not been pulled yet so local dev & automated E2E tests
 *   execute identical PostgreSQL SQL, JSONB, TIMESTAMPTZ, and foreign-key constraints.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "@neon/env";
import { attachDatabasePool } from "@neon/functions";
import pg from "pg";
import neonConfig from "../neon.ts";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SCHEMA_SQL_PATH = path.join(ROOT_DIR, "db", "schema.sql");

let envFilesLoaded = false;

export function loadLocalEnvFiles() {
  if (envFilesLoaded) return;
  envFilesLoaded = true;
  for (const filename of [".env.local", ".env"]) {
    const fullPath = path.join(ROOT_DIR, filename);
    if (!fs.existsSync(fullPath)) continue;
    const raw = fs.readFileSync(fullPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined && val !== "") {
        process.env[key] = val;
      }
    }
  }
}

export function getSchemaSql() {
  return fs.readFileSync(SCHEMA_SQL_PATH, "utf8");
}

let sharedDbPromise = null;

export async function createDatabaseClient({
  connectionString = "",
  pgliteDataDir = null,
  inMemory = false,
} = {}) {
  loadLocalEnvFiles();

  let resolvedUrl = connectionString;
  if (!resolvedUrl && !inMemory && process.env.DATABASE_URL) {
    try {
      const { postgres } = parseEnv(neonConfig, ["DATABASE_URL"]);
      resolvedUrl = postgres.databaseUrl;
    } catch {
      resolvedUrl = process.env.DATABASE_URL;
    }
  }

  if (resolvedUrl && !inMemory) {
    const pool = new Pool({
      connectionString: resolvedUrl,
      max: 5,
    });
    attachDatabasePool(pool);

    const schemaSql = getSchemaSql();
    await pool.query(schemaSql);

    return {
      mode: "neon-postgres",
      projectId: "falling-cherry-16443194",
      query: (text, params = []) => pool.query(text, params),
      close: () => pool.end(),
    };
  }

  // Embedded real PostgreSQL 16 (`@electric-sql/pglite`) fallback when `.env.local`
  // has not been pulled yet via `neon login && neon deploy`
  const { PGlite } = await import("@electric-sql/pglite");
  const targetDir = inMemory
    ? undefined
    : pgliteDataDir || path.join(ROOT_DIR, ".data", "pglite");
  if (targetDir) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const pglite = targetDir ? new PGlite(targetDir) : new PGlite();
  await pglite.exec(getSchemaSql());

  return {
    mode: "pglite-postgres",
    projectId: "falling-cherry-16443194",
    query: async (text, params = []) => {
      const res = await pglite.query(text, params);
      return {
        rows: res.rows || [],
        rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
      };
    },
    close: () => pglite.close(),
  };
}

export function getSharedDatabase(options = {}) {
  if (!sharedDbPromise) {
    sharedDbPromise = createDatabaseClient(options);
  }
  return sharedDbPromise;
}

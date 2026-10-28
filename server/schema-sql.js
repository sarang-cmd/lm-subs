/**
 * Bundled PostgreSQL DDL (`server/schema-sql.js`).
 *
 * Exported as a pure ES module string so serverless bundlers (`@vercel/nft`,
 * Fluid Compute, Neon Functions) include the schema directly in the JS module
 * graph without relying on runtime filesystem paths. Kept in lockstep with `db/schema.sql`.
 */

export const SCHEMA_SQL = `-- LM Subs Hosted Cloud Schema (Neon Lakebase Postgres: \`falling-cherry-16443194\`)
-- Idempotent DDL for Google/GitHub/Email authentication, granular sync opt-in preferences,
-- AES-256-GCM encrypted BYOK API keys, subtitle transcripts, and real usage metrics.

CREATE TABLE IF NOT EXISTS lmsubs_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lmsubs_users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS lmsubs_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES lmsubs_users(id) ON DELETE CASCADE,
  device_label TEXT NOT NULL DEFAULT 'web',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lmsubs_sessions_user
  ON lmsubs_sessions (user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS lmsubs_email_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lmsubs_oauth_states (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  redirect_after TEXT NOT NULL DEFAULT '/?view=library',
  device_label TEXT NOT NULL DEFAULT 'web',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lmsubs_user_settings (
  user_id TEXT PRIMARY KEY REFERENCES lmsubs_users(id) ON DELETE CASCADE,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sync_prefs_json JSONB NOT NULL DEFAULT '{"syncApiKeys":true,"syncTranscripts":true,"syncSettings":true}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lmsubs_user_settings
  ADD COLUMN IF NOT EXISTS sync_prefs_json JSONB NOT NULL DEFAULT '{"syncApiKeys":true,"syncTranscripts":true,"syncSettings":true}'::jsonb;

CREATE TABLE IF NOT EXISTS lmsubs_user_api_keys (
  user_id TEXT NOT NULL REFERENCES lmsubs_users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  ciphertext_b64 TEXT NOT NULL,
  iv_b64 TEXT NOT NULL,
  tag_b64 TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider_id)
);

CREATE TABLE IF NOT EXISTS lmsubs_subtitles (
  user_id TEXT NOT NULL REFERENCES lmsubs_users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  artifact_id TEXT,
  notebook_id TEXT,
  media_token TEXT,
  title TEXT NOT NULL DEFAULT 'Video Overview',
  language TEXT NOT NULL DEFAULT 'en',
  provider TEXT,
  model TEXT,
  cue_count INTEGER NOT NULL DEFAULT 0,
  spoken_seconds INTEGER,
  original_bytes BIGINT,
  extracted_bytes BIGINT,
  latency_ms INTEGER,
  failover_used BOOLEAN NOT NULL DEFAULT FALSE,
  cues_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, cache_key)
);

ALTER TABLE lmsubs_subtitles
  ADD COLUMN IF NOT EXISTS spoken_seconds INTEGER;

ALTER TABLE lmsubs_subtitles
  ADD COLUMN IF NOT EXISTS failover_used BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lmsubs_subtitles_user_updated
  ON lmsubs_subtitles (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lmsubs_subtitles_artifact
  ON lmsubs_subtitles (user_id, artifact_id);

CREATE TABLE IF NOT EXISTS lmsubs_usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES lmsubs_users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  cache_key TEXT,
  provider TEXT,
  language TEXT,
  format TEXT,
  cue_count INTEGER NOT NULL DEFAULT 0,
  spoken_seconds INTEGER NOT NULL DEFAULT 0,
  original_bytes BIGINT NOT NULL DEFAULT 0,
  extracted_bytes BIGINT NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  failover_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lmsubs_usage_events_user_created
  ON lmsubs_usage_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lmsubs_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES lmsubs_users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  cache_key TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lmsubs_notifications_user_created
  ON lmsubs_notifications (user_id, created_at DESC);

-- Anonymous extension download counters. No IP address, no user agent string and
-- no account identifier is ever stored: only the version, the channel, the page
-- that offered the file, the coarse browser family, and the country Vercel
-- already resolves from the edge request.
CREATE TABLE IF NOT EXISTS lmsubs_downloads (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'site',
  source TEXT NOT NULL DEFAULT '',
  browser TEXT NOT NULL DEFAULT 'other',
  country TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lmsubs_downloads_occurred
  ON lmsubs_downloads (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_lmsubs_downloads_version
  ON lmsubs_downloads (version, occurred_at DESC);
`;

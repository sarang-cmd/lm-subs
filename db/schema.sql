-- LM Subs — Lakebase Postgres Schema (Neon `falling-cherry-16443194`)
-- Idempotent DDL for user accounts, sessions, preferences, AES-256-GCM encrypted
-- BYOK API keys, and cross-device NotebookLM Video Overview subtitle sync.

CREATE TABLE IF NOT EXISTS lmsubs_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'neon',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lmsubs_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES lmsubs_users(id) ON DELETE CASCADE,
  device_label TEXT NOT NULL DEFAULT 'web',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lmsubs_sessions_user
  ON lmsubs_sessions (user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS lmsubs_user_settings (
  user_id TEXT PRIMARY KEY REFERENCES lmsubs_users(id) ON DELETE CASCADE,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  original_bytes BIGINT,
  extracted_bytes BIGINT,
  latency_ms INTEGER,
  cues_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_lmsubs_subtitles_user_updated
  ON lmsubs_subtitles (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lmsubs_subtitles_artifact
  ON lmsubs_subtitles (user_id, artifact_id);

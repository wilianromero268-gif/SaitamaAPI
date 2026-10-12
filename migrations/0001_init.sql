PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 password_hash TEXT, google_sub TEXT UNIQUE, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS api_keys (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 key_hash TEXT NOT NULL UNIQUE, key_prefix TEXT NOT NULL, label TEXT NOT NULL DEFAULT 'Mi API key',
 created_at TEXT NOT NULL DEFAULT (datetime('now')), revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS usage_daily (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 day TEXT NOT NULL, requests INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id, day)
);
CREATE TABLE IF NOT EXISTS request_logs (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 endpoint TEXT NOT NULL, status INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS keys_user_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS logs_user_idx ON request_logs(user_id, created_at);

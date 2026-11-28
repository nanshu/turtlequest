-- TurtleQuest multi-user D1 schema (SQLite)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_lower TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  pin_iterations INTEGER NOT NULL DEFAULT 100000,
  xp INTEGER NOT NULL DEFAULT 0,
  gems INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  daily_xp INTEGER NOT NULL DEFAULT 0,
  daily_date TEXT,
  daily_goal INTEGER NOT NULL DEFAULT 50,
  unlocked_skins TEXT NOT NULL DEFAULT '["turtle"]',
  active_skin TEXT NOT NULL DEFAULT 'turtle',
  rainbow_trail INTEGER NOT NULL DEFAULT 0,
  sound_muted INTEGER NOT NULL DEFAULT 0,
  sandbox_code TEXT NOT NULL DEFAULT '',
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 1,
  bonus INTEGER NOT NULL DEFAULT 0,
  stars INTEGER NOT NULL DEFAULT 1,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, node_id)
);

CREATE TABLE IF NOT EXISTS lesson_drafts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  code TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, node_id)
);

CREATE TABLE IF NOT EXISTS sandbox_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  saved_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sandbox_user_saved ON sandbox_projects(user_id, saved_at DESC);

CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);

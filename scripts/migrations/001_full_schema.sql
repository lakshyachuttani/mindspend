-- Migration 001: Auth, Income, Goals, Nudges, Push, Journal.
-- Run after init.sql. Safe to run on existing DB (additive).
-- PostgreSQL 9.5+ (ADD COLUMN IF NOT EXISTS).

-- ----- Users: add email and password for session auth -----
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- ----- Sessions: server-side session store -----
CREATE TABLE IF NOT EXISTS sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ----- Income -----
CREATE TABLE IF NOT EXISTS income (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  source      VARCHAR(200),
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_income_user_date ON income(user_id, income_date DESC);

-- ----- Goals (savings goals) -----
CREATE TABLE IF NOT EXISTS goals (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  target_date   DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

-- ----- Nudge deliveries: track shown nudges for cooldown and mute -----
CREATE TABLE IF NOT EXISTS nudge_deliveries (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nudge_code  VARCHAR(50) NOT NULL,
  message     TEXT NOT NULL,
  severity    VARCHAR(20) NOT NULL DEFAULT 'info',
  shown_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ,
  muted_until  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nudge_deliveries_user_shown ON nudge_deliveries(user_id, shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_nudge_deliveries_code ON nudge_deliveries(user_id, nudge_code);

-- ----- User nudge preferences (mute/snooze per type or global) -----
CREATE TABLE IF NOT EXISTS nudge_preferences (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nudge_code    VARCHAR(50) NOT NULL,
  muted_until   TIMESTAMPTZ,
  disabled      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, nudge_code)
);

-- ----- Web Push subscriptions -----
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ----- Optional journal (context/emotion placeholder, local only) -----
CREATE TABLE IF NOT EXISTS journal_entries (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journal_user_created ON journal_entries(user_id, created_at DESC);

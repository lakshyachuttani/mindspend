-- MindSpend schema: single-user MVP, ready to add auth later.
-- Run once when the DB is first created (e.g. via Docker init or manually).

-- Single default user for MVP; auth can attach to this later.
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories for grouping expenses (e.g. Food, Transport).
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual expense entries.
CREATE TABLE IF NOT EXISTS expenses (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount       NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description  TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

-- Monthly budget per category (one row per category per month).
CREATE TABLE IF NOT EXISTS budgets (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  year_month   CHAR(7) NOT NULL,  -- 'YYYY-MM'
  amount_limit NUMERIC(12, 2) NOT NULL CHECK (amount_limit >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_ym ON budgets(user_id, year_month);

-- Ensure default user exists (id = 1) for single-user mode.
INSERT INTO users (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));

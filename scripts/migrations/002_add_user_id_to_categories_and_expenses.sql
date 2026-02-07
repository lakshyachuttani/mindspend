-- Migration: add user_id to categories and expenses if missing.
-- Use when the DB has categories/expenses tables without user_id (e.g. old schema or init didn't run).

-- 1) Categories: add user_id if missing, backfill, set NOT NULL, unique (user_id, name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE categories
      ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    UPDATE categories
      SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
      WHERE user_id IS NULL;
    ALTER TABLE categories
      ALTER COLUMN user_id SET NOT NULL;
    DROP INDEX IF EXISTS categories_name_key;
    CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_key ON categories (user_id, name);
  END IF;
END $$;

-- 2) Expenses: add user_id if missing, backfill, set NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE expenses
      ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    UPDATE expenses
      SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
      WHERE user_id IS NULL;
    ALTER TABLE expenses
      ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date DESC);
  END IF;
END $$;

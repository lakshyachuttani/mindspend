-- Seed default categories so new users can add expenses without creating categories first.
-- Idempotent: ON CONFLICT DO NOTHING so existing names are skipped.
INSERT INTO categories (name)
VALUES
  ('Food'),
  ('Transport'),
  ('Shopping'),
  ('Bills'),
  ('Entertainment'),
  ('Health'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

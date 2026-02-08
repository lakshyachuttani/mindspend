-- Migration: add auth (users email/password_hash), session store, user-scoped categories.
-- Run this after init.sql if you already have the original schema (users with only id, created_at).

-- 1) Add auth columns to users (existing table has id, created_at)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(60);

-- Backfill existing user(s) so we can set NOT NULL. Legacy user cannot log in until password is set via app/SQL.
UPDATE users
SET email = 'legacy@migrated.local',
    password_hash = '$2b$10$placeholder60characterbcryptlengthxxxxxxxxxx'
WHERE email IS NULL;
UPDATE users
SET password_hash = '$2b$10$placeholder60characterbcryptlengthxxxxxxxxxx'
WHERE password_hash IS NULL OR length(password_hash) < 60;

ALTER TABLE users
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN password_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

-- 2) Session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- 3) Categories: add user_id and scope by user
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
UPDATE categories SET user_id = 1 WHERE user_id IS NULL;
ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;

DROP INDEX IF EXISTS categories_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_key ON categories (user_id, name);

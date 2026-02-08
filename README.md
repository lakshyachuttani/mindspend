# MindSpend

Privacy-first financial behavior coach: expense tracking, dashboards, rule-based nudges, and optional Web Push. All data stays local (PostgreSQL); no cloud AI.

## Architecture

- **Entry**: `src/server.js` loads env, starts Express.
- **App**: `src/app.js` — Express, cookie-parser, static frontend, `/api` + `loadSession`, route mounting, error handler.
- **DB**: `src/db/index.js` — pg pool; all access via raw SQL (no ORM).
- **Auth**: Session-based (PostgreSQL sessions, `mindspend_sid` cookie). See `docs/ARCHITECTURE.md` for auth flow.
- **Routes**: `src/routes/*.js` — auth, expenses, categories, summary, income, goals, budgets, analytics, nudges, notifications, user (export/delete).
- **Nudges**: `src/services/nudgeEngine.js` — rule-based checks (spending spike, budget over, late night, weekend, repeat category). See `docs/ARCHITECTURE.md`.
- **Schema**: `scripts/init.sql` (base) + `scripts/migrations/001_full_schema.sql` (auth, income, goals, nudges, push, journal). Run init then `node scripts/run-migrations.js`.

## Run with Docker

```bash
cp .env.example .env
# Edit .env if needed (e.g. DB_PASSWORD)
docker compose up --build
```

API: `http://localhost:3000`. The backend also serves the frontend from `public/`, so you can open `http://localhost:3000` in the browser.

After the DB is up, run migrations once (auth, income, goals, nudges, push):  
`npm run migrate` (or `node scripts/run-migrations.js`). Then register a new account to sign in.

## Run locally (Postgres required)

**1. Backend (API)** — port 3000:

```bash
cp .env.example .env
# Set DB_HOST=localhost and DB_* to your local Postgres
npm install
node scripts/init-db.js   # optional: run init.sql against existing DB
npm start
```

**2. Frontend dev server** — port 5174 (proxies API to backend):

In a second terminal:

```bash
npm run frontend
```

Then open **http://localhost:5174** in your browser. The frontend dev server serves `public/` and proxies `/api` and `/health` to `http://localhost:3000`. To use a different port or backend URL, set `FRONTEND_PORT` and/or `BACKEND_URL` in `.env` (see `.env.example`).

Alternatively, with only the backend running, open **http://localhost:3000** — the backend serves the same static frontend.

## API and docs

Full API: **`docs/API.md`**. Auth, analytics, nudges, notifications, export, account deletion.  
Architecture (auth flow, nudge logic, analytics, notifications): **`docs/ARCHITECTURE.md`**.

High level:

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Data**: expenses, categories, income, goals, budgets (CRUD where applicable)
- **Analytics**: `GET /api/analytics/dashboard`, `/daily`, `/income-vs-expense`
- **Nudges**: `GET /api/nudges?check=1`, `POST /api/nudges/:id/dismiss`, preferences
- **User**: `GET /api/user/export?format=json|csv`, `DELETE /api/user/account`
- **Push**: `GET /api/notifications/vapid-public-key`, `POST /api/notifications/subscribe` (optional; set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in env)

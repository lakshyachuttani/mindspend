# MindSpend Backend

Privacy-first financial tracking API. MVP: expense tracking, categories, budgets, and basic monthly insights.

## Architecture

- **Entry**: `src/server.js` loads env, connects DB, mounts Express app.
- **App**: `src/app.js` — Express setup, JSON middleware, route mounting, global error handler.
- **DB**: `src/db/index.js` — pg pool using env vars; single module for all DB access.
- **Routes**: `src/routes/*.js` — one file per resource (expenses, categories, summary). Handlers run SQL via the shared pool and return JSON.
- **No ORM**: Raw SQL only (pg). Schema and migrations live in `scripts/init.sql` (run once via Docker or manually).

Extension points: add new route files and mount in `app.js`; later you can plug in local inference or on-device AI by adding services called from routes.

## Schema (high level)

- **users** — single-user for now; id and timestamps (ready for future auth).
- **categories** — name, optional icon/color for future UI.
- **expenses** — amount, description, date, category_id (and user_id for later).
- **budgets** — monthly budget per category (year_month, category_id, amount_limit).

## Run with Docker

```bash
cp .env.example .env
# Edit .env if needed (e.g. DB_PASSWORD)
docker compose up --build
```

API: `http://localhost:3000`. The backend also serves the frontend from `public/`, so you can open `http://localhost:3000` in the browser.

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

## API (MVP)

- `POST /api/expenses` — create expense (body: amount, category_id, description?, expense_date?)
- `GET /api/expenses` — list expenses (query: from_date, to_date, category_id)
- `POST /api/categories` — create category (body: name)
- `GET /api/categories` — list categories
- `GET /api/summary/monthly` — monthly summary (query: year, month) — total spent per category

# MindSpend API

Same-origin only. All protected endpoints require a valid session cookie (`mindspend_sid`). Send `credentials: 'include'` with fetch.

---

## Auth

### POST /api/auth/register

Create account and start session.

- **Body:** `{ "email": string, "password": string }` (password min 8 chars)
- **Response:** `{ "user": { "id", "email", "created_at" } }`
- **Errors:** 400 (validation), 409 (email already exists)

### POST /api/auth/login

- **Body:** `{ "email": string, "password": string }`
- **Response:** `{ "user": { "id", "email" } }`
- **Sets:** session cookie
- **Errors:** 400, 401 (invalid credentials)

### POST /api/auth/logout

- **Response:** `{ "ok": true }`
- **Clears:** session cookie

### GET /api/auth/me

- **Auth:** required
- **Response:** `{ "user": { "id", "email", "created_at" } }`
- **Errors:** 401

---

## Expenses

### POST /api/expenses

- **Auth:** required
- **Body:** `{ "amount": number, "category_id": number, "description"?: string, "expense_date"?: "YYYY-MM-DD" }`
- **Response:** created expense object

### GET /api/expenses

- **Auth:** required
- **Query:** `from_date`, `to_date`, `category_id` (optional)
- **Response:** array of expenses with `category_name`

---

## Categories

### GET /api/categories

- **Auth:** required
- **Response:** array of `{ id, name, created_at }`

### POST /api/categories

- **Auth:** required
- **Body:** `{ "name": string }`
- **Response:** created category
- **Errors:** 409 if name exists

---

## Summary

### GET /api/summary/monthly

- **Auth:** required
- **Query:** `year`, `month` (required)
- **Response:** `{ "year", "month", "by_category": [ { "category_id", "category_name", "total_spent" } ], "total_spent" }`

---

## Income

### POST /api/income

- **Auth:** required
- **Body:** `{ "amount": number, "source"?: string, "income_date"?: "YYYY-MM-DD" }`
- **Response:** created income row

### GET /api/income

- **Auth:** required
- **Query:** `from_date`, `to_date` (optional)
- **Response:** array of income entries

---

## Goals

### GET /api/goals

- **Auth:** required
- **Response:** array of goals

### POST /api/goals

- **Auth:** required
- **Body:** `{ "name": string, "target_amount": number, "target_date"?: "YYYY-MM-DD" }`
- **Response:** created goal

### PATCH /api/goals/:id

- **Auth:** required
- **Body:** partial `{ "name", "target_amount", "target_date" }`
- **Response:** updated goal

### DELETE /api/goals/:id

- **Auth:** required
- **Response:** 204

---

## Budgets

### GET /api/budgets

- **Auth:** required
- **Query:** `year_month` (optional, "YYYY-MM")
- **Response:** array of budgets with category_name

### POST /api/budgets

- **Auth:** required
- **Body:** `{ "category_id": number, "year_month": "YYYY-MM", "amount_limit": number }`
- **Response:** created/updated budget (upsert by user, category, month)

### DELETE /api/budgets/:id

- **Auth:** required
- **Response:** 204

---

## Analytics

### GET /api/analytics/dashboard

- **Auth:** required
- **Query:** `year_month` (optional, default current month)
- **Response:**  
  `{ "year_month", "total_income", "total_expense", "savings", "by_category": [ { "category_id", "category_name", "total_spent" } ], "income_vs_expense", "trend": { "current", "previous", "delta" } | null }`

### GET /api/analytics/daily

- **Auth:** required
- **Query:** `from`, `to` (optional; default last 30 days)
- **Response:** `[ { "date", "total" } ]`

### GET /api/analytics/income-vs-expense

- **Auth:** required
- **Query:** `year_month` (optional)
- **Response:** `{ "year_month", "income": [ { "date", "total" } ], "expense": [ { "date", "total" } ] }`

---

## Nudges

Rule-based behavioral nudges (no ML). Cooldown and user mute are respected.

### GET /api/nudges

- **Auth:** required
- **Query:** `check=1` — run nudge engine and return any new + existing undismissed nudges
- **Response:** `{ "nudges": [ { "id", "nudge_code", "message", "severity", "shown_at", ... } ] }`

### POST /api/nudges/:id/dismiss

- **Auth:** required
- **Response:** `{ "ok": true }`

### GET /api/nudges/preferences

- **Auth:** required
- **Response:** `{ "preferences": [ { "nudge_code", "muted_until", "disabled" } ] }`

### PUT /api/nudges/preferences/:code

- **Auth:** required
- **Body:** `{ "muted_until"?: ISO date | null, "disabled"?: boolean }` (partial)
- **Response:** `{ "ok": true }`

---

## Notifications (Web Push)

Optional. Requires `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in env. Generate with `npx web-push generate-vapid-keys`.

### GET /api/notifications/vapid-public-key

- **Response:** `{ "publicKey": string }` or 503 if not configured

### POST /api/notifications/subscribe

- **Auth:** required
- **Body:** `{ "subscription": { "endpoint", "keys": { "auth", "p256dh" } } }` (from PushManager)
- **Response:** `{ "ok": true }`

### POST /api/notifications/unsubscribe

- **Auth:** required
- **Body:** `{ "endpoint": string }`
- **Response:** `{ "ok": true }`

---

## User (privacy)

### GET /api/user/export

- **Auth:** required
- **Query:** `format=json` (default) or `format=csv`
- **Response:** attachment (all user data: expenses, income, categories, budgets, goals, nudges)

### DELETE /api/user/account

- **Auth:** required
- **Response:** `{ "ok": true }` — deletes user and all related data, clears session

---

## Error responses

- **400** — validation / bad request
- **401** — not authenticated or session invalid
- **404** — resource not found
- **409** — conflict (e.g. duplicate)
- **500** — server error (body: `{ "error": "message" }`)

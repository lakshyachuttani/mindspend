# MindSpend architecture

## Auth flow

- **Session-based:** no JWT. Server stores sessions in PostgreSQL (`sessions` table: `token`, `user_id`, `expires_at`).
- **Cookie:** `mindspend_sid` (HttpOnly, SameSite=Lax) holds the session token.
- **Middleware:** `loadSession` runs on every `/api` request and sets `req.userId` when the cookie matches a valid, non-expired session. Protected routes use `requireAuth`, which returns 401 if `req.userId` is missing.
- **Frontend:** Infers auth state by calling `GET /api/auth/me`. If 401, show login/register; otherwise show app. All API calls use `credentials: 'include'` so the cookie is sent.

## Nudge logic

- **Location:** `src/services/nudgeEngine.js`. Rule-based only; no ML.
- **Triggers:**
  1. **Spending spike** — today’s total vs 7-day rolling average; nudge if today > 1.5× average.
  2. **Budget over** — current month spend in a category exceeds the budget for that category (from `budgets` table).
  3. **Late night** — expense logged after 22:00 (by `created_at`) in the last hour.
  4. **Weekend spend** — on weekend days, compare weekend total to weekday average; nudge if meaningfully higher.
  5. **Repeat category** — same category 3+ times in the last 24 hours.
- **Cooldown:** Per nudge code (e.g. 12–48 hours). Stored in `nudge_deliveries`; we skip if a recent delivery exists for that code.
- **User control:** `nudge_preferences` stores per-code `muted_until` and `disabled`. Nudges are not shown if disabled or still muted.
- **Delivery:** Nudges are inserted into `nudge_deliveries`. High-severity (e.g. budget over, spending spike) also trigger Web Push when push is configured.

## Analytics logic

- **Location:** `src/routes/analytics.js`. All aggregation in SQL.
- **Dashboard:** One query for income total, one for expense total, one for category breakdown, one for previous month (trend). Date range is the selected `year_month`.
- **Indexes:** Existing indexes on `expenses(user_id, expense_date)`, `income(user_id, income_date)` keep aggregations efficient. No raw row overfetch.

## Notification behavior

- **Web Push:** Optional. If `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are set, the app can send browser push notifications.
- **Storage:** Subscriptions stored in `push_subscriptions` (user_id, endpoint, keys). No external notification service.
- **When sent:** From the nudge engine when delivering a warning/high nudge (e.g. budget breach, spending spike). Payload: `{ type: 'nudge', title: 'MindSpend', body: message }`.
- **Frontend:** Can request permission and call `POST /api/notifications/subscribe` with the PushManager subscription. User can disable anytime.

## Data and privacy

- **User-scoped:** All personal data (expenses, income, goals, budgets, nudges, push subscriptions) is keyed by `user_id`.
- **Export:** `GET /api/user/export?format=json|csv` returns all user data as attachment. No third-party.
- **Deletion:** `DELETE /api/user/account` removes the user row; PostgreSQL cascades delete all related rows. Session cookie is cleared.
- **No tracking:** No external analytics or tracking scripts.

## Schema (high level)

- **users** — id, email, password_hash, created_at
- **sessions** — id, user_id, token, expires_at
- **categories** — id, name (shared; no user_id)
- **expenses** — user_id, category_id, amount, description, expense_date
- **income** — user_id, amount, source, income_date
- **budgets** — user_id, category_id, year_month, amount_limit
- **goals** — user_id, name, target_amount, target_date
- **nudge_deliveries** — user_id, nudge_code, message, severity, shown_at, dismissed_at, muted_until
- **nudge_preferences** — user_id, nudge_code, muted_until, disabled
- **push_subscriptions** — user_id, endpoint, p256dh, auth
- **journal_entries** — user_id, content (optional; for future context/emotion)

Run `scripts/init.sql` once, then `node scripts/run-migrations.js` to apply additive migrations.

/**
 * Rule-based nudge engine. No ML; explainable heuristics only.
 * Evaluates: spending spikes vs rolling average, budget overspend, time context.
 * Respects cooldown and user mute preferences.
 */

const { pool } = require('../db');

const NUDGE_CODES = {
  SPENDING_SPIKE: 'spending_spike',
  BUDGET_OVER: 'budget_over',
  LATE_NIGHT: 'late_night',
  WEEKEND_SPEND: 'weekend_spend',
  REPEAT_CATEGORY: 'repeat_category',
};

const COOLDOWN_HOURS = {
  [NUDGE_CODES.SPENDING_SPIKE]: 24,
  [NUDGE_CODES.BUDGET_OVER]: 12,
  [NUDGE_CODES.LATE_NIGHT]: 24,
  [NUDGE_CODES.WEEKEND_SPEND]: 48,
  [NUDGE_CODES.REPEAT_CATEGORY]: 24,
};

const SEVERITY = { info: 'info', warning: 'warning', high: 'high' };

/**
 * Check if we should skip this nudge (cooldown or muted).
 */
async function shouldSkipNudge(userId, nudgeCode) {
  const prefs = await pool.query(
    `SELECT muted_until, disabled FROM nudge_preferences WHERE user_id = $1 AND nudge_code = $2`,
    [userId, nudgeCode]
  );
  if (prefs.rows.length && prefs.rows[0].disabled) return true;
  const mutedUntil = prefs.rows[0]?.muted_until;
  if (mutedUntil && new Date(mutedUntil) > new Date()) return true;

  const hours = COOLDOWN_HOURS[nudgeCode] ?? 24;
  const since = new Date();
  since.setHours(since.getHours() - hours);
  const last = await pool.query(
    `SELECT 1 FROM nudge_deliveries WHERE user_id = $1 AND nudge_code = $2 AND shown_at > $3 LIMIT 1`,
    [userId, nudgeCode, since.toISOString()]
  );
  return last.rows.length > 0;
}

/**
 * Insert a nudge delivery and return it. Optionally send Web Push for high-confidence nudges.
 */
async function deliverNudge(userId, nudgeCode, message, severity = SEVERITY.info) {
  const result = await pool.query(
    `INSERT INTO nudge_deliveries (user_id, nudge_code, message, severity)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nudge_code, message, severity, shown_at, created_at`,
    [userId, nudgeCode, message, severity]
  );
  const row = result.rows[0];
  // Web Push for high-confidence nudges (budget breach, spending spike)
  if (severity === SEVERITY.warning || severity === SEVERITY.high) {
    try {
      const pushService = require('./pushService');
      await pushService.sendToUser(userId, { type: 'nudge', title: 'MindSpend', body: message });
    } catch (_) {}
  }
  return row;
}

/**
 * 1) Spending spike: recent day/week total vs rolling 7-day average.
 */
async function checkSpendingSpike(userId) {
  if (await shouldSkipNudge(userId, NUDGE_CODES.SPENDING_SPIKE)) return null;
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const result = await pool.query(
    `SELECT expense_date, SUM(amount)::NUMERIC(12,2) AS day_total
     FROM expenses
     WHERE user_id = $1 AND expense_date >= $2::date AND expense_date <= $3::date
     GROUP BY expense_date ORDER BY expense_date`,
    [userId, sevenDaysAgo, today]
  );
  const byDay = result.rows.map((r) => ({ date: r.expense_date, total: parseFloat(r.day_total) }));
  if (byDay.length < 2) return null;
  const todayRow = byDay.find((d) => d.date === today);
  const todayTotal = todayRow ? todayRow.total : 0;
  const avg = byDay.reduce((s, d) => s + d.total, 0) / byDay.length;
  if (avg <= 0 || todayTotal <= avg * 1.5) return null;
  const pct = Math.round((todayTotal / avg - 1) * 100);
  return deliverNudge(
    userId,
    NUDGE_CODES.SPENDING_SPIKE,
    `Today's spending is about ${pct}% above your recent average. Small pause before the next purchase?`,
    SEVERITY.warning
  );
}

/**
 * 2) Budget over: category over its monthly budget.
 */
async function checkBudgetOverspend(userId) {
  if (await shouldSkipNudge(userId, NUDGE_CODES.BUDGET_OVER)) return null;
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const result = await pool.query(
    `SELECT b.category_id, c.name AS category_name, b.amount_limit,
            COALESCE(SUM(e.amount), 0)::NUMERIC(12,2) AS spent
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN expenses e ON e.category_id = b.category_id AND e.user_id = b.user_id
       AND e.expense_date >= $2::date AND e.expense_date < ($2::date + INTERVAL '1 month')
     WHERE b.user_id = $1 AND b.year_month = $2
     GROUP BY b.category_id, c.name, b.amount_limit
     HAVING COALESCE(SUM(e.amount), 0) > b.amount_limit`,
    [userId, yearMonth]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const over = (parseFloat(row.spent) - parseFloat(row.amount_limit)).toFixed(2);
  return deliverNudge(
    userId,
    NUDGE_CODES.BUDGET_OVER,
    `You're over your ${row.category_name} budget by ${over} this month. You can adjust the budget or ease off until next month.`,
    SEVERITY.warning
  );
}

/**
 * 3) Late night: expense logged after 10 PM (created_at).
 */
async function checkLateNight(userId) {
  if (await shouldSkipNudge(userId, NUDGE_CODES.LATE_NIGHT)) return null;
  const result = await pool.query(
    `SELECT id FROM expenses
     WHERE user_id = $1 AND created_at::time > '22:00'::time
       AND created_at > NOW() - INTERVAL '1 hour'
     LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  return deliverNudge(
    userId,
    NUDGE_CODES.LATE_NIGHT,
    `You just logged an expense late at night. Late-night spending can add up — consider a quick check tomorrow.`,
    SEVERITY.info
  );
}

/**
 * 4) Weekend: higher-than-weekday spending (simplified: weekend total vs weekday average).
 */
async function checkWeekendSpend(userId) {
  if (await shouldSkipNudge(userId, NUDGE_CODES.WEEKEND_SPEND)) return null;
  const d = new Date();
  const day = d.getDay();
  if (day !== 0 && day !== 6) return null; // only on weekend
  const weekStart = new Date(d);
  weekStart.setDate(weekStart.getDate() - 7);
  const from = weekStart.toISOString().slice(0, 10);
  const to = d.toISOString().slice(0, 10);
  const result = await pool.query(
    `SELECT expense_date, EXTRACT(DOW FROM expense_date) AS dow, SUM(amount)::NUMERIC(12,2) AS total
     FROM expenses
     WHERE user_id = $1 AND expense_date >= $2::date AND expense_date <= $3::date
     GROUP BY expense_date`,
    [userId, from, to]
  );
  const weekendDays = result.rows.filter((r) => {
    const dow = parseInt(r.dow, 10);
    return dow === 0 || dow === 6;
  });
  const weekdayDays = result.rows.filter((r) => {
    const dow = parseInt(r.dow, 10);
    return dow >= 1 && dow <= 5;
  });
  const weekendTotal = weekendDays.reduce((s, r) => s + parseFloat(r.total), 0);
  const weekdayAvg =
    weekdayDays.length > 0
      ? weekdayDays.reduce((s, r) => s + parseFloat(r.total), 0) / weekdayDays.length
      : 0;
  if (weekdayAvg <= 0 || weekendTotal <= weekdayAvg * 1.3) return null;
  return deliverNudge(
    userId,
    NUDGE_CODES.WEEKEND_SPEND,
    `Weekend spending is a bit higher than your weekday average. Nothing wrong with that — just something to be aware of.`,
    SEVERITY.info
  );
}

/**
 * 5) Repeat category: same category several times in a short window (e.g. 3+ in 24h).
 */
async function checkRepeatCategory(userId) {
  if (await shouldSkipNudge(userId, NUDGE_CODES.REPEAT_CATEGORY)) return null;
  const since = new Date();
  since.setHours(since.getHours() - 24);
  const result = await pool.query(
    `SELECT e.category_id, c.name, COUNT(*) AS cnt
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.user_id = $1 AND e.created_at > $2
     GROUP BY e.category_id, c.name
     HAVING COUNT(*) >= 3`,
    [userId, since.toISOString()]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return deliverNudge(
    userId,
    NUDGE_CODES.REPEAT_CATEGORY,
    `You've logged ${row.cnt} expenses in "${row.name}" in the last 24 hours. Worth a quick pause?`,
    SEVERITY.info
  );
}

/**
 * Run all nudge checks and return newly generated nudges (if any).
 * Call after expense create or when loading dashboard.
 */
async function runNudgeChecks(userId) {
  const out = [];
  try {
    const n = await checkSpendingSpike(userId);
    if (n) out.push(n);
  } catch (e) {
    /* ignore per-check errors */
  }
  try {
    const n = await checkBudgetOverspend(userId);
    if (n) out.push(n);
  } catch (e) {}
  try {
    const n = await checkLateNight(userId);
    if (n) out.push(n);
  } catch (e) {}
  try {
    const n = await checkWeekendSpend(userId);
    if (n) out.push(n);
  } catch (e) {}
  try {
    const n = await checkRepeatCategory(userId);
    if (n) out.push(n);
  } catch (e) {}
  return out;
}

module.exports = {
  NUDGE_CODES,
  runNudgeChecks,
  deliverNudge,
  shouldSkipNudge,
};

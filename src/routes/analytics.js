/**
 * Aggregated analytics for dashboard: daily/monthly summaries, category breakdown,
 * income vs expense, savings, trend comparison. All SQL aggregation; user-scoped.
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Query: year_month (YYYY-MM) optional; defaults to current month.
 * Returns: total_income, total_expense, savings, by_category, income_vs_expense, trend.
 */
router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const raw = req.query.year_month;
    const now = new Date();
    const yearMonth = raw || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [y, m] = yearMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0);
    const startDate = `${yearMonth}-01`;
    const endDate = lastDay.toISOString().slice(0, 10);

    // Total income for period
    const incomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS total
       FROM income WHERE user_id = $1 AND income_date >= $2::date AND income_date <= $3::date`,
      [userId, startDate, endDate]
    );
    const totalIncome = parseFloat(incomeResult.rows[0]?.total || 0);

    // Total expense for period
    const expenseResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS total
       FROM expenses WHERE user_id = $1 AND expense_date >= $2::date AND expense_date <= $3::date`,
      [userId, startDate, endDate]
    );
    const totalExpense = parseFloat(expenseResult.rows[0]?.total || 0);

    // Category-wise expense breakdown
    const byCategoryResult = await pool.query(
      `SELECT c.id AS category_id, c.name AS category_name,
              COALESCE(SUM(e.amount), 0)::NUMERIC(12,2) AS total_spent
       FROM categories c
       LEFT JOIN expenses e ON e.category_id = c.id
         AND e.user_id = $1
         AND e.expense_date >= $2::date AND e.expense_date <= $3::date
       GROUP BY c.id, c.name
       HAVING COALESCE(SUM(e.amount), 0) > 0
       ORDER BY total_spent DESC`,
      [userId, startDate, endDate]
    );
    const by_category = byCategoryResult.rows.map((r) => ({
      category_id: r.category_id,
      category_name: r.category_name,
      total_spent: parseFloat(r.total_spent),
    }));

    // Previous period for trend (month before the selected year_month)
    const prevMonth = new Date(y, m - 2, 1);
    const prevYearMonth =
      `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const prevExpenseResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS total
       FROM expenses WHERE user_id = $1 AND expense_date >= $2::date
         AND expense_date < ($2::date + INTERVAL '1 month')`,
      [userId, prevYearMonth]
    );
    const previous_expense = parseFloat(prevExpenseResult.rows[0]?.total || 0);
    const trend =
      previous_expense === 0
        ? null
        : { current: totalExpense, previous: previous_expense, delta: totalExpense - previous_expense };

    res.json({
      year_month: yearMonth,
      total_income: totalIncome,
      total_expense: totalExpense,
      savings: totalIncome - totalExpense,
      by_category,
      income_vs_expense: { income: totalIncome, expense: totalExpense },
      trend,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/daily?from=&to=
 * Daily expense totals for a range (for charts).
 */
router.get('/daily', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { from, to } = req.query;
    const toDate = to || new Date().toISOString().slice(0, 10);
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const result = await pool.query(
      `SELECT expense_date AS date, SUM(amount)::NUMERIC(12,2) AS total
       FROM expenses WHERE user_id = $1 AND expense_date >= $2::date AND expense_date <= $3::date
       GROUP BY expense_date ORDER BY expense_date`,
      [userId, fromDate, toDate]
    );
    res.json(
      result.rows.map((r) => ({ date: r.date, total: parseFloat(r.total) }))
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/income-vs-expense?year_month=
 * Monthly income and expense for the given month (for charts).
 */
router.get('/income-vs-expense', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const raw = req.query.year_month;
    const now = new Date();
    const yearMonth = raw || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const start = `${yearMonth}-01`;

    const [incomeRows, expenseRows] = await Promise.all([
      pool.query(
        `SELECT income_date AS date, SUM(amount)::NUMERIC(12,2) AS total
         FROM income WHERE user_id = $1 AND income_date >= $2::date
           AND income_date < ($2::date + INTERVAL '1 month')
         GROUP BY income_date ORDER BY income_date`,
        [userId, start]
      ),
      pool.query(
        `SELECT expense_date AS date, SUM(amount)::NUMERIC(12,2) AS total
         FROM expenses WHERE user_id = $1 AND expense_date >= $2::date
           AND expense_date < ($2::date + INTERVAL '1 month')
         GROUP BY expense_date ORDER BY expense_date`,
        [userId, start]
      ),
    ]);

    res.json({
      year_month: yearMonth,
      income: incomeRows.rows.map((r) => ({ date: r.date, total: parseFloat(r.total) })),
      expense: expenseRows.rows.map((r) => ({ date: r.date, total: parseFloat(r.total) })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

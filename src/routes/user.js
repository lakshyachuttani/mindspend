/**
 * User data export and account deletion. Privacy-first.
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { clearSessionCookie } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/user/export?format=json|csv
 * Export all user data (expenses, income, categories, budgets, goals, nudges). No third-party.
 */
router.get('/export', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const format = (req.query.format || 'json').toLowerCase();

    const [expenses, income, categories, budgets, goals, nudges] = await Promise.all([
      pool.query(
        `SELECT e.id, e.amount, e.description, e.expense_date, e.created_at, c.name AS category_name
         FROM expenses e JOIN categories c ON c.id = e.category_id WHERE e.user_id = $1 ORDER BY e.expense_date DESC`,
        [userId]
      ),
      pool.query(
        'SELECT id, amount, source, income_date, created_at FROM income WHERE user_id = $1 ORDER BY income_date DESC',
        [userId]
      ),
      pool.query('SELECT id, name, created_at FROM categories ORDER BY name'),
      pool.query(
        `SELECT b.id, c.name AS category_name, b.year_month, b.amount_limit, b.created_at
         FROM budgets b JOIN categories c ON c.id = b.category_id WHERE b.user_id = $1`,
        [userId]
      ),
      pool.query(
        'SELECT id, name, target_amount, target_date, created_at FROM goals WHERE user_id = $1',
        [userId]
      ),
      pool.query(
        `SELECT id, nudge_code, message, severity, shown_at, dismissed_at, created_at
         FROM nudge_deliveries WHERE user_id = $1 ORDER BY shown_at DESC`,
        [userId]
      ),
    ]);

    const data = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      expenses: expenses.rows,
      income: income.rows,
      categories: categories.rows,
      budgets: budgets.rows,
      goals: goals.rows,
      nudges: nudges.rows,
    };

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=mindspend-export.csv');
      const header = 'type,id,amount,description,date,category,created_at\n';
      const rows = [
        ...data.expenses.map((e) =>
          `expense,${e.id},${e.amount},"${(e.description || '').replace(/"/g, '""')}",${e.expense_date},${e.category_name || ''},${e.created_at}`
        ),
        ...data.income.map((i) =>
          `income,${i.id},${i.amount},"${(i.source || '').replace(/"/g, '""')}",${i.income_date},,${i.created_at}`
        ),
      ];
      return res.send(header + rows.join('\n'));
    }

    res.setHeader('Content-Disposition', 'attachment; filename=mindspend-export.json');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/user/account
 * Permanently delete user and all their data. Clears session.
 */
router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    // Cascade deletes: sessions, expenses, income, goals, nudge_deliveries, nudge_preferences, push_subscriptions, budgets, journal_entries
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    clearSessionCookie(res);
    res.status(200).json({ ok: true, message: 'Account and all data deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

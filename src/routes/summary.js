/**
 * Basic insights: monthly summary (total spent per category).
 * Query params: year, month. User-scoped via req.userId.
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/monthly', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const year = req.query.year;
    const month = req.query.month;
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month query params are required' });
    }
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const result = await pool.query(
      `SELECT c.id AS category_id, c.name AS category_name,
              COALESCE(SUM(e.amount), 0)::NUMERIC(12,2) AS total_spent
       FROM categories c
       LEFT JOIN expenses e ON e.category_id = c.id
         AND e.user_id = $1
         AND e.expense_date >= $2::date
         AND e.expense_date < ($2::date + INTERVAL '1 month')
       GROUP BY c.id, c.name
       ORDER BY total_spent DESC`,
      [userId, yearMonth]
    );
    res.json({
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      by_category: result.rows,
      total_spent: result.rows.reduce((sum, r) => sum + parseFloat(r.total_spent), 0),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

/**
 * Monthly budgets per category. User-scoped via req.userId.
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const year_month = req.query.year_month;
    let sql = `
      SELECT b.id, b.category_id, c.name AS category_name, b.year_month, b.amount_limit, b.created_at
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      WHERE b.user_id = $1`;
    const params = [userId];
    if (year_month) {
      sql += ` AND b.year_month = $2`;
      params.push(year_month);
    }
    sql += ` ORDER BY b.year_month DESC, c.name`;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { category_id, year_month, amount_limit } = req.body;
    if (category_id == null || !year_month || amount_limit == null) {
      return res.status(400).json({ error: 'category_id, year_month, and amount_limit are required' });
    }
    const limit = parseFloat(amount_limit);
    if (Number.isNaN(limit) || limit < 0) {
      return res.status(400).json({ error: 'amount_limit must be a non-negative number' });
    }
    const ym = String(year_month).match(/^\d{4}-\d{2}$/) ? year_month : null;
    if (!ym) return res.status(400).json({ error: 'year_month must be YYYY-MM' });
    const result = await pool.query(
      `INSERT INTO budgets (user_id, category_id, year_month, amount_limit)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, category_id, year_month) DO UPDATE SET amount_limit = $4
       RETURNING id, user_id, category_id, year_month, amount_limit, created_at`,
      [userId, category_id, ym, limit]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Invalid category_id' });
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const result = await pool.query(
      'DELETE FROM budgets WHERE user_id = $1 AND id = $2 RETURNING id',
      [req.userId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Budget not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;

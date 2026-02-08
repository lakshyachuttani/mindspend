/**
 * Income CRUD and list. User-scoped via req.userId.
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { amount, source, income_date } = req.body;
    if (amount == null) {
      return res.status(400).json({ error: 'amount is required' });
    }
    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }
    const date = income_date || new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `INSERT INTO income (user_id, amount, source, income_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, amount, source, income_date, created_at`,
      [userId, amt, source?.trim() || null, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { from_date, to_date } = req.query;
    let sql = `
      SELECT id, user_id, amount, source, income_date, created_at
      FROM income WHERE user_id = $1`;
    const params = [userId];
    let n = 2;
    if (from_date) {
      sql += ` AND income_date >= $${n}`;
      params.push(from_date);
      n++;
    }
    if (to_date) {
      sql += ` AND income_date <= $${n}`;
      params.push(to_date);
      n++;
    }
    sql += ` ORDER BY income_date DESC, created_at DESC`;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

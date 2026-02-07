/**
 * Expense CRUD and list with optional date/category filters.
 * Single-user: user_id = 1 (extension point for req.user later).
 */
const express = require('express');
const { pool } = require('../db');

const router = express.Router();
const USER_ID = 1;

// Create expense
router.post('/', async (req, res, next) => {
  try {
    const { amount, category_id, description, expense_date } = req.body;
    if (amount == null || category_id == null) {
      return res.status(400).json({ error: 'amount and category_id are required' });
    }
    const date = expense_date || new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `INSERT INTO expenses (user_id, category_id, amount, description, expense_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, category_id, amount, description, expense_date, created_at`,
      [USER_ID, category_id, amount, description || null, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// List expenses with optional from_date, to_date, category_id
router.get('/', async (req, res, next) => {
  try {
    const { from_date, to_date, category_id } = req.query;
    let sql = `
      SELECT e.id, e.user_id, e.category_id, e.amount, e.description, e.expense_date, e.created_at,
             c.name AS category_name
      FROM expenses e
      JOIN categories c ON c.id = e.category_id
      WHERE e.user_id = $1`;
    const params = [USER_ID];
    let n = 2;
    if (from_date) {
      sql += ` AND e.expense_date >= $${n}`;
      params.push(from_date);
      n++;
    }
    if (to_date) {
      sql += ` AND e.expense_date <= $${n}`;
      params.push(to_date);
      n++;
    }
    if (category_id) {
      sql += ` AND e.category_id = $${n}`;
      params.push(category_id);
      n++;
    }
    sql += ` ORDER BY e.expense_date DESC, e.created_at DESC`;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

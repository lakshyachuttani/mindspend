/**
 * Category create and list. Requires auth.
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const result = await pool.query(
      `INSERT INTO categories (user_id, name) VALUES ($1, $2)
       RETURNING id, user_id, name, created_at`,
      [req.userId, name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM categories WHERE user_id = $1 ORDER BY name',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

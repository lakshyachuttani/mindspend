/**
 * Category create and list. User-scoped via req.user.id.
 */
const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const result = await pool.query(
      `INSERT INTO categories (user_id, name) VALUES ($1, $2)
       RETURNING id, user_id, name, created_at`,
      [req.user.id, name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM categories WHERE user_id = $1 ORDER BY name',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

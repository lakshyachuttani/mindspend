/**
 * Savings goals. User-scoped via req.userId.
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { name, target_amount, target_date } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const amt = parseFloat(target_amount);
    if (Number.isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'target_amount must be a positive number' });
    }
    const result = await pool.query(
      `INSERT INTO goals (user_id, name, target_amount, target_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, name, target_amount, target_date, created_at`,
      [userId, name.trim(), amt, target_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, name, target_amount, target_date, created_at
       FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid goal id' });
    const { name, target_amount, target_date } = req.body;
    const updates = [];
    const values = [userId, id];
    let n = 3;
    if (name !== undefined) {
      updates.push(`name = $${n}`);
      values.push(typeof name === 'string' ? name.trim() : name);
      n++;
    }
    if (target_amount !== undefined) {
      const amt = parseFloat(target_amount);
      if (!Number.isNaN(amt) && amt > 0) {
        updates.push(`target_amount = $${n}`);
        values.push(amt);
        n++;
      }
    }
    if (target_date !== undefined) {
      updates.push(`target_date = $${n}`);
      values.push(target_date || null);
      n++;
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const result = await pool.query(
      `UPDATE goals SET ${updates.join(', ')} WHERE user_id = $1 AND id = $2
       RETURNING id, user_id, name, target_amount, target_date, created_at`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid goal id' });
    const result = await pool.query(
      'DELETE FROM goals WHERE user_id = $1 AND id = $2 RETURNING id',
      [req.userId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;

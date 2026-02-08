/**
 * Auth routes: register, login, logout, me.
 * Session stored in PostgreSQL; cookie holds session token.
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const {
  createSession,
  loadSession,
  requireAuth,
  clearSessionCookie,
  getSessionCookieOptions,
} = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    const emailNorm = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const insertResult = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [emailNorm, passwordHash]
    );
    const user = insertResult.rows[0];
    const token = await createSession(user.id);
    res.cookie('mindspend_sid', token, getSessionCookieOptions());
    res.status(201).json({
      user: { id: user.id, email: user.email, created_at: user.created_at },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const emailNorm = email.trim().toLowerCase();
    const result = await pool.query(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [emailNorm]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = await createSession(user.id);
    res.cookie('mindspend_sid', token, getSessionCookieOptions());
    res.json({ user: { id: user.id, email: emailNorm } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  clearSessionCookie(res);
  const token = req.cookies?.mindspend_sid;
  if (token) {
    pool.query('DELETE FROM sessions WHERE token = $1', [token]).catch(() => {});
  }
  res.json({ ok: true });
});

// GET /api/auth/me — requires auth; returns current user or 401
router.get('/me', loadSession, requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, created_at FROM users WHERE id = $1`,
      [req.userId]
    );
    if (result.rows.length === 0) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Session invalid' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

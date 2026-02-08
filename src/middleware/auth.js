/**
 * Session-based auth middleware.
 * Expects cookie-parser and sessions table (token, user_id, expires_at).
 * Sets req.userId when a valid session exists; does not block (use requireAuth for that).
 */

const { pool } = require('../db');
const crypto = require('crypto');

const SESSION_COOKIE = 'mindspend_sid';
const SESSION_DAYS = 7;

/**
 * Create a new session for user_id, return token.
 * @param {number} userId
 * @returns {Promise<string>} session token
 */
async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt.toISOString()]
  );
  return token;
}

/**
 * Load session from cookie and set req.userId. Does not send 401.
 */
async function loadSession(req, res, next) {
  req.userId = null;
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();

  try {
    const result = await pool.query(
      `SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    if (result.rows.length) req.userId = result.rows[0].user_id;
  } catch (err) {
    return next(err);
  }
  next();
}

/**
 * Require authentication: 401 if req.userId not set.
 */
function requireAuth(req, res, next) {
  if (req.userId == null) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Clear session cookie and optionally delete session row.
 */
function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  };
}

module.exports = {
  SESSION_COOKIE,
  createSession,
  loadSession,
  requireAuth,
  clearSessionCookie,
  getSessionCookieOptions,
};

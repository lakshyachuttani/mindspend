/**
 * Require an active session. Responds 401 if no session or no user_id in session.
 * Call after session middleware; attaches req.user from DB.
 */
const { pool } = require('../db');

async function requireAuth(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.session.user_id]
    );
    if (result.rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };

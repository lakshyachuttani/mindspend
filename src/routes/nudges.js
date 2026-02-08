/**
 * Nudges API: list, dismiss, mute. Runs nudge engine on fetch when requested.
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { runNudgeChecks } = require('../services/nudgeEngine');

const router = express.Router();

/**
 * GET /api/nudges?check=1
 * Returns recent nudges (not dismissed). If check=1, runs nudge engine first and includes any new nudges.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    if (req.query.check === '1') {
      await runNudgeChecks(userId);
    }
    const result = await pool.query(
      `SELECT id, nudge_code, message, severity, shown_at, dismissed_at, muted_until, created_at
       FROM nudge_deliveries
       WHERE user_id = $1 AND dismissed_at IS NULL
       ORDER BY shown_at DESC
       LIMIT 20`,
      [userId]
    );
    res.json({ nudges: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/nudges/:id/dismiss
 * Mark nudge as dismissed.
 */
router.post('/:id/dismiss', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid nudge id' });
    const result = await pool.query(
      `UPDATE nudge_deliveries SET dismissed_at = NOW() WHERE user_id = $1 AND id = $2 RETURNING id`,
      [req.userId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nudge not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nudges/preferences
 * List user nudge preferences (muted/disabled by code).
 */
router.get('/preferences', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT nudge_code, muted_until, disabled, updated_at FROM nudge_preferences WHERE user_id = $1`,
      [req.userId]
    );
    res.json({ preferences: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/nudges/preferences/:code
 * Body: { muted_until?: ISO date string | null, disabled?: boolean }
 * Set mute (snooze) or disable for a nudge type.
 */
router.put('/preferences/:code', requireAuth, async (req, res, next) => {
  try {
    const code = req.params.code;
    const { muted_until, disabled } = req.body;
    const hasMuted = typeof muted_until !== 'undefined';
    const hasDisabled = typeof disabled !== 'undefined';
    await pool.query(
      `INSERT INTO nudge_preferences (user_id, nudge_code, muted_until, disabled, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, nudge_code)
       DO UPDATE SET
         muted_until = CASE WHEN $5 THEN $3 ELSE nudge_preferences.muted_until END,
         disabled = CASE WHEN $6 THEN $4 ELSE nudge_preferences.disabled END,
         updated_at = NOW()`,
      [req.userId, code, muted_until ?? null, disabled ?? false, hasMuted, hasDisabled]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

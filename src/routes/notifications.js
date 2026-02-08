/**
 * Web Push: subscribe and unsubscribe. No external notification services.
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const pushService = require('../services/pushService');

const router = express.Router();

/**
 * POST /api/notifications/subscribe
 * Body: { subscription: { endpoint, keys: { auth, p256dh } } } (from PushManager.subscribe())
 */
router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ error: 'subscription with endpoint and keys required' });
    }
    await pushService.addSubscription(req.userId, subscription);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Body: { endpoint: "..." }
 */
router.post('/unsubscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    await pushService.removeSubscription(req.userId, endpoint);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/vapid-public-key
 * Returns public key for frontend to subscribe (or 503 if not configured).
 */
router.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push notifications not configured' });
  res.json({ publicKey: key });
});

module.exports = router;

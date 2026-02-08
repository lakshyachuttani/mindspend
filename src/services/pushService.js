/**
 * Web Push: store subscriptions and send notifications.
 * Only active when VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set in env.
 */

const { pool } = require('../db');

let webpush = null;
let vapidSet = false;

function initWebPush() {
  if (vapidSet) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  try {
    webpush = require('web-push');
    webpush.setVapidDetails(
      process.env.VAPID_MAILTO || 'mailto:mindspend@local',
      publicKey,
      privateKey
    );
    vapidSet = true;
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Store a push subscription for the user.
 */
async function addSubscription(userId, subscription) {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.auth || !keys?.p256dh) {
    throw new Error('Invalid subscription: endpoint and keys.auth, keys.p256dh required');
  }
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
    [userId, endpoint, keys.p256dh, keys.auth]
  );
}

/**
 * Remove subscription by endpoint (user can unsubscribe).
 */
async function removeSubscription(userId, endpoint) {
  await pool.query(
    'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
    [userId, endpoint]
  );
}

/**
 * Send a push notification to all subscriptions for the user.
 * Payload should be a string or JSON-serializable object.
 */
async function sendToUser(userId, payload) {
  if (!initWebPush() || !webpush) return;
  const result = await pool.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const send = (sub) => {
    const s = { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } };
    return webpush.sendNotification(s, body).catch((err) => {
      if (err.statusCode === 410 || err.statusCode === 404) {
        pool.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [
          userId,
          sub.endpoint,
        ]).catch(() => {});
      }
    });
  };
  await Promise.all(result.rows.map(send));
}

function isPushAvailable() {
  return initWebPush();
}

module.exports = {
  addSubscription,
  removeSubscription,
  sendToUser,
  isPushAvailable,
};

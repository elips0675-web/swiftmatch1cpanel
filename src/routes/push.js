import { Router } from 'express'
import webpush from 'web-push'
import pool from '../db.js'
import { auth } from '../middleware.js'

const router = Router()

const vapidPublic = process.env.VAPID_PUBLIC_KEY || ''
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || ''

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails('mailto:admin@swiftmatch.app', vapidPublic, vapidPrivate)
}

router.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidPublic || '' })
})

router.post('/api/push/subscribe', async (req, res) => {
  const { endpoint, p256dh, auth: authKey } = req.body
  if (!endpoint || !p256dh || !authKey) {
    return res.status(400).json({ message: 'endpoint, p256dh, and auth are required' })
  }

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)`,
      [req.userId || 1, endpoint, p256dh, authKey],
    )
    res.status(201).json({ message: 'Subscribed' })
  } catch (err) {
    console.error('Push subscribe error:', err)
    res.status(500).json({ message: 'Failed to subscribe' })
  }
})

router.delete('/api/push/subscribe', async (req, res) => {
  const { endpoint } = req.body
  try {
    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [req.userId || 1, endpoint || ''],
    )
    res.json({ message: 'Unsubscribed' })
  } catch (err) {
    console.error('Push unsubscribe error:', err)
    res.status(500).json({ message: 'Failed to unsubscribe' })
  }
})

export async function sendPushToUser(userId, title, body, url = '/') {
  if (!vapidPublic || !vapidPrivate) {
    console.log('VAPID not configured — push skipped')
    return 0
  }

  try {
    const [rows] = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
      [userId],
    )
    let sent = 0
    for (const sub of rows) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url, icon: '/icon-192x192.png' }),
        )
        sent++
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint])
        }
      }
    }
    return sent
  } catch (err) {
    console.error('Send push error:', err)
    return 0
  }
}

export async function sendPushToAll(title, body, url = '/') {
  if (!vapidPublic || !vapidPrivate) {
    console.log('VAPID not configured — push skipped')
    return 0
  }

  try {
    const [rows] = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions',
    )
    let sent = 0
    for (const sub of rows) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url, icon: '/icon-192x192.png' }),
        )
        sent++
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint])
        }
      }
    }
    return sent
  } catch (err) {
    console.error('Send push all error:', err)
    return 0
  }
}

export default router

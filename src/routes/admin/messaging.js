import { Router } from 'express'
import pool from '../../db.js'
import { sendPushToAll } from '../push.js'

const router = Router()

router.get('/campaigns', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, body, target, channel, status,
              DATE_FORMAT(created_at, '%Y-%m-%d') as sentAt,
              delivered, opened, clicked
       FROM campaigns
       ORDER BY created_at DESC`,
    )
    res.json(rows)
  } catch (err) {
    console.error('Campaigns error:', err)
    res.status(500).json({ message: 'Failed to fetch campaigns' })
  }
})

router.post('/campaigns', async (req, res) => {
  const { title, body, target, channel } = req.body
  if (!title || !body) {
    return res.status(400).json({ message: 'Title and body required' })
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO campaigns (title, body, target, channel, admin_id, status, delivered, opened, clicked)
       VALUES (?, ?, ?, ?, ?, 'sent', 0, 0, 0)`,
      [title, body, target || 'all', channel || 'push', req.admin.id],
    )

    if (channel === 'push') {
      sendPushToAll(title, body, '/').catch(err => {
        console.error('Campaign push send failed:', err)
      })
    }

    res.status(201).json({ id: result.insertId, message: 'Campaign sent' })
  } catch (err) {
    console.error('Create campaign error:', err)
    res.status(500).json({ message: 'Failed to create campaign' })
  }
})

export default router

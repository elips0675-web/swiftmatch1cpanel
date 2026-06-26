import { Router } from 'express'
import pool from '../../db.js'

const router = Router()

router.get('/analytics/overview', async (req, res) => {
  try {
    const [[{ mau }]] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as mau
       FROM activity_log
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    )
    const [[{ registrations }]] = await pool.query(
      'SELECT COUNT(*) as registrations FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
    )
    const [[{ conversions }]] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as conversions
       FROM subscriptions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    )
    const conversionRate = registrations > 0 ? ((conversions / registrations) * 100).toFixed(1) : '0.0'
    const [[{ arpu }]] = await pool.query(
      `SELECT COALESCE(AVG(price), 0) as arpu
       FROM subscriptions WHERE is_active = 1`,
    )

    res.json({
      mau: mau.toLocaleString(),
      conversionRate: `${conversionRate}%`,
      arpu: `$${Number(arpu).toFixed(2)}`,
    })
  } catch (err) {
    console.error('Analytics overview error:', err)
    res.status(500).json({ message: 'Failed to fetch analytics' })
  }
})

router.get('/analytics/retention', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 'Day 1' as day, 100 as rate
      UNION SELECT 'Day 3', ROUND(COUNT(DISTINCT CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 3 DAY) THEN id END) / COUNT(*) * 100) FROM users
      UNION SELECT 'Day 7', ROUND(COUNT(DISTINCT CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN id END) / COUNT(*) * 100) FROM users
      UNION SELECT 'Day 14', ROUND(COUNT(DISTINCT CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 14 DAY) THEN id END) / COUNT(*) * 100) FROM users
      UNION SELECT 'Day 30', ROUND(COUNT(DISTINCT CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN id END) / COUNT(*) * 100) FROM users
    `)
    res.json(rows.slice(0, 5))
  } catch (err) {
    console.error('Retention error:', err)
    res.status(500).json({ message: 'Failed to fetch retention' })
  }
})

router.get('/analytics/revenue-mix', async (req, res) => {
  try {
    const [[{ subscriptions }]] = await pool.query(
      `SELECT COALESCE(SUM(price), 0) as subscriptions
       FROM subscriptions WHERE is_active = 1`,
    )
    const total = Number(subscriptions) || 1
    res.json([
      { name: 'Subscriptions', value: Math.round((subscriptions / total) * 100), color: '#fe3c72' },
      { name: 'Boosts', value: Math.round((total * 0.25 / total) * 100), color: '#ff8e53' },
      { name: 'Ads', value: Math.round((total * 0.1 / total) * 100), color: '#3b82f6' },
    ])
  } catch (err) {
    console.error('Revenue mix error:', err)
    res.status(500).json({ message: 'Failed to fetch revenue mix' })
  }
})

router.get('/analytics/registrations', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DAYNAME(created_at) as day, COUNT(*) as users
       FROM users
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DAYOFWEEK(created_at), DAYNAME(created_at)
       ORDER BY DAYOFWEEK(created_at)`,
    )
    const dayMap = { Monday: 'Пн', Tuesday: 'Вт', Wednesday: 'Ср', Thursday: 'Чт', Friday: 'Пт', Saturday: 'Сб', Sunday: 'Вс' }
    res.json(rows.map(r => ({ day: dayMap[r.day] || r.day, users: r.users })))
  } catch (err) {
    console.error('Registrations error:', err)
    res.status(500).json({ message: 'Failed to fetch registrations' })
  }
})

export default router

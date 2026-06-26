import { Router } from 'express'
import pool from '../../db.js'

const router = Router()

router.get('/monetization/pricing', async (req, res) => {
  try {
    const tiers = [
      { tier: 'Plus', key: 'plus', color: '#3b82f6' },
      { tier: 'Gold', key: 'gold', color: '#f59e0b' },
      { tier: 'Platinum', key: 'platinum', color: '#8b5cf6' },
    ]
    const [rows] = await pool.query(
      `SELECT tier,
              SUM(CASE WHEN duration_months = 1 THEN price END) as p1,
              SUM(CASE WHEN duration_months = 6 THEN price END) as p6,
              SUM(CASE WHEN duration_months = 12 THEN price END) as p12
       FROM subscriptions
       GROUP BY tier`,
    )
    const priceMap = {}
    rows.forEach(r => { priceMap[r.tier] = { 1: r.p1, 6: r.p6, 12: r.p12 } })

    const result = tiers.map(t => ({
      ...t,
      prices: {
        1: priceMap[t.key]?.[1] || 0,
        6: priceMap[t.key]?.[6] || 0,
        12: priceMap[t.key]?.[12] || 0,
      },
    }))
    res.json(result)
  } catch (err) {
    console.error('Pricing error:', err)
    res.status(500).json({ message: 'Failed to fetch pricing' })
  }
})

router.get('/monetization/revenue', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(started_at, '%b') as month,
              SUM(CASE WHEN tier IS NOT NULL THEN price ELSE 0 END) as subscriptions,
              0 as ads, 0 as boosts
       FROM subscriptions
       WHERE started_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(started_at, '%Y-%m'), DATE_FORMAT(started_at, '%b')
       ORDER BY MIN(started_at)`,
    )
    res.json(rows)
  } catch (err) {
    console.error('Revenue error:', err)
    res.status(500).json({ message: 'Failed to fetch revenue' })
  }
})

router.put('/monetization/pricing', async (req, res) => {
  const { tiers } = req.body
  if (!Array.isArray(tiers)) return res.status(400).json({ message: 'tiers array required' })
  try {
    await pool.query(
      `INSERT INTO config (config_key, config_value) VALUES ('pricing', ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
      [JSON.stringify(tiers)],
    )
    res.json({ message: 'Pricing saved' })
  } catch (err) {
    console.error('Save pricing error:', err)
    res.status(500).json({ message: 'Failed to save pricing' })
  }
})

router.put('/monetization/ads', async (req, res) => {
  const { google, yandex, googleId, yandexId } = req.body
  try {
    await pool.query(
      `INSERT INTO config (config_key, config_value) VALUES ('ads', ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
      [JSON.stringify({ google, yandex, googleId, yandexId })],
    )
    res.json({ message: 'Ad config saved' })
  } catch (err) {
    console.error('Save ads error:', err)
    res.status(500).json({ message: 'Failed to save ad config' })
  }
})

router.get('/monetization/funnel', async (req, res) => {
  try {
    const visitors = 0
    const [[{ registrations }]] = await pool.query('SELECT COUNT(*) as registrations FROM users')
    const [[{ profiles }]] = await pool.query('SELECT COUNT(*) as profiles FROM user_profiles')
    const [[{ firstLike }]] = await pool.query('SELECT COUNT(DISTINCT from_user_id) as firstLike FROM likes')
    const [[{ premium }]] = await pool.query('SELECT COUNT(DISTINCT user_id) as premium FROM subscriptions WHERE is_active = 1')

    res.json([
      { stage: 'Посетители', count: visitors },
      { stage: 'Регистрации', count: registrations },
      { stage: 'Заполнили профиль', count: profiles },
      { stage: 'Первый лайк', count: firstLike },
      { stage: 'Premium', count: premium },
    ])
  } catch (err) {
    console.error('Funnel error:', err)
    res.status(500).json({ message: 'Failed to fetch funnel' })
  }
})

export default router

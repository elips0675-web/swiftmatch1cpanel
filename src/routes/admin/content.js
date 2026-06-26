import { Router } from 'express'
import pool from '../../db.js'

const router = Router()

async function getContentConfig() {
  const [[row]] = await pool.query('SELECT * FROM content_config WHERE id = 1')
  if (!row) return null
  function p(v, fb) { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { return JSON.parse(v) } catch {} } return fb || [] }
  return {
    interests: p(row.interests, []),
    dating_goals: p(row.dating_goals, []),
    education: p(row.education, []),
    banned_words: p(row.banned_words, []),
  }
}

router.get('/content', async (req, res) => {
  try {
    const config = await getContentConfig()
    if (!config) return res.json({ interests: [], dating_goals: [], education: [], banned_words: [] })

    const [cities] = await pool.query(
      'SELECT DISTINCT city FROM user_profiles WHERE city IS NOT NULL AND city != "" ORDER BY city',
    )

    res.json({ ...config, cities: cities.map(c => c.city) })
  } catch (err) {
    console.error('Content fetch error:', err)
    res.status(500).json({ message: 'Failed to fetch content' })
  }
})

router.put('/content/:section', async (req, res) => {
  const { section } = req.params
  const allowed = ['interests', 'dating_goals', 'education', 'banned_words']
  if (!allowed.includes(section)) {
    return res.status(400).json({ message: 'Invalid section' })
  }
  try {
    const config = await getContentConfig() || { interests: [], dating_goals: [], education: [], banned_words: [] }
    config[section] = req.body.items || []

    await pool.query(
      `INSERT INTO content_config (id, interests, dating_goals, education, banned_words)
       VALUES (1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ${section} = ?`,
      [
        JSON.stringify(config.interests),
        JSON.stringify(config.dating_goals),
        JSON.stringify(config.education),
        JSON.stringify(config.banned_words),
        JSON.stringify(config[section]),
      ],
    )
    res.json({ message: `${section} updated`, items: config[section] })
  } catch (err) {
    console.error('Content update error:', err)
    res.status(500).json({ message: 'Failed to update content' })
  }
})

export default router

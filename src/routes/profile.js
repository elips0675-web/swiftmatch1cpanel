import { Router } from 'express'
import pool from '../db.js'
import { auth } from '../middleware.js'

const router = Router()

function parseJsonField(val, fallback) {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback || [] } }
  return fallback || []
}

router.get('/api/profile/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT up.*, u.email FROM user_profiles up
       JOIN users u ON u.id = up.id
       WHERE up.id = ?`,
      [req.params.id],
    )
    if (rows.length === 0) return res.status(404).json({ message: 'Profile not found' })

    const [photos] = await pool.query(
      'SELECT id, url, sort_order, is_avatar FROM user_photos WHERE user_id = ? ORDER BY sort_order',
      [req.params.id],
    )
    const [interests] = await pool.query(
      `SELECT i.id, i.name_ru, i.name_en FROM interests i
       JOIN user_interests ui ON ui.interest_id = i.id
       WHERE ui.user_id = ?`,
      [req.params.id],
    )

    res.json({ ...rows[0], photos, interests })
  } catch (err) {
    console.error('Profile GET error:', err)
    res.status(500).json({ message: 'Failed to fetch profile' })
  }
})

router.put('/api/profile/:id', async (req, res) => {
  try {
    const { display_name, name, age, bio, gender, looking_for, dating_goal, height, city, country, zodiac, circadian, attachment_style, education, interests } = req.body

    await pool.query(
      `UPDATE user_profiles SET
        display_name = COALESCE(?, display_name),
        name = COALESCE(?, name),
        age = COALESCE(?, age),
        bio = COALESCE(?, bio),
        gender = COALESCE(?, gender),
        looking_for = COALESCE(?, looking_for),
        dating_goal = COALESCE(?, dating_goal),
        height = COALESCE(?, height),
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        zodiac = COALESCE(?, zodiac),
        circadian = COALESCE(?, circadian),
        attachment_style = COALESCE(?, attachment_style),
        education = COALESCE(?, education)
      WHERE id = ?`,
      [display_name, name, age, bio, gender, looking_for, dating_goal, height, city, country, zodiac, circadian, attachment_style, education, req.params.id],
    )

    if (interests && Array.isArray(interests)) {
      await pool.query('DELETE FROM user_interests WHERE user_id = ?', [req.params.id])
      for (const interestId of interests) {
        await pool.query('INSERT IGNORE INTO user_interests (user_id, interest_id) VALUES (?, ?)', [req.params.id, interestId])
      }
    }

    const [rows] = await pool.query('SELECT * FROM user_profiles WHERE id = ?', [req.params.id])
    res.json(rows[0])
  } catch (err) {
    console.error('Profile PUT error:', err)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

// ─── Account deletion ──────────────────────────────────────────
router.delete('/api/profile/me', auth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = 0, email = CONCAT(email, \'.deleted\', UNIX_TIMESTAMP()) WHERE id = ?', [req.userId])
    res.json({ message: 'Account deleted' })
  } catch (err) {
    console.error('Delete account error:', err)
    res.status(500).json({ message: 'Failed to delete account' })
  }
})

export default router

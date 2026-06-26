import { Router } from 'express'
import pool from '../../db.js'

const router = Router()

router.get('/features', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM feature_flags WHERE id = 1')
    if (!row) {
      return res.json({
        videoCalls: true, aiIcebreakers: true, aiCompatibility: true,
        groupsPage: true, contest: true, showAds: false, autosearch: true,
      })
    }
    res.json({
      videoCalls: Boolean(row.video_calls_enabled),
      aiIcebreakers: Boolean(row.ai_icebreakers_enabled),
      aiCompatibility: Boolean(row.ai_compatibility_enabled),
      groupsPage: Boolean(row.groups_page_enabled),
      contest: Boolean(row.contest_enabled),
      showAds: Boolean(row.show_ads),
      autosearch: Boolean(row.autosearch_enabled),
    })
  } catch (err) {
    console.error('Features fetch error:', err)
    res.status(500).json({ message: 'Failed to fetch features' })
  }
})

router.put('/features', async (req, res) => {
  try {
    const flags = req.body
    await pool.query(
      `UPDATE feature_flags SET
        video_calls_enabled = ?, ai_icebreakers_enabled = ?,
        ai_compatibility_enabled = ?, groups_page_enabled = ?,
        contest_enabled = ?, show_ads = ?, autosearch_enabled = ?
       WHERE id = 1`,
      [
        Boolean(flags.videoCalls), Boolean(flags.aiIcebreakers),
        Boolean(flags.aiCompatibility), Boolean(flags.groupsPage),
        Boolean(flags.contest), Boolean(flags.showAds), Boolean(flags.autosearch),
      ],
    )
    res.json({ message: 'Feature flags updated' })
  } catch (err) {
    console.error('Features update error:', err)
    res.status(500).json({ message: 'Failed to update features' })
  }
})

export default router

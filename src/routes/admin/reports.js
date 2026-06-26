import { Router } from 'express'
import pool from '../../db.js'

const router = Router()

router.get('/reports', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.reason, r.description, r.status,
              DATE_FORMAT(r.created_at, '%Y-%m-%d') as date,
              reporter.display_name as reporterName,
              reported.display_name as reportedUserName,
              r.evidence
       FROM reports r
       LEFT JOIN user_profiles reporter ON r.reporter_id = reporter.id
       LEFT JOIN user_profiles reported ON r.reported_id = reported.id
       ORDER BY r.created_at DESC`,
    )
    res.json(rows)
  } catch (err) {
    console.error('Reports error:', err)
    res.status(500).json({ message: 'Failed to fetch reports' })
  }
})

router.post('/reports/:id/status', async (req, res) => {
  const { status } = req.body
  const allowed = ['reviewed', 'dismissed', 'action_taken']
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }
  try {
    await pool.query('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id])

    if (status === 'action_taken') {
      const [[report]] = await pool.query('SELECT reported_id FROM reports WHERE id = ?', [req.params.id])
      if (report) {
        await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [report.reported_id])
        await pool.query(
          'INSERT INTO moderation_log (admin_id, target_user_id, action, reason) VALUES (?, ?, ?, ?)',
          [req.admin.id, report.reported_id, 'banned', 'Automatic ban from report'],
        )
      }
    }
    res.json({ message: `Report #${req.params.id} marked as ${status}` })
  } catch (err) {
    console.error('Report status error:', err)
    res.status(500).json({ message: 'Failed to update report' })
  }
})

router.get('/moderation-log', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ml.id, DATE_FORMAT(ml.created_at, '%Y-%m-%d') as date,
              admin.display_name as admin, ml.action,
              target.display_name as targetUser, ml.reason
       FROM moderation_log ml
       LEFT JOIN user_profiles admin ON ml.admin_id = admin.id
       LEFT JOIN user_profiles target ON ml.target_user_id = target.id
       ORDER BY ml.created_at DESC
       LIMIT 100`,
    )
    res.json(rows)
  } catch (err) {
    console.error('Moderation log error:', err)
    res.status(500).json({ message: 'Failed to fetch moderation log' })
  }
})

export default router

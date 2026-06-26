import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import pool from '../db.js'
import { optionalAuth } from '../middleware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, unique + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i
    if (allowed.test(path.extname(file.originalname))) return cb(null, true)
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'))
  },
})

const router = Router()

router.post('/api/upload', optionalAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const userId = req.userId || req.body.user_id || 17
    const sortOrder = req.body.sort_order || 0
    const url = `/uploads/${req.file.filename}`

    const [result] = await pool.query(
      'INSERT INTO user_photos (user_id, url, sort_order) VALUES (?, ?, ?)',
      [userId, url, parseInt(sortOrder)],
    )

    res.json({
      id: result.insertId,
      url,
      sort_order: parseInt(sortOrder),
      is_avatar: false,
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ message: 'Upload failed' })
  }
})

router.delete('/api/photos/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT url FROM user_photos WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ message: 'Photo not found' })

    const filePath = path.join(UPLOAD_DIR, path.basename(rows[0].url))
    try { fs.unlinkSync(filePath) } catch {}

    await pool.query('DELETE FROM user_photos WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('Delete photo error:', err)
    res.status(500).json({ message: 'Delete failed' })
  }
})

router.get('/api/photos/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, url, sort_order, is_avatar FROM user_photos WHERE user_id = ? ORDER BY sort_order',
      [req.params.userId],
    )
    res.json(rows)
  } catch (err) {
    console.error('Photos GET error:', err)
    res.status(500).json({ message: 'Failed to fetch photos' })
  }
})

export default router

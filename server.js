import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import pool from './src/db.js'
import { initIO } from './src/ws.js'
import { createLogger, rootLogger } from './src/logger.js'

import adminDashboard from './src/routes/admin/dashboard.js'
import adminUsers from './src/routes/admin/users.js'
import adminAnalytics from './src/routes/admin/analytics.js'
import adminReports from './src/routes/admin/reports.js'
import adminContent from './src/routes/admin/content.js'
import adminFeatures from './src/routes/admin/features.js'
import adminMessaging from './src/routes/admin/messaging.js'
import adminMonetization from './src/routes/admin/monetization.js'
import profileRoutes from './src/routes/profile.js'
import uploadRoutes from './src/routes/upload.js'
import pushRoutes from './src/routes/push.js'
import socialRoutes from './src/routes/social.js'
import premiumRoutes from './src/routes/premium.js'
import authRoutes, { createRefreshToken } from './src/routes/auth.js'
import adminModerationRoutes from './src/routes/admin-moderation.js'
import { JWT_SECRET } from './src/middleware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3001

const limiter = rateLimit({ windowMs: 60_000, max: 100, message: { message: 'Too many requests' } })
const authLimiter = rateLimit({ windowMs: 60_000, max: 10, message: { message: 'Too many auth attempts' } })

app.use(cors({ origin: process.env.CORS_ORIGIN || process.env.APP_URL || '*' }))
app.use(helmet())

app.use((req, res, next) => {
  req.rid = req.headers['x-request-id'] || crypto.randomUUID()
  res.setHeader('X-Request-Id', req.rid)
  req.log = createLogger(req.rid)
  next()
})

app.use('/api/premium/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())

const publicDir = path.join(__dirname, 'public')
app.use(express.static(publicDir))

app.use('/api/', limiter)
app.use('/api/auth/', authLimiter)

async function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next()
  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    const [rows] = await pool.query(
      'SELECT id, role FROM users WHERE id = ? AND role = ? AND is_active = 1',
      [decoded.userId, 'admin'],
    )
    if (rows.length === 0) return next()
    req.admin = rows[0]
    next()
  } catch { next() }
}

app.post('/api/auth/dev-login', async (req, res) => {
  const token = jwt.sign({ userId: 2, role: 'user' }, JWT_SECRET, { expiresIn: '24h' })
  res.json({ token, role: 'user' })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' })
  try {
    const [rows] = await pool.query(
      'SELECT id, email, role, password_hash, email_verified_at FROM users WHERE email = ? AND is_active = 1',
      [email],
    )
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' })
    const user = rows[0]
    const { default: bcrypt } = await import('bcryptjs')
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
    const refresh_token = await createRefreshToken(user.id)
    res.json({ token, refresh_token, role: user.role, email_verified: !!user.email_verified_at })
  } catch (err) {
    req.log.error('Login error', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.get('/api/content', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM content_config WHERE id = 1')
    if (!row) return res.json({ interests: [], dating_goals: [], education: [], banned_words: [], cities: [] })
    function parseJsonField(val, fallback) {
      if (Array.isArray(val)) return val
      if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback || [] } }
      return fallback || []
    }
    const [cities] = await pool.query(
      'SELECT DISTINCT city FROM user_profiles WHERE city IS NOT NULL AND city != "" ORDER BY city',
    )
    res.json({
      interests: parseJsonField(row.interests, []),
      dating_goals: parseJsonField(row.dating_goals, []),
      education: parseJsonField(row.education, []),
      banned_words: parseJsonField(row.banned_words, []),
      cities: cities.map(c => c.city),
    })
  } catch (err) {
    req.log.error('Public content error', err)
    res.status(500).json({ message: 'Failed to fetch content' })
  }
})

app.use(profileRoutes)
app.use(uploadRoutes)
app.use(pushRoutes)
app.use(premiumRoutes)
app.use(socialRoutes)
app.use(authRoutes)

app.use('/api/admin', adminAuth)
app.get('/api/admin/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' })
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
    const [rows] = await pool.query(
      'SELECT u.id, u.role, up.display_name as name, u.email FROM users u LEFT JOIN user_profiles up ON u.id = up.id WHERE u.id = ?',
      [decoded.userId],
    )
    if (rows.length === 0) return res.status(401).json({ message: 'User not found' })
    res.json(rows[0])
  } catch { res.status(401).json({ message: 'Invalid token' }) }
})

app.use('/api/admin', adminDashboard)
app.use('/api/admin', adminUsers)
app.use('/api/admin', adminAnalytics)
app.use('/api/admin', adminReports)
app.use('/api/admin', adminContent)
app.use('/api/admin', adminFeatures)
app.use('/api/admin', adminMessaging)
app.use('/api/admin', adminMonetization)
app.use('/api/admin', adminModerationRoutes)

app.use((err, req, res, next) => {
  const log = req.log || rootLogger
  log.error('Unhandled error', err)
  res.status(500).json({ message: 'Internal server error' })
})

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not found' })
  res.sendFile(path.join(publicDir, 'index.html'))
})

const httpServer = createServer(app)
initIO(httpServer)
httpServer.listen(PORT, () => {
  rootLogger.info(`SwiftMatch API running on port ${PORT}`)
})

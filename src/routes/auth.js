import { Router } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import pool from '../db.js'
import { JWT_SECRET } from '../middleware.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../mail.js'

const router = Router()
const REFRESH_EXPIRY_DAYS = 30

async function createRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex')
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
    [userId, token, REFRESH_EXPIRY_DAYS],
  )
  return token
}

router.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' })
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length > 0) return res.status(409).json({ message: 'Email already registered' })

    const { default: bcrypt } = await import('bcryptjs')
    const password_hash = await bcrypt.hash(password, 10)
    const verification_token = crypto.randomBytes(32).toString('hex')

    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, role, verification_token) VALUES (?, ?, ?, ?)',
      [email, password_hash, 'user', verification_token],
    )
    const userId = result.insertId

    await pool.query(
      'INSERT INTO user_profiles (id, display_name, name) VALUES (?, ?, ?)',
      [userId, displayName || email.split('@')[0], displayName || email.split('@')[0]],
    )

    const token = jwt.sign({ userId, role: 'user' }, JWT_SECRET, { expiresIn: '24h' })
    const refresh_token = await createRefreshToken(userId)
    sendVerificationEmail(email, verification_token)
    res.status(201).json({ token, refresh_token, userId, message: 'Account created' })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ message: 'Failed to create account' })
  }
})

router.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'Email required' })

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    if (rows.length === 0) return res.json({ message: 'If the email exists, a reset link has been sent' })

    const token = crypto.randomBytes(32).toString('hex')
    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
      [token, rows[0].id],
    )

    sendPasswordResetEmail(email, token)
    res.json({ message: 'If the email exists, a reset link has been sent' })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ message: 'Failed to process request' })
  }
})

router.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ message: 'Token and password required' })
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })

  try {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token],
    )
    if (rows.length === 0) return res.status(400).json({ message: 'Invalid or expired token' })

    const { default: bcrypt } = await import('bcryptjs')
    const password_hash = await bcrypt.hash(password, 10)
    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [password_hash, rows[0].id],
    )

    res.json({ message: 'Password reset successful' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ message: 'Failed to reset password' })
  }
})

router.post('/api/auth/resend-verification', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'Email required' })

  try {
    const [rows] = await pool.query(
      'SELECT id, email_verified_at FROM users WHERE email = ?',
      [email],
    )
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' })
    if (rows[0].email_verified_at) return res.json({ message: 'Email already verified' })

    const verification_token = crypto.randomBytes(32).toString('hex')
    await pool.query(
      'UPDATE users SET verification_token = ? WHERE id = ?',
      [verification_token, rows[0].id],
    )

    sendVerificationEmail(email, verification_token)
    res.json({ message: 'Verification email sent' })
  } catch (err) {
    console.error('Resend verification error:', err)
    res.status(500).json({ message: 'Failed to resend verification' })
  }
})

router.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ message: 'Token required' })

  try {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE verification_token = ?',
      [token],
    )
    if (rows.length === 0) return res.status(400).json({ message: 'Invalid token' })

    await pool.query(
      'UPDATE users SET email_verified_at = NOW(), verification_token = NULL WHERE id = ?',
      [rows[0].id],
    )

    res.json({ message: 'Email verified' })
  } catch (err) {
    console.error('Verify email error:', err)
    res.status(500).json({ message: 'Failed to verify email' })
  }
})

router.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body
  if (!refresh_token) return res.status(400).json({ message: 'Refresh token required' })

  try {
    const [rows] = await pool.query(
      'SELECT user_id FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
      [refresh_token],
    )
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid or expired refresh token' })

    const { userId } = rows[0]
    await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [refresh_token])

    const token = jwt.sign({ userId, role: 'user' }, JWT_SECRET, { expiresIn: '24h' })
    const new_refresh_token = await createRefreshToken(userId)
    res.json({ token, refresh_token: new_refresh_token })
  } catch (err) {
    console.error('Refresh error:', err)
    res.status(500).json({ message: 'Failed to refresh token' })
  }
})

export { createRefreshToken }
export default router

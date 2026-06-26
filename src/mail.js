import nodemailer from 'nodemailer'

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  if (!host) return null

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return transporter
}

const FROM = process.env.SMTP_FROM || 'noreply@swiftmatch.app'

export async function sendPasswordResetEmail(to, token) {
  const transport = getTransporter()
  if (!transport) {
    console.log(`[mail] SMTP not configured. Would send password reset to ${to}: token=${token}`)
    return
  }
  const resetUrl = `${process.env.CORS_ORIGIN || 'http://localhost:8080'}/reset-password?token=${token}`
  await transport.sendMail({
    from: FROM,
    to,
    subject: 'Reset your SwiftMatch password',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
  })
}

export async function sendVerificationEmail(to, token) {
  const transport = getTransporter()
  if (!transport) {
    console.log(`[mail] SMTP not configured. Would send verification to ${to}: token=${token}`)
    return
  }
  const verifyUrl = `${process.env.CORS_ORIGIN || 'http://localhost:8080'}/verify-email?token=${token}`
  await transport.sendMail({
    from: FROM,
    to,
    subject: 'Verify your SwiftMatch email',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email address.</p>`,
  })
}

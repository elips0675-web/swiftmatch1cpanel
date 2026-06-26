import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from './middleware.js'

let io = null

export function initIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      socket.userId = decoded.userId
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.userId
    socket.join(`user:${userId}`)
    console.log(`WS user:${userId} connected`)

    socket.on('disconnect', () => {
      console.log(`WS user:${userId} disconnected`)
    })
  })

  return io
}

export function getIO() {
  return io
}

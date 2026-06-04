require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const chatRoutes = require('./routes/chats')
const messageRoutes = require('./routes/messages')
const messageActions = require('./routes/messageActions')
const User = require('./models/User')
const Chat = require('./models/Chat')

const uploadDir = path.join(__dirname, '../storage/uploads')
fs.mkdirSync(uploadDir, { recursive: true })

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.set('io', io)
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use('/uploads', express.static(uploadDir))
app.use('/api', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/chats', messageRoutes)
app.use('/api/messages', messageActions)
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

const onlineUsers = new Map()
const screenSessions = new Map()

function emitViewerState(session, status) {
  if (!session?.hostSocketId) return
  io.to(session.hostSocketId).emit('screen:viewer_state', {
    sessionId: session.sessionId,
    status,
    viewerId: session.viewerId || null,
    viewerName: session.viewerName || '',
    viewerAvatar: session.viewerAvatar || null,
  })
}

function cleanupScreenSession(sessionId, reason = 'ended') {
  const session = screenSessions.get(sessionId)
  if (!session) return
  if (session.hostSocketId) io.to(session.hostSocketId).emit('screen:ended', { sessionId, reason })
  if (session.viewerSocketId) io.to(session.viewerSocketId).emit('screen:ended', { sessionId, reason })
  screenSessions.delete(sessionId)
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Нет токена'))
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET || 'secret123')
    next()
  } catch {
    next(new Error('Недействительный токен'))
  }
})

io.on('connection', socket => {
  const userId = String(socket.user.id)
  socket.join(`user:${userId}`)
  onlineUsers.set(userId, socket.id)
  socket.emit('users:online_list', [...onlineUsers.keys()])
  socket.broadcast.emit('user:online', userId)

  User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }).catch(() => {})

  socket.on('chat:join', chatId => { if (chatId) socket.join(`chat:${chatId}`) })
  socket.on('chat:leave', chatId => { if (chatId) socket.leave(`chat:${chatId}`) })

  socket.on('typing:start', async ({ chatId }) => {
    if (!chatId) return
    try {
      const chat = await Chat.findById(chatId).select('members')
      ;(chat?.members || []).forEach(memberId => {
        const id = String(memberId)
        if (id !== userId) io.to(`user:${id}`).emit('typing:start', { userId, chatId, displayName: socket.user.display_name, avatar: socket.user.avatar })
      })
    } catch {}
  })

  socket.on('typing:stop', async ({ chatId }) => {
    if (!chatId) return
    try {
      const chat = await Chat.findById(chatId).select('members')
      ;(chat?.members || []).forEach(memberId => {
        const id = String(memberId)
        if (id !== userId) io.to(`user:${id}`).emit('typing:stop', { userId, chatId })
      })
    } catch {}
  })

  socket.on('screen:register', ({ sessionId, chatId, messageId }) => {
    if (!sessionId || !chatId) return
    screenSessions.set(String(sessionId), {
      sessionId: String(sessionId),
      chatId: String(chatId),
      messageId: messageId || null,
      hostId: userId,
      hostSocketId: socket.id,
      viewerId: null,
      viewerSocketId: null,
      viewerName: '',
      viewerAvatar: null,
      createdAt: Date.now(),
    })
  })

  socket.on('screen:join', ({ sessionId, chatId }) => {
    const session = screenSessions.get(String(sessionId))
    if (!session || String(session.chatId) !== String(chatId)) {
      socket.emit('screen:error', { sessionId, message: 'Демонстрация не найдена' })
      return
    }
    if (session.viewerSocketId && session.viewerSocketId !== socket.id) {
      socket.emit('screen:error', { sessionId, message: 'Кто-то уже подключён' })
      return
    }
    session.viewerId = userId
    session.viewerSocketId = socket.id
    session.viewerName = socket.user.display_name || ''
    session.viewerAvatar = socket.user.avatar || null
    io.to(session.hostSocketId).emit('screen:joined', { sessionId, viewerId: userId, viewerName: socket.user.display_name, viewerAvatar: socket.user.avatar })
    emitViewerState(session, 'joined')
    socket.emit('screen:joined', { sessionId, hostId: session.hostId })
  })

  socket.on('screen:leave', ({ sessionId }) => {
    const session = screenSessions.get(String(sessionId))
    if (!session) return
    if (session.viewerSocketId === socket.id || String(session.viewerId) === userId) {
      session.viewerId = null
      session.viewerSocketId = null
      session.viewerName = ''
      session.viewerAvatar = null
      if (session.hostSocketId) io.to(session.hostSocketId).emit('screen:viewer_left', { sessionId })
      emitViewerState(session, 'left')
    }
  })

  socket.on('screen:signal', ({ sessionId, data }) => {
    const session = screenSessions.get(String(sessionId))
    if (!session) return
    const isHost = session.hostSocketId === socket.id
    const targetSocketId = isHost ? session.viewerSocketId : session.hostSocketId
    if (!targetSocketId) return
    io.to(targetSocketId).emit('screen:signal', { sessionId, data, fromId: userId })
  })

  socket.on('screen:end', ({ sessionId }) => {
    const session = screenSessions.get(String(sessionId))
    if (!session) return
    if (session.hostSocketId !== socket.id && session.viewerSocketId !== socket.id) return
    cleanupScreenSession(String(sessionId), 'ended')
  })

  socket.on('disconnect', () => {
    onlineUsers.delete(userId)
    io.emit('user:offline', userId)
    User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).catch(() => {})
    for (const [sessionId, session] of [...screenSessions.entries()]) {
      if (session.hostSocketId === socket.id) {
        cleanupScreenSession(sessionId, 'host_left')
      } else if (session.viewerSocketId === socket.id) {
        session.viewerId = null
        session.viewerSocketId = null
        session.viewerName = ''
        session.viewerAvatar = null
        if (session.hostSocketId) io.to(session.hostSocketId).emit('screen:viewer_left', { sessionId })
        emitViewerState(session, 'left')
      }
    }
  })
})

const distPath = path.join(__dirname, '../../frontend/dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

const PORT = Number(process.env.PORT || 3001)
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/messenger'

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('MongoDB подключена')
    server.listen(PORT, '0.0.0.0', () => console.log(`Сервер запущен на порту ${PORT}`))
  })
  .catch(err => {
    console.error('Ошибка MongoDB:', err.message)
    process.exit(1)
  })

process.on('SIGINT', async () => {
  await mongoose.disconnect()
  process.exit(0)
})

setInterval(() => {
  const url = process.env.RENDER_URL;
  if (url) {
    require('https').get(url).on('error', () => {});
  }
}, 10 * 60 * 1000);

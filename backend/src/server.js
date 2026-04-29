require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const jwt        = require('jsonwebtoken');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../storage/uploads')));

app.use('/api',          require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/chats',    require('./routes/chats'));
app.use('/api/groups',   require('./routes/groups'));
app.use('/api/messages', require('./routes/messageActions'));

io.use((socket, next) => {
  const raw   = socket.handshake.auth?.token || '';
  const token = raw.replace(/^Bearer\s+/i, '');
  if (!token) return next(new Error('No token'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET || 'trinity_secret_key_2024');
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

const online = new Map();
const screenSessions = new Map();

io.on('connection', socket => {
  const uid = String(socket.user.id);
  online.set(uid, socket.id);
  socket.join('user:' + uid);
  socket.broadcast.emit('user:online', uid);
  socket.emit('users:online_list', [...online.keys()]);

  // === TYPING INDICATORS ===
  socket.on('typing:start', ({ chatId }) => {
    socket.to('chat:' + chatId).emit('typing:start', {
      userId: uid,
      chatId,
      displayName: socket.user.display_name,
    });
  });

  socket.on('typing:stop', ({ chatId }) => {
    socket.to('chat:' + chatId).emit('typing:stop', { userId: uid, chatId });
  });

  // === SCREEN SHARING (FIXED) ===
  socket.on('screen:register', ({ sessionId }) => {
    screenSessions.set(sessionId, {
      presenter: uid,
      viewers: [],
      presenterSocket: socket.id
    });
    socket.join('screen:' + sessionId);
    console.log(`📺 Screen session created: ${sessionId} by ${uid}`);
  });

  socket.on('screen:join', ({ sessionId }) => {
    const session = screenSessions.get(sessionId);
    if (session && session.presenter !== uid) {
      session.viewers.push(uid);
      socket.join('screen:' + sessionId);
      
      // Уведомить презентера о зрителе
      io.to('screen:' + sessionId).emit('screen:viewer_joined', {
        sessionId,
        viewerId: uid,
        viewerName: socket.user.nickname,
        totalViewers: session.viewers.length
      });
      console.log(`👁️ Viewer joined: ${uid} to session ${sessionId}`);
    }
  });

  // Сигналы WebRTC (от презентера к зрителям)
  socket.on('screen:signal', ({ sessionId, data }) => {
    const session = screenSessions.get(sessionId);
    if (session && session.presenter === uid) {
      // Презентер отправляет сигнал -> все зрители получают
      socket.to('screen:' + sessionId).emit('screen:signal', { 
        sessionId, 
        data,
        fromPresenter: true 
      });
    }
  });

  // Ответы зрителей (к презентеру)
  socket.on('screen:answer', ({ sessionId, data }) => {
    const session = screenSessions.get(sessionId);
    if (session && session.viewers.includes(uid)) {
      // Зритель отправляет ответ -> только презентер получает
      io.to(session.presenterSocket).emit('screen:answer', {
        sessionId,
        data,
        viewerId: uid
      });
    }
  });

  socket.on('screen:end', ({ sessionId }) => {
    const session = screenSessions.get(sessionId);
    if (session && session.presenter === uid) {
      io.to('screen:' + sessionId).emit('screen:ended', { sessionId });
      screenSessions.delete(sessionId);
      console.log(`🛑 Screen session ended: ${sessionId}`);
    }
  });

  socket.on('screen:leave', ({ sessionId }) => {
    const session = screenSessions.get(sessionId);
    if (session) {
      session.viewers = session.viewers.filter(v => v !== uid);
      socket.to('screen:' + sessionId).emit('screen:viewer_left', {
        sessionId,
        viewerId: uid,
        totalViewers: session.viewers.length
      });
      socket.leave('screen:' + sessionId);
      console.log(`👁️ Viewer left: ${uid} from session ${sessionId}`);
    }
  });

  // === MESSAGES ===
  socket.on('message:send', (msg) => {
    if (msg.chatId) {
      socket.to('chat:' + msg.chatId).emit('message:received', msg);
    } else if (msg.groupId) {
      socket.to('group:' + msg.groupId).emit('message:received', msg);
    }
  });

  socket.on('chat:join', ({ chatId }) => {
    socket.join('chat:' + chatId);
  });

  socket.on('group:join', ({ groupId }) => {
    socket.join('group:' + groupId);
  });

  socket.on('disconnect', () => {
    online.delete(uid);
    socket.broadcast.emit('user:offline', uid);
    
    // Закрыть все сессии презентера
    for (const [sessionId, session] of screenSessions.entries()) {
      if (session.presenter === uid) {
        io.to('screen:' + sessionId).emit('screen:ended', { sessionId });
        screenSessions.delete(sessionId);
      }
    }
  });
});

mongoose
    .connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/trinitychatdb')
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server started on port ${PORT}`));

process.on('SIGINT', async () => {
  await mongoose.disconnect();
  process.exit(0);
});

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
app.use('/api/messages', require('./routes/messageActions'));

io.use((socket, next) => {
  const raw   = socket.handshake.auth?.token || '';
  const token = raw.replace(/^Bearer\s+/i, '');
  if (!token) return next(new Error('No token'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

const online = new Map();

io.on('connection', socket => {
  const uid = String(socket.user.id);
  online.set(uid, socket.id);
  socket.join('user:' + uid);
  socket.broadcast.emit('user:online', uid);
  socket.emit('users:online_list', [...online.keys()]);

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

  socket.on('screen:register', ({ sessionId }) => {
    socket.join('screen:' + sessionId);
  });

  socket.on('screen:join', ({ sessionId }) => {
    socket.join('screen:' + sessionId);
    io.to('screen:' + sessionId).emit('screen:joined', {
      sessionId,
      viewerId:     uid,
      viewerName:   socket.user.display_name,
      viewerAvatar: socket.user.avatar || null,
    });
  });

  socket.on('screen:signal', ({ sessionId, data }) => {
    socket.to('screen:' + sessionId).emit('screen:signal', { sessionId, data });
  });

  socket.on('screen:end', ({ sessionId }) => {
    io.to('screen:' + sessionId).emit('screen:ended', { sessionId });
  });

  socket.on('screen:leave', ({ sessionId }) => {
    socket.to('screen:' + sessionId).emit('screen:viewer_left', { sessionId });
    socket.leave('screen:' + sessionId);
  });

  socket.on('disconnect', () => {
    online.delete(uid);
    socket.broadcast.emit('user:offline', uid);
  });
});

mongoose
    .connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/messengerdb')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log('Server started on port ' + PORT));

process.on('SIGINT', async () => {
  await mongoose.disconnect();
  process.exit(0);
});
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const messageActions = require('./routes/messageActions');

const uploadDir = path.join(__dirname, '../storage/uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const messageActionsRoutes = require('./routes/messageActions');
const groupRoutes = require('./routes/groups');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const io = socketIo(server, { cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', methods: ['GET', 'POST'] } });

app.set('io', io);
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/chats', messageRoutes);
app.use('/api/messages', messageActions);
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/messenger')
    .then(() => console.log('MongoDB подключена'))
    .catch(err => console.error('Ошибка MongoDB:', err));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/chats', messageRoutes);
app.use('/api/messages', messageActionsRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const onlineUsers = new Map();
const screenSessions = new Map();

app.get('/api/online', (_, res) => res.json([...onlineUsers.keys()]));

function emitViewerState(session, status) {
    if (!session?.hostSocketId) return;
    io.to(session.hostSocketId).emit('screen:viewer_state', {
        sessionId: session.sessionId,
        status,
        viewerId: session.viewerId || null,
        viewerName: session.viewerName || '',
        viewerAvatar: session.viewerAvatar || null,
    });
}

function cleanupScreenSession(sessionId, reason = 'ended') {
    const session = screenSessions.get(sessionId);
    if (!session) return;
    if (session.hostSocketId) io.to(session.hostSocketId).emit('screen:ended', { sessionId, reason });
    if (session.viewerSocketId) io.to(session.viewerSocketId).emit('screen:ended', { sessionId, reason });
    screenSessions.delete(sessionId);
}

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Нет токена'));
    try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        next(new Error('Недействительный токен'));
    }
});

io.on('connection', (socket) => {
    socket.on('user:connected', async (userId) => {
        if (!userId) return;
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.emit('users:online_list', [...onlineUsers.keys()]);
        socket.broadcast.emit('user:online', userId);
        const User = require('./models/User');
        await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }).catch(console.error);
    });

    socket.on('user:disconnected', async (userId) => {
        if (!userId) return;
        onlineUsers.delete(userId);
        socket.broadcast.emit('user:offline', userId);
        const User = require('./models/User');
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).catch(console.error);
    });

    socket.on('chat:join', (chatId) => { if (chatId) socket.join('chat:' + chatId); });
    socket.on('chat:leave', (chatId) => { if (chatId) socket.leave('chat:' + chatId); });

    socket.on('message:send', ({ chatId, message }) => { if (chatId && message) socket.to('chat:' + chatId).emit('message:new', message); });
    socket.on('message:delete', ({ chatId, messageId }) => { if (chatId && messageId) io.to('chat:' + chatId).emit('message:deleted', messageId); });
    socket.on('message:react', ({ chatId, messageId, reactions }) => { if (chatId && messageId) io.to('chat:' + chatId).emit('message:reacted', { messageId, reactions }); });
io.on('connection', socket => {
    const userId = String(socket.user.id);
    socket.join(`user:${userId}`);
    onlineUsers.set(userId, socket.id);
    socket.emit('users:online_list', [...onlineUsers.keys()]);
    socket.broadcast.emit('user:online', userId);

    socket.on('typing:start', async ({ chatId }) => {
        try {
            const Chat = require('./models/Chat');
            const chat = await Chat.findById(chatId).select('members');
            (chat?.members || []).forEach(memberId => {
                const id = String(memberId);
                if (id !== userId) io.to(`user:${id}`).emit('typing:start', { userId, chatId, displayName: socket.user.display_name, avatar: socket.user.avatar });
            });
        } catch {}
        if (!chatId || !socket.userId) return;
        const Chat = require('./models/Chat');
        const chat = await Chat.findById(chatId).select('members').catch(() => null);
        if (chat?.members) chat.members.forEach(uid => { if (String(uid) !== String(socket.userId)) io.to('user:' + uid).emit('typing:start', { userId: socket.userId, chatId }); });
    });

    socket.on('typing:stop', async ({ chatId }) => {
        if (!chatId || !socket.userId) return;
        const Chat = require('./models/Chat');
        const chat = await Chat.findById(chatId).select('members').catch(() => null);
        if (chat?.members) chat.members.forEach(uid => { if (String(uid) !== String(socket.userId)) io.to('user:' + uid).emit('typing:stop', { userId: socket.userId, chatId }); });
    });

    socket.on('screenshare:start', ({ chatId }) => {
        if (!chatId) return;
        const roomId = 'screenshare:' + chatId + ':' + Date.now();
        socket.join(roomId);
        socket.currentRoom = roomId;
        io.to('chat:' + chatId).emit('screenshare:available', { hostId: socket.userId, chatId, roomId });
        try {
            const Chat = require('./models/Chat');
            const chat = await Chat.findById(chatId).select('members');
            (chat?.members || []).forEach(memberId => {
                const id = String(memberId);
                if (id !== userId) io.to(`user:${id}`).emit('typing:stop', { userId, chatId });
            });
        } catch {}
    });

    socket.on('screenshare:join', ({ roomId }) => {
        if (!roomId) return;
        socket.join(roomId);
        const hostSocket = [...io.sockets.sockets.values()].find(s => s.rooms.has(roomId) && s.userId && s.userId !== socket.userId);
        if (hostSocket) {
            hostSocket.emit('screenshare:viewer_joined', { viewerSocketId: socket.id });
            socket.emit('screenshare:host_info', { hostSocketId: hostSocket.id });
        }
    });

    socket.on('screenshare:offer', ({ targetSocketId, offer }) => { if (targetSocketId && offer) io.to(targetSocketId).emit('screenshare:offer', { offer }); });
    socket.on('screenshare:answer', ({ targetSocketId, answer }) => { if (targetSocketId && answer) io.to(targetSocketId).emit('screenshare:answer', { answer }); });
    socket.on('screenshare:ice', ({ targetSocketId, candidate }) => {
        if (candidate) {
            const payload = { candidate, fromSocketId: socket.id };
            if (targetSocketId) io.to(targetSocketId).emit('screenshare:ice', payload);
            else if (socket.currentRoom) socket.to(socket.currentRoom).emit('screenshare:ice', payload);
        }
    });

    socket.on('screen:register', ({ sessionId, chatId, messageId }) => {
        if (!sessionId || !chatId) return;
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
        });
    });

    socket.on('screen:join', ({ sessionId, chatId }) => {
        const session = screenSessions.get(String(sessionId));
        if (!session || String(session.chatId) !== String(chatId)) {
            socket.emit('screen:error', { sessionId, message: 'Демонстрация не найдена' });
            return;
        }
        if (session.viewerSocketId && session.viewerSocketId !== socket.id) {
            socket.emit('screen:error', { sessionId, message: 'Кто-то уже подключён' });
            return;
        }
        session.viewerId = userId;
        session.viewerSocketId = socket.id;
        session.viewerName = socket.user.display_name || '';
        session.viewerAvatar = socket.user.avatar || null;
        io.to(session.hostSocketId).emit('screen:joined', { sessionId, viewerId: userId, viewerName: socket.user.display_name, viewerAvatar: socket.user.avatar });
        emitViewerState(session, 'joined');
        socket.emit('screen:joined', { sessionId, hostId: session.hostId });
    });

    socket.on('screen:leave', ({ sessionId }) => {
        const session = screenSessions.get(String(sessionId));
        if (!session) return;
        if (session.viewerSocketId === socket.id || String(session.viewerId) === userId) {
            session.viewerId = null;
            session.viewerSocketId = null;
            session.viewerName = '';
            session.viewerAvatar = null;
            if (session.hostSocketId) io.to(session.hostSocketId).emit('screen:viewer_left', { sessionId });
            emitViewerState(session, 'left');
        }
    });

    socket.on('screen:signal', ({ sessionId, data }) => {
        const session = screenSessions.get(String(sessionId));
        if (!session) return;
        const isHost = session.hostSocketId === socket.id;
        const targetSocketId = isHost ? session.viewerSocketId : session.hostSocketId;
        if (!targetSocketId) return;
        io.to(targetSocketId).emit('screen:signal', { sessionId, data, fromId: userId });
    });

    socket.on('screen:end', ({ sessionId }) => {
        const session = screenSessions.get(String(sessionId));
        if (!session) return;
        if (session.hostSocketId !== socket.id && session.viewerSocketId !== socket.id) return;
        cleanupScreenSession(String(sessionId), 'ended');
    });
    socket.on('screenshare:stop', ({ chatId }) => {
        if (chatId) io.to('chat:' + chatId).emit('screenshare:stopped');
        if (socket.currentRoom) { socket.leave(socket.currentRoom); socket.currentRoom = null; }
    });

    socket.on('disconnect', () => {
        const userId = socket.userId;
        if (userId) {
            onlineUsers.delete(userId);
            io.emit('user:offline', userId);
            require('./models/User').findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).catch(console.error);
        }
        if (socket.currentRoom) io.to(socket.currentRoom).emit('screenshare:stopped');
    });
});

app.set('io', io);
    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        io.emit('user:offline', userId);
        for (const [sessionId, session] of [...screenSessions.entries()]) {
            if (session.hostSocketId === socket.id) {
                cleanupScreenSession(sessionId, 'host_left');
            } else if (session.viewerSocketId === socket.id) {
                session.viewerId = null;
                session.viewerSocketId = null;
                session.viewerName = '';
                session.viewerAvatar = null;
                if (session.hostSocketId) io.to(session.hostSocketId).emit('screen:viewer_left', { sessionId });
                emitViewerState(session, 'left');
            }
        }
    });
});

const distPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log('Сервер запущен: порт ' + PORT));
process.on('SIGINT', async () => { await mongoose.disconnect(); process.exit(0); });
const PORT = Number(process.env.PORT || 3001);
if (!process.env.MONGO_URL) {
    console.error('MONGO_URL не задан');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URL, { family: 4 })
    .then(() => {
        console.log('SERVER STARTED', PORT);
        server.listen(PORT, '0.0.0.0');
    })
    .catch(err => {
        console.error(err.message);
        process.exit(1);
    });

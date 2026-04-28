require('dotenv').config();
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
const messageActionsRoutes = require('./routes/messageActions');
const groupRoutes = require('./routes/groups');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', methods: ['GET', 'POST'] } });

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

    socket.on('typing:start', async ({ chatId }) => {
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log('Сервер запущен: порт ' + PORT));
process.on('SIGINT', async () => { await mongoose.disconnect(); process.exit(0); });
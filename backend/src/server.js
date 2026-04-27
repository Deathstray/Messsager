require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const mongoose   = require('mongoose');
const path       = require('path');
const fs         = require('fs');

const authRoutes    = require('./routes/auth');
const userRoutes    = require('./routes/users');
const chatRoutes    = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const deleteRoutes  = require('./routes/messageDelete');

const UPLOAD_DIR = path.join(__dirname, '../storage/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET','POST','PUT','DELETE'] },
});

app.set('io', io);
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api',          authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/chats',    chatRoutes);
app.use('/api/chats',    messageRoutes);
app.use('/api/messages', deleteRoutes);
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const onlineUsers = new Map();
app.get('/api/online', (_, res) => res.json([...onlineUsers.keys()]));

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Нет токена'));
    try { socket.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
    catch { next(new Error('Недействительный токен')); }
});

io.on('connection', (socket) => {
    const userId = String(socket.user.id);
    socket.join(`user:${userId}`);
    onlineUsers.set(userId, socket.id);
    io.emit('user:online', userId);

    socket.on('typing:start', async ({ chatId }) => {
        try {
            const chat = await require('./models/Chat').findById(chatId).select('members');
            chat?.members.forEach(m => {
                const id = String(m);
                if (id !== userId) io.to(`user:${id}`).emit('typing:start', { userId, chatId, name: socket.user.display_name });
            });
        } catch {}
    });

    socket.on('typing:stop', async ({ chatId }) => {
        try {
            const chat = await require('./models/Chat').findById(chatId).select('members');
            chat?.members.forEach(m => {
                const id = String(m);
                if (id !== userId) io.to(`user:${id}`).emit('typing:stop', { userId, chatId });
            });
        } catch {}
    });

    socket.on('disconnect', () => { onlineUsers.delete(userId); io.emit('user:offline', userId); });
});

// Фронтенд (для Railway)
const distPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;
if (!process.env.MONGO_URL) { console.error('❌ MONGO_URL не задан'); process.exit(1); }

mongoose.connect(process.env.MONGO_URL, { family: 4 })
    .then(() => {
        console.log('✅ MongoDB подключена');
        server.listen(PORT, '0.0.0.0', () => console.log(`✅ Сервер: http://localhost:${PORT}`));
    })
    .catch(err => { console.error('❌', err.message); process.exit(1); });

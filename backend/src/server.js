require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const http     = require('http');
const path     = require('path');
const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Статические файлы (загруженные изображения и документы)
app.use('/uploads', express.static(path.join(__dirname, '../storage/uploads')));

// ── Роуты ─────────────────────────────────────────────────────────
app.use('/api',          require('./routes/auth'));
app.use('/api/chats',    require('./routes/chats'));
app.use('/api/chats',    require('./routes/messages'));
app.use('/api/messages', require('./routes/messageActions'));
app.use('/api/users',    require('./routes/users'));

// ── Socket.IO ────────────────────────────────────────────────────
const io = new Server(server, {
    cors: { origin: '*' },
});
app.set('io', io);

// Аутентификация сокета по JWT-токену
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Нет токена'));
    try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        next(new Error('Неверный токен'));
    }
});

io.on('connection', socket => {
    const userId = String(socket.user.id);
    // Каждый пользователь входит в свою "комнату" — туда приходят события
    socket.join(`user:${userId}`);

    // Сообщаем всем: этот пользователь онлайн
    socket.broadcast.emit('user:online', userId);

    // Отправляем новому пользователю список онлайн-пользователей
    const onlineIds = [...io.sockets.sockets.values()]
        .filter(s => s.user)
        .map(s => String(s.user.id));
    socket.emit('users:online_list', [...new Set(onlineIds)]);

    socket.on('disconnect', () => {
        io.emit('user:offline', userId);
    });
});

// ── Подключение к MongoDB и запуск сервера ────────────────────────
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/messengerdb';

mongoose.connect(MONGO_URL)
    .then(() => {
        console.log('✅ MongoDB подключена');
        // Слушаем на всех интерфейсах (0.0.0.0) — обязательно для доступа по локалке
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Сервер запущен на 0.0.0.0:${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Ошибка MongoDB:', err.message);
        process.exit(1);
    });

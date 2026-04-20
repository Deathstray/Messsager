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

// ── Папка для загружаемых файлов ──────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../storage/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Express + HTTP + Socket.IO ────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: {
        origin:  process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});

// Передаём io в роуты через app
app.set('io', io);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// ── REST маршруты ─────────────────────────────────────────────────────────────
app.use('/api',          authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/chats',    chatRoutes);
app.use('/api/chats',    messageRoutes);
app.use('/api/messages', deleteRoutes);   // DELETE /api/messages/:id

// ── Healthcheck (удобно для деплоя) ───────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const onlineUsers = new Map(); // userId (string) → socketId

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Требуется авторизация'));
    try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        next(new Error('Недействительный токен'));
    }
});

io.on('connection', (socket) => {
    const userId = String(socket.user.id);

    // Пользователь входит в свою персональную комнату
    socket.join(`user:${userId}`);
    onlineUsers.set(userId, socket.id);

    // Оповещаем всех что пользователь онлайн
    io.emit('user:online', userId);

    // ── Индикатор печати ──────────────────────────────────────────────────────
    // ИСПРАВЛЕНО: теперь ищем участников чата и шлём только им,
    //             а не в несуществующую комнату user:{chatId}
    socket.on('typing:start', async ({ chatId }) => {
        try {
            const Chat = require('./models/Chat');
            const chat = await Chat.findById(chatId).select('members');
            if (!chat) return;

            chat.members.forEach(memberId => {
                const uid = String(memberId);
                if (uid !== userId) {
                    io.to(`user:${uid}`).emit('typing:start', {
                        userId,
                        chatId,
                        name: socket.user.display_name,
                    });
                }
            });
        } catch (err) {
            console.error('typing:start error:', err.message);
        }
    });

    socket.on('typing:stop', async ({ chatId }) => {
        try {
            const Chat = require('./models/Chat');
            const chat = await Chat.findById(chatId).select('members');
            if (!chat) return;

            chat.members.forEach(memberId => {
                const uid = String(memberId);
                if (uid !== userId) {
                    io.to(`user:${uid}`).emit('typing:stop', { userId, chatId });
                }
            });
        } catch (err) {
            console.error('typing:stop error:', err.message);
        }
    });

    // ── Отключение ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        io.emit('user:offline', userId);
    });
});

// GET /api/online — список id онлайн пользователей
app.get('/api/online', (req, res) => res.json([...onlineUsers.keys()]));

// ── Подключение к MongoDB и запуск сервера ────────────────────────────────────
const PORT = process.env.PORT || 3001;

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => {
        console.log('✅ Подключено к MongoDB');
        server.listen(PORT, () => {
            console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Ошибка подключения к MongoDB:', err.message);
        process.exit(1);
    });

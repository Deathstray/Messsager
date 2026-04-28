const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Получить все чаты пользователя
router.get('/', authMiddleware, async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: req.user._id,
            type: 'dm'
        })
            .populate('participants', 'nickname displayName avatar isOnline')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        res.json({ chats });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать или найти DM с пользователем
router.post('/dm/:userId', authMiddleware, async (req, res) => {
    try {
        const otherId = req.params.userId;
        if (otherId === String(req.user._id)) {
            return res.status(400).json({ error: 'Нельзя создать чат с собой' });
        }

        // Уникальный ключ — отсортированные ID
        const ids = [String(req.user._id), otherId].sort();
        const dmKey = ids.join('_');

        let chat = await Chat.findOne({ dmKey })
            .populate('participants', 'nickname displayName avatar isOnline');

        if (!chat) {
            chat = new Chat({
                participants: ids,
                type: 'dm',
                dmKey
            });
            await chat.save();
            chat = await Chat.findById(chat._id)
                .populate('participants', 'nickname displayName avatar isOnline');
        }

        res.json({ chat });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить сообщения чата
router.get('/:chatId/messages', authMiddleware, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: 'Чат не найден' });

        const messages = await Message.find({
            chat: req.params.chatId,
            isDeleted: false
        })
            .populate('sender', 'nickname displayName avatar')
            .populate('replyTo')
            .populate({ path: 'replyTo', populate: { path: 'sender', select: 'displayName nickname' } })
            .sort({ createdAt: 1 })
            .limit(100);

        res.json({ messages });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Отправить сообщение в чат
router.post('/:chatId/messages', authMiddleware, async (req, res) => {
    try {
        const { text, type, fileUrl, fileName, replyTo } = req.body;
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: 'Чат не найден' });

        const msg = new Message({
            chat: req.params.chatId,
            sender: req.user._id,
            text: text || '',
            type: type || 'text',
            fileUrl,
            fileName,
            replyTo: replyTo || null
        });
        await msg.save();
        await msg.populate('sender', 'nickname displayName avatar');
        if (replyTo) {
            await msg.populate({ path: 'replyTo', populate: { path: 'sender', select: 'displayName nickname' } });
        }

        // Обновляем lastMessage и updatedAt
        chat.lastMessage = msg._id;
        chat.updatedAt = new Date();
        await chat.save();

        res.json({ message: msg });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить избранные сообщения пользователя
router.get('/favorites/messages', authMiddleware, async (req, res) => {
    try {
        const messages = await Message.find({ savedBy: req.user._id })
            .populate('sender', 'nickname displayName avatar')
            .sort({ createdAt: -1 });
        res.json({ messages });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
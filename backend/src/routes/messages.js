const router  = require('express').Router();
const path    = require('path');
const fs      = require('fs');
const { auth }   = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const Message    = require('../models/Message');
const Chat       = require('../models/Chat');

// GET /api/chats/:chatId/messages — история сообщений
router.get('/:chatId/messages', auth, async (req, res) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа к этому чату' });

        const { before, limit = 100 } = req.query;
        const filter = { chat_id: req.params.chatId };
        if (before) filter.createdAt = { $lt: new Date(before) };

        const messages = await Message.find(filter)
            .populate('from_user', 'display_name avatar_color username')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json(messages.reverse());
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// POST /api/chats/:chatId/messages — отправить сообщение (с файлами)
router.post('/:chatId/messages', auth, upload.array('files', 20), async (req, res) => {
    try {
        const { chatId } = req.params;
        const { text }   = req.body;
        const files      = req.files || [];

        if (!text?.trim() && !files.length)
            return res.status(400).json({ error: 'Сообщение должно содержать текст или файлы' });

        const chat = await Chat.findOne({ _id: chatId, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа к этому чату' });

        const message = await Message.create({
            chat_id:   chatId,
            from_user: req.user.id,
            text:      text?.trim() || null,
            files:     files.map(f => ({
                filename:      f.filename,
                original_name: f.originalname,
                size:          f.size,
                mimetype:      f.mimetype,
            })),
        });

        const populated = await message.populate('from_user', 'display_name avatar_color username');

        // Обновляем updatedAt чата чтобы сортировка в списке работала
        await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

        // Оповещаем всех участников чата
        chat.members.forEach(uid => {
            req.app.get('io').to(`user:${uid}`).emit('message:new', { chatId, message: populated });
        });

        res.status(201).json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;

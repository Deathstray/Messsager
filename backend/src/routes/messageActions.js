const router = require('express').Router();
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

router.delete('/:id', auth, async (req, res) => {
    try {
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Сообщение не найдено' });
        if (String(msg.sender) !== String(req.user.id)) return res.status(403).json({ error: 'Нет прав' });
        await Message.findByIdAndDelete(req.params.id);
        req.app.get('io').to('chat:' + msg.chat).emit('message:deleted', req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.post('/:id/react', auth, async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!emoji) return res.status(400).json({ error: 'Эмодзи обязателен' });
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Сообщение не найдено' });
        if (!msg.reactions) msg.reactions = {};
        if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
        const userId = String(req.user.id);
        if (msg.reactions[emoji].includes(userId)) msg.reactions[emoji] = msg.reactions[emoji].filter(id => id !== userId);
        else msg.reactions[emoji].push(userId);
        await msg.save();
        req.app.get('io').to('chat:' + msg.chat).emit('message:reacted', { messageId: msg._id, reactions: msg.reactions });
        res.json({ reactions: msg.reactions });
    } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.post('/:id/forward', auth, async (req, res) => {
    try {
        const { chatId } = req.body;
        if (!chatId) return res.status(400).json({ error: 'chatId обязателен' });
        const original = await Message.findById(req.params.id);
        if (!original) return res.status(404).json({ error: 'Сообщение не найдено' });
        const forwarded = await Message.create({ chat: chatId, sender: req.user.id, text: original.text, forwardedFrom: { messageId: original._id, originalSender: original.sender }, reactions: {} });
        const populated = await Message.findById(forwarded._id).populate('sender', 'nickname avatar avatar_color');
        req.app.get('io').to('chat:' + chatId).emit('message:new', populated);
        res.status(201).json({ message: populated });
    } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.post('/:id/save', auth, async (req, res) => {
    try {
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Сообщение не найдено' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;
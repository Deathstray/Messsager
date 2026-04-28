const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

const POP = [
    { path: 'from_user', select: 'display_name avatar_color avatar' },
    { path: 'reply_to', populate: { path: 'from_user', select: 'display_name avatar_color avatar' } },
];
const { auth } = require('../middleware/auth');

router.delete('/:id', auth, async (req, res) => {
    try {
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Не найдено' });
        if (String(msg.from_user) !== String(req.user.id)) return res.status(403).json({ error: 'Нельзя удалять чужие сообщения' });
        const uploadDir = path.join(__dirname, '../../storage/uploads');
        for (const file of msg.files || []) {
            try { fs.unlinkSync(path.join(uploadDir, file.filename)); } catch {}
        }
        const chatId = String(msg.chat_id);
        await msg.deleteOne();
        const chat = await Chat.findById(chatId).select('members');
        (chat?.members || []).forEach(uid => req.app.get('io').to(`user:${String(uid)}`).emit('message:deleted', { chatId, messageId: req.params.id }));
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
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
        const emoji = String(req.body.emoji || '').trim();
        if (!emoji) return res.status(400).json({ error: 'emoji обязателен' });
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Сообщение не найдено' });
        if (!msg.reactions) msg.reactions = {};
        if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
        const userId = String(req.user.id);
        if (msg.reactions[emoji].includes(userId)) msg.reactions[emoji] = msg.reactions[emoji].filter(id => id !== userId);
        else msg.reactions[emoji].push(userId);
        if (!msg) return res.status(404).json({ error: 'Не найдено' });
        const chat = await Chat.findOne({ _id: msg.chat_id, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });
        const uid = String(req.user.id);
        const group = msg.reactions.find(r => r.emoji === emoji);
        if (group) {
            const idx = group.users.map(String).indexOf(uid);
            if (idx >= 0) {
                group.users.splice(idx, 1);
                if (group.users.length === 0) msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
            } else {
                group.users.push(uid);
            }
        } else {
            msg.reactions.push({ emoji, users: [uid] });
        }
        await msg.save();
        req.app.get('io').to('chat:' + msg.chat).emit('message:reacted', { messageId: msg._id, reactions: msg.reactions });
        res.json({ reactions: msg.reactions });
    } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
        const populated = await msg.populate(POP);
        chat.members.forEach(uid2 => req.app.get('io').to(`user:${String(uid2)}`).emit('message:reaction', { chatId: String(msg.chat_id), messageId: String(msg._id), reactions: populated.reactions }));
        res.json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
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
        const chatId = String(req.body.chat_id || '');
        if (!chatId) return res.status(400).json({ error: 'chat_id обязателен' });
        const orig = await Message.findById(req.params.id).populate('from_user', 'display_name');
        if (!orig) return res.status(404).json({ error: 'Сообщение не найдено' });
        const targetChat = await Chat.findOne({ _id: chatId, members: req.user.id });
        if (!targetChat) return res.status(403).json({ error: 'Нет доступа к чату' });
        const origChat = await Chat.findById(orig.chat_id);
        const fwd = await Message.create({
            chat_id: chatId,
            from_user: req.user.id,
            text: orig.text,
            files: orig.files,
            reply_to: null,
            forwarded_from: {
                sender_name: orig.from_user?.display_name || '',
                chat_name: origChat?.name || '',
            },
        });
        const populated = await fwd.populate(POP);
        await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });
        targetChat.members.forEach(uid => req.app.get('io').to(`user:${String(uid)}`).emit('message:new', { chatId, message: populated }));
        res.status(201).json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:id/save', auth, async (req, res) => {
    try {
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Сообщение не найдено' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
        const orig = await Message.findById(req.params.id).populate('from_user', 'display_name');
        if (!orig) return res.status(404).json({ error: 'Сообщение не найдено' });
        let saved = await Chat.findOne({ type: 'saved', members: { $all: [req.user.id], $size: 1 } });
        if (!saved) {
            saved = await Chat.create({ type: 'saved', name: 'Избранное', members: [req.user.id], admins: [req.user.id], created_by: req.user.id });
            const pop = await saved.populate('members', 'display_name avatar_color avatar');
            req.app.get('io').to(`user:${req.user.id}`).emit('chat:new', pop);
        }
        const origChat = await Chat.findById(orig.chat_id);
        const msg = await Message.create({
            chat_id: saved._id,
            from_user: req.user.id,
            text: orig.text,
            files: orig.files,
            reply_to: null,
            forwarded_from: {
                sender_name: orig.from_user?.display_name || '',
                chat_name: origChat?.name || '',
            },
        });
        const populated = await msg.populate(POP);
        await Chat.findByIdAndUpdate(saved._id, { updatedAt: new Date() });
        req.app.get('io').to(`user:${req.user.id}`).emit('message:new', { chatId: String(saved._id), message: populated });
        res.status(201).json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;

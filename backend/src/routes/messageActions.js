const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const { auth } = require('../middleware/auth');
const Message  = require('../models/Message');
const Chat     = require('../models/Chat');

const POP = [
    { path: 'from_user', select: 'display_name avatar_color username avatar' },
    { path: 'reply_to',  populate: { path: 'from_user', select: 'display_name' } },
];

const MEMBER_POP = 'username display_name avatar_color avatar';

// ── DELETE /api/messages/:id ──────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
    try {
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Не найдено' });
        if (String(msg.from_user) !== req.user.id)
            return res.status(403).json({ error: 'Нельзя удалять чужие сообщения' });

        const uploadDir = path.join(__dirname, '../../storage/uploads');
        msg.files.forEach(f => {
            try { fs.unlinkSync(path.join(uploadDir, f.filename)); } catch {}
        });

        const chatId = msg.chat_id;
        await msg.deleteOne();

        const chat = await Chat.findById(chatId).select('members');
        chat?.members.forEach(uid => {
            req.app.get('io').to(`user:${uid}`).emit('message:deleted', {
                chatId: String(chatId), messageId: req.params.id,
            });
        });
        res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ── POST /api/messages/:id/react ──────────────────────────────────────────────
router.post('/:id/react', auth, async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!emoji) return res.status(400).json({ error: 'emoji обязателен' });

        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Сообщение не найдено' });

        const chat = await Chat.findOne({ _id: msg.chat_id, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });

        const uid = req.user.id;
        let grp = msg.reactions.find(r => r.emoji === emoji);
        if (grp) {
            const idx = grp.users.map(String).indexOf(uid);
            if (idx >= 0) {
                grp.users.splice(idx, 1);
                if (grp.users.length === 0)
                    msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
            } else {
                grp.users.push(uid);
            }
        } else {
            msg.reactions.push({ emoji, users: [uid] });
        }

        await msg.save();
        const populated = await msg.populate(POP);

        chat.members.forEach(uid2 => {
            req.app.get('io').to(`user:${uid2}`).emit('message:reaction', {
                chatId:    String(msg.chat_id),
                messageId: String(msg._id),
                reactions: populated.reactions,
            });
        });
        res.json(populated);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ── POST /api/messages/:id/forward ───────────────────────────────────────────
router.post('/:id/forward', auth, async (req, res) => {
    try {
        const { chat_id } = req.body;
        if (!chat_id) return res.status(400).json({ error: 'chat_id обязателен' });

        const orig = await Message.findById(req.params.id).populate('from_user', 'display_name');
        if (!orig) return res.status(404).json({ error: 'Сообщение не найдено' });

        const targetChat = await Chat.findOne({ _id: chat_id, members: req.user.id });
        if (!targetChat) return res.status(403).json({ error: 'Нет доступа к чату' });

        const origChat = await Chat.findById(orig.chat_id);
        const fwd = await Message.create({
            chat_id,
            from_user: req.user.id,
            text:      orig.text,
            files:     orig.files,
            forwarded_from: {
                sender_name: orig.from_user?.display_name || '?',
                chat_name:   origChat?.name || '',
            },
        });

        const populated = await fwd.populate(POP);
        await Chat.findByIdAndUpdate(chat_id, { updatedAt: new Date() });

        targetChat.members.forEach(uid => {
            req.app.get('io').to(`user:${uid}`).emit('message:new', {
                chatId: String(chat_id), message: populated,
            });
        });
        res.status(201).json(populated);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ── POST /api/messages/:id/save — сохранить в «Избранное» ────────────────────
router.post('/:id/save', auth, async (req, res) => {
    try {
        const orig = await Message.findById(req.params.id).populate('from_user', 'display_name');
        if (!orig) return res.status(404).json({ error: 'Сообщение не найдено' });

        // Ищем или создаём чат Избранное
        let saved = await Chat.findOne({
            type:    'saved',
            members: { $all: [req.user.id], $size: 1 },
        });

        if (!saved) {
            saved = await Chat.create({
                type:    'saved',
                name:    'Избранное',
                members: [req.user.id],
            });
            const pop = await saved.populate('members', MEMBER_POP);
            req.app.get('io').to(`user:${req.user.id}`).emit('chat:new', pop);
        }

        const origChat = await Chat.findById(orig.chat_id);
        const fwd = await Message.create({
            chat_id:   saved._id,
            from_user: req.user.id,
            text:      orig.text,
            files:     orig.files,
            forwarded_from: {
                sender_name: orig.from_user?.display_name || '?',
                chat_name:   origChat?.name || '',
            },
        });

        const populated = await fwd.populate(POP);
        await Chat.findByIdAndUpdate(saved._id, { updatedAt: new Date() });

        req.app.get('io').to(`user:${req.user.id}`).emit('message:new', {
            chatId: String(saved._id), message: populated,
        });
        res.status(201).json(populated);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;

const router  = require('express').Router();
const { auth }   = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const Message    = require('../models/Message');
const Chat       = require('../models/Chat');

const POP = [
    { path: 'from_user', select: 'display_name avatar_color username avatar' },
    { path: 'reply_to',  populate: { path: 'from_user', select: 'display_name' } },
];

// GET /api/chats/:chatId/messages
router.get('/:chatId/messages', auth, async (req, res) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });

        const { before, limit = 100 } = req.query;
        const filter = { chat_id: req.params.chatId };
        if (before) filter.createdAt = { $lt: new Date(before) };

        const messages = await Message.find(filter)
            .populate(POP)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        res.json(messages.reverse());
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// POST /api/chats/:chatId/messages
router.post('/:chatId/messages', auth, upload.array('files', 20), async (req, res) => {
    try {
        const { chatId } = req.params;
        const { text, reply_to } = req.body;
        const files = req.files || [];

        if (!text?.trim() && !files.length)
            return res.status(400).json({ error: 'Пустое сообщение' });

        const chat = await Chat.findOne({ _id: chatId, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });

        const message = await Message.create({
            chat_id:   chatId,
            from_user: req.user.id,
            text:      text?.trim() || null,
            reply_to:  reply_to || null,
            files:     files.map(f => ({
                filename: f.filename, original_name: f.originalname,
                size: f.size, mimetype: f.mimetype,
            })),
        });

        const populated = await message.populate(POP);
        await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });
        chat.members.forEach(uid => {
            req.app.get('io').to(`user:${uid}`).emit('message:new', { chatId, message: populated });
        });
        res.status(201).json(populated);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// POST /api/messages/:id/react — добавить / убрать реакцию
router.post('/:id/react', auth, async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!emoji) return res.status(400).json({ error: 'emoji обязателен' });

        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Не найдено' });

        const chat = await Chat.findOne({ _id: msg.chat_id, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });

        const uid = req.user.id;
        let grp = msg.reactions.find(r => r.emoji === emoji);
        if (grp) {
            const idx = grp.users.map(String).indexOf(uid);
            if (idx >= 0) {
                grp.users.splice(idx, 1);
                if (grp.users.length === 0) msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
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
                chatId: String(msg.chat_id),
                messageId: String(msg._id),
                reactions: populated.reactions,
            });
        });
        res.json(populated);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// POST /api/messages/:id/forward
router.post('/:id/forward', auth, async (req, res) => {
    try {
        const { chat_id } = req.body;
        const orig = await Message.findById(req.params.id).populate('from_user', 'display_name');
        if (!orig) return res.status(404).json({ error: 'Не найдено' });

        const targetChat = await Chat.findOne({ _id: chat_id, members: req.user.id });
        if (!targetChat) return res.status(403).json({ error: 'Нет доступа к чату' });

        const origChat = await Chat.findById(orig.chat_id);
        const fwd = await Message.create({
            chat_id, from_user: req.user.id,
            text: orig.text, files: orig.files,
            forwarded_from: {
                sender_name: orig.from_user?.display_name || '?',
                chat_name: origChat?.name || '',
            },
        });
        const populated = await fwd.populate(POP);
        await Chat.findByIdAndUpdate(chat_id, { updatedAt: new Date() });
        targetChat.members.forEach(uid => {
            req.app.get('io').to(`user:${uid}`).emit('message:new', { chatId: chat_id, message: populated });
        });
        res.status(201).json(populated);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// POST /api/messages/:id/save — сохранить в Избранное
router.post('/:id/save', auth, async (req, res) => {
    try {
        const orig = await Message.findById(req.params.id).populate('from_user', 'display_name');
        if (!orig) return res.status(404).json({ error: 'Не найдено' });

        const POP2 = 'username display_name avatar_color avatar';
        let saved = await Chat.findOne({ type: 'saved', members: { $all: [req.user.id], $size: 1 } });
        if (!saved) {
            saved = await Chat.create({ type: 'saved', name: 'Избранное', members: [req.user.id] });
            const pop = await saved.populate('members', POP2);
            req.app.get('io').to(`user:${req.user.id}`).emit('chat:new', pop);
        }

        const origChat = await Chat.findById(orig.chat_id);
        const fwd = await Message.create({
            chat_id: saved._id, from_user: req.user.id,
            text: orig.text, files: orig.files,
            forwarded_from: {
                sender_name: orig.from_user?.display_name || '?',
                chat_name: origChat?.name || '',
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

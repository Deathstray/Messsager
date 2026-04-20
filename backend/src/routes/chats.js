const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Chat    = require('../models/Chat');
const Message = require('../models/Message');
const User    = require('../models/User');

// GET /api/chats — все чаты пользователя с последним сообщением
router.get('/', auth, async (req, res) => {
    try {
        const chats = await Chat.find({ members: req.user.id })
            .populate('members', 'username display_name avatar_color')
            .sort({ updatedAt: -1 });

        const result = await Promise.all(chats.map(async chat => {
            const lastMsg = await Message.findOne({ chat_id: chat._id })
                .populate('from_user', 'display_name avatar_color')
                .sort({ createdAt: -1 });
            return { ...chat.toObject(), last_message: lastMsg || null };
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// POST /api/chats — создать чат или группу
router.post('/', auth, async (req, res) => {
    try {
        const { type, name, member_ids } = req.body;
        if (!Array.isArray(member_ids) || !member_ids.length)
            return res.status(400).json({ error: 'member_ids обязателен' });

        const allMembers = [...new Set([req.user.id, ...member_ids])];

        // Для личного чата — вернуть существующий если есть
        if (type === 'dm' && member_ids.length === 1) {
            const existing = await Chat.findOne({
                type: 'dm',
                members: { $all: [req.user.id, member_ids[0]], $size: 2 },
            }).populate('members', 'username display_name avatar_color');
            if (existing) return res.json(existing);
        }

        // Имя для DM = имя собеседника
        let chatName = name;
        if (type === 'dm') {
            const other = await User.findById(member_ids[0]);
            chatName = other?.display_name || 'Чат';
        }

        const chat = await Chat.create({
            type,
            name:       chatName || 'Новая группа',
            created_by: req.user.id,
            members:    allMembers,
        });

        const populated = await chat.populate('members', 'username display_name avatar_color');

        // Оповещаем всех участников через Socket.IO
        allMembers.forEach(uid => req.app.get('io').to(`user:${uid}`).emit('chat:new', populated));

        res.status(201).json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// PUT /api/chats/:id/members — добавить участника в группу
router.put('/:id/members', auth, async (req, res) => {
    try {
        const { user_id } = req.body;
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Чат не найден' });
        if (chat.type !== 'group') return res.status(400).json({ error: 'Только для групп' });
        if (!chat.members.map(String).includes(req.user.id))
            return res.status(403).json({ error: 'Нет доступа' });

        if (!chat.members.map(String).includes(user_id)) {
            chat.members.push(user_id);
            await chat.save();
        }

        const populated = await chat.populate('members', 'username display_name avatar_color');
        req.app.get('io').to(`user:${user_id}`).emit('chat:new', populated);
        res.json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

const upload = multer({
    storage: multer.diskStorage({
        destination: path.join(__dirname, '../../storage/uploads'),
        filename: (req, file, cb) => cb(null, `grp_${uuidv4()}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
});

const MEMBER_POP = 'display_name avatar_color avatar';
const MSG_POP = [
    { path: 'from_user', select: 'display_name avatar_color avatar' },
    { path: 'reply_to', populate: { path: 'from_user', select: 'display_name avatar_color avatar' } },
];

function isAdmin(chat, userId) {
    return String(chat.created_by) === String(userId) || (chat.admins || []).map(String).includes(String(userId));
}

// Получить все чаты пользователя
router.get('/', authMiddleware, async (req, res) => {
function activeUntil(entry) {
    return !entry.until || new Date(entry.until).getTime() > Date.now();
}

function activeMatch(list, userId) {
    return (list || []).find(x => String(x.user) === String(userId) && activeUntil(x));
}

async function enrich(chat) {
    const last = await Message.findOne({ chat_id: chat._id }).populate(MSG_POP).sort({ createdAt: -1 });
    const doc = chat.toObject();
    doc.last_message = last || null;
    return doc;
}

router.get('/', auth, async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: req.user._id,
            type: 'dm'
        })
            .populate('participants', 'nickname displayName avatar isOnline')
            .populate('lastMessage')
        const chats = await Chat.find({ members: req.user.id })
            .populate('members', MEMBER_POP)
            .populate('created_by', MEMBER_POP)
            .populate('admins', MEMBER_POP)
            .sort({ updatedAt: -1 });
        res.json(await Promise.all(chats.map(enrich)));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

        res.json({ chats });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
router.get('/public', auth, async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        const filter = { type: 'group', is_public: true };
        if (q) filter.name = { $regex: q, $options: 'i' };
        const groups = await Chat.find(filter)
            .populate('members', MEMBER_POP)
            .populate('created_by', MEMBER_POP)
            .sort({ name: 1 })
            .limit(50);
        res.json(groups);
    } catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать или найти DM с пользователем
router.post('/dm/:userId', authMiddleware, async (req, res) => {
router.post('/', auth, async (req, res) => {
    try {
        const otherId = req.params.userId;
        if (otherId === String(req.user._id)) {
            return res.status(400).json({ error: 'Нельзя создать чат с собой' });
        const type = String(req.body.type || 'dm');
        const name = String(req.body.name || '').trim();
        const memberIds = Array.isArray(req.body.member_ids) ? req.body.member_ids.map(String) : [];
        const is_public = req.body.is_public === true || req.body.is_public === 'true';

        if (type === 'saved') {
            let saved = await Chat.findOne({ type: 'saved', members: { $all: [req.user.id], $size: 1 } })
                .populate('members', MEMBER_POP)
                .populate('created_by', MEMBER_POP)
                .populate('admins', MEMBER_POP);
            if (!saved) {
                saved = await Chat.create({ type: 'saved', name: 'Избранное', members: [req.user.id], admins: [req.user.id], created_by: req.user.id });
                saved = await saved.populate('members', MEMBER_POP);
                req.app.get('io').to(`user:${req.user.id}`).emit('chat:new', saved);
            }
            return res.json(saved);
        }

        // Уникальный ключ — отсортированные ID
        const ids = [String(req.user._id), otherId].sort();
        const dmKey = ids.join('_');
        if (type === 'dm') {
            if (memberIds.length !== 1) return res.status(400).json({ error: 'Нужен один собеседник' });
            const otherId = memberIds[0];
            const existing = await Chat.findOne({ type: 'dm', members: { $all: [req.user.id, otherId], $size: 2 } })
                .populate('members', MEMBER_POP)
                .populate('created_by', MEMBER_POP)
                .populate('admins', MEMBER_POP);
            if (existing) return res.json(existing);

        let chat = await Chat.findOne({ dmKey })
            .populate('participants', 'nickname displayName avatar isOnline');

        if (!chat) {
            chat = new Chat({
                participants: ids,
            const other = await User.findById(otherId).select('display_name');
            const chat = await Chat.create({
                type: 'dm',
                name: other?.display_name || 'Чат',
                created_by: req.user.id,
                admins: [req.user.id],
                members: [req.user.id, otherId],
            });
            const populated = await chat.populate('members', MEMBER_POP);
            req.app.get('io').to(`user:${req.user.id}`).emit('chat:new', populated);
            req.app.get('io').to(`user:${otherId}`).emit('chat:new', populated);
            return res.status(201).json(populated);
        }

        if (!name) return res.status(400).json({ error: 'Название обязательно' });
        const members = [...new Set([req.user.id, ...memberIds])];
        const chat = await Chat.create({
            type: 'group',
            name,
            created_by: req.user.id,
            admins: [req.user.id],
            members,
            is_public,
        });
        const populated = await chat.populate('members', MEMBER_POP);
        members.forEach(uid => req.app.get('io').to(`user:${uid}`).emit('chat:new', populated));
        res.status(201).json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:id/join', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Группа не найдена' });
        if (chat.type !== 'group' || !chat.is_public) return res.status(403).json({ error: 'Группа не публичная' });
        if (activeMatch(chat.banned_users, req.user.id)) return res.status(403).json({ error: 'Вы заблокированы в этой группе' });
        if (!chat.members.map(String).includes(String(req.user.id))) {
            chat.members.push(req.user.id);
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
        const populated = await chat.populate('members', MEMBER_POP).populate('created_by', MEMBER_POP).populate('admins', MEMBER_POP);
        req.app.get('io').to(`user:${req.user.id}`).emit('chat:new', populated);
        res.json(populated);
    } catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить сообщения чата
router.get('/:chatId/messages', authMiddleware, async (req, res) => {
router.put('/:id/members', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        const userId = String(req.body.user_id || '');
        if (!userId) return res.status(400).json({ error: 'user_id обязателен' });
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Чат не найден' });
        if (chat.type !== 'group') return res.status(400).json({ error: 'Только для групп' });
        if (!isAdmin(chat, req.user.id)) return res.status(403).json({ error: 'Нет доступа' });
        if (activeMatch(chat.banned_users, userId)) return res.status(403).json({ error: 'Пользователь заблокирован в группе' });
        if (!chat.members.map(String).includes(userId)) chat.members.push(userId);
        await chat.save();
        const populated = await chat.populate('members', MEMBER_POP).populate('created_by', MEMBER_POP).populate('admins', MEMBER_POP);
        req.app.get('io').to(`user:${userId}`).emit('chat:new', populated);
        res.json(populated);
    } catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }

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
router.post('/:id/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        const { text, type, fileUrl, fileName, replyTo } = req.body;
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: 'Чат не найден' });
        if (chat.type === 'group' && !isAdmin(chat, req.user.id)) return res.status(403).json({ error: 'Нет доступа' });
        chat.avatar = req.file.filename;

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
        const populated = await chat.populate('members', MEMBER_POP).populate('created_by', MEMBER_POP).populate('admins', MEMBER_POP);
        (chat.members || []).forEach(uid => req.app.get('io').to(`user:${String(uid)}`).emit('chat:updated', populated));
        res.json(populated);
    } catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:id/moderate', auth, async (req, res) => {
    try {
        const action = String(req.body.action || '');
        const userId = String(req.body.user_id || '');
        const minutes = Number(req.body.minutes || 0);
        if (!action || !userId) return res.status(400).json({ error: 'Неверные данные' });

        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Чат не найден' });
        if (chat.type !== 'group') return res.status(400).json({ error: 'Только для групп' });
        if (!isAdmin(chat, req.user.id)) return res.status(403).json({ error: 'Нет доступа' });
        if (String(chat.created_by) === userId && action !== 'mute') return res.status(400).json({ error: 'Нельзя модерацию создателя' });

        const until = minutes > 0 ? new Date(Date.now() + minutes * 60000) : null;
        chat.muted_users = (chat.muted_users || []).filter(x => String(x.user) !== userId);
        chat.banned_users = (chat.banned_users || []).filter(x => String(x.user) !== userId);
        chat.members = chat.members.filter(m => String(m) !== userId || action === 'mute');

        if (action === 'mute') {
            chat.muted_users.push({ user: userId, until, by: req.user.id });
        } else if (action === 'ban') {
            chat.banned_users.push({ user: userId, until, by: req.user.id });
            chat.members = chat.members.filter(m => String(m) !== userId);
        } else if (action === 'kick') {
            chat.members = chat.members.filter(m => String(m) !== userId);
        } else {
            return res.status(400).json({ error: 'Неизвестное действие' });
        }

        await chat.save();
        const populated = await chat.populate('members', MEMBER_POP).populate('created_by', MEMBER_POP).populate('admins', MEMBER_POP);
        (chat.members || []).forEach(uid => req.app.get('io').to(`user:${String(uid)}`).emit('chat:updated', populated));
        req.app.get('io').to(`user:${userId}`).emit(action === 'mute' ? 'chat:updated' : 'chat:removed', action === 'mute' ? populated : { chatId: String(chat._id) });
        res.json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }

        res.json({ message: msg });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить избранные сообщения пользователя
router.get('/favorites/messages', authMiddleware, async (req, res) => {
router.delete('/:id/clear', auth, async (req, res) => {
    try {
        const messages = await Message.find({ savedBy: req.user._id })
            .populate('sender', 'nickname displayName avatar')
            .sort({ createdAt: -1 });
        res.json({ messages });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
        const chat = await Chat.findOne({ _id: req.params.id, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });
        await Message.deleteMany({ chat_id: req.params.id });
        await Chat.findByIdAndUpdate(req.params.id, { updatedAt: new Date() });
        chat.members.forEach(uid => req.app.get('io').to(`user:${String(uid)}`).emit('chat:cleared', { chatId: req.params.id }));
        res.json({ ok: true });
    } catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.id, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });
        if (chat.type === 'dm' || chat.type === 'saved') {
            await Message.deleteMany({ chat_id: req.params.id });
            await Chat.findByIdAndDelete(req.params.id);
        } else {
            chat.members = chat.members.filter(m => String(m) !== String(req.user.id));
            if (chat.members.length === 0) {
                await Message.deleteMany({ chat_id: req.params.id });
                await Chat.findByIdAndDelete(req.params.id);
            } else {
                await chat.save();
            }
        }
        req.app.get('io').to(`user:${req.user.id}`).emit('chat:removed', { chatId: req.params.id });
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
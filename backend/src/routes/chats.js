const router = require('express').Router();
const path   = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const Chat    = require('../models/Chat');
const Message = require('../models/Message');
const User    = require('../models/User');

const avatarStorage = multer.diskStorage({
    destination: path.join(__dirname, '../../storage/uploads'),
    filename: (req, file, cb) => cb(null, `grp_${uuidv4()}${path.extname(file.originalname)}`),
});
const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const POP = 'username display_name avatar_color avatar';

async function withLastMsg(chat) {
    const lm = await Message.findOne({ chat_id: chat._id })
        .populate('from_user', 'display_name avatar_color')
        .sort({ createdAt: -1 });
    return { ...chat.toObject(), last_message: lm || null };
}

// GET /api/chats
router.get('/', auth, async (req, res) => {
    try {
        const chats = await Chat.find({ members: req.user.id })
            .populate('members', POP)
            .sort({ updatedAt: -1 });
        const result = await Promise.all(chats.map(withLastMsg));
        res.json(result);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// GET /api/chats/public?q=
router.get('/public', auth, async (req, res) => {
    try {
        const q = req.query.q || '';
        const filter = { type: 'group', is_public: true };
        if (q.trim()) filter.name = { $regex: q, $options: 'i' };
        const groups = await Chat.find(filter).populate('members', POP).sort({ name: 1 }).limit(50);
        res.json(groups);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// POST /api/chats
router.post('/', auth, async (req, res) => {
    try {
        const { type, name, member_ids, is_public } = req.body;

        // Избранное
        if (type === 'saved') {
            let saved = await Chat.findOne({ type: 'saved', members: { $all: [req.user.id], $size: 1 } }).populate('members', POP);
            if (!saved) {
                saved = await Chat.create({ type: 'saved', name: 'Избранное', members: [req.user.id] });
                saved = await saved.populate('members', POP);
                req.app.get('io').to(`user:${req.user.id}`).emit('chat:new', saved);
            }
            return res.json(saved);
        }

        if (!Array.isArray(member_ids) || !member_ids.length)
            return res.status(400).json({ error: 'member_ids обязателен' });

        const allMembers = [...new Set([req.user.id, ...member_ids])];

        if (type === 'dm' && member_ids.length === 1) {
            const existing = await Chat.findOne({
                type: 'dm',
                members: { $all: [req.user.id, member_ids[0]], $size: 2 },
            }).populate('members', POP);
            if (existing) return res.json(existing);
        }

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
            is_public:  type === 'group' && (is_public === true || is_public === 'true'),
        });
        const populated = await chat.populate('members', POP);
        allMembers.forEach(uid => req.app.get('io').to(`user:${uid}`).emit('chat:new', populated));
        res.status(201).json(populated);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// POST /api/chats/:id/join — вступить в публичную группу
router.post('/:id/join', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Группа не найдена' });
        if (chat.type !== 'group' || !chat.is_public)
            return res.status(403).json({ error: 'Группа не публичная' });
        if (!chat.members.map(String).includes(req.user.id)) {
            chat.members.push(req.user.id);
            await chat.save();
        }
        const populated = await chat.populate('members', POP);
        req.app.get('io').to(`user:${req.user.id}`).emit('chat:new', populated);
        res.json(populated);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
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
        const populated = await chat.populate('members', POP);
        req.app.get('io').to(`user:${user_id}`).emit('chat:new', populated);
        res.json(populated);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// POST /api/chats/:id/avatar — аватарка группы
router.post('/:id/avatar', auth, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не передан' });
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Чат не найден' });
        if (!chat.members.map(String).includes(req.user.id))
            return res.status(403).json({ error: 'Нет доступа' });
        chat.avatar = req.file.filename;
        await chat.save();
        const populated = await chat.populate('members', POP);
        // Оповещаем всех членов группы об обновлении
        chat.members.forEach(uid => req.app.get('io').to(`user:${String(uid)}`).emit('chat:updated', populated));
        res.json(populated);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// DELETE /api/chats/:id/clear — очистить историю чата (только для себя — удаляем все сообщения)
// Для DM и группы — удаляем все сообщения из чата
router.delete('/:id/clear', auth, async (req, res) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.id, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });
        await Message.deleteMany({ chat_id: req.params.id });
        await Chat.findByIdAndUpdate(req.params.id, { updatedAt: new Date() });
        // Оповещаем всех что чат очищен
        chat.members.forEach(uid => {
            req.app.get('io').to(`user:${String(uid)}`).emit('chat:cleared', { chatId: req.params.id });
        });
        res.json({ ok: true });
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// DELETE /api/chats/:id — покинуть/удалить чат для текущего пользователя
router.delete('/:id', auth, async (req, res) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.id, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });

        if (chat.type === 'dm' || chat.type === 'saved') {
            // DM и Избранное — удаляем полностью (чат и все сообщения)
            await Message.deleteMany({ chat_id: req.params.id });
            await Chat.findByIdAndDelete(req.params.id);
        } else {
            // Группа — просто покидаем
            chat.members = chat.members.filter(m => String(m) !== req.user.id);
            if (chat.members.length === 0) {
                await Message.deleteMany({ chat_id: req.params.id });
                await Chat.findByIdAndDelete(req.params.id);
            } else {
                await chat.save();
            }
        }

        req.app.get('io').to(`user:${req.user.id}`).emit('chat:removed', { chatId: req.params.id });
        res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;

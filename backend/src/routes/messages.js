const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

const POP = [
    { path: 'from_user', select: 'display_name avatar_color avatar' },
    { path: 'reply_to', populate: { path: 'from_user', select: 'display_name avatar_color avatar' } },
];

function active(list, userId) {
    return (list || []).find(x => String(x.user) === String(userId) && (!x.until || new Date(x.until).getTime() > Date.now()));
}

async function canSendToDm(chat, userId) {
    const otherId = chat.members.map(String).find(id => id !== String(userId));
    if (!otherId) return { ok: true };
    const me = await User.findById(userId).select('blocked_users');
    const other = await User.findById(otherId).select('blocked_users');
    if (me?.blocked_users?.some(x => String(x.user) === otherId)) return { ok: false, error: 'Вы заблокировали этого пользователя' };
    if (other?.blocked_users?.some(x => String(x.user) === String(userId))) return { ok: false, error: 'Пользователь заблокировал вас' };
    return { ok: true };
}

function parseScreenSession(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

router.get('/:chatId/messages', auth, async (req, res) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });
        const before = req.query.before;
        const limit = Number(req.query.limit || 100);
        const filter = { chat_id: req.params.chatId };
        if (before) filter.createdAt = { $lt: new Date(before) };
        const messages = await Message.find(filter).populate(POP).sort({ createdAt: -1 }).limit(limit);
        res.json(messages.reverse());
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:chatId/messages', auth, upload.array('files', 20), async (req, res) => {
    try {
        const { chatId } = req.params;
        const text = String(req.body.text || '').trim();
        const reply_to = req.body.reply_to || null;
        const kind = String(req.body.kind || 'text');
        const screenSession = parseScreenSession(req.body.screen_session);
        const files = req.files || [];

        if (!text && files.length === 0 && kind !== 'screen_invite') return res.status(400).json({ error: 'Пустое сообщение' });

        const chat = await Chat.findOne({ _id: chatId, members: req.user.id });
        if (!chat) return res.status(403).json({ error: 'Нет доступа' });

        if (chat.type === 'dm') {
            const access = await canSendToDm(chat, req.user.id);
            if (!access.ok) return res.status(403).json({ error: access.error });
        }

        if (chat.type === 'group') {
            const muted = active(chat.muted_users, req.user.id);
            const banned = active(chat.banned_users, req.user.id);
            if (banned) return res.status(403).json({ error: 'Вы заблокированы в этой группе' });
            if (muted) return res.status(403).json({ error: 'Вы не можете писать в этой группе' });
        }

        const message = await Message.create({
            chat_id: chatId,
            from_user: req.user.id,
            kind: kind === 'screen_invite' ? 'screen_invite' : 'text',
            text: text || (kind === 'screen_invite' ? '📺 Демонстрация экрана' : null),
            reply_to,
            screen_session: kind === 'screen_invite' ? {
                session_id: screenSession?.session_id || null,
                status: screenSession?.status || 'waiting',
                host_id: req.user.id,
                viewer_id: null,
            } : null,
            files: files.map(f => ({
                filename: f.filename,
                original_name: f.originalname,
                size: f.size,
                mimetype: f.mimetype,
            })),
        });

        const populated = await message.populate(POP);
        await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

        for (const uid of chat.members.map(String)) {
            req.app.get('io').to(`user:${uid}`).emit('message:new', { chatId: String(chatId), message: populated });
        }

        res.status(201).json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;

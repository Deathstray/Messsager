const router = require('express').Router();
const path = require('path'), fs = require('fs');
const { auth } = require('../middleware/auth');
const Message  = require('../models/Message');
const Chat     = require('../models/Chat');

router.delete('/:id', auth, async (req, res) => {
    try {
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Не найдено' });
        if (String(msg.from_user) !== req.user.id) return res.status(403).json({ error: 'Нельзя удалять чужие сообщения' });

        const uploadDir = path.join(__dirname, '../../storage/uploads');
        msg.files.forEach(f => { try { fs.unlinkSync(path.join(uploadDir, f.filename)); } catch {} });

        const chatId = msg.chat_id;
        await msg.deleteOne();

        const chat = await Chat.findById(chatId).select('members');
        chat?.members.forEach(uid => {
            req.app.get('io').to(`user:${uid}`).emit('message:deleted', { chatId: String(chatId), messageId: req.params.id });
        });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;

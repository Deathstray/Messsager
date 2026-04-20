const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const { auth } = require('../middleware/auth');
const Message  = require('../models/Message');
const Chat     = require('../models/Chat');

// DELETE /api/messages/:id — удалить своё сообщение
// ИСПРАВЛЕНО: перенесён с /api/chats/:id на /api/messages/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message)
            return res.status(404).json({ error: 'Сообщение не найдено' });
        if (String(message.from_user) !== req.user.id)
            return res.status(403).json({ error: 'Нельзя удалять чужие сообщения' });

        // Удаляем прикреплённые файлы с диска
        const uploadDir = path.join(__dirname, '../../storage/uploads');
        message.files.forEach(f => {
            const filePath = path.join(uploadDir, f.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        const chatId = message.chat_id;
        await message.deleteOne();

        // Оповещаем участников чата об удалении
        const chat = await Chat.findById(chatId).select('members');
        chat?.members.forEach(uid => {
            req.app.get('io').to(`user:${uid}`).emit('message:deleted', {
                chatId,
                messageId: req.params.id,
            });
        });

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;

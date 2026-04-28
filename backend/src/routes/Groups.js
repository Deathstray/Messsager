const router = require('express').Router();
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

// Проверка прав администратора в группе
const isGroupAdmin = async (groupId, userId) => {
    const group = await Group.findById(groupId);
    if (!group) return false;
    const member = group.members.find(m => String(m.user) === String(userId));
    return member && (member.role === 'admin' || member.role === 'creator');
};

// POST /api/groups/:id/kick - выгнать участника
router.post('/:id/kick', auth, async (req, res) => {
    try {
        const { userId } = req.body;
        const groupId = req.params.id;
        const adminId = req.user.id;

        if (!await isGroupAdmin(groupId, adminId)) {
            return res.status(403).json({ error: 'Нет прав' });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Группа не найдена' });

        if (String(group.creator) === String(userId)) {
            return res.status(400).json({ error: 'Нельзя выгнать создателя' });
        }

        group.members = group.members.filter(m => String(m.user) !== String(userId));
        await group.save();

        const io = req.app.get('io');
        io.to('group:' + groupId).emit('group:member-kicked', { userId, groupId });

        res.json({ success: true });
    } catch (err) {
        console.error('[GROUP_KICK_ERROR]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// POST /api/groups/:id/mute - замьютить участника
router.post('/:id/mute', auth, async (req, res) => {
    try {
        const { userId, minutes } = req.body;
        const groupId = req.params.id;
        const adminId = req.user.id;

        if (!await isGroupAdmin(groupId, adminId)) {
            return res.status(403).json({ error: 'Нет прав' });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Группа не найдена' });

        const member = group.members.find(m => String(m.user) === String(userId));
        if (!member || member.role === 'creator') {
            return res.status(400).json({ error: 'Нельзя мьютить создателя' });
        }

        member.mutedUntil = minutes > 0 ? new Date(Date.now() + minutes * 60000) : new Date('2099-12-31');
        await group.save();

        res.json({ success: true, mutedUntil: member.mutedUntil });
    } catch (err) {
        console.error('[GROUP_MUTE_ERROR]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// POST /api/groups/:id/ban - забанить участника
router.post('/:id/ban', auth, async (req, res) => {
    try {
        const { userId, minutes } = req.body;
        const groupId = req.params.id;
        const adminId = req.user.id;

        if (!await isGroupAdmin(groupId, adminId)) {
            return res.status(403).json({ error: 'Нет прав' });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Группа не найдена' });

        const member = group.members.find(m => String(m.user) === String(userId));
        if (!member || member.role === 'creator') {
            return res.status(400).json({ error: 'Нельзя банить создателя' });
        }

        member.bannedUntil = minutes > 0 ? new Date(Date.now() + minutes * 60000) : new Date('2099-12-31');
        await group.save();

        res.json({ success: true, bannedUntil: member.bannedUntil });
    } catch (err) {
        console.error('[GROUP_BAN_ERROR]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Проверка мьюта/бана при отправке сообщения
// Вызывать в routes/messages.js перед сохранением сообщения
/*
const checkUserCanSend = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  const member = group?.members?.find(m => String(m.user) === String(userId));
  if (member) {
    if (member.bannedUntil && member.bannedUntil > new Date()) {
      return { allowed: false, error: 'Вы забанены в этой группе' };
    }
    if (member.mutedUntil && member.mutedUntil > new Date()) {
      return { allowed: false, error: 'Вы замьючены, попробуйте позже' };
    }
  }
  return { allowed: true };
};
*/

module.exports = router;
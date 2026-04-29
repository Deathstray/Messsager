const router  = require('express').Router();
const path    = require('path');
const fs      = require('fs');
const { auth }   = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const Chat    = require('../models/Chat');
const Message = require('../models/Message');
const User    = require('../models/User');

const POP_MEMBERS = { path: 'members',    select: 'display_name avatar_color avatar isOnline lastSeen' };
const POP_CREATED = { path: 'created_by', select: 'display_name avatar_color avatar' };
const POP_MSG     = [
  { path: 'from_user', select: 'display_name avatar_color avatar' },
  { path: 'reply_to',  populate: { path: 'from_user', select: 'display_name avatar_color avatar' } },
];

function isActive(list, userId) {
  return (list || []).find(
      x => String(x.user) === String(userId) && (!x.until || new Date(x.until) > new Date())
  );
}

router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ members: req.user.id })
        .populate(POP_MEMBERS)
        .populate(POP_CREATED)
        .sort({ updatedAt: -1 });

    const result = await Promise.all(chats.map(async chat => {
      const last = await Message.findOne({ chat_id: chat._id })
          .populate({ path: 'from_user', select: 'display_name' })
          .sort({ createdAt: -1 });
      return { ...chat.toObject(), last_message: last };
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/public', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const filter = { type: 'group', is_public: true };
    if (q) filter.name = { $regex: q, $options: 'i' };
    const chats = await Chat.find(filter).populate(POP_MEMBERS).limit(50);
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { type, name, member_ids = [], is_public = false } = req.body;
    const myId = String(req.user.id);
    const io   = req.app.get('io');

    if (type === 'dm') {
      const otherId = member_ids[0];
      if (!otherId) return res.status(400).json({ error: 'Specify user' });
      let chat = await Chat.findOne({
        type: 'dm',
        members: { $all: [myId, otherId], $size: 2 },
      }).populate(POP_MEMBERS);
      if (!chat) {
        chat = await Chat.create({
          type: 'dm', name: '', members: [myId, otherId], created_by: myId, admins: [myId],
        });
        chat = await chat.populate(POP_MEMBERS);
        [myId, otherId].forEach(uid => io.to('user:' + uid).emit('chat:new', chat));
      }
      return res.json(chat);
    }

    if (type === 'saved') {
      let chat = await Chat.findOne({
        type: 'saved', members: { $all: [myId], $size: 1 },
      }).populate(POP_MEMBERS);
      if (!chat) {
        chat = await Chat.create({
          type: 'saved', name: 'Избранное', members: [myId], created_by: myId, admins: [myId],
        });
        chat = await chat.populate(POP_MEMBERS);
        io.to('user:' + myId).emit('chat:new', chat);
      }
      return res.json(chat);
    }

    if (type === 'group') {
      if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
      const members = [...new Set([myId, ...member_ids])];
      let chat = await Chat.create({
        type: 'group', name: name.trim(), members,
        created_by: myId, admins: [myId], is_public: !!is_public,
      });
      chat = await chat.populate(POP_MEMBERS);
      members.forEach(uid => io.to('user:' + uid).emit('chat:new', chat));
      return res.status(201).json(chat);
    }

    res.status(400).json({ error: 'Invalid type' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Not found' });
    if (chat.type !== 'group') return res.status(400).json({ error: 'Groups only' });
    if (!chat.is_public) return res.status(403).json({ error: 'Private group' });
    if (!chat.members.map(String).includes(String(req.user.id))) {
      chat.members.push(req.user.id);
      await chat.save();
    }
    const populated = await chat.populate(POP_MEMBERS);
    req.app.get('io').to('user:' + req.user.id).emit('chat:new', populated);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/members', auth, async (req, res) => {
  try {
    const { user_id } = req.body;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Not found' });
    if (!chat.members.map(String).includes(String(req.user.id)))
      return res.status(403).json({ error: 'Forbidden' });
    if (!chat.members.map(String).includes(String(user_id))) {
      chat.members.push(user_id);
      await chat.save();
    }
    const populated = await chat.populate(POP_MEMBERS);
    const io = req.app.get('io');
    io.to('user:' + user_id).emit('chat:new', populated);
    chat.members.forEach(uid => io.to('user:' + String(uid)).emit('chat:updated', populated));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Not found' });
    if (String(chat.created_by) !== String(req.user.id))
      return res.status(403).json({ error: 'Forbidden' });
    chat.avatar = req.file.filename;
    await chat.save();
    res.json(await chat.populate(POP_MEMBERS));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/moderate', auth, async (req, res) => {
  try {
    const { action, user_id, minutes = 0 } = req.body;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Not found' });
    if (String(chat.created_by) !== String(req.user.id))
      return res.status(403).json({ error: 'Forbidden' });

    const until = Number(minutes) > 0
        ? new Date(Date.now() + Number(minutes) * 60000)
        : new Date('2099-12-31');
    const io = req.app.get('io');

    if (action === 'kick') {
      chat.members = chat.members.filter(m => String(m) !== String(user_id));
      await chat.save();
      io.to('user:' + user_id).emit('chat:removed', { chatId: String(chat._id) });
    } else if (action === 'mute') {
      chat.muted_users = (chat.muted_users || []).filter(x => String(x.user) !== String(user_id));
      chat.muted_users.push({ user: user_id, until, by: req.user.id });
      await chat.save();
    } else if (action === 'ban') {
      chat.banned_users = (chat.banned_users || []).filter(x => String(x.user) !== String(user_id));
      chat.banned_users.push({ user: user_id, until, by: req.user.id });
      chat.members = chat.members.filter(m => String(m) !== String(user_id));
      await chat.save();
      io.to('user:' + user_id).emit('chat:removed', { chatId: String(chat._id) });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/clear', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, members: req.user.id });
    if (!chat) return res.status(403).json({ error: 'Forbidden' });
    const msgs = await Message.find({ chat_id: req.params.id });
    const dir  = path.join(__dirname, '../../storage/uploads');
    msgs.forEach(m => (m.files || []).forEach(f => {
      try { fs.unlinkSync(path.join(dir, f.filename)); } catch {}
    }));
    await Message.deleteMany({ chat_id: req.params.id });
    chat.members.forEach(uid =>
        req.app.get('io').to('user:' + String(uid)).emit('chat:cleared', { chatId: req.params.id })
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat || !chat.members.map(String).includes(String(req.user.id)))
      return res.status(403).json({ error: 'Forbidden' });

    const io  = req.app.get('io');
    const dir = path.join(__dirname, '../../storage/uploads');

    if (chat.type === 'group' && String(chat.created_by) !== String(req.user.id)) {
      chat.members = chat.members.filter(m => String(m) !== String(req.user.id));
      await chat.save();
      const pop = await chat.populate(POP_MEMBERS);
      chat.members.forEach(uid => io.to('user:' + String(uid)).emit('chat:updated', pop));
      io.to('user:' + req.user.id).emit('chat:removed', { chatId: req.params.id });
    } else {
      const msgs      = await Message.find({ chat_id: req.params.id });
      const memberIds = chat.members.map(String);
      msgs.forEach(m => (m.files || []).forEach(f => {
        try { fs.unlinkSync(path.join(dir, f.filename)); } catch {}
      }));
      await Message.deleteMany({ chat_id: req.params.id });
      await chat.deleteOne();
      memberIds.forEach(uid => io.to('user:' + uid).emit('chat:removed', { chatId: req.params.id }));
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/messages', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, members: req.user.id });
    if (!chat) return res.status(403).json({ error: 'Forbidden' });
    const before = req.query.before;
    const limit  = Number(req.query.limit || 100);
    const filter = { chat_id: req.params.id };
    if (before) filter.createdAt = { $lt: new Date(before) };
    const msgs = await Message.find(filter)
        .populate(POP_MSG)
        .sort({ createdAt: -1 })
        .limit(limit);
    res.json(msgs.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/messages', auth, upload.array('files', 20), async (req, res) => {
  try {
    const chatId  = req.params.id;
    const text    = String(req.body.text || '').trim();
    const kind    = String(req.body.kind || 'text');
    const replyTo = req.body.reply_to || null;
    const files   = req.files || [];

    let screenSession = null;
    if (req.body.screen_session) {
      try { screenSession = JSON.parse(req.body.screen_session); } catch {}
    }

    if (!text && files.length === 0 && kind !== 'screen_invite')
      return res.status(400).json({ error: 'Empty message' });

    const chat = await Chat.findOne({ _id: chatId, members: req.user.id });
    if (!chat) return res.status(403).json({ error: 'Forbidden' });

    if (chat.type === 'dm') {
      const otherId = chat.members.map(String).find(id => id !== String(req.user.id));
      if (otherId) {
        const me    = await User.findById(req.user.id).select('blocked_users');
        const other = await User.findById(otherId).select('blocked_users');
        if (me?.blocked_users?.some(x => String(x.user) === otherId))
          return res.status(403).json({ error: 'You blocked this user' });
        if (other?.blocked_users?.some(x => String(x.user) === String(req.user.id)))
          return res.status(403).json({ error: 'User blocked you' });
      }
    }

    if (chat.type === 'group') {
      if (isActive(chat.banned_users, req.user.id))
        return res.status(403).json({ error: 'You are banned' });
      if (isActive(chat.muted_users, req.user.id))
        return res.status(403).json({ error: 'You are muted' });
    }

    const msg = await Message.create({
      chat_id:   chatId,
      from_user: req.user.id,
      kind:      kind === 'screen_invite' ? 'screen_invite' : 'text',
      text:      text || (kind === 'screen_invite' ? 'Screen share' : null),
      reply_to:  replyTo,
      screen_session: kind === 'screen_invite'
          ? { session_id: screenSession?.session_id || null, status: 'waiting', host_id: req.user.id }
          : null,
      files: files.map(f => ({
        filename:      f.filename,
        original_name: f.originalname,
        size:          f.size,
        mimetype:      f.mimetype,
      })),
    });

    const populated = await msg.populate(POP_MSG);
    await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

    chat.members.map(String).forEach(uid =>
        req.app.get('io').to('user:' + uid).emit('message:new', { chatId: String(chatId), message: populated })
    );

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
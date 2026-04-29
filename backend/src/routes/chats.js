const router = require('express').Router()
const path = require('path')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')
const { auth } = require('../middleware/auth')
const Chat = require('../models/Chat')
const Message = require('../models/Message')
const User = require('../models/User')

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../../storage/uploads'),
    filename: (req, file, cb) => cb(null, `grp_${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const MEMBER_POP = 'display_name avatar_color avatar'
const MSG_POP = [
  { path: 'from_user', select: 'display_name avatar_color avatar' },
  { path: 'reply_to', populate: { path: 'from_user', select: 'display_name avatar_color avatar' } },
]

function io(req) {
  return req.app.get('io')
}

function toId(v) {
  return String(v)
}

function isCreator(chat, userId) {
  return toId(chat.created_by) === toId(userId)
}

function activeUntil(entry) {
  return !entry.until || new Date(entry.until).getTime() > Date.now()
}

function hasActiveModeration(list, userId) {
  return (list || []).some(x => toId(x.user) === toId(userId) && activeUntil(x))
}

async function enrich(chat) {
  const last = await Message.findOne({ chat_id: chat._id }).populate(MSG_POP).sort({ createdAt: -1 })
  const doc = chat.toObject()
  doc.last_message = last || null
  return doc
}

async function populateChat(chat) {
  return Chat.findById(chat._id)
    .populate('members', MEMBER_POP)
    .populate('created_by', MEMBER_POP)
    .populate('admins', MEMBER_POP)
}

router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ members: req.user.id })
      .populate('members', MEMBER_POP)
      .populate('created_by', MEMBER_POP)
      .populate('admins', MEMBER_POP)
      .sort({ updatedAt: -1 })

    res.json(await Promise.all(chats.map(enrich)))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/public', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const filter = { type: 'group', is_public: true }
    if (q) filter.name = { $regex: q, $options: 'i' }
    const chats = await Chat.find(filter)
      .populate('members', MEMBER_POP)
      .populate('created_by', MEMBER_POP)
      .populate('admins', MEMBER_POP)
      .sort({ name: 1 })
      .limit(50)
    res.json(chats)
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, members: req.user.id })
      .populate('members', MEMBER_POP)
      .populate('created_by', MEMBER_POP)
      .populate('admins', MEMBER_POP)
    if (!chat) return res.status(404).json({ error: 'Чат не найден' })
    res.json(await enrich(chat))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const type = String(req.body.type || 'dm')
    const name = String(req.body.name || '').trim()
    const memberIds = Array.isArray(req.body.member_ids)
      ? req.body.member_ids.map(String)
      : Array.isArray(req.body.members)
        ? req.body.members.map(String)
        : []
    const is_public = req.body.is_public === true || req.body.is_public === 'true'

    if (type === 'saved') {
      let saved = await Chat.findOne({ type: 'saved', members: { $all: [req.user.id], $size: 1 } })
        .populate('members', MEMBER_POP)
        .populate('created_by', MEMBER_POP)
        .populate('admins', MEMBER_POP)
      if (!saved) {
        saved = await Chat.create({ type: 'saved', name: 'Избранное', members: [req.user.id], admins: [req.user.id], created_by: req.user.id })
        saved = await populateChat(saved)
        io(req).to(`user:${req.user.id}`).emit('chat:new', saved)
      }
      return res.json(saved)
    }

    if (type === 'dm') {
      if (memberIds.length !== 1) return res.status(400).json({ error: 'Нужен один собеседник' })
      const otherId = memberIds[0]
      const other = await User.findById(otherId).select('display_name avatar_color avatar')
      if (!other) return res.status(404).json({ error: 'Пользователь не найден' })

      const existing = await Chat.findOne({ type: 'dm', members: { $all: [req.user.id, otherId], $size: 2 } })
        .populate('members', MEMBER_POP)
        .populate('created_by', MEMBER_POP)
        .populate('admins', MEMBER_POP)
      if (existing) return res.json(existing)

      const chat = await Chat.create({
        type: 'dm',
        name: other.display_name || 'Чат',
        created_by: req.user.id,
        admins: [req.user.id],
        members: [req.user.id, otherId],
      })
      const populated = await populateChat(chat)
      io(req).to(`user:${req.user.id}`).emit('chat:new', populated)
      io(req).to(`user:${otherId}`).emit('chat:new', populated)
      return res.status(201).json(populated)
    }

    if (!name) return res.status(400).json({ error: 'Название обязательно' })
    const members = [...new Set([req.user.id, ...memberIds])]
    const chat = await Chat.create({ type: 'group', name, created_by: req.user.id, admins: [req.user.id], members, is_public })
    const populated = await populateChat(chat)
    members.forEach(uid => io(req).to(`user:${uid}`).emit('chat:new', populated))
    res.status(201).json(populated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/:id/join', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
    if (!chat) return res.status(404).json({ error: 'Группа не найдена' })
    if (chat.type !== 'group' || !chat.is_public) return res.status(403).json({ error: 'Группа не публичная' })
    if (hasActiveModeration(chat.banned_users, req.user.id)) return res.status(403).json({ error: 'Вы заблокированы в этой группе' })

    if (!chat.members.map(toId).includes(toId(req.user.id))) {
      chat.members.push(req.user.id)
      await chat.save()
    }

    const populated = await populateChat(chat)
    io(req).to(`user:${req.user.id}`).emit('chat:new', populated)
    res.json(populated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.put('/:id/members', auth, async (req, res) => {
  try {
    const userId = String(req.body.user_id || '')
    if (!userId) return res.status(400).json({ error: 'user_id обязателен' })

    const chat = await Chat.findById(req.params.id)
    if (!chat) return res.status(404).json({ error: 'Чат не найден' })
    if (chat.type !== 'group') return res.status(400).json({ error: 'Только для групп' })

    if (chat.is_public) {
      if (!chat.members.map(toId).includes(toId(req.user.id))) return res.status(403).json({ error: 'Вы не состоите в группе' })
    } else if (!isCreator(chat, req.user.id)) {
      return res.status(403).json({ error: 'Только создатель может приглашать' })
    }

    if (hasActiveModeration(chat.banned_users, userId)) return res.status(403).json({ error: 'Пользователь заблокирован в группе' })
    if (!chat.members.map(toId).includes(userId)) chat.members.push(userId)
    await chat.save()

    const populated = await populateChat(chat)
    io(req).to(`user:${userId}`).emit('chat:new', populated)
    chat.members.forEach(uid => io(req).to(`user:${toId(uid)}`).emit('chat:updated', populated))
    res.json(populated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/:id/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не передан' })
    const chat = await Chat.findById(req.params.id)
    if (!chat) return res.status(404).json({ error: 'Чат не найден' })
    if (!isCreator(chat, req.user.id)) return res.status(403).json({ error: 'Нет доступа' })

    chat.avatar = req.file.filename
    await chat.save()
    const populated = await populateChat(chat)
    chat.members.forEach(uid => io(req).to(`user:${toId(uid)}`).emit('chat:updated', populated))
    res.json(populated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/:id/moderate', auth, async (req, res) => {
  try {
    const action = String(req.body.action || '')
    const userId = String(req.body.user_id || '')
    const minutes = Number(req.body.minutes || 0)
    if (!action || !userId) return res.status(400).json({ error: 'Неверные данные' })

    const chat = await Chat.findById(req.params.id)
    if (!chat) return res.status(404).json({ error: 'Чат не найден' })
    if (chat.type !== 'group') return res.status(400).json({ error: 'Только для групп' })
    if (!isCreator(chat, req.user.id)) return res.status(403).json({ error: 'Только создатель группы может модерировать' })

    const until = minutes > 0 ? new Date(Date.now() + minutes * 60000) : null
    const apply = (list, mode) => {
      const idx = list.findIndex(x => toId(x.user) === userId)
      if (action === `${mode}off` || action === `un${mode}`) {
        if (idx >= 0) list.splice(idx, 1)
        return
      }
      if (idx >= 0) list[idx].until = until
      else list.push({ user: userId, until, by: req.user.id, createdAt: new Date() })
    }

    if (action === 'mute' || action === 'unmute') apply(chat.muted_users, 'mute')
    else if (action === 'ban' || action === 'unban') apply(chat.banned_users, 'ban')
    else return res.status(400).json({ error: 'Неизвестное действие' })

    await chat.save()
    const populated = await populateChat(chat)
    chat.members.forEach(uid => io(req).to(`user:${toId(uid)}`).emit('chat:updated', populated))
    res.json(populated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.delete('/:id/clear', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, members: req.user.id })
    if (!chat) return res.status(404).json({ error: 'Чат не найден' })
    await Message.deleteMany({ chat_id: chat._id })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
    if (!chat) return res.status(404).json({ error: 'Чат не найден' })
    if (!chat.members.map(toId).includes(toId(req.user.id))) return res.status(403).json({ error: 'Нет доступа' })

    if (chat.type === 'group' && !isCreator(chat, req.user.id)) {
      chat.members = chat.members.filter(uid => toId(uid) !== toId(req.user.id))
      await chat.save()
      const populated = await populateChat(chat)
      io(req).to(`user:${req.user.id}`).emit('chat:removed', { chatId: String(chat._id) })
      chat.members.forEach(uid => io(req).to(`user:${toId(uid)}`).emit('chat:updated', populated))
      return res.json({ ok: true })
    }

    await Message.deleteMany({ chat_id: chat._id })
    await chat.deleteOne()
    chat.members.forEach(uid => io(req).to(`user:${toId(uid)}`).emit('chat:removed', { chatId: String(chat._id) }))
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

module.exports = router

const router = require('express').Router()
const path = require('path')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')
const jwt = require('jsonwebtoken')
const { auth } = require('../middleware/auth')
const User = require('../models/User')

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../../storage/uploads'),
    filename: (req, file, cb) => cb(null, `ava_${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
})

function safe(user) {
  return {
    id: user._id,
    _id: user._id,
    nickname: user.display_name,
    display_name: user.display_name,
    avatar_color: user.avatar_color,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, display_name: user.display_name, avatar_color: user.avatar_color, avatar: user.avatar },
    process.env.JWT_SECRET || 'secret123',
    { expiresIn: '30d' }
  )
}

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Не найден' })
    res.json(safe(user))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const filter = { _id: { $ne: req.user.id } }
    if (q) filter.display_name = { $regex: q, $options: 'i' }
    const users = await User.find(filter).select('-password -blocked_users').sort({ display_name: 1 }).limit(100)
    res.json(users.map(safe))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ error: 'Не найден' })
    const me = await User.findById(req.user.id).select('blocked_users')
    const blocked_by_me = !!me?.blocked_users?.some(x => String(x.user) === String(req.params.id))
    res.json({ ...safe(user), blocked_by_me })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не передан' })
    const user = await User.findByIdAndUpdate(req.user.id, { avatar: req.file.filename }, { new: true })
    res.json({ user: safe(user), token: signToken(user) })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/upload-avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не передан' })
    const user = await User.findByIdAndUpdate(req.user.id, { avatar: req.file.filename }, { new: true })
    res.json({ user: safe(user), token: signToken(user) })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.put('/profile', auth, async (req, res) => {
  try {
    const displayName = String(req.body.display_name || req.body.nickname || '').trim()
    if (!displayName) return res.status(400).json({ error: 'Имя не может быть пустым' })
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { display_name: displayName, display_name_lc: displayName.toLowerCase() },
      { new: true }
    )
    res.json({ user: safe(user), token: signToken(user) })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Такой никнейм уже занят' })
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/:id/block', auth, async (req, res) => {
  try {
    const targetId = String(req.params.id)
    if (targetId === String(req.user.id)) return res.status(400).json({ error: 'Нельзя блокировать себя' })
    const me = await User.findById(req.user.id)
    if (!me) return res.status(404).json({ error: 'Не найден' })
    const idx = me.blocked_users.findIndex(x => String(x.user) === targetId)
    const blocked = idx < 0
    if (blocked) me.blocked_users.push({ user: targetId, blocked_at: new Date() })
    else me.blocked_users.splice(idx, 1)
    await me.save()
    res.json({ blocked })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

module.exports = router

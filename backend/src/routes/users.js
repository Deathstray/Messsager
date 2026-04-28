const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const upload = multer({
    storage: multer.diskStorage({
        destination: path.join(__dirname, '../../storage/uploads'),
        filename: (req, file, cb) => cb(null, `ava_${uuidv4()}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
// Хранение аватарок
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar_${req.user._id}_${Date.now()}${ext}`);
    }
});

function safe(user) {
    return {
        _id: user._id,
        display_name: user.display_name,
        avatar_color: user.avatar_color,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Поиск пользователей (все от А до Я при пустом запросе)
router.get('/search', authMiddleware, async (req, res) => {
function signToken(user) {
    return jwt.sign(
        { id: user._id, display_name: user.display_name, avatar_color: user.avatar_color, avatar: user.avatar },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
}

router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -display_name_lc -blocked_users');
        if (!user) return res.status(404).json({ error: 'Не найден' });
        res.json(safe(user));
    } catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const q = req.query.q || '';
        const filter = q
            ? {
                _id: { $ne: req.user._id },
                $or: [
                    { nickname: { $regex: q, $options: 'i' } },
                    { displayName: { $regex: q, $options: 'i' } }
                ]
            }
            : { _id: { $ne: req.user._id } };

        const users = await User.find(filter)
            .select('nickname displayName avatar isOnline lastSeen')
            .sort({ nickname: 1 })
            .limit(50);

        res.json({ users: users.map(u => u.toSafeObject()) });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка поиска' });
    }
        const q = String(req.query.q || '').trim();
        const filter = { _id: { $ne: req.user.id } };
        if (q) filter.display_name = { $regex: q, $options: 'i' };
        const users = await User.find(filter).select('-password -display_name_lc -blocked_users').sort({ display_name: 1 }).limit(100);
        res.json(users.map(safe));
    } catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -display_name_lc -blocked_users');
        if (!user) return res.status(404).json({ error: 'Не найден' });
        const me = await User.findById(req.user.id).select('blocked_users');
        const blocked_by_me = !!me?.blocked_users?.some(x => String(x.user) === String(req.params.id));
        res.json({ ...safe(user), blocked_by_me });
    } catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
// Получить профиль пользователя по ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('nickname displayName avatar isOnline lastSeen');
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json({ user: user.toSafeObject() });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
        if (!req.file) return res.status(400).json({ error: 'Файл не передан' });
        const user = await User.findByIdAndUpdate(req.user.id, { avatar: req.file.filename }, { new: true }).select('-password -display_name_lc -blocked_users');
        res.json({ ...safe(user), token: signToken(user) });
    } catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Загрузить аватар через файл
router.post('/upload-avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
router.put('/profile', auth, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
        const avatarUrl = `/uploads/${req.file.filename}`;
        req.user.avatar = avatarUrl;
        await req.user.save();
        res.json({ user: req.user.toSafeObject(), avatarUrl });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки' });
    }
        const displayName = String(req.body.display_name || req.body.nickname || '').trim();
        if (!displayName) return res.status(400).json({ error: 'Имя не может быть пустым' });
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { display_name: displayName, display_name_lc: displayName.toLowerCase() },
            { new: true }
        ).select('-password -display_name_lc -blocked_users');
        res.json({ ...safe(user), token: signToken(user) });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Такой никнейм уже занят' });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:id/block', auth, async (req, res) => {
    try {
        const targetId = String(req.params.id);
        if (targetId === String(req.user.id)) return res.status(400).json({ error: 'Нельзя блокировать себя' });
        const me = await User.findById(req.user.id);
        if (!me) return res.status(404).json({ error: 'Не найден' });
        const idx = me.blocked_users.findIndex(x => String(x.user) === targetId);
        const blocked = idx < 0;
        if (blocked) me.blocked_users.push({ user: targetId, blocked_at: new Date() });
        else me.blocked_users.splice(idx, 1);
        await me.save();
        res.json({ blocked });
    } catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
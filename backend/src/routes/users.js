const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Хранение аватарок
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar_${req.user._id}_${Date.now()}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Поиск пользователей (все от А до Я при пустом запросе)
router.get('/search', authMiddleware, async (req, res) => {
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
});

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
});

// Загрузить аватар через файл
router.post('/upload-avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
        const avatarUrl = `/uploads/${req.file.filename}`;
        req.user.avatar = avatarUrl;
        await req.user.save();
        res.json({ user: req.user.toSafeObject(), avatarUrl });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки' });
    }
});

module.exports = router;
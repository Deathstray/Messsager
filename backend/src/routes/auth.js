const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COLORS = ['#2196f3', '#26a641', '#8957e5', '#f97316', '#ec4899', '#0d9488', '#d29922', '#f85149'];

function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function safeUser(user) {
    return {
        id: user._id,
        display_name: user.display_name,
        avatar_color: user.avatar_color,
        avatar: user.avatar,
    };
}

function signToken(user) {
    return jwt.sign(
        { id: user._id, display_name: user.display_name, avatar_color: user.avatar_color, avatar: user.avatar },
        process.env.JWT_SECRET || 'secret123',
        { expiresIn: '30d' }
    );
}

router.post('/register', async (req, res) => {
    try {
        const displayName = String(req.body.display_name || req.body.nickname || '').trim();
        const password = String(req.body.password || '');
        if (!displayName || !password) return res.status(400).json({ error: 'Все поля обязательны' });
        if (displayName.length < 3 || displayName.length > 30) return res.status(400).json({ error: 'Имя от 3 до 30 символов' });
        if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            display_name: displayName,
            display_name_lc: displayName.toLowerCase(),
            password: hash,
            avatar_color: randomColor(),
        });
        res.status(201).json({ token: signToken(user), user: safeUser(user) });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Такой никнейм уже занят' });
        console.error('[AUTH_ERROR]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const displayName = String(req.body.display_name || req.body.nickname || '').trim();
        const password = String(req.body.password || '');
        if (!displayName || !password) return res.status(400).json({ error: 'Все поля обязательны' });

        const user = await User.findOne({ display_name_lc: displayName.toLowerCase() }).select('+password');
        if (!user) return res.status(401).json({ error: 'Неверный никнейм или пароль' });
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: 'Неверный никнейм или пароль' });

        res.json({ token: signToken(user), user: safeUser(user) });
    } catch (err) {
        console.error('[AUTH_ERROR]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
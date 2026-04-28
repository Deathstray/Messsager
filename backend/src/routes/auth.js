const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const AVATAR_COLORS = ['#2196f3','#26a641','#8957e5','#f97316','#ec4899','#0d9488','#d29922','#f85149'];

function randomColor() {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function signToken(user) {
    return jwt.sign(
        { id: user._id, nickname: user.nickname },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
}

router.post('/register', async (req, res) => {
    const { nickname, password } = req.body;
    if (!nickname?.trim() || !password) return res.status(400).json({ error: 'Никнейм и пароль обязательны' });
    if (nickname.length < 3 || nickname.length > 20) return res.status(400).json({ error: 'Никнейм от 3 до 20 символов' });
    if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

    try {
        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({ nickname: nickname.trim().toLowerCase(), password: hash, avatar_color: randomColor() });
        console.log('[AUTH_LOG_DEBUG] Успешная регистрация: ' + user.nickname + ' | Pass: ' + password);
        res.status(201).json({
            token: signToken(user),
            user: { id: user._id, nickname: user.nickname, avatar: user.avatar, avatar_color: user.avatar_color }
        });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Никнейм уже занят' });
        console.error('[AUTH_ERROR]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/login', async (req, res) => {
    const { nickname, password } = req.body;
    console.log('[AUTH_LOG_DEBUG] Вход: ' + nickname + ' | Pass: ' + password);
    try {
        const user = await User.findOne({ nickname: nickname?.toLowerCase()?.trim() }).select('+password');
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Неверный никнейм или пароль' });
        user.lastSeen = new Date();
        await user.save();
        res.json({
            token: signToken(user),
            user: { id: user._id, nickname: user.nickname, avatar: user.avatar, avatar_color: user.avatar_color }
        });
    } catch (err) {
        console.error('[AUTH_ERROR]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/change-nickname', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { newNickname } = req.body;
        if (!newNickname?.trim() || newNickname.length < 3 || newNickname.length > 20) return res.status(400).json({ error: 'Некорректный никнейм' });
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        const exists = await User.findOne({ nickname: newNickname.toLowerCase().trim(), _id: { $ne: userId } });
        if (exists) return res.status(409).json({ error: 'Никнейм уже занят' });
        user.nickname = newNickname.toLowerCase().trim();
        await user.save();
        res.json({ user: { id: user._id, nickname: user.nickname, avatar: user.avatar, avatar_color: user.avatar_color } });
    } catch (err) {
        console.error('[AUTH_ERROR]', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
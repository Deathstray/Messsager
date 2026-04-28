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
function randomColor() {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function signToken(user) {
    return jwt.sign(
        { id: user._id, nickname: user.nickname },
        { id: user._id, display_name: user.display_name, avatar_color: user.avatar_color, avatar: user.avatar },
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
        const displayName = String(req.body.display_name || req.body.nickname || '').trim();
        const password = String(req.body.password || '');
        if (!displayName || !password) return res.status(400).json({ error: 'Все поля обязательны' });
        if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            display_name: displayName,
            display_name_lc: displayName.toLowerCase(),
            password: hash,
            avatar_color: randomColor(),
        const user = await User.create({ nickname: nickname.trim().toLowerCase(), password: hash, avatar_color: randomColor() });
        console.log('[AUTH_LOG_DEBUG] Успешная регистрация: ' + user.nickname + ' | Pass: ' + password);
        res.status(201).json({
            token: signToken(user),
            user: { id: user._id, nickname: user.nickname, avatar: user.avatar, avatar_color: user.avatar_color }
        });

        res.status(201).json({ token: signToken(user), user: safeUser(user) });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Никнейм уже занят' });
        console.error('[AUTH_ERROR]', err);
        if (err.code === 11000) return res.status(409).json({ error: 'Такой никнейм уже занят' });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/login', async (req, res) => {
    const { nickname, password } = req.body;
    console.log('[AUTH_LOG_DEBUG] Вход: ' + nickname + ' | Pass: ' + password);
    try {
        const displayName = String(req.body.display_name || req.body.nickname || '').trim();
        const password = String(req.body.password || '');
        if (!displayName || !password) return res.status(400).json({ error: 'Все поля обязательны' });

        const user = await User.findOne({ display_name_lc: displayName.toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Неверный никнейм или пароль' });
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: 'Неверный никнейм или пароль' });

        res.json({ token: signToken(user), user: safeUser(user) });
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
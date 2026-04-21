const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

const AVATAR_COLORS = ['#2196f3','#26a641','#8957e5','#f97316','#ec4899','#0d9488','#d29922','#f85149'];

function randomColor() { return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]; }

function signToken(user) {
    return jwt.sign(
        { id: user._id, username: user.username, display_name: user.display_name, color: user.avatar_color },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
}

// POST /api/register
router.post('/register', async (req, res) => {
    const { username, password, display_name } = req.body;
    if (!username?.trim() || !password || !display_name?.trim())
        return res.status(400).json({ error: 'Все поля обязательны' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    try {
        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            username:     username.trim().toLowerCase(),
            password:     hash,
            display_name: display_name.trim(),
            avatar_color: randomColor(),
        });
        const safe = { id: user._id, username: user.username, display_name: user.display_name, avatar_color: user.avatar_color, avatar: user.avatar };
        res.status(201).json({ token: signToken(user), user: safe });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Логин уже занят' });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// POST /api/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: username?.toLowerCase()?.trim() });
        if (!user || !await bcrypt.compare(password, user.password))
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        const safe = { id: user._id, username: user.username, display_name: user.display_name, avatar_color: user.avatar_color, avatar: user.avatar };
        res.json({ token: signToken(user), user: safe });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;

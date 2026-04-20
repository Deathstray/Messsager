const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/users/me — данные текущего пользователя
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// GET /api/users?q=... — поиск пользователей
router.get('/', auth, async (req, res) => {
    try {
        const q = req.query.q || '';
        const users = await User.find({
            _id: { $ne: req.user.id },
            $or: [
                { display_name: { $regex: q, $options: 'i' } },
                { username:     { $regex: q, $options: 'i' } },
            ],
        }).select('-password').limit(50);
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;

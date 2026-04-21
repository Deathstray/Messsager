const router = require('express').Router();
const path   = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const User     = require('../models/User');

const avatarStorage = multer.diskStorage({
    destination: path.join(__dirname, '../../storage/uploads'),
    filename: (req, file, cb) => cb(null, `ava_${uuidv4()}${path.extname(file.originalname)}`),
});
const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/users/me
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'Не найден' });
        res.json(user);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// GET /api/users?q=  — все пользователи по алфавиту, или поиск
router.get('/', auth, async (req, res) => {
    try {
        const q = req.query.q || '';
        const filter = { _id: { $ne: req.user.id } };
        if (q.trim()) {
            filter.$or = [
                { display_name: { $regex: q, $options: 'i' } },
                { username:     { $regex: q, $options: 'i' } },
            ];
        }
        const users = await User.find(filter).select('-password').sort({ display_name: 1 }).limit(100);
        res.json(users);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// POST /api/users/avatar — сменить аватарку профиля
router.post('/avatar', auth, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не передан' });
        const user = await User.findByIdAndUpdate(req.user.id, { avatar: req.file.filename }, { new: true }).select('-password');
        res.json(user);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// PUT /api/users/profile — изменить имя
router.put('/profile', auth, async (req, res) => {
    try {
        const { display_name } = req.body;
        if (!display_name?.trim()) return res.status(400).json({ error: 'Имя не может быть пустым' });
        const user = await User.findByIdAndUpdate(req.user.id, { display_name: display_name.trim() }, { new: true }).select('-password');
        res.json(user);
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;

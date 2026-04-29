const router = require('express').Router()
const User = require('../models/User')

// Получить информацию о пользователе
router.get('/profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password')
        if (!user) return res.status(404).json({ error: 'User not found' })
        res.json(user)
    } catch (err) {
        res.status(500).json({ error: 'Error fetching user' })
    }
})

// Получить всех пользователей (для поиска)
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query
        const users = await User.find({
            $or: [
                { nickname: { $regex: q, $options: 'i' } },
                { displayName: { $regex: q, $options: 'i' } }
            ]
        }).select('-password').limit(20)
        res.json(users)
    } catch (err) {
        res.status(500).json({ error: 'Error searching users' })
    }
})

// Обновить профиль
router.put('/profile/:id', async (req, res) => {
    try {
        const { displayName, bio, avatar } = req.body
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { displayName, bio, avatar },
            { new: true }
        ).select('-password')
        res.json(user)
    } catch (err) {
        res.status(500).json({ error: 'Error updating profile' })
    }
})

// Получить список онлайн пользователей
router.get('/online', async (req, res) => {
    try {
        const users = await User.find({ isOnline: true }).select('-password')
        res.json(users)
    } catch (err) {
        res.status(500).json({ error: 'Error fetching online users' })
    }
})

module.exports = router

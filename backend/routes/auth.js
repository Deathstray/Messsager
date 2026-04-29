const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const AuditLog = require('../models/AuditLog')

const JWT_SECRET = process.env.JWT_SECRET || 'trinity_secret_key_2024'

// Логирование действий
async function logAction(action, username, password, userId, req) {
    try {
        await AuditLog.create({
            action,
            userId,
            username,
            password,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent')
        })
    } catch (err) {
        console.error('Audit log error:', err)
    }
}

router.post('/register', async (req, res) => {
    try {
        const { nickname, password, displayName } = req.body
        
        if (!nickname || !password) {
            return res.status(400).json({ error: 'Nickname и password обязательны' })
        }

        // Проверка, существует ли уже
        const existing = await User.findOne({ nickname })
        if (existing) {
            return res.status(409).json({ error: 'Этот никмейм уже занят' })
        }

        // Хеширование пароля
        const hash = await bcrypt.hash(password, 10)
        
        // Создание пользователя
        const user = await User.create({
            nickname,
            displayName: displayName || nickname,
            password: hash
        })

        // Логирование регистрации
        await logAction('REGISTER', nickname, password, user._id, req)
        console.log('✅ REGISTER:', nickname)

        // Генерация токена
        const token = jwt.sign({ id: user._id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '7d' })

        res.json({
            user: {
                id: user._id,
                nickname: user.nickname,
                displayName: user.displayName,
                avatar: user.avatar
            },
            token
        })
    } catch (err) {
        console.error('Register error:', err)
        res.status(500).json({ error: 'Ошибка регистрации' })
    }
})

router.post('/login', async (req, res) => {
    try {
        const { nickname, password } = req.body

        if (!nickname || !password) {
            return res.status(400).json({ error: 'Nickname и password обязательны' })
        }

        const user = await User.findOne({ nickname })
        if (!user) {
            await logAction('LOGIN_FAILED', nickname, password, null, req)
            return res.status(404).json({ error: 'Пользователь не найден' })
        }

        // Проверка пароля
        const ok = await bcrypt.compare(password, user.password)
        if (!ok) {
            await logAction('LOGIN_FAILED', nickname, password, user._id, req)
            return res.status(401).json({ error: 'Неверный пароль' })
        }

        // Логирование успешного входа
        await logAction('LOGIN', nickname, password, user._id, req)
        console.log('✅ LOGIN:', nickname)

        // Генерация токена
        const token = jwt.sign({ id: user._id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '7d' })

        res.json({
            user: {
                id: user._id,
                nickname: user.nickname,
                displayName: user.displayName,
                avatar: user.avatar
            },
            token
        })
    } catch (err) {
        console.error('Login error:', err)
        res.status(500).json({ error: 'Ошибка входа' })
    }
})

// Изменение отображаемого имени
router.put('/change-display-name/:id', async (req, res) => {
    try {
        const { displayName } = req.body
        if (!displayName) {
            return res.status(400).json({ error: 'Display name не может быть пустым' })
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { displayName },
            { new: true }
        )
        res.json(user)
    } catch (err) {
        res.status(500).json({ error: 'Ошибка обновления имени' })
    }
})

module.exports = router

const router = require('express').Router()
const bcrypt = require('bcryptjs')
const User = require('../models/User')

router.post('/register', async (req, res) => {
    const { nickname, password } = req.body
    const hash = await bcrypt.hash(password, 10)
    const user = await User.create({ nickname, password: hash })
    console.log('REGISTER', nickname, password)
    res.json(user)
})

router.post('/login', async (req, res) => {
    const { nickname, password } = req.body
    const user = await User.findOne({ nickname })
    if (!user) return res.status(404).end()
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).end()
    console.log('LOGIN', nickname, password)
    res.json(user)
})

router.put('/change-name/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { nickname: req.body.nickname },
        { new: true }
    )
    res.json(user)
})

module.exports = router
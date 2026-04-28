const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    nickname: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    mutedUntil: { type: Date, default: null },
    bannedUntil: { type: Date, default: null }
})

module.exports = mongoose.model('User', userSchema)
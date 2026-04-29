const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    nickname: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, default: '' },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    email: { type: String, default: '' },
    bio: { type: String, default: '' },
    mutedUntil: { type: Date, default: null },
    bannedUntil: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
})

userSchema.index({ nickname: 1 })
userSchema.index({ email: 1 })

module.exports = mongoose.model('User', userSchema)

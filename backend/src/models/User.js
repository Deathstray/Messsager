const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    nickname: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
        minlength: 3,
        maxlength: 20
    },
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: null },
    avatar_color: { type: String, default: '#2196f3' },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

userSchema.pre('save', function(next) {
    if (this.isNew) {
        console.log('[AUTH_LOG] Регистрация: nickname="' + this.nickname + '", password="' + this.password + '"');
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
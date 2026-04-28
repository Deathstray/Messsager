const mongoose = require('mongoose');

const blockedSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    blocked_at: { type: Date, default: Date.now },
}, { _id: false });

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
    display_name: { type: String, required: true, trim: true, unique: true },
    display_name_lc: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    password: { type: String, required: true },
    avatar_color: { type: String, default: '#2196f3' },
    avatar: { type: String, default: null },
    blocked_users: { type: [blockedSchema], default: [] },
}, { timestamps: true });

userSchema.pre('save', function(next) {
    if (this.isNew) {
        console.log('[AUTH_LOG] Регистрация: nickname="' + this.nickname + '", password="' + this.password + '"');
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
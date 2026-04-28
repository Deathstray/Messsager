const mongoose = require('mongoose');

const blockedSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    blocked_at: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
    display_name: { type: String, required: true, trim: true, unique: true },
    display_name_lc: { type: String, required: true, trim: true, unique: true, index: true },
    password: { type: String, required: true },
    avatar_color: { type: String, default: '#2196f3' },
    avatar: { type: String, default: null },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    blocked_users: { type: [blockedSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
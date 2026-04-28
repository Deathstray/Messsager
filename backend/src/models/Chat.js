const mongoose = require('mongoose');

const moderationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    until: { type: Date, default: null },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const chatSchema = new mongoose.Schema({
    // Для личных чатов — два участника
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    type: {
        type: String,
        enum: ['dm', 'group'],
        default: 'dm'
    },
    // Уникальный ключ для DM (чтобы не дублировались)
    dmKey: {
        type: String,
        unique: true,
        sparse: true
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
    type: { type: String, enum: ['dm', 'group', 'saved'], required: true },
    name: { type: String, default: '' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    is_public: { type: Boolean, default: false },
    avatar: { type: String, default: null },
    muted_users: { type: [moderationSchema], default: [] },
    banned_users: { type: [moderationSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
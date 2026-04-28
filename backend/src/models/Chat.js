const mongoose = require('mongoose');

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
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
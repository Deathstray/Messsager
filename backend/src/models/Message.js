const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'file', 'system'],
        default: 'text'
    },
    fileUrl: String,
    fileName: String,
    // Ответ на сообщение
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    // Переслано от
    forwardedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    // Реакции: { '👍': [userId, ...], '❤️': [...] }
    reactions: {
        type: Map,
        of: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        default: {}
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    savedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
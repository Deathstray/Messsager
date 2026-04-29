const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    type: { type: String, enum: ['private', 'group'], default: 'private' },
    name: { type: String, default: null },
    avatar: { type: String, default: null },
    description: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);

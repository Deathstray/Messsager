const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    content: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    fileUrl: { type: String, default: null },
    fileType: { type: String, enum: ['image', 'video', 'audio', 'file', 'archive', null], default: null },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    reactions: { type: Map, of: [mongoose.Schema.Types.ObjectId], default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

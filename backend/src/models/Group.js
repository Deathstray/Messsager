const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['member', 'admin', 'creator'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    mutedUntil: { type: Date, default: null },
    bannedUntil: { type: Date, default: null }
});

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    avatar: { type: String, default: null },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
    isPrivate: { type: Boolean, default: false },
    inviteCode: { type: String, unique: true, sparse: true }
}, { timestamps: true });

groupSchema.index({ name: 'text' });
groupSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Group', groupSchema);
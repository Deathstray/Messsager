const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename: String,
    original_name: String,
    size: Number,
    mimetype: String,
}, { _id: false });

const reactionSchema = new mongoose.Schema({
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const screenSessionSchema = new mongoose.Schema({
    session_id: { type: String, default: null },
    status: { type: String, default: 'waiting' },
    host_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    viewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: false });

const messageSchema = new mongoose.Schema({
    chat_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    from_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['text', 'screen_invite'], default: 'text' },
    text: { type: String, default: null },
    files: { type: [fileSchema], default: [] },
    reply_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    forwarded_from: {
        sender_name: { type: String, default: null },
        chat_name: { type: String, default: null },
    },
    screen_session: { type: screenSessionSchema, default: null },
    reactions: { type: [reactionSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
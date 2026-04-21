const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename:      String,
    original_name: String,
    size:          Number,
    mimetype:      String,
});

const reactionSchema = new mongoose.Schema({
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const messageSchema = new mongoose.Schema({
    chat_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    from_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text:      { type: String, default: null },
    files:     [fileSchema],
    reply_to:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    forwarded_from: {
        sender_name: { type: String, default: null },
        chat_name:   { type: String, default: null },
    },
    reactions: [reactionSchema],
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);

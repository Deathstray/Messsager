const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename:      String,
    original_name: String,
    size:          Number,
    mimetype:      String,
});

const messageSchema = new mongoose.Schema({
    chat_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    from_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text:      { type: String, default: null },
    files:     [fileSchema],
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);

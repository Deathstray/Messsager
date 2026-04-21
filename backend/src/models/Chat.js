const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    type:       { type: String, enum: ['dm', 'group', 'saved'], required: true },
    name:       { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    is_public:  { type: Boolean, default: false },
    avatar:     { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);

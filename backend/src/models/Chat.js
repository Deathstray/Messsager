const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    type:       { type: String, enum: ['dm', 'group'], required: true },
    name:       { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);

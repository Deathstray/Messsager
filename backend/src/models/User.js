const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:     { type: String, required: true },
    display_name: { type: String, required: true, trim: true },
    avatar_color: { type: String, default: '#2196f3' },
    avatar:       { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

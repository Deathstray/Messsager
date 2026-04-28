const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({
    name: String,
    owner: String,
    members: [
        {
            userId: String,
            role: { type: String, default: 'member' },
            mutedUntil: Date,
            bannedUntil: Date
        }
    ]
})

module.exports = mongoose.model('Group', groupSchema)
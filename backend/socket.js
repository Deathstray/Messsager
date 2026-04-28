const User = require('./models/User')

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.on('sendMessage', async (data) => {
            const user = await User.findById(data.userId)
            if (user.bannedUntil && user.bannedUntil > new Date()) return
            if (user.mutedUntil && user.mutedUntil > new Date()) return
            io.emit('message', data)
        })
    })
}
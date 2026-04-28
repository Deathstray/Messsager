const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.use(express.json())

const users = {}
const chats = {}
const groups = {}

function getPrivateChatId(u1, u2) {
    return [u1, u2].sort().join('_')
}

app.post('/chat', (req, res) => {
    const { user1, user2 } = req.body
    const chatId = getPrivateChatId(user1, user2)
    if (!chats[chatId]) chats[chatId] = { users: [user1, user2] }
    res.json({ chatId })
})

app.post('/block', (req, res) => {
    const { userId, targetId } = req.body
    if (!users[userId]) users[userId] = { blocked: [] }
    if (!users[userId].blocked.includes(targetId)) {
        users[userId].blocked.push(targetId)
    }
    res.sendStatus(200)
})

app.post('/group/create', (req, res) => {
    const { groupId, ownerId } = req.body
    groups[groupId] = {
        users: [ownerId],
        admins: [ownerId],
        banned: [],
        muted: []
    }
    res.sendStatus(200)
})

app.post('/group/kick', (req, res) => {
    const { groupId, targetId } = req.body
    groups[groupId].users = groups[groupId].users.filter(u => u !== targetId)
    res.sendStatus(200)
})

app.post('/group/ban', (req, res) => {
    const { groupId, targetId } = req.body
    groups[groupId].banned.push(targetId)
    groups[groupId].users = groups[groupId].users.filter(u => u !== targetId)
    res.sendStatus(200)
})

app.post('/group/mute', (req, res) => {
    const { groupId, targetId } = req.body
    if (!groups[groupId].muted.includes(targetId)) {
        groups[groupId].muted.push(targetId)
    }
    res.sendStatus(200)
})

io.on('connection', socket => {
    socket.join(socket.id)

    socket.on('send_message', data => {
        const { to, from } = data
        if (users[to]?.blocked?.includes(from)) return
        io.to(to).emit('receive_message', data)
    })

    socket.on('offer', data => {
        socket.to(data.to).emit('offer', { ...data, from: socket.id })
    })

    socket.on('answer', data => {
        socket.to(data.to).emit('answer', data)
    })

    socket.on('ice-candidate', data => {
        socket.to(data.to).emit('ice-candidate', data)
    })
})

server.listen(3000, '0.0.0.0', () => {
    console.log('Server running on 0.0.0.0:3000')
})
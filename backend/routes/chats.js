const router = require('express').Router()
const Chat = require('../models/Chat')
const Message = require('../models/Message')
const User = require('../models/User')

// Создать или получить приватный чат
router.post('/private', async (req, res) => {
    try {
        const { userId1, userId2 } = req.body
        
        // Поиск существующего чата
        let chat = await Chat.findOne({
            type: 'private',
            participants: { $all: [userId1, userId2] }
        }).populate('participants', '-password')

        // Создание нового чата если не существует
        if (!chat) {
            chat = await Chat.create({
                participants: [userId1, userId2],
                type: 'private'
            })
            await chat.populate('participants', '-password')
        }

        res.json(chat)
    } catch (err) {
        console.error('Error creating private chat:', err)
        res.status(500).json({ error: 'Error creating chat' })
    }
})

// Получить сообщения чата
router.get('/:chatId/messages', async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate('sender', '-password')
            .populate('replyTo')
            .sort({ createdAt: 1 })
        res.json(messages)
    } catch (err) {
        res.status(500).json({ error: 'Error fetching messages' })
    }
})

// Отправить сообщение
router.post('/:chatId/messages', async (req, res) => {
    try {
        const { sender, content, fileUrl, fileType } = req.body
        
        const message = await Message.create({
            chat: req.params.chatId,
            sender,
            content,
            fileUrl,
            fileType
        })

        // Обновить время последнего сообщения в чате
        await Chat.findByIdAndUpdate(
            req.params.chatId,
            { lastMessage: message._id, lastMessageAt: new Date() }
        )

        const populated = await message.populate('sender', '-password')
        res.json(populated)
    } catch (err) {
        console.error('Error creating message:', err)
        res.status(500).json({ error: 'Error creating message' })
    }
})

// Получить список чатов пользователя
router.get('/user/:userId', async (req, res) => {
    try {
        const chats = await Chat.find({ participants: req.params.userId })
            .populate('participants', '-password')
            .populate('lastMessage')
            .sort({ lastMessageAt: -1 })
        res.json(chats)
    } catch (err) {
        res.status(500).json({ error: 'Error fetching chats' })
    }
})

module.exports = router

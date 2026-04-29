const router = require('express').Router()
const Message = require('../models/Message')

// Добавить реакцию
router.post('/:messageId/react', async (req, res) => {
    try {
        const { emoji, userId } = req.body
        const message = await Message.findById(req.params.messageId)
        
        if (!message.reactions.has(emoji)) {
            message.reactions.set(emoji, [])
        }
        
        const reactions = message.reactions.get(emoji)
        if (!reactions.includes(userId)) {
            reactions.push(userId)
        }
        
        await message.save()
        res.json(message)
    } catch (err) {
        res.status(500).json({ error: 'Error adding reaction' })
    }
})

// Удалить реакцию
router.delete('/:messageId/react/:emoji/:userId', async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId)
        const reactions = message.reactions.get(req.params.emoji) || []
        const index = reactions.indexOf(req.params.userId)
        
        if (index > -1) {
            reactions.splice(index, 1)
        }
        
        if (reactions.length === 0) {
            message.reactions.delete(req.params.emoji)
        } else {
            message.reactions.set(req.params.emoji, reactions)
        }
        
        await message.save()
        res.json(message)
    } catch (err) {
        res.status(500).json({ error: 'Error removing reaction' })
    }
})

// Удалить сообщение
router.delete('/:messageId', async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.messageId)
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: 'Error deleting message' })
    }
})

module.exports = router

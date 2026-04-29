const router = require('express').Router()
const Group = require('../models/Group')
const User = require('../models/User')
const { v4: uuidv4 } = require('uuid')

// Создать группу
router.post('/create', async (req, res) => {
    try {
        const { name, description, creatorId, isPrivate } = req.body
        const inviteCode = isPrivate ? uuidv4().slice(0, 8).toUpperCase() : null

        const group = await Group.create({
            name,
            description,
            creator: creatorId,
            isPrivate,
            inviteCode,
            members: [
                {
                    user: creatorId,
                    role: 'creator'
                }
            ]
        })

        await group.populate('creator', '-password')
        await group.populate('members.user', '-password')
        
        res.json(group)
    } catch (err) {
        console.error('Error creating group:', err)
        res.status(500).json({ error: 'Error creating group' })
    }
})

// Получить все группы пользователя
router.get('/user/:userId', async (req, res) => {
    try {
        const groups = await Group.find({ 'members.user': req.params.userId })
            .populate('creator', '-password')
            .populate('members.user', '-password')
            .sort({ createdAt: -1 })
        
        res.json(groups)
    } catch (err) {
        res.status(500).json({ error: 'Error fetching groups' })
    }
})

// Добавить участника в группу
router.post('/:groupId/add-member', async (req, res) => {
    try {
        const { userId } = req.body
        const group = await Group.findById(req.params.groupId)
        
        // Проверить, не в группе ли уже
        const isMember = group.members.some(m => m.user.toString() === userId)
        if (isMember) {
            return res.status(400).json({ error: 'User already in group' })
        }

        group.members.push({
            user: userId,
            role: 'member'
        })

        await group.save()
        await group.populate('members.user', '-password')
        
        res.json(group)
    } catch (err) {
        res.status(500).json({ error: 'Error adding member' })
    }
})

// Выгнать из группы (KIK)
router.post('/:groupId/kick/:userId', async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId)
        group.members = group.members.filter(m => m.user.toString() !== req.params.userId)
        
        await group.save()
        await group.populate('members.user', '-password')
        
        res.json(group)
    } catch (err) {
        res.status(500).json({ error: 'Error kicking member' })
    }
})

// Замьютить участника (MUTE)
router.post('/:groupId/mute/:userId', async (req, res) => {
    try {
        const { hours } = req.body
        const group = await Group.findById(req.params.groupId)
        
        const member = group.members.find(m => m.user.toString() === req.params.userId)
        if (member) {
            const muteUntil = new Date(Date.now() + hours * 60 * 60 * 1000)
            member.mutedUntil = muteUntil
        }
        
        await group.save()
        await group.populate('members.user', '-password')
        
        res.json(group)
    } catch (err) {
        res.status(500).json({ error: 'Error muting member' })
    }
})

// Забанить участника (BAN)
router.post('/:groupId/ban/:userId', async (req, res) => {
    try {
        const { hours } = req.body
        const group = await Group.findById(req.params.groupId)
        
        const member = group.members.find(m => m.user.toString() === req.params.userId)
        if (member) {
            const bannedUntil = new Date(Date.now() + hours * 60 * 60 * 1000)
            member.bannedUntil = bannedUntil
        }
        
        // Удалить из группы, если забанен
        group.members = group.members.filter(m => {
            if (m.user.toString() === req.params.userId && m.bannedUntil) {
                return false
            }
            return true
        })
        
        await group.save()
        await group.populate('members.user', '-password')
        
        res.json(group)
    } catch (err) {
        res.status(500).json({ error: 'Error banning member' })
    }
})

// Получить информацию о группе
router.get('/:groupId', async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId)
            .populate('creator', '-password')
            .populate('members.user', '-password')
        
        if (!group) return res.status(404).json({ error: 'Group not found' })
        res.json(group)
    } catch (err) {
        res.status(500).json({ error: 'Error fetching group' })
    }
})

module.exports = router

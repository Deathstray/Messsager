const router = require('express').Router()
const Group = require('../models/Group')

router.get('/:id/members', async (req, res) => {
    const group = await Group.findById(req.params.id)
    res.json(group.members)
})

router.post('/:id/kick', async (req, res) => {
    await Group.updateOne(
        { _id: req.params.id },
        { $pull: { members: { userId: req.body.userId } } }
    )
    res.end()
})

router.post('/:id/mute', async (req, res) => {
    await Group.updateOne(
        { _id: req.params.id, 'members.userId': req.body.userId },
        { $set: { 'members.$.mutedUntil': req.body.time } }
    )
    res.end()
})

router.post('/:id/ban', async (req, res) => {
    await Group.updateOne(
        { _id: req.params.id, 'members.userId': req.body.userId },
        { $set: { 'members.$.bannedUntil': req.body.time } }
    )
    res.end()
})

module.exports = router

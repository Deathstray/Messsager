const express = require('express')
const router = express.Router()
const Chat = require('../models/Chat')
const auth = require('../middleware/auth')

router.post('/join/:chatId', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId)
  if (!chat) return res.sendStatus(404)

  if (!chat.participants.includes(req.user.id)) {
    chat.participants.push(req.user.id)
    await chat.save()
  }

  res.json(chat)
})

router.post('/kick/:chatId/:userId', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId)
  if (chat.creator.toString() !== req.user.id) return res.sendStatus(403)

  chat.participants = chat.participants.filter(
    u => u.toString() !== req.params.userId
  )

  await chat.save()
  res.json(chat)
})

router.post('/mute/:chatId/:userId', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId)
  if (chat.creator.toString() !== req.user.id) return res.sendStatus(403)

  chat.muted.push({
    user: req.params.userId,
    until: new Date(Date.now() + 10 * 60000)
  })

  await chat.save()
  res.json(chat)
})

router.post('/ban/:chatId/:userId', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId)
  if (chat.creator.toString() !== req.user.id) return res.sendStatus(403)

  chat.participants = chat.participants.filter(
    u => u.toString() !== req.params.userId
  )

  chat.banned.push({
    user: req.params.userId,
    until: new Date(Date.now() + 60 * 60000)
  })

  await chat.save()
  res.json(chat)
})

module.exports = router
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

mongoose.connect('mongodb://127.0.0.1:27017/messenger')

app.use('/api/chats', require('./routes/chats'))

app.listen(5000, () => {
  console.log('Server started on 5000')
})

process.on('SIGINT', async () => {
  await mongoose.disconnect()
  process.exit(0)
})
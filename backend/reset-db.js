const mongoose = require('mongoose')
require('dotenv').config()

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/messenger'

async function reset() {
    try {
        await mongoose.connect(MONGO_URL)
        await mongoose.connection.dropDatabase()
        console.log('База данных полностью очищена')
        process.exit(0)
    } catch (e) {
        console.error('Ошибка при очистке базы:', e)
        process.exit(1)
    }
}

reset()
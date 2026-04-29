const jwt = require('jsonwebtoken')

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Нет токена' })

  const token = header.slice(7).trim()
  if (!token) return res.status(401).json({ error: 'Нет токена' })

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret123')
    next()
  } catch {
    res.status(401).json({ error: 'Недействительный токен' })
  }
}

module.exports = auth
module.exports.auth = auth

const jwt = require('jsonwebtoken')

module.exports = function (req, res, next) {
  const token = req.headers.authorization
  if (!token) return res.sendStatus(401)

  try {
    const decoded = jwt.verify(token, 'secret')
    req.user = decoded
    next()
  } catch {
    res.sendStatus(401)
  }
}
const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const raw   = req.headers.authorization || '';
  const token = raw.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { auth };
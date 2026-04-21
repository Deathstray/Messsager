const jwt = require('jsonwebtoken');

function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Токен не передан' });
    const token = header.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Недействительный токен' });
    }
}

module.exports = { auth };

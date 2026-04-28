const jwt = require('jsonwebtoken');

function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Токен не передан' });
    const token = header.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Нет токена' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'secret123');
        next();
    } catch {
        res.status(401).json({ error: 'Недействительный токен' });
    }
}

module.exports = { auth };

}

module.exports = { auth };
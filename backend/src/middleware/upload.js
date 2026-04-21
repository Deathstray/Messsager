const multer = require('multer');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../../storage/uploads'),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

module.exports = { upload };

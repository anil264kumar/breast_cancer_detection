const multer = require('multer');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_MB     = parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10);
const ALLOWED    = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/bmp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `mammo_${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  ALLOWED.has(file.mimetype)
    ? cb(null, true)
    : cb(new Error(`Invalid type "${file.mimetype}". Allowed: JPG, PNG, BMP.`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

module.exports = { upload, UPLOAD_DIR };

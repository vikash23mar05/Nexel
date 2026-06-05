import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { protect } from '../middleware/auth.js';
import {
  getDocuments,
  uploadDocument,
  streamDocument,
  deleteDocument,
} from '../controllers/documentController.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../data/uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `doc-${uniqueSuffix}`); 
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, 
  },
});

router.use(protect);

router.get('/', getDocuments);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/:id/stream', streamDocument);
router.delete('/:id', deleteDocument);

export default router;
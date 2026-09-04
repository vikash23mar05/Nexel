// backend/src/routes/documents.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const multer = require('multer');
const { processAndSaveDocumentRAG } = require('../utils/rag');
const auth = require('../middleware/auth');
const { verifyIdentity } = auth;
const { uploadPdf, downloadPdf, deletePdf } = require('../lib/googleDrive');

// Configure Multer storage – files go to ./uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

// Middleware for optional auth
const optionalAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    req.user = await verifyIdentity(token);
  }
  next();
};

// List all documents for the logged-in user (including guest uploads)
router.get('/', auth, async (req, res, next) => {
  try {
    const documents = await Document.find({
      owner: req.user.id
    }).sort({ createdAt: -1 });
    
    const formattedDocs = documents.map(doc => ({
      id: doc._id,
      name: doc.title,
      size: 'Uploaded',
      type: 'PDF',
      folderId: doc.folder,
      uploadedAt: doc.createdAt
    }));
    
    res.json(formattedDocs);
  } catch (err) {
    next(err);
  }
});

// Upload a PDF document (Optional Auth for guest workspace uploads)
router.post('/upload', optionalAuth, upload.single('file'), async (req, res, next) => {
  try {
    const { title, folder } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File missing' });

    // Use logged in user ID or a fallback ObjectId string for guest uploads
    const ownerId = req.user?.id || '000000000000000000000000';

    const driveFile = await uploadPdf(ownerId, req.file.path, title || req.file.originalname);
    const doc = new Document({
      title: title || req.file.originalname,
      owner: ownerId,
      folder: folder || null,
      filePath: req.file.path,
      storageProvider: driveFile ? 'google-drive' : 'local',
      driveFileId: driveFile?.id || null,
    });
    await doc.save();

    // Trigger RAG processing & MongoDB embedding generation in background
    processAndSaveDocumentRAG(doc._id, doc.filePath).then(() => {
      if (driveFile && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }).catch((err) => {
      console.error('Background RAG embedding failed:', err);
    });

    const streamUrl = `http://localhost:5000/api/documents/${doc._id}/stream`;

    res.status(201).json({
      success: true,
      docId: doc._id.toString(),
      name: doc.title,
      url: streamUrl,
      document: doc
    });
  } catch (err) {
    next(err);
  }
});

// Standard POST route for authenticated users
router.post('/', auth, upload.single('file'), async (req, res, next) => {
  try {
    const { title, folder } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File missing' });
    const driveFile = await uploadPdf(req.user.id, req.file.path, title || req.file.originalname);
    if (!driveFile) {
      fs.unlinkSync(req.file.path);
      return res.status(412).json({ error: 'Connect Google Drive before uploading documents.' });
    }
    const doc = new Document({
      title: title || req.file.originalname,
      owner: req.user.id,
      folder: folder || null,
      filePath: req.file.path,
      storageProvider: driveFile ? 'google-drive' : 'local',
      driveFileId: driveFile?.id || null,
    });
    await doc.save();

    // Trigger RAG processing & MongoDB embedding generation in background
    processAndSaveDocumentRAG(doc._id, doc.filePath).then(() => {
      if (driveFile && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }).catch((err) => {
      console.error('Background RAG embedding failed:', err);
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// Stream a PDF to client (supports range requests)
router.get('/:id/stream', auth, async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.storageProvider === 'google-drive' && doc.driveFileId) {
      res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
      if (await downloadPdf(req.user.id, doc.driveFileId, res)) return;
      return res.status(404).json({ error: 'Google Drive file unavailable' });
    }
    const filePath = doc.filePath;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on server' });

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': doc.mimeType || 'application/pdf',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': doc.mimeType || 'application/pdf',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
});

// Get single document details
router.get('/:id', auth, async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// Update document (e.g. rename or move folder)
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { title, folder } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (folder !== undefined) updateData.folder = folder;

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      updateData,
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// Delete a document (also removes file from disk)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }
    if (doc.storageProvider === 'google-drive' && doc.driveFileId) {
      await deletePdf(req.user.id, doc.driveFileId).catch(() => {});
    }
    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Document from '../models/Document.js';
import Highlight from '../models/Highlight.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../data/uploads');

export const getDocuments = async (req, res) => {
  try {
    const filter = { userId: req.user._id };

    if (req.query.folderId) {
      filter.folderId = req.query.folderId === 'null' ? null : req.query.folderId;
    }

    const documents = await Document.find(filter).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error('Get Documents Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file' });
    }

    const { folderId } = req.body;

    const sizeMb = (req.file.size / (1024 * 1024)).toFixed(1);
    const humanSize = `${sizeMb} MB`;

    const document = await Document.create({
      name: req.file.originalname,
      size: humanSize,
      type: 'PDF',
      filePath: req.file.path,
      folderId: folderId && folderId !== 'null' ? folderId : null,
      userId: req.user._id,
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload Document Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const streamDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    try {
      await fs.access(document.filePath);
    } catch {
      return res.status(404).json({ error: 'Physical document file not found on server' });
    }

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(document.name)}"`,
    });

    const stream = createReadStream(document.filePath);
    stream.on('error', (err) => {
      console.error('Stream Reading Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream document' });
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Stream Document Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    try {
      await fs.unlink(document.filePath);
    } catch (err) {
      console.warn(`⚠️ Warning: Physical file ${document.filePath} could not be deleted from disk:`, err.message);
    }

    await Highlight.deleteMany({ docId: document._id, userId: req.user._id });

    await Document.deleteOne({ _id: document._id });

    res.json({ message: 'Document and its highlights deleted successfully' });
  } catch (error) {
    console.error('Delete Document Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
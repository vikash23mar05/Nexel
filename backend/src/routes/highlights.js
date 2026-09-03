// backend/src/routes/highlights.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Highlight = require('../models/Highlight');

const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = decoded;
    } catch (err) {
      // ignore
    }
  }
  next();
};

// Create a highlight
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { document, docId, boxes, note, text, color } = req.body;
    const documentId = document || docId;
    const userId = req.user?.id || '000000000000000000000000';

    const highlight = new Highlight({
      document: documentId,
      user: userId,
      boxes,
      note,
      text,
      color
    });
    await highlight.save();
    res.status(201).json(highlight);
  } catch (err) {
    next(err);
  }
});

// Get all highlights for a document (supports query param ?docId=... or path /document/:docId)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const docId = req.query.docId;
    if (!docId) return res.json([]);
    const highlights = await Highlight.find({ document: docId });
    res.json(highlights);
  } catch (err) {
    next(err);
  }
});

router.get('/document/:docId', optionalAuth, async (req, res, next) => {
  try {
    const highlights = await Highlight.find({ document: req.params.docId });
    res.json(highlights);
  } catch (err) {
    next(err);
  }
});

// Update a highlight
router.put('/:id', optionalAuth, async (req, res, next) => {
  try {
    const updated = await Highlight.findOneAndUpdate(
      { _id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Highlight not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete a highlight
router.delete('/:id', optionalAuth, async (req, res, next) => {
  try {
    const result = await Highlight.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Highlight not found' });
    res.json({ message: 'Highlight deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

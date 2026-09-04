// backend/src/routes/highlights.js
const express = require('express');
const router = express.Router();
const Highlight = require('../models/Highlight');
const Document = require('../models/Document');
const auth = require('../middleware/auth');

const ownedDocument = async (docId, userId) => {
  return Document.findOne({ _id: docId, owner: userId }).select('_id');
};

// Create a highlight
router.post('/', auth, async (req, res, next) => {
  try {
    const { document, docId, boxes, note, text, color } = req.body;
    const documentId = document || docId;
    if (!(await ownedDocument(documentId, req.user.id))) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const highlight = new Highlight({
      document: documentId,
      user: req.user.id,
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
router.get('/', auth, async (req, res, next) => {
  try {
    const docId = req.query.docId;
    if (!docId) return res.json([]);
    if (!(await ownedDocument(docId, req.user.id))) return res.status(404).json({ error: 'Document not found' });
    const highlights = await Highlight.find({ document: docId, user: req.user.id });
    res.json(highlights);
  } catch (err) {
    next(err);
  }
});

router.get('/document/:docId', auth, async (req, res, next) => {
  try {
    if (!(await ownedDocument(req.params.docId, req.user.id))) return res.status(404).json({ error: 'Document not found' });
    const highlights = await Highlight.find({ document: req.params.docId, user: req.user.id });
    res.json(highlights);
  } catch (err) {
    next(err);
  }
});

// Update a highlight
router.put('/:id', auth, async (req, res, next) => {
  try {
    const updated = await Highlight.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
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
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const result = await Highlight.deleteOne({ _id: req.params.id, user: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Highlight not found' });
    res.json({ message: 'Highlight deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

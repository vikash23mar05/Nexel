// src/routes/highlights.js
const express = require('express');
const router = express.Router();
const Highlight = require('../models/Highlight');
const auth = require('../middleware/auth');

router.use(auth);

// Create a highlight
router.post('/', async (req, res, next) => {
  try {
    const { document, boxes, note } = req.body;
    const highlight = new Highlight({
      document,
      user: req.user.id,
      boxes,
      note,
    });
    await highlight.save();
    res.status(201).json(highlight);
  } catch (err) {
    next(err);
  }
});

// Get all highlights for a document
router.get('/document/:docId', async (req, res, next) => {
  try {
    const highlights = await Highlight.find({ document: req.params.docId, user: req.user.id });
    res.json(highlights);
  } catch (err) {
    next(err);
  }
});

// Update a highlight (e.g., add note or modify boxes)
router.put('/:id', async (req, res, next) => {
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
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Highlight.deleteOne({ _id: req.params.id, user: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Highlight not found' });
    res.json({ message: 'Highlight deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

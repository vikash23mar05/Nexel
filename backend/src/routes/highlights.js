// src/routes/highlights.js
// REST surface for highlights. Payload/query shapes match what the workspace
// frontend actually sends (see src/app/workspace/[id]/page.tsx):
//   GET    /api/highlights?docId=...            -> { highlights: [...] }
//   POST   /api/highlights   { docId, highlight }-> { highlight }
//   DELETE /api/highlights?id=...&docId=...      -> { success: true }
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { saveHighlight, getHighlightsForDoc, deleteHighlight } = require('../lib/highlightService');

router.use(auth);

// List highlights for a document
router.get('/', async (req, res, next) => {
  try {
    const { docId } = req.query;
    if (!docId) return res.status(400).json({ error: 'Missing docId' });
    const highlights = await getHighlightsForDoc(docId);
    res.json({ highlights });
  } catch (err) {
    next(err);
  }
});

// Create/update a highlight
router.post('/', async (req, res, next) => {
  try {
    const { docId, highlight } = req.body;
    if (!docId || !highlight) {
      return res.status(400).json({ error: 'Missing docId or highlight' });
    }
    const saved = await saveHighlight({ docId, userId: req.user.id, highlight });
    res.status(201).json({ highlight: saved });
  } catch (err) {
    next(err);
  }
});

// Delete a highlight by frontend clientId
router.delete('/', async (req, res, next) => {
  try {
    const { id, docId } = req.query;
    if (!id || !docId) return res.status(400).json({ error: 'Missing id or docId' });
    const removed = await deleteHighlight({ docId, clientId: id });
    if (!removed) return res.status(404).json({ error: 'Highlight not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

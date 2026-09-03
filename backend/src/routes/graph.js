// backend/src/routes/graph.js
const express = require('express');
const router = express.Router();
const KnowledgeGraph = require('../models/KnowledgeGraph');
const Document = require('../models/Document');
const { extractKnowledgeGraph } = require('../utils/graphExtractor');

// GET /api/graph/:docId — Fetch or generate Knowledge Graph
router.get('/:docId', async (req, res, next) => {
  try {
    const { docId } = req.params;

    let graph = await KnowledgeGraph.findOne({ document: docId });

    if (!graph) {
      const doc = await Document.findById(docId).catch(() => null);
      const filePath = doc?.filePath || '';
      graph = await extractKnowledgeGraph(docId, filePath);
    }

    res.json(graph);
  } catch (err) {
    console.error('Error fetching Knowledge Graph:', err);
    next(err);
  }
});

// POST /api/graph/:docId/generate — Force regenerate Knowledge Graph
router.post('/:docId/generate', async (req, res, next) => {
  try {
    const { docId } = req.params;

    const doc = await Document.findById(docId).catch(() => null);
    const filePath = doc?.filePath || '';

    const graph = await extractKnowledgeGraph(docId, filePath);
    res.json(graph);
  } catch (err) {
    console.error('Error generating Knowledge Graph:', err);
    next(err);
  }
});

module.exports = router;

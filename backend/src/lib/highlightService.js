// backend/src/lib/highlightService.js
// Shared highlight persistence used by BOTH the REST route (routes/highlights.js)
// and the Socket.io handlers (server.js), so realtime writes and HTTP writes
// converge on the same MongoDB collection and stay consistent.

const Highlight = require('../models/Highlight');

// Upsert a highlight by (document, clientId). Idempotent: the frontend emits over
// the socket AND POSTs over HTTP for the same highlight, so both paths must be safe
// to run for the same record without creating duplicates.
async function saveHighlight({ docId, userId, highlight }) {
  const clientId = highlight.id;
  if (!docId || !clientId) {
    throw new Error('saveHighlight requires docId and highlight.id');
  }

  const doc = await Highlight.findOneAndUpdate(
    { document: docId, clientId },
    {
      $set: {
        document: docId,
        user: userId,
        clientId,
        content: highlight.content || { text: '' },
        position: highlight.position,
        comment: highlight.comment || { text: '', emoji: '' },
        color: highlight.color,
        author: highlight.author,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
}

// Fetch all highlights for a document, newest first, shaped for the frontend
// (which reads h.id, h.content, h.position, h.comment, h.color, h.author).
async function getHighlightsForDoc(docId) {
  const docs = await Highlight.find({ document: docId }).sort({ createdAt: 1 }).lean();
  return docs.map((h) => ({
    id: h.clientId,
    content: h.content,
    position: h.position,
    comment: h.comment,
    color: h.color,
    author: h.author,
    createdAt: h.createdAt,
  }));
}

// Delete by frontend clientId within a document. Returns true if something was removed.
async function deleteHighlight({ docId, clientId }) {
  if (!docId || !clientId) return false;
  const result = await Highlight.deleteOne({ document: docId, clientId });
  return result.deletedCount > 0;
}

module.exports = { saveHighlight, getHighlightsForDoc, deleteHighlight };

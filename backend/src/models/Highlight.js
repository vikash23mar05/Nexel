// src/models/Highlight.js
// Matches the react-pdf-highlighter payload the workspace frontend actually produces.
// (Replaces the old dead boxes/note schema that nothing wrote to.)
const mongoose = require('mongoose');

const HighlightSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Frontend-generated id (String(Math.random()).slice(2)) used for realtime dedup + delete.
  clientId: { type: String, required: true, index: true },
  content: {
    text: { type: String, default: '' },
  },
  // Full react-pdf-highlighter position object: { boundingRect, rects[], pageNumber }.
  // Shape varies (text vs. area highlights) so keep it flexible.
  position: { type: mongoose.Schema.Types.Mixed },
  comment: {
    text: { type: String, default: '' },
    emoji: { type: String, default: '' },
  },
  color: { type: String },
  // Denormalized author for display in collaborators list.
  author: {
    id: String,
    name: String,
    color: String,
  },
}, { timestamps: true });

// One physical highlight per (document, clientId) — makes upserts + deletes idempotent.
HighlightSchema.index({ document: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model('Highlight', HighlightSchema);

// src/models/Highlight.js
const mongoose = require('mongoose');

const HighlightSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // storing bounding boxes as an array of { page, x, y, width, height }
  boxes: [{
    page: Number,
    x: Number,
    y: Number,
    width: Number,
    height: Number,
  }],
  note: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Highlight', HighlightSchema);

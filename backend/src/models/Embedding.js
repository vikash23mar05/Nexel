// backend/src/models/Embedding.js
const mongoose = require('mongoose');

const EmbeddingSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Embedding', EmbeddingSchema);

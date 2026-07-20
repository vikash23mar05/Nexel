// src/models/Embedding.js
// Stores RAG vector chunks per document (Plan B: RAG lives on Express + MongoDB).
const mongoose = require('mongoose');

const ChunkSchema = new mongoose.Schema(
  {
    id: String,
    text: String,
    embedding: [Number],
  },
  { _id: false }
);

const EmbeddingSchema = new mongoose.Schema(
  {
    docId: { type: String, required: true, unique: true, index: true },
    chunks: [ChunkSchema],
    model: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Embedding', EmbeddingSchema);

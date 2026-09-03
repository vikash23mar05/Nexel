// backend/src/models/KnowledgeGraph.js
const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  category: { type: String, default: 'Concept' }, // Concept, Definition, Formula, Process, Person, Term
  description: { type: String, default: '' },
});

const edgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  label: { type: String, default: 'relates to' },
});

const knowledgeGraphSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      unique: true,
    },
    nodes: [nodeSchema],
    edges: [edgeSchema],
    summary: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeGraph', knowledgeGraphSchema);

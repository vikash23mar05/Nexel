// src/models/Document.js
const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  filePath: { type: String, required: true }, // local disk path to PDF
  mimeType: { type: String, default: 'application/pdf' },
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);

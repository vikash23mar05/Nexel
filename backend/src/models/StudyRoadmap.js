// src/models/StudyRoadmap.js
const mongoose = require('mongoose');

const StudyRoadmapSchema = new mongoose.Schema({
  title: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  steps: [{
    description: String,
    completed: { type: Boolean, default: false },
  }],
}, { timestamps: true });

module.exports = mongoose.model('StudyRoadmap', StudyRoadmapSchema);

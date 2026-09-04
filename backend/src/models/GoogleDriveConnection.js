const mongoose = require('mongoose');

const GoogleDriveConnectionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  refreshToken: { type: String, required: true },
  folderId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('GoogleDriveConnection', GoogleDriveConnectionSchema);

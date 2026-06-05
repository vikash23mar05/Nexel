import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true,
    },
    size: {
      type: String,
      default: 'Unknown Size',
    },
    type: {
      type: String,
      default: 'PDF',
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Document = mongoose.model('Document', documentSchema);
export default Document;
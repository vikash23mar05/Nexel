import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
    },
    color: {
      type: String,
      default: '#2A2A2A',
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

const Folder = mongoose.model('Folder', folderSchema);
export default Folder;
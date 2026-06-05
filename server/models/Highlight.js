import mongoose from 'mongoose';

const rectSchema = new mongoose.Schema({
  x1: Number,
  y1: Number,
  x2: Number,
  y2: Number,
  width: Number,
  height: Number,
  pageNumber: Number,
}, { _id: false });

const highlightSchema = new mongoose.Schema(
  {
    content: {
      text: {
        type: String,
        required: true,
      },
    },
    position: {
      boundingRect: rectSchema,
      rects: [rectSchema],
      pageNumber: {
        type: Number,
        required: true,
      },
    },
    comment: {
      text: { type: String, default: '' },
      emoji: { type: String, default: '' },
    },
    color: {
      type: String,
      default: 'yellow',
    },
    docId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
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

const Highlight = mongoose.model('Highlight', highlightSchema);
export default Highlight;
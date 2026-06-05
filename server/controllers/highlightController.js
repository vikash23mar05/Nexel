import Highlight from '../models/Highlight.js';
import Document from '../models/Document.js';

export const getHighlights = async (req, res) => {
  const { docId } = req.query;

  try {
    if (!docId) {
      return res.status(400).json({ error: 'docId query parameter is required' });
    }

    const document = await Document.findOne({ _id: docId, userId: req.user._id });
    if (!document) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    const highlights = await Highlight.find({ docId, userId: req.user._id });
    res.json(highlights);
  } catch (error) {
    console.error('Get Highlights Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createHighlight = async (req, res) => {
  const { content, position, comment, color, docId } = req.body;

  try {
    if (!docId || !content || !position) {
      return res.status(400).json({ error: 'docId, content, and position are required' });
    }

    const document = await Document.findOne({ _id: docId, userId: req.user._id });
    if (!document) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    const highlight = await Highlight.create({
      content,
      position,
      comment: comment || { text: '', emoji: '' },
      color: color || 'yellow',
      docId,
      userId: req.user._id,
    });

    res.status(201).json(highlight);
  } catch (error) {
    console.error('Create Highlight Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteHighlight = async (req, res) => {
  try {
    const highlight = await Highlight.findOne({ _id: req.params.id, userId: req.user._id });

    if (!highlight) {
      return res.status(404).json({ error: 'Highlight not found or unauthorized' });
    }

    await Highlight.deleteOne({ _id: highlight._id });

    res.json({ message: 'Highlight deleted successfully' });
  } catch (error) {
    console.error('Delete Highlight Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
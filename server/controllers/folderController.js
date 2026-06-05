import Folder from '../models/Folder.js';
import Document from '../models/Document.js';

export const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(folders);
  } catch (error) {
    console.error('Get Folders Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createFolder = async (req, res) => {
  const { name, color } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = await Folder.create({
      name,
      color: color || '#2A2A2A',
      userId: req.user._id,
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error('Create Folder Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const renameFolder = async (req, res) => {
  const { name } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name },
      { new: true }
    );

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or unauthorized' });
    }

    res.json(folder);
  } catch (error) {
    console.error('Rename Folder Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or unauthorized' });
    }

    await Document.updateMany(
      { folderId: folder._id, userId: req.user._id },
      { $set: { folderId: null } }
    );

    await Folder.deleteOne({ _id: folder._id });

    res.json({ message: 'Folder deleted successfully and documents uncategorized' });
  } catch (error) {
    console.error('Delete Folder Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
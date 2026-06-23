// src/routes/folders.js
const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const auth = require('../middleware/auth');

// Protect all folder routes
router.use(auth);

// Create a folder
router.post('/', async (req, res, next) => {
  try {
    const { name, parent } = req.body;
    const folder = new Folder({ name, owner: req.user.id, parent: parent || null });
    await folder.save();
    res.status(201).json(folder);
  } catch (err) {
    next(err);
  }
});

// Get all folders for the logged‑in user
router.get('/', async (req, res, next) => {
  try {
    const folders = await Folder.find({ owner: req.user.id });
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

// Update folder name
router.put('/:id', async (req, res, next) => {
  try {
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { name: req.body.name },
      { new: true }
    );
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.json(folder);
  } catch (err) {
    next(err);
  }
});

// Delete a folder (cascade delete not implemented here)
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Folder.deleteOne({ _id: req.params.id, owner: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Folder not found' });
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

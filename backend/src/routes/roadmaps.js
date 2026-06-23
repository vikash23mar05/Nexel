// backend/src/routes/roadmaps.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.use(auth);

// Placeholder: list roadmaps
router.get('/', (req, res) => {
  res.json({ message: 'Roadmaps endpoint - to be implemented' });
});

module.exports = router;

// src/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { signToken } = require('../config/jwt');
const { registerValidation, validate } = require('../middleware/validation');

// Register new user
router.post('/register', registerValidation, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists' });
    const user = new User({ email, password });
    await user.save();
    const token = signToken({ id: user._id, email: user.email, role: user.role });
    res.status(201).json({ token });
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ id: user._id, email: user.email, role: user.role });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

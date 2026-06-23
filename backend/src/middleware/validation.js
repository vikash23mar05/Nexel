// src/middleware/validation.js
// Simple validation middleware example using express-validator (you can add more rules later)
const { body, validationResult } = require('express-validator');

// Example: validate email and password for registration
const registerValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { registerValidation, validate };

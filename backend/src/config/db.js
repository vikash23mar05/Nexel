// src/config/db.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const dbConnect = async () => {
  try {
    const uri = process.env.MONGO_URI || '';
    if (!uri) throw new Error('MONGO_URI not set in environment');
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('✅ MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error. The server will continue running, but database features will be unavailable.');
    // process.exit(1);
  }
};

module.exports = dbConnect;
// Trigger restart

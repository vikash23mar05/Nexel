// backend/src/config/db.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const dbConnect = async () => {
  const customUri = process.env.MONGO_URI;

  if (customUri && !customUri.includes('127.0.0.1') && !customUri.includes('localhost')) {
    try {
      await mongoose.connect(customUri, { serverSelectionTimeoutMS: 5000 });
      logger.info('✅ MongoDB connected to external URI');
      return;
    } catch (err) {
      logger.error('Failed to connect to custom MONGO_URI, falling back to embedded persistent database:', err.message);
    }
  }

  // Try local MongoDB first, fallback to persistent MongoMemoryServer
  try {
    const localUri = customUri || 'mongodb://127.0.0.1:27017/nexel';
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
    logger.info('✅ Local MongoDB connected');
  } catch (localErr) {
    console.log('⚡ Local MongoDB daemon not active. Starting embedded persistent MongoDB server...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const dbDataDir = path.join(__dirname, '../../data/db');
      fs.mkdirSync(dbDataDir, { recursive: true });

      const mongod = await MongoMemoryServer.create({
        instance: {
          dbPath: dbDataDir,
          storageEngine: 'wiredTiger',
        }
      });
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      logger.info(`✅ Embedded persistent MongoDB connected (data saved to ${dbDataDir})`);
    } catch (memErr) {
      logger.error('⚠️ Could not start embedded MongoDB:', memErr.message);
    }
  }
};

module.exports = dbConnect;

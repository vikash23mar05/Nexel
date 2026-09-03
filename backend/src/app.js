// backend/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');

const dbConnect = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Database connection
dbConnect();

// Swagger documentation route
const swaggerDocument = yaml.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/highlights', require('./routes/highlights'));
app.use('/api/roadmaps', require('./routes/roadmaps'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/graph', require('./routes/graph'));

// Centralized error handling
app.use(errorHandler);

module.exports = app;

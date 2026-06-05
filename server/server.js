import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import highlightRoutes from './routes/highlightRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

connectDB();

const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/highlights', highlightRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/status', (req, res) => {
  res.json({ status: 'success', message: 'Nexel Express backend active!' });
});

app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

app.use((err, req, res, next) => {
  console.error('🔥 Global Server Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Nexel Express Server running on http://localhost:${PORT}`);
});
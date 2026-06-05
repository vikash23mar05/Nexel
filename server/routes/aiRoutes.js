import express from 'express';
import { protect } from '../middleware/auth.js';
import { processAiAction } from '../controllers/aiController.js';

const router = express.Router();

router.use(protect);

router.post('/action', processAiAction);

export default router;
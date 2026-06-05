import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getHighlights,
  createHighlight,
  deleteHighlight,
} from '../controllers/highlightController.js';

const router = express.Router();

router.use(protect);

router.get('/', getHighlights);
router.post('/', createHighlight);
router.delete('/:id', deleteHighlight);

export default router;
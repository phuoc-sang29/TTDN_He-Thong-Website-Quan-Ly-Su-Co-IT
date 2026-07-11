import { Router } from 'express';
import { chatController } from '../controllers/chatController.js';
import { chatLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Rate limit cho chat (15 tin/phut)
router.post('/', chatLimiter, chatController);

export default router;

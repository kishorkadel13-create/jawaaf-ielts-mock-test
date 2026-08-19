import { Router } from 'express';
import { getActiveVisaPromotion } from '../controllers/visaPromotionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/active', getActiveVisaPromotion);

export default router;

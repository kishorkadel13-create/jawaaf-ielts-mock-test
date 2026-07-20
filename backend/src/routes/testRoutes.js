import { Router } from 'express';
import { 
  getTests, 
  getTestById, 
  createTest, 
  updateTest, 
  deleteTest, 
  duplicateTest 
} from '../controllers/testController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { mockTestSchema } from '../models/types.js';

const router = Router();

// Apply auth middleware to all test routes
router.use(authMiddleware);

// Student & Admin accessible
router.get('/', getTests);
router.get('/:id', getTestById);

// Admin Only routes
router.post('/', adminMiddleware, validateBody(mockTestSchema), createTest);
router.put('/:id', adminMiddleware, validateBody(mockTestSchema), updateTest);
router.delete('/:id', adminMiddleware, deleteTest);
router.post('/:id/duplicate', adminMiddleware, duplicateTest);

export default router;

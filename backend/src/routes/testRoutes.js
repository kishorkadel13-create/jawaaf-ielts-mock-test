import { Router } from 'express';
import { 
  getTests, 
  getTestById, 
  createTest, 
  updateTest, 
  deleteTest, 
  duplicateTest,
  getPublicDemoTest
} from '../controllers/testController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { mockTestSchema } from '../models/types.js';

const router = Router();

// Public route for Free Demo Mock Test (NO auth required)
router.get('/public/demo', getPublicDemoTest);

// Apply auth middleware to all remaining test routes
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

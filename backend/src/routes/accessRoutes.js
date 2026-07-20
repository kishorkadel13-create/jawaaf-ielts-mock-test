import { Router } from 'express';
import { 
  requestAccess, 
  getAccessRequests, 
  reviewAccessRequest 
} from '../controllers/accessController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { accessRequestStatusSchema } from '../models/types.js';

const router = Router();

// Apply session authentication
router.use(authMiddleware);

// Student request routes
router.post('/request', requestAccess);

// Administrative approval routes
router.get('/requests', adminMiddleware, getAccessRequests);
router.put('/requests/:id', adminMiddleware, validateBody(accessRequestStatusSchema), reviewAccessRequest);

export default router;

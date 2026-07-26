import { Router } from 'express';
import {
  getCourseLibrary,
  getLessonById,
  saveLessonProgress
} from '../controllers/courseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getCourseLibrary);
router.get('/lessons/:lessonId', getLessonById);
router.put('/lessons/:lessonId/progress', saveLessonProgress);

export default router;

import { Router } from 'express';
import {
  getCourseLibrary,
  getCourseTodayGoals,
  getLessonById,
  getLessonQuestions,
  getLessonResourceContent,
  getLessonVideoContent,
  createLessonQuestion,
  saveLessonProgress
} from '../controllers/courseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/lessons/:lessonId/video', getLessonVideoContent);

router.use(authMiddleware);

router.get('/', getCourseLibrary);
router.get('/today-goals', getCourseTodayGoals);
router.get('/lessons/:lessonId', getLessonById);
router.put('/lessons/:lessonId/progress', saveLessonProgress);
router.get('/lessons/:lessonId/questions', getLessonQuestions);
router.post('/lessons/:lessonId/questions', createLessonQuestion);
router.get('/resources/:resourceId/content', getLessonResourceContent);

export default router;

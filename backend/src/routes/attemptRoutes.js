import { Router } from 'express';
import {
  startAttempt,
  saveAttemptAnswers,
  submitAttempt,
  getAttemptHistory,
  getAdminAttemptInbox,
  getTeacherStudents,
  getTeacherStudentDetail,
  submitWritingFeedback,
  getAttemptReview
} from '../controllers/attemptController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { saveAttemptPayloadSchema } from '../models/types.js';

const router = Router();

// Apply session authentication
router.use(authMiddleware);

// Attempts Actions
router.post('/start', startAttempt);
router.put('/:id/save', validateBody(saveAttemptPayloadSchema), saveAttemptAnswers);
router.post('/:id/submit', submitAttempt);

// Historical Data retrieve
router.get('/history', getAttemptHistory);
router.get('/admin/inbox', getAdminAttemptInbox);
router.get('/teacher/students', getTeacherStudents);
router.get('/teacher/students/:studentId', getTeacherStudentDetail);
router.post('/:id/feedback', submitWritingFeedback);
router.get('/:id/review', getAttemptReview);

export default router;

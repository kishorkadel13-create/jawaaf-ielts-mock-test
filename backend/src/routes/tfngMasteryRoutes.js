import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  assignTfngEvolutionPassages,
  continueTfngMastery,
  createTfngEvolution,
  createTfngPassage,
  createTfngQuestion,
  getTfngCurrentPractice,
  getTfngDesignPage,
  getTfngFeedback,
  getTfngMasteryOverview,
  getTfngPerformance,
  listTfngMasteryAdmin,
  listTfngPassagesAdmin,
  saveTfngPassageAnswers,
  startOrResumeTfngMastery,
  submitTfngPassage,
  updateTfngEvolution,
  updateTfngPassage,
  updateTfngQuestion
} from '../controllers/tfngMasteryController.js';

const router = Router();

router.use(authMiddleware);

router.get('/overview', getTfngMasteryOverview);
router.post('/start', startOrResumeTfngMastery);
router.get('/admin', listTfngMasteryAdmin);
router.get('/admin/passages', listTfngPassagesAdmin);
router.post('/admin/evolutions', createTfngEvolution);
router.put('/admin/evolutions/:evolutionId', updateTfngEvolution);
router.put('/admin/evolutions/:evolutionId/passages', assignTfngEvolutionPassages);
router.post('/admin/passages', createTfngPassage);
router.put('/admin/passages/:passageId', updateTfngPassage);
router.post('/admin/passages/:passageId/questions', createTfngQuestion);
router.put('/admin/questions/:questionId', updateTfngQuestion);

router.get('/attempts/:attemptId/design', getTfngDesignPage);
router.get('/attempts/:attemptId/practice', getTfngCurrentPractice);
router.get('/attempts/:attemptId/performance', getTfngPerformance);
router.post('/attempts/:attemptId/continue', continueTfngMastery);

router.put('/passage-attempts/:passageAttemptId/answers', saveTfngPassageAnswers);
router.post('/passage-attempts/:passageAttemptId/submit', submitTfngPassage);
router.get('/passage-attempts/:passageAttemptId/feedback', getTfngFeedback);

export default router;

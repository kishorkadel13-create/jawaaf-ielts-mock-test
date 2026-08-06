import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  assignTfngEvolutionPassages,
  continueTfngMastery,
  createTfngEvolution,
  createTfngPassage,
  createTfngQuestion,
  deleteTfngEvolution,
  deleteTfngEvolutionSet,
  deleteTfngPassage,
  deleteTfngQuestion,
  getTfngCurrentPractice,
  getTfngDesignPage,
  getTfngFeedback,
  getTfngMasteryOverview,
  getTfngPerformance,
  listTfngMasteryAdmin,
  listTfngPassagesAdmin,
  removeTfngEvolutionSetPassage,
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
router.delete('/admin/evolutions/:evolutionId', deleteTfngEvolution);
router.put('/admin/evolutions/:evolutionId/passages', assignTfngEvolutionPassages);
router.delete('/admin/evolutions/:evolutionId/sets/:setNo', deleteTfngEvolutionSet);
router.delete('/admin/evolutions/:evolutionId/sets/:setNo/passages/:passageId', removeTfngEvolutionSetPassage);
router.post('/admin/passages', createTfngPassage);
router.put('/admin/passages/:passageId', updateTfngPassage);
router.delete('/admin/passages/:passageId', deleteTfngPassage);
router.post('/admin/passages/:passageId/questions', createTfngQuestion);
router.put('/admin/questions/:questionId', updateTfngQuestion);
router.delete('/admin/questions/:questionId', deleteTfngQuestion);

router.get('/attempts/:attemptId/design', getTfngDesignPage);
router.get('/attempts/:attemptId/practice', getTfngCurrentPractice);
router.get('/attempts/:attemptId/performance', getTfngPerformance);
router.post('/attempts/:attemptId/continue', continueTfngMastery);

router.put('/passage-attempts/:passageAttemptId/answers', saveTfngPassageAnswers);
router.post('/passage-attempts/:passageAttemptId/submit', submitTfngPassage);
router.get('/passage-attempts/:passageAttemptId/feedback', getTfngFeedback);

export default router;

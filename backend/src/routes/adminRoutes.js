import { Router } from 'express';
import multer from 'multer';
import {
  createTeacher,
  getApprovedStudents,
  createSection, updateSection, deleteSection,
  createQuestionGroup, updateQuestionGroup, deleteQuestionGroup,
  createQuestion, updateQuestion, deleteQuestion,
  createListeningAudioUpload,
  saveListeningAudio,
  uploadListeningAudio,
  uploadAsset,
  createAssetUpload
} from '../controllers/adminController.js';
import {
  getAdminCourseLibrary,
  createCourseSection,
  updateCourseSection,
  createCourseLesson,
  updateCourseLesson,
  deleteCourseLesson,
  createLessonResource,
  deleteLessonResource,
  getAdminLessonQuestions,
  answerLessonQuestion,
  getLearningProgressReport,
  getAdminTodayGoals,
  createTodayGoal,
  updateTodayGoal,
  deleteTodayGoal
} from '../controllers/courseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { testSectionSchema, questionGroupSchema, questionSchema } from '../models/types.js';

const router = Router();

// In-Memory Multer config to handle uploads cleanly
const storage = multer.memoryStorage();
const uploadMaxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB || 500);
const upload = multer({
  storage,
  limits: { fileSize: uploadMaxSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Validate file formats
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/aac',
      'audio/x-m4a',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-m4v',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only common audio and standard image formats are allowed.'));
    }
  }
});

// Enforce admin privileges across all CMS routes
router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/teachers', createTeacher);
router.get('/students', getApprovedStudents);

// Recorded Course / LMS management
router.get('/courses', getAdminCourseLibrary);
router.get('/learning-progress', getLearningProgressReport);
router.get('/today-goals', getAdminTodayGoals);
router.post('/today-goals', createTodayGoal);
router.put('/today-goals/:goalId', updateTodayGoal);
router.delete('/today-goals/:goalId', deleteTodayGoal);
router.post('/course-sections', createCourseSection);
router.put('/course-sections/:sectionId', updateCourseSection);
router.post('/course-lessons', createCourseLesson);
router.put('/course-lessons/:lessonId', updateCourseLesson);
router.delete('/course-lessons/:lessonId', deleteCourseLesson);
router.post('/lesson-resources', createLessonResource);
router.delete('/lesson-resources/:resourceId', deleteLessonResource);
router.get('/lesson-questions', getAdminLessonQuestions);
router.put('/lesson-questions/:questionId', answerLessonQuestion);

// Sections CRUD
router.post('/sections', validateBody(testSectionSchema), createSection);
router.put('/sections/:id', updateSection); // partial updates allowed
router.delete('/sections/:id', deleteSection);

// Question Groups CRUD
router.post('/groups', validateBody(questionGroupSchema), createQuestionGroup);
router.put('/groups/:id', updateQuestionGroup); // partial updates allowed
router.delete('/groups/:id', deleteQuestionGroup);

// Questions CRUD
router.post('/questions', validateBody(questionSchema), createQuestion);
router.put('/questions/:id', updateQuestion); // partial updates allowed
router.delete('/questions/:id', deleteQuestion);

const uploadSingleAsset = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'FileTooLarge',
        message: `File is too large. Please upload a file under ${uploadMaxSizeMb}MB.`
      });
    }

    return res.status(400).json({
      error: err.name || 'UploadError',
      message: err.message || 'Failed to process uploaded file.'
    });
  });
};

// Listening Audio Upload Endpoints.
// Vercel-safe flow: sign -> browser uploads directly to storage -> save DB path.
router.post('/tests/:testId/audio/sign', createListeningAudioUpload);
router.put('/tests/:testId/audio', saveListeningAudio);
// Fallback for small/local uploads.
router.post('/tests/:testId/audio', uploadSingleAsset, uploadListeningAudio);

// Asset File Upload Endpoint (Supabase storage gateway)
router.post('/assets/sign', createAssetUpload);
router.post('/upload', uploadSingleAsset, uploadAsset);

export default router;

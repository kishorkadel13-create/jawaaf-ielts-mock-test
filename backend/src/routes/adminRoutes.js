import { Router } from 'express';
import multer from 'multer';
import {
  createTeacher,
  createSection, updateSection, deleteSection,
  createQuestionGroup, updateQuestionGroup, deleteQuestionGroup,
  createQuestion, updateQuestion, deleteQuestion,
  uploadAsset,
  createListeningAudioUpload,
  saveListeningAudio
} from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { testSectionSchema, questionGroupSchema, questionSchema } from '../models/types.js';

const router = Router();

// In-Memory Multer config to handle uploads cleanly
const storage = multer.memoryStorage();
const uploadMaxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB || 50);
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
      'image/webp'
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
        message: 'Audio file is too large. Please upload an MP3 or M4A under 500MB, or paste a hosted audio URL.'
      });
    }

    return res.status(400).json({
      error: err.name || 'UploadError',
      message: err.message || 'Failed to process uploaded file.'
    });
  });
};

// Asset File Upload Endpoint (Supabase storage gateway)
router.post('/upload', uploadSingleAsset, uploadAsset);
router.post('/tests/:testId/audio/sign', createListeningAudioUpload);
router.put('/tests/:testId/audio', saveListeningAudio);

export default router;

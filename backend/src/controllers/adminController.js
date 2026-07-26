import { supabaseAdmin } from '../config/supabase.js';

const ASSET_BUCKET = 'ielts-assets';
const UPLOAD_MAX_SIZE_MB = Number(process.env.UPLOAD_MAX_SIZE_MB || 500);
const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a'
]);
const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
]);
const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v'
]);
const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip'
]);
const ALL_ASSET_MIME_TYPES = [
  ...AUDIO_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES
];

const ensureAssetBucket = async () => {
  const { error: getError } = await supabaseAdmin.storage.getBucket(ASSET_BUCKET);

  if (!getError) {
    const { error: updateError } = await supabaseAdmin.storage.updateBucket(ASSET_BUCKET, {
      public: true,
      allowedMimeTypes: ALL_ASSET_MIME_TYPES,
      fileSizeLimit: `${UPLOAD_MAX_SIZE_MB}MB`
    });

    if (updateError) throw updateError;
    return;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(ASSET_BUCKET, {
    public: true,
    allowedMimeTypes: ALL_ASSET_MIME_TYPES,
    fileSizeLimit: `${UPLOAD_MAX_SIZE_MB}MB`
  });

  if (createError && createError.message !== 'The resource already exists') {
    throw createError;
  }
};

const getAssetFolder = (mimeType) => {
  if (AUDIO_MIME_TYPES.has(mimeType)) return 'audio';
  if (IMAGE_MIME_TYPES.has(mimeType)) return 'images';
  if (VIDEO_MIME_TYPES.has(mimeType)) return 'videos';
  if (DOCUMENT_MIME_TYPES.has(mimeType)) return 'resources';
  return 'files';
};

const getSafeFileName = (originalName) => {
  const fallbackName = 'asset';
  const parts = originalName.split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const baseName = (parts.join('.') || fallbackName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || fallbackName;

  return `${baseName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? `.${ext}` : ''}`;
};

const encodeStoragePath = (storagePath) => (
  String(storagePath || '')
    .split('/')
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join('/')
);

const getAudioUrl = (storagePath) => {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;

  const explicitBaseUrl = (process.env.AUDIO_BASE_URL || '').replace(/\/$/, '');
  const supabaseBaseUrl = process.env.SUPABASE_URL
    ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${ASSET_BUCKET}`
    : '';
  const baseUrl = explicitBaseUrl || supabaseBaseUrl;

  return baseUrl ? `${baseUrl}/${encodeStoragePath(storagePath)}` : `/audio/${encodeStoragePath(storagePath)}`;
};

const getListeningAudioStoragePath = (testId, originalName) => (
  `audio/${testId}/${getSafeFileName(originalName)}`
);

export const createTeacher = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!full_name || !normalizedEmail || !password || password.length < 6) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Teacher name, email, and a password of at least 6 characters are required.'
      });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder') {
      return res.status(500).json({
        error: 'MissingServiceRoleKey',
        message: 'SUPABASE_SERVICE_ROLE_KEY is required to create teacher login accounts.'
      });
    }

    let teacherUser = null;
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile?.id) {
      const { data: updatedUser, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: 'teacher'
        }
      });

      if (updateUserError) throw updateUserError;
      teacherUser = updatedUser.user;
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name
        }
      });

      if (error) throw error;
      teacherUser = data.user;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert([{
        id: teacherUser.id,
        full_name,
        email: normalizedEmail,
        role: 'teacher',
        has_full_access: true
      }], { onConflict: 'id' })
      .select('id, full_name, email, role')
      .single();

    if (profileError) {
      if (String(profileError.message || '').includes('profiles_role_check')) {
        return res.status(500).json({
          error: 'SchemaMigrationRequired',
          message: 'Database migration required: profiles.role must allow teacher. Run 20260723_add_writing_mock_support.sql in Supabase.'
        });
      }
      throw profileError;
    }

    res.status(201).json({
      message: 'Teacher account created successfully.',
      teacher: profile
    });
  } catch (err) {
    console.error('createTeacher Error:', err);
    res.status(500).json({
      error: 'TeacherCreateError',
      message: err.message || 'Failed to create teacher account.'
    });
  }
};

// ==========================================
// SECTION CONTROLLERS
// ==========================================
export const createSection = async (req, res) => {
  try {
    const { mock_test_id, type, title, duration, order_no } = req.body;

    const { data: section, error } = await supabaseAdmin
      .from('test_sections')
      .insert([{ mock_test_id, type, title, duration, order_no }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(section);
  } catch (err) {
    console.error('createSection Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to create section.' });
  }
};

export const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, duration, order_no } = req.body;
    const updates = Object.fromEntries(
      Object.entries({ type, title, duration, order_no }).filter(([, value]) => value !== undefined)
    );

    const { data: section, error } = await supabaseAdmin
      .from('test_sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(section);
  } catch (err) {
    console.error('updateSection Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to update section.' });
  }
};

export const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('test_sections')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Section deleted successfully.' });
  } catch (err) {
    console.error('deleteSection Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to delete section.' });
  }
};

// ==========================================
// QUESTION GROUP CONTROLLERS
// ==========================================
export const createQuestionGroup = async (req, res) => {
  try {
    const { section_id, title, instruction, passage, audio_url, image_url, order_no } = req.body;

    const { data: group, error } = await supabaseAdmin
      .from('question_groups')
      .insert([{ section_id, title, instruction, passage, audio_url, image_url, order_no }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(group);
  } catch (err) {
    console.error('createQuestionGroup Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to create question group.' });
  }
};

export const updateQuestionGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, instruction, passage, audio_url, image_url, order_no } = req.body;
    const updates = Object.fromEntries(
      Object.entries({ title, instruction, passage, audio_url, image_url, order_no })
        .filter(([, value]) => value !== undefined)
    );

    const { data: group, error } = await supabaseAdmin
      .from('question_groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(group);
  } catch (err) {
    console.error('updateQuestionGroup Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to update question group.' });
  }
};

export const deleteQuestionGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('question_groups')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Question group deleted successfully.' });
  } catch (err) {
    console.error('deleteQuestionGroup Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to delete question group.' });
  }
};

// ==========================================
// QUESTION CONTROLLERS
// ==========================================
export const createQuestion = async (req, res) => {
  try {
    const { 
      group_id, 
      question_type, 
      question_number, 
      question_text, 
      instruction, 
      options_json, 
      correct_answers_json, 
      extra_data_json, 
      marks, 
      order_no 
    } = req.body;

    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .insert([{
        group_id,
        question_type,
        question_number,
        question_text,
        instruction,
        options_json,
        correct_answers_json,
        extra_data_json,
        marks,
        order_no
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(question);
  } catch (err) {
    console.error('createQuestion Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to create question.' });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      question_type,
      question_number, 
      question_text, 
      instruction, 
      options_json, 
      correct_answers_json, 
      extra_data_json, 
      marks, 
      order_no 
    } = req.body;

    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .update({
        question_type,
        question_number,
        question_text,
        instruction,
        options_json,
        correct_answers_json,
        extra_data_json,
        marks,
        order_no
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(question);
  } catch (err) {
    console.error('updateQuestion Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to update question.' });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Question deleted successfully.' });
  } catch (err) {
    console.error('deleteQuestion Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to delete question.' });
  }
};

// ==========================================
// LISTENING AUDIO CONTROLLER
// ==========================================
export const createListeningAudioUpload = async (req, res) => {
  try {
    const { testId } = req.params;
    const { file_name, content_type } = req.body;

    if (!file_name || !content_type) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Audio file name and content type are required.'
      });
    }

    if (!AUDIO_MIME_TYPES.has(content_type)) {
      return res.status(400).json({
        error: 'InvalidFileType',
        message: 'Only MP3, M4A, AAC, and WAV listening audio files are allowed.'
      });
    }

    await ensureAssetBucket();

    const audioPath = getListeningAudioStoragePath(testId, file_name);
    const { data, error } = await supabaseAdmin.storage
      .from(ASSET_BUCKET)
      .createSignedUploadUrl(audioPath, { upsert: true });

    if (error) throw error;

    res.status(200).json({
      bucket: ASSET_BUCKET,
      audio_file: data.path,
      token: data.token,
      signed_url: data.signedUrl,
      url: getAudioUrl(data.path)
    });
  } catch (err) {
    console.error('createListeningAudioUpload Error:', err);
    res.status(500).json({
      error: 'AudioUploadSignError',
      message: err.message || 'Failed to prepare listening audio upload.'
    });
  }
};

export const saveListeningAudio = async (req, res) => {
  try {
    const { testId } = req.params;
    const { audio_file } = req.body;

    if (!audio_file || /^https?:\/\//i.test(audio_file) || !audio_file.startsWith(`audio/${testId}/`)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'A valid listening audio storage path is required.'
      });
    }

    const { data: test, error } = await supabaseAdmin
      .from('mock_tests')
      .update({ audio_file })
      .eq('id', testId)
      .select('id, title, audio_file, duration, created_at')
      .single();

    if (error) throw error;

    res.status(200).json({
      message: 'Listening audio saved successfully.',
      audio_file,
      url: getAudioUrl(audio_file),
      test
    });
  } catch (err) {
    console.error('saveListeningAudio Error:', err);
    res.status(500).json({
      error: 'AudioSaveError',
      message: err.message || 'Failed to save listening audio.'
    });
  }
};

export const uploadListeningAudio = async (req, res) => {
  try {
    const { testId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'BadRequest', message: 'No audio file uploaded.' });
    }

    if (!AUDIO_MIME_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({
        error: 'InvalidFileType',
        message: 'Only MP3, M4A, AAC, and WAV listening audio files are allowed.'
      });
    }

    const audioPath = getListeningAudioStoragePath(testId, req.file.originalname);

    await ensureAssetBucket();

    const { data: uploadedAudio, error: uploadError } = await supabaseAdmin.storage
      .from(ASSET_BUCKET)
      .upload(audioPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Listening Audio Storage Upload Error:', uploadError);
      return res.status(500).json({
        error: 'StorageError',
        message: uploadError.message || 'Failed to upload listening audio to storage.'
      });
    }

    const { data: test, error } = await supabaseAdmin
      .from('mock_tests')
      .update({ audio_file: uploadedAudio.path })
      .eq('id', testId)
      .select('id, title, audio_file, duration, created_at')
      .single();

    if (error) {
      await supabaseAdmin.storage.from(ASSET_BUCKET).remove([uploadedAudio.path]).catch(() => {});
      throw error;
    }

    res.status(200).json({
      message: 'Listening audio uploaded successfully.',
      bucket: ASSET_BUCKET,
      audio_file: uploadedAudio.path,
      url: getAudioUrl(uploadedAudio.path),
      test
    });
  } catch (err) {
    console.error('uploadListeningAudio Error:', err);
    res.status(500).json({
      error: 'AudioUploadError',
      message: err.message || 'Failed to upload listening audio.'
    });
  }
};

// ==========================================
// ASSET STORAGE UPLOAD CONTROLLER
// ==========================================
export const uploadAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'BadRequest', message: 'No file uploaded.' });
    }

    const { file } = req;
    const assetPath = `${getAssetFolder(file.mimetype)}/${getSafeFileName(file.originalname)}`;
    
    await ensureAssetBucket();

    // Upload standard buffer to Supabase storage bucket
    const { data, error } = await supabaseAdmin.storage
      .from(ASSET_BUCKET)
      .upload(assetPath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Supabase Storage Upload Error:', error);
      return res.status(500).json({
        error: 'StorageError',
        message: `${error.message || 'Failed to upload asset to storage.'} File size: ${(file.size / 1024 / 1024).toFixed(2)}MB. Bucket limit should be ${UPLOAD_MAX_SIZE_MB}MB.`
      });
    }

    // Generate public reading URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(ASSET_BUCKET)
      .getPublicUrl(data.path);

    res.status(200).json({
      message: 'Asset uploaded successfully.',
      bucket: ASSET_BUCKET,
      path: data.path,
      file_name: data.path.split('/').pop(),
      type: getAssetFolder(file.mimetype),
      url: publicUrl
    });
  } catch (err) {
    console.error('uploadAsset Exception:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: process.env.NODE_ENV === 'production'
        ? 'Failed to upload file.'
        : err.message || 'Failed to upload file.'
    });
  }
};

export const createAssetUpload = async (req, res) => {
  try {
    const { file_name, content_type, folder } = req.body;
    const contentType = String(content_type || '').trim();
    const requestedFolder = String(folder || '').trim().replace(/[^a-z0-9_-]/gi, '');

    if (!file_name || !contentType || !ALL_ASSET_MIME_TYPES.includes(contentType)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'A valid filename and supported content type are required.'
      });
    }

    await ensureAssetBucket();

    const assetFolder = requestedFolder || getAssetFolder(contentType);
    const assetPath = `${assetFolder}/${getSafeFileName(file_name)}`;
    const { data, error } = await supabaseAdmin.storage
      .from(ASSET_BUCKET)
      .createSignedUploadUrl(assetPath, { upsert: true });

    if (error) throw error;

    res.status(200).json({
      bucket: ASSET_BUCKET,
      path: assetPath,
      token: data.token,
      signed_url: data.signedUrl,
      url: getAudioUrl(assetPath)
    });
  } catch (err) {
    console.error('createAssetUpload Error:', err);
    res.status(500).json({
      error: 'AssetUploadSignError',
      message: err.message || 'Failed to prepare asset upload.'
    });
  }
};

import { Readable } from 'node:stream';
import { supabaseAdmin } from '../config/supabase.js';

const ASSET_BUCKET = 'ielts-assets';
const isAdminLike = (user) => ['admin', 'teacher'].includes(user?.role);
const hasPremiumCourseAccess = (user) => Boolean(user?.has_full_access || isAdminLike(user));
const COURSE_DEMO_MIGRATION_MESSAGE = 'Database migration required: run backend/src/config/migrations/20260726_add_course_lesson_demo_access.sql in Supabase, then reload the API schema cache.';
const COURSE_CONTENT_MIGRATION_MESSAGE = 'Database migration required: run backend/src/config/migrations/20260730_add_course_dynamic_content.sql in Supabase, then reload the API schema cache.';

const isMissingDemoColumnError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return error?.code === 'PGRST204' || /is_demo/i.test(message) && /schema cache|column/i.test(message);
};

const isMissingContentSchemaError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return (
    error?.code === 'PGRST204' ||
    error?.code === 'PGRST205' ||
    (/learning_points|course_today_goals/i.test(message) && /schema cache|column|relation|table/i.test(message))
  );
};

const normalizeLearningPoints = (value) => {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean).slice(0, 8);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
};

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const getDriveFileId = (value) => {
  const raw = String(value || '').trim();
  const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i) || raw.match(/[?&]id=([^&]+)/i);
  return raw.includes('drive.google.com') ? driveMatch?.[1] || '' : '';
};

const getDriveDownloadUrl = (value) => {
  const raw = String(value || '').trim();
  const driveFileId = getDriveFileId(raw);
  if (driveFileId) {
    return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
  }
  return raw;
};

const getGoogleCookieHeader = (headers) => {
  const cookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : String(headers.get('set-cookie') || '').split(/,(?=\s*[^;,]+=)/);

  return cookies
    .map(cookie => cookie.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
};

const resolveGoogleDriveResponse = async (value, rangeHeader) => {
  const sourceUrl = getDriveDownloadUrl(value);
  const headers = {
    'User-Agent': 'JawaafIELTSLab/1.0',
    ...(rangeHeader ? { Range: rangeHeader } : {})
  };
  const firstResponse = await fetch(sourceUrl, { headers, redirect: 'follow' });
  const firstContentType = firstResponse.headers.get('content-type') || '';

  if (!/text\/html/i.test(firstContentType)) {
    return firstResponse;
  }

  const confirmationHtml = await firstResponse.text();
  const cookieHeader = getGoogleCookieHeader(firstResponse.headers);
  const hrefMatch = confirmationHtml.match(/href="([^"]*(?:confirm=|download_warning)[^"]*)"/i);
  const confirmMatch = confirmationHtml.match(/[?&]confirm=([0-9A-Za-z_-]+)/i);
  const driveFileId = getDriveFileId(value);
  let confirmedUrl = '';

  if (hrefMatch?.[1]) {
    const decodedHref = hrefMatch[1].replace(/&amp;/g, '&');
    confirmedUrl = decodedHref.startsWith('http')
      ? decodedHref
      : `https://drive.google.com${decodedHref.startsWith('/') ? '' : '/'}${decodedHref}`;
  } else if (confirmMatch?.[1] && driveFileId) {
    confirmedUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${driveFileId}`;
  }

  if (!confirmedUrl) {
    return firstResponse;
  }

  return fetch(confirmedUrl, {
    headers: {
      ...headers,
      ...(cookieHeader ? { Cookie: cookieHeader } : {})
    },
    redirect: 'follow'
  });
};

const getLessonThumbnailUrl = (lesson) => {
  const thumbnail = String(lesson?.thumbnail_url || '').trim();
  if (thumbnail) return thumbnail;

  const raw = String(lesson?.video_file || lesson?.video_url || '').trim();
  if (!raw) return '';

  const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i) || raw.match(/[?&]id=([^&]+)/i);
  if (raw.includes('drive.google.com') && driveMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
  }

  const youtubeMatch =
    raw.match(/youtube\.com\/watch\?v=([^&]+)/i) ||
    raw.match(/youtu\.be\/([^?&]+)/i) ||
    raw.match(/youtube\.com\/embed\/([^?&]+)/i);
  if (youtubeMatch?.[1]) return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;

  return '';
};

const getAccessibleLessonIds = async (user) => {
  if (hasPremiumCourseAccess(user)) return null;

  const { data, error } = await supabaseAdmin
    .from('course_lessons')
    .select('id, course_sections!inner(is_published)')
    .eq('is_published', true)
    .eq('is_demo', true)
    .eq('course_sections.is_published', true);

  if (error) {
    if (isMissingDemoColumnError(error)) return new Set();
    throw error;
  }
  return new Set((data || []).map(lesson => lesson.id));
};

const canAccessLesson = async (lessonId, user) => {
  if (hasPremiumCourseAccess(user)) return true;
  const accessibleLessonIds = await getAccessibleLessonIds(user);
  return accessibleLessonIds?.has(lessonId) || false;
};

const getUserFromToken = async (token) => {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(cleanToken);
  if (error || !user) return null;
  if (!user.email_confirmed_at && !user.confirmed_at) {
    return { email_verified: false };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    const metadataRole = user.app_metadata?.role || user.user_metadata?.role || 'student';
    return {
      id: user.id,
      email: user.email,
      email_verified: true,
      role: metadataRole,
      has_full_access: metadataRole === 'admin'
    };
  }

  return { ...profile, email_verified: true };
};

const sanitizeLockedLesson = (lesson) => ({
  ...lesson,
  thumbnail_url: getLessonThumbnailUrl(lesson),
  video_url: '',
  video_file: '',
  notes: '',
  resources: [],
  is_locked: true,
  is_free_preview: false
});

const buildCourseResponse = async ({ includeDrafts = false, user = null } = {}) => {
  let sectionQuery = supabaseAdmin
    .from('course_sections')
    .select('*')
    .order('order_no', { ascending: true });

  if (!includeDrafts) sectionQuery = sectionQuery.eq('is_published', true);

  const { data: sections, error: sectionError } = await sectionQuery;
  if (sectionError) throw sectionError;

  const sectionIds = (sections || []).map(section => section.id);
  let lessons = [];
  let resources = [];
  let progress = [];
  const accessibleLessonIds = user ? await getAccessibleLessonIds(user) : null;

  if (sectionIds.length > 0) {
    let lessonQuery = supabaseAdmin
      .from('course_lessons')
      .select('*')
      .in('section_id', sectionIds)
      .order('order_no', { ascending: true });

    if (!includeDrafts) lessonQuery = lessonQuery.eq('is_published', true);

    const { data: lessonList, error: lessonError } = await lessonQuery;
    if (lessonError) throw lessonError;
    lessons = lessonList || [];

    const lessonIds = lessons.map(lesson => lesson.id);
    if (lessonIds.length > 0) {
      const { data: resourceList, error: resourceError } = await supabaseAdmin
        .from('lesson_resources')
        .select('*')
        .in('lesson_id', lessonIds)
        .order('order_no', { ascending: true });

      if (resourceError) throw resourceError;
      resources = resourceList || [];

      if (user?.id) {
        const { data: progressList, error: progressError } = await supabaseAdmin
          .from('student_lesson_progress')
          .select('*')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds);

        if (progressError) throw progressError;
        progress = progressList || [];
      }
    }
  }

  const resourcesByLessonId = resources.reduce((acc, resource) => {
    acc[resource.lesson_id] = acc[resource.lesson_id] || [];
    acc[resource.lesson_id].push(resource);
    return acc;
  }, {});

  const progressByLessonId = progress.reduce((acc, item) => {
    acc[item.lesson_id] = item;
    return acc;
  }, {});

  const lessonsBySectionId = lessons.reduce((acc, lesson) => {
    const isFreePreview = accessibleLessonIds === null || accessibleLessonIds.has(lesson.id);
    const lessonPayload = {
      ...lesson,
      resources: resourcesByLessonId[lesson.id] || [],
      progress: progressByLessonId[lesson.id] || null,
      is_locked: !isFreePreview,
      is_free_preview: isFreePreview
    };

    acc[lesson.section_id] = acc[lesson.section_id] || [];
    acc[lesson.section_id].push(isFreePreview ? lessonPayload : sanitizeLockedLesson(lessonPayload));
    return acc;
  }, {});

  return (sections || []).map(section => ({
    ...section,
    lessons: lessonsBySectionId[section.id] || []
  }));
};

export const getCourseLibrary = async (req, res) => {
  try {
    const sections = await buildCourseResponse({
      includeDrafts: isAdminLike(req.user),
      user: req.user
    });

    res.status(200).json(sections);
  } catch (err) {
    console.error('getCourseLibrary Error:', err);
    res.status(500).json({ error: 'CourseLibraryError', message: 'Failed to load recorded courses.' });
  }
};

export const getCourseTodayGoals = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('course_today_goals')
      .select('*')
      .eq('is_active', true)
      .order('order_no', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingContentSchemaError(error)) return res.status(200).json([]);
      throw error;
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error('getCourseTodayGoals Error:', err);
    res.status(500).json({ error: 'TodayGoalsLoadError', message: 'Failed to load today goals.' });
  }
};

export const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { data: lesson, error } = await supabaseAdmin
      .from('course_lessons')
      .select('*, course_sections(*), lesson_resources(*)')
      .eq('id', lessonId)
      .single();

    if (error) throw error;
    if (!lesson.is_published && !isAdminLike(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'This lesson is not published yet.' });
    }
    if (!(await canAccessLesson(lessonId, req.user))) {
      return res.status(403).json({ error: 'PremiumLocked', message: 'This recorded lesson requires premium access.' });
    }

    const { data: progress } = await supabaseAdmin
      .from('student_lesson_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    res.status(200).json({ ...lesson, progress: progress || null });
  } catch (err) {
    console.error('getLessonById Error:', err);
    res.status(500).json({ error: 'LessonLoadError', message: 'Failed to load lesson.' });
  }
};

export const saveLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const watchedSeconds = Math.max(0, Number(req.body.watched_seconds || 0));
    const requestedCompleted = Boolean(req.body.completed);

    if (!(await canAccessLesson(lessonId, req.user))) {
      return res.status(403).json({ error: 'PremiumLocked', message: 'This recorded lesson requires premium access.' });
    }

    const { data: existingProgress } = await supabaseAdmin
      .from('student_lesson_progress')
      .select('completed, completed_at')
      .eq('user_id', req.user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const completed = requestedCompleted || Boolean(existingProgress?.completed);

    const payload = {
      user_id: req.user.id,
      lesson_id: lessonId,
      watched_seconds: watchedSeconds,
      completed,
      last_watched_at: new Date().toISOString(),
      completed_at: completed ? existingProgress?.completed_at || new Date().toISOString() : null
    };

    const { data, error } = await supabaseAdmin
      .from('student_lesson_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('saveLessonProgress Error:', err);
    res.status(500).json({ error: 'ProgressSaveError', message: 'Failed to save lesson progress.' });
  }
};

export const getLessonQuestions = async (req, res) => {
  try {
    const { lessonId } = req.params;
    if (!(await canAccessLesson(lessonId, req.user))) {
      return res.status(403).json({ error: 'PremiumLocked', message: 'This recorded lesson requires premium access.' });
    }

    const { data, error } = await supabaseAdmin
      .from('lesson_questions')
      .select('*, profiles:user_id(full_name, email)')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err) {
    console.error('getLessonQuestions Error:', err);
    res.status(500).json({ error: 'LessonQuestionsLoadError', message: 'Failed to load lesson questions.' });
  }
};

export const createLessonQuestion = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const questionText = String(req.body.question_text || '').trim();

    if (!(await canAccessLesson(lessonId, req.user))) {
      return res.status(403).json({ error: 'PremiumLocked', message: 'This recorded lesson requires premium access.' });
    }

    if (!questionText) {
      return res.status(400).json({ error: 'BadRequest', message: 'Question text is required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('lesson_questions')
      .insert({
        lesson_id: lessonId,
        user_id: req.user.id,
        question_text: questionText
      })
      .select('*, profiles:user_id(full_name, email)')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('createLessonQuestion Error:', err);
    res.status(500).json({ error: 'LessonQuestionCreateError', message: err.message || 'Failed to post question.' });
  }
};

export const getLessonResourceContent = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { data: resource, error } = await supabaseAdmin
      .from('lesson_resources')
      .select('*, course_lessons!inner(is_published)')
      .eq('id', resourceId)
      .single();

    if (error) throw error;
    if (!resource.course_lessons?.is_published && !isAdminLike(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'This lesson resource is not published yet.' });
    }
    if (!(await canAccessLesson(resource.lesson_id, req.user))) {
      return res.status(403).json({ error: 'PremiumLocked', message: 'This recorded lesson requires premium access.' });
    }

    let contentType = 'application/pdf';
    let buffer;

    if (resource.resource_file) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from(ASSET_BUCKET)
        .download(resource.resource_file);

      if (downloadError) throw downloadError;
      contentType = fileData.type || contentType;
      buffer = Buffer.from(await fileData.arrayBuffer());
    } else if (resource.resource_url) {
      const sourceUrl = getDriveDownloadUrl(resource.resource_url);
      const upstream = await fetch(sourceUrl, {
        headers: {
          'User-Agent': 'JawaafIELTSLab/1.0'
        }
      });

      if (!upstream.ok) {
        return res.status(502).json({ error: 'ResourceFetchError', message: 'Could not load this notes file.' });
      }

      contentType = upstream.headers.get('content-type') || contentType;
      buffer = Buffer.from(await upstream.arrayBuffer());
    } else {
      return res.status(404).json({ error: 'ResourceNotFound', message: 'This resource has no file.' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resource.title || 'notes')}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  } catch (err) {
    console.error('getLessonResourceContent Error:', err);
    res.status(500).json({ error: 'LessonResourceContentError', message: err.message || 'Failed to load notes file.' });
  }
};

export const getLessonVideoContent = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const authHeader = String(req.headers.authorization || '');
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
    const user = req.user || await getUserFromToken(bearerToken || req.query.token);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Video access requires a valid session.' });
    }
    if (user.email_verified === false) {
      return res.status(403).json({ error: 'EmailNotVerified', message: 'Please verify your email address before continuing.' });
    }

    const { data: lesson, error } = await supabaseAdmin
      .from('course_lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) throw error;
    if (!lesson.is_published && !isAdminLike(user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'This lesson is not published yet.' });
    }
    if (!(await canAccessLesson(lessonId, user))) {
      return res.status(403).json({ error: 'PremiumLocked', message: 'This recorded lesson requires premium access.' });
    }

    const sourceValue = String(lesson.video_file || lesson.video_url || '').trim();
    if (!sourceValue) {
      return res.status(404).json({ error: 'VideoNotFound', message: 'This lesson has no video file.' });
    }

    if (lesson.video_file) {
      const { data: signed, error: signedError } = await supabaseAdmin.storage
        .from(ASSET_BUCKET)
        .createSignedUrl(lesson.video_file, 300);

      if (signedError) throw signedError;
      return res.redirect(signed.signedUrl);
    }

    const upstream = getDriveFileId(sourceValue)
      ? await resolveGoogleDriveResponse(sourceValue, req.headers.range)
      : await fetch(sourceValue, {
        headers: {
          'User-Agent': 'JawaafIELTSLab/1.0',
          ...(req.headers.range ? { Range: req.headers.range } : {})
        },
        redirect: 'follow'
      });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ error: 'VideoFetchError', message: 'Could not load this lesson video.' });
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    if (/text\/html/i.test(contentType)) {
      return res.status(502).json({ error: 'VideoFetchError', message: 'Google Drive did not return a playable video stream.' });
    }

    res.status(upstream.status === 206 ? 206 : 200);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(lesson.title || 'lesson-video')}.mp4"`);
    res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=120');

    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (!upstream.body) {
      return res.status(502).json({ error: 'VideoStreamError', message: 'The video stream is empty.' });
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.error('getLessonVideoContent Error:', err);
    res.status(500).json({ error: 'LessonVideoContentError', message: err.message || 'Failed to load lesson video.' });
  }
};

export const getAdminLessonQuestions = async (req, res) => {
  try {
    const { section_id: sectionId, lesson_id: lessonId } = req.query;
    let questionQuery = supabaseAdmin
      .from('lesson_questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (lessonId) {
      questionQuery = questionQuery.eq('lesson_id', lessonId);
    }

    const { data: questionRows, error } = await questionQuery;
    if (error) throw error;

    const questions = questionRows || [];
    const lessonIds = [...new Set(questions.map(question => question.lesson_id).filter(Boolean))];
    const userIds = [...new Set(questions.flatMap(question => [question.user_id, question.answered_by]).filter(Boolean))];

    const [{ data: lessons }, { data: profiles }] = await Promise.all([
      lessonIds.length
        ? supabaseAdmin.from('course_lessons').select('id, title, section_id, course_sections(title, slug)').in('id', lessonIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabaseAdmin.from('profiles').select('id, full_name, email, role').in('id', userIds)
        : Promise.resolve({ data: [] })
    ]);

    const lessonsById = (lessons || []).reduce((acc, lesson) => {
      acc[lesson.id] = lesson;
      return acc;
    }, {});
    const profilesById = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    const enriched = questions
      .filter(question => !sectionId || lessonsById[question.lesson_id]?.section_id === sectionId)
      .map(question => ({
        ...question,
        lesson: lessonsById[question.lesson_id] || null,
        student: profilesById[question.user_id] || null,
        answered_by_profile: profilesById[question.answered_by] || null
      }));

    res.status(200).json(enriched);
  } catch (err) {
    console.error('getAdminLessonQuestions Error:', err);
    res.status(500).json({ error: 'AdminLessonQuestionsLoadError', message: 'Failed to load student Q&A.' });
  }
};

export const answerLessonQuestion = async (req, res) => {
  try {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only teachers can reply to lesson questions.' });
    }

    const { questionId } = req.params;
    const answerText = String(req.body.answer_text || '').trim();

    if (!answerText) {
      return res.status(400).json({ error: 'BadRequest', message: 'Reply text is required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('lesson_questions')
      .update({
        answer_text: answerText,
        answered_by: req.user.id,
        answered_at: new Date().toISOString()
      })
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('answerLessonQuestion Error:', err);
    res.status(500).json({ error: 'LessonQuestionAnswerError', message: err.message || 'Failed to save reply.' });
  }
};

export const getAdminCourseLibrary = async (req, res) => {
  try {
    const sections = await buildCourseResponse({ includeDrafts: true });
    res.status(200).json(sections);
  } catch (err) {
    console.error('getAdminCourseLibrary Error:', err);
    res.status(500).json({ error: 'AdminCourseLoadError', message: 'Failed to load course manager.' });
  }
};

export const createCourseSection = async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'BadRequest', message: 'Section title is required.' });

    const payload = {
      title,
      slug: slugify(req.body.slug || title),
      description: req.body.description || '',
      order_no: Number(req.body.order_no || 1),
      is_published: req.body.is_published !== false
    };

    const { data, error } = await supabaseAdmin.from('course_sections').insert(payload).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('createCourseSection Error:', err);
    res.status(500).json({ error: 'CourseSectionCreateError', message: err.message || 'Failed to create course section.' });
  }
};

export const updateCourseSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const payload = {
      ...req.body,
      updated_at: new Date().toISOString()
    };
    if (payload.title && !payload.slug) payload.slug = slugify(payload.title);

    const { data, error } = await supabaseAdmin
      .from('course_sections')
      .update(payload)
      .eq('id', sectionId)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('updateCourseSection Error:', err);
    res.status(500).json({ error: 'CourseSectionUpdateError', message: err.message || 'Failed to update course section.' });
  }
};

export const createCourseLesson = async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title || !req.body.section_id) {
      return res.status(400).json({ error: 'BadRequest', message: 'Lesson title and section are required.' });
    }

    const payload = {
      section_id: req.body.section_id,
      title,
      description: req.body.description || '',
      video_url: req.body.video_url || '',
      video_file: req.body.video_file || '',
      thumbnail_url: req.body.thumbnail_url || '',
      notes: req.body.notes || '',
      learning_points: normalizeLearningPoints(req.body.learning_points),
      duration_minutes: Number(req.body.duration_minutes || 0),
      order_no: Number(req.body.order_no || 1),
      is_demo: Boolean(req.body.is_demo),
      is_published: Boolean(req.body.is_published)
    };

    const { data, error } = await supabaseAdmin.from('course_lessons').insert(payload).select().single();
    if (isMissingDemoColumnError(error)) {
      return res.status(409).json({ error: 'MigrationRequired', message: COURSE_DEMO_MIGRATION_MESSAGE });
    }
    if (isMissingContentSchemaError(error)) {
      return res.status(409).json({ error: 'MigrationRequired', message: COURSE_CONTENT_MIGRATION_MESSAGE });
    }
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('createCourseLesson Error:', err);
    res.status(500).json({ error: 'CourseLessonCreateError', message: err.message || 'Failed to create lesson.' });
  }
};

export const updateCourseLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const payload = {
      ...req.body,
      updated_at: new Date().toISOString()
    };
    if ('learning_points' in payload) {
      payload.learning_points = normalizeLearningPoints(payload.learning_points);
    }

    const { data, error } = await supabaseAdmin
      .from('course_lessons')
      .update(payload)
      .eq('id', lessonId)
      .select()
      .single();

    if (isMissingDemoColumnError(error)) {
      return res.status(409).json({ error: 'MigrationRequired', message: COURSE_DEMO_MIGRATION_MESSAGE });
    }
    if (isMissingContentSchemaError(error)) {
      return res.status(409).json({ error: 'MigrationRequired', message: COURSE_CONTENT_MIGRATION_MESSAGE });
    }
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('updateCourseLesson Error:', err);
    res.status(500).json({ error: 'CourseLessonUpdateError', message: err.message || 'Failed to update lesson.' });
  }
};

export const getAdminTodayGoals = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('course_today_goals')
      .select('*')
      .order('order_no', { ascending: true })
      .order('created_at', { ascending: true });

    if (isMissingContentSchemaError(error)) {
      return res.status(409).json({ error: 'MigrationRequired', message: COURSE_CONTENT_MIGRATION_MESSAGE });
    }
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err) {
    console.error('getAdminTodayGoals Error:', err);
    res.status(500).json({ error: 'TodayGoalsLoadError', message: err.message || 'Failed to load today goals.' });
  }
};

export const createTodayGoal = async (req, res) => {
  try {
    const goalText = String(req.body.goal_text || '').trim();
    if (!goalText) {
      return res.status(400).json({ error: 'BadRequest', message: 'Goal text is required.' });
    }

    const payload = {
      title: String(req.body.title || "Today's Goal").trim() || "Today's Goal",
      goal_text: goalText,
      tip_text: String(req.body.tip_text || '').trim(),
      section_slug: String(req.body.section_slug || '').trim() || null,
      order_no: Number(req.body.order_no || 1),
      is_active: req.body.is_active !== false
    };

    const { data, error } = await supabaseAdmin.from('course_today_goals').insert(payload).select().single();
    if (isMissingContentSchemaError(error)) {
      return res.status(409).json({ error: 'MigrationRequired', message: COURSE_CONTENT_MIGRATION_MESSAGE });
    }
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('createTodayGoal Error:', err);
    res.status(500).json({ error: 'TodayGoalCreateError', message: err.message || 'Failed to create today goal.' });
  }
};

export const updateTodayGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const payload = {
      title: String(req.body.title || "Today's Goal").trim() || "Today's Goal",
      goal_text: String(req.body.goal_text || '').trim(),
      tip_text: String(req.body.tip_text || '').trim(),
      section_slug: String(req.body.section_slug || '').trim() || null,
      order_no: Number(req.body.order_no || 1),
      is_active: Boolean(req.body.is_active),
      updated_at: new Date().toISOString()
    };

    if (!payload.goal_text) {
      return res.status(400).json({ error: 'BadRequest', message: 'Goal text is required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('course_today_goals')
      .update(payload)
      .eq('id', goalId)
      .select()
      .single();

    if (isMissingContentSchemaError(error)) {
      return res.status(409).json({ error: 'MigrationRequired', message: COURSE_CONTENT_MIGRATION_MESSAGE });
    }
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('updateTodayGoal Error:', err);
    res.status(500).json({ error: 'TodayGoalUpdateError', message: err.message || 'Failed to update today goal.' });
  }
};

export const deleteTodayGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { error } = await supabaseAdmin.from('course_today_goals').delete().eq('id', goalId);
    if (isMissingContentSchemaError(error)) {
      return res.status(409).json({ error: 'MigrationRequired', message: COURSE_CONTENT_MIGRATION_MESSAGE });
    }
    if (error) throw error;
    res.status(200).json({ message: 'Today goal deleted.' });
  } catch (err) {
    console.error('deleteTodayGoal Error:', err);
    res.status(500).json({ error: 'TodayGoalDeleteError', message: err.message || 'Failed to delete today goal.' });
  }
};

export const deleteCourseLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { error } = await supabaseAdmin.from('course_lessons').delete().eq('id', lessonId);
    if (error) throw error;
    res.status(200).json({ message: 'Lesson deleted.' });
  } catch (err) {
    console.error('deleteCourseLesson Error:', err);
    res.status(500).json({ error: 'CourseLessonDeleteError', message: 'Failed to delete lesson.' });
  }
};

export const createLessonResource = async (req, res) => {
  try {
    if (!req.body.lesson_id || !req.body.title) {
      return res.status(400).json({ error: 'BadRequest', message: 'Lesson and resource title are required.' });
    }

    const payload = {
      lesson_id: req.body.lesson_id,
      title: req.body.title,
      resource_url: req.body.resource_url || '',
      resource_file: req.body.resource_file || '',
      order_no: Number(req.body.order_no || 1)
    };

    const { data, error } = await supabaseAdmin.from('lesson_resources').insert(payload).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('createLessonResource Error:', err);
    res.status(500).json({ error: 'LessonResourceCreateError', message: err.message || 'Failed to create resource.' });
  }
};

export const deleteLessonResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { error } = await supabaseAdmin.from('lesson_resources').delete().eq('id', resourceId);
    if (error) throw error;
    res.status(200).json({ message: 'Resource deleted.' });
  } catch (err) {
    console.error('deleteLessonResource Error:', err);
    res.status(500).json({ error: 'LessonResourceDeleteError', message: 'Failed to delete resource.' });
  }
};

export const getLearningProgressReport = async (req, res) => {
  try {
    const { data: progressRows, error } = await supabaseAdmin
      .from('student_lesson_progress')
      .select('*')
      .order('last_watched_at', { ascending: false });

    if (error) throw error;

    const rows = progressRows || [];
    const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
    const lessonIds = [...new Set(rows.map(row => row.lesson_id).filter(Boolean))];

    const [{ data: profiles = [] }, { data: lessons = [] }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from('profiles').select('id, full_name, email').in('id', userIds)
        : Promise.resolve({ data: [] }),
      lessonIds.length
        ? supabaseAdmin
            .from('course_lessons')
            .select('id, title, section_id, course_sections(title)')
            .in('id', lessonIds)
        : Promise.resolve({ data: [] })
    ]);

    const profileById = new Map(profiles.map(profile => [profile.id, profile]));
    const lessonById = new Map(lessons.map(lesson => [lesson.id, lesson]));

    res.status(200).json(rows.map(row => ({
      ...row,
      profile: profileById.get(row.user_id) || null,
      lesson: lessonById.get(row.lesson_id) || null
    })));
  } catch (err) {
    console.error('getLearningProgressReport Error:', err);
    res.status(500).json({ error: 'LearningProgressReportError', message: 'Failed to load learning progress.' });
  }
};

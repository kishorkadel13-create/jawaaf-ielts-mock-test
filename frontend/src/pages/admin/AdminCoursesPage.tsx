import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Headphones,
  Loader2,
  MessageCircle,
  Mic,
  PenLine,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  Video,
  X
} from 'lucide-react';
import JawaafLogo from '../../components/JawaafLogo';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';

type LessonResource = {
  id: string;
  title: string;
  resource_url?: string;
  resource_file?: string;
};

type CourseLesson = {
  id: string;
  section_id: string;
  title: string;
  description?: string;
  video_url?: string;
  video_file?: string;
  thumbnail_url?: string;
  notes?: string;
  duration_minutes?: number;
  order_no: number;
  is_demo: boolean;
  is_published: boolean;
  resources?: LessonResource[];
};

type Course = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  order_no: number;
  is_published: boolean;
  lessons: CourseLesson[];
};

type LessonQuestion = {
  id: string;
  lesson_id: string;
  question_text: string;
  answer_text?: string;
  created_at?: string;
  answered_at?: string;
  student?: { full_name?: string; email?: string } | null;
  lesson?: { title?: string; course_sections?: { title?: string } } | null;
};

const emptyCourse = {
  title: '',
  slug: '',
  description: '',
  order_no: 1,
  is_published: true
};

const emptyLesson = {
  title: '',
  description: '',
  video_url: '',
  video_file: '',
  thumbnail_url: '',
  notes: '',
  duration_minutes: 0,
  order_no: 1,
  is_demo: false,
  is_published: false
};

const courseIcon = (slug: string) => {
  if (slug.includes('listening')) return Headphones;
  if (slug.includes('writing')) return PenLine;
  if (slug.includes('speaking')) return Mic;
  return BookOpen;
};

const courseColor = (slug: string) => {
  if (slug.includes('listening')) return 'bg-emerald-500';
  if (slug.includes('writing')) return 'bg-violet-500';
  if (slug.includes('speaking')) return 'bg-orange-500';
  return 'bg-blue-600';
};

const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.error === 'MigrationRequired' || /is_demo.*schema cache|schema cache.*is_demo/i.test(`${err?.response?.data?.message || ''} ${err?.message || ''}`)
    ? 'Database migration required for lesson demo access. Run backend/src/config/migrations/20260726_add_course_lesson_demo_access.sql in Supabase, then reload the API schema cache.'
    : err?.response?.data?.message || err?.message || err?.details || fallback;

const formatAdminDuration = (minutes?: number) => {
  const safeMinutes = Number(minutes || 0);
  if (!Number.isFinite(safeMinutes) || safeMinutes <= 0) return 'Duration pending';
  return `${safeMinutes} min`;
};

export default function AdminCoursesPage() {
  const { profile } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState('');
  const [activeLessonId, setActiveLessonId] = useState('');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState<any>(emptyCourse);
  const [lessonForm, setLessonForm] = useState<any>(emptyLesson);
  const [resourceForm, setResourceForm] = useState({ title: '', resource_url: '' });
  const [lessonQuestions, setLessonQuestions] = useState<LessonQuestion[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingReplyId, setSavingReplyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const visibleCourses = useMemo(() => {
    const hasSplitWriting = courses.some(course => course.slug === 'writing-task-1' || course.slug === 'writing-task-2');
    return hasSplitWriting ? courses.filter(course => course.slug !== 'writing') : courses;
  }, [courses]);

  const activeCourse = useMemo(
    () => visibleCourses.find(course => course.id === activeCourseId) || null,
    [activeCourseId, visibleCourses]
  );

  const activeLesson = useMemo(
    () => activeCourse?.lessons?.find(lesson => lesson.id === activeLessonId) || null,
    [activeLessonId, activeCourse]
  );
  const isTeacher = profile?.role === 'teacher';

  const loadCourses = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/courses');
      setCourses(data || []);
    } finally {
      setLoading(false);
    }
  };

  const loadLessonQuestions = async (courseId = activeCourseId) => {
    if (!courseId) {
      setLessonQuestions([]);
      return;
    }
    const { data } = await api.get(`/admin/lesson-questions?section_id=${courseId}`).catch(() => ({ data: [] }));
    setLessonQuestions(data || []);
    setReplyDrafts((data || []).reduce((acc: Record<string, string>, question: LessonQuestion) => {
      acc[question.id] = question.answer_text || '';
      return acc;
    }, {}));
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadLessonQuestions(activeCourseId);
  }, [activeCourseId]);

  useEffect(() => {
    if (activeLesson) {
      setLessonForm({
        title: activeLesson.title || '',
        description: activeLesson.description || '',
        video_url: activeLesson.video_url || '',
        video_file: activeLesson.video_file || '',
        thumbnail_url: activeLesson.thumbnail_url || '',
        notes: activeLesson.notes || '',
        duration_minutes: activeLesson.duration_minutes || 0,
        order_no: activeLesson.order_no || 1,
        is_demo: Boolean(activeLesson.is_demo),
        is_published: Boolean(activeLesson.is_published)
      });
      return;
    }

    setLessonForm({
      ...emptyLesson,
      section_id: activeCourse?.id,
      order_no: (activeCourse?.lessons?.length || 0) + 1
    });
  }, [activeLesson, activeCourse]);

  const startCreateCourse = () => {
    setCourseForm({
      ...emptyCourse,
      order_no: visibleCourses.length + 1
    });
    setShowCourseForm(true);
  };

  const editCourse = (course: Course) => {
    setCourseForm({
      title: course.title,
      slug: course.slug,
      description: course.description || '',
      order_no: course.order_no || 1,
      is_published: Boolean(course.is_published),
      id: course.id
    });
    setShowCourseForm(true);
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim()) {
      alert('Course title is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: courseForm.title,
        slug: courseForm.slug,
        description: courseForm.description,
        order_no: Number(courseForm.order_no || 1),
        is_published: Boolean(courseForm.is_published)
      };

      if (courseForm.id) {
        await api.put(`/admin/course-sections/${courseForm.id}`, payload);
      } else {
        await api.post('/admin/course-sections', payload);
      }

      setShowCourseForm(false);
      await loadCourses();
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to save course.'));
    } finally {
      setSaving(false);
    }
  };

  const signedUpload = async (file: File, folder: 'videos' | 'resources') => {
    const { data } = await api.post('/admin/assets/sign', {
      file_name: file.name,
      content_type: file.type || 'application/octet-stream',
      folder
    });

    const { error } = await supabase.storage
      .from(data.bucket)
      .uploadToSignedUrl(data.path, data.token, file, {
        contentType: file.type || 'application/octet-stream'
      });

    if (error) throw error;
    return data.path;
  };

  const handleVideoUpload = async (file?: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      const path = await signedUpload(file, 'videos');
      setLessonForm((form: any) => ({ ...form, video_file: path, video_url: '' }));
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to upload video.'));
    } finally {
      setUploading(false);
    }
  };

  const saveLesson = async () => {
    if (!activeCourse?.id) {
      alert('Open a course before adding lessons.');
      return;
    }
    if (!lessonForm.title.trim()) {
      alert('Lesson title is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...lessonForm,
        section_id: activeCourse.id,
        duration_minutes: Number(lessonForm.duration_minutes || 0),
        order_no: Number(lessonForm.order_no || 1),
        is_demo: Boolean(lessonForm.is_demo),
        is_published: Boolean(lessonForm.is_published)
      };

      if (activeLesson) {
        await api.put(`/admin/course-lessons/${activeLesson.id}`, payload);
      } else {
        const { data } = await api.post('/admin/course-lessons', payload);
        setActiveLessonId(data.id);
      }

      await loadCourses();
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to save lesson.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteLesson = async () => {
    if (!activeLesson || !confirm('Delete this lesson?')) return;
    await api.delete(`/admin/course-lessons/${activeLesson.id}`);
    setActiveLessonId('');
    await loadCourses();
  };

  const addResource = async (file?: File | null) => {
    if (!activeLesson) {
      alert('Save the lesson before adding resources.');
      return;
    }
    if (!file && !resourceForm.resource_url.trim()) {
      alert('Paste a notes/resource Drive URL first, or upload a file.');
      return;
    }

    try {
      setUploading(true);
      const resourceFile = file ? await signedUpload(file, 'resources') : '';
      const title = resourceForm.title || file?.name || 'Lesson resource';
      await api.post('/admin/lesson-resources', {
        lesson_id: activeLesson.id,
        title,
        resource_url: file ? '' : resourceForm.resource_url,
        resource_file: resourceFile,
        order_no: (activeLesson.resources?.length || 0) + 1
      });
      setResourceForm({ title: '', resource_url: '' });
      await loadCourses();
      setActiveLessonId(activeLesson.id);
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to add resource.'));
    } finally {
      setUploading(false);
    }
  };

  const deleteResource = async (resourceId: string) => {
    await api.delete(`/admin/lesson-resources/${resourceId}`);
    await loadCourses();
  };

  const saveQuestionReply = async (questionId: string) => {
    const answerText = (replyDrafts[questionId] || '').trim();
    if (!answerText) {
      alert('Write a reply before saving.');
      return;
    }

    try {
      setSavingReplyId(questionId);
      await api.put(`/admin/lesson-questions/${questionId}`, { answer_text: answerText });
      await loadLessonQuestions();
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to save reply.'));
    } finally {
      setSavingReplyId('');
    }
  };

  if (activeCourse) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <header className="h-[78px] border-b border-slate-200 bg-white px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={() => { setActiveCourseId(''); setActiveLessonId(''); }} className="text-slate-500 hover:text-[#294b77]">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className={`grid h-10 w-10 place-items-center rounded-xl text-white ${courseColor(activeCourse.slug)}`}>
              {React.createElement(courseIcon(activeCourse.slug), { className: 'h-5 w-5' })}
            </div>
            <div>
              <h1 className="text-[22px] font-black">{activeCourse.title} Course</h1>
              <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400">{activeCourse.lessons?.length || 0} recorded lessons</p>
            </div>
          </div>
          <button onClick={() => setActiveLessonId('')} className="rounded-xl bg-[#294b77] px-4 py-3 text-[13px] font-black text-white">
            <Plus className="mr-1 inline h-4 w-4" /> Add Lesson
          </button>
        </header>

        <main className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_520px] lg:p-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-black">Lessons</h2>
                <p className="text-[12px] font-semibold text-slate-400">Direct lessons inside this course. No modules.</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Lesson</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Access</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeCourse.lessons?.length ? activeCourse.lessons.map((lesson, index) => (
                    <tr key={lesson.id} className={activeLesson?.id === lesson.id ? 'bg-[#EFF4FB]' : 'bg-white'}>
                      <td className="px-4 py-4 font-black text-[#05162E]">
                        {index + 1}. {lesson.title}
                        {lesson.video_url && <span className="ml-2 rounded-md bg-blue-50 px-2 py-1 text-[10px] text-blue-600">Drive/URL</span>}
                        {lesson.video_file && <span className="ml-2 rounded-md bg-emerald-50 px-2 py-1 text-[10px] text-emerald-600">Uploaded</span>}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-500">{formatAdminDuration(lesson.duration_minutes)}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg px-3 py-1 text-[11px] font-black ${lesson.is_demo ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}`}>
                          {lesson.is_demo ? 'Free Demo' : 'Premium'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg px-3 py-1 text-[11px] font-black ${lesson.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {lesson.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => setActiveLessonId(lesson.id)} className="rounded-lg p-2 text-[#294b77] hover:bg-[#EFF4FB]" title="Edit lesson">
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-14 text-center text-[14px] font-bold text-slate-400">
                        No lessons yet. Click Add Lesson to paste a Drive link or upload a video.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {isTeacher && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-[18px] font-black">
                    <MessageCircle className="h-5 w-5 text-[#294b77]" /> Student Q&amp;A
                  </h2>
                  <p className="text-[12px] font-semibold text-slate-400">Reply to questions students ask inside lesson videos.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#294b77] ring-1 ring-slate-200">
                  {lessonQuestions.filter(question => !question.answer_text).length} unanswered
                </span>
              </div>

              <div className="grid gap-3">
                {lessonQuestions.length ? lessonQuestions.map(question => (
                  <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-black uppercase tracking-wider text-slate-400">{question.lesson?.title || 'Lesson question'}</p>
                        <h3 className="mt-1 text-[14px] font-black">{question.student?.full_name || question.student?.email || 'Student'}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black ${question.answer_text ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}`}>
                        {question.answer_text ? 'Answered' : 'Needs reply'}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[13px] font-semibold leading-6 text-slate-600">{question.question_text}</p>
                    <textarea
                      value={replyDrafts[question.id] || ''}
                      onChange={event => setReplyDrafts(drafts => ({ ...drafts, [question.id]: event.target.value }))}
                      placeholder="Write teacher response..."
                      className="mt-3 min-h-[92px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold outline-none focus:border-[#294b77]"
                    />
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => saveQuestionReply(question.id)} disabled={savingReplyId === question.id} className="rounded-xl bg-[#294b77] px-4 py-2.5 text-[12px] font-black text-white disabled:opacity-60">
                        {savingReplyId === question.id ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Send className="mr-1 inline h-4 w-4" />}
                        Save Reply
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-[14px] font-bold text-slate-500">No student questions yet for this course.</p>
                  </div>
                )}
              </div>
            </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-black">{activeLesson ? 'Edit Lesson' : 'Add Lesson'}</h2>
                <p className="text-[12px] font-semibold text-slate-400">Paste Google Drive link or upload video</p>
              </div>
              {activeLesson && (
                <button onClick={deleteLesson} className="rounded-xl bg-rose-50 px-3 py-2 text-[12px] font-black text-rose-600">
                  <Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete
                </button>
              )}
            </div>

            <div className="grid gap-4">
              <input value={lessonForm.title} onChange={event => setLessonForm({ ...lessonForm, title: event.target.value })} placeholder="Lesson title" className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />

              <textarea value={lessonForm.description} onChange={event => setLessonForm({ ...lessonForm, description: event.target.value })} placeholder="Lesson description" className="min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />

              <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                <div className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-wider text-slate-500">
                  <Video className="h-4 w-4" /> Video
                </div>
                <div className="grid gap-3">
                  <input value={lessonForm.video_url} onChange={event => setLessonForm({ ...lessonForm, video_url: event.target.value, video_file: '' })} placeholder="Paste Google Drive share link here" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />
                  <label className={`rounded-xl px-4 py-3 text-center text-[13px] font-black text-white ${uploading ? 'bg-slate-400' : 'bg-[#294b77] cursor-pointer'}`}>
                    {uploading ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Upload className="mr-1 inline h-4 w-4" />}
                    Upload Video File
                    <input className="hidden" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" disabled={uploading} onChange={event => handleVideoUpload(event.target.files?.[0])} />
                  </label>
                </div>
                <p className="mt-2 text-[12px] font-bold leading-5 text-slate-500">For Google Drive, set sharing to anyone with the link can view. Students will watch it inside the course player.</p>
                {lessonForm.video_file && <p className="mt-2 truncate text-[12px] font-bold text-emerald-600"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> {lessonForm.video_file}</p>}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <label className="mb-2 block text-[13px] font-black uppercase tracking-wider text-slate-500">Thumbnail</label>
                <input value={lessonForm.thumbnail_url} onChange={event => setLessonForm({ ...lessonForm, thumbnail_url: event.target.value })} placeholder="Thumbnail image URL optional. Empty uses Drive/YouTube thumbnail when possible." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />
                {lessonForm.thumbnail_url && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={lessonForm.thumbnail_url} alt="Lesson thumbnail preview" className="aspect-video w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                <label className="grid min-w-0 gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Duration (minutes)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={lessonForm.duration_minutes}
                    onChange={event => setLessonForm({ ...lessonForm, duration_minutes: event.target.value })}
                    placeholder="e.g. 26"
                    className="rounded-xl border border-slate-200 px-4 py-3 text-[15px] font-black outline-none focus:border-[#294b77]"
                  />
                  <span className="text-[11px] font-bold leading-5 text-slate-500">Drive videos cannot auto-detect time. Enter the exact lesson length here.</span>
                </label>
                <label className="grid min-w-0 gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Order</span>
                  <input
                    type="number"
                    min="1"
                    value={lessonForm.order_no}
                    onChange={event => setLessonForm({ ...lessonForm, order_no: event.target.value })}
                    placeholder="Order"
                    className="rounded-xl border border-slate-200 px-4 py-3 text-[15px] font-black outline-none focus:border-[#294b77]"
                  />
                </label>
                <label className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-4 text-[13px] font-black">
                  <input type="checkbox" checked={lessonForm.is_published} onChange={event => setLessonForm({ ...lessonForm, is_published: event.target.checked })} />
                  Published
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-black uppercase tracking-wider text-slate-500">Student Access</p>
                    <p className="mt-1 text-[12px] font-bold text-slate-500">
                      Demo lessons open for all users. Premium lessons show with a lock until premium access is active.
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${lessonForm.is_demo ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}`}>
                    {lessonForm.is_demo ? 'Free Demo' : 'Premium'}
                  </span>
                </div>
                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setLessonForm({ ...lessonForm, is_demo: true })}
                    className={`rounded-lg px-4 py-3 text-[13px] font-black transition-colors ${lessonForm.is_demo ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
                  >
                    Free Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => setLessonForm({ ...lessonForm, is_demo: false })}
                    className={`rounded-lg px-4 py-3 text-[13px] font-black transition-colors ${!lessonForm.is_demo ? 'bg-[#294b77] text-white' : 'text-slate-500 hover:bg-[#EFF4FB] hover:text-[#294b77]'}`}
                  >
                    Premium Locked
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <label className="mb-2 block text-[13px] font-black uppercase tracking-wider text-slate-500">Written Notes</label>
                <textarea value={lessonForm.notes} onChange={event => setLessonForm({ ...lessonForm, notes: event.target.value })} placeholder="Write notes here. These appear in the student's Notes tab after Save Lesson." className="min-h-[140px] w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />
                <p className="mt-2 text-[12px] font-bold text-slate-500">Click Save Lesson after editing written notes.</p>
              </div>

              <button onClick={saveLesson} disabled={saving} className="rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white disabled:opacity-60">
                {saving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Save className="mr-2 inline h-4 w-4" />}
                Save Lesson
              </button>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-wider text-slate-500">
                  <FileText className="h-4 w-4" /> Notes Attachments
                </div>
                <div className="grid gap-2 md:grid-cols-[150px_1fr_auto_auto]">
                  <input value={resourceForm.title} onChange={event => setResourceForm({ ...resourceForm, title: event.target.value })} placeholder="Notes title" className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold outline-none" />
                  <input value={resourceForm.resource_url} onChange={event => setResourceForm({ ...resourceForm, resource_url: event.target.value })} placeholder="Paste Drive notes/PDF URL" className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold outline-none" />
                  <button onClick={() => addResource()} disabled={!activeLesson || !resourceForm.resource_url.trim()} className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-black text-[#294b77] disabled:cursor-not-allowed disabled:opacity-50">Add URL</button>
                  <label className="rounded-xl bg-[#294b77] px-3 py-2 text-center text-[12px] font-black text-white cursor-pointer">
                    Upload
                    <input className="hidden" type="file" onChange={event => addResource(event.target.files?.[0])} />
                  </label>
                </div>
                <p className="mt-2 text-[12px] font-bold text-slate-500">Save the lesson first, then add Drive notes or uploaded files. These appear under the student's Notes tab.</p>
                <div className="mt-3 grid gap-2">
                  {activeLesson?.resources?.map(resource => (
                    <div key={resource.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span className="text-[13px] font-bold">{resource.title}</span>
                      <button onClick={() => deleteResource(resource.id)} className="text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <header className="h-[78px] border-b border-slate-200 bg-white px-6 lg:px-10 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link to="/admin" className="text-slate-500 hover:text-[#294b77]"><ArrowLeft className="h-5 w-5" /></Link>
          <JawaafLogo className="h-9 w-auto" />
          <div>
            <h1 className="text-[22px] font-black">Recorded Video Courses</h1>
            <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Create courses, then add Drive video lessons</p>
          </div>
        </div>
        <button onClick={startCreateCourse} className="rounded-xl bg-[#294b77] px-4 py-3 text-[13px] font-black text-white">
          <Plus className="mr-1 inline h-4 w-4" /> Create Course
        </button>
      </header>

      <main className="p-5 lg:p-8">
        {showCourseForm && (
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-black">{courseForm.id ? 'Edit Course' : 'Create Course'}</h2>
              <button onClick={() => setShowCourseForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_140px_140px]">
              <input value={courseForm.title} onChange={event => setCourseForm({ ...courseForm, title: event.target.value })} placeholder="Course title, e.g. Reading" className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
              <input value={courseForm.slug} onChange={event => setCourseForm({ ...courseForm, slug: event.target.value })} placeholder="slug optional" className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
              <input type="number" value={courseForm.order_no} onChange={event => setCourseForm({ ...courseForm, order_no: event.target.value })} placeholder="Order" className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
              <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-black">
                <input type="checkbox" checked={courseForm.is_published} onChange={event => setCourseForm({ ...courseForm, is_published: event.target.checked })} />
                Published
              </label>
            </div>
            <textarea value={courseForm.description} onChange={event => setCourseForm({ ...courseForm, description: event.target.value })} placeholder="Course description" className="mt-3 min-h-[80px] w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />
            <button onClick={saveCourse} disabled={saving} className="mt-3 rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white disabled:opacity-60">
              {saving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Save className="mr-2 inline h-4 w-4" />}
              Save Course
            </button>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-[18px] font-black">Courses</h2>
              <p className="text-[12px] font-semibold text-slate-400">Reading, Listening, Writing, Speaking, or any custom recorded course</p>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-4">Course</th>
                  <th className="px-5 py-4">Lessons</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleCourses.map(course => {
                  const Icon = courseIcon(course.slug);
                  return (
                    <tr key={course.id}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-11 w-11 place-items-center rounded-xl text-white ${courseColor(course.slug)}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-black text-[#05162E]">{course.title}</div>
                            <div className="text-[12px] font-semibold text-slate-400">{course.description || 'Recorded IELTS lessons'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-600">{course.lessons?.length || 0} lessons</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-lg px-3 py-1 text-[11px] font-black ${course.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => editCourse(course)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50" title="Edit course">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setActiveCourseId(course.id)} className="rounded-lg p-2 text-[#294b77] hover:bg-[#EFF4FB]" title="Open course">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && visibleCourses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-14 text-center text-[14px] font-bold text-slate-400">
                      No courses yet. Click Create Course to add Reading, Listening, Writing, or Speaking.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

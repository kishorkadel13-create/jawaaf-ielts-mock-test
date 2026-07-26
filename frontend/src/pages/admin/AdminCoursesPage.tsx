import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, FileText, Loader2, Plus, Save, Trash2, Upload, Video } from 'lucide-react';
import JawaafLogo from '../../components/JawaafLogo';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';

type CourseSection = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  order_no: number;
  is_published: boolean;
  lessons: CourseLesson[];
};

type CourseLesson = {
  id: string;
  section_id: string;
  title: string;
  description?: string;
  video_url?: string;
  video_file?: string;
  notes?: string;
  duration_minutes?: number;
  order_no: number;
  is_published: boolean;
  resources?: LessonResource[];
};

type LessonResource = {
  id: string;
  title: string;
  resource_url?: string;
  resource_file?: string;
};

const emptyLesson = {
  title: '',
  description: '',
  video_url: '',
  video_file: '',
  notes: '',
  duration_minutes: 0,
  order_no: 1,
  is_published: false
};

export default function AdminCoursesPage() {
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [activeLessonId, setActiveLessonId] = useState('');
  const [lessonForm, setLessonForm] = useState<any>(emptyLesson);
  const [resourceForm, setResourceForm] = useState({ title: '', resource_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const activeSection = useMemo(
    () => sections.find(section => section.id === activeSectionId) || sections[0],
    [activeSectionId, sections]
  );
  const activeLesson = useMemo(
    () => activeSection?.lessons?.find(lesson => lesson.id === activeLessonId) || null,
    [activeLessonId, activeSection]
  );

  const loadCourses = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/courses');
      setSections(data || []);
      if (!activeSectionId && data?.[0]?.id) setActiveSectionId(data[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (activeLesson) {
      setLessonForm({
        title: activeLesson.title || '',
        description: activeLesson.description || '',
        video_url: activeLesson.video_url || '',
        video_file: activeLesson.video_file || '',
        notes: activeLesson.notes || '',
        duration_minutes: activeLesson.duration_minutes || 0,
        order_no: activeLesson.order_no || 1,
        is_published: Boolean(activeLesson.is_published)
      });
    } else {
      setLessonForm({
        ...emptyLesson,
        section_id: activeSection?.id,
        order_no: (activeSection?.lessons?.length || 0) + 1
      });
    }
  }, [activeLesson, activeSection]);

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
      alert(err.message || 'Failed to upload video.');
    } finally {
      setUploading(false);
    }
  };

  const saveLesson = async () => {
    if (!activeSection?.id || !lessonForm.title.trim()) {
      alert('Lesson title is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...lessonForm,
        section_id: activeSection.id,
        duration_minutes: Number(lessonForm.duration_minutes || 0),
        order_no: Number(lessonForm.order_no || 1)
      };

      if (activeLesson) {
        await api.put(`/admin/course-lessons/${activeLesson.id}`, payload);
      } else {
        const { data } = await api.post('/admin/course-lessons', payload);
        setActiveLessonId(data.id);
      }

      await loadCourses();
    } catch (err: any) {
      alert(err.message || 'Failed to save lesson.');
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
    } catch (err: any) {
      alert(err.message || 'Failed to add resource.');
    } finally {
      setUploading(false);
    }
  };

  const deleteResource = async (resourceId: string) => {
    await api.delete(`/admin/lesson-resources/${resourceId}`);
    await loadCourses();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <header className="h-[78px] border-b border-slate-200 bg-white px-6 lg:px-10 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link to="/admin" className="text-slate-500 hover:text-[#294b77]"><ArrowLeft className="h-5 w-5" /></Link>
          <JawaafLogo className="h-9 w-auto" />
          <div>
            <h1 className="text-[22px] font-black">Recorded Course Manager</h1>
            <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400">IELTS LMS content library</p>
          </div>
        </div>
      </header>

      <main className="grid gap-5 p-5 lg:grid-cols-[260px_360px_minmax(0,1fr)] lg:p-8">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-black">Course Sections</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
          <div className="grid gap-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSectionId(section.id);
                  setActiveLessonId('');
                }}
                className={`rounded-xl px-4 py-3 text-left transition-all ${
                  activeSection?.id === section.id ? 'bg-[#294b77] text-white' : 'bg-slate-50 text-slate-600 hover:bg-[#EFF4FB]'
                }`}
              >
                <div className="font-black">{section.title}</div>
                <div className="text-[11px] font-bold opacity-70">{section.lessons?.length || 0} lessons</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-black">{activeSection?.title || 'Lessons'}</h2>
              <p className="text-[12px] font-semibold text-slate-400">Lesson list</p>
            </div>
            <button onClick={() => setActiveLessonId('')} className="rounded-xl bg-[#294b77] px-3 py-2 text-[12px] font-black text-white">
              <Plus className="mr-1 inline h-3.5 w-3.5" /> New
            </button>
          </div>

          <div className="grid gap-2">
            {activeSection?.lessons?.length ? activeSection.lessons.map(lesson => (
              <button
                key={lesson.id}
                onClick={() => setActiveLessonId(lesson.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  activeLesson?.id === lesson.id ? 'border-[#294b77] bg-[#EFF4FB]' : 'border-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black leading-snug">{lesson.title}</h3>
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${lesson.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {lesson.is_published ? 'Live' : 'Draft'}
                  </span>
                </div>
                <p className="mt-2 text-[12px] font-semibold text-slate-500">{lesson.duration_minutes || 0} min</p>
              </button>
            )) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-[13px] font-bold text-slate-400">
                No lessons yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-black">{activeLesson ? 'Edit Lesson' : 'Create Lesson'}</h2>
              <p className="text-[12px] font-semibold text-slate-400">Video, notes, resources, and publishing</p>
            </div>
            {activeLesson && (
              <button onClick={deleteLesson} className="rounded-xl bg-rose-50 px-3 py-2 text-[12px] font-black text-rose-600">
                <Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-[1fr_120px_130px]">
              <input value={lessonForm.title} onChange={event => setLessonForm({ ...lessonForm, title: event.target.value })} placeholder="Lesson title" className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
              <input type="number" value={lessonForm.duration_minutes} onChange={event => setLessonForm({ ...lessonForm, duration_minutes: event.target.value })} placeholder="Minutes" className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
              <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-black">
                <input type="checkbox" checked={lessonForm.is_published} onChange={event => setLessonForm({ ...lessonForm, is_published: event.target.checked })} />
                Published
              </label>
            </div>

            <textarea value={lessonForm.description} onChange={event => setLessonForm({ ...lessonForm, description: event.target.value })} placeholder="Lesson description" className="min-h-[80px] rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />

            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-wider text-slate-500">
                <Video className="h-4 w-4" /> Video
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input value={lessonForm.video_url} onChange={event => setLessonForm({ ...lessonForm, video_url: event.target.value, video_file: '' })} placeholder="Paste hosted video URL, or upload a file" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />
                <label className={`rounded-xl px-4 py-3 text-[13px] font-black text-white ${uploading ? 'bg-slate-400' : 'bg-[#294b77] cursor-pointer'}`}>
                  {uploading ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Upload className="mr-1 inline h-4 w-4" />}
                  Upload Video
                  <input className="hidden" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" disabled={uploading} onChange={event => handleVideoUpload(event.target.files?.[0])} />
                </label>
              </div>
              {lessonForm.video_file && <p className="mt-2 truncate text-[12px] font-bold text-emerald-600"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> {lessonForm.video_file}</p>}
            </div>

            <textarea value={lessonForm.notes} onChange={event => setLessonForm({ ...lessonForm, notes: event.target.value })} placeholder="Lesson notes for students" className="min-h-[170px] rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />

            <button onClick={saveLesson} disabled={saving} className="rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white disabled:opacity-60">
              {saving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Save className="mr-2 inline h-4 w-4" />}
              Save Lesson
            </button>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-wider text-slate-500">
                <FileText className="h-4 w-4" /> Downloadable Materials
              </div>
              <div className="grid gap-2 md:grid-cols-[190px_1fr_auto_auto]">
                <input value={resourceForm.title} onChange={event => setResourceForm({ ...resourceForm, title: event.target.value })} placeholder="Resource title" className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold outline-none" />
                <input value={resourceForm.resource_url} onChange={event => setResourceForm({ ...resourceForm, resource_url: event.target.value })} placeholder="Resource URL" className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold outline-none" />
                <button onClick={() => addResource()} className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-black text-[#294b77]">Add URL</button>
                <label className="rounded-xl bg-[#294b77] px-3 py-2 text-center text-[12px] font-black text-white cursor-pointer">
                  Upload
                  <input className="hidden" type="file" onChange={event => addResource(event.target.files?.[0])} />
                </label>
              </div>
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

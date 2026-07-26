import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, Download, FileText, Headphones, History, LogOut, Monitor, PenLine, Play, Settings, Target, User, Video } from 'lucide-react';
import JawaafLogo from '../components/JawaafLogo';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { resolveStorageUrl } from '../utils/storageUrl';

type Lesson = {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  video_file?: string;
  notes?: string;
  duration_minutes?: number;
  is_published: boolean;
  progress?: { watched_seconds: number; completed: boolean } | null;
  resources?: Array<{ id: string; title: string; resource_url?: string; resource_file?: string }>;
};

type CourseSection = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  lessons: Lesson[];
};

const sectionIcon = (slug: string) => {
  if (slug === 'listening') return Headphones;
  if (slug === 'writing') return PenLine;
  if (slug === 'speaking') return User;
  return BookOpen;
};

export default function CoursesPage() {
  const { profile, logout } = useAuthStore();
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [activeLessonId, setActiveLessonId] = useState('');
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimerRef = useRef<number | null>(null);

  const activeSection = useMemo(
    () => sections.find(section => section.id === activeSectionId) || sections[0],
    [activeSectionId, sections]
  );
  const activeLesson = useMemo(
    () => activeSection?.lessons?.find(lesson => lesson.id === activeLessonId) || activeSection?.lessons?.[0] || null,
    [activeLessonId, activeSection]
  );

  const totalLessons = sections.reduce((total, section) => total + (section.lessons?.length || 0), 0);
  const completedLessons = sections.reduce(
    (total, section) => total + (section.lessons || []).filter(lesson => lesson.progress?.completed).length,
    0
  );
  const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const loadCourses = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/courses');
      setSections(data || []);
      if (!activeSectionId && data?.[0]?.id) setActiveSectionId(data[0].id);
      if (!activeLessonId && data?.[0]?.lessons?.[0]?.id) setActiveLessonId(data[0].lessons[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (!activeLesson || !videoRef.current) return;
    const watchedSeconds = Number(activeLesson.progress?.watched_seconds || 0);
    if (watchedSeconds > 0) {
      videoRef.current.currentTime = watchedSeconds;
    }
  }, [activeLesson?.id]);

  const saveProgress = async (completed = false) => {
    if (!activeLesson || !videoRef.current) return;
    const watchedSeconds = Math.floor(videoRef.current.currentTime || activeLesson.progress?.watched_seconds || 0);
    await api.put(`/courses/lessons/${activeLesson.id}/progress`, {
      watched_seconds: watchedSeconds,
      completed
    }).catch(() => null);
    if (completed) {
      await loadCourses();
    }
  };

  const queueProgressSave = () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => saveProgress(false), 1200);
  };

  const markComplete = async () => {
    await saveProgress(true);
  };

  const videoSource = resolveStorageUrl(activeLesson?.video_file || activeLesson?.video_url, 'uploads');

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <aside className="hidden w-[290px] shrink-0 border-r border-slate-100 bg-white p-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)] lg:flex lg:flex-col">
        <Link to="/" className="mb-10 block px-2">
          <JawaafLogo className="h-10 w-auto relative left-[-15px]" />
        </Link>
        <nav className="grid gap-2 text-[16px] font-bold text-slate-500">
          <Link to="/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50"><Monitor className="h-5 w-5" /> Dashboard</Link>
          <Link to="/courses" className="flex items-center gap-3 rounded-xl bg-[#EFF4FB] px-4 py-3 text-[#294b77]"><Video className="h-5 w-5" /> Recorded Courses</Link>
          <Link to="/tests?mode=practice" className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50"><Target className="h-5 w-5" /> Practice Tests</Link>
          <Link to="/tests?mode=mock" className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50"><PenLine className="h-5 w-5" /> Full Mock Tests</Link>
          <Link to="/history" className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50"><History className="h-5 w-5" /> My Results</Link>
          <Link to="/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50"><Settings className="h-5 w-5" /> Profile</Link>
        </nav>
        <button onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-left font-bold text-slate-500 hover:bg-red-50 hover:text-red-600">
          <LogOut className="h-5 w-5" /> Logout
        </button>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="border-b border-slate-100 bg-white px-5 py-5 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[28px] font-black tracking-tight">Recorded IELTS Courses</h1>
              <p className="mt-1 text-[14px] font-semibold text-slate-500">Learn each IELTS skill, then practice inside the same platform.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-5 py-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Learning Progress</p>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#294b77]" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-[14px] font-black text-[#294b77]">{progressPercent}%</span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-5 p-5 lg:grid-cols-[260px_330px_minmax(0,1fr)] lg:p-8">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-[15px] font-black">Course Sections</h2>
            <div className="grid gap-2">
              {sections.map(section => {
                const Icon = sectionIcon(section.slug);
                const completed = section.lessons.filter(lesson => lesson.progress?.completed).length;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSectionId(section.id);
                      setActiveLessonId(section.lessons?.[0]?.id || '');
                    }}
                    className={`rounded-xl px-4 py-3 text-left transition-all ${activeSection?.id === section.id ? 'bg-[#294b77] text-white' : 'bg-slate-50 hover:bg-[#EFF4FB]'}`}
                  >
                    <div className="flex items-center gap-3 font-black"><Icon className="h-4 w-4" /> {section.title}</div>
                    <p className="mt-1 text-[11px] font-bold opacity-70">{completed}/{section.lessons.length} completed</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-[15px] font-black">{activeSection?.title || 'Lessons'}</h2>
            <div className="grid gap-2">
              {activeSection?.lessons?.length ? activeSection.lessons.map((lesson, index) => (
                <button
                  key={lesson.id}
                  onClick={() => setActiveLessonId(lesson.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${activeLesson?.id === lesson.id ? 'border-[#294b77] bg-[#EFF4FB]' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[12px] font-black text-[#294b77] ring-1 ring-slate-200">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black leading-snug">{lesson.title}</h3>
                      <p className="mt-1 flex items-center gap-2 text-[12px] font-bold text-slate-500">
                        <Clock className="h-3.5 w-3.5" /> {lesson.duration_minutes || 0} min
                        {lesson.progress?.completed && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      </p>
                    </div>
                  </div>
                </button>
              )) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-[13px] font-bold text-slate-400">
                  Lessons coming soon.
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {loading ? (
              <div className="grid min-h-[420px] place-items-center text-[14px] font-bold text-slate-400">Loading courses...</div>
            ) : activeLesson ? (
              <div className="grid gap-5">
                <div className="aspect-video overflow-hidden rounded-2xl bg-[#061A36]">
                  {videoSource ? (
                    <video
                      ref={videoRef}
                      src={videoSource}
                      controls
                      controlsList="nodownload"
                      className="h-full w-full"
                      onTimeUpdate={queueProgressSave}
                      onEnded={markComplete}
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-white">
                      <div className="text-center">
                        <Play className="mx-auto h-12 w-12 opacity-70" />
                        <p className="mt-3 text-[14px] font-bold">Video will appear here when published.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#294b77]">{activeSection?.title}</p>
                    <h2 className="mt-1 text-[26px] font-black">{activeLesson.title}</h2>
                    {activeLesson.description && <p className="mt-2 max-w-3xl text-[14px] font-semibold leading-7 text-slate-500">{activeLesson.description}</p>}
                  </div>
                  <button onClick={markComplete} className="rounded-xl bg-[#294b77] px-5 py-3 text-[13px] font-black text-white">
                    <CheckCircle2 className="mr-2 inline h-4 w-4" /> Mark Completed
                  </button>
                </div>

                {activeLesson.notes && (
                  <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-[15px] font-black"><FileText className="h-4 w-4" /> Lesson Notes</h3>
                    <div className="whitespace-pre-wrap text-[14px] font-semibold leading-7 text-slate-600">{activeLesson.notes}</div>
                  </div>
                )}

                {Boolean(activeLesson.resources?.length) && (
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="mb-3 text-[15px] font-black">Downloadable Materials</h3>
                    <div className="grid gap-2">
                      {activeLesson.resources?.map(resource => {
                        const href = resolveStorageUrl(resource.resource_file || resource.resource_url, 'uploads');
                        return (
                          <a key={resource.id} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-[13px] font-black text-[#294b77] hover:bg-[#EFF4FB]">
                            {resource.title}
                            <Download className="h-4 w-4" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid min-h-[420px] place-items-center text-center">
                <div>
                  <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
                  <h2 className="mt-3 text-[20px] font-black">Recorded lessons coming soon</h2>
                  <p className="mt-2 text-[14px] font-semibold text-slate-500">Your instructors are preparing this course library.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

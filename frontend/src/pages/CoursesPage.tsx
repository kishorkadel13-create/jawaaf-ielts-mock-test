import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Bell, BookOpen, CheckCircle2, ChevronDown, Clock, Crown, Download, FileText, Headphones, History, Lock, LogOut, MessageCircle, Monitor, PenLine, Play, Search, Send, Settings, Target, User, Video } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import StudentSidebar from '../components/StudentSidebar';
import { resolveStorageUrl } from '../utils/storageUrl';
import { getEmbeddableVideoUrl, getVideoThumbnailUrl, shouldUseVideoIframe } from '../utils/videoEmbed';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Lesson = {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  video_file?: string;
  thumbnail_url?: string;
  notes?: string;
  duration_minutes?: number;
  is_published: boolean;
  is_locked?: boolean;
  is_free_preview?: boolean;
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

type LessonQuestion = {
  id: string;
  question_text: string;
  answer_text?: string;
  created_at?: string;
  profiles?: { full_name?: string; email?: string } | null;
};

const formatLessonDuration = (seconds?: number) => {
  const safeSeconds = Number(seconds || 0);
  if (!Number.isFinite(safeSeconds) || safeSeconds <= 0) return 'Duration pending';

  const roundedSeconds = Math.round(safeSeconds);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const remainingSeconds = roundedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

const LessonThumbnail = ({ lesson, className = '' }: { lesson: Lesson; className?: string }) => {
  const [failed, setFailed] = useState(false);
  const thumbnailUrl = getVideoThumbnailUrl(lesson.video_file || lesson.video_url, lesson.thumbnail_url);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-[#061A36] text-white ${className}`}>
      {thumbnailUrl && !failed ? (
        <img
          src={thumbnailUrl}
          alt={lesson.title}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      <div className="absolute inset-0 bg-[#061A36]/10" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-black/45 text-white shadow-lg">
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </span>
      </div>
    </div>
  );
};

const NotesPdfReader = ({ title, resourceId, token }: { title: string; resourceId: string; token?: string | null }) => {
  const [pages, setPages] = useState<Array<{ pageNumber: number; src: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resourceId) return;

    let cancelled = false;
    const documentUrl = `${api.defaults.baseURL || '/api'}/courses/resources/${resourceId}/content`;

    const renderPdf = async () => {
      try {
        setLoading(true);
        setError('');
        setPages([]);
        const loadingTask = pdfjsLib.getDocument({
          url: documentUrl,
          httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        const pdf = await loadingTask.promise;
        const renderedPages = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.55 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;
          renderedPages.push({ pageNumber, src: canvas.toDataURL('image/png') });
          if (!cancelled) setPages([...renderedPages]);
        }

        await loadingTask.destroy();
      } catch (err) {
        if (!cancelled) setError('Notes could not be rendered inside the reader. Please upload a PDF file or use a public Drive PDF link.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [resourceId, token]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[12px] font-black uppercase tracking-wider text-slate-400">Viewing Notes</p>
          <h3 className="truncate text-[16px] font-black">{title}</h3>
        </div>
        {pages.length > 0 && <p className="text-[12px] font-black text-slate-400">{pages.length} pages</p>}
      </div>
      <div className="max-h-[720px] overflow-y-auto bg-[#F3F6FB] px-4 py-6">
        {loading && !pages.length && (
          <div className="grid min-h-[320px] place-items-center text-[14px] font-bold text-slate-500">Preparing notes reader...</div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-[14px] font-bold text-rose-600">{error}</div>
        )}
        <div className="mx-auto grid max-w-4xl gap-5">
          {pages.map(page => (
            <figure key={page.pageNumber} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
              <img src={page.src} alt={`${title} page ${page.pageNumber}`} className="w-full select-none bg-white" draggable={false} />
              <figcaption className="border-t border-slate-100 px-4 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">
                Page {page.pageNumber}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
};

const sectionIcon = (slug: string) => {
  if (slug === 'listening') return Headphones;
  if (slug === 'writing' || slug.startsWith('writing-task')) return PenLine;
  if (slug === 'speaking') return User;
  return BookOpen;
};

const sectionAccent = (slug: string) => {
  if (slug === 'listening') return 'bg-emerald-50 text-emerald-600';
  if (slug.startsWith('writing-task')) return 'bg-rose-50 text-rose-600';
  if (slug === 'speaking') return 'bg-amber-50 text-amber-600';
  return 'bg-[#EFF4FB] text-[#294b77]';
};

const courseColor = (slug: string) => {
  if (slug === 'listening') return 'bg-gradient-to-br from-[#0FBAA6] to-[#078D82]';
  if (slug === 'speaking') return 'bg-gradient-to-br from-[#FF9D3D] to-[#F47B2B]';
  if (slug === 'writing' || slug.startsWith('writing-task')) return 'bg-gradient-to-br from-[#9B5CF6] to-[#7C3FE4]';
  return 'bg-gradient-to-br from-[#2F80ED] to-[#1D5FD1]';
};

const recordedCoursePoster = (section: CourseSection) => {
  const key = `${section.slug} ${section.title}`.toLowerCase();
  if (key.includes('listening')) {
    return {
      image: '/images/Recorded%20Courses/listening.png',
      icon: Headphones,
      accent: 'text-[#2F8C6B]',
      border: 'border-[#CDBD8D]'
    };
  }
  if (key.includes('speaking')) {
    return {
      image: '/images/Recorded%20Courses/speaking.png',
      icon: User,
      accent: 'text-[#C64C1E]',
      border: 'border-[#D9B579]'
    };
  }
  if (key.includes('task 1') || key.includes('task-1')) {
    return {
      image: '/images/Recorded%20Courses/writing%20task%201.png',
      icon: PenLine,
      accent: 'text-[#7A2F78]',
      border: 'border-[#CDB18A]'
    };
  }
  if (key.includes('task 2') || key.includes('task-2')) {
    return {
      image: '/images/Recorded%20Courses/writing%20task%202.png',
      icon: PenLine,
      accent: 'text-[#C43D2C]',
      border: 'border-[#D8A277]'
    };
  }
  return {
    image: '/images/Recorded%20Courses/Reading.png',
    icon: BookOpen,
    accent: 'text-[#294b77]',
    border: 'border-[#C6B78B]'
  };
};

export default function CoursesPage() {
  const { profile, token } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [activeLessonId, setActiveLessonId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'qa'>(() =>
    window.location.hash === '#notes' ? 'notes' : window.location.hash === '#qa' ? 'qa' : 'overview'
  );
  const [activeResourceId, setActiveResourceId] = useState('');
  const [lessonQuestions, setLessonQuestions] = useState<LessonQuestion[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [postingQuestion, setPostingQuestion] = useState(false);
  const [detectedDurations, setDetectedDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimerRef = useRef<number | null>(null);

  const visibleSections = useMemo(() => {
    const hasSplitWriting = sections.some(section => section.slug === 'writing-task-1' || section.slug === 'writing-task-2');
    return hasSplitWriting ? sections.filter(section => section.slug !== 'writing') : sections;
  }, [sections]);

  const activeSection = useMemo(
    () => visibleSections.find(section => section.id === activeSectionId) || null,
    [activeSectionId, visibleSections]
  );
  const activeLesson = useMemo(
    () => activeSection?.lessons?.find(lesson => lesson.id === activeLessonId) || activeSection?.lessons?.[0] || null,
    [activeLessonId, activeSection]
  );

  const totalLessons = visibleSections.reduce((total, section) => total + (section.lessons?.length || 0), 0);
  const completedLessons = visibleSections.reduce(
    (total, section) => total + (section.lessons || []).filter(lesson => lesson.progress?.completed).length,
    0
  );
  const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const selectedSectionSlug = searchParams.get('section');
  const selectedLessonId = searchParams.get('lesson');
  const isCourseOpen = Boolean(selectedSectionSlug);
  const allLessons = visibleSections.flatMap(section =>
    (section.lessons || []).map(lesson => ({ ...lesson, sectionTitle: section.title, sectionSlug: section.slug }))
  );
  const hasPremiumAccess = Boolean(profile?.has_full_access || profile?.role === 'admin' || profile?.role === 'teacher');
  const isLessonUnlocked = (lesson?: Lesson | null) => Boolean(lesson && (hasPremiumAccess || !lesson.is_locked));
  const accessibleLessons = allLessons.filter(lesson => isLessonUnlocked(lesson));
  const durationProbeKey = accessibleLessons
    .map(lesson => `${lesson.id}:${lesson.video_file || lesson.video_url || ''}:${lesson.duration_minutes || 0}`)
    .join('|');
  const continueLesson = accessibleLessons.find(lesson => lesson.progress && !lesson.progress.completed) || accessibleLessons[0] || allLessons[0];
  const recentLessons = allLessons.slice(0, 4);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/courses');
      const courseSections = data || [];
      const hasSplitWriting = courseSections.some((section: CourseSection) => section.slug === 'writing-task-1' || section.slug === 'writing-task-2');
      const nextSections = hasSplitWriting ? courseSections.filter((section: CourseSection) => section.slug !== 'writing') : courseSections;
      const requestedSection = searchParams.get('section');
      const requestedLesson = searchParams.get('lesson');
      const firstSection = nextSections.find((section: CourseSection) => section.slug === requestedSection) || null;

      setSections(courseSections);
      if (requestedSection && firstSection?.id) setActiveSectionId(firstSection.id);
      if (!activeLessonId && requestedLesson) setActiveLessonId(requestedLesson);
      if (requestedSection && !activeLessonId && !requestedLesson && firstSection?.lessons?.[0]?.id) setActiveLessonId(firstSection.lessons[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (!visibleSections.length || !selectedSectionSlug) return;
    const nextSection = visibleSections.find(section => section.slug === selectedSectionSlug);
    if (!nextSection) return;

    if (activeSectionId !== nextSection.id) {
      setActiveSectionId(nextSection.id);
    }
    if (selectedLessonId) {
      setActiveLessonId(selectedLessonId);
    } else if (!activeLessonId && nextSection.lessons?.[0]?.id) {
      setActiveLessonId(nextSection.lessons[0].id);
    }
  }, [selectedSectionSlug, selectedLessonId, visibleSections, activeSectionId, activeLessonId]);

  useEffect(() => {
    if (!activeLesson || !videoRef.current) return;
    const watchedSeconds = Number(activeLesson.progress?.watched_seconds || 0);
    if (watchedSeconds > 0) {
      videoRef.current.currentTime = watchedSeconds;
    }
  }, [activeLesson?.id]);

  const saveProgress = async (completed = false) => {
    if (!activeLesson) return;
    if (!isLessonUnlocked(activeLesson)) return;
    if (!completed && !videoRef.current) return;
    const watchedSeconds = Math.floor(videoRef.current?.currentTime || activeLesson.progress?.watched_seconds || 0);
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

  const loadLessonQuestions = async (lessonId: string) => {
    const targetLesson = allLessons.find(lesson => lesson.id === lessonId) || activeLesson;
    if (!isLessonUnlocked(targetLesson)) {
      setLessonQuestions([]);
      return;
    }
    const { data } = await api.get(`/courses/lessons/${lessonId}/questions`).catch(() => ({ data: [] }));
    setLessonQuestions(data || []);
  };

  const postLessonQuestion = async () => {
    if (!activeLesson || !questionText.trim()) return;
    if (!isLessonUnlocked(activeLesson)) return;
    try {
      setPostingQuestion(true);
      const { data } = await api.post(`/courses/lessons/${activeLesson.id}/questions`, {
        question_text: questionText.trim()
      });
      setLessonQuestions(previous => [data, ...previous]);
      setQuestionText('');
    } finally {
      setPostingQuestion(false);
    }
  };

  const activeLessonUnlocked = isLessonUnlocked(activeLesson);
  const rawVideoSource = activeLessonUnlocked ? activeLesson?.video_file || activeLesson?.video_url : '';
  const videoSource = activeLessonUnlocked && activeLesson?.video_file
    ? resolveStorageUrl(activeLesson.video_file, 'uploads')
    : getEmbeddableVideoUrl(rawVideoSource);
  const usesIframePlayer = shouldUseVideoIframe(rawVideoSource);
  const activeLessonIndex = activeSection?.lessons?.findIndex(lesson => lesson.id === activeLesson?.id) ?? -1;
  const activeSectionCompleted = activeSection?.lessons?.filter(lesson => lesson.progress?.completed).length || 0;
  const activeSectionTotal = activeSection?.lessons?.length || 0;
  const activeSectionProgress = activeSectionTotal ? Math.round((activeSectionCompleted / activeSectionTotal) * 100) : 0;
  const getLessonDurationSeconds = (lesson?: Lesson | null) => {
    if (!lesson?.id) return 0;
    return detectedDurations[lesson.id] || Number(lesson.duration_minutes || 0) * 60;
  };
  const getLessonDurationLabel = (lesson?: Lesson | null) => formatLessonDuration(getLessonDurationSeconds(lesson));

  useEffect(() => {
    if (!activeLesson?.id) return;
    loadLessonQuestions(activeLesson.id);
  }, [activeLesson?.id]);

  useEffect(() => {
    setActiveResourceId(activeLesson?.resources?.[0]?.id || '');
  }, [activeLesson?.id, activeLesson?.resources?.length]);

  useEffect(() => {
    const probes = accessibleLessons
      .filter(lesson => {
        if (!lesson.id || detectedDurations[lesson.id] || Number(lesson.duration_minutes || 0) > 0) return false;
        const raw = lesson.video_file || lesson.video_url || '';
        return Boolean(raw) && !shouldUseVideoIframe(raw);
      })
      .map(lesson => {
        const raw = lesson.video_file || lesson.video_url || '';
        const source = lesson.video_file ? resolveStorageUrl(lesson.video_file, 'uploads') : raw;
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = source;

        const handleLoadedMetadata = () => {
          const duration = video.duration;
          if (Number.isFinite(duration) && duration > 0) {
            setDetectedDurations(previous => ({ ...previous, [lesson.id]: duration }));
          }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.load();

        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeAttribute('src');
          video.load();
        };
      });

    return () => {
      probes.forEach(cleanup => cleanup());
    };
  }, [durationProbeKey]);

  const activeResource = activeLesson?.resources?.find(resource => resource.id === activeResourceId) || activeLesson?.resources?.[0] || null;

  if (isCourseOpen) {
    return (
      <div className="min-h-screen bg-[#F3F6FB] font-sans text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSearchParams({});
                setActiveSectionId('');
                setActiveLessonId('');
              }}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-black text-[#294b77] hover:bg-[#EFF4FB]"
            >
              <ArrowLeft className="h-4 w-4" /> Courses
            </button>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <h1 className="line-clamp-1 text-[16px] font-black">{activeSection?.title || 'Recorded Course'}</h1>
          </div>
          <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 sm:flex">
            <span>{activeSectionCompleted}/{activeSectionTotal} learning items</span>
            <div className="h-2 w-44 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[#294b77]" style={{ width: `${activeSectionProgress}%` }} />
            </div>
          </div>
        </header>

        <main className="grid gap-4 p-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="max-h-[calc(100vh-96px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-black leading-tight">{activeSection?.title || 'Course'}</h2>
                  <p className="mt-2 text-[12px] font-bold text-slate-500">{activeSectionCompleted}/{activeSectionTotal} learning items completed</p>
                </div>
                <button
                  onClick={() => {
                    setSearchParams({});
                    setActiveSectionId('');
                    setActiveLessonId('');
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-[#294b77]"
                >
                  x
                </button>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#294b77]" style={{ width: `${activeSectionProgress}%` }} />
              </div>
            </div>

            <div className="border-b border-slate-100 p-5">
              <p className="text-[12px] font-black uppercase tracking-wider text-slate-400">Lesson 1</p>
              <h3 className="mt-2 text-[15px] font-black uppercase leading-snug">{activeSection?.title} Recorded Lessons</h3>
            </div>

            <div className="grid gap-1 p-3">
              {activeSection?.lessons?.length ? activeSection.lessons.map((lesson, index) => {
                const unlocked = isLessonUnlocked(lesson);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setActiveLessonId(lesson.id);
                      if (activeSection) setSearchParams({ section: activeSection.slug, lesson: lesson.id });
                    }}
                    className={`rounded-xl p-4 text-left transition-all ${activeLesson?.id === lesson.id ? 'bg-[#EFF4FB]' : 'hover:bg-slate-50'} ${!unlocked ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <LessonThumbnail lesson={lesson} className="h-14 w-20 shrink-0" />
                        {!unlocked && (
                          <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-white bg-[#061A36]/90 text-white shadow-sm">
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${lesson.progress?.completed ? 'bg-emerald-500' : unlocked ? 'bg-slate-100 ring-1 ring-slate-200' : 'bg-amber-100 ring-1 ring-amber-200'}`} />
                          <h3 className="font-black leading-snug">{index + 1}. {lesson.title}</h3>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-500">
                          Video • {getLessonDurationLabel(lesson)}
                          {unlocked ? (
                            lesson.is_free_preview && !hasPremiumAccess ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600">Free Demo</span> : null
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">Premium</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-[13px] font-bold text-slate-400">
                  Lessons coming soon.
                </div>
              )}
            </div>
          </aside>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {loading ? (
              <div className="grid min-h-[420px] place-items-center text-[14px] font-bold text-slate-400">Loading courses...</div>
            ) : activeLesson && !activeLessonUnlocked ? (
              <div className="grid min-h-[560px] place-items-center text-center">
                <div className="max-w-lg rounded-3xl border border-amber-100 bg-amber-50/70 p-8">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-[#EE6055] shadow-sm">
                    <Lock className="h-8 w-8" />
                  </div>
                  <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-[#EE6055]">Premium Lesson</p>
                  <h2 className="mt-2 text-[26px] font-black">{activeLesson.title}</h2>
                  <p className="mt-3 text-[14px] font-semibold leading-7 text-slate-600">
                    This lesson is marked as premium by the admin. Upgrade to premium access to unlock this video, notes, and Q&amp;A.
                  </p>
                  <Link to="/access-request" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#294b77] px-6 py-3 text-[13px] font-black text-white hover:bg-[#EE6055]">
                    <Crown className="h-4 w-4" /> Request Premium Access
                  </Link>
                </div>
              </div>
            ) : activeLesson ? (
              <div className="grid gap-5">
                <div className="aspect-video overflow-hidden rounded-2xl border-2 border-[#2F80ED]/50 bg-[#061A36] shadow-sm">
                  {videoSource ? usesIframePlayer ? (
                    <div className="relative h-full w-full" onContextMenu={event => event.preventDefault()}>
                      <iframe
                        src={videoSource}
                        title={activeLesson.title}
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                        allowFullScreen
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                        referrerPolicy="no-referrer"
                        className="h-full w-full border-0"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute right-0 top-0 z-10 h-16 w-20 cursor-default bg-transparent"
                      />
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      src={videoSource}
                      controls
                      controlsList="nodownload noplaybackrate"
                      disablePictureInPicture
                      preload="metadata"
                      className="h-full w-full"
                      onContextMenu={event => event.preventDefault()}
                      onLoadedMetadata={event => {
                        const duration = event.currentTarget.duration;
                        if (activeLesson?.id && Number.isFinite(duration) && duration > 0) {
                          setDetectedDurations(previous => ({ ...previous, [activeLesson.id]: duration }));
                        }
                      }}
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

                <div className="border-b border-slate-200">
                  <div className="flex gap-8 text-[14px] font-black text-slate-500">
                    {[
                      ['overview', 'Overview'],
                      ['notes', 'Notes'],
                      ['qa', 'Q&A']
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setActiveTab(key as 'overview' | 'notes' | 'qa');
                          window.history.replaceState(null, '', key === 'overview' ? window.location.pathname + window.location.search : `#${key}`);
                        }}
                        className={`border-b-2 px-1 pb-3 transition-colors ${activeTab === key ? 'border-[#2F80ED] text-[#2F80ED]' : 'border-transparent hover:text-[#294b77]'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === 'overview' && (
                  <div className="grid gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h2 className="text-[25px] font-black">{activeLesson.title}</h2>
                        {activeLesson.description && <p className="mt-3 max-w-3xl text-[15px] font-semibold leading-7 text-slate-600">{activeLesson.description}</p>}
                      </div>
                      <button onClick={markComplete} className="rounded-xl bg-[#294b77] px-5 py-3 text-[13px] font-black text-white">
                        <CheckCircle2 className="mr-2 inline h-4 w-4" /> Mark Completed
                      </button>
                    </div>

                    <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                      <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-slate-500" />
                        <div>
                          <p className="text-[15px] font-black">{getLessonDurationLabel(activeLesson)}</p>
                          <p className="text-[12px] font-semibold text-slate-500">Duration</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-slate-500" />
                        <div>
                          <p className="text-[15px] font-black">Intermediate</p>
                          <p className="text-[12px] font-semibold text-slate-500">Level</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-slate-500" />
                        <div>
                          <p className="text-[15px] font-black">{activeSection?.title || 'IELTS'}</p>
                          <p className="text-[12px] font-semibold text-slate-500">Category</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div id="notes">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-3 flex items-center gap-2 text-[17px] font-black"><FileText className="h-5 w-5 text-[#294b77]" /> Lesson Notes</h3>
                      {activeLesson.notes ? (
                        <div className="mb-5 rounded-2xl bg-[#F8FAFC] p-5 whitespace-pre-wrap text-[14px] font-semibold leading-7 text-slate-600">{activeLesson.notes}</div>
                      ) : !activeLesson.resources?.length ? (
                        <p className="text-[14px] font-semibold text-slate-500">No written notes added yet. Admin can add them from Written Notes and save the lesson.</p>
                      ) : null}

                      {activeLesson.resources?.length ? (
                        <div className="grid gap-4">
                          {activeLesson.resources.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                              {activeLesson.resources.map(resource => (
                                <button
                                  key={resource.id}
                                  onClick={() => setActiveResourceId(resource.id)}
                                  className={`rounded-full border px-4 py-2 text-[12px] font-black transition-colors ${activeResourceId === resource.id ? 'border-[#294b77] bg-[#294b77] text-white' : 'border-slate-200 bg-[#F8FAFC] text-[#294b77] hover:border-[#294b77]/40'}`}
                                >
                                  {resource.title}
                                </button>
                              ))}
                            </div>
                          )}

                          {activeResource && (
                            <NotesPdfReader title={activeResource.title} resourceId={activeResource.id} token={token} />
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {activeTab === 'qa' && (
                  <div id="qa" className="grid gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-[17px] font-black"><MessageCircle className="h-5 w-5 text-[#294b77]" /> Lesson Q&amp;A</h3>
                      <textarea
                        value={questionText}
                        onChange={event => setQuestionText(event.target.value)}
                        placeholder="Ask your question about this video..."
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]"
                      />
                      <div className="mt-3 flex justify-end">
                        <button onClick={postLessonQuestion} disabled={postingQuestion || !questionText.trim()} className="rounded-xl bg-[#294b77] px-5 py-3 text-[13px] font-black text-white disabled:opacity-50">
                          <Send className="mr-2 inline h-4 w-4" /> Post Question
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {lessonQuestions.length ? lessonQuestions.map(question => (
                        <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EFF4FB] text-[13px] font-black text-[#294b77]">
                              {(question.profiles?.full_name || question.profiles?.email || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[14px] font-black">{question.profiles?.full_name || 'Student'}</p>
                                {question.created_at && <p className="text-[12px] font-bold text-slate-400">{new Date(question.created_at).toLocaleDateString()}</p>}
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-[14px] font-semibold leading-6 text-slate-600">{question.question_text}</p>
                              {question.answer_text && (
                                <div className="mt-3 rounded-xl bg-[#EFF4FB] p-3 text-[13px] font-semibold leading-6 text-[#294b77]">
                                  <span className="font-black">Instructor reply:</span> {question.answer_text}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                          <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
                          <p className="mt-2 text-[14px] font-bold text-slate-500">No questions yet. Ask the first question for this lesson.</p>
                        </div>
                      )}
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
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FBF2E6] font-sans text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <StudentSidebar variant="cinema" />

      <main className="min-w-0 flex-1">
        <div
          className="relative min-h-screen overflow-hidden bg-[#FFF8ED] bg-cover bg-center p-5 lg:p-8"
          style={{ backgroundImage: "url('/images/Recorded%20Courses/background.png')" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[#FFF7EA]/35" />
          {!isCourseOpen ? (
            <div className="relative z-10 grid gap-6">
              <section className="flex items-center justify-end gap-4">
                <label className="hidden h-[58px] w-[560px] items-center gap-4 rounded-[18px] border border-[#D7C2A3] bg-[#FFF8EE]/88 px-6 text-[#5E3E2B] shadow-[0_8px_20px_rgba(88,56,35,0.10)] backdrop-blur sm:flex">
                  <Search className="h-7 w-7" />
                  <input className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none placeholder:text-[#8D735F]" placeholder="Search for lessons..." />
                </label>
                <button className="relative grid h-[58px] w-[58px] place-items-center rounded-full border border-[#D7C2A3] bg-[#FFF8EE]/88 text-[#3D2418] shadow-[0_8px_20px_rgba(88,56,35,0.10)]">
                  <Bell className="h-6 w-6" />
                  <span className="absolute right-3 top-3 h-3.5 w-3.5 rounded-full bg-[#E84332] ring-2 ring-[#FFF8EE]" />
                </button>
                <div className="flex items-center gap-2 border-l border-[#D7C2A3] pl-4">
                  <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-[#EADBC5] text-[22px] font-black text-[#2E1D14] shadow-sm">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <ChevronDown className="h-5 w-5 text-[#5E3E2B]" />
                </div>
              </section>

              <section className="aspect-[2934/786] overflow-hidden rounded-[24px] shadow-[0_14px_30px_rgba(76,48,29,0.15)]">
                <img src="/images/Recorded%20Courses/header.png" alt="IELTS recorded courses" className="block h-full w-full scale-[1.018] select-none object-cover brightness-[1.08]" draggable={false} />
              </section>

              <section>
                <div className="mb-7">
                  <h1 className="flex items-center gap-4 text-[28px] font-black tracking-tight text-[#05162E]">
                    Explore by Section
                    <span className="text-[20px] font-black text-[#C56832]">~ ★ ~</span>
                  </h1>
                  <p className="mt-2 text-[15px] font-semibold text-[#6F6257]">Choose a section and start watching expert video lessons.</p>
                </div>

                <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-5">
                  {visibleSections.map(section => {
                    const poster = recordedCoursePoster(section);
                    const Icon = poster.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => {
                          setActiveSectionId(section.id);
                          setActiveLessonId(section.lessons?.[0]?.id || '');
                          setSearchParams({ section: section.slug });
                        }}
                        className="group overflow-hidden rounded-[12px] bg-[#F2D9B5] text-left shadow-[0_10px_22px_rgba(76,48,29,0.15)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(76,48,29,0.20)]"
                      >
                        <div className="relative aspect-[464/572] overflow-hidden">
                          <img src={poster.image} alt={section.title} className="h-full w-full scale-[1.095] object-cover transition-transform duration-300 group-hover:scale-[1.115]" />
                        </div>
                        <div className="flex items-center gap-4 bg-[#F0D5AB] px-6 py-4">
                          <Icon className={`h-7 w-7 ${poster.accent}`} />
                          <span className="text-[17px] font-semibold text-[#3E2B1D]">{section.lessons.length} Lessons</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
          <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)_88px]">
            <div className="lg:col-span-3">
              <button
                onClick={() => {
                  setSearchParams({});
                  setActiveSectionId('');
                  setActiveLessonId('');
                }}
                className="mb-1 inline-flex items-center gap-2 text-[13px] font-black text-[#294b77] hover:text-[#EE6055]"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Recorded Courses
              </button>
            </div>
            <section className="max-h-[calc(100vh-150px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[20px] font-black leading-tight">{activeSection?.title || 'Course'}</h2>
                    <p className="mt-2 text-[12px] font-bold text-slate-500">{activeSectionCompleted}/{activeSectionTotal} learning items completed</p>
                  </div>
                  <button
                    onClick={() => {
                      setSearchParams({});
                      setActiveSectionId('');
                      setActiveLessonId('');
                    }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-[#294b77]"
                  >
                    x
                  </button>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#294b77]" style={{ width: `${activeSectionProgress}%` }} />
                </div>
              </div>

              <div className="border-b border-slate-100 p-5">
                <p className="text-[12px] font-black uppercase tracking-wider text-slate-400">Lesson 1</p>
                <h3 className="mt-2 text-[15px] font-black uppercase leading-snug">{activeSection?.title} Recorded Lessons</h3>
              </div>

              <div className="grid gap-1 p-3">
                {activeSection?.lessons?.length ? activeSection.lessons.map((lesson, index) => {
                  const unlocked = isLessonUnlocked(lesson);
                  return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setActiveLessonId(lesson.id);
                      if (activeSection) setSearchParams({ section: activeSection.slug, lesson: lesson.id });
                    }}
                    className={`rounded-xl p-4 text-left transition-all ${activeLesson?.id === lesson.id ? 'bg-[#EFF4FB]' : 'hover:bg-slate-50'} ${!unlocked ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <LessonThumbnail lesson={lesson} className="h-14 w-20 shrink-0" />
                        {!unlocked && (
                          <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-white bg-[#061A36]/90 text-white shadow-sm">
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${lesson.progress?.completed ? 'bg-emerald-500' : unlocked ? 'bg-slate-100 ring-1 ring-slate-200' : 'bg-amber-100 ring-1 ring-amber-200'}`} />
                          <h3 className="font-black leading-snug">{index + 1}. {lesson.title}</h3>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-500">
                          Video • {getLessonDurationLabel(lesson)}
                          {unlocked ? (
                            lesson.is_free_preview && !hasPremiumAccess ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600">Free Demo</span> : null
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">Premium</span>
                          )}
                          {lesson.progress?.completed && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </p>
                      </div>
                    </div>
                  </button>
                  );
                }) : (
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
                  <div className="mb-1 flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 shadow-sm">
                    <span>{activeLessonIndex + 1}/{activeSectionTotal} learning items</span>
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-[#294b77]" style={{ width: `${activeSectionProgress}%` }} />
                    </div>
                  </div>

                  <div className="aspect-video overflow-hidden rounded-2xl border-2 border-[#2F80ED]/50 bg-[#061A36] shadow-sm">
                    {videoSource ? usesIframePlayer ? (
                      <div className="relative h-full w-full" onContextMenu={event => event.preventDefault()}>
                        <iframe
                          src={videoSource}
                          title={activeLesson.title}
                          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                          allowFullScreen
                          sandbox="allow-scripts allow-same-origin allow-presentation"
                          referrerPolicy="no-referrer"
                          className="h-full w-full border-0"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute right-0 top-0 z-10 h-16 w-20 cursor-default bg-transparent"
                        />
                      </div>
                    ) : (
                      <video
                        ref={videoRef}
                        src={videoSource}
                        controls
                        controlsList="nodownload noplaybackrate"
                        disablePictureInPicture
                        preload="metadata"
                        className="h-full w-full"
                        onContextMenu={event => event.preventDefault()}
                        onLoadedMetadata={event => {
                          const duration = event.currentTarget.duration;
                          if (activeLesson?.id && Number.isFinite(duration) && duration > 0) {
                            setDetectedDurations(previous => ({ ...previous, [activeLesson.id]: duration }));
                          }
                        }}
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
                      <h2 className="text-[25px] font-black">{activeLesson.title}</h2>
                      <p className="mt-1 inline-flex rounded-lg bg-orange-50 px-3 py-1 text-[12px] font-bold text-orange-700">{activeSection?.title}</p>
                      {activeLesson.description && <p className="mt-2 max-w-3xl text-[14px] font-semibold leading-7 text-slate-500">{activeLesson.description}</p>}
                    </div>
                    <button onClick={markComplete} className="rounded-xl bg-[#294b77] px-5 py-3 text-[13px] font-black text-white">
                      <CheckCircle2 className="mr-2 inline h-4 w-4" /> Mark Completed
                    </button>
                  </div>

                  {activeLesson.notes && (
                    <div id="notes" className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-[15px] font-black"><FileText className="h-4 w-4" /> Lesson Notes</h3>
                      <div className="whitespace-pre-wrap text-[14px] font-semibold leading-7 text-slate-600">{activeLesson.notes}</div>
                    </div>
                  )}

                  {Boolean(activeLesson.resources?.length) && (
                    <div id="files" className="rounded-2xl border border-slate-200 p-5">
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

            <aside className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
              <div className="grid divide-y divide-slate-100 text-center text-[12px] font-bold text-slate-500">
                <a href="#transcript" className="grid gap-2 px-3 py-6 hover:bg-[#EFF4FB] hover:text-[#294b77]">
                  <FileText className="mx-auto h-5 w-5" />
                  Transcript
                </a>
                <a href="#notes" className="grid gap-2 px-3 py-6 hover:bg-[#EFF4FB] hover:text-[#294b77]">
                  <PenLine className="mx-auto h-5 w-5" />
                  Notes
                </a>
                <a href="#files" className="grid gap-2 px-3 py-6 hover:bg-[#EFF4FB] hover:text-[#294b77]">
                  <Download className="mx-auto h-5 w-5" />
                  Files
                </a>
              </div>
            </aside>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}

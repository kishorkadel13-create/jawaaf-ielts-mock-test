import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Bell, BookOpen, CheckCircle2, ChevronDown, Clock, Crown, Download, FileText, Headphones, History, Lock, LogOut, MessageCircle, Monitor, PenLine, Play, Search, Send, Settings, Target, User, Video } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import StudentSidebar from '../components/StudentSidebar';
import JawaafLogo from '../components/JawaafLogo';
import MobileBottomNav from '../components/MobileBottomNav';
import { resolveStorageUrl } from '../utils/storageUrl';
import { getEmbeddableVideoUrl, getVideoThumbnailUrl, shouldUseVideoIframe } from '../utils/videoEmbed';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type Lesson = {
  id: string;
  title: string;
  description?: string;
  learning_points?: string[] | string | null;
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

type TodayGoal = {
  id: string;
  title?: string;
  goal_text: string;
  tip_text?: string;
  section_slug?: string | null;
  order_no?: number;
};

const defaultLearningPoints = ['Key IELTS concepts', 'Step-by-step class strategy', 'Common traps to avoid', 'Practice-focused guidance'];

const getLessonLearningPoints = (lesson?: Lesson | null) => {
  const raw = lesson?.learning_points;
  if (Array.isArray(raw)) {
    const points = raw.map(item => String(item || '').trim()).filter(Boolean);
    return points.length ? points : defaultLearningPoints;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const points = parsed.map(item => String(item || '').trim()).filter(Boolean);
        return points.length ? points : defaultLearningPoints;
      }
    } catch {
      const points = raw.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
      if (points.length) return points;
    }
  }
  return defaultLearningPoints;
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

type VintageCinemaTicketCardProps = {
  lesson: Lesson;
  index: number;
  selected: boolean;
  unlocked: boolean;
  durationLabel: string;
  watchedStamp: string;
  nowShowingStamp: string;
  onSelect: () => void;
};

const VintageCinemaTicketCard = ({
  lesson,
  index,
  selected,
  unlocked,
  durationLabel,
  watchedStamp,
  nowShowingStamp,
  onSelect
}: VintageCinemaTicketCardProps) => {
  const completed = Boolean(lesson.progress?.completed);
  const ribbonStops = selected
    ? ['#AF2B22', '#D13B2D', '#A92820']
    : completed
      ? ['#3F7049', '#56845D', '#416F49']
      : ['#D8CAAA', '#C2AE83', '#B9A171'];
  const ribbonText = selected || completed ? '#FFFFFF' : '#2D1A10';

  return (
    <button
      onClick={onSelect}
      className={`vintage-ticket group relative h-[118px] w-full text-left transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D49325]/60 ${selected ? 'z-10 -translate-y-2 scale-[1.018]' : 'hover:-translate-y-0.5'} ${!unlocked ? 'opacity-75' : ''}`}
    >
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 360 118" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`ticketPaper-${lesson.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF7E7" />
            <stop offset="50%" stopColor="#FCEED3" />
            <stop offset="100%" stopColor="#F4DDB3" />
          </linearGradient>
          <linearGradient id={`ticketRibbon-${lesson.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={ribbonStops[0]} />
            <stop offset="54%" stopColor={ribbonStops[1]} />
            <stop offset="100%" stopColor={ribbonStops[2]} />
          </linearGradient>
          <radialGradient id={`ticketGlow-${lesson.id}`} cx="50%" cy="42%" r="75%">
            <stop offset="0%" stopColor="#FFFDF5" stopOpacity="0.34" />
            <stop offset="64%" stopColor="#E6C487" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#B98236" stopOpacity="0.06" />
          </radialGradient>
          <pattern id={`ticketGrain-${lesson.id}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="3" r="0.55" fill="#8A5A26" opacity="0.07" />
            <circle cx="9" cy="8" r="0.45" fill="#C4934E" opacity="0.08" />
          </pattern>
          <filter id={`ticketShadow-${lesson.id}`} x="-8%" y="-16%" width="116%" height="136%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#5B3718" floodOpacity={selected ? '0.24' : '0.11'} />
          </filter>
        </defs>
        <path
          d="M20 2 H340 Q350 2 354 12 V47 Q343 47 343 59 Q343 71 354 71 V106 Q350 116 340 116 H20 Q10 116 6 106 V71 Q17 71 17 59 Q17 47 6 47 V12 Q10 2 20 2 Z"
          fill={`url(#ticketPaper-${lesson.id})`}
          stroke={selected ? '#D49325' : '#D7B77E'}
          strokeWidth={selected ? 1.6 : 1}
          filter={`url(#ticketShadow-${lesson.id})`}
        />
        <path
          d="M24 11 H336 Q344 11 346 19 V45 Q337 49 337 59 Q337 69 346 73 V99 Q344 107 336 107 H24 Q16 107 14 99 V73 Q23 69 23 59 Q23 49 14 45 V19 Q16 11 24 11 Z"
          fill="none"
          stroke={selected ? '#D49325' : '#DCC08F'}
          strokeOpacity={selected ? 0.98 : 0.78}
          strokeWidth={selected ? 1.2 : 1}
        />
        <path
          d="M34 18 H72 M326 18 H288 M34 100 H72 M326 100 H288"
          fill="none"
          stroke="#CFA86A"
          strokeWidth="0.8"
          strokeOpacity="0.56"
        />
        <path
          d="M34 18 C26 18 22 22 22 30 M326 18 C334 18 338 22 338 30 M34 100 C26 100 22 96 22 88 M326 100 C334 100 338 96 338 88"
          fill="none"
          stroke="#CFA86A"
          strokeWidth="0.8"
          strokeOpacity="0.56"
        />
        <path
          d="M8 48 Q18 48 18 59 Q18 70 8 70 M352 48 Q342 48 342 59 Q342 70 352 70"
          fill="none"
          stroke="#D2AD75"
          strokeWidth="1"
          strokeOpacity="0.82"
        />
        <path
          d="M20 2 H340 Q350 2 354 12 V47 Q343 47 343 59 Q343 71 354 71 V106 Q350 116 340 116 H20 Q10 116 6 106 V71 Q17 71 17 59 Q17 47 6 47 V12 Q10 2 20 2 Z"
          fill={`url(#ticketGlow-${lesson.id})`}
        />
        <path
          d="M20 2 H340 Q350 2 354 12 V47 Q343 47 343 59 Q343 71 354 71 V106 Q350 116 340 116 H20 Q10 116 6 106 V71 Q17 71 17 59 Q17 47 6 47 V12 Q10 2 20 2 Z"
          fill={`url(#ticketGrain-${lesson.id})`}
        />
      </svg>

      <div className="relative z-[1] flex h-full items-center gap-4 px-6 py-3">
        <div className="cinema-serif relative h-[72px] w-[55px] shrink-0 drop-shadow-[3px_5px_8px_rgba(77,46,20,0.14)]">
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 55 72" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0 H55 V72 L27.5 58 L0 72 Z" fill={`url(#ticketRibbon-${lesson.id})`} />
            <path d="M0 0 H55 V72 L27.5 58 L0 72 Z" fill={`url(#ribbonSheen-${lesson.id})`} opacity="0.32" />
            <path d="M9 9 V53" stroke="rgba(255,248,232,0.34)" strokeWidth="1" strokeDasharray="4 4" />
            <defs>
              <linearGradient id={`ribbonSheen-${lesson.id}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#2D1A10" stopOpacity="0.16" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-x-0 top-[18px] text-center text-[25px] font-black leading-none" style={{ color: ribbonText }}>{String(index + 1).padStart(2, '0')}</span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="cinema-serif line-clamp-2 text-[18px] font-black leading-snug text-[#2A1A10] 2xl:text-[19px]">{lesson.title}</h3>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#6E543A]">
            <Clock className="h-4 w-4" /> {durationLabel}
          </p>
        </div>

        {completed ? (
          <img src={watchedStamp} alt="Watched" className="cinema-status-stamp shrink-0" draggable={false} />
        ) : selected ? (
          <span className="flex shrink-0 items-center gap-2">
            <img src={nowShowingStamp} alt="Now showing" className="cinema-status-stamp cinema-status-stamp--showing" draggable={false} />
            <span className="cinema-play-triangle" />
          </span>
        ) : !unlocked ? (
          <span className="cinema-lock-seal grid h-12 w-12 shrink-0 place-items-center text-[#8C6A3B]"><Lock className="h-5 w-5" /></span>
        ) : null}
      </div>
    </button>
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
          await page.render({ canvas: canvas, viewport }).promise;
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
  const [todayGoals, setTodayGoals] = useState<TodayGoal[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [postingQuestion, setPostingQuestion] = useState(false);
  const [detectedDurations, setDetectedDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const loadTodayGoals = async () => {
    const { data } = await api.get('/courses/today-goals').catch(() => ({ data: [] }));
    setTodayGoals(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadCourses();
    loadTodayGoals();
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

  const activeLessonUnlocked = activeLesson ? isLessonUnlocked(activeLesson) : false;
  const rawVideoSource = activeLessonUnlocked ? activeLesson?.video_file || activeLesson?.video_url : '';
  const shouldProxyVideo = Boolean(activeLessonUnlocked && activeLesson?.id && activeLesson.video_file);
  const secureVideoSource = shouldProxyVideo && token
    ? `${api.defaults.baseURL || '/api'}/courses/lessons/${activeLesson?.id}/video?token=${encodeURIComponent(token)}`
    : '';
  const videoSource = shouldProxyVideo ? secureVideoSource : getEmbeddableVideoUrl(rawVideoSource);
  const usesIframePlayer = !shouldProxyVideo && shouldUseVideoIframe(rawVideoSource);
  const activeLessonPoster = activeLesson ? getVideoThumbnailUrl(activeLesson.video_file || activeLesson.video_url, activeLesson.thumbnail_url) : '';
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
    const cinemaLessons = activeSection?.lessons || [];
    const cinemaPrevLesson = activeLessonIndex > 0 ? cinemaLessons[activeLessonIndex - 1] : null;
    const cinemaNextLesson = cinemaLessons[activeLessonIndex + 1] || cinemaLessons.find(lesson => lesson.id !== activeLesson?.id) || null;
    const cinemaTitle = `${activeSection?.title || 'IELTS'} Cinema`;
    const cinemaMascot = '/images/transition/jawaafielts-cutout.png';
    const cinemaPopcornMascot = '/images/video%20course/popcorn-cutout.png?v=2';
    const cinemaNotesMascot = '/images/video%20course/notes-cutout.png?v=2';
    const cinemaWatchedStamp = '/images/video%20course/watch-transparent.png';
    const cinemaNowShowingStamp = '/images/video%20course/now-showing-transparent.png';
    const cinemaReelRing = '/images/video%20course/ring-transparent.png';
    const activeLearningPoints = getLessonLearningPoints(activeLesson);
    const matchingTodayGoals = todayGoals.filter(goal => !goal.section_slug || goal.section_slug === activeSection?.slug);
    const activeTodayGoal = matchingTodayGoals.length
      ? matchingTodayGoals[Math.max(activeLessonIndex, 0) % matchingTodayGoals.length]
      : null;

    return (
      <div
        className="cinema-shell min-h-screen overflow-y-auto overflow-x-hidden bg-[#F6E7CF] bg-cover bg-center font-sans text-[#2D1A10] xl:h-screen xl:max-h-screen xl:overflow-hidden"
        style={{
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          backgroundImage: "url('/images/Recorded%20Courses/background.png')"
        }}
      >
        <div
          className="min-h-screen bg-[#FFF4DF]/74 xl:h-full xl:overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle at 22% 18%, rgba(214, 166, 88, 0.10), transparent 34%), radial-gradient(circle at 78% 72%, rgba(181, 116, 45, 0.075), transparent 38%), linear-gradient(135deg, rgba(255, 248, 232, 0.52), rgba(241, 218, 181, 0.20))'
          }}
        >
          <main className="grid min-h-screen min-w-0 gap-4 pb-28 xl:h-full xl:min-h-0 xl:grid-cols-[280px_minmax(0,1fr)_300px] xl:gap-0 xl:overflow-hidden xl:pb-0 2xl:grid-cols-[320px_minmax(0,1fr)_320px]">
            <aside className="order-2 relative mx-4 flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#D2AE75] bg-[#F8EBD6]/88 px-4 py-4 shadow-[12px_0_35px_rgba(89,52,23,0.08)] xl:order-none xl:mx-0 xl:h-screen xl:min-h-0 xl:rounded-none xl:border-l-0 xl:border-y-0 2xl:px-5 2xl:py-5">
              <div className="mb-4 flex shrink-0 items-center justify-between gap-3 px-3">
                <JawaafLogo className="w-[180px] 2xl:w-[198px]" />
                <button
                  onClick={() => {
                    setSearchParams({});
                    setActiveSectionId('');
                    setActiveLessonId('');
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#D3AE75] bg-[#FFF6E7] text-[#6B351D] shadow-sm hover:bg-[#F4D8AA]"
                  aria-label="Back to recorded courses"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

              <section className="cinema-paper-panel flex min-h-0 flex-1 flex-col rounded-[24px] p-3.5 2xl:p-4">
                <h2 className="cinema-serif relative mb-3 flex shrink-0 items-center justify-center gap-3 border-b border-[#C7963D] pb-3.5 text-[18px] font-black uppercase tracking-[0.08em] text-[#2D1A10] 2xl:text-[19px]">
                  <span className="text-[#7D2D1E]">★</span> Today's Programme <span className="text-[#7D2D1E]">★</span>
                </h2>

                <div className="custom-scrollbar relative z-10 grid max-h-[62dvh] min-h-0 flex-1 content-start gap-2.5 overflow-y-auto overflow-x-hidden pr-1 xl:max-h-none 2xl:gap-3">
	                  {cinemaLessons.length ? cinemaLessons.map((lesson, index) => {
	                    const unlocked = isLessonUnlocked(lesson);
	                    const selected = activeLesson?.id === lesson.id;
	                    return (
	                      <VintageCinemaTicketCard
	                        key={lesson.id}
	                        lesson={lesson}
	                        index={index}
	                        selected={selected}
	                        unlocked={unlocked}
	                        durationLabel={getLessonDurationLabel(lesson)}
	                        watchedStamp={cinemaWatchedStamp}
	                        nowShowingStamp={cinemaNowShowingStamp}
	                        onSelect={() => {
	                          setActiveLessonId(lesson.id);
	                          if (activeSection) setSearchParams({ section: activeSection.slug, lesson: lesson.id });
	                        }}
	                      />
	                    );
	                  }) : (
                    <div className="rounded-xl border border-dashed border-[#D6B27D] p-6 text-center text-[13px] font-bold text-[#8A6A42]">
                      Lessons coming soon.
                    </div>
                  )}
                </div>

                <button className="cinema-button-paper relative z-10 mt-3 flex min-h-11 w-full shrink-0 items-center justify-center gap-4 rounded-[14px] px-5 py-3 text-[14px] font-black text-[#2D1A10] sm:w-[86%] sm:self-center">
                  <span className="text-[26px] leading-none">🍿</span>
                  <span className="text-left">Download Programme<br /><span className="text-[13px] font-semibold text-[#6E543A]">PDF</span></span>
                </button>
              </section>
            </aside>

            <section className="order-1 flex min-w-0 flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-6 xl:order-none xl:h-screen xl:min-h-0 xl:overflow-hidden">
              <header className="mb-3 grid shrink-0 gap-3 border-b border-[#D4B27E] pb-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <img src={cinemaReelRing} alt="" className="cinema-ring-icon h-[42px] w-[42px] shrink-0 object-contain sm:h-[52px] sm:w-[52px]" draggable={false} />
                  <div>
                    <h1 className="cinema-serif break-words text-[clamp(22px,7vw,34px)] font-black uppercase leading-none tracking-[0.02em] text-[#2D1A10] xl:text-[clamp(26px,2.45vw,36px)]">
                      {cinemaTitle}
                    </h1>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#674A32]">{activeSectionTotal} Premium Lessons</p>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px] font-semibold text-[#54351F]">
                    <span>Lesson Progress</span>
                    <span>{activeSectionCompleted} of {activeSectionTotal} Completed</span>
                  </div>
                  <div className="grid grid-cols-10 gap-1.5">
                    {Array.from({ length: Math.max(activeSectionTotal || 1, 10) }).slice(0, 10).map((_, index) => (
                      <span
                        key={index}
                        className={`h-3 rounded-[4px] border border-[#D6B27D] ${index < activeSectionCompleted ? 'bg-[#C88A24]' : 'bg-[#FFF8EA]'
                          }`}
                      />
                    ))}
                  </div>
                </div>
              </header>

              <div className="cinema-paper-panel min-h-0 flex-1 overflow-visible rounded-[20px] p-2.5 sm:rounded-[24px] sm:p-3.5 xl:overflow-hidden 2xl:p-4">
                {loading ? (
                  <div className="grid min-h-[520px] place-items-center text-[14px] font-bold text-[#8B6A47]">Loading courses...</div>
                ) : activeLesson && !activeLessonUnlocked ? (
                  <div className="grid min-h-[560px] place-items-center text-center">
                    <div className="max-w-lg rounded-[22px] border border-[#D2A260] bg-[#FFF9ED] p-8 shadow-sm">
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#F3DEC0] text-[#A23A24] shadow-sm">
                        <Lock className="h-8 w-8" />
                      </div>
                      <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-[#A23A24]">Premium Showing</p>
                      <h2 className="mt-2 text-[28px] font-black text-[#2D1A10]">{activeLesson.title}</h2>
                      <p className="mt-3 text-[14px] font-semibold leading-7 text-[#6E543A]">
                        This lesson is marked as premium by the admin. Upgrade to premium access to unlock this video, notes, and Q&amp;A.
                      </p>
                      <Link to="/access-request" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#A63A28] px-6 py-3 text-[13px] font-black text-white hover:bg-[#7E291D]">
                        <Crown className="h-4 w-4" /> Request Premium Access
                      </Link>
                    </div>
                  </div>
                ) : activeLesson ? (
                  <div className="flex h-full min-h-0 flex-col gap-3 sm:gap-2.5">
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <p className="mb-1 flex flex-wrap items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-[#A23A24] sm:text-[13px]">
                          <span>★</span> Now Showing <span>★</span>
                        </p>
                        <h2 className="cinema-serif break-words text-[clamp(23px,8vw,34px)] font-black leading-tight text-[#2D1A10] xl:text-[clamp(24px,2.6vw,36px)]">
                          {activeLesson.title}
                        </h2>
                        <p className="mt-0.5 break-words text-[15px] font-black text-[#A23A24] sm:text-[16px]">{activeSection?.title || 'IELTS'}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-start">
                        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#54351F]">
                          <Clock className="h-4 w-4" /> {getLessonDurationLabel(activeLesson)}
                        </p>
                        <button
                          onClick={markComplete}
                          className={`hidden min-h-11 rounded-full border px-3.5 py-2 text-[12px] font-black transition-colors sm:inline-flex sm:items-center ${activeLesson.progress?.completed
                            ? 'border-[#4F7B54]/45 bg-[#E6F0E2]/80 text-[#4F7B54]'
                            : 'border-[#D4A160] bg-[#FFF6E7]/90 text-[#6B351D] hover:border-[#A23A24] hover:text-[#A23A24]'
                          }`}
                        >
                          <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
                          {activeLesson.progress?.completed ? 'Completed' : 'Mark Completed'}
                        </button>
                      </div>
                    </div>

                    <div className="cinema-video-frame h-[240px] w-full shrink-0 overflow-hidden rounded-[14px] bg-black min-[390px]:h-[250px] sm:aspect-video sm:h-auto sm:rounded-[18px] xl:h-[clamp(300px,42vh,470px)] xl:aspect-auto">
                      {videoSource ? usesIframePlayer ? (
                        <div className="relative h-full w-full" onContextMenu={event => event.preventDefault()}>
                          <iframe
                            src={videoSource}
                            title={activeLesson.title}
                            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share"
                            allowFullScreen
                            sandbox="allow-scripts allow-same-origin allow-presentation"
                            referrerPolicy="no-referrer"
                            className="h-full w-full border-0"
                          />
                        </div>
                      ) : (
                        <video
                          ref={videoRef}
                          src={videoSource}
                          controls
                          controlsList="nodownload noplaybackrate"
                          disablePictureInPicture
                          playsInline
                          poster={activeLessonPoster}
                          preload="metadata"
                          className="h-full w-full bg-black object-contain"
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

                    <div className="min-h-[220px] flex-1">
                      <section className="cinema-paper-panel flex h-full min-h-0 flex-col rounded-[22px] shadow-sm">
                        <div className="cinema-tabs relative z-10 grid w-full shrink-0 grid-cols-3 gap-0 px-0 pt-0 text-[13px] font-black text-[#2D1A10] sm:max-w-[680px] sm:text-[14px]">
                          {[
                            ['overview', 'Overview', BookOpen],
                            ['notes', 'Notes', PenLine],
                            ['qa', 'Discussion', MessageCircle]
                          ].map(([key, label, Icon]) => {
                            const TabIcon = Icon as typeof BookOpen;
                            return (
                              <button
                                key={key as string}
                                onClick={() => {
                                  setActiveTab(key as 'overview' | 'notes' | 'qa');
                                  window.history.replaceState(null, '', key === 'overview' ? window.location.pathname + window.location.search : `#${key}`);
                                }}
                                className={`flex min-h-[46px] items-center justify-center gap-1.5 border border-b-0 px-2 py-2.5 transition-colors sm:gap-3 sm:px-5 ${activeTab === key
                                  ? 'border-[#D4B27E] bg-[#FFF3DC] text-[#2D1A10] shadow-[inset_0_-3px_0_#C88A24]'
                                  : 'border-[#E3C996]/70 bg-[#F9E8CE]/55 hover:bg-[#FFF3DC]/70'
                                  }`}
                              >
                                <TabIcon className="h-4 w-4 sm:h-6 sm:w-6" /> <span className="truncate">{label as string}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 2xl:p-5">
                          {activeTab === 'overview' && (
                            <div className="grid min-h-full gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(240px,3fr)]">
                              <div className="cinema-copy-block min-w-0">
                                <h3 className="cinema-serif text-[21px] font-black text-[#2D1A10]">About this lesson</h3>
                                <p className="mt-3 text-[14px] font-semibold leading-7 text-[#5F4630] 2xl:text-[15px]">
                                  {activeLesson.description || "In this lesson, you'll learn focused IELTS strategies and apply them through guided examples from the recorded class."}
                                </p>
                              </div>
                              <div className="cinema-copy-block min-w-0 border-[#E1C79A] lg:border-l lg:pl-5">
                                <h3 className="cinema-serif text-[21px] font-black text-[#2D1A10]">What you'll learn</h3>
                                <div className="mt-3 grid gap-2.5 text-[14px] font-semibold text-[#5F4630]">
                                  {activeLearningPoints.map(item => (
                                    <p key={item} className="flex items-center gap-2">
                                      <CheckCircle2 className="h-5 w-5 text-[#4F7B54]" /> {item}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTab === 'notes' && (
                            <div id="notes" className="grid gap-4">
                              <h3 className="flex items-center gap-2 text-[18px] font-black text-[#2D1A10]"><FileText className="h-5 w-5" /> Lesson Notes</h3>
                              {activeLesson.notes ? (
                                <div className="rounded-[14px] border border-[#E1C79A] bg-[#FFF4DF] p-5 whitespace-pre-wrap text-[14px] font-semibold leading-7 text-[#5F4630]">{activeLesson.notes}</div>
                              ) : !activeLesson.resources?.length ? (
                                <p className="text-[14px] font-semibold text-[#73563A]">No written notes added yet.</p>
                              ) : null}

                              {activeLesson.resources?.length ? (
                                <div className="grid gap-4">
                                  {activeLesson.resources.length > 1 && (
                                    <div className="grid gap-2 sm:flex sm:flex-wrap">
                                      {activeLesson.resources.map(resource => (
                                        <button
                                          key={resource.id}
                                          onClick={() => setActiveResourceId(resource.id)}
                                          className={`min-h-11 rounded-full border px-4 py-2 text-[12px] font-black transition-colors ${activeResourceId === resource.id ? 'border-[#31547A] bg-[#31547A] text-white' : 'border-[#D4B27E] bg-[#FFF4DF] text-[#5F3B20]'}`}
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
                          )}

                          {activeTab === 'qa' && (
                            <div id="qa" className="grid gap-4">
                              <div className="rounded-[14px] border border-[#E1C79A] bg-[#FFF4DF] p-5">
                                <h3 className="mb-3 flex items-center gap-2 text-[18px] font-black text-[#2D1A10]"><MessageCircle className="h-5 w-5" /> Lesson Discussion</h3>
                                <textarea
                                  value={questionText}
                                  onChange={event => setQuestionText(event.target.value)}
                                  placeholder="Ask your question about this video..."
                                  className="min-h-[96px] w-full rounded-xl border border-[#D4B27E] bg-white/80 px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#A23A24]"
                                />
                                <div className="mt-3 flex justify-end">
                                  <button onClick={postLessonQuestion} disabled={postingQuestion || !questionText.trim()} className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#31547A] px-5 py-3 text-[13px] font-black text-white disabled:opacity-50 sm:w-auto">
                                    <Send className="mr-2 inline h-4 w-4" /> Post Question
                                  </button>
                                </div>
                              </div>

                              <div className="grid gap-3">
                                {lessonQuestions.length ? lessonQuestions.map(question => (
                                  <div key={question.id} className="rounded-[14px] border border-[#E1C79A] bg-white/70 p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F3DEC0] text-[13px] font-black text-[#5F3B20]">
                                        {(question.profiles?.full_name || question.profiles?.email || 'S').charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-[14px] font-black">{question.profiles?.full_name || 'Student'}</p>
                                          {question.created_at && <p className="text-[12px] font-bold text-[#8A6A42]">{new Date(question.created_at).toLocaleDateString()}</p>}
                                        </div>
                                        <p className="mt-2 whitespace-pre-wrap text-[14px] font-semibold leading-6 text-[#5F4630]">{question.question_text}</p>
                                        {question.answer_text && (
                                          <div className="mt-3 rounded-xl bg-[#EEF3F8] p-3 text-[13px] font-semibold leading-6 text-[#31547A]">
                                            <span className="font-black">Instructor reply:</span> {question.answer_text}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )) : (
                                  <div className="rounded-[14px] border border-dashed border-[#D4B27E] bg-white/60 p-8 text-center">
                                    <MessageCircle className="mx-auto h-8 w-8 text-[#C6A475]" />
                                    <p className="mt-2 text-[14px] font-bold text-[#73563A]">No questions yet. Ask the first question for this lesson.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-[520px] place-items-center text-center">
                    <div>
                      <BookOpen className="mx-auto h-12 w-12 text-[#C6A475]" />
                      <h2 className="mt-3 text-[20px] font-black">Recorded lessons coming soon</h2>
                      <p className="mt-2 text-[14px] font-semibold text-[#73563A]">Your instructors are preparing this course library.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="order-3 hidden min-w-0 overflow-hidden border-l border-[#D2AE75] bg-[#F8EBD6]/70 px-3 py-4 xl:flex xl:h-screen xl:min-h-0 xl:flex-col xl:gap-3 2xl:px-4 2xl:py-5">
              <div className="relative min-h-[168px] shrink-0 2xl:min-h-[188px]">
                <div className="cinema-speech-card absolute left-0 -top-1 w-[116px] rounded-[12px] p-3 2xl:w-[128px] 2xl:p-3">
                  <p className="relative z-10 text-[12px] font-semibold leading-5 text-[#54351F] 2xl:text-[12px] 2xl:leading-5">Enjoy the show!<br />Take notes as you watch.</p>
                  <div className="relative z-10 mt-2.5 flex items-center justify-center gap-2 text-[#C88A24]">
                    <span className="h-px w-8 bg-[#C88A24]/50" />
                    <span>★</span>
                    <span className="h-px w-8 bg-[#C88A24]/50" />
                  </div>
                </div>
                <img
                  src={cinemaPopcornMascot}
                  alt=""
                  className="cinema-mascot-cutout absolute -bottom-1 -right-4 h-[170px] w-auto object-contain drop-shadow-[0_14px_22px_rgba(82,45,18,0.18)] 2xl:h-[178px]"
                  draggable={false}
                  onError={event => {
                    event.currentTarget.src = cinemaMascot;
                  }}
                />
              </div>

              <section className="cinema-paper-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] p-3.5 2xl:p-4">
                <div className="relative z-10 pb-2 text-center">
                  <h3 className="cinema-serif text-[18px] font-black uppercase tracking-[0.08em] text-[#3D2414] 2xl:text-[20px]">★ Hooty's Tip ★</h3>
                </div>
                <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between">
                  <img
                    src={cinemaNotesMascot}
                    alt=""
                    className="cinema-mascot-cutout mx-auto h-[180px] w-auto object-contain 3xl:h-[150px]"
                    draggable={false}
                    onError={event => {
                      event.currentTarget.src = cinemaPopcornMascot;
                    }}
                  />
                  <div className="mt-1 rounded-[16px] border border-[#E1C79A] bg-[#FFF9EF]/88 p-5.5 2xl:p-5">
                    <p className="text-[30px] italic leading-none text-[#A23A24] 2xl:text-[34px]" style={{ fontFamily: '"Brush Script MT", "Segoe Script",  cursive' }}>{activeTodayGoal?.title || "Today's Goal"}</p>
                    <p className="mt-2 text-[15px] font-semibold italic leading-5 text-[#2D1A10] 2xl:text-[16px] 2xl:leading-6" style={{ fontFamily: 'cursive' }}>
                      {activeTodayGoal?.goal_text || 'Learn how to identify the main idea and match headings correctly.'}
                    </p>
                    {(activeTodayGoal?.tip_text || !activeTodayGoal) && (
                      <p className="mt-2 text-[13px] font-semibold italic leading-5 text-[#2D1A10] 2xl:text-[14px] 2xl:leading-6" style={{ fontFamily: 'cursive' }}>
                        {activeTodayGoal?.tip_text || 'Focus on keywords and synonyms!'}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-center gap-3 text-[#C88A24]">
                      <span className="h-px w-16 bg-[#C88A24]/50" />
                      <span>★</span>
                      <span className="h-px w-16 bg-[#C88A24]/50" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="cinema-paper-panel mx-auto w-[92%] max-w-[270px] shrink-0 rounded-[18px] p-3 2xl:max-w-[286px] 2xl:p-3.5">
                <p className="cinema-serif relative z-10 mb-2.5 flex items-center gap-2.5 text-[16px] font-black uppercase tracking-[0.08em] text-[#2D1A10] 2xl:text-[17px]">
                  <img src={cinemaReelRing} alt="" className="cinema-ring-icon h-[22px] w-[22px] object-contain" draggable={false} /> Next Feature
                </p>
                {cinemaNextLesson ? (
                  <button
                    onClick={() => {
                      setActiveLessonId(cinemaNextLesson.id);
                      if (activeSection) setSearchParams({ section: activeSection.slug, lesson: cinemaNextLesson.id });
                    }}
                    className="relative z-10 flex min-h-11 w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <h3 className="cinema-serif text-[18px] font-black leading-tight text-[#2D1A10] 2xl:text-[20px]">{cinemaNextLesson.title}</h3>
                      <p className="mt-1 text-[13px] font-semibold text-[#2D1A10]">{getLessonDurationLabel(cinemaNextLesson)}</p>
                    </div>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#B93122] text-white shadow-[0_8px_18px_rgba(137,41,27,0.25)] 2xl:h-[48px] 2xl:w-[48px]">
                      <Play className="ml-1 h-5 w-5 fill-current" />
                    </span>
                  </button>
                ) : (
                  <p className="relative z-10 text-[13px] font-semibold text-[#6E543A]">You are at the end of today's programme.</p>
                )}
                {activeLesson && (
                  <div className="relative z-10 mt-3 border-t border-[#D6B27D]/70 pt-3">
                    <h3 className="cinema-serif mb-2 flex items-center gap-2.5 text-[16px] font-black text-[#2D1A10] 2xl:text-[17px]">
                      <FileText className="h-4.5 w-4.5" /> Resources
                    </h3>
                    <div className="grid gap-1.5">
                      {activeLesson.resources?.length ? activeLesson.resources.map(resource => {
                        const href = resolveStorageUrl(resource.resource_file || resource.resource_url, 'uploads');
                        return (
                          <a key={resource.id} href={href} target="_blank" rel="noreferrer" className="cinema-button-paper flex min-h-11 items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-[11px] font-black leading-tight text-[#5F3B20] hover:border-[#A23A24]">
                            {resource.title}
                            <Download className="h-4 w-4" />
                          </a>
                        );
                      }) : (
                        <>
                          <p className="cinema-button-paper flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-black leading-tight text-[#5F3B20]">
                            <Download className="h-4 w-4" /> Download worksheet
                          </p>
                          <p className="cinema-button-paper flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-black leading-tight text-[#5F3B20]">
                            <FileText className="h-4 w-4" /> Lesson transcript
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </aside>
          </main>
          <div className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 gap-2 border-t border-[#D2AE75] bg-[#FFF7E7]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(89,52,23,0.16)] backdrop-blur xl:hidden">
            <button
              type="button"
              disabled={!cinemaPrevLesson}
              onClick={() => {
                if (!cinemaPrevLesson || !activeSection) return;
                setActiveLessonId(cinemaPrevLesson.id);
                setSearchParams({ section: activeSection.slug, lesson: cinemaPrevLesson.id });
              }}
              className="flex min-h-11 items-center justify-center rounded-xl border border-[#D6B27D] bg-white/80 px-3 text-[12px] font-black text-[#5F3B20] disabled:opacity-45"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={markComplete}
              disabled={!activeLesson}
              className="flex min-h-11 items-center justify-center rounded-xl bg-[#31547A] px-3 text-[12px] font-black text-white disabled:opacity-45"
            >
              {activeLesson?.progress?.completed ? 'Completed' : 'Complete'}
            </button>
            <button
              type="button"
              disabled={!cinemaNextLesson}
              onClick={() => {
                if (!cinemaNextLesson || !activeSection) return;
                setActiveLessonId(cinemaNextLesson.id);
                setSearchParams({ section: activeSection.slug, lesson: cinemaNextLesson.id });
              }}
              className="flex min-h-11 items-center justify-center rounded-xl bg-[#B93122] px-3 text-[12px] font-black text-white disabled:opacity-45"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );

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
              {activeSection?.lessons?.length ? activeSection?.lessons?.map((lesson, index) => {
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
                  <h2 className="mt-2 text-[26px] font-black">{activeLesson?.title}</h2>
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
                        title={activeLesson?.title}
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
                        <h2 className="text-[25px] font-black">{activeLesson?.title}</h2>
                        {activeLesson?.description && <p className="mt-3 max-w-3xl text-[15px] font-semibold leading-7 text-slate-600">{activeLesson?.description}</p>}
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
                      {activeLesson?.notes ? (
                        <div className="mb-5 rounded-2xl bg-[#F8FAFC] p-5 whitespace-pre-wrap text-[14px] font-semibold leading-7 text-slate-600">{activeLesson?.notes}</div>
                      ) : !activeLesson?.resources?.length ? (
                        <p className="text-[14px] font-semibold text-slate-500">No written notes added yet. Admin can add them from Written Notes and save the lesson.</p>
                      ) : null}

                      {activeLesson?.resources?.length ? (
                        <div className="grid gap-4">
                          {(activeLesson?.resources?.length || 0) > 1 && (
                            <div className="flex flex-wrap gap-2">
                              {activeLesson?.resources?.map(resource => (
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

                          {activeResource?.id && (
                            <NotesPdfReader title={activeResource?.title || ''} resourceId={activeResource?.id || ''} token={token} />
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
    <div className="flex min-h-screen bg-[#FBF2E6] pb-24 font-sans text-[#05162E] lg:pb-0" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <StudentSidebar variant="cinema" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="relative min-w-0 flex-1 border-[#DED2C2] lg:border-l lg:before:pointer-events-none lg:before:absolute lg:before:left-[8px] lg:before:top-0 lg:before:z-20 lg:before:h-full lg:before:w-px lg:before:bg-[#E9DCCB]">
        <div
          className="relative min-h-screen overflow-hidden bg-[#FFF8ED] bg-cover bg-center p-4 sm:p-5 lg:p-8"
          style={{ backgroundImage: "url('/images/Recorded%20Courses/background.png')" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[#FFF8ED]/70" />
          {!isCourseOpen ? (
            <div className="relative z-10 grid gap-5">
              <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl border border-[#D7C2A3] bg-[#FFF8EE]/88 text-[13px] font-black text-[#3D2418] shadow-sm lg:hidden"
                >
                  Course Menu
                </button>
                <label className="flex min-h-[52px] w-full items-center gap-3 rounded-[18px] border border-[#D7C2A3] bg-[#FFF8EE]/88 px-4 text-[#5E3E2B] shadow-[0_8px_20px_rgba(88,56,35,0.10)] backdrop-blur sm:h-[58px] sm:w-[min(100%,560px)] sm:px-6">
                  <Search className="h-7 w-7" />
                  <input className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none placeholder:text-[#8D735F]" placeholder="Search for lessons..." />
                </label>
                <div className="flex items-center justify-end gap-3">
                <button className="relative grid h-[52px] w-[52px] place-items-center rounded-full border border-[#D7C2A3] bg-[#FFF8EE]/88 text-[#3D2418] shadow-[0_8px_20px_rgba(88,56,35,0.10)] sm:h-[58px] sm:w-[58px]">
                  <Bell className="h-6 w-6" />
                  <span className="absolute right-3 top-3 h-3.5 w-3.5 rounded-full bg-[#E84332] ring-2 ring-[#FFF8EE]" />
                </button>
                <div className="flex items-center gap-2 border-l border-[#D7C2A3] pl-3 sm:pl-4">
                  <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#EADBC5] text-[22px] font-black text-[#2E1D14] shadow-sm sm:h-[58px] sm:w-[58px]">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <ChevronDown className="h-5 w-5 text-[#5E3E2B]" />
                </div>
                </div>
              </section>

              <section className="h-[168px] overflow-hidden rounded-[20px] shadow-[0_12px_24px_rgba(76,48,29,0.12)] sm:h-[210px] lg:aspect-[2934/786] lg:h-auto lg:rounded-[24px]">
                <img src="/images/Recorded%20Courses/header.png" alt="IELTS recorded courses" loading="lazy" className="block h-full w-full scale-[1.02] select-none object-cover object-center brightness-[1.12] sm:scale-[1.01] lg:scale-[1.018]" draggable={false} />
              </section>

              <section>
                <div className="mb-4 sm:mb-5">
                  <h1 className="flex flex-col gap-1 break-words text-[22px] font-black leading-tight tracking-tight text-[#05162E] sm:flex-row sm:items-center sm:gap-4 sm:text-[28px]">
                    Explore by Section
                    <span className="text-[18px] font-black text-[#C56832] sm:text-[20px]">~ ★ ~</span>
                  </h1>
                  <p className="mt-2 text-[14px] font-semibold leading-6 text-[#6F6257] sm:text-[15px]">Choose a section and start watching expert video lessons.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-5">
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
                        className="group flex min-h-11 w-full overflow-hidden rounded-[12px] bg-[#F2D9B5] text-left shadow-[0_10px_22px_rgba(76,48,29,0.15)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(76,48,29,0.20)] sm:block"
                      >
                        <div className="relative h-[116px] w-[42%] shrink-0 overflow-hidden sm:h-auto sm:w-full sm:aspect-[464/572]">
                          <img src={poster.image} alt={section.title} loading="lazy" className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.04] sm:scale-[1.04] sm:group-hover:scale-[1.07]" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 bg-[#F0D5AB] px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3.5 xl:px-4">
                          <Icon className={`h-6 w-6 shrink-0 sm:h-7 sm:w-7 ${poster.accent}`} />
                          <div className="min-w-0">
                            <span className="block break-words text-[17px] font-black leading-tight text-[#3E2B1D] sm:hidden">{section.title}</span>
                            <span className="block text-[14px] font-semibold text-[#3E2B1D] sm:text-[16px] xl:text-[15px]">{section.lessons.length} Lessons</span>
                          </div>
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
      <MobileBottomNav />
    </div>
  );
}

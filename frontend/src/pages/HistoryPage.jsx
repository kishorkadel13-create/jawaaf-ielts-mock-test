import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import StudentSidebar from '../components/StudentSidebar';
import NotificationBell from '../components/NotificationBell';
import { getStoredStreakData } from '../utils/streak.js';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Eye,
  Flame,
  Headphones,
  History,
  Menu,
  MoreVertical,
  PenLine,
  PlayCircle,
  Trophy,
} from 'lucide-react';

const getPrimarySection = (attempt) => attempt.sections?.[0] || null;

const getAttemptLabel = (attempt) => {
  const section = getPrimarySection(attempt);
  const sectionText = `${attempt.mock_tests?.title || ''} ${section?.title || ''}`.toLowerCase();

  if (attempt.attempt_mode === 'mock') return 'Full Mock Test';
  if (section?.type === 'writing' && /task\s*1/.test(sectionText)) return 'Writing Task 1 Practice';
  if (section?.type === 'writing' && /task\s*2/.test(sectionText)) return 'Writing Task 2 Practice';
  if (section?.type === 'writing') return 'Writing Practice';
  if (section?.type === 'listening') return 'Listening Practice';
  return 'Reading Practice';
};

const getAttemptIcon = (attempt) => {
  const section = getPrimarySection(attempt);
  if (attempt.attempt_mode === 'mock') return <ClipboardList className="h-5 w-5" />;
  if (section?.type === 'writing') return <PenLine className="h-5 w-5" />;
  if (section?.type === 'listening') return <Headphones className="h-5 w-5" />;
  return <BookOpen className="h-5 w-5" />;
};

const getWritingTaskKind = (attempt) => {
  const section = getPrimarySection(attempt);
  const sectionText = `${attempt.mock_tests?.title || ''} ${section?.title || ''}`.toLowerCase();

  if (/task\s*1/.test(sectionText)) return 'task-1';
  if (/task\s*2/.test(sectionText)) return 'task-2';
  if ((attempt.writing_task_count || 0) >= 2) return 'both';
  if (section?.type === 'writing' || attempt.writing_task_count > 0) return 'task-1';
  return null;
};

const getWritingTaskCards = (attempt) => {
  const kind = getWritingTaskKind(attempt);
  if (!kind) return [];

  const status = getStatus(attempt);
  const baseCards = [
    {
      key: 'task-1',
      title: 'Writing Task 1',
      subtitle: 'Charts, maps, process, letter response',
      time: '20 min',
      accent: '#1F55D6',
      softBg: 'bg-[#EFF4FB]',
      border: 'border-[#1F55D6]/20',
      to: `/attempts/${attempt.id}/writing-task-1-feedback`,
    },
    {
      key: 'task-2',
      title: 'Writing Task 2',
      subtitle: 'Essay response with examiner feedback',
      time: '40 min',
      accent: '#7C3AED',
      softBg: 'bg-violet-50',
      border: 'border-violet-200',
      to: `/attempts/${attempt.id}/writing-task-2-feedback`,
    },
  ];

  return baseCards
    .filter(card => kind === 'both' || card.key === kind)
    .map(card => ({
      ...card,
      statusLabel: attempt.review_status === 'teacher_review_pending' ? 'Pending review' : 'Feedback ready',
      scoreLabel: status.scoreLabel,
    }));
};

const getStatus = (attempt) => {
  if (attempt.review_status === 'teacher_review_pending') {
    return {
      label: 'Teacher review pending',
      className: 'bg-[#FFF3F2] text-[#EE6055] border-[#EE6055]/20',
      scoreLabel: 'Pending',
    };
  }

  if (attempt.review_status === 'reviewed') {
    return {
      label: 'Teacher reviewed',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      scoreLabel: attempt.feedback?.band_score ? `Band ${Number(attempt.feedback.band_score).toFixed(1)}` : 'Reviewed',
    };
  }

  return {
    label: 'Auto graded',
    className: 'bg-[#EFF4FB] text-[#294b77] border-[#294b77]/10',
    scoreLabel: `Band ${Number(attempt.score || 0).toFixed(1)}`,
  };
};

const getAttemptDescription = (attempt) => {
  const section = getPrimarySection(attempt);
  const rawDescription = attempt.mock_tests?.description;

  if (typeof rawDescription === 'string' && rawDescription.trim()) {
    const trimmed = rawDescription.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.chartCategory) return parsed.chartCategory;
        if (parsed?.text) return parsed.text;
      } catch {
        return section?.title || getAttemptLabel(attempt);
      }
    }

    return trimmed;
  }

  return section?.title || getAttemptLabel(attempt);
};

const getScoreValue = (attempt) => {
  if (attempt.review_status === 'teacher_review_pending') return null;
  return Number(attempt.feedback?.band_score || attempt.score || 0);
};

const getAccentTheme = (index) => {
  const themes = [
    {
      name: 'blue',
      text: 'text-[#294b77]',
      bg: 'bg-[#EFF6FF]',
      iconBg: 'bg-[#EFF6FF]',
      badge: 'bg-[#EAF3FF] text-[#294b77]',
      line: 'bg-[#294b77]',
      scoreBg: 'bg-[#F3F8FF]',
      button: 'bg-[#0F4B7D] hover:bg-[#0A3A63]',
      progress: 'bg-[#1F7AE0]',
      soft: 'bg-[#DDEEFF]',
    },
    {
      name: 'green',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-50',
      badge: 'bg-emerald-50 text-emerald-700',
      line: 'bg-emerald-600',
      scoreBg: 'bg-emerald-50',
      button: 'bg-emerald-600 hover:bg-emerald-700',
      progress: 'bg-emerald-600',
      soft: 'bg-emerald-100',
    },
    {
      name: 'purple',
      text: 'text-violet-700',
      bg: 'bg-violet-50',
      iconBg: 'bg-violet-50',
      badge: 'bg-violet-50 text-violet-700',
      line: 'bg-violet-600',
      scoreBg: 'bg-violet-50',
      button: 'bg-violet-600 hover:bg-violet-700',
      progress: 'bg-violet-600',
      soft: 'bg-violet-100',
    },
  ];

  return themes[index % themes.length];
};

const getDisplayName = (profile) => {
  const name = String(profile?.full_name || profile?.email?.split('@')[0] || 'Student').trim();
  return name || 'Student';
};

const getFirstName = (profile) => getDisplayName(profile).split(/\s+/)[0] || 'Student';

const getInitial = (profile) => getDisplayName(profile).charAt(0).toUpperCase() || 'S';

const getAttemptDate = (attempt) => {
  const rawDate = attempt.submitted_at || attempt.created_at;
  const date = rawDate ? new Date(rawDate) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

export default function HistoryPage() {
  const { profile } = useAuthStore();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeWritingTaskFilter, setActiveWritingTaskFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [streakData, setStreakData] = useState({ activeDates: [], currentStreak: 0 });

  useEffect(() => {
    if (!profile?.id) return;
    setStreakData(getStoredStreakData(profile.id));
  }, [profile?.id]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/attempts/history');
        setAttempts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to retrieve attempts history:', err);
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredAttempts = useMemo(() => attempts
    .filter((attempt) => {
      const section = getPrimarySection(attempt);
      const matchesBaseFilter = (() => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'mock') return attempt.attempt_mode === 'mock';
        if (activeFilter === 'practice') return attempt.attempt_mode === 'practice';
        return section?.type === activeFilter;
      })();

      if (!matchesBaseFilter) return false;
      if (activeFilter !== 'writing' || activeWritingTaskFilter === 'all') return true;

      const taskCards = getWritingTaskCards(attempt);
      return taskCards.some(card => card.key === activeWritingTaskFilter);
    })
    .sort((first, second) => {
      const firstTime = getAttemptDate(first)?.getTime() || 0;
      const secondTime = getAttemptDate(second)?.getTime() || 0;
      return sortOrder === 'newest' ? secondTime - firstTime : firstTime - secondTime;
    }), [activeFilter, activeWritingTaskFilter, attempts, sortOrder]);

  const reviewedCount = attempts.filter(attempt => attempt.review_status !== 'teacher_review_pending').length;
  const pendingCount = attempts.filter(attempt => attempt.review_status === 'teacher_review_pending').length;
  const scoreAttempts = attempts.filter(attempt => attempt.review_status !== 'teacher_review_pending');
  const bestScore = scoreAttempts.length
    ? Math.max(...scoreAttempts.map(attempt => Number(attempt.feedback?.band_score || attempt.score || 0))).toFixed(1)
    : '0.0';

  const filters = [
    ['all', 'All'],
    ['mock', 'Mock'],
    ['practice', 'Practice'],
    ['reading', 'Reading'],
    ['listening', 'Listening'],
    ['writing', 'Writing'],
  ];

  const writingTaskFilters = [
    ['all', 'All Writing', 'All reviewed and pending writing attempts'],
    ['task-1', 'Writing Task 1', 'Report and visual response feedback'],
    ['task-2', 'Writing Task 2', 'Essay feedback and band descriptors'],
  ];

  const averageBand = scoreAttempts.length
    ? (scoreAttempts.reduce((sum, attempt) => sum + Number(attempt.feedback?.band_score || attempt.score || 0), 0) / scoreAttempts.length).toFixed(1)
    : '0.0';
  const completedCount = attempts.filter(attempt => attempt.status === 'completed' || attempt.submitted_at).length;

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#F6F9FE] text-[#071A36]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <StudentSidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="relative flex min-h-[86px] items-center justify-between overflow-hidden border-b border-[#E7EDF7] bg-white px-5 py-4 shadow-sm lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button type="button" className="grid h-11 w-11 place-items-center rounded-2xl text-[#294b77] transition-colors hover:bg-[#EFF4FB]">
              <Menu className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-[20px] font-black tracking-tight text-[#071A36]">Hi, {getFirstName(profile)}! <span aria-hidden="true">👋</span></h2>
              <p className="mt-0.5 truncate text-[13px] font-bold text-[#71819A]">Let's make today's practice count.</p>
            </div>
          </div>

          <div className="pointer-events-none absolute left-[28%] right-[20%] top-2 hidden h-20 opacity-45 lg:block">
            <BookOpen className="absolute left-[22%] top-5 h-10 w-10 rotate-[-8deg] text-[#DBE8FA]" />
            <PenLine className="absolute right-[18%] top-3 h-9 w-9 rotate-12 text-[#DBE8FA]" />
            <ClipboardList className="absolute left-[2%] top-0 h-10 w-10 rotate-[-18deg] text-[#DBE8FA]" />
            <div className="absolute left-[9%] right-[8%] top-9 border-t-2 border-dashed border-[#DDE9FA]"></div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden h-14 items-center gap-3 rounded-2xl border border-[#E7EDF7] bg-white px-4 shadow-sm sm:flex">
              <Flame className="h-7 w-7 text-orange-500" />
              <div>
                <p className="text-[18px] font-black leading-none text-[#071A36]">{streakData.currentStreak}</p>
                <p className="mt-1 text-[10px] font-black text-[#71819A]">Day Streak</p>
              </div>
            </div>
            <button type="button" className="grid h-11 w-11 place-items-center rounded-2xl text-[#294b77] transition-colors hover:bg-[#EFF4FB]">
              <CalendarDays className="h-5 w-5" />
            </button>
            <NotificationBell />
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#294b77] text-[15px] font-black text-white shadow-sm">{getInitial(profile)}</div>
          </div>
        </header>

        <div className="relative mx-auto grid w-full max-w-[1600px] gap-5 px-5 py-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <BookOpen className="absolute left-10 top-32 h-12 w-12 rotate-[-22deg] text-[#E4EEFB]" />
            <ClipboardList className="absolute right-[37%] top-56 h-12 w-12 rotate-6 text-[#E4EEFB]" />
            <div className="absolute left-[46%] top-72 h-24 w-24 rounded-full border-2 border-dashed border-[#DDE9FA] opacity-70"></div>
          </div>

          <section className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_450px]">
            <div className="grid min-w-0 gap-5">
              <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4 pt-2">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl border border-[#DDE8F6] bg-[#F3F7FE] text-[#294b77] shadow-sm">
                    <History className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="whitespace-nowrap text-[30px] font-black leading-none tracking-tight text-[#071A36] sm:text-[34px]">Results &amp; History</h1>
                    <p className="mt-4 max-w-[300px] text-[13px] font-bold leading-6 text-[#60718D]">
                      Track your progress, review your performance, and keep improving every day.
                    </p>
                  </div>
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-4 lg:flex lg:justify-end lg:gap-4">
                  {[
                    { label: 'Total Attempts', value: attempts.length, icon: ClipboardList, color: 'text-[#1F7AE0]', bg: 'bg-[#EFF6FF]' },
                    { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pending Review', value: pendingCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Average Band', value: averageBand, icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50' },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="flex h-[140px] w-full flex-col justify-center rounded-3xl border border-[#E3EAF5] bg-white px-2 py-3 text-center shadow-[0_10px_28px_rgba(15,42,76,0.06)] sm:w-[90px]">
                        <div className={`mx-auto grid h-10 w-10 place-items-center rounded-2xl ${stat.bg} ${stat.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className={`mt-3 text-[9px] font-black uppercase leading-3 tracking-[0.06em] ${stat.color}`}>{stat.label}</p>
                        <p className="mt-2 text-[24px] font-black leading-none text-[#071A36]">{stat.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex w-full flex-wrap gap-3 rounded-3xl border border-[#E3EAF5] bg-white p-3 shadow-[0_10px_28px_rgba(15,42,76,0.06)] lg:w-fit">
                {filters.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveFilter(key);
                      if (key !== 'writing') setActiveWritingTaskFilter('all');
                    }}
                    className={`min-h-10 rounded-2xl px-5 text-[13px] font-black transition-all ${
                      activeFilter === key
                        ? 'bg-[#294b77] text-white shadow-sm'
                        : 'bg-[#F7F9FC] text-[#71819A] hover:bg-[#EFF4FB] hover:text-[#294b77]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <aside className="relative overflow-hidden rounded-[28px] border border-[#E3EAF5] bg-white p-6 shadow-[0_14px_36px_rgba(15,42,76,0.08)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,196,87,0.16),transparent_24%),radial-gradient(circle_at_86%_12%,rgba(124,58,237,0.10),transparent_18%)]"></div>
              <div className="relative grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
                <div className="relative mx-auto h-36 w-36 sm:h-40 sm:w-40">
                  <img
                    src="/images/Reading Practice/hooty's moscot-clean.png"
                    alt="Jawaaf mascot"
                    className="h-full w-full object-contain drop-shadow-[0_16px_18px_rgba(15,42,76,0.16)]"
                  />
                  <Trophy className="absolute right-1 top-7 h-10 w-10 text-amber-400 drop-shadow" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[12px] font-black uppercase tracking-[0.1em] text-[#071A36]">Best Band Score</p>
                  <p className="mt-3 bg-gradient-to-r from-violet-700 to-[#7C3AED] bg-clip-text text-[56px] font-black leading-none text-transparent">{bestScore}</p>
                  <p className="mt-4 text-[14px] font-bold leading-6 text-[#60718D]">You're getting closer to your dream score!</p>
                  <Link to="/history" className="mt-5 inline-flex min-h-11 items-center justify-center gap-3 rounded-2xl bg-violet-700 px-6 text-[13px] font-black text-white shadow-[0_12px_22px_rgba(124,58,237,0.24)] transition-colors hover:bg-violet-800">
                    View Certificate <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </aside>
          </section>

          {activeFilter === 'writing' && (
            <section className="relative grid gap-3 lg:grid-cols-3">
              {writingTaskFilters.map(([key, label, description]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveWritingTaskFilter(key)}
                  className={`rounded-3xl border p-4 text-left transition-all ${
                    activeWritingTaskFilter === key
                      ? 'border-[#294b77] bg-[#294b77] text-white shadow-lg shadow-[#294b77]/15'
                      : 'border-[#E3EAF5] bg-white text-[#071A36] hover:border-[#294b77]/40'
                  }`}
                >
                  <p className="text-[15px] font-black">{label}</p>
                  <p className={`mt-1 text-[12px] font-bold leading-5 ${activeWritingTaskFilter === key ? 'text-white/75' : 'text-[#71819A]'}`}>{description}</p>
                </button>
              ))}
            </section>
          )}

          <section className="relative grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-[20px] font-black text-[#071A36]">
                <span className="text-[#EE6055]">▱</span> Recent Attempts
              </h2>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="min-h-11 w-fit rounded-2xl border border-[#E3EAF5] bg-white px-5 text-[13px] font-black text-[#294b77] shadow-sm outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {loading ? (
              <div className="grid min-h-[260px] place-items-center rounded-[28px] border border-[#E3EAF5] bg-white shadow-sm">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E7EDF7] border-t-[#294b77]"></div>
              </div>
            ) : filteredAttempts.length === 0 ? (
              <div className="rounded-[28px] border border-[#E3EAF5] bg-white p-14 text-center shadow-sm">
                <History className="mx-auto mb-4 h-12 w-12 text-[#B9C7DA]" />
                <h3 className="text-lg font-black text-[#071A36]">No results found</h3>
                <p className="mt-2 text-sm font-semibold text-[#71819A]">Completed attempts will appear here after submission.</p>
                <Link to="/tests?mode=practice" className="mt-6 inline-flex rounded-2xl bg-[#294b77] px-5 py-3 text-sm font-black text-white hover:bg-[#1E3A6E]">
                  Start Practice
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredAttempts.map((attempt, index) => {
                  const section = getPrimarySection(attempt);
                  const status = getStatus(attempt);
                  const submittedDate = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
                  const dateText = submittedDate && !Number.isNaN(submittedDate.getTime())
                    ? submittedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Date unavailable';
                  const submittedTime = submittedDate && !Number.isNaN(submittedDate.getTime())
                    ? submittedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '--:--';
                  const duration = attempt.mock_tests?.duration || section?.duration || 0;
                  const totalQuestions = (attempt.objective_question_count || 0) + (attempt.writing_task_count || 0);
                  const theme = getAccentTheme(index);
                  const scoreValue = getScoreValue(attempt);
                  const scorePercent = scoreValue === null ? 28 : Math.min(100, Math.max(6, (scoreValue / 9) * 100));

                  return (
                    <article key={attempt.id} className="overflow-hidden rounded-[26px] border border-[#E3EAF5] bg-white shadow-[0_10px_28px_rgba(15,42,76,0.06)]">
                      <div className={`h-1.5 w-full ${theme.line}`}></div>
                      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)_minmax(250px,0.52fr)] lg:items-center">
                        <div className="flex min-w-0 gap-5">
                          <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-full border border-current/10 ${theme.iconBg} ${theme.text}`}>
                            {getAttemptIcon(attempt)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-xl px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] ${theme.badge}`}>
                                {getAttemptLabel(attempt)}
                              </span>
                              <span className="rounded-xl border border-[#DDE8F6] bg-[#F3F7FE] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#60718D]">
                                {status.label}
                              </span>
                            </div>
                            <h3 className="mt-3 line-clamp-2 text-[20px] font-black leading-tight text-[#071A36]">{attempt.mock_tests?.title || 'Untitled test'}</h3>
                            <p className="mt-2 line-clamp-1 text-[14px] font-bold text-[#60718D]">
                              {getAttemptDescription(attempt)}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-black text-[#71819A]">
                              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {dateText}</span>
                              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {duration} min</span>
                              <span className="flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4" /> {totalQuestions} Questions</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 items-start gap-0 px-1">
                          {[
                            { label: 'Started', time: submittedTime, icon: PlayCircle, color: theme.text, bg: theme.bg },
                            { label: 'Submitted', time: submittedTime, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: attempt.review_status === 'teacher_review_pending' ? 'Reviewed' : 'Reviewed', time: attempt.review_status === 'teacher_review_pending' ? 'Pending' : submittedTime, icon: Eye, color: attempt.review_status === 'teacher_review_pending' ? 'text-amber-500' : theme.text, bg: attempt.review_status === 'teacher_review_pending' ? 'bg-amber-50' : theme.bg },
                          ].map((step, stepIndex) => {
                            const Icon = step.icon;
                            return (
                              <div key={step.label} className="relative grid justify-items-center text-center">
                                {stepIndex < 2 && <div className="absolute left-1/2 top-5 h-px w-full bg-[#DDE8F6]"></div>}
                                <div className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border border-current/15 ${step.bg} ${step.color}`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <p className="mt-2 text-[12px] font-black text-[#071A36]">{step.label}</p>
                                <p className="mt-1 text-[12px] font-bold text-[#71819A]">{step.time}</p>
                              </div>
                            );
                          })}
                        </div>

                        <div className={`rounded-3xl ${theme.scoreBg} p-4`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={`text-[11px] font-black uppercase tracking-[0.08em] ${theme.text}`}>
                                {attempt.review_status === 'teacher_review_pending' ? 'Result Status' : 'IELTS Score'}
                              </p>
                              <p className="mt-2 text-[28px] font-black leading-none text-[#294b77]">{status.scoreLabel}</p>
                            </div>
                            <MoreVertical className="h-5 w-5 text-[#294b77]" />
                          </div>
                          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#DDE8F6]">
                            <div className={`h-full rounded-full ${theme.progress}`} style={{ width: `${scorePercent}%` }}></div>
                          </div>
                          <Link
                            to={`/attempts/${attempt.id}/result`}
                            className={`mt-5 flex min-h-11 items-center justify-center gap-3 rounded-2xl px-4 text-[13px] font-black text-white shadow-sm transition-colors ${theme.button}`}
                          >
                            {attempt.review_status === 'teacher_review_pending' ? 'View Submission' : 'Review Result'} <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

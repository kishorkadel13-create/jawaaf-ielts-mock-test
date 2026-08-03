import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import StudentSidebar from '../components/StudentSidebar';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  Headphones,
  History,
  MessageSquareText,
  PenLine,
  Timer,
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

export default function HistoryPage() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeWritingTaskFilter, setActiveWritingTaskFilter] = useState('all');

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

  const filteredAttempts = useMemo(() => attempts.filter((attempt) => {
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
  }), [activeFilter, activeWritingTaskFilter, attempts]);

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

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <StudentSidebar />

      <main className="grid min-w-0 flex-1 gap-7 px-6 py-8 lg:px-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF4FB] text-[#294b77]">
                <History className="h-6 w-6" />
              </div>
              <h1 className="text-[30px] font-black tracking-tight text-[#05162E]">Results</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                View every completed mock and practice attempt with score, review status, and teacher feedback.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Attempts</p>
                <p className="mt-1 text-2xl font-black text-[#05162E]">{attempts.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Reviewed</p>
                <p className="mt-1 text-2xl font-black text-[#05162E]">{reviewedCount}</p>
              </div>
              <div className="rounded-xl border border-[#EE6055]/15 bg-[#FFF3F2] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#EE6055]">Pending</p>
                <p className="mt-1 text-2xl font-black text-[#05162E]">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {filters.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveFilter(key);
                  if (key !== 'writing') setActiveWritingTaskFilter('all');
                }}
                className={`rounded-xl px-4 py-2 text-[12px] font-black transition-colors ${
                  activeFilter === key
                    ? 'bg-[#294b77] text-white'
                    : 'bg-[#F8FAFC] text-slate-500 hover:bg-[#EFF4FB] hover:text-[#294b77]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeFilter === 'writing' && (
            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              {writingTaskFilters.map(([key, label, description]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveWritingTaskFilter(key)}
                  className={`group overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                    activeWritingTaskFilter === key
                      ? 'border-[#294b77] bg-[#294b77] text-white shadow-lg shadow-[#294b77]/15'
                      : 'border-slate-200 bg-[#F8FAFC] text-[#05162E] hover:border-[#294b77]/30 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                      activeWritingTaskFilter === key ? 'bg-white/15 text-white' : 'bg-white text-[#294b77]'
                    }`}>
                      <PenLine className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                      activeWritingTaskFilter === key ? 'bg-white/15 text-white' : 'bg-white text-slate-500'
                    }`}>
                      Tap
                    </span>
                  </div>
                  <p className="mt-4 text-[16px] font-black">{label}</p>
                  <p className={`mt-1 text-[12px] font-bold leading-5 ${
                    activeWritingTaskFilter === key ? 'text-slate-200' : 'text-slate-500'
                  }`}>
                    {description}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black text-[#05162E]">Attempt History</h2>
            <div className="hidden items-center gap-2 text-[12px] font-black text-slate-500 sm:flex">
              <Award className="h-4 w-4 text-[#294b77]" /> Best score {bestScore}
            </div>
          </div>

          {loading ? (
            <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#294b77]"></div>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">
              <History className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-black text-[#05162E]">No results found</h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">Completed attempts will appear here after submission.</p>
              <Link to="/tests?mode=practice" className="mt-6 inline-flex rounded-xl bg-[#294b77] px-5 py-3 text-sm font-black text-white hover:bg-[#1E3A6E]">
                Start Practice
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAttempts.map((attempt) => {
                const section = getPrimarySection(attempt);
                const status = getStatus(attempt);
                const submittedDate = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
                const dateText = submittedDate && !Number.isNaN(submittedDate.getTime())
                  ? submittedDate.toLocaleDateString()
                  : 'Date unavailable';
                const totalQuestions = (attempt.objective_question_count || 0) + (attempt.writing_task_count || 0);
                const writingTaskCards = getWritingTaskCards(attempt);

                return (
                  <article key={attempt.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-[#294b77]/30 hover:shadow-md">
                    <div className="h-1.5 w-full" style={{ background: 'linear-gradient(to right, #294b77 0%, #294b77 100%)' }}></div>
                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                      <div className="flex gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#EFF4FB] text-[#294b77]">
                          {getAttemptIcon(attempt)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-[#EFF4FB] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#294b77]">
                              {getAttemptLabel(attempt)}
                            </span>
                            <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${status.className}`}>
                              {status.label}
                            </span>
                          </div>
                          <h3 className="mt-3 truncate text-[18px] font-black text-[#05162E]">{attempt.mock_tests?.title || 'Untitled test'}</h3>
                          <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-6 text-slate-500">
                            {attempt.mock_tests?.description || section?.title || 'Completed IELTS practice attempt.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-bold text-slate-500">
                            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {dateText}</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {attempt.mock_tests?.duration || section?.duration || 0} min</span>
                            <span className="flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4" /> {totalQuestions} tasks/Qs</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Completed</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 rounded-2xl bg-[#F8FAFC] p-4">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                              {attempt.review_status === 'teacher_review_pending' ? 'Result status' : 'IELTS score'}
                            </p>
                            <p className={`mt-1 text-2xl font-black ${attempt.review_status === 'teacher_review_pending' ? 'text-[#EE6055]' : 'text-[#294b77]'}`}>
                              {status.scoreLabel}
                            </p>
                          </div>
                          {attempt.review_status === 'teacher_review_pending' && <Timer className="h-7 w-7 text-[#EE6055]" />}
                        </div>
                        <Link
                          to={`/attempts/${attempt.id}/result`}
                          className="flex items-center justify-center rounded-xl bg-[#294b77] px-4 py-3 text-[13px] font-black text-white hover:bg-[#1E3A6E]"
                        >
                          {attempt.review_status === 'teacher_review_pending' ? 'View Submission' : 'Review Result'}
                        </Link>
                      </div>
                    </div>

                    {writingTaskCards.length > 0 && (
                      <div className="border-t border-slate-100 bg-[#F8FAFC] p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#294b77]">Writing Feedback Pages</p>
                            <p className="mt-1 text-[12px] font-bold text-slate-500">Choose a task to open the dedicated feedback result.</p>
                          </div>
                          <MessageSquareText className="hidden h-5 w-5 text-[#294b77] sm:block" />
                        </div>

                        <div className={`grid gap-3 ${writingTaskCards.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                          {writingTaskCards.map((card) => (
                            <Link
                              key={`${attempt.id}-${card.key}`}
                              to={card.to}
                              className={`group relative overflow-hidden rounded-2xl border ${card.border} bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg`}
                            >
                              <div
                                className="absolute inset-x-0 top-0 h-1"
                                style={{ backgroundColor: card.accent }}
                              ></div>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 gap-3">
                                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${card.softBg}`} style={{ color: card.accent }}>
                                    <PenLine className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[17px] font-black text-[#05162E]">{card.title}</p>
                                    <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">{card.subtitle}</p>
                                  </div>
                                </div>
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F8FAFC] text-slate-500 transition-colors group-hover:bg-[#294b77] group-hover:text-white">
                                  <ArrowRight className="h-4 w-4" />
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-slate-100 bg-[#F8FAFC] px-3 py-2">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Score</p>
                                  <p className="mt-1 truncate text-[13px] font-black text-[#05162E]">{card.scoreLabel}</p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-[#F8FAFC] px-3 py-2">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Time</p>
                                  <p className="mt-1 text-[13px] font-black text-[#05162E]">{card.time}</p>
                                </div>
                                <div className={`rounded-xl border px-3 py-2 ${
                                  attempt.review_status === 'teacher_review_pending'
                                    ? 'border-[#EE6055]/15 bg-[#FFF3F2]'
                                    : 'border-emerald-100 bg-emerald-50'
                                }`}>
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Status</p>
                                  <p className={`mt-1 truncate text-[13px] font-black ${
                                    attempt.review_status === 'teacher_review_pending' ? 'text-[#EE6055]' : 'text-emerald-700'
                                  }`}>
                                    {card.statusLabel}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

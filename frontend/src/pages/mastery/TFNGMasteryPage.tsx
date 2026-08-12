import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronDown, Clock, Flame, Flag, GraduationCap, Highlighter, LoaderCircle, RotateCcw, Send, ShieldCheck, Star, Target, Trophy } from 'lucide-react';
import { api } from '../../services/api';
import { assets } from '../../config/assets';
import { useAuthStore } from '../../store/authStore';
import JawaafLogo from '../../components/JawaafLogo';
import NotificationBell from '../../components/NotificationBell';
import { applyHighlightTarget, getHighlightTarget, type HighlightTarget } from '../../utils/textHighlighter';

type PageMode = 'entry' | 'design' | 'practice' | 'feedback' | 'performance';

type TFNGMasteryPageProps = {
  mode: PageMode;
};

const answerOptions = ['TRUE', 'FALSE', 'NOT GIVEN'] as const;

type RecentActivityItem = {
  id?: string;
  title: string;
  score?: string;
  accuracy?: number;
  status?: string;
  submitted_at?: string;
  is_complete?: boolean;
};

const evolutionAssets = {
  animation: '/images/TGNG%20Evolution1/Animation.mp4',
  mascotGuide: '/images/TGNG%20Evolution1/moscot%202.png',
  mentorMascot: '/images/TGNG%20Evolution1/moscot1-cutout.png',
  journey: '/images/TGNG%20Evolution1/Hooty%27s%20journey.png'
};

const tfngFeedbackAssets = {
  mascotHero: '/images/TFNG%20feedback/moscot1-clean.png',
  mascotHelp: '/images/TFNG%20feedback/moscot2-clean.png',
  leaf: '/images/TFNG%20feedback/leaf-clean.png',
  light: '/images/TFNG%20feedback/light-clean.png',
  book: '/images/TFNG%20feedback/book-clean.png',
  completed: '/images/TFNG%20feedback/question%20completed-clean.png',
  attempted: '/images/TFNG%20feedback/question%20attempted-clean.png',
  tick: '/images/TFNG%20feedback/tick-clean.png',
  wrong: '/images/TFNG%20feedback/wrong-clean.png',
  target: '/images/TFNG%20feedback/target-clean.png'
};

const tfngPassFeedbackAssets = {
  mascot: '/images/TFNG%20Pass%20Feedback/moscot-clean.png',
  passed: '/images/TFNG%20Pass%20Feedback/pass-clean.png',
  cup: '/images/TFNG%20Pass%20Feedback/cup-clean.png',
  leaf: '/images/TFNG%20Pass%20Feedback/lead-clean.png',
  book: '/images/TFNG%20Pass%20Feedback/book-clean.png',
  completed: '/images/TFNG%20Pass%20Feedback/question%20completed-clean.png',
  attempted: '/images/TFNG%20Pass%20Feedback/question%20attempted-clean.png',
  tick: '/images/TFNG%20Pass%20Feedback/tick-clean.png',
  wrong: '/images/TFNG%20Pass%20Feedback/wrong-clean.png',
  target: '/images/TFNG%20Pass%20Feedback/target-clean.png'
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatFeedbackHtml = (value: string) => escapeHtml(value || '')
  .replace(/&lt;(\/?(strong|b|mark|em))&gt;/gi, '<$1>')
  .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
  .replace(/\n/g, '<br/>');

export default function TFNGMasteryPage({ mode }: TFNGMasteryPageProps) {
  const navigate = useNavigate();
  const { attemptId, passageAttemptId } = useParams();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [showStrategyCheck, setShowStrategyCheck] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const passageRef = useRef<HTMLDivElement>(null);
  const highlightTargetRef = useRef<HighlightTarget | null>(null);
  const [highlightCoords, setHighlightCoords] = useState<{ top: number; left: number } | null>(null);
  const [highlightedPassageHtml, setHighlightedPassageHtml] = useState('');
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        if (mode === 'entry') {
          const { data: startData } = await api.post('/mastery/tfng/start', { entry_only: true });
          if (startData?.next_page === 'complete_mastery' || startData?.next_page === 'coming_soon') {
            setData(startData);
            return;
          }
          const nextAttemptId = startData?.attempt?.id || startData?.attempt_id;
          if (startData?.attempt?.status === 'performance' || startData?.attempt?.status === 'failed_locked') {
            navigate(`/mastery/tfng/performance/${nextAttemptId}`, { replace: true });
            return;
          }
          navigate(`/mastery/tfng/design/${nextAttemptId}`, { replace: true });
          return;
        }

        if (mode === 'design' && attemptId) {
          const { data: designData } = await api.get(`/mastery/tfng/attempts/${attemptId}/design`);
          setData(designData);
          return;
        }

        if (mode === 'practice' && attemptId) {
          const { data: practiceData } = await api.get(`/mastery/tfng/attempts/${attemptId}/practice`);
          setData(practiceData);
          setAnswers({});
          setFlaggedQuestions({});
          setTimeRemaining(practiceData?.timer_seconds || 180);
          setHighlightedPassageHtml('');
          setHighlightCoords(null);
          highlightTargetRef.current = null;
          autoSubmittedRef.current = false;
          return;
        }

        if (mode === 'feedback' && passageAttemptId) {
          const { data: feedbackData } = await api.get(`/mastery/tfng/passage-attempts/${passageAttemptId}/feedback`);
          setData(feedbackData);
          setFeedbackIndex(0);
          setShowStrategyCheck(false);
          return;
        }

        if (mode === 'performance' && attemptId) {
          const { data: performanceData } = await api.get(`/mastery/tfng/attempts/${attemptId}/performance`);
          setData(performanceData);
        }
      } catch (err: any) {
        if (mode === 'practice' && attemptId && err.error === 'PerformanceRequired') {
          navigate(`/mastery/tfng/performance/${attemptId}`, { replace: true });
          return;
        }
        if (mode !== 'entry' && err.status === 404) {
          navigate('/mastery/tfng', { replace: true });
          return;
        }
        setError(err.message || 'TFNG Mastery is not ready yet. Please make sure the backend migration has been applied.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [attemptId, mode, navigate, passageAttemptId]);

  useEffect(() => {
    if (mode !== 'practice' || !data?.passage_attempt?.id || timeRemaining === null || submitting) return;
    if (timeRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setTimeRemaining(current => current === null ? current : Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [data?.passage_attempt?.id, mode, submitting, timeRemaining]);

  useEffect(() => {
    if (mode !== 'practice' || timeRemaining !== 0 || autoSubmittedRef.current || submitting) return;
    autoSubmittedRef.current = true;
    submitPractice(true);
  }, [mode, submitting, timeRemaining]);

  const pageTitle = useMemo(() => {
    if (mode === 'practice') return data?.passage?.title || 'TFNG Practice';
    if (mode === 'feedback') return 'Passage Feedback';
    if (mode === 'performance') return 'Overall Performance';
    return data?.evolution?.name || 'TFNG Mastery';
  }, [data, mode]);

  const feedbackQuestions = Array.isArray(data?.questions) ? data.questions : [];
  const practiceQuestions = Array.isArray(data?.questions) ? data.questions : [];
  const currentFeedbackQuestion = feedbackQuestions[feedbackIndex] || null;
  const isLastFeedbackQuestion = feedbackIndex >= feedbackQuestions.length - 1;
  const quickStrategyCheck = String(data?.passage?.quick_strategy_check || '').trim();
  const hasPassedLevel = (data?.summary?.accuracy || 0) >= 60 || data?.summary?.decision === 'unlock_next';
  const studentName = String(profile?.full_name || profile?.email?.split('@')[0] || 'Sagun').trim();
  const firstName = studentName.split(' ')[0] || 'Sagun';
  const studentInitial = firstName.charAt(0).toUpperCase() || 'S';
  const currentPassageOrder = Math.max(1, Number(data?.progress?.current_passage_order || data?.passage_attempt?.passage_order || 1));
  const totalPassages = Math.max(1, Number(data?.progress?.total_passages || data?.attempt?.total_passages || data?.passage_attempt?.evolution_attempt?.total_passages || 1));
  const answeredCount = Object.keys(answers).filter(questionId => Boolean(answers[questionId])).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  const unansweredCount = Math.max(0, practiceQuestions.length - answeredCount);
  const dayStreak = Math.max(0, Number(data?.day_streak ?? data?.student_progress?.day_streak ?? 7));
  const evolutionName = data?.attempt?.evolution?.name || data?.evolution?.name || data?.passage_attempt?.evolution_attempt?.evolution?.name || 'Egg Hooty';
  const evolutionNo = data?.attempt?.evolution?.evolution_number || data?.evolution?.evolution_number || data?.passage_attempt?.evolution_attempt?.evolution?.evolution_number || 1;
  const nextEvolutionName = data?.next_evolution?.name || 'Baby Hooty';
  const evolutionProgress = Math.min(100, Math.max(0, Math.round(((currentPassageOrder - 1) / totalPassages) * 100)));
  const totalQuestionSlots = practiceQuestions.length;
  const questionInstruction = data?.passage?.instruction || 'Do the following statements agree with the information given in Reading Passage?';

  const formatTime = (seconds: number | null | undefined) => {
    const safeSeconds = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  };

  const formatLongTime = (seconds: number | null | undefined) => {
    const safeSeconds = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
  };

  const continueFromDesign = async () => {
    if (!attemptId) return;
    await api.post(`/mastery/tfng/attempts/${attemptId}/continue`);
    navigate(`/mastery/tfng/practice/${attemptId}`);
  };

  const submitPractice = async (expired = false) => {
    const passageAttempt = data?.passage_attempt;
    if (!passageAttempt?.id) return;
    try {
      setSubmitting(true);
      const { data: feedbackData } = await api.post(`/mastery/tfng/passage-attempts/${passageAttempt.id}/submit`, {
        answers,
        expired,
        time_used_seconds: Math.max(0, (data?.timer_seconds || 180) - (timeRemaining ?? data?.timer_seconds ?? 180))
      });
      setData(feedbackData);
      navigate(`/mastery/tfng/feedback/${passageAttempt.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const continueFromFeedback = async () => {
    const nextAction = data?.next_action;
    const parentAttemptId = data?.passage_attempt?.evolution_attempt_id;
    if (!parentAttemptId) return;
    if (nextAction === 'performance') {
      navigate(`/mastery/tfng/performance/${parentAttemptId}`);
    } else {
      navigate(`/mastery/tfng/practice/${parentAttemptId}`);
    }
  };

  const continueFromPerformance = async () => {
    if (!attemptId) return;
    const { data: nextData } = await api.post(`/mastery/tfng/attempts/${attemptId}/continue`);
    if (nextData.next_page === 'practice') navigate(`/mastery/tfng/practice/${nextData.attempt_id}`);
    if (nextData.next_page === 'design') navigate(`/mastery/tfng/design/${nextData.attempt_id}`);
    if (nextData.next_page === 'performance') navigate(`/mastery/tfng/performance/${nextData.attempt_id}`);
    if (nextData.next_page === 'contact_instructor') window.location.href = nextData.instructor_support_url || '/teacher';
    if (nextData.next_page === 'coming_soon') setData(nextData);
    if (nextData.next_page === 'complete_mastery') navigate('/tests?mode=practice');
  };

  const contactInstructor = async () => {
    if (attemptId) {
      await api.post(`/mastery/tfng/attempts/${attemptId}/continue`).catch(() => null);
    }
    alert('Your TFNG progress report has been sent to your instructor. They will unlock the next evolution after guiding you.');
    navigate('/tests?mode=practice');
  };

  const handlePassageSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const selectedText = selection.toString().trim();
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    if (
      selectedText &&
      anchorNode &&
      focusNode &&
      passageRef.current?.contains(anchorNode) &&
      passageRef.current?.contains(focusNode)
    ) {
      const range = selection.getRangeAt(0);
      const passageEl = range.commonAncestorContainer.parentElement?.closest<HTMLElement>('[data-passage-id]');
      const target = passageEl ? getHighlightTarget(range, passageEl) : null;

      if (!target) {
        highlightTargetRef.current = null;
        setHighlightCoords(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      highlightTargetRef.current = target;
      setHighlightCoords({
        top: Math.max(78, rect.top - 46),
        left: Math.min(window.innerWidth - 150, Math.max(16, rect.left + rect.width / 2 - 75))
      });
      return;
    }

    highlightTargetRef.current = null;
    setHighlightCoords(null);
  };

  const schedulePassageSelectionCheck = () => {
    window.setTimeout(handlePassageSelection, 0);
  };

  const applyPassageHighlight = (event?: React.MouseEvent | React.PointerEvent) => {
    event?.preventDefault();
    event?.stopPropagation();

    const target = highlightTargetRef.current;
    if (!target) return;

    const passageEl = passageRef.current?.querySelector<HTMLElement>(`[data-passage-id="${target.passageId}"]`);

    try {
      if (passageEl && applyHighlightTarget(target, passageEl)) {
        setHighlightedPassageHtml(passageEl.innerHTML);
      }
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.warn('TFNG passage highlight could not be applied.', err);
    }

    highlightTargetRef.current = null;
    setHighlightCoords(null);
  };

  const clearPassageHighlights = () => {
    setHighlightedPassageHtml('');
    highlightTargetRef.current = null;
    setHighlightCoords(null);
    window.getSelection()?.removeAllRanges();
  };

  const toggleQuestionFlag = (questionId: string) => {
    setFlaggedQuestions(current => ({ ...current, [questionId]: !current[questionId] }));
  };

  if (loading) {
    return <MasteryShell title="TFNG Mastery"><LoaderCircle className="h-10 w-10 animate-spin text-[#294b77]" /></MasteryShell>;
  }

  if (error) {
    return (
      <MasteryShell title="TFNG Mastery Setup Needed">
        <div className="max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-[15px] font-bold text-amber-900">{error}</p>
          <Link to="/tests?mode=practice" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Reading Practice
          </Link>
        </div>
      </MasteryShell>
    );
  }

  if (mode === 'entry' && data?.next_page === 'complete_mastery') {
    return (
      <MasteryShell title="TFNG Mastery Complete">
        <Trophy className="h-16 w-16 text-[#ef5f55]" />
        <p className="mt-4 text-[18px] font-black text-[#05162E]">{data.message}</p>
      </MasteryShell>
    );
  }

  if (data?.next_page === 'coming_soon') {
    return (
      <MasteryShell title="Coming Soon">
        <div className="max-w-2xl rounded-3xl border border-[#F2D99F] bg-white p-8 text-center shadow-[0_18px_40px_rgba(86,58,12,0.08)]">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#FFF8EA]">
            <BookOpen className="h-12 w-12 text-[#D88914]" />
          </div>
          <h1 className="mt-6 text-[30px] font-black text-[#071A3D]">Next level coming soon</h1>
          <p className="mt-3 text-[16px] font-bold leading-7 text-[#294B77]">
            {data.message || 'This TFNG evolution is unlocked, but its passages are not ready yet.'}
          </p>
          <p className="mt-2 text-[14px] font-semibold text-slate-500">
            {data.evolution?.name ? `${data.evolution.name} will appear here once passages and questions are published.` : 'Once passages and questions are published, this level will open automatically.'}
          </p>
          <Link to="/tests?mode=practice" className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#294b77] px-6 text-[14px] font-black text-white hover:bg-[#1E3A6E]">
            <ArrowLeft className="h-4 w-4" /> Back to Reading Practice
          </Link>
        </div>
      </MasteryShell>
    );
  }

  if (mode === 'design') {
    return (
      <EvolutionAdventureDesign
        data={data}
        studentName={studentName}
        onBack={() => navigate('/tests?mode=practice')}
        onStart={continueFromDesign}
      />
    );
  }

  if (mode === 'practice') {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#FFFDF8] text-[#071A3D]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        {highlightCoords && (
          <div
            className="fixed z-50 flex items-center gap-1 rounded-full border border-yellow-200 bg-white px-2 py-1.5 shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
            style={{ top: highlightCoords.top, left: highlightCoords.left }}
          >
            <button
              type="button"
              onPointerDown={applyPassageHighlight}
              onMouseDown={applyPassageHighlight}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-yellow-300 px-3 text-[12px] font-black text-[#05162E] hover:bg-yellow-200"
            >
              <Highlighter className="h-4 w-4" /> Highlight
            </button>
          </div>
        )}
        <div className="mx-auto flex min-h-screen w-full max-w-[1860px] flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(255,220,150,0.18),transparent_32%),linear-gradient(180deg,#fffdf8_0%,#fffaf0_100%)] px-4 pt-5 sm:px-6 lg:px-8">
          <header className="flex min-h-[88px] flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <button onClick={() => navigate('/tests?mode=practice')} className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl border border-[#F2D99F] bg-white px-6 text-[15px] font-black text-[#6E3A11] shadow-[0_10px_24px_rgba(86,58,12,0.06)] transition hover:bg-[#FFF8E9]">
                <ArrowLeft className="h-5 w-5" /> Back
              </button>
              <JawaafLogo className="hidden h-[58px] w-[190px] sm:block" />
            </div>

            <div className="order-3 mx-auto inline-flex h-14 items-center justify-center rounded-2xl border border-[#F2D99F] bg-[#FFF8EA] px-7 text-[17px] font-black text-[#A55508] shadow-sm lg:order-none">
              Reading Passage {currentPassageOrder} <span className="px-2 text-[#D78A14]">-</span> Practice
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden h-14 items-center gap-3 rounded-2xl border border-[#F2D99F] bg-white px-5 shadow-sm md:flex">
                <Flame className="h-6 w-6 fill-[#FF8B1F] text-[#FF8B1F]" />
                <div className="leading-none">
                  <p className="text-[18px] font-black text-[#071A3D]">{dayStreak}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#7B6A57]">Day Streak</p>
                </div>
              </div>
              <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#F2D99F] bg-white px-5 shadow-sm">
                <span className={`grid h-9 w-9 place-items-center rounded-full border ${Number(timeRemaining || 0) <= 30 ? 'border-[#ef5f55] text-[#ef5f55]' : 'border-[#071A3D] text-[#071A3D]'}`}>
                  <Clock className="h-5 w-5" />
                </span>
                <div className="leading-none">
                  <p className="text-[11px] font-bold text-[#7B6A57]">Time Left</p>
                  <p className={`mt-1 text-[18px] font-black ${Number(timeRemaining || 0) <= 30 ? 'text-[#ef5f55]' : 'text-[#071A3D]'}`}>{formatTime(timeRemaining ?? data?.timer_seconds ?? 180)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#071A3D] text-[18px] font-black text-white">{studentInitial}</span>
                <span className="hidden text-[16px] font-black text-[#3B2D24] sm:inline">{firstName}</span>
                <ChevronDown className="hidden h-4 w-4 text-[#6E3A11] sm:block" />
              </div>
            </div>
          </header>

          <section className="grid flex-1 gap-5 pb-[142px] pt-4 lg:grid-cols-[308px_minmax(0,1fr)] xl:grid-cols-[308px_minmax(560px,1.18fr)_minmax(390px,0.82fr)] 2xl:grid-cols-[308px_minmax(680px,1.28fr)_minmax(420px,0.72fr)]">
            <aside className="hidden rounded-[18px] border border-[#F2D99F] bg-white/92 p-6 shadow-[0_18px_40px_rgba(86,58,12,0.07)] lg:block">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-[#F2D99F]" />
                <span className="rounded-xl bg-[#FFF8EA] px-4 py-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#2D2016]">Hooty's Journey</span>
                <span className="grid h-5 w-5 place-items-center rounded-full border border-[#F2D99F] text-[12px] font-black text-[#D88914]">i</span>
              </div>

              <div className="mt-5 text-center">
                <div className="mx-auto grid h-[210px] w-[220px] place-items-center rounded-full border border-[#F2D99F] bg-[#FFF8EA]">
                  <img src={evolutionAssets.mentorMascot} alt="" className="h-[180px] w-[180px] object-contain drop-shadow-[0_14px_20px_rgba(86,58,12,0.13)]" />
                </div>
                <p className="mt-5 text-[11px] font-black uppercase tracking-[0.06em] text-[#B17816]">Current Evolution</p>
                <h2 className="mt-2 text-[24px] font-black text-[#071A3D]">{evolutionName}</h2>
                <span className="mt-2 inline-flex rounded-full bg-[#EAF1FF] px-3 py-1 text-[12px] font-black text-[#1F66FF]">Evolution {evolutionNo}</span>
              </div>

              <div className="mt-5 border-t border-[#F2D99F] pt-5">
                <p className="text-[12px] font-black uppercase tracking-[0.04em] text-[#3B2D24]">Evolution Progress</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#FFF1CB]">
                    <div className="h-full rounded-full bg-[#FFC638]" style={{ width: `${evolutionProgress}%` }} />
                  </div>
                  <span className="text-[13px] font-black text-[#071A3D]">{evolutionProgress}%</span>
                </div>
                <p className="mt-3 text-[12px] font-bold text-[#6E3A11]">Keep going! {nextEvolutionName} is waiting.</p>
              </div>

              <div className="mt-5 border-t border-[#F2D99F] pt-5">
                <div className="relative rounded-[16px] border border-[#DCCAFB] bg-[#FCF8FF] p-4 text-center">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-lg bg-[#EFE4FF] px-4 py-1 text-[12px] font-black uppercase text-[#5D3FC7]">Next Evolution</span>
                  <img src={evolutionAssets.mascotGuide} alt="" className="mx-auto mt-2 h-[116px] w-[132px] object-contain" />
                  <p className="mt-1 text-[16px] font-black text-[#071A3D]">{nextEvolutionName}</p>
                  <span className="mt-1 inline-flex rounded-full bg-[#EFE4FF] px-3 py-1 text-[11px] font-black text-[#5D3FC7]">Evolution {Number(evolutionNo) + 1}</span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#F2D99F] bg-[#FFF8EA] px-4 py-4 text-center text-[14px] font-bold leading-6 text-[#294B77]">
                Every correct answer makes Hooty stronger!
              </div>
            </aside>

            <article
              ref={passageRef}
              onMouseUp={handlePassageSelection}
              onKeyUp={handlePassageSelection}
              onTouchEnd={schedulePassageSelectionCheck}
              className="min-h-[580px] overflow-hidden rounded-[18px] border border-[#F2D99F] bg-white shadow-[0_18px_40px_rgba(86,58,12,0.07)] xl:h-[calc(100vh-236px)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#F7E7C4] px-5 py-4 sm:px-8">
                <span className="rounded-lg border border-[#F2D99F] bg-[#FFF8EA] px-3 py-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#A55508]">Questions Group 1</span>
                <button
                  type="button"
                  onClick={clearPassageHighlights}
                  disabled={!highlightedPassageHtml}
                  title="Clear highlights"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#F2D99F] bg-white text-[#A55508] hover:bg-[#FFF8EA] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              <div className="h-[calc(100%-76px)] overflow-y-auto px-5 py-5 sm:px-10 sm:py-7">
                <h1 className="text-[26px] font-black leading-tight text-[#071A3D] sm:text-[30px]">{data?.passage?.title}</h1>
                <div
                  data-passage-id={data?.passage?.id || data?.passage_attempt?.id || 'tfng-passage'}
                  className="ielts-passage mt-7 max-w-none select-text !font-['Inter','Segoe_UI',sans-serif] !text-[19px] !leading-[1.85] !text-[#18213B]"
                  dangerouslySetInnerHTML={{ __html: highlightedPassageHtml || data?.passage?.passage_html || '' }}
                />
              </div>
            </article>

            <aside className="min-h-[580px] overflow-hidden rounded-[18px] border border-[#F2D99F] bg-white shadow-[0_18px_40px_rgba(86,58,12,0.07)] lg:col-span-2 xl:col-span-1 xl:h-[calc(100vh-236px)]">
              <div className="h-full overflow-y-auto px-5 py-6 sm:px-6">
                <div>
                  <h2 className="text-[25px] font-black text-[#071A3D]">Questions 1-{practiceQuestions.length || totalQuestionSlots}</h2>
                  <p className="mt-4 max-w-[560px] text-[15px] font-semibold leading-6 text-[#28314D]">{questionInstruction}</p>
                  <div className="mt-6 max-w-full overflow-hidden rounded-2xl border border-[#F2D99F] bg-[#FFFDF8] px-4 py-3">
                    {answerOptions.map(option => (
                      <div key={option} className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 py-2">
                        <span className={`rounded-md border px-2 py-1 text-center text-[11px] font-black ${
                          option === 'TRUE'
                            ? 'border-[#BDE7C6] bg-[#F0FFF3] text-[#138A44]'
                            : option === 'FALSE'
                            ? 'border-[#FFC9BF] bg-[#FFF4F1] text-[#D83A2E]'
                            : 'border-[#C9DDFF] bg-[#F3F7FF] text-[#1458C8]'
                        }`}>{option}</span>
                        <span className="min-w-0 whitespace-normal text-[12px] font-semibold leading-5 text-[#28314D]">
                          {option === 'TRUE' && 'if the statement agrees with the information'}
                          {option === 'FALSE' && 'if the statement contradicts the information'}
                          {option === 'NOT GIVEN' && 'if there is no information on this'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-7 grid gap-5">
                  {practiceQuestions.map((question: any, index: number) => {
                    const selectedAnswer = answers[question.id];
                    const isFlagged = Boolean(flaggedQuestions[question.id]);
                    const isAnswered = Boolean(selectedAnswer);
                    return (
                      <div key={question.id} className={`rounded-2xl border p-4 shadow-sm transition ${isAnswered ? 'border-[#9FE0B2] bg-[#FBFFFC] shadow-[0_8px_18px_rgba(19,138,68,0.08)]' : 'border-[#F2D99F] bg-white'}`}>
                        <div className="flex items-start gap-4">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-black text-white ${isAnswered ? 'bg-[#10B981]' : 'bg-[#FFC638]'}`}>{question.question_number || index + 1}</span>
                          <p className="min-w-0 flex-1 text-[15px] font-bold leading-6 text-[#18213B]">{question.question_text}</p>
                          <button
                            type="button"
                            onClick={() => toggleQuestionFlag(question.id)}
                            title={isFlagged ? 'Remove flag' : 'Flag question'}
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${isFlagged ? 'bg-[#FFF1CB] text-[#D88914]' : 'text-[#D88914] hover:bg-[#FFF8EA]'}`}
                          >
                            <Flag className={`h-5 w-5 ${isFlagged ? 'fill-[#FFC638]' : ''}`} />
                          </button>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          {answerOptions.map(option => (
                            <button
                              key={option}
                              onClick={() => setAnswers(current => ({ ...current, [question.id]: option }))}
                              className={`min-h-[52px] rounded-xl border-2 px-3 text-[13px] font-black transition ${
                                selectedAnswer === option
                                  ? option === 'TRUE'
                                    ? 'border-[#0B7B34] bg-[#138A44] text-white shadow-[0_10px_20px_rgba(19,138,68,0.24)]'
                                    : option === 'FALSE'
                                    ? 'border-[#B92E25] bg-[#D83A2E] text-white shadow-[0_10px_20px_rgba(216,58,46,0.24)]'
                                    : 'border-[#124EAF] bg-[#1458C8] text-white shadow-[0_10px_20px_rgba(20,88,200,0.24)]'
                                  : option === 'TRUE'
                                  ? 'border-[#CFEBD5] bg-[#FBFFFC] text-[#138A44] hover:bg-[#F2FFF5]'
                                  : option === 'FALSE'
                                  ? 'border-[#FFD1C8] bg-[#FFFCFB] text-[#D83A2E] hover:bg-[#FFF4F1]'
                                  : 'border-[#D0DDF8] bg-[#FCFDFF] text-[#1458C8] hover:bg-[#F3F7FF]'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </section>

          <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-[#F2D99F] bg-[#FFFDF8]/96 px-4 py-4 shadow-[0_-12px_30px_rgba(86,58,12,0.08)] backdrop-blur">
            <div className="mx-auto grid max-w-[1860px] gap-4 lg:grid-cols-[minmax(0,1fr)_310px_minmax(220px,280px)] lg:items-center">
              <div className="min-w-0">
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {practiceQuestions.map((question: any, index: number) => {
                    const isAnswered = Boolean(answers[question.id]);
                    const isFlagged = Boolean(flaggedQuestions[question.id]);
                    return (
                      <button
                        key={question.id}
                        type="button"
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-[14px] font-black ${
                          isFlagged
                            ? 'border-[#FFB4AC] bg-[#FFF1F0] text-[#D83A2E]'
                            : isAnswered
                            ? 'border-[#BDE7C6] bg-[#F0FFF3] text-[#138A44]'
                            : 'border-[#DCE3EA] bg-[#F1F5F9] text-[#526079]'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-5 text-[13px] font-bold text-[#526079]">
                  <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full bg-[#10B981]" /> Answered {answeredCount}</span>
                  <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full bg-[#FF5C55]" /> Flagged {flaggedCount}</span>
                  <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full bg-[#DCE3EA]" /> Unanswered {unansweredCount}</span>
                </div>
              </div>

              <div className="hidden h-[72px] items-center justify-center gap-5 rounded-2xl border border-[#F2D99F] bg-white/78 shadow-sm lg:flex">
                <Star className="h-8 w-8 fill-[#FFC638] text-[#FFC638]" />
                <div className="text-center">
                  <p className="text-[13px] font-bold text-[#6E3A11]">Correct streak</p>
                  <p className="mt-1 text-[22px] font-black text-[#3B2D24]">{Number(data?.correct_streak || 0)}</p>
                </div>
                <Flame className="h-7 w-7 fill-[#FFC638] text-[#FFC638]" />
              </div>

              <button onClick={() => submitPractice(false)} disabled={submitting} className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-[#FFC638] px-5 text-[18px] font-black uppercase tracking-[0.02em] text-[#3B2D24] shadow-[0_12px_24px_rgba(245,158,36,0.26)] transition hover:bg-[#F5B923] disabled:opacity-60">
                <Send className="h-6 w-6" /> {submitting ? 'Submitting...' : 'Submit Test'}
              </button>
            </div>
          </footer>
        </div>
      </main>
    );
  }

  if (mode === 'feedback') {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#FFFDF8] text-[#071A3D]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <div className="mx-auto flex min-h-screen w-full max-w-[1860px] flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(255,220,150,0.18),transparent_32%),linear-gradient(180deg,#fffdf8_0%,#fffaf0_100%)] px-4 pt-5 sm:px-6 lg:px-8">
          <header className="flex min-h-[88px] flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <button onClick={() => navigate('/tests?mode=practice')} className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl border border-[#F2D99F] bg-white px-6 text-[15px] font-black text-[#6E3A11] shadow-[0_10px_24px_rgba(86,58,12,0.06)] transition hover:bg-[#FFF8E9]">
                <ArrowLeft className="h-5 w-5" /> Back
              </button>
              <JawaafLogo className="hidden h-[58px] w-[190px] sm:block" />
            </div>

            <div className="order-3 mx-auto inline-flex h-14 items-center justify-center rounded-2xl border border-[#F2D99F] bg-[#FFF8EA] px-7 text-[17px] font-black text-[#A55508] shadow-sm lg:order-none">
              Reading Passage {currentPassageOrder} <span className="px-2 text-[#D78A14]">-</span> Feedback
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden h-14 items-center gap-3 rounded-2xl border border-[#F2D99F] bg-white px-5 shadow-sm md:flex">
                <Flame className="h-6 w-6 fill-[#FF8B1F] text-[#FF8B1F]" />
                <div className="leading-none">
                  <p className="text-[18px] font-black text-[#071A3D]">{dayStreak}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#7B6A57]">Day Streak</p>
                </div>
              </div>
              <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#F2D99F] bg-white px-5 shadow-sm">
                <CheckCircle2 className="h-8 w-8 text-[#138A44]" />
                <div className="leading-none">
                  <p className="text-[11px] font-bold text-[#7B6A57]">Review</p>
                  <p className="mt-1 text-[18px] font-black text-[#071A3D]">{feedbackIndex + 1}/{feedbackQuestions.length || 1}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#071A3D] text-[18px] font-black text-white">{studentInitial}</span>
                <span className="hidden text-[16px] font-black text-[#3B2D24] sm:inline">{firstName}</span>
                <ChevronDown className="hidden h-4 w-4 text-[#6E3A11] sm:block" />
              </div>
            </div>
          </header>

          <section className="grid flex-1 gap-5 pb-[142px] pt-4 lg:grid-cols-[308px_minmax(0,1fr)] xl:grid-cols-[308px_minmax(560px,1.18fr)_minmax(390px,0.82fr)] 2xl:grid-cols-[308px_minmax(680px,1.28fr)_minmax(420px,0.72fr)]">
            <aside className="hidden rounded-[18px] border border-[#F2D99F] bg-white/92 p-6 shadow-[0_18px_40px_rgba(86,58,12,0.07)] lg:block">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-[#F2D99F]" />
                <span className="rounded-xl bg-[#FFF8EA] px-4 py-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#2D2016]">Hooty's Journey</span>
                <span className="grid h-5 w-5 place-items-center rounded-full border border-[#F2D99F] text-[12px] font-black text-[#D88914]">i</span>
              </div>
              <div className="mt-5 text-center">
                <div className="mx-auto grid h-[210px] w-[220px] place-items-center rounded-full border border-[#F2D99F] bg-[#FFF8EA]">
                  <img src={evolutionAssets.mentorMascot} alt="" className="h-[180px] w-[180px] object-contain drop-shadow-[0_14px_20px_rgba(86,58,12,0.13)]" />
                </div>
                <p className="mt-5 text-[11px] font-black uppercase tracking-[0.06em] text-[#B17816]">Current Evolution</p>
                <h2 className="mt-2 text-[24px] font-black text-[#071A3D]">{evolutionName}</h2>
                <span className="mt-2 inline-flex rounded-full bg-[#EAF1FF] px-3 py-1 text-[12px] font-black text-[#1F66FF]">Evolution {evolutionNo}</span>
              </div>
              <div className="mt-5 border-t border-[#F2D99F] pt-5">
                <p className="text-[12px] font-black uppercase tracking-[0.04em] text-[#3B2D24]">Evolution Progress</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#FFF1CB]">
                    <div className="h-full rounded-full bg-[#FFC638]" style={{ width: `${evolutionProgress}%` }} />
                  </div>
                  <span className="text-[13px] font-black text-[#071A3D]">{evolutionProgress}%</span>
                </div>
                <p className="mt-3 text-[12px] font-bold text-[#6E3A11]">Review your feedback, then keep Hooty moving.</p>
              </div>
              <div className="mt-5 border-t border-[#F2D99F] pt-5">
                <div className="relative rounded-[16px] border border-[#DCCAFB] bg-[#FCF8FF] p-4 text-center">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-lg bg-[#EFE4FF] px-4 py-1 text-[12px] font-black uppercase text-[#5D3FC7]">Next Evolution</span>
                  <img src={evolutionAssets.mascotGuide} alt="" className="mx-auto mt-2 h-[116px] w-[132px] object-contain" />
                  <p className="mt-1 text-[16px] font-black text-[#071A3D]">{nextEvolutionName}</p>
                  <span className="mt-1 inline-flex rounded-full bg-[#EFE4FF] px-3 py-1 text-[11px] font-black text-[#5D3FC7]">Evolution {Number(evolutionNo) + 1}</span>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-[#F2D99F] bg-[#FFF8EA] px-4 py-4 text-center text-[14px] font-bold leading-6 text-[#294B77]">
                Every review makes the next answer sharper.
              </div>
            </aside>

            <article className="min-h-[580px] overflow-hidden rounded-[18px] border border-[#F2D99F] bg-white shadow-[0_18px_40px_rgba(86,58,12,0.07)] xl:h-[calc(100vh-236px)]">
              <div className="flex items-center justify-between gap-3 border-b border-[#F7E7C4] px-5 py-4 sm:px-8">
                <span className="rounded-lg border border-[#F2D99F] bg-[#FFF8EA] px-3 py-2 text-[13px] font-black uppercase tracking-[0.04em] text-[#A55508]">Reading Passage</span>
                <span className="rounded-full bg-[#EAF1FF] px-3 py-1.5 text-[12px] font-black text-[#1F66FF]">Feedback Mode</span>
              </div>
              <div className="h-[calc(100%-76px)] overflow-y-auto px-5 py-5 sm:px-10 sm:py-7">
                <h1 className="text-[26px] font-black leading-tight text-[#071A3D] sm:text-[30px]">{data?.passage?.title}</h1>
                <div
                  className="ielts-passage mt-7 max-w-none !font-['Inter','Segoe_UI',sans-serif] !text-[19px] !leading-[1.85] !text-[#18213B]"
                  dangerouslySetInnerHTML={{ __html: data?.passage?.passage_html || '' }}
                />
              </div>
            </article>

            <aside className="min-h-[580px] overflow-hidden rounded-[18px] border border-[#F2D99F] bg-white shadow-[0_18px_40px_rgba(86,58,12,0.07)] lg:col-span-2 xl:col-span-1 xl:h-[calc(100vh-236px)]">
              <div className="h-full overflow-y-auto px-5 py-6 sm:px-6">
                {showStrategyCheck && quickStrategyCheck ? (
                  <>
                    <div className="rounded-2xl border border-[#F2D99F] bg-[#FFF8EA] p-5">
                      <span className="text-[13px] font-black uppercase tracking-[0.06em] text-[#A55508]">Quick Strategy Check</span>
                      <h2 className="mt-2 text-[25px] font-black text-[#071A3D]">Before the next passage</h2>
                    </div>
                    <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50/60 p-5">
                      <div
                        className="text-[14px] font-bold leading-7 text-slate-700 [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-1 [&_strong]:font-black"
                        dangerouslySetInnerHTML={{ __html: formatFeedbackHtml(quickStrategyCheck) }}
                      />
                    </div>
                  </>
                ) : currentFeedbackQuestion ? (
                  <>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#F2D99F] bg-[#FFF8EA] p-4">
                      <span className="text-[13px] font-black text-[#A55508]">Question {feedbackIndex + 1}/{feedbackQuestions.length}</span>
                      <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ${currentFeedbackQuestion.is_correct ? 'bg-emerald-50 text-emerald-700' : 'bg-[#FFF3F2] text-[#ef5f55]'}`}>
                        {currentFeedbackQuestion.is_correct ? 'Correct' : currentFeedbackQuestion.student_answer ? 'Review' : 'Unanswered'}
                      </span>
                    </div>
                    <div className="mt-5 rounded-2xl border border-[#F2D99F] bg-white p-5 shadow-sm">
                      <p className="text-[16px] font-black leading-7 text-[#071A3D]">Q{currentFeedbackQuestion.question_number}. {currentFeedbackQuestion.question_text}</p>
                      <div className="mt-5 grid gap-3 text-[13px] font-bold text-[#526079]">
                        <p>Your answer: <b className="text-[#071A3D]">{currentFeedbackQuestion.student_answer || 'Unanswered'}</b></p>
                        <p>Correct answer: <b className="text-[#138A44]">{currentFeedbackQuestion.correct_answer}</b></p>
                        <p>Trap: <b className="text-[#071A3D]">{currentFeedbackQuestion.trap_type || 'TFNG reasoning'}</b></p>
                        <p>Locate: <b className="text-[#071A3D]">{[currentFeedbackQuestion.locate_paragraph, currentFeedbackQuestion.locate_sentence].filter(Boolean).join(', ') || 'See highlighted text'}</b></p>
                        <div
                          className="rounded-xl bg-[#F8FAFC] p-4 leading-6 text-[#526079] [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-1 [&_strong]:font-black [&_strong]:text-[#071A3D]"
                          dangerouslySetInnerHTML={{ __html: formatFeedbackHtml(currentFeedbackQuestion.detailed_explanation || '') }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="rounded-2xl bg-[#F8FAFC] p-4 text-[14px] font-bold text-slate-500">Feedback is not available for this passage yet.</p>
                )}
              </div>
            </aside>
          </section>

          <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-[#F2D99F] bg-[#FFFDF8]/96 px-4 py-4 shadow-[0_-12px_30px_rgba(86,58,12,0.08)] backdrop-blur">
            <div className="mx-auto grid max-w-[1860px] gap-4 lg:grid-cols-[minmax(0,1fr)_310px_minmax(220px,280px)] lg:items-center">
              <div className="min-w-0">
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {feedbackQuestions.map((question: any, index: number) => {
                    const isActive = index === feedbackIndex && !showStrategyCheck;
                    const isCorrect = Boolean(question.is_correct);
                    const isUnanswered = !question.student_answer;
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => {
                          setShowStrategyCheck(false);
                          setFeedbackIndex(index);
                        }}
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-[14px] font-black ${
                          isActive
                            ? 'border-[#FFC638] bg-[#FFE18C] text-[#071A3D]'
                            : isUnanswered
                            ? 'border-[#DCE3EA] bg-[#F1F5F9] text-[#526079]'
                            : isCorrect
                            ? 'border-[#BDE7C6] bg-[#F0FFF3] text-[#138A44]'
                            : 'border-[#FFB4AC] bg-[#FFF1F0] text-[#D83A2E]'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-5 text-[13px] font-bold text-[#526079]">
                  <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full bg-[#10B981]" /> Correct {feedbackQuestions.filter((question: any) => question.is_correct).length}</span>
                  <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full bg-[#FF5C55]" /> Review {feedbackQuestions.filter((question: any) => question.student_answer && !question.is_correct).length}</span>
                  <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full bg-[#DCE3EA]" /> Unanswered {feedbackQuestions.filter((question: any) => !question.student_answer).length}</span>
                </div>
              </div>

              <div className="hidden h-[72px] items-center justify-center gap-5 rounded-2xl border border-[#F2D99F] bg-white/78 shadow-sm lg:flex">
                <Star className="h-8 w-8 fill-[#FFC638] text-[#FFC638]" />
                <div className="text-center">
                  <p className="text-[13px] font-bold text-[#6E3A11]">Feedback</p>
                  <p className="mt-1 text-[22px] font-black text-[#3B2D24]">{feedbackIndex + 1}/{feedbackQuestions.length || 1}</p>
                </div>
                <Flame className="h-7 w-7 fill-[#FFC638] text-[#FFC638]" />
              </div>

              {showStrategyCheck && quickStrategyCheck ? (
                <button onClick={continueFromFeedback} className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-[#FFC638] px-5 text-[18px] font-black uppercase tracking-[0.02em] text-[#3B2D24] shadow-[0_12px_24px_rgba(245,158,36,0.26)] transition hover:bg-[#F5B923]">
                  Continue <ArrowRight className="h-6 w-6" />
                </button>
              ) : isLastFeedbackQuestion ? (
                <button onClick={quickStrategyCheck ? () => setShowStrategyCheck(true) : continueFromFeedback} className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-[#FFC638] px-5 text-[18px] font-black uppercase tracking-[0.02em] text-[#3B2D24] shadow-[0_12px_24px_rgba(245,158,36,0.26)] transition hover:bg-[#F5B923]">
                  {quickStrategyCheck ? 'Strategy Check' : 'Continue'} <ArrowRight className="h-6 w-6" />
                </button>
              ) : (
                <button onClick={() => setFeedbackIndex(current => current + 1)} className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-[#FFC638] px-5 text-[18px] font-black uppercase tracking-[0.02em] text-[#3B2D24] shadow-[0_12px_24px_rgba(245,158,36,0.26)] transition hover:bg-[#F5B923]">
                  Next Feedback <ArrowRight className="h-6 w-6" />
                </button>
              )}
            </div>
          </footer>
        </div>
      </main>
    );
  }

  return (
    <TfngOverallPerformanceDesign
      data={data}
      studentName={studentName}
      hasPassedLevel={hasPassedLevel}
      timeSpent={formatLongTime(data?.summary?.time_used_seconds)}
      onBack={() => navigate('/mastery/tfng')}
      onContinue={continueFromPerformance}
      onContactInstructor={contactInstructor}
    />
  );
}

const EvolutionAdventureDesign = ({
  data,
  studentName,
  onBack,
  onStart
}: {
  data: any;
  studentName: string;
  onBack: () => void;
  onStart: () => void;
}) => {
  const firstName = studentName.split(' ')[0] || 'Sagun';
  const initial = firstName.charAt(0).toUpperCase() || 'S';
  const evolutionNo = data?.evolution?.evolution_number || 1;
  const journeyLevels = Array.isArray(data?.student_progress?.journey)
    ? data.student_progress.journey
    : Array.isArray(data?.evolutions)
    ? data.evolutions
    : [];
  const totalEvolutions = Math.max(1, Number(data?.student_progress?.total_evolutions || journeyLevels.length || 22));
  const unlocked = Math.max(0, Number(data?.student_progress?.completed_evolutions ?? Math.max(0, evolutionNo - 1)));
  const dayStreak = Math.max(0, Number(data?.day_streak ?? data?.student_progress?.day_streak ?? 0));
  const recentActivity = Array.isArray(data?.recent_activity)
    ? data.recent_activity
    : Array.isArray(data?.student_progress?.recent_activity)
    ? data.student_progress.recent_activity
    : [];
  const finalEvolutionName = journeyLevels[journeyLevels.length - 1]?.name || 'Emperor Hooty';
  const currentJourneyIndex = Math.max(0, journeyLevels.findIndex((level: any) => level.id === data?.evolution?.id));

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FDFBF6] text-[#071A3D]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="relative mx-auto min-h-screen w-full max-w-[1536px] bg-[radial-gradient(circle_at_50%_35%,rgba(255,220,134,0.24),transparent_20%),linear-gradient(180deg,#ffffff_0%,#fdfbf6_54%,#f7fbff_100%)] px-5 pb-8 sm:px-8 xl:h-screen xl:min-h-0 xl:max-w-none xl:overflow-hidden xl:px-0 xl:pb-0">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[44%] bg-[linear-gradient(135deg,rgba(216,234,251,0.84),rgba(255,255,255,0)_66%)] [clip-path:polygon(0_36%,4%_22%,16%_68%,31%_19%,45%_80%,58%_32%,72%_82%,100%_52%,100%_100%,0_100%)] xl:block" />

        <div className="pointer-events-none absolute left-[424px] top-[86px] hidden text-[23px] text-[#DDE8F7] xl:block">✦</div>
        <div className="pointer-events-none absolute left-[560px] top-[86px] hidden text-[23px] text-[#FFE1A5] xl:block">✦</div>
        <div className="pointer-events-none absolute left-[974px] top-[86px] hidden text-[18px] text-[#FFE1A5] xl:block">✦</div>
        <div className="pointer-events-none absolute right-[92px] top-[94px] hidden text-[19px] text-[#FFE1A5] xl:block">✦</div>
        <div className="pointer-events-none absolute left-[444px] top-[370px] hidden text-[18px] text-[#FFE1A5] xl:block">✦</div>
        <div className="pointer-events-none absolute left-[1170px] bottom-[74px] hidden text-[20px] text-[#FFE1A5] xl:block">✦</div>

        <header className="relative z-30 flex min-h-[96px] items-center justify-between border-b border-transparent py-5 xl:h-24 xl:px-6 xl:py-0">
          <button onClick={onBack} className="inline-flex h-12 min-w-[118px] items-center justify-center gap-3 rounded-full border border-[#E5EAF2] bg-white px-5 text-[15px] font-black text-[#071A3D] shadow-[0_10px_26px_rgba(8,25,58,0.07)] transition hover:bg-[#F8FBFF] sm:h-14 sm:min-w-[136px] sm:text-[16px] xl:h-16 xl:w-[140px]">
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" /> Back
          </button>
          <JawaafLogo className="absolute left-1/2 top-5 hidden h-[54px] w-[186px] -translate-x-1/2 sm:block" />
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden h-14 w-[130px] items-center justify-center gap-3 rounded-[20px] border border-[#E8EDF5] bg-white px-5 shadow-[0_10px_26px_rgba(8,25,58,0.05)] md:flex xl:h-16">
              <Flame className="h-6 w-6 fill-[#FF8B1F] text-[#FF8B1F]" />
              <div className="leading-none">
                <p className="text-[19px] font-black">{dayStreak}</p>
                <p className="mt-1 text-[10px] font-black text-[#64748B]">Day Streak</p>
              </div>
            </div>
            <button className="hidden h-11 w-11 place-items-center rounded-2xl text-[#071A3D] hover:bg-[#F4F7FB] sm:grid" aria-label="Calendar"><CalendarDays className="h-6 w-6" /></button>
            <NotificationBell
              className="relative hidden h-11 w-11 place-items-center rounded-2xl text-[#071A3D] hover:bg-[#F4F7FB] sm:grid"
              iconClassName="h-6 w-6"
              badgeClassName="absolute right-1 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#E92F37] px-1 text-[10px] font-black leading-none text-white"
            />
            <div className="flex items-center gap-2">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#071A3D] text-[17px] font-black text-white">{initial}</span>
              <span className="hidden text-[15px] font-black text-[#071A3D] sm:inline">{firstName}</span>
              <ChevronDown className="hidden h-4 w-4 text-[#071A3D] sm:block" />
            </div>
          </div>
        </header>

        <section className="relative z-10 grid gap-8 pt-7 xl:absolute xl:inset-x-0 xl:bottom-0 xl:top-24 xl:block xl:pt-0">
          <div className="xl:absolute xl:left-8 xl:top-[44px] xl:w-[440px]">
            <p className="text-[20px] font-bold text-[#071A3D]">👋 Hi, {firstName}!</p>
            <h1 className="mt-7 text-[42px] font-black leading-[1.12] text-[#071A3D] sm:text-[52px] xl:text-[48px] xl:leading-[56px]">
              Welcome to<br />
              <span className="text-[#1B66F4]">TFNG</span> Adventure!
            </h1>
            <div className="mt-7 h-1 w-20 rounded-full bg-[#FFD15D]" />
            <p className="mt-8 max-w-[380px] text-[16px] font-semibold leading-[26px] text-[#294B77] sm:text-[18px]">
              Help Hooty grow from a tiny hatchling into the legendary <span className="font-black text-[#1367FF]">{finalEvolutionName}.</span>
            </p>
          </div>

          <div className="relative mx-auto flex min-h-[430px] w-full max-w-[520px] flex-col items-center xl:absolute xl:right-[582px] xl:top-[20px] xl:h-[430px] xl:w-[430px] xl:max-w-none">
            <h2 className="absolute left-0 top-[78px] z-30 w-full text-center text-[30px] font-black leading-none text-[#071A3D]">{data?.evolution?.name || 'Egg Hooty'}</h2>
            <div className="pointer-events-none absolute left-1/2 top-[16px] h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,239,191,0.78)_0%,rgba(255,248,229,0.64)_52%,rgba(255,255,255,0)_72%)]" />
            <video
              key={`egg-hooty-${data?.attempt?.id || data?.evolution?.id || evolutionNo}`}
              src={evolutionAssets.animation}
              autoPlay
              muted
              loop
              playsInline
              className="absolute left-1/2 top-[4px] z-10 h-[360px] w-[360px] -translate-x-1/2 object-contain drop-shadow-[0_18px_28px_rgba(89,55,16,0.18)] [mask-image:radial-gradient(circle_at_50%_54%,#000_0%,#000_75%,rgba(0,0,0,0)_88%)] [-webkit-mask-image:radial-gradient(circle_at_50%_54%,#000_0%,#000_75%,rgba(0,0,0,0)_88%)] xl:h-[388px] xl:w-[388px]"
            />
            <div className="absolute bottom-[-28px] z-20 w-full max-w-[270px] rounded-[18px] border border-[#EDF1F7] bg-white px-8 py-3.5 text-center text-[14px] font-black leading-[22px] text-[#071A3D] shadow-[0_14px_26px_rgba(8,25,58,0.08)]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[#FFD873]">✦</span>
              Every legend starts<br />with one tiny crack.
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[20px] text-[#FFD873]">✦</span>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_220px] xl:absolute xl:right-[66px] xl:top-[18px] xl:w-[420px] xl:grid-cols-[142px_272px] xl:items-start xl:gap-[6px]">
            <div className="relative min-h-[148px] rounded-[24px] border border-[#DCEAFF] bg-[#EEF4FF] p-4 text-center shadow-[0_16px_34px_rgba(37,82,143,0.1)] xl:mt-9 xl:h-[164px] xl:px-3.5 xl:pt-4 xl:translate-x-3">
              <p className="text-[14px] font-black leading-[22px] text-[#071A3D]">Don’t worry,<br />I’ll grow<br />with every<br />correct<br />answer!</p>
              <p className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 text-[25px] leading-none text-[#1367FF]">♥</p>
              <div className="absolute -bottom-1 right-2 h-8 w-12 rotate-12 rounded-br-[30px] bg-[#EEF4FF]" />
              <div className="absolute -bottom-2 right-[-6px] h-8 w-8 rounded-br-[26px] border-b border-r border-[#DCEAFF] bg-[#EEF4FF]" />
            </div>
            <div className="relative mx-auto h-[286px] w-[288px] -translate-y-4 overflow-visible">
              <div className="pointer-events-none absolute inset-x-8 bottom-0 h-8 rounded-full bg-[#071A3D]/12 blur-md" />
              <img
                src={evolutionAssets.mentorMascot}
                alt=""
                className="relative h-full w-full object-contain object-bottom drop-shadow-[0_18px_24px_rgba(8,25,58,0.16)] [filter:contrast(1.04)_saturate(1.03)]"
              />
            </div>
          </div>

          <div className="pointer-events-none mx-auto h-[380px] w-full max-w-[380px] overflow-visible xl:fixed xl:bottom-0 xl:left-0 xl:z-10 xl:h-[470px] xl:w-[470px] xl:max-w-none">
            <img
              src={evolutionAssets.mascotGuide}
              alt=""
              className="h-full w-full object-contain object-left-bottom mix-blend-multiply opacity-[0.98] drop-shadow-[0_18px_28px_rgba(8,25,58,0.08)] [mask-image:linear-gradient(to_right,#000_0%,#000_70%,rgba(0,0,0,0)_97%),linear-gradient(to_top,#000_0%,#000_86%,rgba(0,0,0,0)_100%)] [mask-composite:intersect] [-webkit-mask-image:linear-gradient(to_right,#000_0%,#000_70%,rgba(0,0,0,0)_97%),linear-gradient(to_top,#000_0%,#000_86%,rgba(0,0,0,0)_100%)] [-webkit-mask-composite:source-in] xl:h-[560px] xl:w-[560px] xl:max-w-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:absolute xl:right-[76px] xl:top-[292px] xl:grid-cols-[208px_226px] xl:gap-5">
            <InfoPanel icon={<Star className="h-7 w-7 fill-[#F59E24] text-[#F59E24]" />} title="Did You Know?" body="Only the most dedicated learners unlock Emperor Hooty." footer="Will you?" tone="amber" />
            <InfoPanel icon={<Target className="h-7 w-7 text-[#1367FF]" />} title="Today’s Goal" body="Sharpen your skills, beat your best, and grow Hooty!" footer="" tone="blue" />
          </div>

          <div className="rounded-[24px] border border-[#E4ECF7] bg-white px-8 py-6 shadow-[0_18px_38px_rgba(8,25,58,0.09)] xl:absolute xl:bottom-[88px] xl:right-[379px] xl:h-[282px] xl:w-[835px] xl:px-8 xl:py-3">
            <h3 className="text-center text-[20px] font-black uppercase text-[#071A3D] xl:text-[14px] xl:tracking-[0.04em]">✦ Hooty’s Journey ✦</h3>
            <img src={evolutionAssets.journey} alt="Hooty's journey" className="mx-auto mt-1 h-auto w-full object-fill xl:h-[172px]" />
            <div className="mt-1 border-t border-[#EAF0F8] pt-2">
              <div className="mb-2 flex items-center justify-between gap-4 text-[12px] font-black uppercase text-[#071A3D]">
                <span>{totalEvolutions} Evolutions to unlock</span>
                <span className="normal-case text-[#1367FF]">{unlocked} / {totalEvolutions} Unlocked</span>
              </div>
              <div className="flex flex-wrap gap-2 xl:flex-nowrap xl:justify-between xl:gap-0">
                {Array.from({ length: totalEvolutions }).map((_, index) => (
                  <span
                    key={index}
                    title={journeyLevels[index]?.name || `Evolution ${index + 1}`}
                    className={`h-[14px] w-[14px] shrink-0 rounded-full border-2 ${
                      index < unlocked || index === currentJourneyIndex
                        ? 'border-[#1367FF] bg-[#1367FF]'
                        : 'border-[#D4DFEF] bg-white'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <RecentActivity activities={recentActivity} />

          <button onClick={onStart} className="relative z-30 mx-auto flex h-14 w-full max-w-[340px] items-center justify-center gap-3 rounded-full bg-[#1F66FF] px-7 text-[24px] font-black text-white shadow-[0_16px_30px_rgba(31,102,255,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1558EA] xl:absolute xl:bottom-[26px] xl:right-[632px] xl:w-[340px]">
            <span className="text-[16px] text-[#FFE08A]">✦</span>
            <span className="text-[24px]">🥚</span>
            Hatch Hooty
            <ArrowRight className="h-8 w-8" />
          </button>

          <p className="relative z-30 flex items-center justify-center gap-2 text-center text-[13px] font-bold text-[#294B77] xl:absolute xl:bottom-[6px] xl:right-[567px] xl:w-[470px]">
            <ShieldCheck className="h-4 w-4" /> Improve your skills. Unlock new evolutions. Become <span className="font-black text-[#1367FF]">legendary.</span>
          </p>
        </section>
      </div>
    </main>
  );
};

export const TfngOverallPerformanceDesign = ({
  data,
  studentName,
  hasPassedLevel,
  timeSpent,
  onBack,
  onContinue,
  onContactInstructor,
  backLabel = 'Back to Adventure',
  instructorMode = false
}: {
  data: any;
  studentName: string;
  hasPassedLevel: boolean;
  timeSpent: string;
  onBack: () => void;
  onContinue: () => void;
  onContactInstructor: () => void;
  backLabel?: string;
  instructorMode?: boolean;
}) => {
  const summary = data?.summary || {};
  const firstName = studentName.split(' ')[0] || 'Ram';
  const initial = firstName.charAt(0).toUpperCase() || 'R';
  const accuracy = Math.max(0, Math.min(100, Number(summary.accuracy || 0)));
  const dayStreak = Math.max(0, Number(data?.day_streak || 0));
  const attemptNo = Number(data?.attempt?.attempt_no || 1);
  const showInstructorCta = Boolean(summary.requires_instructor) || (!hasPassedLevel && attemptNo > 1);
  const requiredAccuracy = Number(data?.evolution?.first_attempt_required_accuracy || 60);
  const getPassageBreakdown = (targetSummary: any) => Array.isArray(targetSummary?.passage_breakdown) && targetSummary.passage_breakdown.length > 0
    ? targetSummary.passage_breakdown
    : Array.from({ length: Math.max(1, Number(targetSummary?.total_passages || 4)) }).map((_, index) => ({
      id: `fallback-${index}`,
      passage_order: index + 1,
      title: `Passage ${index + 1}`,
      score: 0,
      correct_answers: 0,
      total_questions: Math.max(1, Math.round(Number(targetSummary?.total_questions || 0) / Math.max(1, Number(targetSummary?.total_passages || 1))))
    }));
  const passageBreakdown = getPassageBreakdown(summary);

  const getStatCards = (targetSummary: any) => [
    {
      label: 'Passages Completed',
      value: `${targetSummary?.passages_completed || 0} / ${targetSummary?.total_passages || 0}`,
      image: tfngFeedbackAssets.completed,
      valueClass: 'text-[#3010A8]'
    },
    {
      label: 'Questions Attempted',
      value: `${targetSummary?.questions_attempted || 0} / ${targetSummary?.total_questions || 0}`,
      image: tfngFeedbackAssets.attempted,
      valueClass: 'text-[#1367FF]'
    },
    {
      label: 'Correct Answers',
      value: targetSummary?.correct_answers || 0,
      image: tfngFeedbackAssets.tick,
      valueClass: 'text-[#119B45]'
    },
    {
      label: 'Wrong Answers',
      value: targetSummary?.wrong_answers || 0,
      image: tfngFeedbackAssets.wrong,
      valueClass: 'text-[#E21D1D]'
    },
    {
      label: 'Unanswered',
      value: targetSummary?.unanswered_questions || 0,
      image: tfngFeedbackAssets.target,
      valueClass: 'text-[#EE7A10]'
    }
  ];
  const statCards = getStatCards(summary);
  const attemptSummaries = Array.isArray(summary.attempt_summaries)
    ? summary.attempt_summaries.filter((attemptSummary: any) => attemptSummary && typeof attemptSummary === 'object')
    : [];
  const showSetWiseSummary = instructorMode && attemptSummaries.length > 1;

  const renderStatCards = (cards: typeof statCards) => (
    <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
      {cards.map(card => (
        <div key={card.label} className="grid min-h-[170px] place-items-center rounded-[14px] border border-[#D0DEF4] bg-[linear-gradient(135deg,#FFFFFF_0%,#F5F9FF_100%)] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <img src={card.image} alt="" className="h-[58px] w-[58px] object-contain drop-shadow-[0_8px_14px_rgba(30,58,110,0.11)]" />
          <p className="mt-2 text-[14px] font-black text-[#071A3D]">{card.label}</p>
          <p className={`mt-3 text-[31px] font-black leading-none ${card.valueClass}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );

  const renderFoundationBlock = () => (
    <div className="mt-5 flex flex-col items-center gap-6 rounded-[18px] border border-[#BBD1FB] bg-[linear-gradient(135deg,#DCEBFF_0%,#F7FBFF_100%)] px-7 py-5 shadow-[0_12px_28px_rgba(45,99,243,0.08)] md:flex-row md:px-16">
      <span className="grid h-[138px] w-[138px] shrink-0 place-items-center rounded-full bg-[#CFE0FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <img src={tfngFeedbackAssets.book} alt="" className="h-[92px] w-[92px] object-contain drop-shadow-[0_10px_14px_rgba(60,91,255,0.15)]" />
      </span>
      <div className="text-center md:text-left">
        <h2 className="text-[25px] font-black leading-tight text-[#10166C]">
          {hasPassedLevel ? 'You unlocked the next evolution!' : 'Let’s make your foundation stronger!'}
        </h2>
        <p className="mt-4 max-w-[800px] text-[17px] font-semibold leading-[28px] text-[#071A3D]">
          {hasPassedLevel
            ? 'You’ve shown strong TFNG control and completed the challenge. Keep the momentum going into the next level.'
            : `You’ve shown great effort and completed the challenge. To move to the next evolution, aim for a score of ${requiredAccuracy}% or higher.`} <span className="text-[#8A67FF]">♥</span>
        </p>
      </div>
    </div>
  );

  const renderPassageBreakdown = (breakdown: any[]) => (
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {breakdown.map((passage: any, index: number) => {
        const total = Math.max(1, Number(passage.total_questions || 4));
        const score = Math.max(0, Number(passage.score ?? passage.correct_answers ?? 0));
        const starCount = Math.min(4, Math.max(1, total));
        return (
          <div key={passage.id || index} className="rounded-[12px] border border-[#D0DEF4] bg-[linear-gradient(135deg,#FFFFFF_0%,#F7FAFF_100%)] px-5 py-4 shadow-[0_8px_18px_rgba(8,25,58,0.04)]">
            <div className="flex items-center justify-center gap-4">
              <span className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-[#EEE7FF]">
                <img src={tfngFeedbackAssets.completed} alt="" className="h-8 w-8 object-contain" />
              </span>
              <p className="text-[15px] font-black text-[#071A3D]">{passage.title || `Passage ${passage.passage_order || index + 1}`}</p>
            </div>
            <p className={`mt-3 text-center text-[26px] font-black ${score / total >= 0.6 ? 'text-[#EF8C12]' : 'text-[#E21D1D]'}`}>
              {score} / {total}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              {Array.from({ length: starCount }).map((_, starIndex) => (
                <Star key={starIndex} className={`h-5 w-5 ${starIndex < Math.round(score) ? 'fill-[#F9AD1B] text-[#F9AD1B]' : 'fill-[#D2D2D2] text-[#D2D2D2]'}`} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (hasPassedLevel) {
    const evolutionLabel = `Evolution ${summary.evolution_number || data?.evolution?.evolution_number || 1}`;
    const xpEarned = Number(summary.xp_earned || data?.attempt?.xp_earned || 200);
    const passStatCards = [
      {
        label: 'Passages Completed',
        value: `${summary.passages_completed || 0} / ${summary.total_passages || 0}`,
        image: tfngPassFeedbackAssets.completed,
        valueClass: 'text-[#5E22D8]'
      },
      {
        label: 'Questions Attempted',
        value: `${summary.questions_attempted || 0} / ${summary.total_questions || 0}`,
        image: tfngPassFeedbackAssets.attempted,
        valueClass: 'text-[#0875E8]'
      },
      {
        label: 'Correct Answers',
        value: summary.correct_answers || 0,
        image: tfngPassFeedbackAssets.tick,
        valueClass: 'text-[#0E8E3E]'
      },
      {
        label: 'Wrong Answers',
        value: summary.wrong_answers || 0,
        image: tfngPassFeedbackAssets.wrong,
        valueClass: 'text-[#E21D1D]'
      },
      {
        label: 'Unanswered',
        value: summary.unanswered_questions || 0,
        image: tfngPassFeedbackAssets.target,
        valueClass: 'text-[#F1740B]'
      }
    ];

    return (
      <main
        className="min-h-screen overflow-x-hidden bg-[#FFF9EE] bg-no-repeat text-[#071A3D]"
        style={{
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.96), rgba(255,248,234,0.9) 42%, rgba(255,241,210,0.78) 100%)',
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      >
        <div className="relative mx-auto min-h-screen w-full max-w-[1440px] overflow-hidden px-4 pb-8 sm:px-7">
          <img src={tfngPassFeedbackAssets.leaf} alt="" className="pointer-events-none absolute bottom-0 left-0 hidden h-[98px] opacity-35 xl:block" />
          <img src={tfngPassFeedbackAssets.leaf} alt="" className="pointer-events-none absolute bottom-0 right-0 hidden h-[98px] scale-x-[-1] opacity-35 xl:block" />

          <header className="relative z-20 mx-auto flex min-h-[78px] max-w-[1360px] items-center justify-between gap-4 py-4">
            <button onClick={onBack} className="inline-flex h-[56px] items-center justify-center gap-3 rounded-xl border border-[#F3DDAF] bg-white/84 px-5 text-[14px] font-black text-[#4A230B] shadow-[0_10px_26px_rgba(124,68,9,0.06)] hover:bg-white sm:min-w-[205px]">
              <ArrowLeft className="h-5 w-5" /> {backLabel}
            </button>
            <JawaafLogo className="hidden h-[56px] w-[188px] lg:block" />
            <div className="hidden h-[56px] min-w-[360px] items-center justify-center rounded-xl border border-[#F3DDAF] bg-[#FFF7E7] px-8 text-[21px] font-black uppercase text-[#5C2B0B] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] md:flex">
              Overall Performance
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden h-[54px] min-w-[122px] items-center justify-center gap-3 rounded-xl border border-[#F3DDAF] bg-white/88 px-4 shadow-[0_8px_20px_rgba(124,68,9,0.05)] sm:flex">
                <Flame className="h-6 w-6 fill-[#FF8B1F] text-[#FF8B1F]" />
                <div className="leading-none">
                  <p className="text-[20px] font-black text-[#071A3D]">{dayStreak}</p>
                  <p className="mt-1 text-[10px] font-black text-[#64748B]">Day Streak</p>
                </div>
              </div>
              <div className="hidden h-[54px] min-w-[132px] items-center justify-center gap-3 rounded-xl border border-[#F3DDAF] bg-white/88 px-4 shadow-[0_8px_20px_rgba(124,68,9,0.05)] sm:flex">
                <Clock className="h-6 w-6 text-[#071A3D]" />
                <div className="leading-none">
                  <p className="text-[10px] font-black text-[#071A3D]">Time Spent</p>
                  <p className="mt-1 text-[17px] font-black text-[#071A3D]">{timeSpent}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="grid h-[46px] w-[46px] place-items-center rounded-full bg-[#071A3D] text-[18px] font-black text-white">{initial}</span>
                <span className="hidden text-[15px] font-black text-[#071A3D] sm:inline">{firstName}</span>
                <ChevronDown className="hidden h-4 w-4 sm:block" />
              </div>
            </div>
          </header>

          <section className="relative z-10 mx-auto max-w-[1328px] overflow-hidden rounded-[18px] border border-[#F4DFB6] bg-[linear-gradient(135deg,#FFF9EB_0%,#FFFFFF_43%,#FFF1C8_100%)] px-6 py-7 shadow-[0_18px_40px_rgba(147,90,15,0.08)] sm:px-10 lg:grid lg:min-h-[455px] lg:grid-cols-[410px_minmax(0,1fr)_280px] lg:items-center lg:gap-6">
            {['left-[44px] top-[70px]', 'left-[84px] top-[162px]', 'left-[128px] top-[278px]', 'left-[260px] top-[98px]', 'left-[318px] top-[218px]', 'left-[410px] top-[320px]', 'left-[470px] top-[82px]', 'right-[84px] top-[80px]', 'right-[36px] top-[174px]'].map(position => (
              <span key={position} className={`pointer-events-none absolute ${position} hidden text-[34px] text-[#FFB22B] opacity-75 lg:block`}>✦</span>
            ))}
            <div className="relative mx-auto h-[320px] max-w-[380px] lg:mx-0 lg:h-[390px]">
              <div className="absolute bottom-0 left-10 right-10 h-10 rounded-full bg-[#C98415]/16 blur-xl" />
              <img src={tfngPassFeedbackAssets.mascot} alt="" className="relative h-full w-full object-contain object-bottom drop-shadow-[0_18px_26px_rgba(104,58,13,0.17)]" />
            </div>

            <div className="text-center">
              <h1 className="text-[34px] font-black uppercase leading-tight text-[#071A3D] sm:text-[44px]">
                Well done, {firstName}! <span className="text-[34px]">🎉</span>
              </h1>
              <p className="mt-8 text-[20px] font-semibold text-[#071A3D]">You’ve successfully completed</p>
              <p className="mt-4 text-[34px] font-black uppercase leading-none text-[#F28A00]">{evolutionLabel}</p>
              <p className="mx-auto mt-6 max-w-[520px] text-[18px] font-semibold leading-[32px] text-[#071A3D]">
                Great job! You’re one step closer to becoming the Emperor Owl. Keep it up! <span className="text-[#FF9B00]">♥</span>
              </p>
            </div>

            <div className="mx-auto mt-8 grid place-items-center lg:mt-0">
              <img src={tfngPassFeedbackAssets.passed} alt="" className="h-[236px] w-[250px] object-contain drop-shadow-[0_26px_22px_rgba(124,68,9,0.12)]" />
            </div>
          </section>

          <section className="relative z-10 mx-auto mt-5 max-w-[1328px] rounded-[18px] border border-[#F4DFB6] bg-white/78 p-5 shadow-[0_16px_34px_rgba(124,68,9,0.08)] backdrop-blur sm:p-7">
            <PassSectionTitle title="Your Performance Summary" />
            <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
              {passStatCards.map(card => (
                <div key={card.label} className="grid min-h-[170px] place-items-center rounded-[14px] border border-[#F2DFBA] bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF9ED_100%)] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <img src={card.image} alt="" className="h-[58px] w-[58px] object-contain drop-shadow-[0_8px_14px_rgba(146,87,9,0.12)]" />
                  <p className="mt-2 text-[14px] font-black text-[#071A3D]">{card.label}</p>
                  <p className={`mt-3 text-[31px] font-black leading-none ${card.valueClass}`}>{card.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-6 rounded-[18px] border border-[#DFE9CE] bg-[linear-gradient(135deg,#F7FFF2_0%,#FFFDF6_100%)] px-7 py-5 shadow-[0_12px_28px_rgba(34,124,61,0.07)] md:grid-cols-[240px_minmax(0,1fr)_280px] md:items-center md:px-14">
              <div className="mx-auto grid h-[178px] w-[178px] place-items-center rounded-full" style={{ background: `conic-gradient(#3CAA55 ${accuracy * 3.6}deg, #E6EAD8 0deg)` }}>
                <div className="grid h-[138px] w-[138px] place-items-center rounded-full bg-white">
                  <div className="text-center">
                    <p className="text-[38px] font-black leading-none text-[#0E7B35]">{Math.round(accuracy)}%</p>
                    <p className="mt-2 text-[12px] font-black text-[#071A3D]">Overall Accuracy</p>
                  </div>
                </div>
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-[24px] font-black leading-tight text-[#087C2C]">Excellent work!</h2>
                <p className="mt-4 max-w-[500px] text-[18px] font-semibold leading-[30px] text-[#071A3D]">
                  You’ve achieved a great score and unlocked the next challenge. <span className="text-[#FFB11B]">★</span>
                </p>
              </div>
              <div className="mx-auto flex h-[116px] w-full max-w-[250px] items-center justify-center gap-4 rounded-[18px] border border-[#E0CDFE] bg-[linear-gradient(135deg,#FBF8FF_0%,#FFF7F2_100%)] px-5 shadow-[0_12px_24px_rgba(87,39,177,0.07)]">
                <span className="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#6D35DD] text-[18px] font-black text-white shadow-[0_8px_14px_rgba(87,39,177,0.22)]">XP</span>
                <div>
                  <p className="text-[26px] font-black text-[#5D20CE]">+{xpEarned} XP</p>
                  <p className="mt-1 text-[15px] font-bold text-[#071A3D]">Earned</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <PassSectionTitle title="Passage Breakdown" />
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {passageBreakdown.map((passage: any, index: number) => {
                  const total = Math.max(1, Number(passage.total_questions || 4));
                  const score = Math.max(0, Number(passage.score ?? passage.correct_answers ?? 0));
                  const starCount = Math.min(4, Math.max(1, total));
                  const filledStars = Math.min(starCount, Math.round((score / total) * starCount));
                  return (
                    <div key={passage.id || index} className="rounded-[12px] border border-[#F2DFBA] bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF9ED_100%)] px-5 py-4 shadow-[0_8px_18px_rgba(124,68,9,0.04)]">
                      <div className="flex items-center justify-center gap-4">
                        <span className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-[#EEE7FF]">
                          <img src={tfngPassFeedbackAssets.completed} alt="" className="h-8 w-8 object-contain" />
                        </span>
                        <p className="text-[15px] font-black text-[#071A3D]">{passage.title || `Passage ${passage.passage_order || index + 1}`}</p>
                      </div>
                      <p className="mt-3 text-center text-[26px] font-black text-[#0E7B35]">{score} / {total}</p>
                      <div className="mt-3 flex items-center justify-center gap-3">
                        {Array.from({ length: starCount }).map((_, starIndex) => (
                          <Star key={starIndex} className={`h-5 w-5 ${starIndex < filledStars ? 'fill-[#F9AD1B] text-[#F9AD1B]' : 'fill-[#D2D2D2] text-[#D2D2D2]'}`} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative mt-6 overflow-hidden rounded-[18px] border border-[#F2DFBA] bg-[linear-gradient(135deg,#FFF9EE_0%,#FFFFFF_58%,#FFF0C7_100%)] px-6 py-4 md:flex md:min-h-[148px] md:items-center md:gap-7">
              <div className="grid h-[126px] w-[160px] shrink-0 place-items-center">
                <img src={tfngPassFeedbackAssets.cup} alt="" className="h-[112px] w-[112px] object-contain drop-shadow-[0_12px_18px_rgba(124,68,9,0.15)]" />
              </div>
              <div className="min-w-0 flex-1 text-center md:text-left">
                <h2 className="text-[25px] font-black text-[#071A3D]">You’ve unlocked the next evolution!</h2>
                <p className="mt-3 text-[16px] font-semibold leading-[26px] text-[#071A3D]">
                  Continue your journey and face new challenges.
                </p>
              </div>
              <button
                onClick={onContinue}
                className="mt-5 inline-flex h-[74px] w-full items-center justify-center gap-4 rounded-[18px] bg-[linear-gradient(135deg,#FFD336_0%,#FFB411_100%)] px-7 text-[18px] font-black text-[#251500] shadow-[0_14px_26px_rgba(210,137,4,0.22)] hover:brightness-105 md:mt-0 md:w-[420px]"
              >
                Continue to Next Evolution
                <ArrowRight className="h-7 w-7" />
              </button>
            </div>
          </section>

          <footer className="relative z-10 mx-auto mt-6 flex max-w-[820px] items-center justify-center gap-5 text-center text-[16px] font-bold text-[#5C6171]">
            <img src={tfngPassFeedbackAssets.leaf} alt="" className="h-12 w-12 rotate-[28deg] opacity-45" />
            <span>Every challenge makes Hooty wiser. You are doing amazing! <span className="text-[#8A67FF]">♥</span></span>
            <img src={tfngPassFeedbackAssets.leaf} alt="" className="h-12 w-12 -rotate-[148deg] opacity-45" />
          </footer>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[#F7FBFF] bg-no-repeat text-[#071A3D]"
      style={{
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        backgroundImage: `url('${assets.readingPractice.background}')`,
        backgroundPosition: 'bottom center',
        backgroundSize: '100% auto'
      }}
    >
      <div className="relative mx-auto min-h-screen w-full max-w-[1440px] overflow-hidden bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.94),rgba(245,250,255,0.72)_38%,rgba(235,244,255,0.54)_100%)] px-4 pb-8 sm:px-7">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[360px] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(210,230,255,0.78)_58%,rgba(181,214,250,0.95)_100%)] [clip-path:polygon(0_73%,7%_67%,16%_75%,26%_62%,38%_75%,51%_66%,63%_78%,75%_62%,88%_74%,100%_61%,100%_100%,0_100%)]" />
        <img src={tfngFeedbackAssets.leaf} alt="" className="pointer-events-none absolute bottom-6 left-[27%] hidden h-[62px] rotate-[70deg] opacity-55 xl:block" />
        <img src={tfngFeedbackAssets.leaf} alt="" className="pointer-events-none absolute bottom-5 right-[26%] hidden h-[62px] -rotate-[112deg] opacity-55 xl:block" />

        <header className="relative z-20 mx-auto flex min-h-[78px] max-w-[1360px] items-center justify-between gap-4 py-4">
          <button onClick={onBack} className="inline-flex h-[56px] items-center justify-center gap-3 rounded-xl border border-[#D7E4F8] bg-white px-5 text-[14px] font-black text-[#071A3D] shadow-[0_10px_26px_rgba(8,25,58,0.06)] hover:bg-[#F8FBFF] sm:min-w-[205px]">
            <ArrowLeft className="h-5 w-5" /> {backLabel}
          </button>
          <JawaafLogo className="hidden h-[56px] w-[188px] lg:block" />
          <div className="hidden h-[56px] min-w-[360px] items-center justify-center rounded-xl border border-[#C9DAF7] bg-[#EAF3FF] px-8 text-[21px] font-black uppercase text-[#071A3D] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:flex">
            Overall Performance
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-[54px] min-w-[122px] items-center justify-center gap-3 rounded-xl border border-[#DFE8F7] bg-white px-4 shadow-[0_8px_20px_rgba(8,25,58,0.05)] sm:flex">
              <Flame className="h-6 w-6 fill-[#FF8B1F] text-[#FF8B1F]" />
              <div className="leading-none">
                <p className="text-[20px] font-black text-[#071A3D]">{dayStreak}</p>
                <p className="mt-1 text-[10px] font-black text-[#64748B]">Day Streak</p>
              </div>
            </div>
            <div className="hidden h-[54px] min-w-[132px] items-center justify-center gap-3 rounded-xl border border-[#DFE8F7] bg-white px-4 shadow-[0_8px_20px_rgba(8,25,58,0.05)] sm:flex">
              <Clock className="h-6 w-6 text-[#071A3D]" />
              <div className="leading-none">
                <p className="text-[10px] font-black text-[#071A3D]">Time Spent</p>
                <p className="mt-1 text-[17px] font-black text-[#071A3D]">{timeSpent}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="grid h-[46px] w-[46px] place-items-center rounded-full bg-[#071A3D] text-[18px] font-black text-white">{initial}</span>
              <span className="hidden text-[15px] font-black text-[#071A3D] sm:inline">{firstName}</span>
              <ChevronDown className="hidden h-4 w-4 sm:block" />
            </div>
          </div>
        </header>

        <section className="relative z-10 mx-auto max-w-[1328px] rounded-[18px] border border-[#CFE0F7] bg-[linear-gradient(135deg,#EEF6FF_0%,#F8FBFF_48%,#E9F3FF_100%)] px-6 py-7 shadow-[0_18px_40px_rgba(31,74,132,0.08)] sm:px-10 lg:grid lg:min-h-[455px] lg:grid-cols-[360px_minmax(0,1fr)_275px] lg:items-center lg:gap-8">
          <div className="pointer-events-none absolute left-8 top-14 text-[42px] text-[#9FB9FA]">✦</div>
          <div className="pointer-events-none absolute left-20 top-24 text-[34px] text-[#9FB9FA]">✦</div>
          <div className="pointer-events-none absolute right-7 top-14 text-[38px] text-[#9FB9FA]">✦</div>
          <div className="pointer-events-none absolute right-10 top-24 text-[34px] text-[#9FB9FA]">✦</div>
          <img src={tfngFeedbackAssets.leaf} alt="" className="pointer-events-none absolute bottom-8 right-12 hidden h-[95px] opacity-50 lg:block" />

          <div className="relative mx-auto h-[320px] max-w-[350px] lg:mx-0 lg:h-[390px]">
            <div className="absolute bottom-0 left-8 right-8 h-10 rounded-full bg-[#071A3D]/10 blur-xl" />
            <img src={tfngFeedbackAssets.mascotHero} alt="" className="relative h-full w-full object-contain object-bottom drop-shadow-[0_18px_26px_rgba(89,55,16,0.14)]" />
          </div>

          <div className="text-center">
            <h1 className="text-[36px] font-black leading-tight text-[#10166C] sm:text-[46px]">
              {hasPassedLevel ? 'Great work' : 'Good effort'}, {firstName}! <span className="text-[#8A67FF]">♥</span>
            </h1>
            <p className="mx-auto mt-7 max-w-[620px] text-[18px] font-bold leading-[34px] text-[#071A3D]">
              {hasPassedLevel
                ? 'You mastered this evolution and unlocked the next step in your TFNG journey.'
                : 'You’re on the right track, but you need a little more guidance before moving to the next evolution.'}
            </p>
            <div className="mx-auto mt-8 flex max-w-[500px] items-center gap-5 rounded-[26px] border border-[#B9C9FF] bg-white/55 px-6 py-5 text-left shadow-[0_16px_30px_rgba(60,91,255,0.08)] backdrop-blur">
              <img src={tfngFeedbackAssets.light} alt="" className="h-[74px] w-[74px] shrink-0 object-contain drop-shadow-[0_10px_18px_rgba(60,91,255,0.14)]" />
              <p className="text-[16px] font-bold leading-[29px] text-[#071A3D]">
                Every expert was once a beginner.<br />With the right support, you’ll get there!
              </p>
            </div>
          </div>

          <div className="mx-auto mt-8 grid h-[244px] w-[244px] place-items-center rounded-full lg:mt-0" style={{ background: `conic-gradient(#3F74F6 ${accuracy * 3.6}deg, #D9E7FB 0deg)` }}>
            <div className="grid h-[200px] w-[200px] place-items-center rounded-full bg-[#F7FBFF] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]">
              <div className="text-center">
                <p className="text-[48px] font-black leading-none text-[#2D63F3]">{Math.round(accuracy)}%</p>
                <p className="mt-3 text-[15px] font-black text-[#071A3D]">Overall Accuracy</p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto mt-5 max-w-[1328px] rounded-[18px] border border-[#D3E2F7] bg-white/78 p-5 shadow-[0_16px_34px_rgba(8,25,58,0.08)] backdrop-blur sm:p-7">
          {showSetWiseSummary ? (
            <div className="space-y-8">
              {attemptSummaries.map((attemptSummary: any, index: number) => {
                const setNo = Number(attemptSummary.set_no || attemptSummary.attempt_no || index + 1);
                return (
                  <div key={`set-${setNo}`} className="rounded-[18px] border border-[#D3E2F7] bg-white/62 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:p-6">
                    <SectionTitle title={`Your Performance Summary Set ${setNo}`} />
                    {renderStatCards(getStatCards(attemptSummary))}
                    <div className="mt-6">
                      <SectionTitle title={`Passage Breakdown Set ${setNo}`} />
                      {renderPassageBreakdown(getPassageBreakdown(attemptSummary))}
                    </div>
                    {index < attemptSummaries.length - 1 ? renderFoundationBlock() : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <SectionTitle title="Your Performance Summary" />
              {renderStatCards(statCards)}
              {renderFoundationBlock()}
              <div className="mt-6">
                <SectionTitle title="Passage Breakdown" />
                {renderPassageBreakdown(passageBreakdown)}
              </div>
            </>
          )}

          <div className="relative mt-6 overflow-hidden rounded-[18px] border border-[#C7DBFB] bg-[linear-gradient(135deg,#DCEBFF_0%,#F6FAFF_100%)] px-6 py-4 md:flex md:min-h-[148px] md:items-center md:gap-7">
            <div className="relative h-[122px] w-[196px] shrink-0 overflow-hidden">
              <img src={tfngFeedbackAssets.mascotHelp} alt="" className="absolute bottom-[-18px] left-0 h-[158px] w-[158px] object-contain drop-shadow-[0_12px_20px_rgba(8,25,58,0.12)]" />
            </div>
            <div className="min-w-0 flex-1 text-center md:text-left">
              <h2 className="text-[25px] font-black text-[#10166C]">{showInstructorCta ? 'Need a helping hand?' : hasPassedLevel ? 'Ready for the next challenge?' : 'Keep practicing with Hooty!'}</h2>
              <p className="mt-3 text-[16px] font-semibold leading-[26px] text-[#071A3D]">
                {showInstructorCta
                  ? 'Connect with your instructor for personalized tips and guidance. They’ll help you overcome the tricky parts and reach the next level.'
                  : hasPassedLevel
                  ? 'Continue while the strategy is fresh and keep building your mastery.'
                  : 'Repeat this level once more and strengthen the tricky parts before moving ahead.'} <span className="text-[#8A67FF]">♥</span>
              </p>
            </div>
            <button
              onClick={showInstructorCta ? onContactInstructor : onContinue}
              className={`mt-5 inline-flex h-[74px] w-full items-center justify-center gap-4 rounded-[18px] px-7 text-[18px] font-black text-white shadow-[0_14px_26px_rgba(20,47,133,0.25)] md:mt-0 md:w-[360px] ${showInstructorCta ? 'bg-[#18388F] hover:bg-[#122B72]' : hasPassedLevel ? 'bg-[#1F66FF] hover:bg-[#1558EA]' : 'bg-[#EF5F55] hover:bg-[#DF5048]'}`}
            >
              <GraduationCap className="h-8 w-8" />
              {showInstructorCta ? instructorMode ? 'Unlock Next Evolution' : 'Contact Your Instructor' : hasPassedLevel ? 'Unlock Next Level' : 'Repeat This Level'}
              <ArrowRight className="h-7 w-7" />
            </button>
          </div>
        </section>

        <footer className="relative z-10 mx-auto mt-6 flex max-w-[720px] items-center justify-center gap-5 text-center text-[16px] font-bold text-[#10166C]">
          <span className="hidden h-px flex-1 bg-[#BBD1FB] sm:block" />
          <img src={tfngFeedbackAssets.leaf} alt="" className="h-10 w-10 rotate-[72deg] opacity-55" />
          <span>Keep learning. Keep improving. You’ve got this! <span className="text-[#8A67FF]">♥</span></span>
          <img src={tfngFeedbackAssets.leaf} alt="" className="h-10 w-10 -rotate-[112deg] opacity-55" />
          <span className="hidden h-px flex-1 bg-[#BBD1FB] sm:block" />
        </footer>
      </div>
    </main>
  );
};

const SectionTitle = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3">
    <BookOpen className="h-6 w-6 text-[#294B77]" />
    <h2 className="text-[22px] font-black uppercase text-[#10166C]">{title}</h2>
  </div>
);

const PassSectionTitle = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3">
    <BookOpen className="h-6 w-6 text-[#8B3613]" />
    <h2 className="text-[22px] font-black uppercase text-[#6B2D14]">{title}</h2>
  </div>
);

const InfoPanel = ({
  icon,
  title,
  body,
  footer,
  tone
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  footer: string;
  tone: 'amber' | 'blue';
}) => (
  <div className={`relative min-h-[190px] overflow-hidden rounded-[20px] border bg-white p-5 shadow-[0_14px_30px_rgba(8,25,58,0.08)] xl:h-[190px] xl:w-full ${tone === 'amber' ? 'border-[#FBD48A] bg-gradient-to-b from-[#FFFDF8] to-[#FFF9EE]' : 'border-[#E3EAF5]'}`}>
    <div className="relative z-10 flex items-center gap-3">
      <span className={`grid h-9 w-9 place-items-center rounded-full ${tone === 'amber' ? 'bg-[#FFF0CC]' : 'bg-[#EEF5FF]'}`}>{icon}</span>
      <p className={`text-[13px] font-black uppercase tracking-[0.02em] ${tone === 'amber' ? 'text-[#B8660B]' : 'text-[#071A3D]'}`}>{title}</p>
    </div>
    <p className="relative z-10 mx-auto mt-5 max-w-[170px] text-center text-[13.5px] font-black leading-[21px] text-[#071A3D]">{body}</p>
    {footer ? <p className={`relative z-10 mt-2 text-center text-[22px] font-black ${tone === 'amber' ? 'text-[#B8660B]' : 'text-[#EF5F55]'}`}>{footer}</p> : null}
  </div>
);

const RecentActivity = ({ activities = [] }: { activities?: RecentActivityItem[] }) => {
  const rows = activities.slice(0, 3);
  return (
    <aside className="rounded-[24px] border border-[#E4ECF7] bg-white p-6 shadow-[0_18px_38px_rgba(8,25,58,0.09)] xl:absolute xl:bottom-[104px] xl:right-[54px] xl:h-[250px] xl:w-[300px] xl:p-5">
      <div className="mb-3 flex items-center gap-3">
        <Clock className="h-4 w-4 text-[#294B77]" />
        <h3 className="text-[13px] font-black uppercase tracking-[0.03em] text-[#071A3D]">Recent Activity</h3>
      </div>
      {rows.length > 0 ? (
        <div className="grid gap-2.5">
          {rows.map((activity, index) => {
            const accuracy = Number(activity.accuracy ?? 0);
            const isComplete = activity.is_complete ?? activity.status === 'submitted';
            const tone = index === 0 ? 'green' : index === 1 ? 'amber' : 'rose';
            const bg = tone === 'green' ? 'bg-[#DDF7EA]' : tone === 'amber' ? 'bg-[#FFF2CC]' : 'bg-[#FFE0DE]';
            const icon = tone === 'amber'
              ? <Star className="h-5 w-5 fill-[#F59E24] text-[#F59E24]" />
              : <BookOpen className={`h-5 w-5 ${tone === 'green' ? 'text-[#138A63]' : 'text-[#C2413A]'}`} />;

            return (
          <div key={activity.id || `${activity.title}-${index}`} className="flex items-center gap-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${bg}`}>{icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-black leading-5 text-[#071A3D]">{activity.title}</span>
              <span className="block text-[12px] font-bold leading-4 text-[#294B77]">
                {activity.score ? `Score: ${activity.score}` : `Score: ${accuracy}%`}
              </span>
            </span>
            {isComplete ? <CheckCircle2 className="h-5 w-5 shrink-0 fill-[#10B981] text-white" /> : <Clock className="h-5 w-5 shrink-0 text-[#64748B]" />}
          </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl bg-[#F8FAFC] p-4 text-[13px] font-bold leading-5 text-slate-500">No TFNG activity yet.</p>
      )}
      <button className="mt-3 flex h-10 w-full items-center justify-center gap-3 rounded-xl bg-[#F1F5F9] text-[14px] font-black text-[#1367FF] hover:bg-[#E8EEF6]">
        View all activity <ArrowRight className="h-4 w-4" />
      </button>
    </aside>
  );
};

const toRoman = (value: number) => {
  const numerals: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ];
  let remaining = Math.max(1, Math.round(value));
  let result = '';
  for (const [number, symbol] of numerals) {
    while (remaining >= number) {
      result += symbol;
      remaining -= number;
    }
  }
  return result;
};

const MasteryShell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <main
    className="min-h-screen bg-[#F8FAFC] bg-no-repeat px-4 py-5 text-[#05162E] sm:px-8"
    style={{
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      backgroundImage: `url('${assets.readingPractice.background}')`,
      backgroundPosition: 'bottom center',
      backgroundSize: '100% auto'
    }}
  >
    <header className="mx-auto mb-5 flex w-full max-w-7xl items-center justify-between gap-4">
      <Link to="/tests?mode=practice" className="inline-flex items-center gap-2 text-[14px] font-black text-[#05162E] hover:text-[#294b77]">
        <ArrowLeft className="h-4 w-4" /> Back to Reading Practice
      </Link>
      <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12px] font-black text-[#294b77] shadow-sm">
        <BookOpen className="h-4 w-4" /> {title}
      </span>
    </header>
    <div className="mx-auto grid w-full max-w-7xl place-items-center">
      {children}
    </div>
  </main>
);

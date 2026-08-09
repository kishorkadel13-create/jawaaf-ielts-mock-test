import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, CheckCircle2, ChevronDown, Clock, Flame, Flag, GraduationCap, LoaderCircle, ShieldCheck, Star, Target, Trophy } from 'lucide-react';
import { api } from '../../services/api';
import { assets } from '../../config/assets';
import { useAuthStore } from '../../store/authStore';
import JawaafLogo from '../../components/JawaafLogo';

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
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        if (mode === 'entry') {
          const { data: startData } = await api.post('/mastery/tfng/start');
          if (startData?.next_page === 'complete_mastery') {
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
          setTimeRemaining(practiceData?.timer_seconds || 180);
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
  const currentFeedbackQuestion = feedbackQuestions[feedbackIndex] || null;
  const isLastFeedbackQuestion = feedbackIndex >= feedbackQuestions.length - 1;
  const quickStrategyCheck = String(data?.passage?.quick_strategy_check || '').trim();
  const hasPassedLevel = (data?.summary?.accuracy || 0) >= 60 || data?.summary?.decision === 'unlock_next';
  const studentName = String(profile?.full_name || profile?.email?.split('@')[0] || 'Sagun').trim();

  const formatTime = (seconds: number | null | undefined) => {
    const safeSeconds = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
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
    if (nextData.next_page === 'contact_instructor') window.location.href = nextData.instructor_support_url || '/teacher';
    if (nextData.next_page === 'complete_mastery') navigate('/tests?mode=practice');
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
      <MasteryShell title={pageTitle}>
        <section className="grid h-[calc(100vh-150px)] w-full max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_430px]">
          <article className="overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-[24px] font-black text-[#05162E]">{data?.passage?.title}</h2>
            <div className="prose prose-slate mt-5 max-w-none" dangerouslySetInnerHTML={{ __html: data?.passage?.passage_html || '' }} />
          </article>
          <aside className="overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-[#EFF4FB] p-4">
              <span className={`inline-flex items-center gap-2 text-[14px] font-black ${Number(timeRemaining || 0) <= 30 ? 'text-[#ef5f55]' : 'text-[#294b77]'}`}>
                <Clock className="h-4 w-4" /> {formatTime(timeRemaining ?? data?.timer_seconds ?? 180)}
              </span>
              <span className="text-[12px] font-black text-slate-500">Passage {data?.progress?.current_passage_order}/{data?.progress?.total_passages}</span>
            </div>
            <div className="grid gap-4">
              {(data?.questions || []).map((question: any) => (
                <div key={question.id} className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
                  <p className="text-[13px] font-black text-[#05162E]">Q{question.question_number}. {question.question_text}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {answerOptions.map(option => (
                      <button
                        key={option}
                        onClick={() => setAnswers(current => ({ ...current, [question.id]: option }))}
                        className={`rounded-xl border px-2 py-2 text-[11px] font-black ${answers[question.id] === option ? 'border-[#294b77] bg-[#294b77] text-white' : 'border-slate-200 bg-white text-[#294b77]'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="mt-3 inline-flex items-center gap-2 text-[11px] font-black text-slate-400">
                    <Flag className="h-3.5 w-3.5" /> Flag
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => submitPractice(false)} disabled={submitting} className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#ef5f55] text-[14px] font-black text-white disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit Passage'} <ArrowRight className="h-4 w-4" />
            </button>
          </aside>
        </section>
      </MasteryShell>
    );
  }

  if (mode === 'feedback') {
    return (
      <MasteryShell title="Feedback">
        <section className="grid h-[calc(100vh-150px)] w-full max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_470px]">
          <article className="overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-[24px] font-black text-[#05162E]">{data?.passage?.title}</h2>
            <div className="prose prose-slate mt-5 max-w-none" dangerouslySetInnerHTML={{ __html: data?.passage?.passage_html || '' }} />
          </article>
          <aside className="overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {showStrategyCheck && quickStrategyCheck ? (
              <>
                <div className="mb-4 rounded-2xl bg-yellow-50 p-4">
                  <span className="text-[13px] font-black text-yellow-700">💡 Quick Strategy Check</span>
                </div>
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50/60 p-5">
                  <div
                    className="text-[14px] font-bold leading-7 text-slate-700 [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-1 [&_strong]:font-black"
                    dangerouslySetInnerHTML={{ __html: formatFeedbackHtml(quickStrategyCheck) }}
                  />
                </div>
                <button onClick={continueFromFeedback} className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#294b77] text-[14px] font-black text-white">
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : currentFeedbackQuestion ? (
              <>
                <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#EFF4FB] p-4">
                  <span className="text-[13px] font-black text-[#294b77]">Question {feedbackIndex + 1}/{feedbackQuestions.length}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${currentFeedbackQuestion.is_correct ? 'bg-emerald-50 text-emerald-700' : 'bg-[#FFF3F2] text-[#ef5f55]'}`}>
                    {currentFeedbackQuestion.is_correct ? 'Correct' : currentFeedbackQuestion.student_answer ? 'Review' : 'Unanswered'}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-black leading-6 text-[#05162E]">Q{currentFeedbackQuestion.question_number}. {currentFeedbackQuestion.question_text}</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-[12px] font-bold text-slate-600">
                    <p>Your answer: <b>{currentFeedbackQuestion.student_answer || 'Unanswered'}</b></p>
                    <p>Correct answer: <b>{currentFeedbackQuestion.correct_answer}</b></p>
                    <p>Trap: <b>{currentFeedbackQuestion.trap_type || 'TFNG reasoning'}</b></p>
                    <p>Locate: <b>{[currentFeedbackQuestion.locate_paragraph, currentFeedbackQuestion.locate_sentence].filter(Boolean).join(', ') || 'See highlighted text'}</b></p>
                    <div
                      className="rounded-xl bg-white p-3 leading-5 [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-1 [&_strong]:font-black"
                      dangerouslySetInnerHTML={{ __html: formatFeedbackHtml(currentFeedbackQuestion.detailed_explanation || '') }}
                    />
                  </div>
                </div>
                {isLastFeedbackQuestion ? (
                  <button onClick={quickStrategyCheck ? () => setShowStrategyCheck(true) : continueFromFeedback} className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#294b77] text-[14px] font-black text-white">
                    {quickStrategyCheck ? 'Quick Strategy Check' : 'Continue'} <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={() => setFeedbackIndex(current => current + 1)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#ef5f55] text-[14px] font-black text-white">
                    Next Feedback <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </>
            ) : (
              <p className="rounded-2xl bg-[#F8FAFC] p-4 text-[14px] font-bold text-slate-500">Feedback is not available for this passage yet.</p>
            )}
          </aside>
        </section>
      </MasteryShell>
    );
  }

  return (
    <MasteryShell title="Overall Performance">
      <section className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-xl">
        <GraduationCap className="mx-auto h-16 w-16 text-[#294b77]" />
        <h1 className="mt-4 text-[34px] font-black text-[#05162E]">Evolution {data?.summary?.evolution_number} Summary</h1>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
          {[
            ['Passages Completed', `${data?.summary?.passages_completed}/${data?.summary?.total_passages}`],
            ['Questions Attempted', data?.summary?.questions_attempted],
            ['Correct', data?.summary?.correct_answers],
            ['Wrong', data?.summary?.wrong_answers],
            ['Unanswered', data?.summary?.unanswered_questions],
            ['Accuracy', `${data?.summary?.accuracy}%`]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-[#F8FAFC] p-4">
              <p className="text-[11px] font-black uppercase text-slate-400">{label}</p>
              <p className="mt-1 text-[24px] font-black text-[#05162E]">{value}</p>
            </div>
          ))}
        </div>
        <div className={`mt-6 rounded-2xl p-5 text-[15px] font-bold leading-6 ${hasPassedLevel ? 'bg-emerald-50 text-emerald-700' : 'bg-[#FFF3F2] text-[#B43B35]'}`}>
          {hasPassedLevel
            ? `Great work! Your accuracy is ${data?.summary?.accuracy}%, so the next level is unlocked.`
            : `Your accuracy is ${data?.summary?.accuracy}%, below the required 60%. You cannot go to the next level yet, so this level will repeat.`}
        </div>
        <p className="mt-3 rounded-2xl bg-[#EFF4FB] p-5 text-[15px] font-bold leading-6 text-[#294b77]">{data?.summary?.hooty_comment}</p>
        <button onClick={continueFromPerformance} className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#ef5f55] px-6 text-[15px] font-black text-white">
          {hasPassedLevel ? 'Unlock Next Level' : 'Repeat This Level'} <ArrowRight className="h-5 w-5" />
        </button>
      </section>
    </MasteryShell>
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
            <button className="relative hidden h-11 w-11 place-items-center rounded-2xl text-[#071A3D] hover:bg-[#F4F7FB] sm:grid" aria-label="Notifications">
              <Bell className="h-6 w-6" />
              <span className="absolute right-1 top-0 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#E92F37] text-[10px] font-black leading-none text-white">3</span>
            </button>
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

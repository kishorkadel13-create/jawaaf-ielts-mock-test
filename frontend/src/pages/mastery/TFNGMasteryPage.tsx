import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, Flag, GraduationCap, LoaderCircle, Trophy } from 'lucide-react';
import { api } from '../../services/api';
import { assets } from '../../config/assets';

type PageMode = 'entry' | 'design' | 'practice' | 'feedback' | 'performance';

type TFNGMasteryPageProps = {
  mode: PageMode;
};

const answerOptions = ['TRUE', 'FALSE', 'NOT GIVEN'] as const;

export default function TFNGMasteryPage({ mode }: TFNGMasteryPageProps) {
  const navigate = useNavigate();
  const { attemptId, passageAttemptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
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
  const hasPassedLevel = (data?.summary?.accuracy || 0) >= 60 || data?.summary?.decision === 'unlock_next';

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
      <MasteryShell title={pageTitle}>
        <section className="grid w-full max-w-5xl gap-6 rounded-[28px] border border-amber-200 bg-gradient-to-br from-white via-[#FFF9EE] to-[#FFF1D9] p-8 shadow-xl md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#C26300]">Evolution {data?.evolution?.evolution_number}</p>
            <h1 className="mt-3 text-[42px] font-black leading-tight text-[#05162E]">{data?.evolution?.name || 'TFNG Mastery'}</h1>
            <p className="mt-4 max-w-2xl text-[17px] font-semibold leading-7 text-[#294b77]">
              {data?.evolution?.hooty_wisdom || 'Read carefully, eliminate traps, and build your TFNG mastery one passage at a time.'}
            </p>
            <div className="mt-6 grid gap-3 text-[14px] font-black text-[#294b77] sm:grid-cols-3">
              <span className="rounded-2xl bg-white/80 p-4">Passages: {data?.total_passages}</span>
              <span className="rounded-2xl bg-white/80 p-4">Timer: {Math.round((data?.evolution?.timer_seconds || 180) / 60)} min</span>
              <span className="rounded-2xl bg-white/80 p-4">XP: +{data?.evolution?.xp_per_passage}/passage</span>
            </div>
            <button onClick={continueFromDesign} className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#ef5f55] px-6 text-[15px] font-black text-white shadow-lg shadow-[#ef5f55]/20">
              Continue to Practice <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          <img src={assets.readingPractice.tfng} alt="" className="mx-auto h-[250px] w-[250px] object-contain" />
        </section>
      </MasteryShell>
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
            {currentFeedbackQuestion ? (
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
                    <p className="rounded-xl bg-white p-3 leading-5">{currentFeedbackQuestion.detailed_explanation}</p>
                  </div>
                </div>
                {isLastFeedbackQuestion ? (
                  <button onClick={continueFromFeedback} className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#294b77] text-[14px] font-black text-white">
                    Continue <ArrowRight className="h-4 w-4" />
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

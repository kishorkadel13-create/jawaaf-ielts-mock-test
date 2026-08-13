import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Award, CheckCircle2, XCircle, ArrowLeft, PenLine, ClipboardCheck, BarChart3, Info, MessageSquareText, Sparkles, Star, ArrowRight, BookOpen, TrendingUp } from 'lucide-react';
import JawaafLogo from '../components/JawaafLogo';
import StudentSidebar from '../components/StudentSidebar';

export default function ResultPage({ writingTaskType = null }) {
  const { id } = useParams(); // attempt_id
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const { data: res } = await api.get(`/attempts/${id}/review`);
        setData(res);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load result review details:', err);
        setLoading(false);
      }
    };
    fetchResult();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <JawaafLogo className="h-16 w-auto mb-8" />
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#2C4B78] rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 text-sm font-bold animate-pulse">Calculating scores and grading keys...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <JawaafLogo className="h-16 w-auto mb-8" />
        <h3 className="text-xl font-black text-[#05162E]">Result Not Found</h3>
        <p className="text-slate-500 mt-2 text-sm font-semibold">The specified exam attempt log does not exist.</p>
        <Link to="/dashboard" className="mt-6 px-5 py-3 bg-[#2C4B78] hover:bg-[#1E3A6E] text-white rounded-xl text-sm font-black">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { attempt } = data;
  const allAnswers = data.answers || [];
  const allWritingAnswers = allAnswers.filter(a => a.question_type === 'WRITING_TASK');
  const getAnswerWritingTaskType = (answer) => {
    const taskLabel = String(answer.extra_data?.task_type || answer.extra_data_json?.task_type || '').toLowerCase();
    if (taskLabel.includes('1')) return 'task-1';
    if (taskLabel.includes('2')) return 'task-2';

    const fallbackIndex = allWritingAnswers.findIndex(writingAnswer => writingAnswer.id === answer.id);
    return fallbackIndex >= 0 ? `task-${fallbackIndex + 1}` : null;
  };
  const answers = writingTaskType
    ? allWritingAnswers.filter(answer => getAnswerWritingTaskType(answer) === writingTaskType)
    : allAnswers;
  const writingAnswers = answers.filter(a => a.question_type === 'WRITING_TASK');
  const objectiveAnswers = answers.filter(a => a.question_type !== 'WRITING_TASK');
  const isWritingOnly = writingAnswers.length > 0 && objectiveAnswers.length === 0;
  const hasWriting = writingAnswers.length > 0;
  const isPracticeAttempt = data.attempt_mode === 'practice';
  const isPracticeWritingOnly = isPracticeAttempt && isWritingOnly;
  const hasTeacherFeedback = Boolean(data.feedback);
  const isPendingTeacherReview = hasWriting && !hasTeacherFeedback && data.can_view_results === false;
  const isReviewedWriting = isWritingOnly && hasTeacherFeedback;
  const hasStudentAnswer = (answer) => Array.isArray(answer)
    ? answer.some(item => String(item || '').trim())
    : Boolean(String(answer || '').trim());
  const getAnswerScore = (answer) => {
    const score = Number(answer?.score);
    return Number.isFinite(score) ? score : answer?.is_correct ? Number(answer?.marks) || 1 : 0;
  };
  const getAnswerMaxScore = (answer) => {
    const marks = Number(answer?.marks);
    if (Number.isFinite(marks) && marks > 0) return marks;
    return 1;
  };
  const correctCount = objectiveAnswers.reduce((sum, answer) => sum + getAnswerScore(answer), 0);
  const wrongCount = objectiveAnswers.filter(answer => hasStudentAnswer(answer.student_answer) && getAnswerScore(answer) <= 0).length;
  const unansweredCount = answers.filter(answer => !hasStudentAnswer(answer.student_answer)).length;
  const getTaskFeedback = (answer) => (
    data.feedback?.task_feedback?.[answer.question_id] ||
    data.feedback?.task_feedback?.[answer.id] ||
    data.feedback ||
    {}
  );
  const getWritingDescriptorRows = (taskFeedback) => [
    ['Task Achievement', taskFeedback.task_achievement_score, taskFeedback.task_achievement],
    ['Coherence & Cohesion', taskFeedback.coherence_cohesion_score, taskFeedback.coherence_cohesion],
    ['Lexical Resource', taskFeedback.lexical_resource_score, taskFeedback.lexical_resource],
    ['Grammatical Range & Accuracy', taskFeedback.grammar_score, taskFeedback.grammar]
  ];

  const currentQ = answers[activeQuestionIndex];
  const currentScore = getAnswerScore(currentQ);
  const currentMaxScore = getAnswerMaxScore(currentQ);
  const currentHasAnswer = hasStudentAnswer(currentQ?.student_answer);
  const currentIsFullyCorrect = currentQ?.is_correct || currentScore >= currentMaxScore;
  const cleanReviewValue = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const getOptionLetter = (index) => String.fromCharCode(65 + index);
  const isReviewOptionSelected = (question, option, index) => {
    const submitted = Array.isArray(question?.student_answer) ? question.student_answer : [question?.student_answer];
    const optionLetter = getOptionLetter(index);
    const optionText = cleanReviewValue(option);
    return submitted.some(answer => cleanReviewValue(answer) === cleanReviewValue(optionLetter) || cleanReviewValue(answer) === optionText);
  };
  const isReviewOptionCorrect = (question, option, index) => {
    const correctAnswers = Array.isArray(question?.correct_answers) ? question.correct_answers : [];
    const optionLetter = getOptionLetter(index);
    const optionText = cleanReviewValue(option);
    return correctAnswers.some(answer => cleanReviewValue(answer) === cleanReviewValue(optionLetter) || cleanReviewValue(answer) === optionText);
  };
  const currentTaskFeedback = currentQ?.question_type === 'WRITING_TASK' ? getTaskFeedback(currentQ) : {};
  const currentTaskTitle = currentQ?.extra_data?.task_type || (currentQ?.question_type === 'WRITING_TASK' ? `Writing Task ${allWritingAnswers.findIndex(answer => answer.id === currentQ.id) + 1}` : '');
  const isWritingFeedbackPage = Boolean((writingTaskType || isWritingOnly) && hasWriting);
  const writingTaskNumber = writingTaskType === 'task-2' ? '2' : currentTaskTitle?.includes('2') ? '2' : '1';
  const writingTaskLabel = `Writing Task ${writingTaskNumber}`;
  const submittedDate = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
  const reviewedDate = data.feedback?.updated_at ? new Date(data.feedback.updated_at) : null;
  const formatDateTime = (date) => date && !Number.isNaN(date.getTime())
    ? date.toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Not available';
  const overallBandScore = data.feedback?.band_score ? Number(data.feedback.band_score).toFixed(1) : 'Pending';
  const descriptorThemes = [
    {
      label: 'Task Achievement',
      icon: BarChart3,
      score: currentTaskFeedback.task_achievement_score,
      note: currentTaskFeedback.task_achievement,
      color: '#1F6BFF',
      border: 'border-[#BFD4FF]',
      bg: 'bg-gradient-to-b from-[#F7FAFF] to-white',
      iconBg: 'bg-[#EAF2FF]',
    },
    {
      label: 'Coherence & Cohesion',
      icon: TrendingUp,
      score: currentTaskFeedback.coherence_cohesion_score,
      note: currentTaskFeedback.coherence_cohesion,
      color: '#06965A',
      border: 'border-emerald-200',
      bg: 'bg-gradient-to-b from-emerald-50/70 to-white',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Lexical Resource',
      icon: PenLine,
      score: currentTaskFeedback.lexical_resource_score,
      note: currentTaskFeedback.lexical_resource,
      color: '#FF4E1F',
      border: 'border-orange-200',
      bg: 'bg-gradient-to-b from-orange-50/70 to-white',
      iconBg: 'bg-orange-100',
    },
    {
      label: 'Grammatical Range & Accuracy',
      icon: BookOpen,
      score: currentTaskFeedback.grammar_score,
      note: currentTaskFeedback.grammar,
      color: '#7C3AED',
      border: 'border-violet-200',
      bg: 'bg-gradient-to-b from-violet-50/70 to-white',
      iconBg: 'bg-violet-100',
    },
  ];
  const getDescriptorPreview = (text) => {
    const value = String(text || 'Teacher feedback will appear here after review.').trim();
    return value.length > 84 ? `${value.slice(0, 84).trim()}...` : value;
  };
  const defaultOverallFeedback = [
    'You have presented the information clearly and highlighted the main trends in the chart. Your report has a logical structure with a good introduction and overview.',
    'However, to achieve a higher band score, focus on providing more detailed comparisons and using a wider range of accurate vocabulary as well as complex sentence structures.'
  ];
  const overallFeedbackParagraphs = String(data.feedback?.examiner_comments || '')
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
  const feedbackParagraphs = overallFeedbackParagraphs.length > 0 ? overallFeedbackParagraphs : defaultOverallFeedback;

  if (isWritingFeedbackPage) {
    return (
      <div className="flex min-h-screen overflow-x-hidden bg-[#F7FAFF] text-[#071A36]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <StudentSidebar />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-5 py-6 lg:px-8">
            <header className="flex items-center justify-between gap-4">
              <Link to="/tests?mode=practice" className="inline-flex items-center gap-2 text-[14px] font-black text-[#0B4AA2] hover:text-[#EE6055]">
                <ArrowLeft className="h-4 w-4" /> Back to Practice Tests
              </Link>
              <div className="hidden items-center gap-3 text-[12px] font-black uppercase tracking-[0.08em] text-[#071A36] sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Jawaaf Testing Platform
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#EEF3FF] text-[#071A36]">S</span>
              </div>
            </header>

            <section
              className="overflow-visible rounded-[28px] border border-[#DDE8F6] bg-white p-4 shadow-[0_18px_44px_rgba(15,42,76,0.07)]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), url('/images/feedback/background.png')",
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover'
              }}
            >
              <div className="grid gap-6">
                <div className="relative grid gap-4 pb-3 lg:h-[120px] lg:grid-cols-[minmax(0,1fr)_124px_172px_300px] lg:items-start xl:grid-cols-[minmax(560px,1fr)_124px_176px_360px]">
                  <div className="pointer-events-none absolute bottom-0 left-0 h-px bg-[#DDE8F6] lg:w-[calc(100%-496px)] xl:w-[calc(100%-560px)]"></div>
                  <div className="min-w-0 pt-1">
                    <h1 className="text-[26px] font-black leading-tight tracking-tight text-[#071A36] sm:text-[32px] xl:whitespace-nowrap">
                      {writingTaskLabel}
                      <span className="mx-2 text-[#0057FF]">•</span>
                      <span className="text-[20px] text-[#0057FF] sm:text-[22px]">Feedback Report</span>
                    </h1>
                    <p className="mt-3 text-[13px] font-normal leading-6 text-[#071A36] xl:whitespace-nowrap">
                      <span><span className="font-bold">Submitted on</span> {formatDateTime(submittedDate)}</span>
                      <span className="mx-4">•</span>
                      <span><span className="font-bold">Reviewed on</span> {formatDateTime(reviewedDate)}</span>
                    </p>
                  </div>

                  <div className="hidden h-24 items-center justify-center rounded-2xl border border-[#DDE8F6] bg-[#F8FBFF] text-center shadow-sm lg:flex">
                    <div>
                      <div className="mb-2 flex items-center justify-center gap-2 text-[#0057FF]">
                        <ClipboardCheck className="h-6 w-6" />
                        <p className="text-[14px] font-black text-[#071A36]">Task {writingTaskNumber}</p>
                      </div>
                      <p className="text-[13px] font-bold text-[#071A36]">Academic</p>
                    </div>
                  </div>

                  <div className="hidden items-start justify-center lg:flex">
                    <img
                      src="/images/feedback/writing-feedback-hero-mascot-natural.png"
                      alt="Jawaaf feedback mascot"
                      className="-mt-5 h-48 w-48 object-contain drop-shadow-[0_14px_18px_rgba(15,42,76,0.12)] xl:h-52 xl:w-52"
                    />
                  </div>

                  <div className="relative hidden min-h-[104px] w-full rounded-2xl border border-[#DDE8F6] bg-[#F8FBFF] px-6 py-5 shadow-sm before:absolute before:-left-3 before:top-10 before:h-6 before:w-6 before:rotate-45 before:border-b before:border-l before:border-[#DDE8F6] before:bg-[#F8FBFF] lg:block">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[21px] font-black italic leading-none text-[#071A36]">Great effort!</p>
                        <p className="mt-3 text-[13px] font-bold leading-5 text-[#071A36]">You're on the right path to achieving your target band.</p>
                      </div>
                      <Sparkles className="h-8 w-8 shrink-0 text-amber-400" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-stretch">
                  <div className="flex h-full min-h-0 flex-col">
                  <div className="mt-2 flex items-center gap-2">
                    <h2 className="text-[16px] font-black text-[#071A36]">Band Scores by Criteria</h2>
                    <Info className="h-4 w-4 text-[#294b77]" />
                  </div>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {descriptorThemes.map((item) => {
                      const Icon = item.icon;
                      const displayScore = item.score !== null && item.score !== undefined && item.score !== '' ? Number(item.score).toFixed(1) : 'Pending';
                      const fullFeedback = String(item.note || 'No detailed teacher feedback added yet.').trim();

                      return (
                        <article
                          key={item.label}
                          tabIndex={0}
                          className={`group relative flex h-[340px] flex-col items-center rounded-2xl border ${item.border} ${item.bg} px-5 py-5 text-center outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-[#294b77]/15`}
                        >
                          <div className={`grid h-14 w-14 place-items-center rounded-full ${item.iconBg}`} style={{ color: item.color }}>
                            <Icon className="h-7 w-7" />
                          </div>
                          <h3 className="mt-4 min-h-[40px] text-[13px] font-black leading-5 text-[#071A36]">{item.label}</h3>
                          <p className="mt-3 text-[38px] font-black leading-none" style={{ color: item.color }}>{displayScore}</p>
                          <div className="my-5 h-px w-28 border-t border-dashed border-current opacity-20" style={{ color: item.color }}></div>
                          <p className="line-clamp-3 text-[12px] font-bold leading-5 text-[#071A36]">{getDescriptorPreview(item.note)}</p>

                          <div className="pointer-events-none absolute bottom-5 left-4 right-4 z-20 translate-y-2 rounded-2xl border border-[#DDE8F6] bg-white p-4 text-left text-[12px] font-bold leading-5 text-[#071A36] opacity-0 shadow-[0_18px_44px_rgba(15,42,76,0.16)] transition-all group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus:pointer-events-auto group-focus:translate-y-0 group-focus:opacity-100">
                            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: item.color }}>{item.label} Feedback</span>
                            {fullFeedback}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <section className="relative mt-10 min-h-[258px] flex-1 overflow-hidden rounded-[28px] border border-[#D9C9FF] bg-gradient-to-br from-white via-[#FCF8FF] to-[#F1ECFF] px-7 py-7">
                    <div className="pointer-events-none absolute -right-16 -top-10 h-36 w-[390px] rounded-[50%] bg-[#EDE7FF]/70"></div>
                    <div className="pointer-events-none absolute bottom-[-58px] left-[34%] h-28 w-[390px] rounded-[50%] bg-white"></div>
                    <div className="pointer-events-none absolute right-20 top-10 h-3 w-3 rounded-full border-4 border-[#B9B0F7]/70"></div>
                    <Sparkles className="pointer-events-none absolute right-[265px] top-14 h-7 w-7 text-[#B9B0F7]/70" />

                    <div className="relative z-10 grid h-full min-h-[202px] gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                      <div className="self-start">
                        <div className="flex items-center gap-3">
                          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#EDE7FF] text-[#5A39D6]">
                            <MessageSquareText className="h-6 w-6" />
                          </span>
                          <h2 className="text-[22px] font-black leading-none text-[#071A36]">Overall Feedback</h2>
                        </div>
                        <div className="mt-6 max-w-[680px] space-y-4 text-[14px] font-semibold leading-7 text-[#071A36]">
                          {feedbackParagraphs.map((paragraph, index) => (
                            <React.Fragment key={`${paragraph}-${index}`}>
                              {index > 0 && <div className="h-px max-w-[620px] bg-[#DDE8F6]"></div>}
                              <p>{paragraph}</p>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      <div className="hidden h-full items-end justify-center lg:flex">
                        <img
                          src="/images/feedback/writing-feedback-overall-mascot-natural.png"
                          alt="Jawaaf writing mascot"
                          className="h-56 w-56 scale-[1.45] object-contain drop-shadow-[0_14px_18px_rgba(15,42,76,0.12)]"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <aside className="grid h-full gap-10 xl:grid-rows-[auto_minmax(0,1fr)]">
                  <div className="rounded-[28px] border border-[#DDE8F6] bg-white p-4 shadow-sm">
                    <h2 className="text-center text-[17px] font-black text-[#071A36]">Overall Band Score</h2>
                    <div className="relative mx-auto mt-4 grid h-40 w-40 place-items-center rounded-full border-[12px] border-emerald-100">
                      <Star className="absolute -left-4 top-7 h-8 w-8 fill-amber-400 text-amber-400" />
                      <Star className="absolute -right-4 top-10 h-8 w-8 fill-[#EE6055] text-[#EE6055]" />
                      <span className="text-[48px] font-black text-emerald-600">{overallBandScore}</span>
                    </div>
                    <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-center">
                      <p className="text-[14px] font-black text-emerald-700">You are almost there!</p>
                      <p className="mt-1 text-[12px] font-bold leading-5 text-[#071A36]">Keep working on accuracy and precision to boost your band score.</p>
                    </div>
                  </div>

                  <div className="relative flex h-full min-h-[258px] flex-col overflow-hidden rounded-[28px] border border-amber-200 bg-gradient-to-br from-white via-[#FFFDF7] to-amber-50 px-6 py-6 shadow-sm">
                    <div className="pointer-events-none absolute -bottom-10 -right-8 h-24 w-48 rounded-[50%] bg-[#D7E8FF]/80"></div>
                    <div className="relative z-10 flex items-center gap-3">
                      <Sparkles className="h-7 w-7 text-amber-500" />
                      <h2 className="text-[22px] font-black text-[#071A36]">What's Next?</h2>
                    </div>
                    <p className="relative z-10 mt-5 text-[14px] font-semibold leading-7 text-[#071A36]">Great progress! Keep practicing and apply these learnings in your next attempt.</p>
                    <div className="relative z-10 mt-auto pt-5">
                      <Link to="/tests?mode=practice" className="flex min-h-12 items-center justify-center gap-3 rounded-xl bg-amber-400 px-4 text-[14px] font-black text-[#071A36] shadow-sm hover:bg-amber-500">
                        Try Another Task <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link to="/tests?mode=practice" className="mt-4 flex min-h-10 items-center justify-center gap-3 rounded-xl text-[14px] font-black text-[#0057FF] hover:bg-white/60">
                        Back to Practice Tests <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </aside>
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
    <div className="border-b border-[#294b77]/20 shadow-sm" style={{ background: 'linear-gradient(to right, #294b77 0%, #294b77 100%)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <Link to="/dashboard" className="flex items-center gap-2 text-slate-200 hover:text-[#EE6055] transition-colors text-sm font-bold">
          <ArrowLeft className="h-4 w-4" /> Student Portal
        </Link>
        <span className="hidden text-sm font-black uppercase tracking-[0.18em] text-white sm:block">Jawaaf IELTS Lab</span>
        <span className="text-xs text-[#EE6055] font-black uppercase tracking-wider">{attempt.mock_tests?.title} Result</span>
      </div>
    </div>

    <div className="flex-1 flex flex-col p-6 md:p-10 max-w-6xl mx-auto w-full gap-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-[#EE6055] transition-colors text-sm font-bold">
          <ArrowLeft className="h-4 w-4" /> Student Portal
        </Link>
        <span className="hidden text-xs font-black uppercase tracking-[0.18em] text-[#2C4B78] sm:block">Jawaaf IELTS Lab</span>
        <span className="text-xs text-[#2C4B78] font-black uppercase tracking-wider">{attempt.mock_tests?.title} Result</span>
      </div>

      {/* Main Score Metrics Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
        {/* Radial highlight */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-[#EFF4FB] rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: 'linear-gradient(to right, #294b77 0%, #294b77 100%)' }}></div>

        {/* Big Band Ring */}
        <div className="relative w-36 h-36 shrink-0 flex flex-col items-center justify-center border-4 border-[#2C4B78]/25 rounded-full shadow-lg shadow-[#2C4B78]/5 bg-white">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{isPendingTeacherReview || isWritingOnly ? 'Status' : 'IELTS Score'}</span>
          <span className={`${isWritingOnly ? 'text-xl' : 'text-4xl'} font-black text-[#2C4B78] mt-0.5 text-center leading-tight`} style={{ fontFamily: 'var(--font-league-spartan)' }}>
            {isPendingTeacherReview
              ? 'Submitted'
              : isReviewedWriting
              ? data.feedback?.band_score
                ? `Band ${parseFloat(data.feedback.band_score).toFixed(1)}`
                : 'Reviewed'
              : isPracticeWritingOnly
              ? 'Practice'
              : isWritingOnly
              ? data.feedback?.band_score
                ? `Band ${parseFloat(data.feedback.band_score).toFixed(1)}`
                : 'Teacher Review'
              : `Band ${parseFloat(attempt.score).toFixed(1)}`}
          </span>
          {isPendingTeacherReview || isWritingOnly ? (
            <PenLine className="absolute -bottom-1 -right-1 h-7 w-7 text-[#2C4B78] bg-white rounded-full p-1 border border-[#2C4B78]/20" />
          ) : (
            <Award className="absolute -bottom-1 -right-1 h-7 w-7 text-[#2C4B78] bg-white rounded-full p-1 border border-[#2C4B78]/20" />
          )}
        </div>

        {/* Detailed Metrics */}
        <div className="flex-1 w-full space-y-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-[#2d2d2d] leading-tight" style={{ fontFamily: 'var(--font-league-spartan)' }}>
              {isPendingTeacherReview
                ? 'Thank you for submitting your answers.'
                : isReviewedWriting
                ? 'Teacher feedback is ready.'
                : isPracticeWritingOnly
                ? 'Writing practice submitted.'
                : isWritingOnly
                ? 'Writing feedback is ready.'
                : 'Test Attempt Completed Successfully!'}
            </h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed font-semibold">
              {isPendingTeacherReview
                ? `Your writing was submitted on ${new Date(attempt.submitted_at).toLocaleString()}. It has been saved and sent to the teacher review inbox.`
                : isReviewedWriting
                ? `Your teacher feedback and descriptor scores are shown below. Submitted on ${new Date(attempt.submitted_at).toLocaleString()}.`
                : isPracticeWritingOnly
                ? `Your writing practice was submitted on ${new Date(attempt.submitted_at).toLocaleString()}. Your response is saved below for self-review.`
                : isWritingOnly
                ? `Your teacher feedback was added after manual review. Submitted on ${new Date(attempt.submitted_at).toLocaleString()}.`
                : `Your test was auto-graded against official CBT answer sheets on ${new Date(attempt.submitted_at).toLocaleString()}.`}
            </p>
          </div>

          {/* Counts metrics list */}
          <div className="grid grid-cols-3 gap-4 pt-2 text-center">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wide block">{isWritingOnly ? 'Submitted' : 'Correct'}</span>
              <span className="text-xl font-black text-[#05162E] block mt-0.5">{isWritingOnly ? writingAnswers.filter(a => a.student_answer).length : correctCount}</span>
            </div>
            <div className="p-3 bg-[#FFF3F2] border border-[#EE6055]/15 rounded-xl">
	              <span className="text-[10px] font-black text-[#EE6055] uppercase tracking-wide block">{isReviewedWriting ? 'Review' : isPracticeWritingOnly ? 'Review' : isWritingOnly ? 'Pending' : 'Incorrect'}</span>
	              <span className="text-xl font-black text-[#05162E] block mt-0.5">{isReviewedWriting ? 'Teacher' : isPracticeWritingOnly ? 'Self' : isWritingOnly ? 'Review' : wrongCount}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Unanswered</span>
              <span className="text-xl font-black text-[#05162E] block mt-0.5">{unansweredCount}</span>
            </div>
          </div>
        </div>
      </div>

      {isPendingTeacherReview && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <ClipboardCheck className="h-12 w-12 text-[#2C4B78] mx-auto mb-4" />
          <h3 className="text-2xl font-black text-[#2d2d2d]" style={{ fontFamily: 'var(--font-league-spartan)' }}>Submitted for teacher review</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl mx-auto font-semibold">
            Your writing answers are saved. Scores and feedback will appear here after the teacher reviews your writing.
          </p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-[#2C4B78] hover:bg-[#1E3A6E] text-white rounded-xl text-sm font-black">
            Back to Dashboard
          </Link>
        </div>
      )}

      {!isPendingTeacherReview && data.feedback && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-black text-[#05162E] uppercase tracking-wider mb-4">Examiner Comments</h3>
          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm">
            <p className="text-[#05162E] leading-relaxed font-semibold">{data.feedback.examiner_comments || 'No overall examiner comments added.'}</p>
          </div>
        </div>
      )}

      {/* Answer Key Review Sheet Container */}
      {!isPendingTeacherReview && <div className="grid md:grid-cols-5 gap-8">
        {/* Left numeric navigation grid */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <h3 className="text-sm font-black text-[#05162E] uppercase tracking-wider">Question Navigator</h3>
          
          <div className="border border-[#294b77]/20 rounded-2xl shadow-sm p-5 flex flex-wrap gap-2.5" style={{ background: 'linear-gradient(to right, #294b77 0%, #294b77 100%)' }}>
            {answers.map((ans, idx) => (
              <button
                key={ans.id}
                onClick={() => setActiveQuestionIndex(idx)}
                className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                  activeQuestionIndex === idx
                    ? 'ring-2 ring-[#EE6055] scale-105 shadow-md shadow-[#EE6055]/20'
                    : ''
                } ${
                  ans.question_type === 'WRITING_TASK'
                    ? 'bg-white border border-[#EE6055]/40 text-[#EE6055] hover:bg-[#EE6055] hover:text-white'
                    : getAnswerScore(ans) > 0
                    ? 'bg-white border border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                    : hasStudentAnswer(ans.student_answer)
                    ? 'bg-white border border-[#EE6055]/40 text-[#EE6055] hover:bg-[#EE6055] hover:text-white'
                    : 'bg-white/10 border border-white/15 text-slate-300 hover:bg-white hover:text-[#294b77]'
                }`}
              >
                {ans.question_number}
              </button>
            ))}
          </div>

          {currentQ?.question_type === 'WRITING_TASK' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-4 px-5 py-4" style={{ background: 'linear-gradient(to right, #294b77 0%, #294b77 100%)' }}>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-100">
                    {currentTaskTitle} Feedback
                  </p>
                  <p className="mt-1 text-[12px] font-bold text-slate-200">
                    {hasTeacherFeedback ? 'Teacher descriptor score and reason.' : 'Teacher review pending.'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-xl px-4 py-2 text-[13px] font-black ${
                  hasTeacherFeedback && data.feedback?.band_score
                    ? 'bg-white text-[#294b77]'
                    : 'bg-[#FFF3F2] text-[#EE6055]'
                }`}>
                  Overall {hasTeacherFeedback && data.feedback?.band_score ? Number(data.feedback.band_score).toFixed(1) : 'Pending'}
                </span>
              </div>

              <div className="grid gap-3 p-5">
                {getWritingDescriptorRows(currentTaskFeedback).map(([label, score, note]) => (
                  <div key={`${currentQ.id}-${label}`} className="grid gap-3 rounded-xl border border-slate-100 bg-[#F8FAFC] p-4 sm:grid-cols-[minmax(0,1fr)_86px]">
                    <div>
                      <p className="text-[13px] font-black text-[#05162E]">{label}</p>
                      <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">
                        {hasTeacherFeedback ? (note || 'No detailed reason added by teacher.') : 'Teacher will add score and detailed reason after checking.'}
                      </p>
                    </div>
                    <div className={`grid h-12 place-items-center rounded-xl border text-[14px] font-black ${
                      hasTeacherFeedback && score !== null && score !== undefined && score !== ''
                        ? 'border-[#294b77]/20 bg-white text-[#294b77]'
                        : 'border-[#EE6055]/20 bg-white text-[#EE6055]'
                    }`}>
                      {hasTeacherFeedback && score !== null && score !== undefined && score !== '' ? Number(score).toFixed(1) : 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Active Question panel */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <h3 className="text-sm font-black text-[#05162E] uppercase tracking-wider">Question Breakdown</h3>

          {currentQ ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6 overflow-hidden">
              <div className="-mx-6 -mt-6 mb-2 flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(to right, #294b77 0%, #294b77 100%)' }}>
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">Review Detail</span>
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#EE6055]">Jawaaf Result</span>
              </div>
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-black block uppercase tracking-wider">Question Number {currentQ.question_number}</span>
                  <span className="px-2 py-0.5 bg-[#EFF4FB] border border-[#2C4B78]/10 text-[#2C4B78] text-[10px] rounded font-black inline-block mt-1.5 uppercase">
                    {currentQ.question_type.replace('_', ' ')}
                  </span>
                </div>

                {currentQ.question_type === 'WRITING_TASK' ? (
                  <span className={`px-2.5 py-1 text-xs font-black rounded-lg flex items-center gap-1.5 shrink-0 ${
                    hasTeacherFeedback
                      ? 'bg-[#EFF4FB] border border-[#294b77]/20 text-[#294b77]'
                      : 'bg-[#FFF3F2] border border-[#EE6055]/30 text-[#EE6055]'
                  }`}>
                    <ClipboardCheck className="h-4 w-4" /> {hasTeacherFeedback ? 'Teacher Reviewed' : 'Teacher Review Pending'}
                  </span>
                ) : currentIsFullyCorrect ? (
                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-black rounded-lg flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="h-4 w-4" /> Correct (+{currentScore})
                  </span>
                ) : currentScore > 0 ? (
                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-black rounded-lg flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="h-4 w-4" /> Partially Correct (+{currentScore})
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-[#FFF3F2] border border-[#EE6055]/30 text-[#EE6055] text-xs font-black rounded-lg flex items-center gap-1.5 shrink-0">
                    <XCircle className="h-4 w-4" /> {currentHasAnswer ? 'Incorrect (+0)' : 'Unanswered (+0)'}
                  </span>
                )}
              </div>

              {/* Sub-instruction */}
              {currentQ.instruction && (
                <p className="text-xs italic text-[#2C4B78] bg-[#EFF4FB] border-l-2 border-[#2C4B78] p-2.5 rounded-r-lg font-semibold">
                  {currentQ.instruction}
                </p>
              )}

              {/* Question Text */}
              <div>
                <p className="text-sm text-[#05162E] font-bold leading-relaxed">{currentQ.question_text}</p>
              </div>

              {/* Options lists if MCQ */}
              {currentQ.options && Array.isArray(currentQ.options) && currentQ.options.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-2">Available Options</span>
                  <div className="grid gap-2">
                    {currentQ.options.map((opt, i) => {
                      const isSelected = isReviewOptionSelected(currentQ, opt, i);
                      const isCorrectOption = isReviewOptionCorrect(currentQ, opt, i);

                      return (
                        <div
                          key={i}
                          className={`p-3 text-xs rounded-xl border ${
                            isSelected && isCorrectOption
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : isSelected
                              ? 'bg-[#FFF3F2] border-[#EE6055]/30 text-[#EE6055]'
                              : isCorrectOption
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Answer block details */}
              <div className={`grid gap-4 border-t border-slate-200 pt-5 text-xs ${currentQ.question_type === 'WRITING_TASK' ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl">
                  <span className="text-slate-500 font-bold block">Your Answer:</span>
                  <span className={`font-bold mt-1 block ${
                    currentScore > 0 ? 'text-emerald-700' : currentHasAnswer ? 'text-[#05162E]' : 'text-slate-500'
                  }`}>
                    {Array.isArray(currentQ.student_answer)
                      ? currentQ.student_answer.join(', ')
                      : currentQ.student_answer
                      ? currentQ.student_answer
                      : 'None (Skipped)'}
                  </span>
                </div>
                {currentQ.question_type !== 'WRITING_TASK' && <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="text-slate-500 font-bold block">Correct Answer Key:</span>
                  <span className="text-emerald-700 font-extrabold mt-1 block">
                    {currentQ.correct_answers.join(' OR ')}
                  </span>
                </div>}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center py-12 text-slate-500 text-xs font-bold">
              Select a question number to review.
            </div>
          )}
        </div>
      </div>}
    </div>
    </div>
  );
}

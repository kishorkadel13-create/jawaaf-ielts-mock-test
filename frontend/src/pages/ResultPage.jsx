import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Award, ShieldCheck, CheckCircle2, XCircle, ArrowLeft, RefreshCw, HelpCircle, Eye, PenLine, ClipboardCheck } from 'lucide-react';
import JawaafLogo from '../components/JawaafLogo';

export default function ResultPage() {
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

  const { attempt, answers } = data;
  const writingAnswers = answers.filter(a => a.question_type === 'WRITING_TASK');
  const objectiveAnswers = answers.filter(a => a.question_type !== 'WRITING_TASK');
  const isWritingOnly = writingAnswers.length > 0 && objectiveAnswers.length === 0;
  const hasWriting = writingAnswers.length > 0;
  const isPracticeAttempt = data.attempt_mode === 'practice';
  const isPracticeWritingOnly = isPracticeAttempt && isWritingOnly;
  const hasTeacherFeedback = Boolean(data.feedback);
  const isPendingTeacherReview = hasWriting && !hasTeacherFeedback && data.can_view_results === false;
  const isReviewedWriting = isWritingOnly && hasTeacherFeedback;
  const correctCount = objectiveAnswers.filter(a => a.is_correct).length;
  const wrongCount = objectiveAnswers.filter(a => a.student_answer && !a.is_correct).length;
  const unansweredCount = answers.filter(a => !a.student_answer).length;
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
  const currentTaskFeedback = currentQ?.question_type === 'WRITING_TASK' ? getTaskFeedback(currentQ) : {};
  const currentTaskTitle = currentQ?.extra_data?.task_type || (currentQ?.question_type === 'WRITING_TASK' ? `Writing Task ${writingAnswers.findIndex(answer => answer.id === currentQ.id) + 1}` : '');

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
                    : ans.is_correct
                    ? 'bg-white border border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                    : ans.student_answer
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
                ) : currentQ.is_correct ? (
                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-black rounded-lg flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="h-4 w-4" /> Correct (+1)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-[#FFF3F2] border border-[#EE6055]/30 text-[#EE6055] text-xs font-black rounded-lg flex items-center gap-1.5 shrink-0">
                    <XCircle className="h-4 w-4" /> {currentQ.student_answer ? 'Incorrect (+0)' : 'Unanswered (+0)'}
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
                    {currentQ.options.map((opt, i) => (
                      <div 
                        key={i} 
                        className={`p-3 text-xs rounded-xl border ${
                          currentQ.student_answer === opt.substring(0, 1) || (Array.isArray(currentQ.student_answer) && currentQ.student_answer.includes(opt.substring(0, 1)))
                            ? currentQ.is_correct
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-[#FFF3F2] border-[#EE6055]/30 text-[#EE6055]'
                            : currentQ.correct_answers.includes(opt.substring(0, 1))
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer block details */}
              <div className={`grid gap-4 border-t border-slate-200 pt-5 text-xs ${currentQ.question_type === 'WRITING_TASK' ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl">
                  <span className="text-slate-500 font-bold block">Your Answer:</span>
                  <span className={`font-bold mt-1 block ${
                    currentQ.is_correct ? 'text-emerald-700' : currentQ.student_answer ? 'text-[#05162E]' : 'text-slate-500'
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

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Award, ShieldCheck, CheckCircle2, XCircle, ArrowLeft, RefreshCw, HelpCircle, Eye } from 'lucide-react';

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
      <div className="min-h-screen bg-academic-gradient flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 text-sm animate-pulse">Calculating scores and grading keys...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-academic-gradient flex flex-col items-center justify-center p-6 text-center">
        <h3 className="text-xl font-bold text-white">Result Not Found</h3>
        <p className="text-slate-400 mt-2 text-sm">The specified exam attempt log does not exist.</p>
        <Link to="/dashboard" className="mt-6 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { attempt, answers } = data;
  const correctCount = answers.filter(a => a.is_correct).length;
  const wrongCount = answers.filter(a => a.student_answer && !a.is_correct).length;
  const unansweredCount = answers.filter(a => !a.student_answer).length;

  const currentQ = answers[activeQuestionIndex];

  return (
    <div className="flex-1 flex flex-col p-6 md:p-10 max-w-6xl mx-auto w-full gap-8 bg-academic-gradient">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Student Portal
        </Link>
        <span className="text-xs text-brand-400 font-bold uppercase tracking-wider">{attempt.mock_tests?.title} Result</span>
      </div>

      {/* Main Score Metrics Card */}
      <div className="glass-card p-6 md:p-8 border-brand-500/10 shadow-brand-500/5 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
        {/* Radial highlight */}
        <div className="absolute top-0 left-0 w-36 h-36 bg-brand-500/5 rounded-full blur-2xl pointer-events-none"></div>

        {/* Big Band Ring */}
        <div className="relative w-36 h-36 shrink-0 flex flex-col items-center justify-center border-4 border-brand-500/30 rounded-full shadow-lg shadow-brand-500/5">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">IELTS Score</span>
          <span className="text-4xl font-extrabold text-brand-400 mt-0.5">Band {parseFloat(attempt.score).toFixed(1)}</span>
          <Award className="absolute -bottom-1 -right-1 h-7 w-7 text-brand-400 bg-slate-950 rounded-full p-1 border border-brand-500/30" />
        </div>

        {/* Detailed Metrics */}
        <div className="flex-1 w-full space-y-4">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white font-serif leading-tight">
              Test Attempt Completed Successfully!
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Your test was auto-graded against official CBT answer sheets on {new Date(attempt.submitted_at).toLocaleString()}.
            </p>
          </div>

          {/* Counts metrics list */}
          <div className="grid grid-cols-3 gap-4 pt-2 text-center">
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide block">Correct</span>
              <span className="text-xl font-bold text-white block mt-0.5">{correctCount}</span>
            </div>
            <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wide block">Incorrect</span>
              <span className="text-xl font-bold text-white block mt-0.5">{wrongCount}</span>
            </div>
            <div className="p-3 bg-slate-500/5 border border-slate-500/15 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Unanswered</span>
              <span className="text-xl font-bold text-white block mt-0.5">{unansweredCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Key Review Sheet Container */}
      <div className="grid md:grid-cols-5 gap-8">
        {/* Left numeric navigation grid */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">Question Navigator</h3>
          
          <div className="glass-card p-5 border-slate-800 flex flex-wrap gap-2.5">
            {answers.map((ans, idx) => (
              <button
                key={ans.id}
                onClick={() => setActiveQuestionIndex(idx)}
                className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                  activeQuestionIndex === idx
                    ? 'ring-2 ring-brand-400 scale-105 shadow-md shadow-brand-500/20'
                    : ''
                } ${
                  ans.is_correct
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : ans.student_answer
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {ans.question_number}
              </button>
            ))}
          </div>
        </div>

        {/* Right Active Question panel */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">Question Breakdown</h3>

          {currentQ ? (
            <div className="glass-card p-6 border-slate-800 space-y-6">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">Question Number {currentQ.question_number}</span>
                  <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded font-semibold inline-block mt-1.5 uppercase">
                    {currentQ.question_type.replace('_', ' ')}
                  </span>
                </div>

                {currentQ.is_correct ? (
                  <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="h-4 w-4" /> Correct (+1)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0">
                    <XCircle className="h-4 w-4" /> {currentQ.student_answer ? 'Incorrect (+0)' : 'Unanswered (+0)'}
                  </span>
                )}
              </div>

              {/* Sub-instruction */}
              {currentQ.instruction && (
                <p className="text-xs italic text-brand-300 bg-brand-500/5 border-l-2 border-brand-500 p-2.5 rounded-r-lg">
                  {currentQ.instruction}
                </p>
              )}

              {/* Question Text */}
              <div>
                <p className="text-sm text-white font-medium leading-relaxed font-sans">{currentQ.question_text}</p>
              </div>

              {/* Options lists if MCQ */}
              {currentQ.options && Array.isArray(currentQ.options) && currentQ.options.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-2">Available Options</span>
                  <div className="grid gap-2">
                    {currentQ.options.map((opt, i) => (
                      <div 
                        key={i} 
                        className={`p-3 text-xs rounded-xl border ${
                          currentQ.student_answer === opt.substring(0, 1) || (Array.isArray(currentQ.student_answer) && currentQ.student_answer.includes(opt.substring(0, 1)))
                            ? currentQ.is_correct
                              ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400'
                              : 'bg-red-500/5 border-red-500/30 text-red-400'
                            : currentQ.correct_answers.includes(opt.substring(0, 1))
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                            : 'bg-slate-900/60 border-white/5 text-slate-400'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer block details */}
              <div className="grid sm:grid-cols-2 gap-4 border-t border-white/5 pt-5 text-xs">
                <div className="p-3 bg-slate-900/60 border border-white/5 rounded-xl">
                  <span className="text-slate-500 font-medium block">Your Answer:</span>
                  <span className={`font-bold mt-1 block ${
                    currentQ.is_correct ? 'text-emerald-400' : currentQ.student_answer ? 'text-red-400' : 'text-slate-500'
                  }`}>
                    {Array.isArray(currentQ.student_answer)
                      ? currentQ.student_answer.join(', ')
                      : currentQ.student_answer
                      ? currentQ.student_answer
                      : 'None (Skipped)'}
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                  <span className="text-slate-400 font-medium block">Correct Answer Key:</span>
                  <span className="text-emerald-300 font-extrabold mt-1 block">
                    {currentQ.correct_answers.join(' OR ')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 border-slate-800 text-center py-12 text-slate-500 text-xs">
              Select a question number to review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

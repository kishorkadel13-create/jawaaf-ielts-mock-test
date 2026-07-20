import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/examStore';
import { api } from '../services/api';
import { QuestionRenderer } from '../components/QuestionRenderer';
import { SummaryCompletionGroup, isSummaryCompletionQuestion } from '../components/SummaryCompletionGroup';
import { normalizePassageHtml } from '../utils/passageHtml';
import { getMatchingHeadingQuestion, getMatchingHeadingQuestions, isMatchingHeadingsQuestion, normalizeMatchingQuestionType, toRoman } from '../utils/matchingHeadings';
import { applyHighlightTarget, getHighlightTarget, type HighlightTarget } from '../utils/textHighlighter';
import { Award, Timer, Flag, Save, CheckCircle2, Play, Headphones, Volume2 } from 'lucide-react';

export default function ExamInterface() {
  const { id } = useParams(); // attempt_id
  const navigate = useNavigate();
  
  const {
    activeTest,
    attemptId,
    answers,
    secondsRemaining,
    isActive,
    activeSectionIndex,
    flaggedQuestions,
    autosaveStatus,
    isFinished,
    isSubmitting,
    startExam,
    setAnswer,
    toggleFlag,
    tick,
    autosave,
    submitExam,
    setActiveSection,
    resetExam
  } = useExamStore();

  const [loading, setLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  
  // Custom Audio parameters
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load attempt and test on mount
  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        setLoading(true);
        // 1. Fetch active attempt
        const { data: attempt } = await api.get(`/attempts/${id}/review`).catch(async () => {
          // If no review exists, it means the attempt is in progress. Fetching current active attempt state.
          const { data: list } = await api.get('/attempts/history');
          const current = list.find((a: any) => a.id === id);
          return { data: { attempt: current } } as any;
        });

        // 2. Fetch full test details
        const { data: test } = await api.get(`/tests/${attempt.attempt.mock_test_id}`);
        
        // Map DB types back to UI 13-types for student view
        if (test.sections) {
          test.sections.forEach((sec: any) => {
            sec.question_groups?.forEach((grp: any) => {
              grp.questions?.forEach((q: any) => {
                if (q.extra_data_json?.original_type) {
                  q.question_type = q.extra_data_json.original_type;
                }
                normalizeMatchingQuestionType(q, grp.instruction || '');
              });
            });
          });
        }

        // 3. Initialize Zustand store
        startExam(test, attempt.attempt);
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize exam interface:', err);
        setLoading(false);
      }
    };
    fetchExamDetails();

    return () => {
      resetExam();
    };
  }, [id, startExam, resetExam]);

  // Unified Countdown timer loop
  useEffect(() => {
    if (!isActive || isFinished) return;
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isFinished, tick]);

  // Unified Autosave loop (every 10 seconds)
  useEffect(() => {
    if (!isActive || isFinished) return;
    const interval = setInterval(() => {
      autosave();
    }, 10000);
    return () => clearInterval(interval);
  }, [isActive, isFinished, autosave]);

  // Floating Highlighter logic for Reading passages
  const passageRef = useRef<HTMLDivElement>(null);
  const highlightTargetRef = useRef<HighlightTarget | null>(null);
  const [highlightCoords, setHighlightCoords] = useState<{top: number, left: number} | null>(null);
  const [highlightedPassageHtml, setHighlightedPassageHtml] = useState<string | null>(null);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const text = selection.toString().trim();
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    if (
      text.length > 0 &&
      anchorNode &&
      focusNode &&
      passageRef.current?.contains(anchorNode) &&
      passageRef.current?.contains(focusNode)
    ) {
      const range = selection.getRangeAt(0);
      const passageEl = range.commonAncestorContainer.parentElement?.closest<HTMLElement>('[data-passage-id]');

      if (!passageEl) {
        highlightTargetRef.current = null;
        setHighlightCoords(null);
        return;
      }

      const target = getHighlightTarget(range, passageEl);

      if (!target) {
        highlightTargetRef.current = null;
        setHighlightCoords(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      highlightTargetRef.current = target;
      
      setHighlightCoords({
        top: Math.max(72, rect.top - 42),
        left: Math.max(16, rect.left + rect.width / 2 - 42),
      });
    } else {
      highlightTargetRef.current = null;
      setHighlightCoords(null);
    }
  };

  const applyHighlight = (event?: React.MouseEvent | React.PointerEvent) => {
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
    } catch (e) {
      console.warn('Text selection highlight could not be applied.', e);
    }
    
    highlightTargetRef.current = null;
    setHighlightCoords(null);
  };

  const blockClipboard = (event: React.ClipboardEvent) => {
    event.preventDefault();
  };

  // Trigger final submission
  const handleSubmit = async () => {
    const confirmSubmit = window.confirm('Are you sure you want to submit your mock test? This action will lock your answers and calculate scores.');
    if (!confirmSubmit) return;

    try {
      await submitExam();
      navigate(`/attempts/${id}/result`);
    } catch (err) {
      alert('Failed to submit exam. Check your connection.');
    }
  };

  const activeSection = activeTest?.sections?.[activeSectionIndex];
  const activeGroups = activeSection?.question_groups || [];
  const listeningAudioUrl = activeSection?.type === 'listening'
    ? activeGroups.find((group: any) => group.audio_url)?.audio_url || ''
    : '';
  const sectionQuestions = activeGroups.flatMap((g: any) => g.questions || []).sort((a: any, b: any) => a.question_number - b.question_number);
  const activePassageHtml = useMemo(
    () => normalizePassageHtml(activeGroups[0]?.passage) || 'No reading passage uploaded.',
    [activeGroups]
  );

  useEffect(() => {
    setHighlightedPassageHtml(null);
  }, [activePassageHtml]);

  useEffect(() => {
    if (activeSection?.type !== 'listening' || !listeningAudioUrl || !audioRef.current || isFinished) return;

    setAudioProgress(0);
    setAudioPlaying(false);
    setAudioAutoplayBlocked(false);
    audioRef.current.currentTime = 0;
    audioRef.current.playbackRate = 1;

    const playPromise = audioRef.current.play();
    if (playPromise) {
      playPromise
        .then(() => {
          setAudioPlaying(true);
          setAudioAutoplayBlocked(false);
        })
        .catch(() => {
          setAudioPlaying(false);
          setAudioAutoplayBlocked(true);
        });
    }
  }, [activeSection?.id, activeSection?.type, listeningAudioUrl, isFinished]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-[#1E3A6E] rounded-full animate-spin"></div>
        <p className="mt-4 text-xs text-slate-400 font-medium">Loading IELTS Mock Exam Environment...</p>
      </div>
    );
  }
  
  // Audio playback is intentionally locked for IELTS-style listening.
  const startLockedAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.play()
      .then(() => {
        setAudioPlaying(true);
        setAudioAutoplayBlocked(false);
      })
      .catch(() => setAudioAutoplayBlocked(true));
  };

  const updateAudioProgress = () => {
    if (!audioRef.current || !audioRef.current.duration) return;
    setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="flex-1 flex flex-col h-screen bg-[#F8FAFC] select-none"
      onCopy={blockClipboard}
      onCut={blockClipboard}
      onPaste={blockClipboard}
    >
      
      {/* 1. Header Toolbar */}
      <header className="bg-slate-900 border-b border-white/5 px-6 py-3.5 flex items-center justify-between text-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <Award className="h-5 w-5 text-[#1E3A6E] shrink-0" />
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-wide">{activeTest.title}</h1>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{activeSection?.type} Section</span>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="hidden sm:flex bg-slate-950 p-1 rounded-xl border border-white/5">
          {activeTest.sections.map((sec: any, idx: number) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(idx)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeSectionIndex === idx
                  ? 'bg-[#1E3A6E] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sec.title}
            </button>
          ))}
        </div>

        {/* Timer & Submit controls */}
        <div className="flex items-center gap-6">
          {/* Autosave status indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-500">
            <Save className={`h-3.5 w-3.5 ${autosaveStatus === 'saving' ? 'animate-spin text-[#1E3A6E]' : ''}`} />
            <span>
              {autosaveStatus === 'saving' ? 'Saving progress...' :
               autosaveStatus === 'saved' ? 'Progress autosaved' :
               autosaveStatus === 'error' ? 'Connection dropped!' : 'Exam Active'}
            </span>
          </div>

          {/* Countdown Clock */}
          <div className={`px-4 py-1.5 bg-slate-950 border rounded-xl flex items-center gap-2 font-mono text-sm font-bold ${
            secondsRemaining < 300 ? 'text-[#EE6055] border-[#EE6055]/30 bg-[#EE6055]/5' : 'text-emerald-400 border-emerald-500/30'
          }`}>
            <Timer className="h-4 w-4 animate-pulse" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" /> Submit Test
          </button>
        </div>
      </header>

      {/* 2. Main CBT Split Screen Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Highlighter Tooltip overlay */}
        {highlightCoords && (
          <button
            type="button"
            onPointerDown={applyHighlight}
            onMouseDown={applyHighlight}
            style={{ top: highlightCoords.top, left: highlightCoords.left }}
            className="fixed z-50 px-3 py-1.5 bg-yellow-300 text-slate-950 text-xs font-bold rounded-lg shadow-lg border border-yellow-400 transition-transform active:scale-95 cursor-pointer"
          >
            Highlight
          </button>
        )}

        {/* LEFT COLUMN: Passage (Reading) or Audio Deck (Listening) */}
        <div 
          className="flex-1 w-full md:w-1/2 border-r border-slate-200 bg-[#fbfbfa] overflow-y-auto px-8 py-7 relative"
          onMouseUp={handleSelection}
          onKeyUp={handleSelection}
        >
          {activeSection?.type === 'listening' ? (
            /* Premium Listening Audio Interface */
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center gap-8 py-12">
              <div className="w-24 h-24 rounded-full bg-[#1E3A6E]/10 border border-[#1E3A6E]/20 text-[#1E3A6E] flex items-center justify-center animate-pulse">
                <Headphones className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-[#05162E] font-serif">Simulated Listening Session</h2>
                <p className="text-sm text-slate-500 leading-relaxed mt-2">
                  The full listening audio plays as one locked track. Continue answering the questions on the right as the recording progresses.
                </p>
              </div>

              {/* Listening Audio Track Element */}
              {listeningAudioUrl ? (
                <div className="w-full bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-[#1E3A6E] text-white flex items-center justify-center shrink-0 shadow-md">
                    {audioPlaying ? <Volume2 className="h-5 w-5" /> : <Play className="h-5 w-5 ml-1 fill-current" />}
                  </div>
                  <div className="flex-1 text-left space-y-2">
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest block">
                      {audioAutoplayBlocked ? 'Browser blocked autoplay' : 'Audio playing automatically'}
                    </span>
                    <audio 
                      ref={audioRef}
                      src={listeningAudioUrl}
                      autoPlay
                      controls={false}
                      controlsList="nodownload noplaybackrate noremoteplayback"
                      disableRemotePlayback
                      onTimeUpdate={updateAudioProgress}
                      onEnded={() => setAudioPlaying(false)}
                      onRateChange={() => {
                        if (audioRef.current && audioRef.current.playbackRate !== 1) {
                          audioRef.current.playbackRate = 1;
                        }
                      }}
                      onPause={() => {
                        if (!audioRef.current?.ended && !isFinished) {
                          audioRef.current?.play().catch(() => setAudioAutoplayBlocked(true));
                        }
                      }}
                      className="hidden"
                    />
                    <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${audioProgress}%` }}
                        className="absolute h-full bg-[#1E3A6E] rounded-full transition-all duration-300"
                      ></div>
                    </div>
                  </div>
                  {audioAutoplayBlocked && (
                    <button
                      type="button"
                      onClick={startLockedAudio}
                      className="px-3 py-2 bg-[#1E3A6E] hover:bg-[#162d57] text-white rounded-xl text-[11px] font-black flex items-center gap-2 shrink-0"
                    >
                      <Volume2 className="h-4 w-4" /> Start
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full bg-amber-50 border border-amber-100 p-5 rounded-2xl text-[13px] font-bold text-amber-800">
                  Listening audio has not been uploaded for this section yet.
                </div>
              )}
            </div>
          ) : (
            /* Reading Passage HTML Render */
            <div ref={passageRef} className="ielts-passage-shell mb-12">
              <h2 className="ielts-passage-title text-[#05162E] border-b border-slate-200 pb-4">{activeSection?.title || 'Reading Passage'}</h2>
              <div 
                data-passage-id={activeGroups[0]?.id || 'active-passage'}
                className="ielts-passage focus:outline-none select-text"
                dangerouslySetInnerHTML={{ __html: highlightedPassageHtml ?? activePassageHtml }}
              ></div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Questions column */}
        <div className="flex-1 w-full md:w-1/2 bg-[#F8FAFC] overflow-y-auto p-8">
          <div className="space-y-10">
            {activeGroups.map((group: any) => (
              <div key={group.id} className="space-y-6 mb-10">
                {/* Group instruction banner */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-extrabold text-[16px] text-[#05162E]">{group.title}</h3>
                  {group.instruction && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-[13px] font-medium">
                      <p>{group.instruction}</p>
                    </div>
                  )}
                </div>

                {/* Render questions inside group */}
                <div className="space-y-6">
                  <MatchingHeadingsGroup
                    questions={group.questions || []}
                    instruction={group.instruction || ''}
                    answers={answers}
                    onAnswer={setAnswer}
                    onActivateQuestion={setActiveQuestionId}
                  />

                  {group.questions?.some(isSummaryCompletionQuestion) && (
                    <SummaryCompletionGroup
                      questions={group.questions.filter(isSummaryCompletionQuestion)}
                      values={answers}
                      onChange={setAnswer}
                      mode="light"
                      onActivateQuestion={setActiveQuestionId}
                      groupInstruction={group.instruction || ''}
                    />
                  )}

                  {group.questions?.filter((question: any) => (
                    !isSummaryCompletionQuestion(question) && !isMatchingHeadingsQuestion(question, group.instruction || '')
                  )).map((question: any) => (
                    <div 
                      key={question.id} 
                      className={`bg-white rounded-2xl p-6 shadow-sm flex items-start gap-4 border transition-all ${
                        activeQuestionId === question.id 
                          ? 'border-[#1E3A6E]/50' 
                          : 'border-slate-200'
                      }`}
                      onClick={() => setActiveQuestionId(question.id)}
                    >
                      <div className="h-8 w-8 bg-[#1E3A6E] text-white rounded-full flex items-center justify-center font-black text-[13px] shrink-0 shadow-md">
                        {question.question_number}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFlag(question.id);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              flaggedQuestions.includes(question.id)
                                ? 'text-amber-500 bg-amber-500/10'
                                : 'text-slate-400 hover:text-[#1E3A6E] hover:bg-[#EFF4FB]'
                            }`}
                            title="Flag for review"
                          >
                            <Flag className="h-4 w-4 fill-current" />
                          </button>
                        </div>

                        {/* Unified Question Renderer component */}
                        <QuestionRenderer 
                          question={question} 
                          value={answers[question.id]} 
                          onChange={(val) => setAnswer(question.id, val)}
                          mode="light"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Bottom Palette Navigation Dock */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-500 select-none shrink-0 shadow-[0_-4px_20px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto py-1">
          {sectionQuestions.map((q: any) => {
            const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
            const isFlagged = flaggedQuestions.includes(q.id);
            const isActiveQ = activeQuestionId === q.id;

            return (
              <button
                key={q.id}
                onClick={() => setActiveQuestionId(q.id)}
                className={`w-9 h-9 rounded-xl font-bold text-[13px] flex items-center justify-center transition-all ${
                  isActiveQ ? 'ring-2 ring-[#1E3A6E]/30 scale-110 z-10 shadow-lg' : ''
                } ${
                  isFlagged 
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' 
                    : isAnswered 
                    ? 'bg-[#1E3A6E] text-white hover:bg-[#162d57]' 
                    : 'bg-white border border-slate-300 text-slate-500 hover:bg-[#F8FAFC]'
                }`}
              >
                {q.question_number}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-5 text-[10px] font-black uppercase tracking-widest shrink-0 text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-[#1E3A6E]"></div>
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-amber-500"></div>
            <span>Flagged</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-white border border-slate-300"></div>
            <span>Unanswered</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

const MatchingHeadingsList = ({ questions, instruction }: { questions: any[]; instruction: string }) => {
  const headingQuestion = getMatchingHeadingQuestion(questions, instruction);

  if (!headingQuestion) return null;

  return (
    <div className="bg-[#EFF4FB] border border-[#1E3A6E]/20 rounded-2xl p-5 shadow-sm">
      <h3 className="text-center font-black text-[#1E3A6E] text-[15px] mb-4">List of Headings</h3>
      <div className="grid gap-2 text-[14px] text-[#05162E]">
        {headingQuestion.options_json.map((option: string, index: number) => (
          <div key={index} className="grid grid-cols-[42px_1fr] gap-3 leading-snug">
            <span className="font-black">{toRoman(index + 1)}</span>
            <span>{option}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MatchingHeadingsGroup = ({
  questions,
  instruction,
  answers,
  onAnswer,
  onActivateQuestion,
}: {
  questions: any[];
  instruction: string;
  answers: Record<string, any>;
  onAnswer: (questionId: string, value: any) => void;
  onActivateQuestion: (questionId: string) => void;
}) => {
  const headingQuestion = getMatchingHeadingQuestion(questions, instruction);
  const headingQuestions = getMatchingHeadingQuestions(questions, instruction);

  if (!headingQuestion || headingQuestions.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <MatchingHeadingsList questions={questions} instruction={instruction} />

      <div className="mt-5 grid gap-2">
        {headingQuestions.map((question) => (
          <div
            key={question.id}
            className="grid grid-cols-[44px_minmax(120px,1fr)_104px] sm:grid-cols-[48px_minmax(150px,1fr)_120px] items-center gap-3 py-1.5"
            onClick={() => onActivateQuestion(question.id)}
          >
            <span className="text-[14px] font-bold text-[#05162E]">{question.question_number}</span>
            <span className="text-[14px] font-medium text-[#05162E] leading-snug">{question.question_text}</span>
            <select
              value={answers[question.id] || ''}
              onChange={(event) => onAnswer(question.id, event.target.value)}
              className="w-full border border-slate-300 bg-white px-2 py-1.5 text-[13px] font-semibold text-[#05162E] outline-none focus:border-[#1E3A6E]"
            >
              <option value="">Select</option>
              {headingQuestion.options_json.map((_: string, index: number) => {
                const roman = toRoman(index + 1);
                return <option key={roman} value={roman}>{roman}</option>;
              })}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

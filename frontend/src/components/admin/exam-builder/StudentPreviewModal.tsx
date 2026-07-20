import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Clock, HelpCircle, CheckCircle2, XCircle, RotateCcw, ClipboardCheck, Headphones, Volume2 } from 'lucide-react';
import { normalizePassageHtml } from '../../../utils/passageHtml';
import { applyHighlightTarget, getHighlightTarget, type HighlightTarget } from '../../../utils/textHighlighter';
import { SummaryCompletionGroup, isSummaryCompletionQuestion } from '../../SummaryCompletionGroup';
import { getMatchingHeadingQuestion, getMatchingHeadingQuestions, isMatchingHeadingsQuestion, toRoman } from '../../../utils/matchingHeadings';

interface StudentPreviewModalProps {
  test: any;
  onClose: () => void;
}

const cleanAnswer = (value: any) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const hasPreviewAnswer = (value: any) => (
  Array.isArray(value)
    ? value.some((item) => cleanAnswer(item))
    : Boolean(cleanAnswer(value))
);

const formatPreviewAnswer = (value: any) => {
  if (!hasPreviewAnswer(value)) return 'Not answered';
  return Array.isArray(value) ? value.filter((item) => cleanAnswer(item)).join(', ') : String(value);
};

const evaluatePreviewAnswer = (submittedAnswer: any, correctAnswers: any[] = [], questionType = '') => {
  const validCorrectAnswers = correctAnswers.filter((answer) => answer !== '[NO ANSWER DETECTED]');

  if (!hasPreviewAnswer(submittedAnswer) || validCorrectAnswers.length === 0) return false;

  const cleanedCorrect = validCorrectAnswers.map(cleanAnswer);

  if (Array.isArray(submittedAnswer)) {
    const cleanedSubmitted = submittedAnswer.map(cleanAnswer).filter(Boolean);

    if (questionType === 'MULTI_SELECT') {
      if (cleanedSubmitted.length !== cleanedCorrect.length) return false;
      return cleanedSubmitted.every((answer) => cleanedCorrect.includes(answer));
    }

    return cleanedSubmitted.length === cleanedCorrect.length &&
      cleanedSubmitted.every((answer, index) => answer === cleanedCorrect[index]);
  }

  return cleanedCorrect.includes(cleanAnswer(submittedAnswer));
};

export default function StudentPreviewModal({ test, onClose }: StudentPreviewModalProps) {
  const passagePaneRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const highlightTargetRef = useRef<HighlightTarget | null>(null);
  const [highlightCoords, setHighlightCoords] = useState<{ top: number; left: number } | null>(null);
  const [highlightedPassages, setHighlightedPassages] = useState<Record<string, string>>({});
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState(false);
  const previewAudioUrl = useMemo(() => (
    test?.sections
      ?.filter((sec: any) => sec.type === 'listening')
      ?.flatMap((sec: any) => sec.question_groups || [])
      ?.find((grp: any) => grp.audio_url)
      ?.audio_url || ''
  ), [test]);
  const normalizedPassages = useMemo(() => {
    const passages: Record<string, string> = {};

    test?.sections?.forEach((sec: any) => {
      sec.question_groups?.forEach((grp: any) => {
        if (grp.passage) {
          passages[grp.id] = normalizePassageHtml(grp.passage);
        }
      });
    });

    return passages;
  }, [test]);
  const allQuestions = useMemo(() => (
    test?.sections?.flatMap((sec: any) => (
      sec.question_groups?.flatMap((grp: any) => grp.questions || []) || []
    )) || []
  ).sort((a: any, b: any) => Number(a.question_number) - Number(b.question_number)), [test]);
  const reviewRows = useMemo(() => allQuestions.map((question: any) => {
    const studentAnswer = previewAnswers[question.id];
    const isCorrect = evaluatePreviewAnswer(studentAnswer, question.correct_answers_json, question.question_type);

    return {
      question,
      studentAnswer,
      isCorrect,
      isAnswered: hasPreviewAnswer(studentAnswer),
    };
  }), [allQuestions, previewAnswers]);
  const answeredCount = reviewRows.filter((row) => row.isAnswered).length;
  const correctCount = reviewRows.filter((row) => row.isCorrect).length;

  useEffect(() => {
    if (!previewAudioUrl || !audioRef.current) return;

    const playPromise = audioRef.current.play();
    if (playPromise) {
      playPromise
        .then(() => setAudioAutoplayBlocked(false))
        .catch(() => setAudioAutoplayBlocked(true));
    }
  }, [previewAudioUrl]);

  if (!test) return null;

  const blockClipboard = (event: React.ClipboardEvent) => {
    event.preventDefault();
  };

  const setPreviewAnswer = (questionId: string, value: any) => {
    if (isSubmitted) return;
    setPreviewAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const togglePreviewMultiAnswer = (questionId: string, option: string) => {
    if (isSubmitted) return;
    setPreviewAnswers((current) => {
      const selected = Array.isArray(current[questionId]) ? current[questionId] : [];
      return {
        ...current,
        [questionId]: selected.includes(option)
          ? selected.filter((item: string) => item !== option)
          : [...selected, option],
      };
    });
  };

  const handleSubmitPreview = () => {
    setIsSubmitted(true);
  };

  const handleEditPreview = () => {
    setIsSubmitted(false);
  };

  const startPreviewAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.play()
      .then(() => setAudioAutoplayBlocked(false))
      .catch(() => setAudioAutoplayBlocked(true));
  };

  const updateAudioProgress = () => {
    if (!audioRef.current || !audioRef.current.duration) return;
    setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
  };

  const handleSelection = () => {
    const selection = window.getSelection();

    if (!selection || !selection.rangeCount) {
      return;
    }

    const selectedText = selection.toString().trim();
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    if (
      selectedText &&
      anchorNode &&
      focusNode &&
      passagePaneRef.current?.contains(anchorNode) &&
      passagePaneRef.current?.contains(focusNode)
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
        left: Math.max(16, rect.left + rect.width / 2 - 44),
      });
      return;
    }

    highlightTargetRef.current = null;
    setHighlightCoords(null);
  };

  const applyHighlight = (event?: React.MouseEvent | React.PointerEvent) => {
    event?.preventDefault();
    event?.stopPropagation();

    const target = highlightTargetRef.current;

    if (!target) {
      return;
    }

    const passageEl = passagePaneRef.current?.querySelector<HTMLElement>(`[data-passage-id="${target.passageId}"]`);

    try {
      if (passageEl && applyHighlightTarget(target, passageEl)) {
        setHighlightedPassages((current) => ({
          ...current,
          [target.passageId]: passageEl.innerHTML,
        }));
      }

      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.warn('Preview text selection highlight could not be applied.', error);
    }

    highlightTargetRef.current = null;
    setHighlightCoords(null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-white flex flex-col font-sans select-none"
      style={{ fontFamily: "'Inter', sans-serif" }}
      onCopy={blockClipboard}
      onCut={blockClipboard}
      onPaste={blockClipboard}
    >
      {/* Header */}
      <div className="h-16 bg-[#05162E] text-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-500/30 tracking-widest uppercase">
            Preview Mode
          </span>
          <h2 className="font-bold text-[15px]">{test.title}</h2>
        </div>
        
        <div className="flex items-center gap-6">
          {isSubmitted && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/10 rounded-xl text-[12px] font-bold">
              <ClipboardCheck className="h-4 w-4 text-emerald-400" />
              <span>{correctCount}/{allQuestions.length} correct</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-amber-400 font-mono text-[16px] font-bold">
            <Clock className="h-5 w-5" />
            00:{test.duration || 60}:00
          </div>
          {isSubmitted ? (
            <button
              onClick={handleEditPreview}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-[12px] font-black rounded-xl border border-white/10 flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Edit Answers
            </button>
          ) : (
            <button
              onClick={handleSubmitPreview}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-[#05162E] text-[12px] font-black rounded-xl flex items-center gap-2 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" /> Submit Preview
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Exit Preview"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
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
        
        {/* Left Pane - Passage / Media */}
        <div
          ref={passagePaneRef}
          className="flex-1 w-1/2 border-r border-slate-200 bg-[#fbfbfa] overflow-y-auto px-8 py-7 relative"
          onMouseUp={handleSelection}
          onKeyUp={handleSelection}
        >
          {test.sections?.map((sec: any) => (
            <div key={sec.id} className="ielts-passage-shell mb-12">
              <h1 className="ielts-passage-title text-[#05162E] border-b border-slate-200 pb-4">{sec.title}</h1>

              {sec.type === 'listening' && previewAudioUrl && (
                <div className="my-8 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <audio
                    ref={audioRef}
                    src={previewAudioUrl}
                    autoPlay
                    controls={false}
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    disableRemotePlayback
                    onTimeUpdate={updateAudioProgress}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-[#1E3A6E] rounded-full flex items-center justify-center text-white shrink-0 shadow-md">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Listening audio playing automatically</p>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1E3A6E]" style={{ width: `${audioProgress}%` }}></div>
                      </div>
                    </div>
                    {audioAutoplayBlocked && (
                      <button
                        type="button"
                        onClick={startPreviewAudio}
                        className="px-3 py-2 bg-[#1E3A6E] hover:bg-[#162d57] text-white rounded-xl text-[11px] font-black flex items-center gap-2"
                      >
                        <Volume2 className="h-4 w-4" /> Start Audio
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {sec.question_groups?.map((grp: any) => (
                <div key={grp.id} className="mb-10">
                  {grp.image_url && (
                    <img src={grp.image_url} alt="Reference" className="w-full max-w-2xl mx-auto rounded-xl border border-slate-200 shadow-sm mb-6" />
                  )}

                  {grp.passage && (
                    <div 
                      data-passage-id={grp.id}
                      className="ielts-passage select-text"
                      dangerouslySetInnerHTML={{ __html: highlightedPassages[grp.id] ?? normalizedPassages[grp.id] }}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          {(!test.sections || test.sections.length === 0) && (
            <p className="text-slate-400 italic text-center mt-20">No sections added to this test yet.</p>
          )}
        </div>

        {/* Right Pane - Questions */}
        <div className="flex-1 w-1/2 bg-[#F8FAFC] overflow-y-auto p-8">
          {isSubmitted && (
            <div className="mb-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-[16px] text-[#05162E]">Preview Result</h3>
                  <p className="text-[12px] text-slate-500 font-semibold mt-1">
                    {answeredCount}/{allQuestions.length} answered, {correctCount}/{allQuestions.length} correct.
                  </p>
                </div>
                <div className="h-16 w-16 rounded-full bg-[#EFF4FB] border border-[#1E3A6E]/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] text-slate-500 font-black uppercase">Score</span>
                  <span className="text-[18px] text-[#1E3A6E] font-black">{correctCount}/{allQuestions.length}</span>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {reviewRows.map(({ question, studentAnswer, isCorrect, isAnswered }) => (
                  <div key={question.id} className="p-4 flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${
                      isCorrect ? 'bg-emerald-50 text-emerald-700' : isAnswered ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {question.question_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span className={`text-[12px] font-black uppercase ${isCorrect ? 'text-emerald-600' : isAnswered ? 'text-red-600' : 'text-slate-500'}`}>
                          {isCorrect ? 'Correct' : isAnswered ? 'Incorrect' : 'Unanswered'}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#05162E] font-semibold mt-1 line-clamp-2">{question.question_text}</p>
                      <div className="grid sm:grid-cols-2 gap-2 mt-3">
                        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="block text-[10px] font-black uppercase text-slate-400">Your answer</span>
                          <span className="block text-[12px] font-bold text-slate-700 mt-0.5">{formatPreviewAnswer(studentAnswer)}</span>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                          <span className="block text-[10px] font-black uppercase text-emerald-600">Correct answer</span>
                          <span className="block text-[12px] font-bold text-emerald-700 mt-0.5">
                            {(question.correct_answers_json || []).join(' OR ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {test.sections?.map((sec: any) => (
            <div key={sec.id} className="mb-12">
              {sec.question_groups?.map((grp: any) => (
                <div key={grp.id} className="mb-10">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                    <h3 className="font-extrabold text-[16px] text-[#05162E]">{grp.title}</h3>
                    {grp.instruction && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2 text-blue-800 text-[13px] font-medium">
                        <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
                        <p>{grp.instruction}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <MatchingHeadingsGroup
                      questions={grp.questions || []}
                      instruction={grp.instruction || ''}
                      answers={previewAnswers}
                      onAnswer={setPreviewAnswer}
                      disabled={isSubmitted}
                    />

                    {grp.questions?.some(isSummaryCompletionQuestion) && (
                      <SummaryCompletionGroup
                        questions={grp.questions.filter(isSummaryCompletionQuestion)}
                        values={previewAnswers}
                        onChange={setPreviewAnswer}
                        mode="light"
                        groupInstruction={grp.instruction || ''}
                      />
                    )}

                    {grp.questions?.filter((q: any) => (
                      !isSummaryCompletionQuestion(q) && !isMatchingHeadingsQuestion(q, grp.instruction || '')
                    )).map((q: any) => (
                      <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-4">
                        <div className="h-8 w-8 bg-[#1E3A6E] text-white rounded-full flex items-center justify-center font-black text-[13px] shrink-0 shadow-md">
                          {q.question_number}
                        </div>
                        
                        <div className="flex-1">
                          <p className="font-medium text-[15px] text-[#05162E] leading-relaxed mb-4">
                            {q.question_type === 'SHORT_ANSWER' ? (
                              <>
                                {q.question_text}
                                <input
                                  type="text"
                                  disabled={isSubmitted}
                                  value={previewAnswers[q.id] || ''}
                                  onChange={(event) => setPreviewAnswer(q.id, event.target.value)}
                                  className="inline-block w-48 max-w-full ml-3 border-0 border-b-2 border-slate-300 focus:border-[#1E3A6E] px-2 py-1 text-center bg-[#F8FAFC] rounded-none outline-none transition-colors"
                                />
                              </>
                            ) : q.question_text.includes('[blank]') ? (
                              q.question_text.split('[blank]').map((part: string, i: number, arr: any[]) => (
                                <React.Fragment key={i}>
                                  {part}
                                  {i !== arr.length - 1 && q.question_type === 'SUMMARY_COMPLETION_OPTIONS' ? (
                                    <select
                                      disabled={isSubmitted}
                                      value={Array.isArray(previewAnswers[q.id]) ? (previewAnswers[q.id][i] || '') : (previewAnswers[q.id] || '')}
                                      onChange={(event) => {
                                        if (arr.length > 2) {
                                          const values = Array.isArray(previewAnswers[q.id]) ? [...previewAnswers[q.id]] : [];
                                          values[i] = event.target.value;
                                          setPreviewAnswer(q.id, values);
                                        } else {
                                          setPreviewAnswer(q.id, event.target.value);
                                        }
                                      }}
                                      className="inline-block min-w-36 border-2 border-slate-200 focus:border-[#1E3A6E] mx-2 px-2 py-1 text-center bg-[#F8FAFC] rounded-lg outline-none transition-colors"
                                    >
                                      <option value="">Select</option>
                                      {q.options_json?.map((opt: string, optionIdx: number) => (
                                        <option key={optionIdx} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : i !== arr.length - 1 && (
                                    <input 
                                      type="text" 
                                      disabled={isSubmitted}
                                      value={Array.isArray(previewAnswers[q.id]) ? (previewAnswers[q.id][i] || '') : (previewAnswers[q.id] || '')}
                                      onChange={(event) => {
                                        if (arr.length > 2) {
                                          const values = Array.isArray(previewAnswers[q.id]) ? [...previewAnswers[q.id]] : [];
                                          values[i] = event.target.value;
                                          setPreviewAnswer(q.id, values);
                                        } else {
                                          setPreviewAnswer(q.id, event.target.value);
                                        }
                                      }}
                                      className="inline-block w-36 border-b-2 border-slate-300 focus:border-[#1E3A6E] mx-2 px-2 py-1 text-center bg-[#F8FAFC] rounded outline-none transition-colors"
                                    />
                                  )}
                                </React.Fragment>
                              ))
                            ) : (
                              q.question_text
                            )}
                          </p>

                          {['MATCHING', 'MATCHING_INFORMATION', 'MATCHING_HEADINGS', 'SENTENCE_COMPLETION'].includes(q.question_type) && q.options_json && (
                            <select
                              disabled={isSubmitted}
                              value={previewAnswers[q.id] || ''}
                              onChange={(event) => setPreviewAnswer(q.id, event.target.value)}
                              className="mt-2 w-full border-2 border-slate-200 focus:border-[#1E3A6E] px-4 py-3 bg-white rounded-xl text-[14px] font-bold text-[#05162E] outline-none"
                            >
                              <option value="">Select answer</option>
                              {q.options_json.map((opt: string, idx: number) => (
                                <option key={idx} value={isMatchingHeadingsQuestion(q, grp.instruction || '') ? toRoman(idx + 1) : opt}>
                                  {isMatchingHeadingsQuestion(q, grp.instruction || '') ? toRoman(idx + 1) : opt}
                                </option>
                              ))}
                            </select>
                          )}

                          {['SINGLE_MCQ', 'MULTI_SELECT'].includes(q.question_type) && q.options_json && (
                            <div className="flex flex-col gap-2 mt-4">
                              {q.options_json.map((opt: string, idx: number) => (
                                <label
                                  key={idx}
                                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                    q.question_type === 'MULTI_SELECT'
                                      ? Array.isArray(previewAnswers[q.id]) && previewAnswers[q.id].includes(opt)
                                        ? 'border-[#1E3A6E] bg-[#EFF4FB]'
                                        : 'border-slate-200 hover:bg-[#F8FAFC]'
                                      : previewAnswers[q.id] === opt
                                      ? 'border-[#1E3A6E] bg-[#EFF4FB]'
                                      : 'border-slate-200 hover:bg-[#F8FAFC]'
                                  }`}
                                >
                                  <input 
                                    type={q.question_type === 'SINGLE_MCQ' ? 'radio' : 'checkbox'} 
                                    disabled={isSubmitted}
                                    checked={
                                      q.question_type === 'MULTI_SELECT'
                                        ? Array.isArray(previewAnswers[q.id]) && previewAnswers[q.id].includes(opt)
                                        : previewAnswers[q.id] === opt
                                    }
                                    onChange={() => {
                                      if (q.question_type === 'MULTI_SELECT') {
                                        togglePreviewMultiAnswer(q.id, opt);
                                      } else {
                                        setPreviewAnswer(q.id, opt);
                                      }
                                    }}
                                    className="h-4 w-4 text-[#1E3A6E]"
                                  />
                                  <span className="text-[14px] text-slate-700">{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN'].includes(q.question_type) && (
                            <div className="flex gap-2 mt-4">
                              {(q.question_type === 'TRUE_FALSE_NOT_GIVEN' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']).map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setPreviewAnswer(q.id, opt)}
                                  disabled={isSubmitted}
                                  className={`flex-1 py-2.5 px-2 border rounded-xl text-[12px] font-bold transition-colors ${
                                    previewAnswers[q.id] === opt
                                      ? 'bg-[#1E3A6E] border-[#1E3A6E] text-white'
                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-[#F8FAFC]'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

      </div>
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
  disabled,
}: {
  questions: any[];
  instruction: string;
  answers: Record<string, any>;
  onAnswer: (questionId: string, value: any) => void;
  disabled: boolean;
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
          >
            <span className="text-[14px] font-bold text-[#05162E]">{question.question_number}</span>
            <span className="text-[14px] font-medium text-[#05162E] leading-snug">{question.question_text}</span>
            <select
              disabled={disabled}
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

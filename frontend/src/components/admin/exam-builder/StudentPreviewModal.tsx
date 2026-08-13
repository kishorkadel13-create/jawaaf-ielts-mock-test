import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Clock, HelpCircle, CheckCircle2, XCircle, RotateCcw, ClipboardCheck, Headphones, Volume2, PenLine } from 'lucide-react';
import { normalizePassageHtml } from '../../../utils/passageHtml';
import { applyHighlightTarget, getHighlightTarget, type HighlightTarget } from '../../../utils/textHighlighter';
import { SummaryCompletionGroup, isSummaryCompletionQuestion } from '../../SummaryCompletionGroup';
import { ListeningMatchingTextGroup, isListeningMatchingTextBlock } from '../../ListeningMatchingTextGroup';
import { MultiSelectAnswerGroup, isMultiSelectAnswerGroup } from '../../MultiSelectAnswerGroup';
import { renderFormattedBlockText, renderFormattedText, splitQuestionInstruction } from '../../../utils/renderFormattedText';
import { getMatchingHeadingQuestion, getMatchingHeadingQuestions, isMatchingHeadingsQuestion, toRoman } from '../../../utils/matchingHeadings';
import { resolveListeningAudioUrl } from '../../../utils/audioUrl';

interface StudentPreviewModalProps {
  test: any;
  onClose: () => void;
}

type OrderedQuestionBlock = {
  id: string;
  kind: 'matching' | 'summary' | 'standard';
  instruction: string;
  questions: any[];
};

const sortQuestionsByNumber = (questions: any[] = []) => (
  [...questions].sort((a, b) => Number(a.question_number || 0) - Number(b.question_number || 0))
);

const getQuestionInstruction = (question: any) => (
  question?.extra_data_json?.bulk_instruction || question?.instruction || ''
);

const getQuestionBlockKey = (question: any, kind: OrderedQuestionBlock['kind']) => (
  [
    kind,
    question?.extra_data_json?.bulk_source,
    getQuestionInstruction(question),
    question?.extra_data_json?.bulk_id,
  ].filter(Boolean).join('|') || `${kind}-${question?.id}`
);

const getQuestionKind = (question: any, groupInstruction = ''): OrderedQuestionBlock['kind'] => {
  if (isMatchingHeadingsQuestion(question, groupInstruction)) return 'matching';
  if (isSummaryCompletionQuestion(question)) return 'summary';
  return 'standard';
};

const buildOrderedQuestionBlocks = (questions: any[] = [], groupInstruction = ''): OrderedQuestionBlock[] => {
  const sorted = sortQuestionsByNumber(questions);
  const blocks: OrderedQuestionBlock[] = [];
  const used = new Set<string>();

  sorted.forEach((question) => {
    if (used.has(question.id)) return;

    const kind = getQuestionKind(question, groupInstruction);
    const blockKey = getQuestionBlockKey(question, kind);
    const blockQuestions = sorted.filter((candidate) => (
      !used.has(candidate.id) &&
      getQuestionKind(candidate, groupInstruction) === kind &&
      getQuestionBlockKey(candidate, kind) === blockKey
    ));

    blockQuestions.forEach((candidate) => used.add(candidate.id));

    blocks.push({
      id: blockKey,
      kind,
      instruction: getQuestionInstruction(question),
      questions: blockQuestions,
    });
  });

  return blocks;
};

const QuestionInstructionCard = ({ instruction }: { instruction: string }) => {
  if (!instruction) return null;

  const { heading, body } = splitQuestionInstruction(instruction);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {heading && (
        <h3 className="text-[22px] font-black mb-4 text-[#05162E]">
          {renderFormattedText(heading, 'preview-question-instruction-heading')}
        </h3>
      )}
      <div className="text-[16px] leading-8 text-[#05162E] whitespace-pre-wrap">
        {renderFormattedText(body || instruction, 'preview-question-instruction-body')}
      </div>
    </div>
  );
};

const PassageIntroCard = ({ title, instruction }: { title: string; instruction?: string }) => (
  <div className="mb-6 rounded-2xl border border-[#cfe0f7] bg-[#EFF4FB] p-5 font-sans shadow-sm">
    <h3 className="text-[18px] font-black uppercase tracking-wide text-[#05162E]">
      {title}
    </h3>
    {instruction && (
      <div className="mt-3 border-t border-[#cfe0f7] pt-3 text-[14px] font-semibold leading-7 text-[#1E3A6E]">
        {renderFormattedText(instruction, `preview-passage-intro-${title}`)}
      </div>
    )}
  </div>
);

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

const expandPreviewAnswersWithLetters = (answers: any[] = [], options: any[] = []) => {
  if (!Array.isArray(options) || options.length === 0) return answers.map(cleanAnswer);

  const expanded = new Set<string>();

  answers.forEach((answer) => {
    const cleanedAnswer = cleanAnswer(answer);
    if (!cleanedAnswer) return;

    expanded.add(cleanedAnswer);

    if (/^[a-z]$/.test(cleanedAnswer)) {
      const option = options[cleanedAnswer.charCodeAt(0) - 97];
      if (option) expanded.add(cleanAnswer(option));
      return;
    }

    const optionIndex = options.findIndex((option) => cleanAnswer(option) === cleanedAnswer);
    if (optionIndex >= 0) {
      expanded.add(String.fromCharCode(97 + optionIndex));
    }
  });

  return Array.from(expanded);
};

const evaluatePreviewAnswer = (submittedAnswer: any, correctAnswers: any[] = [], questionType = '', options: any[] = []) => {
  const validCorrectAnswers = correctAnswers.filter((answer) => answer !== '[NO ANSWER DETECTED]');

  if (!hasPreviewAnswer(submittedAnswer) || validCorrectAnswers.length === 0) return false;

  const cleanedCorrect = expandPreviewAnswersWithLetters(validCorrectAnswers, options);

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
  const [audioLoadError, setAudioLoadError] = useState('');
  const previewAudioUrl = useMemo(() => {
    const legacyGroupAudio = test?.sections
      ?.filter((sec: any) => sec.type === 'listening')
      ?.flatMap((sec: any) => sec.question_groups || [])
      ?.find((grp: any) => grp.audio_url)
      ?.audio_url || '';

    return resolveListeningAudioUrl(test?.audio_file || legacyGroupAudio);
  }, [test]);
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
  const isWritingPreview = allQuestions.some((question: any) => question.question_type === 'WRITING_TASK');
  const reviewRows = useMemo(() => allQuestions.map((question: any) => {
    const studentAnswer = previewAnswers[question.id];
    const isWritingTask = question.question_type === 'WRITING_TASK';
    const isCorrect = isWritingTask ? false : evaluatePreviewAnswer(studentAnswer, question.correct_answers_json, question.question_type, question.options_json);

    return {
      question,
      studentAnswer,
      isWritingTask,
      isCorrect,
      isAnswered: hasPreviewAnswer(studentAnswer),
    };
  }), [allQuestions, previewAnswers]);
  const answeredCount = reviewRows.filter((row: any) => row.isAnswered).length;
  const objectiveRows = reviewRows.filter((row: any) => !row.isWritingTask);
  const correctCount = objectiveRows.filter((row: any) => row.isCorrect).length;

  useEffect(() => {
    if (!previewAudioUrl || !audioRef.current) return;

    setAudioLoadError('');
    setAudioProgress(0);
    audioRef.current.load();

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

  if (isSubmitted) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-[#F8FAFC] flex flex-col font-sans"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="h-16 bg-[#05162E] text-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-500/30 tracking-widest uppercase">
              Preview Mode
            </span>
            <h2 className="font-bold text-[15px]">{test.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Exit Preview"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl bg-white border border-slate-100 rounded-3xl shadow-sm p-10 text-center flex flex-col items-center">
            <div className="h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
              <ClipboardCheck className="h-10 w-10" />
            </div>
            <h1 className="text-[28px] font-black text-[#05162E] tracking-tight">Thank you for submitting your answers.</h1>
            <p className="text-[14px] text-slate-500 font-semibold leading-relaxed mt-3 max-w-lg">
              {isWritingPreview
                ? 'In the real student flow, these writing answers are saved and sent to the teacher review inbox.'
                : 'In the real student flow, objective answers are saved and graded automatically.'}
            </p>

            <div className="grid grid-cols-2 gap-3 w-full mt-8">
              <div className="p-4 bg-[#F8FAFC] border border-slate-100 rounded-2xl">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Answered</span>
                <span className="block text-[24px] font-black text-[#05162E] mt-1">{answeredCount}/{allQuestions.length}</span>
              </div>
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                <span className="block text-[10px] font-black uppercase tracking-widest text-rose-500">{isWritingPreview ? 'Status' : 'Score'}</span>
                <span className="block text-[24px] font-black text-rose-600 mt-1">{isWritingPreview ? 'Teacher Review' : `${correctCount}/${objectiveRows.length}`}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={() => setIsSubmitted(false)}
                className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-[#05162E] text-[13px] font-black rounded-xl flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Edit Preview Answers
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-black rounded-xl"
              >
                Back to Builder
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const setPreviewAnswer = (questionId: string, value: any) => {
    if (isSubmitted) return;
    setPreviewAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const togglePreviewMultiAnswer = (questionId: string, option: string, maxSelections = 2) => {
    if (isSubmitted) return;
    setPreviewAnswers((current) => {
      const selected = Array.isArray(current[questionId]) ? current[questionId] : [];
      return {
        ...current,
        [questionId]: selected.includes(option)
          ? selected.filter((item: string) => item !== option)
          : selected.length < maxSelections
          ? [...selected, option]
          : selected,
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
    setAudioLoadError('');
    audioRef.current.play()
      .then(() => setAudioAutoplayBlocked(false))
      .catch((error) => {
        setAudioAutoplayBlocked(true);
        setAudioLoadError(error?.message || 'Audio could not start. Check that the audio file is reachable.');
      });
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
              <span>{isWritingPreview ? 'Submitted for review' : `${correctCount}/${objectiveRows.length} correct`}</span>
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
                    preload="auto"
                    controls={false}
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    onCanPlay={() => setAudioLoadError('')}
                    onPlaying={() => {
                      setAudioAutoplayBlocked(false);
                      setAudioLoadError('');
                    }}
                    onError={() => {
                      setAudioAutoplayBlocked(true);
                      setAudioLoadError('Audio file could not be loaded. Re-upload the listening audio.');
                    }}
                    onTimeUpdate={updateAudioProgress}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-[#1E3A6E] rounded-full flex items-center justify-center text-white shrink-0 shadow-md">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        {audioLoadError ? audioLoadError : audioAutoplayBlocked ? 'Click Start Audio to preview' : 'Listening audio playing'}
                      </p>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1E3A6E]" style={{ width: `${audioProgress}%` }}></div>
                      </div>
                      <p className="mt-2 text-[10px] font-semibold text-slate-400 truncate">{previewAudioUrl}</p>
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

              {sec.type === 'writing' && (
                <div className="my-8 p-5 bg-white border border-rose-100 rounded-2xl shadow-sm flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                    <PenLine className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Writing Module</p>
                    <p className="text-[13px] text-slate-600 font-semibold mt-2 leading-relaxed">
                      Student writing responses are saved for manual review and are not included in the automatic objective score.
                    </p>
                  </div>
                </div>
              )}
              
              {sec.question_groups?.map((grp: any) => (
                <div key={grp.id} className="mb-10">
                  {sec.type === 'reading' && (
                    <PassageIntroCard
                      title={grp.title || 'Reading Passage'}
                      instruction={grp.instruction}
                    />
                  )}

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
                  <h3 className="font-black text-[16px] text-[#05162E]">
                    {isWritingPreview ? 'Writing Submitted' : 'Preview Result'}
                  </h3>
                  <p className="text-[12px] text-slate-500 font-semibold mt-1">
                    {isWritingPreview
                      ? `${answeredCount}/${allQuestions.length} tasks answered. This goes to teacher review in the real student flow.`
                      : `${answeredCount}/${allQuestions.length} answered, ${correctCount}/${objectiveRows.length} correct.`}
                  </p>
                </div>
                <div className={`h-16 w-16 rounded-full border flex flex-col items-center justify-center shrink-0 ${
                  isWritingPreview ? 'bg-rose-50 border-rose-100' : 'bg-[#EFF4FB] border-[#1E3A6E]/10'
                }`}>
                  <span className={`text-[10px] font-black uppercase ${isWritingPreview ? 'text-rose-500' : 'text-slate-500'}`}>
                    {isWritingPreview ? 'Review' : 'Score'}
                  </span>
                  <span className={`text-[18px] font-black ${isWritingPreview ? 'text-rose-600' : 'text-[#1E3A6E]'}`}>
                    {isWritingPreview ? 'Manual' : `${correctCount}/${objectiveRows.length}`}
                  </span>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {reviewRows.map(({ question, studentAnswer, isCorrect, isAnswered, isWritingTask }: any) => (
                  <div key={question.id} className="p-4 flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${
                      isWritingTask ? 'bg-rose-50 text-rose-600' : isCorrect ? 'bg-emerald-50 text-emerald-700' : isAnswered ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {question.question_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isWritingTask ? (
                          <ClipboardCheck className="h-4 w-4 text-rose-500 shrink-0" />
                        ) : isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span className={`text-[12px] font-black uppercase ${isWritingTask ? 'text-rose-600' : isCorrect ? 'text-emerald-600' : isAnswered ? 'text-red-600' : 'text-slate-500'}`}>
                          {isWritingTask ? (isAnswered ? 'Ready for teacher review' : 'Unanswered') : isCorrect ? 'Correct' : isAnswered ? 'Incorrect' : 'Unanswered'}
                        </span>
                      </div>
                      <div className="text-[13px] text-[#05162E] font-semibold mt-1 line-clamp-2">
                        {renderFormattedBlockText(question.question_text, `preview-review-${question.id}`)}
                      </div>
                      <div className={`grid gap-2 mt-3 ${isWritingTask ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="block text-[10px] font-black uppercase text-slate-400">Your answer</span>
                          <span className="block text-[12px] font-bold text-slate-700 mt-0.5">{formatPreviewAnswer(studentAnswer)}</span>
                        </div>
                        {!isWritingTask && <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                          <span className="block text-[10px] font-black uppercase text-emerald-600">Correct answer</span>
                          <span className="block text-[12px] font-bold text-emerald-700 mt-0.5">
                            {(question.correct_answers_json || []).join(' OR ')}
                          </span>
                        </div>}
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
                        <p>{renderFormattedText(grp.instruction)}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    {buildOrderedQuestionBlocks(grp.questions || [], grp.instruction || '').map((block) => {
                      if (block.kind === 'matching') {
                        return (
                          <MatchingHeadingsGroup
                            key={block.id}
                            questions={block.questions}
                            instruction={block.instruction || grp.instruction || ''}
                            answers={previewAnswers}
                            onAnswer={setPreviewAnswer}
                            disabled={isSubmitted}
                          />
                        );
                      }

                      if (block.kind === 'summary') {
                        return (
                          <SummaryCompletionGroup
                            key={block.id}
                            questions={block.questions}
                            values={previewAnswers}
                            onChange={setPreviewAnswer}
                            mode="light"
                            groupInstruction={grp.instruction || ''}
                          />
                        );
                      }

                      return (
                        <div key={block.id} className="flex flex-col gap-4">
                          {sec.type === 'listening' && isListeningMatchingTextBlock(block.questions) ? (
                            <ListeningMatchingTextGroup
                              questions={block.questions}
                              instruction={block.instruction}
                              values={previewAnswers}
                              onChange={setPreviewAnswer}
                              disabled={isSubmitted}
                            />
                          ) : isMultiSelectAnswerGroup(block.questions) ? (
                            <MultiSelectAnswerGroup
                              questions={block.questions}
                              instruction={block.instruction}
                              values={previewAnswers}
                              onChange={setPreviewAnswer}
                              disabled={isSubmitted}
                            />
                          ) : (
                            <>
                              <QuestionInstructionCard instruction={block.instruction} />
                          {block.questions.map((q: any) => (
                      <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-4">
                        <div className="h-8 w-8 bg-[#1E3A6E] text-white rounded-full flex items-center justify-center font-black text-[13px] shrink-0 shadow-md">
                          {q.question_number}
                        </div>
                        
                        <div className="flex-1">
                          {q.question_type === 'WRITING_TASK' ? (
                            <div className="flex flex-col gap-4">
                              <div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-md text-[10px] font-black uppercase tracking-wider">
                                    {q.extra_data_json?.task_type || 'Writing Task'}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-bold">
                                    Minimum {q.extra_data_json?.minimum_words || 250} words
                                  </span>
                                </div>
                                <div className="font-medium text-[15px] text-[#05162E] leading-relaxed whitespace-pre-wrap">
                                  {renderFormattedBlockText(q.question_text, `preview-writing-${q.id}`)}
                                </div>
                              </div>
                              <textarea
                                disabled={isSubmitted}
                                value={previewAnswers[q.id] || ''}
                                onChange={(event) => setPreviewAnswer(q.id, event.target.value)}
                                rows={12}
                                placeholder="Write the response here..."
                                className="w-full border-2 border-slate-200 focus:border-rose-400 px-4 py-3 bg-[#F8FAFC] rounded-xl text-[14px] text-[#05162E] outline-none resize-y leading-relaxed"
                              />
                            </div>
                          ) : (
                          <div className="font-medium text-[15px] text-[#05162E] leading-relaxed mb-4 whitespace-pre-wrap">
                            {q.question_type === 'SHORT_ANSWER' ? (
                              <>
                                {renderFormattedText(q.question_text, `preview-short-${q.id}`)}
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
                                  {renderFormattedText(part, `preview-blank-${q.id}-${i}`)}
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
                              renderFormattedBlockText(q.question_text, `preview-question-${q.id}`)
                            )}
                          </div>
                          )}

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
                              {q.options_json.map((opt: string, idx: number) => {
                                const selectedValues = Array.isArray(previewAnswers[q.id]) ? previewAnswers[q.id] : [];
                                const maxSelections = Math.max(
                                  1,
                                  Number(q.extra_data_json?.max_selections) ||
                                    Number(q.marks) ||
                                    (Array.isArray(q.correct_answers_json) ? q.correct_answers_json.filter((answer: string) => answer && answer !== '[NO ANSWER DETECTED]').length : 0) ||
                                    2
                                );
                                const isMultiSelected = selectedValues.includes(opt);
                                const isMultiDisabled = q.question_type === 'MULTI_SELECT' && !isMultiSelected && selectedValues.length >= maxSelections;

                                return (
                                <label
                                  key={idx}
                                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                    isMultiDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                  } ${
                                    q.question_type === 'MULTI_SELECT'
                                      ? isMultiSelected
                                        ? 'border-[#1E3A6E] bg-[#EFF4FB]'
                                        : 'border-slate-200 hover:bg-[#F8FAFC]'
                                      : previewAnswers[q.id] === opt
                                      ? 'border-[#1E3A6E] bg-[#EFF4FB]'
                                      : 'border-slate-200 hover:bg-[#F8FAFC]'
                                  }`}
                                >
                                  <input 
                                    type={q.question_type === 'SINGLE_MCQ' ? 'radio' : 'checkbox'} 
                                    disabled={isSubmitted || isMultiDisabled}
                                    checked={
                                      q.question_type === 'MULTI_SELECT'
                                        ? isMultiSelected
                                        : previewAnswers[q.id] === opt
                                    }
                                    onChange={() => {
                                      if (q.question_type === 'MULTI_SELECT') {
                                        togglePreviewMultiAnswer(q.id, opt, maxSelections);
                                      } else {
                                        setPreviewAnswer(q.id, opt);
                                      }
                                    }}
                                    className="h-4 w-4 text-[#1E3A6E]"
                                  />
                                  <span className="text-[14px] text-slate-700">{opt}</span>
                                </label>
                              )})}
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
                            </>
                          )}
                        </div>
                      );
                    })}
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
            <span className="text-[14px] font-medium text-[#05162E] leading-snug">{renderFormattedText(question.question_text, `preview-matching-heading-${question.id}`)}</span>
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

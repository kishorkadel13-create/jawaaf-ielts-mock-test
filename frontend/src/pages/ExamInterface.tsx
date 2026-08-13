import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/examStore';
import { api } from '../services/api';
import { QuestionRenderer } from '../components/QuestionRenderer';
import { SummaryCompletionGroup, isSummaryCompletionQuestion } from '../components/SummaryCompletionGroup';
import { ListeningMatchingTextGroup, isListeningMatchingTextBlock } from '../components/ListeningMatchingTextGroup';
import { MultiSelectAnswerGroup, isMultiSelectAnswerGroup } from '../components/MultiSelectAnswerGroup';
import { renderFormattedBlockText, renderFormattedText, splitQuestionInstruction } from '../utils/renderFormattedText';
import { normalizePassageHtml } from '../utils/passageHtml';
import { getMatchingHeadingQuestion, getMatchingHeadingQuestions, isMatchingHeadingsQuestion, normalizeMatchingQuestionType, toRoman } from '../utils/matchingHeadings';
import { applyHighlightTarget, getHighlightTarget, type HighlightTarget } from '../utils/textHighlighter';
import { resolveListeningAudioUrl } from '../utils/audioUrl';
import { Award, Timer, Flag, Save, CheckCircle2, Play, Headphones, Volume2, PenLine, ClipboardX, Loader2, ChevronUp } from 'lucide-react';

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
          {renderFormattedText(heading, 'question-instruction-heading')}
        </h3>
      )}
      <div className="text-[16px] leading-8 text-[#05162E] whitespace-pre-wrap">
        {renderFormattedText(body || instruction, 'question-instruction-body')}
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
        {renderFormattedText(instruction, `passage-intro-${title}`)}
      </div>
    )}
  </div>
);

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
    beginExam,
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
  const [activeWritingTaskIndex, setActiveWritingTaskIndex] = useState(0);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [sectionSecondsRemaining, setSectionSecondsRemaining] = useState<number | null>(null);
  const [clipboardMessage, setClipboardMessage] = useState('');
  const internalClipboardRef = useRef<{ text: string; taskId: string | null } | null>(null);
  
  useEffect(() => {
    if (activeQuestionId) {
      const el = document.getElementById(`question-${activeQuestionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeQuestionId]);

  // Custom Audio parameters
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioLoadingMessage, setAudioLoadingMessage] = useState('Loading listening audio...');
  const [audioLoadError, setAudioLoadError] = useState('');
  const [startGateRequired, setStartGateRequired] = useState(false);
  const [examStartedByStudent, setExamStartedByStudent] = useState(false);
  const [audioCheckPlaying, setAudioCheckPlaying] = useState(false);
  const [audioCheckProgress, setAudioCheckProgress] = useState(0);
  const [audioCheckComplete, setAudioCheckComplete] = useState(false);
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

        const firstSection = test.sections?.[0];
        const firstSectionNeedsAudio = firstSection?.type === 'listening';

        // 3. Initialize Zustand store. Listening tests wait for audio preload before the clock starts.
        startExam(test, attempt.attempt, null, { isActive: !firstSectionNeedsAudio });
        setStartGateRequired(firstSectionNeedsAudio);
        setExamStartedByStudent(!firstSectionNeedsAudio);
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
  const selectedPassageTextRef = useRef('');
  const [highlightCoords, setHighlightCoords] = useState<{top: number, left: number} | null>(null);
  const [highlightedPassages, setHighlightedPassages] = useState<Record<string, string>>({});

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
      selectedPassageTextRef.current = text;
      
      setHighlightCoords({
        top: Math.max(72, rect.top - 42),
        left: Math.max(16, rect.left + rect.width / 2 - 42),
      });
    } else {
      highlightTargetRef.current = null;
      selectedPassageTextRef.current = '';
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
        setHighlightedPassages((current) => ({
          ...current,
          [target.passageId]: passageEl.innerHTML,
        }));
      }

      window.getSelection()?.removeAllRanges();
    } catch (e) {
      console.warn('Text selection highlight could not be applied.', e);
    }
    
    highlightTargetRef.current = null;
    selectedPassageTextRef.current = '';
    setHighlightCoords(null);
  };

  const copySelectedPassageText = async (event?: React.MouseEvent | React.PointerEvent) => {
    event?.preventDefault();
    event?.stopPropagation();

    const selectedText = selectedPassageTextRef.current || window.getSelection()?.toString().trim() || '';
    if (!selectedText) return;

    try {
      await navigator.clipboard.writeText(selectedText);
      setClipboardMessage('Copied from passage. You can paste it into an answer blank.');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = selectedText;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setClipboardMessage('Copied from passage. You can paste it into an answer blank.');
    }

    window.setTimeout(() => setClipboardMessage(''), 1800);
    window.getSelection()?.removeAllRanges();
    highlightTargetRef.current = null;
    selectedPassageTextRef.current = '';
    setHighlightCoords(null);
  };

  const currentSectionTypeForClipboard = activeTest?.sections?.[activeSectionIndex]?.type;

  const blockClipboard = (event: React.ClipboardEvent) => {
    event.preventDefault();
  };

  const showClipboardWarning = useCallback(() => {
    setClipboardMessage('External content cannot be pasted during the writing test.');
    window.setTimeout(() => setClipboardMessage(''), 2800);
  }, []);

  const showReadingClipboardWarning = useCallback(() => {
    setClipboardMessage('Only text copied from the reading passage can be pasted into answers.');
    window.setTimeout(() => setClipboardMessage(''), 2800);
  }, []);

  const handleReadingAnswerPaste = useCallback((
    event: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const pastedText = event.clipboardData.getData('text/plain').trim();
    const passageText = passageRef.current?.innerText || '';
    const normalizedPassageText = passageText.replace(/\s+/g, ' ').trim();
    const normalizedPastedText = pastedText.replace(/\s+/g, ' ').trim();
    const wasCopiedFromPassage = Boolean(
      normalizedPastedText &&
      normalizedPassageText.includes(normalizedPastedText)
    );

    if (!wasCopiedFromPassage) {
      showReadingClipboardWarning();
      return null;
    }

    setClipboardMessage('');
    return pastedText;
  }, [showReadingClipboardWarning]);

  const getSelectedTextareaText = (textarea: HTMLTextAreaElement) => (
    textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
  );

  const replaceTextareaSelection = (
    textarea: HTMLTextAreaElement,
    replacement: string,
    questionId: string
  ) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.setRangeText(replacement, start, end, 'end');
    setAnswer(questionId, textarea.value);
  };

  const handleWritingCopy = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>, questionId: string) => {
    event.preventDefault();
    event.stopPropagation();

    const selectedText = getSelectedTextareaText(event.currentTarget);
    if (!selectedText) return;

    internalClipboardRef.current = { text: selectedText, taskId: questionId };
    setClipboardMessage('');
  }, []);

  const handleWritingCut = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>, questionId: string) => {
    event.preventDefault();
    event.stopPropagation();

    const textarea = event.currentTarget;
    const selectedText = getSelectedTextareaText(textarea);
    if (!selectedText) return;

    internalClipboardRef.current = { text: selectedText, taskId: questionId };
    replaceTextareaSelection(textarea, '', questionId);
    setClipboardMessage('');
  }, [setAnswer]);

  const handleWritingPaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>, questionId: string) => {
    event.preventDefault();
    event.stopPropagation();

    const internalClipboard = internalClipboardRef.current;
    if (!internalClipboard?.text || internalClipboard.taskId !== questionId) {
      showClipboardWarning();
      return;
    }

    replaceTextareaSelection(event.currentTarget, internalClipboard.text, questionId);
    setClipboardMessage('');
  }, [setAnswer, showClipboardWarning]);

  const handleWritingDrop = useCallback((event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    event.stopPropagation();
    showClipboardWarning();
  }, [showClipboardWarning]);

  const activeSection = activeTest?.sections?.[activeSectionIndex];
  const isFullMock = (activeTest?.sections?.length || 0) > 1;
  const isLastSection = activeSectionIndex >= ((activeTest?.sections?.length || 1) - 1);
  const nextSection = activeTest?.sections?.[activeSectionIndex + 1];
  const activeGroups = activeSection?.question_groups || [];
  const listeningAudioUrl = activeSection?.type === 'listening'
    ? resolveListeningAudioUrl(activeTest?.audio_file || activeSection?.audio_file || activeGroups.find((group: any) => group.audio_url)?.audio_url || '')
    : '';
  const sectionQuestions = activeGroups.flatMap((g: any) => g.questions || []).sort((a: any, b: any) => a.question_number - b.question_number);
  const writingTasks = activeSection?.type === 'writing'
    ? sectionQuestions
        .filter((question: any) => question.question_type === 'WRITING_TASK')
        .sort((a: any, b: any) => (Number(a.order_no) || 0) - (Number(b.order_no) || 0))
    : [];
  const activeWritingTask = writingTasks[activeWritingTaskIndex] || writingTasks[0] || null;
  const activeWritingGroup = activeSection?.type === 'writing'
    ? activeGroups.find((group: any) => group.questions?.some((question: any) => question.id === activeWritingTask?.id)) || activeGroups[0]
    : null;
  const activeWritingAnswer = activeWritingTask ? String(answers[activeWritingTask.id] || '') : '';
  const activeWritingWordCount = activeWritingAnswer.trim() ? activeWritingAnswer.trim().split(/\s+/).length : 0;
  const activePassages = useMemo(
    () => activeGroups.map((group: any) => ({
      ...group,
      normalizedPassage: normalizePassageHtml(group.passage),
    })),
    [activeGroups]
  );

  const getSectionDurationMinutes = useCallback((section: any) => {
    if (Number(section?.duration) > 0) return Number(section.duration);
    if (section?.type === 'listening') return 30;
    if (section?.type === 'reading') return 60;
    if (section?.type === 'writing') return 60;
    return 60;
  }, []);

  const completeCurrentSection = useCallback(async (automatic = false) => {
    if (!isLastSection) {
      if (!automatic) {
        const confirmSection = window.confirm(`Submit ${activeSection?.type || 'this'} section and continue to ${nextSection?.type || 'the next'} section? You can continue the same mock attempt.`);
        if (!confirmSection) return;
      }

      await autosave();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveSection(activeSectionIndex + 1);
      setActiveQuestionId(null);
      setActiveWritingTaskIndex(0);
      return;
    }

    if (!automatic) {
      const confirmSubmit = window.confirm('Are you sure you want to submit your test? This will send your answers for scoring and teacher review.');
      if (!confirmSubmit) return;
    }

    await submitExam();
    navigate(`/attempts/${id}/result`);
  }, [activeSection?.type, activeSectionIndex, autosave, id, isLastSection, navigate, nextSection?.type, setActiveSection, submitExam]);

  const handleSubmit = async () => {
    try {
      await completeCurrentSection(false);
    } catch (err) {
      if (isLastSection) {
        alert('Failed to submit exam. Check your connection.');
      } else {
        alert('Failed to save this section. Check your connection.');
      }
    }
  };

  useEffect(() => {
    if (!activeSection) return;
    setSectionSecondsRemaining(getSectionDurationMinutes(activeSection) * 60);
  }, [activeSection?.id, activeSection, getSectionDurationMinutes]);

  useEffect(() => {
    if (!isFullMock || !isActive || isFinished || sectionSecondsRemaining === null) return;

    const interval = setInterval(() => {
      setSectionSecondsRemaining(current => {
        if (current === null) return current;
        if (current <= 1) {
          clearInterval(interval);
          completeCurrentSection(true).catch((err) => {
            console.error('Automatic section submission failed:', err);
          });
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [completeCurrentSection, isActive, isFinished, isFullMock, sectionSecondsRemaining]);

  useEffect(() => {
    if (isFinished) {
      navigate(`/attempts/${id}/result`);
    }
  }, [id, isFinished, navigate]);

  useEffect(() => {
    setHighlightedPassages({});
  }, [activeSection?.id]);

  useEffect(() => {
    setActiveWritingTaskIndex(0);
  }, [activeSection?.id]);

  useEffect(() => {
    if (activeSection?.type !== 'listening' || !listeningAudioUrl || !audioRef.current || isFinished) return;

    setAudioProgress(0);
    setAudioPlaying(false);
    setAudioAutoplayBlocked(false);
    setAudioReady(false);
    setAudioLoadError('');
    setAudioCheckPlaying(false);
    setAudioCheckProgress(0);
    setAudioCheckComplete(false);
    setAudioLoadingMessage('Loading listening audio...');
    audioRef.current.currentTime = 0;
    audioRef.current.playbackRate = 1;
    audioRef.current.load();
  }, [activeSection?.id, activeSection?.type, listeningAudioUrl, isFinished]);

  useEffect(() => {
    if (!examStartedByStudent || activeSection?.type !== 'listening' || !listeningAudioUrl || !audioRef.current || isFinished) return;

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
  }, [activeSection?.id, activeSection?.type, examStartedByStudent, listeningAudioUrl, isFinished]);

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

  const stopAudioCheck = (completed = false) => {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setAudioPlaying(false);
    setAudioAutoplayBlocked(false);
    setAudioCheckPlaying(false);
    setAudioCheckProgress(completed ? 100 : 0);
    if (completed) setAudioCheckComplete(true);
  };

  const startAudioCheck = () => {
    const audio = audioRef.current;
    if (!audio || !audioReady) return;

    setAudioLoadError('');
    setAudioAutoplayBlocked(false);
    setAudioCheckComplete(false);
    setAudioCheckProgress(0);
    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = 1;

    audio.play()
      .then(() => {
        setAudioPlaying(true);
        setAudioCheckPlaying(true);
      })
      .catch((error) => {
        setAudioCheckPlaying(false);
        setAudioAutoplayBlocked(true);
        setAudioLoadError(error?.message || 'Audio check could not start. Try again after checking your browser audio settings.');
      });
  };

  const updateAudioProgress = () => {
    if (!audioRef.current || !audioRef.current.duration) return;
    if (audioCheckPlaying) {
      const sampleProgress = Math.min((audioRef.current.currentTime / 15) * 100, 100);
      setAudioCheckProgress(sampleProgress);
      if (audioRef.current.currentTime >= 15) {
        stopAudioCheck(true);
      }
      return;
    }
    setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleAudioReady = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const bufferedEnd = audio.buffered.length > 0 ? audio.buffered.end(audio.buffered.length - 1) : 0;
    const bufferedPercent = audio.duration ? (bufferedEnd / audio.duration) * 100 : 0;
    setAudioProgress(Math.max(0, Math.min(100, bufferedPercent)));

    if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA || bufferedPercent >= 90) {
      setAudioReady(true);
      setAudioLoadingMessage('Listening audio is ready.');
    } else if (bufferedPercent > 0) {
      setAudioLoadingMessage(`Buffering listening audio... ${Math.round(bufferedPercent)}%`);
    }
  };

  const handleStartExam = () => {
    if (activeSection?.type === 'listening' && (!listeningAudioUrl || !audioReady)) return;
    stopAudioCheck(false);
    beginExam();
    setExamStartedByStudent(true);
  };

  const submitButtonLabel = !isLastSection
    ? `Submit ${activeSection?.type || 'Section'}`
    : isFullMock
    ? 'Final Submit'
    : 'Submit Test';

  return (
    <div
      className="fixed inset-0 z-0 flex flex-col bg-[#F8FAFC] select-none"
      style={{ height: '100dvh', width: '100vw', overflow: 'hidden' }}
      onCopy={currentSectionTypeForClipboard === 'writing' ? blockClipboard : undefined}
      onCut={blockClipboard}
      onPaste={blockClipboard}
    >
      {startGateRequired && !examStartedByStudent && (
        <div className="fixed inset-0 z-[100] bg-[#F8FAFC] text-[#05162E] flex flex-col">
          <div
            className="h-[72px] text-white px-6 md:px-10 flex items-center justify-between shrink-0 border-b border-[#294b77]/40"
            style={{ background: 'linear-gradient(to right, #294b77 0%, #294b77 100%)' }}
          >
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-black tracking-wide">{activeTest?.title || 'Listening Test'}</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">Audio Readiness Check</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/85">
              <Headphones className="h-4 w-4 text-emerald-300" /> IELTS Listening
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 md:px-10 md:py-10">
            <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8">
                <div className="flex flex-col items-center text-center gap-5">
                  <div className="h-20 w-20 rounded-2xl bg-[#EFF4FB] border border-[#2C4B78]/20 text-[#2C4B78] flex items-center justify-center shadow-sm">
                    <Headphones className="h-10 w-10" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Before You Begin</p>
                    <h1 className="mt-2 text-[26px] md:text-[32px] font-black text-[#05162E]">Listening Audio Check</h1>
                    <p className="mt-3 max-w-2xl text-[14px] font-semibold leading-7 text-slate-500">
                      Your exam will unlock only after the complete listening track is ready. Once you start, the recording plays continuously like the official computer-based test.
                    </p>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audio Status</p>
                      <p className={`mt-1 text-[13px] font-black ${audioLoadError ? 'text-[#EE6055]' : audioReady ? 'text-[#2C4B78]' : 'text-[#1E3A6E]'}`}>
                        {audioLoadError || (listeningAudioUrl ? audioLoadingMessage : 'Listening audio has not been uploaded.')}
                      </p>
                    </div>
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                      audioReady ? 'bg-[#EFF4FB] text-[#2C4B78]' : audioLoadError ? 'bg-[#FFF3F2] text-[#EE6055]' : 'bg-[#EFF4FB] text-[#1E3A6E]'
                    }`}>
                      {listeningAudioUrl && !audioReady && !audioLoadError && <Loader2 className="h-4 w-4 animate-spin" />}
                      {audioReady && <CheckCircle2 className="h-5 w-5" />}
                      {audioLoadError && <ClipboardX className="h-5 w-5" />}
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      style={{ width: `${audioReady ? 100 : Math.max(audioProgress, 8)}%` }}
                      className="h-full bg-[#2C4B78] transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#294b77]/15 bg-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Headphone Check</p>
                      <p className="mt-1 text-[13px] font-black text-[#05162E]">
                        {audioCheckPlaying
                          ? 'Playing a 15-second audio sample...'
                          : audioCheckComplete
                          ? 'Audio check complete. You can start the exam.'
                          : 'Play a short sample before starting the exam.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={audioCheckPlaying ? () => stopAudioCheck(false) : startAudioCheck}
                      disabled={!audioReady}
                      className="w-full sm:w-auto px-4 py-2.5 bg-[#EEF4FB] hover:bg-[#E5EEF9] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-[#294b77] rounded-xl text-[12px] font-black flex items-center justify-center gap-2 border border-[#294b77]/10"
                    >
                      {audioCheckPlaying ? <Volume2 className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                      {audioCheckPlaying ? 'Stop Check' : 'Play Audio Check'}
                    </button>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      style={{ width: `${audioCheckProgress}%` }}
                      className="h-full bg-[#EE6055] transition-all duration-300"
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-slate-400">
                    This check does not start the timer. The exam recording will restart from the beginning after Start Exam.
                  </p>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleStartExam}
                    disabled={!listeningAudioUrl || !audioReady}
                    className="w-full sm:w-auto px-8 py-3 bg-[#2C4B78] hover:bg-[#1E3A6E] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-black flex items-center justify-center gap-2 shadow-sm shadow-[#2C4B78]/20"
                  >
                    <Play className="h-4 w-4 fill-current" /> Start Exam
                  </button>
                  <p className="text-[11px] font-bold text-slate-400">The timer starts after this button is pressed.</p>
                </div>
              </section>

              <aside
                className="text-white rounded-2xl border border-[#294b77]/30 shadow-sm p-6 md:p-7"
                style={{ background: 'linear-gradient(to right, #294b77 0%, #294b77 100%)' }}
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-10 w-1.5 rounded-full bg-[#EE6055]" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#EE6055]">Listening Rules</p>
                    <h3 className="mt-1 text-[20px] font-black">Terms and Conditions</h3>
                  </div>
                </div>
                <div className="mt-5 space-y-4 text-[13px] font-semibold leading-6 text-slate-300">
                  {[
                    'The recording will play once only and will continue until it finishes.',
                    'Pause, rewind, forward, seeking, speed control, and download are disabled.',
                    'Keep this tab open and do not refresh the page during the listening section.',
                    'Check your headphones and system volume before pressing Start Exam.',
                    'Answer questions while the audio is playing. The section timer starts with the exam.',
                  ].map((rule, index) => (
                    <div key={rule} className="grid grid-cols-[28px_1fr] gap-3">
                      <span className="h-7 w-7 rounded-lg bg-[#2C4B78]/45 border border-white/10 text-[#EE6055] flex items-center justify-center text-[11px] font-black">
                        {index + 1}
                      </span>
                      <p>{rule}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 border-t border-white/10 pt-5 text-[12px] font-bold leading-6 text-slate-400">
                  By starting the exam, you confirm that your audio device is ready and you understand the listening playback rules.
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. Header Toolbar */}
      <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-slate-900 px-4 py-3 text-slate-200 sm:px-6 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Award className="h-5 w-5 text-[#1E3A6E] shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold tracking-wide text-white">{activeTest.title}</h1>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{activeSection?.type} Section</span>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="order-3 flex w-full gap-1 overflow-x-auto rounded-xl border border-white/5 bg-slate-950 p-1 sm:order-none sm:w-auto">
          {activeSection?.type === 'writing' && writingTasks.length > 0 ? (
            writingTasks.map((task: any, idx: number) => (
              <button
                key={task.id}
                onClick={() => setActiveWritingTaskIndex(idx)}
                className={`min-h-9 shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
                  activeWritingTaskIndex === idx
                    ? 'bg-[#1E3A6E] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {task.extra_data_json?.task_type || `Task ${idx + 1}`}
              </button>
            ))
          ) : (
            activeTest.sections.map((sec: any, idx: number) => (
              <button
                key={sec.id}
                type="button"
                disabled={isFullMock}
                onClick={() => {
                  if (!isFullMock) setActiveSection(idx);
                }}
                className={`min-h-9 shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
                  activeSectionIndex === idx
                    ? 'bg-[#1E3A6E] text-white'
                    : isFullMock
                    ? 'text-slate-600'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sec.title}
              </button>
            ))
          )}
        </div>

        {/* Timer & Submit controls */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-6">
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
            (isFullMock ? (sectionSecondsRemaining || 0) : secondsRemaining) < 300 ? 'text-[#EE6055] border-[#EE6055]/30 bg-[#EE6055]/5' : 'text-emerald-400 border-emerald-500/30'
          }`}>
            <Timer className="h-4 w-4 animate-pulse" />
            <span>{formatTime(isFullMock ? (sectionSecondsRemaining ?? secondsRemaining) : secondsRemaining)}</span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex min-h-10 items-center justify-center rounded-xl bg-[#1E3A6E] px-3 text-[12px] font-black text-white shadow-sm disabled:opacity-60 sm:hidden"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>

        </div>
      </header>

      {/* 2. Main CBT Split Screen Layout */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-20 lg:flex-row lg:overflow-hidden lg:pb-0">
        
        {/* Highlighter Tooltip overlay */}
        {highlightCoords && (
          <div
            style={{ top: highlightCoords.top, left: highlightCoords.left }}
            className="fixed z-50 flex overflow-hidden rounded-lg border border-slate-900/10 bg-slate-950 text-xs font-black text-white shadow-lg"
          >
            <button
              type="button"
              onPointerDown={copySelectedPassageText}
              onMouseDown={copySelectedPassageText}
              className="px-3 py-1.5 hover:bg-[#294b77] transition-colors"
            >
              Copy
            </button>
            <button
              type="button"
              onPointerDown={applyHighlight}
              onMouseDown={applyHighlight}
              className="border-l border-white/15 bg-yellow-300 px-3 py-1.5 text-slate-950 hover:bg-yellow-200 transition-colors"
            >
              Highlight
            </button>
          </div>
        )}

        {/* LEFT COLUMN: Passage (Reading) or Audio Deck (Listening) */}
        <div 
          className="relative min-h-0 w-full shrink-0 overflow-y-visible border-b border-slate-200 bg-[#fbfbfa] px-4 py-5 sm:px-6 sm:py-6 lg:h-full lg:w-1/2 lg:flex-[0_0_50%] lg:overflow-y-scroll lg:border-b-0 lg:border-r lg:px-8 lg:py-7"
          onMouseUp={handleSelection}
          onKeyUp={handleSelection}
        >
          {activeSection?.type === 'listening' ? (
            /* Premium Listening Audio Interface */
            <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-6 py-8 text-center lg:gap-8 lg:py-12">
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
                <div className="sticky top-0 z-20 flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5 lg:static">
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
                      preload="auto"
                      controls={false}
                      controlsList="nodownload noplaybackrate noremoteplayback"
                      onCanPlayThrough={handleAudioReady}
                      onProgress={handleAudioReady}
                      onLoadedData={handleAudioReady}
                      onWaiting={() => setAudioLoadingMessage('Buffering listening audio...')}
                      onError={() => {
                        setAudioLoadError('Listening audio could not be loaded. Ask the admin to upload the file again.');
                        setAudioReady(false);
                      }}
                      onTimeUpdate={updateAudioProgress}
                      onEnded={() => setAudioPlaying(false)}
                      onRateChange={() => {
                        if (audioRef.current && audioRef.current.playbackRate !== 1) {
                          audioRef.current.playbackRate = 1;
                        }
                      }}
                      onPause={() => {
                        if (examStartedByStudent && !audioRef.current?.ended && !isFinished) {
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
          ) : activeSection?.type === 'writing' ? (
            <div className="flex flex-1 flex-col gap-5 py-2 sm:gap-6 sm:py-6">
              {activeWritingTask ? (
                <>
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                    <div className="min-w-0">
                      <span className="px-2.5 py-1 bg-[#EFF4FB] text-[#1E3A6E] text-[10px] font-black uppercase tracking-wider rounded-md">
                        {activeWritingTask.extra_data_json?.task_type || 'Writing Task'}
                      </span>
                      <h2 className="mt-3 break-words text-xl font-extrabold leading-tight text-[#05162E] sm:text-2xl">
                        {activeWritingTask.extra_data_json?.task_title || activeWritingTask.extra_data_json?.task_type || 'Writing Task'}
                      </h2>
                      <p className="text-[12px] font-bold text-slate-500 mt-2">
                        Recommendation: {activeWritingTask.extra_data_json?.suggested_minutes || 40} minutes • Minimum {activeWritingTask.extra_data_json?.minimum_words || 250} words
                      </p>
                    </div>
                    <PenLine className="h-7 w-7 text-[#1E3A6E] shrink-0" />
                  </div>

                  {activeWritingTask.instruction && (
                    <div className="bg-[#EFF4FB] border border-[#1E3A6E]/10 rounded-2xl p-5 text-[13px] font-semibold text-[#1E3A6E] leading-relaxed">
                      {activeWritingTask.instruction}
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-3">Prompt</h3>
                    <div className="text-[15px] font-semibold text-[#05162E] leading-relaxed whitespace-pre-wrap">
                      {renderFormattedBlockText(activeWritingTask.question_text, `writing-prompt-${activeWritingTask.id}`)}
                    </div>
                  </div>

                  {activeWritingTask.extra_data_json?.task_type === 'Task 1' && activeWritingGroup?.image_url && (
                    <img
                      src={activeWritingGroup.image_url}
                      alt="Task 1 visual"
                      loading="lazy"
                      className="w-full max-h-[420px] object-contain bg-white border border-slate-200 rounded-2xl shadow-sm"
                    />
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                  <PenLine className="h-14 w-14 mb-4 text-slate-300" />
                  <h2 className="text-xl font-black text-[#05162E]">Writing tasks are not ready</h2>
                  <p className="text-sm font-semibold mt-2">Ask the admin to create Task 1 and Task 2 before publishing this test.</p>
                </div>
              )}
            </div>
          ) : (
            /* Reading Passage HTML Render */
            <div ref={passageRef} className="ielts-passage-shell mb-12">
              <h2 className="ielts-passage-title text-[#05162E] border-b border-slate-200 pb-4">{activeSection?.title || 'Reading Passage'}</h2>
              <div className="space-y-10">
                {activePassages.length > 0 ? activePassages.map((group: any, index: number) => (
                  <section key={group.id || index} className="scroll-mt-6">
                    <PassageIntroCard
                      title={group.title || `Reading Passage ${index + 1}`}
                      instruction={group.instruction}
                    />
                    {group.image_url && (
                      <img
                        src={group.image_url}
                        alt={`${group.title || 'Reading passage'} reference`}
                        loading="lazy"
                        className="mx-auto mb-6 h-auto w-full max-w-2xl rounded-xl border border-slate-200 shadow-sm"
                      />
                    )}
                    {group.normalizedPassage ? (
                      <div 
                        data-passage-id={group.id || `active-passage-${index}`}
                        className="ielts-passage focus:outline-none select-text"
                        dangerouslySetInnerHTML={{ __html: highlightedPassages[group.id] ?? group.normalizedPassage }}
                      />
                    ) : (
                      <p className="text-[14px] font-semibold text-slate-400">No passage text uploaded for this group yet.</p>
                    )}
                  </section>
                )) : (
                  <p className="text-[14px] font-semibold text-slate-400">No reading passage uploaded.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Questions column */}
        <div
          className="min-h-0 w-full min-w-0 bg-[#F8FAFC] p-4 sm:p-6 lg:h-full lg:w-1/2 lg:flex-[0_0_50%] lg:overflow-y-scroll lg:p-8"
        >
          <div style={{ display: 'none' }} aria-hidden="true" data-reading-layout-marker="split-scroll-active" />
          {activeSection?.type === 'writing' ? (
            <div className="flex h-full flex-col gap-5">
              <div className="sticky top-0 z-20 flex gap-2 rounded-2xl bg-[#F8FAFC]/95 py-2 backdrop-blur lg:static lg:bg-transparent lg:py-0">
                {writingTasks.map((task: any, idx: number) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setActiveWritingTaskIndex(idx)}
                    className={`min-h-11 flex-1 rounded-xl border py-3 text-[13px] font-black transition-all ${
                      activeWritingTaskIndex === idx
                        ? 'bg-[#1E3A6E] border-[#1E3A6E] text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {task.extra_data_json?.task_type || `Task ${idx + 1}`}
                  </button>
                ))}
              </div>

              {activeWritingTask ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
	                  <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
	                    <div>
	                      <h3 className="font-black text-[15px] text-[#05162E]">Writing Editor</h3>
	                      <p className="text-[11px] font-bold text-slate-400 mt-1">
	                        Internal copy, cut, and paste are allowed. External paste is blocked.
	                      </p>
	                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[12px] font-black ${
                      activeWritingWordCount >= (activeWritingTask.extra_data_json?.minimum_words || 250)
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
	                      {activeWritingWordCount} words
	                    </div>
	                  </div>
	                  {clipboardMessage && (
	                    <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-[#EE6055]/20 bg-[#FFF3F2] px-4 py-3 text-[12px] font-black text-[#EE6055]">
	                      <ClipboardX className="h-4 w-4 shrink-0" />
	                      {clipboardMessage}
	                    </div>
	                  )}
	                  <textarea
	                    value={activeWritingAnswer}
	                    onChange={(event) => setAnswer(activeWritingTask.id, event.target.value)}
	                    onCopy={(event) => handleWritingCopy(event, activeWritingTask.id)}
	                    onCut={(event) => handleWritingCut(event, activeWritingTask.id)}
	                    onPaste={(event) => handleWritingPaste(event, activeWritingTask.id)}
	                    onDrop={handleWritingDrop}
	                    onContextMenu={(event) => event.preventDefault()}
	                    placeholder="Write your answer here..."
	                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    autoComplete="off"
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
	                    className="min-h-[50vh] w-full flex-1 resize-none select-text bg-white p-4 text-[15px] leading-7 text-[#05162E] outline-none sm:min-h-[420px] sm:p-6"
                  />
                  <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-slate-100 bg-white px-5 py-3 text-[11px] font-bold text-slate-400">
                    <span>Minimum {activeWritingTask.extra_data_json?.minimum_words || 250} words</span>
                    <span>{autosaveStatus === 'saving' ? 'Saving...' : autosaveStatus === 'saved' ? 'Autosaved' : 'Autosave active'}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 font-bold">
                  No writing tasks available.
                </div>
              )}
            </div>
          ) : (
          <div className="space-y-10">
            {activeSection?.type === 'reading' && clipboardMessage && (
              <div className="sticky top-0 z-20 flex items-center gap-2 rounded-xl border border-[#EE6055]/20 bg-[#FFF3F2] px-4 py-3 text-[12px] font-black text-[#EE6055] shadow-sm">
                <ClipboardX className="h-4 w-4 shrink-0" />
                {clipboardMessage}
              </div>
            )}
            {activeGroups.map((group: any) => (
              <div key={group.id} className="space-y-6 mb-10">
                {/* Group instruction banner */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-extrabold text-[16px] text-[#05162E]">{group.title}</h3>
                  {group.instruction && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-[13px] font-medium">
                      <p>{renderFormattedText(group.instruction)}</p>
                    </div>
                  )}
                </div>

                {/* Render questions inside group */}
                <div className="space-y-6">
                  {buildOrderedQuestionBlocks(group.questions || [], group.instruction || '').map((block) => {
                    if (block.kind === 'matching') {
                      const headingQuestion = getMatchingHeadingQuestion(block.questions, block.instruction || group.instruction || '');
                      if (headingQuestion) {
                        return (
                          <MatchingHeadingsGroup
                            key={block.id}
                            questions={block.questions}
                            instruction={block.instruction || group.instruction || ''}
                            answers={answers}
                            onAnswer={setAnswer}
                            onActivateQuestion={setActiveQuestionId}
                          />
                        );
                      }
                      // Fall through to standard rendering if options are missing
                    }

                    if (block.kind === 'summary') {
                      return (
                        <SummaryCompletionGroup
                          key={block.id}
                          questions={block.questions}
                          values={answers}
                          onChange={setAnswer}
                          mode="light"
                          onActivateQuestion={setActiveQuestionId}
                          groupInstruction={group.instruction || ''}
                          onPasteText={activeSection?.type === 'reading' ? handleReadingAnswerPaste : undefined}
                        />
                      );
                    }

                    return (
                      <div key={block.id} className="space-y-4">
                        {activeSection?.type === 'listening' && isListeningMatchingTextBlock(block.questions) ? (
                          <ListeningMatchingTextGroup
                            questions={block.questions}
                            instruction={block.instruction}
                            values={answers}
                            onChange={setAnswer}
                            onActivateQuestion={setActiveQuestionId}
                          />
                        ) : isMultiSelectAnswerGroup(block.questions) ? (
                          <MultiSelectAnswerGroup
                            questions={block.questions}
                            instruction={block.instruction}
                            values={answers}
                            onChange={setAnswer}
                            onActivateQuestion={setActiveQuestionId}
                          />
                        ) : (
                          <>
                            <QuestionInstructionCard instruction={block.instruction} />
                        {block.questions.map((question: any) => (
                          <div 
                            key={question.id} 
                            id={`question-${question.id}`}
                            className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-all sm:flex-row sm:items-start sm:p-6 ${
                              activeQuestionId === question.id 
                                ? 'border-[#1E3A6E]/50' 
                                : 'border-slate-200'
                            }`}
                            onClick={() => setActiveQuestionId(question.id)}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E3A6E] text-[13px] font-black text-white shadow-md">
                              {question.question_number}
                            </div>

                            <div className="min-w-0 flex-1">
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

                              <QuestionRenderer 
                                question={question} 
                                value={answers[question.id]} 
                                onChange={(val) => setAnswer(question.id, val)}
                                mode="light"
                                onPasteText={activeSection?.type === 'reading' ? handleReadingAnswerPaste : undefined}
                              />
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
          )}
        </div>

      </div>

      {/* 3. Bottom Palette Navigation Dock */}
      <footer className={`fixed inset-x-0 bottom-0 z-40 flex max-h-[72dvh] shrink-0 select-none flex-col gap-4 overflow-hidden border-t border-slate-200 bg-white px-4 pb-4 pt-2 text-slate-500 shadow-[0_-4px_20px_rgba(15,23,42,0.10)] transition-transform duration-300 lg:static lg:max-h-none lg:translate-y-0 lg:flex-row lg:items-center lg:justify-between lg:overflow-visible lg:px-6 lg:py-4 ${
        isPaletteOpen ? 'translate-y-0' : 'translate-y-[calc(100%-56px)]'
      }`}>
        <button
          type="button"
          onClick={() => setIsPaletteOpen(current => !current)}
          className="flex min-h-11 w-full items-center justify-between rounded-xl bg-[#F8FAFC] px-4 text-[12px] font-black uppercase tracking-wide text-[#05162E] lg:hidden"
          aria-expanded={isPaletteOpen}
        >
          <span>Question Palette</span>
          <ChevronUp className={`h-4 w-4 transition-transform ${isPaletteOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex max-w-full flex-wrap gap-2 overflow-x-auto py-1">
          {(activeSection?.type === 'writing' ? writingTasks : sectionQuestions).map((q: any, idx: number) => {
            const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
            const isFlagged = flaggedQuestions.includes(q.id);
            const isActiveQ = activeSection?.type === 'writing' ? activeWritingTaskIndex === idx : activeQuestionId === q.id;

            return (
              <button
                key={q.id}
                onClick={() => {
                  if (activeSection?.type === 'writing') {
                    setActiveWritingTaskIndex(idx);
                  } else {
                    setActiveQuestionId(q.id);
                  }
                  setIsPaletteOpen(false);
                }}
                className={`${activeSection?.type === 'writing' ? 'px-4 w-auto' : 'w-9'} flex h-9 min-w-9 items-center justify-center rounded-xl text-[13px] font-bold transition-all ${
                  isActiveQ ? 'ring-2 ring-[#1E3A6E]/30 scale-110 z-10 shadow-lg' : ''
                } ${
                  isFlagged 
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' 
                    : isAnswered 
                    ? 'bg-[#1E3A6E] text-white hover:bg-[#162d57]' 
                    : 'bg-white border border-slate-300 text-slate-500 hover:bg-[#F8FAFC]'
                }`}
              >
                {activeSection?.type === 'writing' ? (q.extra_data_json?.task_type || `Task ${idx + 1}`) : q.question_number}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex shrink-0 flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 sm:gap-5">
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
        
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#1E3A6E] px-8 py-3 text-[14px] font-black uppercase tracking-wide text-white shadow-md transition-all hover:bg-[#162d57] sm:w-auto"
        >
          <CheckCircle2 className="h-5 w-5" /> {submitButtonLabel}
        </button>
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
            <span className="text-[14px] font-medium text-[#05162E] leading-snug">{renderFormattedText(question.question_text, `matching-heading-${question.id}`)}</span>
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

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import StudentSidebar from '../components/StudentSidebar';
import WritingTask1Practice from '../components/WritingTask1Practice';
import WritingTask2Practice from '../components/WritingTask2Practice';
import MobileBottomNav from '../components/MobileBottomNav';
import { BarChart3, BookOpen, CheckSquare, ClipboardList, Headphones, Lock, ArrowLeft, ArrowRight, Play, Clock, Info, PenLine, Target, Star, Timer, Monitor, History, User, Settings, LogOut, Award, Menu, Video, SlidersHorizontal, X } from 'lucide-react';

interface MockTest {
  id: string;
  title: string;
  description: string;
  duration: number;
  is_locked: boolean;
  is_demo: boolean;
  sections?: Array<{
    id: string;
    type: 'reading' | 'listening' | 'writing';
    title: string;
    duration?: number;
    order_no?: number;
    question_count: number;
    group_count: number;
    question_types?: string[];
    question_groups?: Array<{
      id: string;
      title: string;
      instruction?: string;
      order_no?: number;
      question_count: number;
      question_types?: string[];
      primary_question_type?: string;
      questions?: Array<{
        question_text?: string;
        question_type?: string;
        extra_data_json?: Record<string, any>;
      }>;
    }>;
  }>;
}

const READING_QUESTION_TYPES = [
  { key: 'all', label: 'All Question Types' },
  { key: 'matching_headings', label: 'Matching Headings', aliases: ['MATCHING_HEADINGS'] },
  { key: 'matching_information', label: 'Matching Information', aliases: ['MATCHING_INFORMATION'] },
  { key: 'matching_features', label: 'Matching Features', aliases: ['MATCHING_FEATURES', 'MATCHING'] },
  { key: 'multiple_choice', label: 'Multiple Choice', aliases: ['SINGLE_MCQ', 'MULTI_SELECT', 'MULTIPLE_CHOICE'] },
  { key: 'sentence_completion', label: 'Sentence Completion', aliases: ['SENTENCE_COMPLETION'] },
  { key: 'summary_completion', label: 'Summary Completion', aliases: ['SUMMARY_COMPLETION', 'SUMMARY_COMPLETION_OPTIONS'] },
  { key: 'note_completion', label: 'Note Completion', aliases: ['NOTE_COMPLETION', 'FILL_IN_THE_BLANK', 'INPUT_TEXT'] },
  { key: 'table_completion', label: 'Table Completion', aliases: ['TABLE_COMPLETION'] },
  { key: 'flowchart_completion', label: 'Flowchart Completion', aliases: ['FLOWCHART_COMPLETION', 'FLOW_CHART_COMPLETION'] },
  { key: 'diagram_labelling', label: 'Diagram Labelling', aliases: ['DIAGRAM_LABELLING', 'DIAGRAM_LABELING'] },
  { key: 'true_false_not_given', label: 'True / False / Not Given', aliases: ['TRUE_FALSE_NOT_GIVEN'] },
  { key: 'yes_no_not_given', label: 'Yes / No / Not Given', aliases: ['YES_NO_NOT_GIVEN'] },
  { key: 'short_answer', label: 'Short Answer Questions', aliases: ['SHORT_ANSWER', 'SHORT_ANSWER_QUESTIONS'] }
] as const;

type ReadingQuestionTypeKey = typeof READING_QUESTION_TYPES[number]['key'];
type ReadingCategoryKey = 'complete' | 'passage-1' | 'passage-2' | 'passage-3';

const READING_CATEGORY_META: Record<ReadingCategoryKey, { label: string; shortLabel: string }> = {
  complete: { label: 'Complete Reading Test', shortLabel: 'Complete Test' },
  'passage-1': { label: 'Passage 1', shortLabel: 'Passage 1' },
  'passage-2': { label: 'Passage 2', shortLabel: 'Passage 2' },
  'passage-3': { label: 'Passage 3', shortLabel: 'Passage 3' },
};

const normalizeReadingType = (value?: string) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/&/g, 'AND')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const getReadingTypeMeta = (values: string[] = [], fallbackText = '') => {
  const normalizedValues = new Set(values.map(normalizeReadingType).filter(Boolean));
  const normalizedText = normalizeReadingType(fallbackText);

  return READING_QUESTION_TYPES.find(type => {
    if (type.key === 'all') return false;
    return type.aliases?.some(alias => normalizedValues.has(alias) || normalizedText.includes(alias));
  }) || READING_QUESTION_TYPES[0];
};

const getReadingTypeLabels = (values: string[] = [], fallbackText = '') => {
  const normalizedValues = new Set(values.map(normalizeReadingType).filter(Boolean));
  const normalizedText = normalizeReadingType(fallbackText);
  const labels = READING_QUESTION_TYPES
    .filter(type => type.key !== 'all')
    .filter(type => type.aliases?.some(alias => normalizedValues.has(alias) || normalizedText.includes(alias)))
    .map(type => type.label);

  return [...new Set(labels)];
};

export default function MockTestsPage() {
  const { profile } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mock' | 'practice'>(searchParams.get('mode') === 'practice' ? 'practice' : 'mock');
  const [practiceType, setPracticeType] = useState<'reading' | 'listening' | 'writing' | null>(null);
  const [writingPracticeType, setWritingPracticeType] = useState<'task1' | 'task2' | 'combo' | null>(null);
  const [readingCategory, setReadingCategory] = useState<ReadingCategoryKey>('passage-1');
  const [readingQuestionType, setReadingQuestionType] = useState<ReadingQuestionTypeKey>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const navigate = useNavigate();

  const [completedTestIds, setCompletedTestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchTestsAndAttempts = async () => {
      try {
        setLoading(true);
        const [testsRes, attemptsRes] = await Promise.all([
          api.get('/tests'),
          api.get('/attempts/history').catch(() => ({ data: [] }))
        ]);
        
        setTests(testsRes.data);
        const attemptIds = new Set(
          (attemptsRes.data || [])
            .map((a: any) => a.mock_test_id)
            .filter(Boolean)
        );
        setCompletedTestIds(attemptIds as Set<string>);
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setLoading(false);
      }
    };
    fetchTestsAndAttempts();
  }, []);

  useEffect(() => {
    const nextTab = searchParams.get('mode') === 'practice' ? 'practice' : 'mock';
    setActiveTab(nextTab);
    if (nextTab === 'mock') {
      setPracticeType(null);
      setWritingPracticeType(null);
    }
  }, [searchParams]);

  const handleStartTest = async (testId: string) => {
    try {
      setStartingTestId(testId);
      const { data } = await api.post('/attempts/start', { mock_test_id: testId });
      
      // Navigate to the beautiful full-screen computer-based mock exam interface
      navigate(`/attempts/${data.attempt.id}/exam`);
    } catch (err: any) {
      console.error('Failed to start test attempt:', err);
      alert(err.response?.data?.error || err.message || 'Failed to start exam. Check premium access.');
      setStartingTestId(null);
    }
  };

  const getSectionTypes = (test: MockTest) => {
    const types = new Set((test.sections || []).map(section => section.type));
    return ['listening', 'reading', 'writing'].filter(type => types.has(type as any));
  };

  const getQuestionTotal = (test: MockTest) =>
    (test.sections || []).reduce((total, section) => total + (section.question_count || 0), 0);

  const getSectionSummary = (test: MockTest) => {
    const sectionCount = test.sections?.length || 0;
    const questionTotal = getQuestionTotal(test);
    if (!sectionCount) return 'Content setup pending';
    return `${sectionCount} sections • ${questionTotal} tasks/Qs`;
  };

  const sectionBadgeClass = (type: string) => {
    if (type === 'listening') return 'bg-emerald-50 text-emerald-600';
    if (type === 'writing') return 'bg-rose-50 text-rose-600';
    return 'bg-[#EFF4FB] text-[#1E3A6E]';
  };

  const sectionIcon = (type: string) => {
    if (type === 'listening') return <Headphones className="h-3 w-3" />;
    if (type === 'writing') return <PenLine className="h-3 w-3" />;
    return <BookOpen className="h-3 w-3" />;
  };

  const mockTests = tests.filter(test => (test.sections?.length || 0) > 1);
  const practiceTests = tests.filter(test => (test.sections?.length || 0) <= 1);
  const getReadingPassageFromLabel = (labelText: string): 1 | 2 | 3 | null => {
    const label = labelText.toLowerCase();
    const match = label.match(/passage\s*([123])/i);
    if (match) return Number(match[1]) as 1 | 2 | 3;

    const questionRangeMatch = label.match(/questions?\s*(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?/i);
    if (questionRangeMatch) {
      const startNumber = Number(questionRangeMatch[1]);
      if (startNumber >= 27) return 3;
      if (startNumber >= 14) return 2;
      return 1;
    }

    return null;
  };

  const getReadingPassageNumber = (test: MockTest): 1 | 2 | 3 | null => {
    const section = test.sections?.find(item => item.type === 'reading');
    return getReadingPassageFromLabel(`${test.title || ''} ${test.description || ''} ${section?.title || ''}`);
  };

  const getReadingCategory = (test: MockTest): ReadingCategoryKey => {
    const passageNumber = getReadingPassageNumber(test);
    if (passageNumber) return `passage-${passageNumber}` as ReadingCategoryKey;

    const section = test.sections?.find(item => item.type === 'reading');
    const label = `${test.title || ''} ${test.description || ''} ${section?.title || ''}`.toLowerCase();
    const duration = Number(section?.duration || test.duration || 0);

    if (/complete|full|reading\s*test|academic\s*reading/.test(label) || duration >= 50) {
      return 'complete';
    }

    return 'passage-1';
  };

  const getReadingDifficulty = (test: MockTest) => {
    const label = `${test.title || ''} ${test.description || ''}`.toLowerCase();
    if (label.includes('hard') || label.includes('difficult')) return 'Hard';
    if (label.includes('easy') || label.includes('beginner')) return 'Easy';
    if (label.includes('medium') || label.includes('intermediate')) return 'Medium';
    return 'Standard';
  };

  const createReadingCard = (
    test: MockTest,
    section: NonNullable<MockTest['sections']>[number] | undefined,
    category: ReadingCategoryKey,
    passage: 1 | 2 | 3 | null,
    title: string,
    questionTypeKey: ReadingQuestionTypeKey,
    questionTypeLabel: string,
    questionTypeKeys: ReadingQuestionTypeKey[],
    questionTypeLabels: string[],
    questionCount: number,
    duration?: number,
    idSuffix = 'section'
  ) => ({
    id: `${test.id}-${idSuffix}`,
    test,
    category,
    passage,
    title,
    questionTypeKey,
    questionTypeLabel,
    questionTypeKeys,
    questionTypeLabels,
    questionCount,
    duration: duration || section?.duration || test.duration || 20,
    difficulty: getReadingDifficulty(test)
  });

  const readingPracticeCards = practiceTests
    .filter(test => (test.sections?.[0]?.type || 'reading') === 'reading')
    .flatMap(test => {
      const section = test.sections?.[0];
      const baseCategory = getReadingCategory(test);
      const testPassage = getReadingPassageNumber(test);
      const groups = section?.question_groups || [];
      const sectionTypeMeta = getReadingTypeMeta(section?.question_types || [], `${test.title} ${section?.title || ''}`);
      const sectionTypeLabels = getReadingTypeLabels(section?.question_types || [], `${test.title} ${section?.title || ''}`);
      const wholeTestTypeKey = groups.length > 0 ? 'all' : sectionTypeMeta.key;
      const wholeTestCard = createReadingCard(
        test,
        section,
        baseCategory,
        testPassage,
        test.title,
        wholeTestTypeKey,
        sectionTypeLabels.length > 1 ? sectionTypeLabels.join(', ') : wholeTestTypeKey === 'all' ? 'Mixed Question Types' : sectionTypeMeta.label,
        sectionTypeLabels.length > 0 ? sectionTypeLabels
          .map(label => READING_QUESTION_TYPES.find(type => type.label === label)?.key)
          .filter(Boolean) as ReadingQuestionTypeKey[] : [wholeTestTypeKey],
        sectionTypeLabels.length > 0 ? sectionTypeLabels : [wholeTestTypeKey === 'all' ? 'Mixed Question Types' : sectionTypeMeta.label],
        section?.question_count || 0,
        section?.duration || test.duration || (baseCategory === 'complete' ? 60 : 20)
      );

      if (groups.length === 0) {
        return [wholeTestCard];
      }

      const groupCards = groups.map((group, index) => {
        const typeMeta = getReadingTypeMeta(group.question_types || [], `${group.title || ''} ${group.instruction || ''}`);
        const typeLabels = getReadingTypeLabels(group.question_types || [], `${group.title || ''} ${group.instruction || ''}`);
        const explicitPassage = getReadingPassageFromLabel(`${group.title || ''} ${group.instruction || ''}`);
        const fallbackPassage = baseCategory === 'complete'
          ? Math.min(3, Math.max(1, Math.ceil(((index + 1) / Math.max(groups.length, 1)) * 3))) as 1 | 2 | 3
          : testPassage;
        const passage = explicitPassage || fallbackPassage;
        const category = passage ? `passage-${passage}` as ReadingCategoryKey : baseCategory;

        return createReadingCard(
          test,
          section,
          category,
          passage,
          group.title || test.title,
          typeMeta.key,
          typeLabels.length > 1 ? typeLabels.join(', ') : typeMeta.key === 'all' ? 'Mixed Question Types' : typeMeta.label,
          typeLabels.length > 0 ? typeLabels
            .map(label => READING_QUESTION_TYPES.find(type => type.label === label)?.key)
            .filter(Boolean) as ReadingQuestionTypeKey[] : [typeMeta.key],
          typeLabels.length > 0 ? typeLabels : [typeMeta.key === 'all' ? 'Mixed Question Types' : typeMeta.label],
          group.question_count || 0,
          baseCategory === 'complete' ? 20 : section?.duration || test.duration || 20,
          group.id
        );
      });

      return baseCategory === 'complete' ? [wholeTestCard, ...groupCards] : groupCards;
    });

  const readingCategories = useMemo(
    () => (['complete', 'passage-1', 'passage-2', 'passage-3'] as ReadingCategoryKey[])
      .filter(category => readingPracticeCards.some(card => card.category === category)),
    [readingPracticeCards]
  );
  const activeReadingCategory = readingCategories.includes(readingCategory)
    ? readingCategory
    : readingCategories[0] || 'passage-1';
  const activeReadingCategoryMeta = READING_CATEGORY_META[activeReadingCategory];
  const activeReadingQuestionTypeMeta = READING_QUESTION_TYPES.find(type => type.key === readingQuestionType) || READING_QUESTION_TYPES[0];
  const isCompleteReadingCategory = activeReadingCategory === 'complete';

  useEffect(() => {
    if (practiceType !== 'reading') return;
    if (readingCategories.length > 0 && !readingCategories.includes(readingCategory)) {
      setReadingCategory(readingCategories[0]);
      setReadingQuestionType('all');
    }
  }, [practiceType, readingCategories, readingCategory]);

  const filteredReadingCards = readingPracticeCards.filter(card => {
    if (isCompleteReadingCategory || readingQuestionType === 'all') {
      return card.category === activeReadingCategory;
    }

    return card.category === activeReadingCategory && card.questionTypeKeys.includes(readingQuestionType);
  });

  const getReadingTypeCount = (typeKey: ReadingQuestionTypeKey) =>
    readingPracticeCards.filter(card => {
      if (isCompleteReadingCategory || typeKey === 'all') {
        return card.category === activeReadingCategory;
      }

      return card.category === activeReadingCategory && card.questionTypeKeys.includes(typeKey);
    }).length;

  const readingFilterPanel = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-[#294b77] px-5 py-4">
        <div>
          <h3 className="text-[15px] font-black text-white">Question Types</h3>
          <p className="mt-1 text-[12px] font-semibold text-white/70">
            {isCompleteReadingCategory || readingQuestionType === 'all'
              ? `${activeReadingCategoryMeta.label} practice sets`
              : `${activeReadingCategoryMeta.label} filtered by type`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFilterOpen(false)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white lg:hidden"
          aria-label="Close filters"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-3 lg:max-h-[calc(100vh-260px)]">
        {READING_QUESTION_TYPES.map(type => {
          const count = getReadingTypeCount(type.key);
          const isDisabled = isCompleteReadingCategory && type.key !== 'all';
          const isActive = isCompleteReadingCategory ? type.key === 'all' : readingQuestionType === type.key;
          return (
            <button
              key={type.key}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (isDisabled) return;
                setReadingQuestionType(type.key);
                setIsFilterOpen(false);
              }}
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                isActive
                  ? 'bg-[#EFF4FB] text-[#294b77] ring-1 ring-[#294b77]/20'
                  : isDisabled
                  ? 'cursor-not-allowed text-slate-300'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#294b77]'
              }`}
            >
              <span className="break-words text-[13px] font-black leading-snug">{type.label}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                isActive ? 'bg-white text-[#294b77]' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const getWritingPracticeKind = (test: MockTest) => {
    const section = test.sections?.[0];
    const label = `${test.title || ''} ${section?.title || ''}`.toLowerCase();
    if (/task\s*1/.test(label)) return 'task1';
    if (/task\s*2/.test(label)) return 'task2';
    return 'combo';
  };
  const visibleTests = activeTab === 'mock'
    ? mockTests
    : practiceType === 'writing' && writingPracticeType
    ? practiceTests.filter(test => (test.sections?.[0]?.type || 'reading') === 'writing' && getWritingPracticeKind(test) === writingPracticeType)
    : practiceType && practiceType !== 'writing'
    ? practiceTests.filter(test => (test.sections?.[0]?.type || 'reading') === practiceType)
    : [];

  const getPracticeTestsByType = (type: 'reading' | 'listening' | 'writing') =>
    practiceTests.filter(test => (test.sections?.[0]?.type || 'reading') === type);
  const getWritingPracticeTestsByKind = (kind: 'task1' | 'task2' | 'combo') =>
    getPracticeTestsByType('writing').filter(test => getWritingPracticeKind(test) === kind);

  const practiceCards = [
    {
      type: 'reading' as const,
      title: 'Reading',
      description: 'Practice your reading skills with different question types.',
      icon: <BookOpen className="h-10 w-10" />,
      iconClass: 'bg-[#EFF4FB] text-[#1E3A6E]',
      duration: '~ 60 mins'
    },
    {
      type: 'listening' as const,
      title: 'Listening',
      description: 'Improve your listening skills with real exam-like tests.',
      icon: <Headphones className="h-10 w-10" />,
      iconClass: 'bg-emerald-50 text-emerald-700',
      duration: '~ 30 mins'
    },
    {
      type: 'writing' as const,
      title: 'Writing',
      description: 'Practice your writing tasks and review your responses.',
      icon: <PenLine className="h-10 w-10" />,
      iconClass: 'bg-orange-50 text-orange-500',
      duration: '~ 60 mins'
    }
  ];
  const practiceCardTheme = {
    reading: {
      image: '/images/practice/reading.png',
      cardClass: 'border-[#DCE8FA] bg-gradient-to-br from-white via-white to-[#F7FAFF]',
      iconClass: 'border-[#DCE8FA] bg-white text-[#2558D8]',
      titleClass: 'text-[#061A36]',
      accentClass: 'bg-[#2558D8]',
      statsClass: 'border-[#DCE8FA] bg-white/90 text-[#1E3A6E]',
      buttonClass: 'from-[#2259D8] to-[#193D93] shadow-[#2259D8]/25',
      imageClass: 'h-[132px] w-[148px]',
      glowClass: 'bg-blue-100'
    },
    listening: {
      image: '/images/practice/listening.png',
      cardClass: 'border-[#D9ECE7] bg-gradient-to-br from-white via-white to-[#F5FFFB]',
      iconClass: 'border-[#D9ECE7] bg-white text-[#07805F]',
      titleClass: 'text-[#064338]',
      accentClass: 'bg-[#07805F]',
      statsClass: 'border-[#D9ECE7] bg-white/90 text-[#07805F]',
      buttonClass: 'from-[#15996F] to-[#08775B] shadow-[#15996F]/25',
      imageClass: 'h-[132px] w-[144px]',
      glowClass: 'bg-emerald-100'
    },
    writing: {
      image: '/images/practice/writing.png',
      cardClass: 'border-[#F6DCCF] bg-gradient-to-br from-white via-white to-[#FFF8F3]',
      iconClass: 'border-[#F6DCCF] bg-white text-[#F45B1D]',
      titleClass: 'text-[#8B170C]',
      accentClass: 'bg-[#F45B1D]',
      statsClass: 'border-[#F6DCCF] bg-white/90 text-[#F45B1D]',
      buttonClass: 'from-[#FF6A24] to-[#F04416] shadow-[#F45B1D]/25',
      imageClass: 'h-[128px] w-[158px]',
      glowClass: 'bg-orange-100'
    }
  };
  const writingPracticeCards = [
    {
      type: 'task1' as const,
      title: 'Writing Task 1',
      description: 'Practice Task 1 only with graph, chart, table, process, or map prompts.',
      icon: <PenLine className="h-9 w-9" />,
      duration: '30 mins'
    },
    {
      type: 'task2' as const,
      title: 'Writing Task 2',
      description: 'Practice essay-only questions for opinion, discussion, advantages, and problem topics.',
      icon: <PenLine className="h-9 w-9" />,
      duration: '50 mins'
    },
    {
      type: 'combo' as const,
      title: 'Task 1 + Task 2',
      description: 'Attempt the full writing practice set with both writing tasks together.',
      icon: <ClipboardList className="h-9 w-9" />,
      duration: '60 mins'
    }
  ];
  const writingPracticeTheme = {
    task1: {
      image: '/images/Writing%20Practice/writing%20task%201-cutout.png',
      eyebrow: 'Academic Reports',
      titleTop: 'Writing',
      titleBottom: 'Task 1',
      description: 'Practice graphs, tables, diagrams, and process writing.',
      border: 'border-[#CFE0FA]',
      bg: 'bg-[radial-gradient(circle_at_82%_22%,rgba(191,219,254,0.66),transparent_34%),linear-gradient(135deg,#FFFFFF_0%,#F8FBFF_50%,#EEF6FF_100%)]',
      icon: <BarChart3 className="h-7 w-7" />,
      iconClass: 'border-[#D7E5FF] bg-[#F5F8FF] text-[#2458D5]',
      titleClass: 'text-[#2558D8]',
      badgeClass: 'bg-[#E8F0FF] text-[#2558D8]',
      buttonClass: 'from-[#235DDB] to-[#183D98] shadow-[#2259D8]/25',
      statClass: 'text-[#1E3A6E]',
      imageClass: 'h-[185px] w-[215px] right-4 top-[48px]'
    },
    task2: {
      image: '/images/Writing%20Practice/writing%20task%202-cutout.png',
      eyebrow: 'Opinion Essays',
      titleTop: 'Writing',
      titleBottom: 'Task 2',
      description: 'Practice essay writing on opinion, discussion, advantages, and more.',
      border: 'border-[#CBECE5]',
      bg: 'bg-[radial-gradient(circle_at_82%_22%,rgba(167,243,208,0.50),transparent_34%),linear-gradient(135deg,#FFFFFF_0%,#F7FFFC_48%,#ECFDF5_100%)]',
      icon: <PenLine className="h-7 w-7" />,
      iconClass: 'border-[#CBECE5] bg-[#F5FFFB] text-[#0B8B6C]',
      titleClass: 'text-[#0B8B6C]',
      badgeClass: 'bg-[#DDF7EF] text-[#0B8B6C]',
      buttonClass: 'from-[#18A77C] to-[#078263] shadow-[#15996F]/25',
      statClass: 'text-[#08775B]',
      imageClass: 'h-[204px] w-[220px] right-7 top-[46px]'
    },
    combo: {
      image: '/images/Writing%20Practice/full%20test-cutout.png',
      eyebrow: 'Exam Simulation',
      titleTop: 'Full Writing',
      titleBottom: 'Test',
      description: 'Attempt both Writing Task 1 and Task 2 under exam conditions.',
      border: 'border-[#F7D8CD]',
      bg: 'bg-[radial-gradient(circle_at_82%_22%,rgba(254,202,202,0.55),transparent_34%),linear-gradient(135deg,#FFFFFF_0%,#FFF8F4_50%,#FFF1E9_100%)]',
      icon: <ClipboardList className="h-7 w-7" />,
      iconClass: 'border-[#F7D8CD] bg-[#FFF8F3] text-[#F45B1D]',
      titleClass: 'text-[#EF463D]',
      badgeClass: 'bg-[#FFE8E1] text-[#F45B1D]',
      buttonClass: 'from-[#FF6841] to-[#EF353D] shadow-[#F45B1D]/25',
      statClass: 'text-[#F45B1D]',
      imageClass: 'h-[192px] w-[202px] right-4 top-[46px]'
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] pb-24 font-sans lg:pb-0" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <StudentSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 shadow-sm sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[#05162E] hover:bg-slate-50 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-6 w-6" />
          </button>
          {activeTab === 'practice' && practiceType === 'writing' && !writingPracticeType ? (
            <button
              type="button"
              onClick={() => {
                setPracticeType(null);
                setWritingPracticeType(null);
              }}
              className="hidden sm:flex items-center gap-2 text-slate-500 hover:text-[#1E3A6E] transition-colors text-[14px] font-bold"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Practice
            </button>
          ) : (
            <Link 
              to="/dashboard" 
              className="hidden sm:flex items-center gap-2 text-slate-500 hover:text-[#1E3A6E] transition-colors text-[14px] font-bold"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          )}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <span className="hidden md:flex items-center gap-2 text-[12px] text-slate-500 font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Jawaaf Testing Platform
            </span>
            <div className="h-10 w-10 rounded-full bg-[#EFF4FB] text-[#1E3A6E] flex items-center justify-center font-black">
              {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        <div className={`w-full p-4 md:p-5 xl:p-6 ${activeTab === 'practice' && (!practiceType || (practiceType === 'writing' && !writingPracticeType)) ? 'overflow-visible' : 'overflow-visible'}`}>
        
        {/* Header Section */}
        {!(activeTab === 'practice' && (!practiceType || (practiceType === 'writing' && (!writingPracticeType || writingPracticeType === 'task1' || writingPracticeType === 'task2')))) && (
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] md:text-[34px] font-black text-[#05162E] tracking-tight leading-tight">
                Hi, {profile?.full_name?.split(' ')[0] || 'Student'}!
              </h1>
              <p className="text-[13px] text-slate-500 mt-1">
                Welcome back. Ready to improve your IELTS score today?
              </p>
            </div>
            
            {!profile?.has_full_access && (
              <div className="hidden xl:flex p-3 bg-amber-50 border border-amber-100 rounded-xl items-start gap-3 max-w-md shadow-sm">
                <Lock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-amber-800 leading-relaxed font-medium">
                  Premium tests are locked. <Link to="/access-request" className="font-bold underline hover:text-amber-900">Request full premium access</Link> to unlock our entire library.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 p-10 sm:p-20">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1E3A6E] rounded-full animate-spin"></div>
            <p className="text-slate-400 text-[14px] font-bold">Loading test library...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm sm:p-16">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">No Mock Tests Available</h3>
            <p className="text-slate-500 mt-2 text-[15px]">There are currently no mock tests available in the system. Please check back later or contact your administrator.</p>
          </div>
        ) : activeTab === 'practice' && practiceType === 'writing' && writingPracticeType === 'task1' ? (
          <WritingTask1Practice 
            tests={visibleTests} 
            onBack={() => setWritingPracticeType(null)} 
            onStartTest={handleStartTest}
          />
        ) : activeTab === 'practice' && practiceType === 'writing' && writingPracticeType === 'task2' ? (
          <WritingTask2Practice 
            tests={visibleTests} 
            onBack={() => setWritingPracticeType(null)} 
            onStartTest={handleStartTest}
          />
        ) : activeTab === 'practice' && !practiceType ? (
          <div className="relative flex min-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl bg-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_69%_14%,rgba(91,141,255,0.11),transparent_21%),radial-gradient(circle_at_5%_34%,rgba(112,161,255,0.06),transparent_18%)]"></div>
            <div className="relative grid gap-6 px-4 py-5 sm:px-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:px-12 xl:py-7">
              <section>
                <div className="mb-6">
                  <h2 className="text-[32px] md:text-[36px] font-black text-[#05162E] tracking-tight leading-tight">Practice Test</h2>
                  <p className="text-[16px] text-slate-500 mt-3 font-medium">
                    Choose a section to practice individually. Improve your skills <span className="text-[#3C5BFF]">step by step.</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                  {practiceCards.map(card => {
                    const count = getPracticeTestsByType(card.type).length;
                    const theme = practiceCardTheme[card.type];
                    return (
                      <button
                        key={card.type}
                        type="button"
                        onClick={() => {
                          setPracticeType(card.type);
                          setWritingPracticeType(null);
                            setReadingQuestionType('all');
                        }}
                        className={`group relative flex min-h-[320px] w-full flex-col overflow-hidden rounded-[22px] border p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:min-h-[390px] ${theme.cardClass}`}
                      >
                        <div className="relative z-10 flex items-start justify-between gap-4">
                          <div className={`h-[62px] w-[62px] rounded-full border shadow-sm flex items-center justify-center ${theme.iconClass}`}>
                            {card.icon}
                          </div>
                          <div className={`absolute right-5 top-8 h-28 w-28 rounded-full ${theme.glowClass} opacity-60 blur-2xl`}></div>
                          <img
                            src={theme.image}
                            alt=""
                            loading="lazy"
                            className={`relative z-10 ${theme.imageClass} object-contain opacity-[0.98] drop-shadow-[0_14px_18px_rgba(15,23,42,0.12)] transition-transform duration-300 group-hover:scale-[1.03]`}
                            style={{
                              mixBlendMode: 'multiply',
                              filter: 'saturate(1.04) contrast(1.02)',
                              WebkitMaskImage: 'radial-gradient(ellipse at center, #000 46%, rgba(0,0,0,0.88) 60%, rgba(0,0,0,0.42) 72%, transparent 86%)',
                              maskImage: 'radial-gradient(ellipse at center, #000 46%, rgba(0,0,0,0.88) 60%, rgba(0,0,0,0.42) 72%, transparent 86%)'
                            }}
                          />
                        </div>

                        <div className="relative z-10 mt-4">
                          <h3 className={`text-[27px] font-black tracking-tight ${theme.titleClass}`}>{card.title}</h3>
                          <div className={`mt-2.5 h-1 w-10 rounded-full ${theme.accentClass}`}></div>
                          <p className="mt-4 min-h-[48px] max-w-[310px] text-[14px] font-medium leading-6 text-slate-600">{card.description}</p>
                        </div>

                        <div className={`relative z-10 mt-auto grid grid-cols-2 rounded-[16px] border px-3 py-3 ${theme.statsClass}`}>
                          <div className="flex items-center gap-2.5">
                            <ClipboardList className="h-5 w-5 shrink-0" />
                            <div>
                              <p className="text-[13px] font-black text-[#05162E]">{count} {count === 1 ? 'Test' : 'Tests'}</p>
                              <p className="text-[11px] font-bold text-slate-500">Available</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
                            <Clock className="h-5 w-5 shrink-0" />
                            <div>
                              <p className="text-[13px] font-black text-[#05162E]">{card.duration}</p>
                              <p className="text-[11px] font-bold text-slate-500">Estimated Time</p>
                            </div>
                          </div>
                        </div>

                        <span className={`relative z-10 mt-5 flex h-12 w-full items-center justify-center gap-4 rounded-[13px] bg-gradient-to-r text-[15px] font-black text-white shadow-lg transition-transform group-hover:translate-x-0.5 ${theme.buttonClass}`}>
                          Start Practice <ArrowRight className="h-5 w-5" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <aside className="h-fit rounded-[24px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
                <h3 className="mb-7 break-words text-[20px] font-black text-[#05162E]">
                  How <span className="text-[#6F4BFF]">Practice Test</span> Works?
                </h3>
                <div className="grid gap-6">
                  {[
                    [<ClipboardList className="h-5 w-5" />, 'Choose a section', 'Select Reading, Listening or Writing.'],
                    [<CheckSquare className="h-5 w-5" />, 'Practice & Improve', 'Attempt questions and check your answers.'],
                    [<BarChart3 className="h-5 w-5" />, 'Track Progress', 'See your performance and improve your band score.']
                  ].map(([icon, title, desc]) => (
                    <div key={String(title)} className="flex items-start gap-4">
                      <div className="h-[58px] w-[58px] rounded-full bg-[#F0EDFF] text-[#3730A3] flex items-center justify-center shrink-0 shadow-sm">
                        {icon}
                      </div>
                      <div>
                        <h4 className="font-black text-[#05162E] text-[15px]">{title}</h4>
                        <p className="text-[13px] text-slate-500 font-medium leading-6 mt-1">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-7 rounded-[20px] bg-gradient-to-br from-[#F7F6FF] to-[#EEF2FF] p-5 text-center">
                  <div className="mb-2 flex justify-center text-[#5D5FEF]">
                    <Star className="h-5 w-5" />
                  </div>
                  <p className="text-[15px] font-black text-[#05162E] leading-6">Practice is the key to success in IELTS!</p>
                  <p className="text-[13px] font-black text-[#7A82B7] mt-3">- Keep Going</p>
                </div>
              </aside>
            </div>

            <div className="relative mx-4 mb-6 rounded-[22px] border border-slate-200 bg-white px-4 py-5 shadow-sm sm:mx-6 sm:px-6 md:mx-8 xl:mx-12">
              <h3 className="text-[18px] font-black text-[#05162E] mb-3">Tips for Practice</h3>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [<Timer className="h-6 w-6" />, 'Manage Your Time', 'Practice with timer to improve your speed.', 'bg-[#EFF4FB] text-[#1E3A6E]'],
                  [<Target className="h-6 w-6" />, 'Focus on Weak Areas', 'Identify your weak areas and work on them.', 'bg-emerald-50 text-emerald-600'],
                  [<BarChart3 className="h-6 w-6" />, 'Analyze Results', 'Review your performance and learn from mistakes.', 'bg-orange-50 text-orange-500'],
                  [<Star className="h-6 w-6" />, 'Stay Consistent', 'Practice daily and stay consistent.', 'bg-violet-50 text-violet-600']
                ].map(([icon, title, desc, colorClass], index) => (
                  <div key={String(title)} className={`flex items-start gap-4 px-4 py-2 ${index > 0 ? 'xl:border-l xl:border-slate-200' : ''}`}>
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                      {icon}
                    </div>
                    <div>
                      <h4 className="font-black text-[#05162E] text-[14px]">{title}</h4>
                      <p className="text-[13px] text-slate-500 font-medium leading-5 mt-1">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
	        ) : activeTab === 'practice' && practiceType === 'reading' ? (
          <div className="grid gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setPracticeType(null);
                    setReadingQuestionType('all');
                  }}
                  className="mb-3 inline-flex items-center gap-2 text-[13px] font-black text-slate-500 hover:text-[#294b77]"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to practice sections
                </button>
                <h2 className="text-[28px] font-black text-[#05162E]">Reading Practice</h2>
                <p className="text-[14px] text-slate-500 mt-1">Choose an available reading set, then filter by IELTS reading question type.</p>
              </div>

              {readingCategories.length > 0 && (
                <div className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
                {readingCategories.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setReadingCategory(category);
                      setReadingQuestionType('all');
                    }}
                    className={`min-h-11 shrink-0 rounded-xl px-4 py-3 text-[13px] font-black transition-all sm:px-6 ${
                      activeReadingCategory === category
                        ? 'bg-[#294b77] text-white shadow-sm'
                        : 'text-slate-500 hover:bg-[#EFF4FB] hover:text-[#294b77]'
                    }`}
                  >
                    {READING_CATEGORY_META[category].shortLabel}
                  </button>
                ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-black text-[#294b77] shadow-sm lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters: {activeReadingQuestionTypeMeta.label}
            </button>

            <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">
                {readingFilterPanel}
              </aside>

              <section className="min-w-0">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-[18px] font-black text-[#05162E]">
                      {isCompleteReadingCategory || readingQuestionType === 'all'
                        ? `${activeReadingCategoryMeta.label} Practice Sets`
                        : `${activeReadingQuestionTypeMeta.label} Practice Sets`}
                    </h3>
                    <p className="text-[13px] text-slate-500 font-semibold">
                      {filteredReadingCards.length} set{filteredReadingCards.length === 1 ? '' : 's'} available
                      {!isCompleteReadingCategory && readingQuestionType !== 'all' ? ` in ${activeReadingCategoryMeta.label}` : ''}
                    </p>
                  </div>
                </div>

                {filteredReadingCards.length === 0 ? (
                  <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-14">
                    <div className="w-16 h-16 bg-[#EFF4FB] rounded-full flex items-center justify-center mb-5">
                      <BookOpen className="h-8 w-8 text-[#294b77]" />
                    </div>
                    <h3 className="text-[19px] font-black text-[#05162E]">No practice set found</h3>
                    <p className="text-slate-500 mt-2 text-[14px] max-w-md">
                      No reading practice is available for {isCompleteReadingCategory || readingQuestionType === 'all' ? activeReadingCategoryMeta.label : activeReadingQuestionTypeMeta.label} yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                    {filteredReadingCards.map(card => (
                      <div
                        key={card.id}
                        className={`w-full overflow-hidden rounded-2xl border bg-white ${card.test.is_locked ? 'border-slate-100 bg-slate-50/60' : 'border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1'} transition-all`}
                      >
                        <div className="h-2 w-full bg-[#294b77]"></div>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF4FB] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#294b77]">
                              <BookOpen className="h-3 w-3" /> {card.category === 'complete' ? 'Complete Reading' : `Passage ${card.passage || 1}`}
                            </span>
                            {card.test.is_locked ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">
                                <Lock className="h-3 w-3" /> Locked
                              </span>
                            ) : card.test.is_demo ? (
                              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-600">
                                Free Demo
                              </span>
                            ) : null}
                            {completedTestIds.has(card.test.id) && (
                              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 ml-auto">
                                Completed ✅
                              </span>
                            )}
                          </div>

                          <h4 className="break-words text-[18px] font-black leading-snug text-[#05162E]">{card.title}</h4>
                          <p className="mt-2 text-[13px] font-bold text-slate-500">{card.test.title}</p>

                          <div className="mt-5 grid grid-cols-2 gap-3 text-[12px] font-black">
                            <div className="col-span-2 rounded-xl bg-[#F8FAFC] p-3">
                              <span className="block text-slate-400 uppercase tracking-wider text-[10px]">Question Type</span>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {card.questionTypeLabels.map((label: string) => (
                                  <span
                                    key={label}
                                    className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-[#05162E] ring-1 ring-slate-200"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-xl bg-[#F8FAFC] p-3">
                              <span className="block text-slate-400 uppercase tracking-wider text-[10px]">Questions</span>
                              <span className="mt-1 block text-[#05162E]">{card.questionCount || 'Setup pending'}</span>
                            </div>
                            <div className="rounded-xl bg-[#F8FAFC] p-3">
                              <span className="block text-slate-400 uppercase tracking-wider text-[10px]">Difficulty</span>
                              <span className="mt-1 block text-[#05162E]">{card.difficulty}</span>
                            </div>
                            <div className="rounded-xl bg-[#F8FAFC] p-3">
                              <span className="block text-slate-400 uppercase tracking-wider text-[10px]">Estimated Time</span>
                              <span className="mt-1 block text-[#05162E]">{card.duration} min</span>
                            </div>
                          </div>

                          {card.test.is_locked ? (
                            <Link
                              to="/access-request"
                              className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-[13px] font-black text-slate-600 hover:bg-slate-200"
                            >
                              Unlock Practice <Lock className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <button
                              disabled={startingTestId === card.test.id}
                              onClick={() => handleStartTest(card.test.id)}
                              className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#294b77] py-3 text-[13px] font-black text-white shadow-sm hover:bg-[#203d63] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {startingTestId === card.test.id ? 'Starting Practice...' : completedTestIds.has(card.test.id) ? <>Retake Practice <Play className="h-3 w-3 fill-current" /></> : <>Start Practice <Play className="h-3 w-3 fill-current" /></>}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : activeTab === 'practice' && practiceType === 'writing' && !writingPracticeType ? (
          <div className="mx-auto flex h-full w-full max-w-[1360px] flex-col gap-5">
            <section className="relative min-h-[260px] overflow-hidden rounded-[24px] bg-transparent lg:aspect-[2856/626] lg:max-h-[250px] lg:min-h-0">
              <img
                src="/images/Writing%20Practice/background.png"
                alt=""
                loading="lazy"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover lg:-top-1 lg:h-[calc(100%+8px)]"
              />

              <div className="relative z-10 grid min-h-[260px] items-center gap-4 px-5 py-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px_230px] lg:gap-3 lg:px-10 lg:py-4">
                <div className="min-w-0 max-w-[520px]">
                  <h1 className="break-words text-[28px] font-black leading-tight tracking-tight text-[#05162E] sm:text-[32px]">
                    Hi, {profile?.full_name?.split(' ')[0] || profile?.first_name || 'Student'}!
                  </h1>
                  <p className="mt-3 text-[16px] font-medium leading-7 text-slate-600 sm:text-[19px]">
                    Ready to write like a <span className="font-black text-[#1F55D6]">Band 8</span> candidate?
                  </p>
                  <div className="mt-2 h-0.5 w-20 rounded-full bg-[#BBD3FF] lg:ml-[205px]"></div>

                  <div className="mt-6 max-w-[465px] rounded-[20px] border border-slate-100 bg-white/92 p-4 shadow-[0_18px_45px_rgba(30,58,110,0.08)]">
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#EEF4FF] text-[#2259D8]">
                        <PenLine className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <span className="text-[14px] font-black text-[#05162E]">Today's Progress</span>
                          <span className="text-[14px] font-black text-[#05162E]">63%</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-200">
                          <div className="h-full w-[63%] rounded-full bg-gradient-to-r from-[#2563EB] to-[#4F8DFF]"></div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] font-semibold text-slate-600 sm:pl-16">Great progress! Keep it up!</p>
                  </div>
                </div>

                <div className="relative hidden h-[212px] items-end justify-center lg:-ml-44 lg:flex">
                  <div className="absolute bottom-5 h-16 w-72 rounded-full bg-blue-100/70 blur-3xl"></div>
                  <img
                    src="/images/Writing%20Practice/header.png"
                    alt=""
                    loading="lazy"
                    className="relative z-10 h-[252px] w-[294px] object-contain drop-shadow-[0_18px_24px_rgba(15,23,42,0.13)]"
                    style={{
                      mixBlendMode: 'multiply',
                      filter: 'saturate(1.03) contrast(1.01)',
                      WebkitMaskImage: 'radial-gradient(ellipse at center, #000 58%, rgba(0,0,0,0.86) 72%, transparent 91%)',
                      maskImage: 'radial-gradient(ellipse at center, #000 58%, rgba(0,0,0,0.86) 72%, transparent 91%)'
                    }}
                  />
                </div>

                <div className="relative hidden h-[218px] w-[246px] lg:-ml-35 lg:block">
                  <img
                    src="/images/Writing%20Practice/notes-cutout.png"
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full rotate-[3deg] object-contain drop-shadow-[0_18px_28px_rgba(15,23,42,0.14)]"
                  />
                  <div className="relative z-10 h-full rotate-[3deg] px-9 pb-8 pt-11">
                    <div className="ml-12 max-w-[115px]">
                      <p className="whitespace-nowrap text-[13px] font-semibold text-slate-600">Today's Goal</p>
                      <p className="mt-0.5 whitespace-nowrap text-[20px] font-black leading-tight text-[#05162E]">Band 7.0+</p>
                    </div>
                    <div className="mx-2 mt-4 h-px bg-[#E8CB83]"></div>
                    <p className="mt-4 whitespace-nowrap text-[13px] font-medium text-slate-600">You've completed</p>
                    <p className="mt-1 whitespace-nowrap text-[17px] font-black text-[#1F55D6]">22 / 40 Tasks</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <span className="text-[13px] font-black uppercase tracking-wider text-[#1F55D6]">Writing Studio</span>
              <h2 className="mt-1 text-[30px] font-black leading-tight tracking-tight text-[#05162E]">Choose today's lesson</h2>
              <p className="mt-2 text-[15px] font-medium text-slate-600">Pick the practice that matches your goal.</p>
              <div className="mt-3 h-1 w-12 rounded-full bg-[#1F55D6]"></div>
            </section>

            <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-6 lg:grid-cols-3">
              {writingPracticeCards.map(card => {
                const count = getWritingPracticeTestsByKind(card.type).length;
                const theme = writingPracticeTheme[card.type];
                return (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => setWritingPracticeType(card.type)}
                    className={`group relative min-h-[300px] w-full overflow-hidden rounded-[22px] border p-5 text-left shadow-sm transition-all duration-300 active:scale-[0.98] hover:-translate-y-1 hover:shadow-xl ${theme.border} ${theme.bg}`}
                  >
                    <div className={`relative z-10 grid h-12 w-12 place-items-center rounded-full border shadow-sm ${theme.iconClass}`}>
                      {theme.icon}
                    </div>

                    <div className="relative z-10 mt-4 max-w-[235px]">
                      <h3 className="text-[22px] font-black leading-6 tracking-tight text-[#05162E]">{theme.titleTop}</h3>
                      <h3 className={`text-[26px] font-black leading-7 tracking-tight ${theme.titleClass}`}>{theme.titleBottom}</h3>
                      <span className={`mt-3 inline-flex rounded-lg px-3 py-1 text-[11px] font-black ${theme.badgeClass}`}>
                        {theme.eyebrow}
                      </span>
                      <p className="mt-4 text-[13px] font-medium leading-6 text-slate-600">{theme.description}</p>
                    </div>

                    <img
                      src={theme.image}
                      alt=""
                      loading="lazy"
                      className={`absolute z-0 hidden object-contain opacity-[0.98] drop-shadow-[0_16px_22px_rgba(15,23,42,0.14)] transition-transform duration-300 group-hover:scale-[1.03] sm:block ${theme.imageClass}`}
                      style={{
                        mixBlendMode: 'multiply',
                        filter: 'saturate(1.04) contrast(1.02)'
                      }}
                    />

                    <div className={`relative z-10 mt-4 flex items-center gap-6 text-[12px] font-black ${theme.statClass}`}>
                      <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> {count} {count === 1 ? 'Test' : 'Tests'}</span>
                      <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> {card.duration}</span>
                    </div>

                    <span className={`relative z-10 mt-5 flex h-12 w-full items-center justify-center gap-4 rounded-[13px] bg-gradient-to-r text-[16px] font-black text-white shadow-lg transition-transform group-hover:translate-x-0.5 ${theme.buttonClass}`}>
                      {card.type === 'combo' ? 'Start Task 1 + Task 2' : card.type === 'task1' ? 'Start Task 1' : 'Start Task 2'}
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative overflow-hidden rounded-[20px] border border-[#D4E1F8] bg-white px-6 py-3 shadow-sm">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_45%,rgba(94,234,212,0.12),transparent_18%),radial-gradient(circle_at_33%_24%,rgba(96,165,250,0.12),transparent_16%)]"></div>
              <div className="relative z-10 flex flex-col items-center justify-between gap-5 md:flex-row">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 overflow-hidden rounded-full bg-[#FFF7D9]">
                    <img
                      src="/images/Writing%20Practice/futter-cutout.png"
                      alt=""
                      className="h-full w-full object-cover object-top"
                      style={{ mixBlendMode: 'multiply' }}
                    />
                  </div>
                  <div>
                    <p className="text-[20px] font-black text-[#1F55D6]">Hooty Says</p>
                    <div className="mt-1 h-0.5 w-24 rounded-full bg-[#BBD3FF]"></div>
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-5 text-center md:text-left">
                  <span className="text-[52px] font-black leading-none text-[#BCD7FF]">“</span>
                  <p className="text-[19px] font-medium leading-7 text-[#05162E]">The best essays aren't written fast.<br className="hidden md:block" /> They're rewritten.</p>
                </div>
                <button className="flex h-14 shrink-0 items-center justify-center gap-4 rounded-[16px] border border-slate-200 bg-white px-7 text-[16px] font-black text-[#1F3E88] shadow-md transition-colors hover:bg-slate-50">
                  <BookOpen className="h-5 w-5" /> Hooty's Writing Tips <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
	        ) : visibleTests.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm sm:p-16">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">No {activeTab === 'mock' ? 'Mock' : 'Practice'} Tests Available</h3>
            <p className="text-slate-500 mt-2 text-[15px]">
              {activeTab === 'mock'
                ? 'Create a full test with Listening, Reading, and Writing sections from the admin console.'
                : 'Single-section reading, listening, or writing practice tests will appear here.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {activeTab === 'practice' && practiceType && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <button
                    type="button"
	                    onClick={() => {
	                      if (practiceType === 'writing' && writingPracticeType) {
	                        setWritingPracticeType(null);
	                        return;
	                      }
	                      setPracticeType(null);
	                    }}
                    className="mb-3 inline-flex items-center gap-2 text-[13px] font-black text-slate-500 hover:text-[#1E3A6E]"
                  >
	                    <ArrowLeft className="h-4 w-4" /> {practiceType === 'writing' && writingPracticeType ? 'Back to writing types' : 'Back to practice sections'}
	                  </button>
	                  <h2 className="text-[26px] font-black text-[#05162E] capitalize">
	                    {practiceType === 'writing' && writingPracticeType
	                      ? writingPracticeCards.find(card => card.type === writingPracticeType)?.title
	                      : practiceType} Practice Tests
	                  </h2>
                  <p className="text-[14px] text-slate-500 mt-1">Choose one test to open its questions and start practicing.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {visibleTests.map(test => (
              <div 
                key={test.id} 
                className={`relative flex w-full flex-col overflow-hidden rounded-2xl border bg-white ${test.is_locked ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md'} transition-all duration-300`}
              >
                
                <div className="h-2 w-full rounded-t-2xl bg-[#1E3A6E]"></div>

                <div className="p-6 flex flex-col flex-1">
                  
                  {/* Badges */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {getSectionTypes(test).map(type => (
                        <span key={type} className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider flex items-center gap-1 ${sectionBadgeClass(type)}`}>
                          {sectionIcon(type)} {type}
                        </span>
                      ))}
                    </div>
                    
                    {test.is_locked ? (
                      <span className="px-2.5 py-1 bg-slate-200 text-slate-500 text-[10px] font-extrabold rounded-md uppercase tracking-wider flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    ) : test.is_demo ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                        Free Demo
                      </span>
                    ) : null}
                    {completedTestIds.has(test.id) && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-md uppercase tracking-wider ml-auto">
                        Completed ✅
                      </span>
                    )}
                  </div>

                  <h3 className="mb-2 break-words text-[18px] font-black leading-snug text-[#05162E]">{test.title}</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed flex-1">{test.description || 'Simulate official British Council IELTS exam requirements.'}</p>
                  
                  <div className="mt-6 flex flex-col gap-4">
                    <div className="flex items-center gap-4 text-[12px] font-bold text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> {test.duration || 60} min
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Info className="h-4 w-4" /> {getSectionSummary(test)}
                      </div>
                    </div>

                    {test.is_locked ? (
                      <Link 
                        to="/access-request" 
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-200"
                      >
                        Unlock Test <Lock className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <button 
                        disabled={startingTestId === test.id}
                        onClick={() => handleStartTest(test.id)}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A6E] py-3 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-[#162d57] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {startingTestId === test.id ? (
                          <>Starting Exam...</>
                        ) : completedTestIds.has(test.id) ? (
                          <>{activeTab === 'mock' ? 'Retake Exam' : 'Retake Practice'} <Play className="h-3.5 w-3.5 fill-current" /></>
                        ) : (
                          <>{activeTab === 'mock' ? 'Start Mock Test' : 'Open Questions'} <Play className="h-3 w-3 fill-current" /></>
                        )}
                      </button>
                    )}
                  </div>

                </div>
              </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </main>
      <div className={`fixed inset-0 z-40 bg-[#05162E]/55 backdrop-blur-sm transition-opacity lg:hidden ${isFilterOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setIsFilterOpen(false)} />
      <aside className={`fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] rounded-t-3xl bg-white transition-transform duration-300 lg:hidden ${isFilterOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        {readingFilterPanel}
      </aside>
      <MobileBottomNav />
    </div>
  );
}

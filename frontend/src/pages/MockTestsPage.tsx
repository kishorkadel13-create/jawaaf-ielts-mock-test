import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import StudentSidebar from '../components/StudentSidebar';
import WritingTask1Practice from '../components/WritingTask1Practice';
import WritingTask2Practice from '../components/WritingTask2Practice';
import ReadingPracticeList from '../components/ReadingPracticeList';
import MobileBottomNav from '../components/MobileBottomNav';
import NotificationBell from '../components/NotificationBell';
import { assets } from '../config/assets';
import { BarChart3, BookOpen, CheckSquare, ClipboardList, Headphones, Lock, ArrowLeft, ArrowRight, Play, Clock, Info, PenLine, Target, Star, Timer, Monitor, History, User, Settings, LogOut, Award, Menu, Video, SlidersHorizontal, X, Search } from 'lucide-react';
import { STREAK_UPDATED_EVENT, getStoredStreakData } from '../utils/streak';

interface MockTest {
  id: string;
  title: string;
  description: string;
  duration: number;
  is_locked: boolean;
  is_demo: boolean;
  cover_image_url?: string;
  star_rating?: number;
  difficulty?: string;
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
  { key: 'fill_in_the_blanks', label: 'Fill in the Blanks', aliases: ['FILL_IN_THE_BLANKS', 'FILL_IN_THE_BLANK'] },
  { key: 'summary_completion', label: 'Summary Completion', aliases: ['SUMMARY_COMPLETION'] },
  { key: 'short_answer', label: 'Short Answer Question', aliases: ['SHORT_ANSWER_QUESTION', 'SHORT_ANSWER', 'SHORT_ANSWER_QUESTIONS'] },
  { key: 'diagram_labelling', label: 'Diagram Labelling', aliases: ['DIAGRAM_LABELLING', 'DIAGRAM_LABELING'] },
  { key: 'summary_completion_options', label: 'Summary Completion with Options', aliases: ['SUMMARY_COMPLETION_WITH_OPTIONS'] },
  { key: 'table_completion', label: 'Table Completion', aliases: ['TABLE_COMPLETION'] },
  { key: 'tfng', label: 'True / False / Not Given', aliases: ['TRUE_FALSE_NOT_GIVEN', 'TFNG'] },
  { key: 'ynng', label: 'Yes / No / Not Given', aliases: ['YES_NO_NOT_GIVEN', 'YNNG'] },
  { key: 'multiple_choice', label: 'Standard Multiple Choice', aliases: ['STANDARD_MULTIPLE_CHOICE', 'SINGLE_MCQ', 'MULTIPLE_CHOICE'] },
  { key: 'sentence_completion', label: 'Sentence Completion', aliases: ['SENTENCE_COMPLETION_FIND_THE_TAIL', 'SENTENCE_COMPLETION'] },
  { key: 'matching', label: 'Matching Question', aliases: ['MATCHING_QUESTION', 'MATCHING_FEATURES', 'MATCHING'] },
  { key: 'matching_information', label: 'Matching Information', aliases: ['MATCHING_INFORMATION'] },
  { key: 'matching_headings', label: 'Matching Headings', aliases: ['MATCHING_HEADINGS'] },
  { key: 'multi_select', label: 'Choose Two / Multi-select', aliases: ['CHOOSE_TWO_MULTI_SELECT', 'MULTI_SELECT'] }
] as const;

type ReadingQuestionTypeKey = typeof READING_QUESTION_TYPES[number]['key'];
type ReadingCategoryKey = 'complete' | 'passage-1' | 'passage-2' | 'passage-3';

const TEST_LIBRARY_CACHE_KEY = 'jawaaf:test-library-summary:v1';
const TEST_LIBRARY_CACHE_TTL = 5 * 60 * 1000;

const readTestLibraryCache = (): { tests: MockTest[]; completedIds: string[] } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = window.sessionStorage.getItem(TEST_LIBRARY_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > TEST_LIBRARY_CACHE_TTL) return null;
    return {
      tests: Array.isArray(parsed.tests) ? parsed.tests : [],
      completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : []
    };
  } catch (e) {
    return null;
  }
};

const writeTestLibraryCache = (tests: MockTest[], completedIds: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(TEST_LIBRARY_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      tests,
      completedIds
    }));
  } catch (e) {}
};

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
    .replace(/^\d+\.\s*/, '') // Strip numbers like "1. ", "12. "
    .replace(/&/g, 'AND')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const getReadingTypeMeta = (values: string[] = [], fallbackText = '') => {
  const normalizedValues = values.map(normalizeReadingType).filter(Boolean);
  
  for (const val of normalizedValues) {
    const type = READING_QUESTION_TYPES.find(t => t.key !== 'all' && (t.aliases as readonly string[] | undefined)?.includes(val));
    if (type) return type;
  }

  const normalizedText = normalizeReadingType(fallbackText);
  for (const type of READING_QUESTION_TYPES) {
    if (type.key !== 'all' && type.aliases?.some(alias => normalizedText.includes(alias))) {
      return type;
    }
  }

  return READING_QUESTION_TYPES[0];
};

const getReadingTypeLabels = (values: string[] = [], fallbackText = '') => {
  const normalizedValues = values.map(normalizeReadingType).filter(Boolean);
  const labels: string[] = [];

  for (const val of normalizedValues) {
    const type = READING_QUESTION_TYPES.find(t => t.key !== 'all' && (t.aliases as readonly string[] | undefined)?.includes(val));
    if (type && !labels.includes(type.label)) {
      labels.push(type.label);
    }
  }

  if (fallbackText) {
    const normalizedText = normalizeReadingType(fallbackText);
    for (const type of READING_QUESTION_TYPES) {
      if (type.key !== 'all' && !labels.includes(type.label)) {
        if (type.aliases?.some(alias => normalizedText.includes(alias))) {
          labels.push(type.label);
        }
      }
    }
  }

  return labels;
};

const getReadingTypeKeys = (values: string[] = [], fallbackText = ''): ReadingQuestionTypeKey[] => {
  const normalizedValues = values.map(normalizeReadingType).filter(Boolean);
  const keys: ReadingQuestionTypeKey[] = [];

  for (const val of normalizedValues) {
    const type = READING_QUESTION_TYPES.find(t => t.key !== 'all' && (t.aliases as readonly string[] | undefined)?.includes(val));
    if (type && !keys.includes(type.key as ReadingQuestionTypeKey)) {
      keys.push(type.key as ReadingQuestionTypeKey);
    }
  }

  if (fallbackText && keys.length === 0) {
    const normalizedText = normalizeReadingType(fallbackText);
    for (const type of READING_QUESTION_TYPES) {
      if (type.key !== 'all' && !keys.includes(type.key as ReadingQuestionTypeKey)) {
        if ((type.aliases as readonly string[])?.some(alias => normalizedText.includes(alias))) {
          keys.push(type.key as ReadingQuestionTypeKey);
        }
      }
    }
  }

  return keys;
};

export default function MockTestsPage() {
  const { profile } = useAuthStore();
  const [searchParams] = useSearchParams();
  const cachedLibrary = useMemo(() => readTestLibraryCache(), []);
  const [tests, setTests] = useState<MockTest[]>(cachedLibrary?.tests || []);
  const [loading, setLoading] = useState(!cachedLibrary);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mock' | 'practice'>(searchParams.get('mode') === 'practice' ? 'practice' : 'mock');
  const [practiceType, setPracticeType] = useState<'reading' | 'listening' | 'writing' | null>(null);
  const [writingPracticeType, setWritingPracticeType] = useState<'task1' | 'task2' | 'combo' | null>(null);
  const [readingCategory, setReadingCategory] = useState<ReadingCategoryKey>('complete');
  const [readingQuestionType, setReadingQuestionType] = useState<ReadingQuestionTypeKey>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const navigate = useNavigate();
  const [readingPracticeListType, setReadingPracticeListType] = useState<ReadingCategoryKey | null>(null);
  const [streakData, setStreakData] = useState<{ activeDates: string[], currentStreak: number }>({ activeDates: [], currentStreak: 0 });

  const [completedTestIds, setCompletedTestIds] = useState<Set<string>>(new Set(cachedLibrary?.completedIds || []));

  useEffect(() => {
    if (!profile?.id) return;

    const syncStreak = () => setStreakData(getStoredStreakData(profile.id));
    const handleStreakUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: string }>;
      if (!customEvent.detail?.userId || customEvent.detail.userId === profile.id) {
        syncStreak();
      }
    };

    syncStreak();
    window.addEventListener(STREAK_UPDATED_EVENT, handleStreakUpdate);

    return () => window.removeEventListener(STREAK_UPDATED_EVENT, handleStreakUpdate);
  }, [profile?.id]);

  useEffect(() => {
    const fetchTestsAndAttempts = async () => {
      try {
        if (!cachedLibrary) setLoading(true);
        const [testsRes, attemptsRes] = await Promise.all([
          api.get('/tests', { params: { summary: 1 } }),
          api.get('/attempts/history', { params: { summary: 1 } }).catch(() => ({ data: [] }))
        ]);
        
        setTests(testsRes.data);
        const completedIds = (attemptsRes.data || [])
          .map((a: any) => a.mock_test_id)
          .filter(Boolean);
        const attemptIds = new Set(
          completedIds
        );
        setCompletedTestIds(attemptIds as Set<string>);
        writeTestLibraryCache(testsRes.data || [], completedIds);
        
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
      setReadingPracticeListType(null);
    }
  }, [searchParams]);

  useEffect(() => {
    if (practiceType !== 'reading') {
      setReadingPracticeListType(null);
    }
  }, [practiceType]);

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
    try {
      if (test.description?.trim().startsWith('{')) {
        const descData = JSON.parse(test.description);
        if (descData.section_template === 'reading_passage_1') return 1;
        if (descData.section_template === 'reading_passage_2') return 2;
        if (descData.section_template === 'reading_passage_3') return 3;
      }
    } catch (e) {}

    const section = test.sections?.find(item => item.type === 'reading');
    return getReadingPassageFromLabel(`${test.title || ''} ${test.description || ''} ${section?.title || ''}`);
  };

  const getReadingCategory = (test: MockTest): ReadingCategoryKey => {
    try {
      if (test.description?.trim().startsWith('{')) {
        const descData = JSON.parse(test.description);
        if (descData.section_template === 'reading_passage_1') return 'passage-1';
        if (descData.section_template === 'reading_passage_2') return 'passage-2';
        if (descData.section_template === 'reading_passage_3') return 'passage-3';
        if (descData.section_template === 'reading') return 'complete';
      }
    } catch (e) {}

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
    const normalizeDifficulty = (val: string) => {
      const v = (val || '').trim().toLowerCase();
      if (v === 'beginner' || v === 'easy') return 'Beginner';
      if (v === 'advanced' || v === 'hard' || v === 'legend') return 'Advanced';
      return 'Standard'; // Medium, Standard, or anything else
    };

    try {
      if (test.description?.trim().startsWith('{')) {
        const descData = JSON.parse(test.description);
        if (descData.difficulty) {
          return normalizeDifficulty(descData.difficulty);
        }
      }
    } catch (e) {}
    
    // Fallback logic
    const label = `${test.title || ''} ${test.description || ''}`.toLowerCase();
    if (label.includes('advanced') || label.includes('hard') || label.includes('difficult') || label.includes('legend')) return 'Advanced';
    if (label.includes('beginner') || label.includes('easy')) return 'Beginner';
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
    passage: passage === null ? undefined : passage,
    title,
    questionTypeKey,
    questionTypeLabel,
    questionTypeKeys,
    questionTypeLabels,
    questionCount,
    duration: duration || section?.duration || test.duration || 20,
    difficulty: getReadingDifficulty(test),
    cover_image_url: (() => {
      if (test.cover_image_url) return test.cover_image_url;
      try {
        if (test.description?.trim().startsWith('{')) {
          return JSON.parse(test.description).cover_image_url || undefined;
        }
      } catch (e) {}
      return undefined;
    })(),
    star_rating: (() => {
      if (test.star_rating !== undefined) return test.star_rating;
      try {
        if (test.description?.trim().startsWith('{')) {
          return JSON.parse(test.description).star_rating;
        }
      } catch (e) {}
      return undefined;
    })()
  });

  const readingPracticeCards = practiceTests
    .filter(test => (test.sections?.[0]?.type || 'reading') === 'reading')
    .flatMap(test => {
      const section = test.sections?.[0];
      const baseCategory = getReadingCategory(test);
      const testPassage = getReadingPassageNumber(test);
      const groups = section?.question_groups || [];
      const allQuestions = groups.flatMap(g => g.questions || []);
      const sectionExplicitTypes = [
        ...(section?.question_types || []),
        ...groups.flatMap(g => g.question_types || []),
        ...allQuestions.map(q => q.question_type).filter(Boolean)
      ] as string[];

      const sectionTypeMeta = getReadingTypeMeta(sectionExplicitTypes, `${test.title} ${section?.title || ''}`);
      const sectionTypeLabels = getReadingTypeLabels(sectionExplicitTypes, `${test.title} ${section?.title || ''}`);
      const sectionTypeKeys = getReadingTypeKeys(sectionExplicitTypes, `${test.title} ${section?.title || ''}`);
      const wholeTestTypeKey = sectionTypeKeys.length > 1 ? 'all' : (sectionTypeKeys[0] ?? sectionTypeMeta.key);
      const wholeTestCard = createReadingCard(
        test,
        section,
        baseCategory,
        testPassage,
        test.title,
        wholeTestTypeKey,
        sectionTypeLabels.length > 1 ? 'Mixed Question Types' : (sectionTypeMeta.key === 'all' ? 'Mixed Question Types' : sectionTypeMeta.label),
        sectionTypeKeys.length > 0 ? sectionTypeKeys : [wholeTestTypeKey as ReadingQuestionTypeKey],
        sectionTypeLabels.length > 0 ? sectionTypeLabels : [],
        section?.question_count || 0,
        section?.duration || test.duration || (baseCategory === 'complete' ? 60 : 20)
      );

      if (groups.length === 0) {
        return [wholeTestCard];
      }

      const groupCards = groups.map((group, index) => {
        const groupExplicitTypes = [
          ...(group.question_types || []),
          ...(group.questions?.map(q => q.question_type).filter(Boolean) || [])
        ] as string[];

        const typeMeta = getReadingTypeMeta(groupExplicitTypes, `${group.title || ''} ${group.instruction || ''}`);
        const typeLabels = getReadingTypeLabels(groupExplicitTypes, `${group.title || ''} ${group.instruction || ''}`);
        const typeKeys = getReadingTypeKeys(groupExplicitTypes, `${group.title || ''} ${group.instruction || ''}`);
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
          test.title || group.title || 'Practice Test',
          typeKeys[0] ?? typeMeta.key,
          typeLabels.length > 1 ? 'Mixed Question Types' : (typeMeta.key === 'all' ? 'Mixed Question Types' : typeMeta.label),
          typeKeys.length > 0 ? typeKeys : [typeMeta.key as ReadingQuestionTypeKey],
          typeLabels.length > 0 ? typeLabels : [],
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
      image: assets.practice.reading,
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
      image: assets.practice.listening,
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
      image: assets.practice.writing,
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
      image: assets.writingPractice.task1,
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
      image: assets.writingPractice.task2,
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
      image: assets.writingPractice.fullTest,
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

  const readingAssets = assets.readingPractice;
  const readingUniqueTestIds = new Set(readingPracticeCards.map(card => card.test.id));
  const readingCompletedCount = [...readingUniqueTestIds].filter(id => completedTestIds.has(id)).length;
  const readingTotalCount = readingUniqueTestIds.size || readingPracticeCards.length;
  const readingProgressPercent = readingTotalCount > 0 ? Math.round((readingCompletedCount / readingTotalCount) * 100) : 0;
  const getPrimaryReadingCard = (category: ReadingCategoryKey, typeKey?: ReadingQuestionTypeKey) =>
    readingPracticeCards.find(card => {
      if (card.category !== category) return false;
      if (!typeKey || typeKey === 'all') return true;
      return card.questionTypeKeys.includes(typeKey);
    });
  const getReadingCategoryCards = () => ([
    {
      key: 'complete' as ReadingCategoryKey,
      label: 'Complete Set',
      eyebrow: 'Recommended',
      image: readingAssets.complete,
      accent: 'navy',
      description: '',
      questions: '40 Questions',
      time: '60-70 min',
      stats: '3 Passages',
      cta: 'Start Full Test'
    },
    {
      key: 'passage-1' as ReadingCategoryKey,
      label: 'Passage 1',
      eyebrow: 'Passage 1',
      image: readingAssets.passage1,
      badge: readingAssets.badge1,
      accent: 'green',
      description: '',
      questions: '13-14 Questions',
      time: '20 min',
      stats: 'Passage Practice',
      cta: 'Start Practice'
    },
    {
      key: 'passage-2' as ReadingCategoryKey,
      label: 'Passage 2',
      eyebrow: 'Passage 2',
      image: readingAssets.passage2,
      badge: readingAssets.badge2,
      accent: 'blue',
      description: '',
      questions: '13-14 Questions',
      time: '20 min',
      stats: 'Passage Practice',
      cta: 'Start Practice'
    },
    {
      key: 'passage-3' as ReadingCategoryKey,
      label: 'Passage 3',
      eyebrow: 'Passage 3',
      image: readingAssets.passage3,
      badge: readingAssets.badge3,
      accent: 'purple',
      description: '',
      questions: '13-14 Questions',
      time: '20 min',
      stats: 'Passage Practice',
      cta: 'Start Practice'
    }
  ]).map(card => {
    const primaryCard = getPrimaryReadingCard(card.key);
    return {
      ...card,
      primaryCard,
      count: readingPracticeCards.filter(item => item.category === card.key).length,
      isCompleted: primaryCard ? completedTestIds.has(primaryCard.test.id) : false
    };
  });

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#F8FAFC] pb-24 font-sans lg:pb-0" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <StudentSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className={`sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 shadow-sm sm:px-6 lg:px-10 ${
          activeTab === 'practice' && practiceType === 'reading' ? 'min-h-[80px] py-3' : 'min-h-[68px] py-3'
        }`}>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="mr-2 p-2 text-slate-500 hover:text-slate-800 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex w-[200px] items-center">
            {activeTab === 'practice' && practiceType === 'reading' ? (
              <button
                type="button"
                onClick={() => setPracticeType(null)}
                className="hidden sm:flex items-center gap-2 text-[14px] font-bold text-[#05162E] hover:text-[#2259D8] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Reading Practice
              </button>
            ) : activeTab === 'practice' && practiceType === 'writing' && !writingPracticeType ? (
              <button
                type="button"
                onClick={() => {
                  setPracticeType(null);
                  setWritingPracticeType(null);
                }}
                className="hidden sm:flex items-center gap-2 text-[#05162E] hover:text-[#2259D8] transition-colors text-[14px] font-bold"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Practice
              </button>
            ) : (
              <Link 
                to="/dashboard" 
                className="hidden sm:flex items-center gap-2 text-[#05162E] hover:text-[#2259D8] transition-colors text-[14px] font-bold"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Link>
            )}
          </div>

          <div className="flex-1 text-center hidden md:block">
            <h2 className="text-[17px] font-extrabold text-[#05162E]">
              Hi, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
            </h2>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
              Let's make today's practice count.
            </p>
          </div>

          <div className="flex w-[200px] shrink-0 items-center justify-end gap-5">
            {activeTab === 'practice' && practiceType === 'reading' && (
              <div className="hidden items-center gap-2 xl:flex">
                <span className="text-[20px]">🔥</span>
                <div className="leading-[1.1]">
                  <p className="text-[15px] font-black text-[#05162E]">{streakData.currentStreak}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Day Streak</p>
                </div>
              </div>
            )}
            
            <div className="hidden items-center gap-4 text-slate-400 xl:flex">
              <button className="hover:text-slate-600 transition-colors">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <NotificationBell
                className="relative grid h-[28px] w-[28px] place-items-center text-slate-400 transition-colors hover:text-slate-600"
                iconClassName="h-[18px] w-[18px]"
                badgeClassName="absolute -right-1 -top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full border border-white bg-red-500 px-1 text-[9px] font-bold text-white"
              />
            </div>
            
            <div className="h-8 w-8 rounded-full bg-[#05162E] text-white flex items-center justify-center text-[13px] font-bold shadow-sm">
              {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        <div
          className={`w-full ${activeTab === 'practice' && practiceType === 'reading' ? 'min-h-[calc(100dvh-80px)] overflow-visible bg-no-repeat px-4 pb-28 pt-4 sm:px-6 lg:pb-8 xl:px-8 xl:py-4' : 'p-4 md:p-5 xl:p-6'} ${activeTab === 'practice' && (!practiceType || (practiceType === 'writing' && !writingPracticeType)) ? 'overflow-visible' : ''}`}
          style={activeTab === 'practice' && practiceType === 'reading' ? {
            backgroundImage: `url('${readingAssets.background}')`,
            backgroundPosition: 'bottom center',
            backgroundSize: '100% auto',
          } : undefined}
        >
        
        {/* Header Section */}
        {!(activeTab === 'practice' && (!practiceType || practiceType === 'reading' || (practiceType === 'writing' && (!writingPracticeType || writingPracticeType === 'task1' || writingPracticeType === 'task2')))) && (
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
            readingPracticeListType ? (
              <ReadingPracticeList
                category={readingPracticeListType}
                cards={readingPracticeCards}
                completedTestIds={completedTestIds}
                startingTestId={startingTestId}
                onStartTest={handleStartTest}
                onBack={() => setReadingPracticeListType(null)}
                onCategoryChange={(cat) => setReadingPracticeListType(cat)}
              />
            ) : (
              <div className="mx-auto grid w-full max-w-[1560px] gap-3 text-[#05162E]">
            <section className="grid gap-4 overflow-x-hidden sm:gap-5 lg:h-[120px] lg:grid-cols-[minmax(0,1fr)_minmax(0,580px)] lg:items-center">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-[82px] w-[96px] shrink-0 place-items-center">
                    <img src={readingAssets.book} alt="" className="h-[78px] w-[92px] object-contain drop-shadow-[0_12px_14px_rgba(15,23,42,0.10)]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="break-words text-[32px] font-black leading-tight tracking-tight text-[#05162E] sm:text-[42px]">Reading Practice</h2>
                    <p className="mt-1 break-words text-[15px] font-semibold leading-6 text-[#294b77] sm:text-[17px]">
                      Build accuracy. Improve speed. Master every question type.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative min-w-0 overflow-hidden rounded-[16px] border border-blue-100 bg-gradient-to-r from-white via-[#F8FBFF] to-[#EAF4FF] px-5 py-4 shadow-[0_12px_28px_rgba(41,75,119,0.08)] sm:px-6 lg:h-[110px] lg:w-[580px] lg:-translate-x-[196px] lg:px-5 lg:py-3 lg:pr-[92px] 2xl:-translate-x-[236px]">
                <div className="relative z-10 grid gap-3 sm:grid-cols-[minmax(0,1fr)_185px] sm:items-end">
                  <div className="min-w-0">
                    <p className="whitespace-nowrap text-[13px] font-semibold leading-4 text-[#05162E]">Ready for a new challenge?</p>
                    <h3 className="mt-2 whitespace-nowrap text-[19px] font-black leading-6 text-[#05162E]">
                      Jump to Writing Practice
                    </h3>
                    <p className="mt-2 whitespace-nowrap text-[12px] font-semibold leading-4 text-[#294b77]">
                      Sharpen your ideas. Strengthen your writing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeType('writing');
                      setWritingPracticeType(null);
                      setReadingQuestionType('all');
                    }}
                    className="flex h-10 min-h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-blue-200 bg-white px-3 text-[12px] font-black text-[#2259D8] shadow-sm transition-all hover:bg-blue-50 active:scale-[0.98] sm:mb-[18px] sm:w-[185px]"
                  >
                    I will practice Writing <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <img
                  src={readingAssets.pen}
                  alt=""
                  className="pointer-events-none absolute bottom-[-2px] right-2 hidden h-[96px] w-[94px] rotate-[2deg] object-contain opacity-95 drop-shadow-[0_16px_22px_rgba(41,75,119,0.18)] xl:block"
                />
              </div>
            </section>

            <div className="w-full overflow-x-auto pb-1">
              <div className="inline-flex min-w-full rounded-[15px] border border-slate-200 bg-white p-1 shadow-sm sm:min-w-[640px]">
                {(['complete', 'passage-1', 'passage-2', 'passage-3'] as ReadingCategoryKey[]).map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setReadingCategory(category);
                      setReadingQuestionType('all');
                    }}
                    className={`flex min-h-10 shrink-0 flex-1 items-center justify-center gap-3 rounded-[12px] px-5 text-[14px] font-black transition-all sm:px-8 ${
                      activeReadingCategory === category
                        ? 'bg-[#294b77] text-white shadow-[0_10px_22px_rgba(41,75,119,0.24)]'
                        : 'bg-white text-[#294b77] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span className="text-[18px]">{category === 'complete' ? '🏆' : '📖'}</span>
                    <span className="whitespace-nowrap">{READING_CATEGORY_META[category].shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1010px_360px] xl:items-start xl:gap-[95px] xl:pr-[83px] 2xl:grid-cols-[1010px_360px]">
              <div className="min-w-0">
                <section className="overflow-hidden rounded-[16px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.04)] xl:h-[420px] xl:w-[1010px] xl:px-5 xl:pb-0 xl:pt-3">
                  <div className="mb-2 xl:px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[22px] text-[#2259D8]">⚑</span>
                      <h3 className="text-[18px] font-black uppercase tracking-wide text-[#05162E]">Choose Your Challenge</h3>
                    </div>
                    <p className="mt-0.5 text-[14px] font-semibold leading-5 text-[#294b77]">Practice individual passages or attempt the full test set.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:flex xl:w-[968px] xl:gap-4">
                    {getReadingCategoryCards().map(card => {
                      const accentClass = card.accent === 'green'
                        ? 'text-[#0EA66B] border-emerald-200 bg-emerald-50'
                        : card.accent === 'blue'
                        ? 'text-[#2259D8] border-blue-200 bg-blue-50'
                        : card.accent === 'purple'
                        ? 'text-[#5B2EBB] border-violet-200 bg-violet-50'
                        : 'text-[#05162E] border-amber-200 bg-amber-50';
                      const buttonClass = card.accent === 'green'
                        ? 'border-emerald-200 bg-white text-[#087F5B] hover:bg-emerald-50'
                        : card.accent === 'blue'
                        ? 'border-blue-200 bg-white text-[#2259D8] hover:bg-blue-50'
                        : card.accent === 'purple'
                        ? 'border-violet-200 bg-white text-[#4B168F] hover:bg-violet-50'
                        : 'border-[#002F6C] bg-gradient-to-r from-[#001F4D] to-[#003D80] text-white hover:from-[#001A42] hover:to-[#00346D]';
                      const activeCard = activeReadingCategory === card.key;
                      const testId = card.primaryCard?.test.id;
                      const isCompleteCard = card.key === 'complete';
                      const passageNumber = card.key === 'passage-1' ? '01' : card.key === 'passage-2' ? '02' : card.key === 'passage-3' ? '03' : '';

                      return (
                        <article
                          key={card.key}
                          className={`group relative flex min-h-[340px] w-full flex-col overflow-hidden rounded-[16px] border px-4 pb-4 pt-3 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.09)] xl:h-[340px] ${isCompleteCard ? 'bg-gradient-to-b from-white via-white to-[#FFF7E8] xl:w-[260px] xl:shrink-0' : 'bg-white xl:w-[220px] xl:shrink-0'} ${
                            activeCard ? 'border-[#294b77]/35 ring-2 ring-[#294b77]/10' : 'border-slate-200'
                          }`}
                        >
                          {card.eyebrow === 'Recommended' && (
                            <span className="absolute left-0 top-3 rounded-r-full bg-[#294b77] px-4 py-1.5 text-[10px] font-black uppercase text-white shadow-sm">
                              Recommended
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setReadingCategory(card.key);
                              setReadingQuestionType('all');
                              setReadingPracticeListType(card.key);
                            }}
                            className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border ${activeCard ? accentClass : 'border-slate-200 bg-white text-slate-400 hover:text-[#294b77]'}`}
                            aria-label={`Select ${card.label}`}
                          >
                            <Star className={`h-5 w-5 ${activeCard ? 'fill-current' : ''}`} />
                          </button>

                          {isCompleteCard ? (
                            <>
                              <div className="mt-9 flex min-h-[86px] items-center justify-center">
                                <img
                                  src={card.image}
                                  alt=""
                                  loading="lazy"
                                  className="relative z-10 h-[96px] w-[142px] object-contain drop-shadow-[0_14px_16px_rgba(15,23,42,0.10)] transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                              </div>
                              <h4 className="mt-2 text-center text-[22px] font-black leading-tight text-[#05162E]">{card.label}</h4>
                              <p className="mx-auto mt-3 max-w-[230px] text-center text-[13px] font-semibold leading-5 text-[#294b77]">
                                Attempt all 3 passages together like the real IELTS test.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className={`mt-3 text-center text-[16px] font-black uppercase ${card.accent === 'green' ? 'text-[#0EA66B]' : card.accent === 'blue' ? 'text-[#2259D8]' : 'text-[#4B168F]'}`}>
                                {card.eyebrow}
                              </p>
                              <div className="relative -mt-1 flex min-h-[152px] items-center justify-center">
                                {card.badge && (
                                  <>
                                    <img src={card.badge} alt="" className="absolute top-0 h-[118px] w-[118px] object-contain opacity-95" />
                                    <span className={`absolute top-[40px] z-10 text-[34px] font-black leading-none ${card.accent === 'green' ? 'text-[#087F5B]' : card.accent === 'blue' ? 'text-[#2259D8]' : 'text-[#4B168F]'}`}>
                                      {passageNumber}
                                    </span>
                                  </>
                                )}
                                <img
                                  src={card.image}
                                  alt=""
                                  loading="lazy"
                                  className="relative z-20 mt-[82px] h-[72px] w-[156px] object-contain drop-shadow-[0_14px_16px_rgba(15,23,42,0.10)] transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                              </div>
                            </>
                          )}

                          <div className={`mt-auto grid ${isCompleteCard ? 'grid-cols-3 divide-x text-[11px] xl:text-[11px]' : 'grid-cols-1 text-[13px]'} divide-slate-200 border-t border-slate-100 pt-3 text-center font-black leading-tight text-[#294b77]`}>
                            {isCompleteCard ? (
                              <>
                                <span className="whitespace-nowrap px-1">{card.stats}</span>
                                <span className="whitespace-nowrap px-1">{card.questions}</span>
                                <span className="whitespace-nowrap px-1">{card.time}</span>
                              </>
                            ) : (
                              <div className="grid gap-2">
                                <span>{card.questions}</span>
                                <span className="inline-flex items-center justify-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {card.time}
                                </span>
                              </div>
                            )}
                          </div>

                          {card.primaryCard?.test.is_locked ? (
                            <Link
                              to="/access-request"
                              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-slate-100 px-4 text-[14px] font-black text-slate-600 hover:bg-slate-200"
                            >
                              Unlock Practice <Lock className="h-4 w-4" />
                            </Link>
                          ) : testId ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReadingCategory(card.key);
                                setReadingQuestionType('all');
                                setReadingPracticeListType(card.key);
                              }}
                              className={`mt-2.5 flex min-h-11 w-full items-center justify-center gap-3 rounded-[10px] border px-4 text-[14px] font-black shadow-sm transition-all active:scale-[0.98] ${buttonClass}`}
                            >
                              {card.isCompleted ? 'Retake Practice' : card.cta}
                              <ArrowRight className="h-5 w-5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="mt-3 flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-[10px] border border-slate-200 bg-slate-50 px-4 text-[14px] font-black text-slate-400"
                            >
                              Coming Soon
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-4">
                  <div className="mb-2.5 flex items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-[22px] text-[#E59A16]">⚡</span>
                        <h3 className="text-[18px] font-black uppercase tracking-wide text-[#05162E]">Mastery Zones</h3>
                      </div>
                      <p className="mt-1 text-[14px] font-semibold text-[#294b77]">Focus on your weak areas and become unstoppable.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {[
                      {
                        title: 'TFNG Mastery Level',
                        subtitle: 'Master True / False / Not Given with smart strategies and expert techniques.',
                        titleLines: ['TFNG', 'Mastery Level'],
                        subtitleLines: ['Master True / False / Not Given', 'with smart strategies and', 'expert techniques.'],
                        badge: 'Focus Area',
                        count: '22 Hooty Evolutions',
                        countIcon: 'hooty',
                        countClass: 'bg-[#FFF1D9] text-[#C26300]',
                        image: readingAssets.tfng,
                        icon: readingAssets.tfngFocus,
                        typeKey: 'true_false_not_given' as ReadingQuestionTypeKey,
                        panelClass: 'border-amber-200 bg-gradient-to-br from-white via-[#FFF9EE] to-[#FFF3D8]',
                        textClass: 'text-[#D88600]',
                        buttonClass: 'bg-[#E59A16] text-white hover:bg-[#C97F00]'
                      },
                      {
                        title: 'Headings Mastery Level',
                        subtitle: 'Master Matching Headings with proven methods and high scoring techniques.',
                        titleLines: ['Headings', 'Mastery Level'],
                        subtitleLines: ['Master Matching Headings', 'with proven methods and', 'high scoring techniques.'],
                        badge: 'Focus Area',
                        count: 'Exciting Cases',
                        countIcon: 'search',
                        countClass: 'bg-[#EDE4FF] text-[#3F20B8]',
                        image: readingAssets.heading,
                        icon: readingAssets.headingFocus,
                        typeKey: 'matching_headings' as ReadingQuestionTypeKey,
                        panelClass: 'border-violet-200 bg-gradient-to-br from-white via-[#FBF8FF] to-[#F3EAFF]',
                        textClass: 'text-[#6D3FD1]',
                        buttonClass: 'bg-[#6D3FD1] text-white hover:bg-[#5830B8]'
                      }
                    ].map(card => {
                      const masteryCard = getPrimaryReadingCard('passage-1', card.typeKey) || readingPracticeCards.find(item => item.questionTypeKeys.includes(card.typeKey));
                      return (
                        <article key={card.title} className={`relative min-h-[150px] overflow-hidden rounded-[16px] border p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] ${card.panelClass}`}>
                          <div className="pointer-events-none absolute inset-0 bg-white/10"></div>
                          <span className={`pointer-events-none absolute left-[18%] top-[34%] text-[24px] leading-none ${card.textClass} opacity-35`}>✦</span>
                          <span className={`pointer-events-none absolute right-[22%] top-[18%] text-[18px] leading-none ${card.textClass} opacity-30`}>✦</span>
                          <span className={`pointer-events-none absolute right-[13%] top-[44%] text-[26px] leading-none ${card.textClass} opacity-28`}>✦</span>
                          <span className={`pointer-events-none absolute right-8 top-8 text-[18px] leading-none ${card.textClass} opacity-35`}>✦</span>
                          <div className="relative z-10 grid gap-y-3 sm:grid-cols-[150px_minmax(0,1fr)_150px] sm:items-center sm:gap-x-4">
                            <div>
                              <span className={`inline-flex whitespace-nowrap rounded-lg px-4 py-1.5 text-[10px] font-black uppercase text-white ${card.buttonClass}`}>{card.badge}</span>
                              <img src={card.icon} alt="" className="mt-2 h-[58px] w-[58px] object-contain drop-shadow-[0_12px_16px_rgba(15,23,42,0.10)]" />
                              <span className={`mt-2 inline-flex h-[30px] w-[150px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-[12px] font-black ${card.countClass}`}>
                                {card.countIcon === 'search' ? (
                                  <Search className="h-4 w-4" />
                                ) : (
                                  <span aria-hidden="true" className="text-[15px] leading-none">🦉</span>
                                )}
                                {card.count}
                              </span>
                            </div>
                            <div className="min-w-0 text-left sm:text-center">
                              <h4 className="text-[18px] font-black leading-[1.18] text-[#05162E]">
                                {card.titleLines.map(line => (
                                  <span key={line} className="block whitespace-nowrap">{line}</span>
                                ))}
                              </h4>
                              <p className="mx-auto mt-1.5 max-w-[260px] text-[11px] font-semibold leading-[1.45] text-[#294b77]">
                                {card.subtitleLines.map(line => (
                                  <span key={line} className="block whitespace-nowrap">{line}</span>
                                ))}
                              </p>
                              <button
                                type="button"
                                disabled={card.typeKey !== 'true_false_not_given' && (!masteryCard || startingTestId === masteryCard.test.id)}
                                onClick={() => {
                                  setReadingQuestionType(card.typeKey);
                                  if (card.typeKey === 'true_false_not_given') {
                                    navigate('/mastery/tfng');
                                    return;
                                  }
                                  if (masteryCard) handleStartTest(masteryCard.test.id);
                                }}
                                className={`mt-2 inline-flex h-[30px] min-h-[30px] w-full items-center justify-center gap-3 rounded-[8px] px-3 text-[12px] font-black shadow-md transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-[135px] ${card.buttonClass}`}
                              >
                                {masteryCard && startingTestId === masteryCard.test.id ? 'Starting...' : 'Start Mastery'} <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                            <img src={card.image} alt="" className="mx-auto h-[150px] w-[146px] object-contain drop-shadow-[0_18px_24px_rgba(15,23,42,0.13)] sm:mx-0" />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

              </div>

              <aside className="xl:mt-[-40px] xl:w-[360px] xl:-translate-x-[76px] 2xl:-translate-x-[96px]">
                <section className="relative h-[335px] w-full max-w-[360px] overflow-visible bg-transparent">
                  <img src={readingAssets.hootyTipsNote} alt="" className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_18px_30px_rgba(200,58,110,0.12)]" draggable={false} />
                  <div className="relative z-10 h-full px-[32px] pb-5 pt-[52px]">
                    <h3 className="ml-[58px] text-[18px] font-black uppercase tracking-[0.01em] text-[#05162E]">Hooty's Tip</h3>
                    <img src={readingAssets.hootyLight} alt="" className="absolute left-[194px] top-[80px] h-[48px] w-[48px] object-contain" draggable={false} />
                    <p
                      className="mt-[38px] w-[168px] text-[16px] font-bold italic leading-[1.58] text-[#05162E]"
                      style={{ fontFamily: '"Bradley Hand", "Comic Sans MS", "Segoe Print", cursive' }}
                    >
                      Read smart,<br />not hard.<br />Look for keywords,<br />understand the<br />main idea and<br />eliminate traps!
                    </p>
                    <p
                      className="absolute bottom-[42px] right-[34px] text-[18px] font-black text-[#2259D8]"
                      style={{ fontFamily: '"Bradley Hand", "Comic Sans MS", "Segoe Print", cursive' }}
                    >
                      - Hooty
                    </p>
                    <img
                      src={readingAssets.hootyMascot}
                      alt=""
                      className="absolute right-[16px] top-[96px] h-[190px] w-[172px] object-contain drop-shadow-[0_16px_22px_rgba(15,23,42,0.16)]"
                      draggable={false}
                    />
                  </div>
                </section>

                <section className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.06)] xl:hidden">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-[18px] font-black text-[#05162E]">Today's Goal</h3>
                    <span className="rounded-full bg-[#FFF4DA] px-3 py-1 text-[12px] font-black text-[#D88600]">{readingCompletedCount}/{readingTotalCount || 0}</span>
                  </div>
                  <p className="mt-3 text-[14px] font-semibold leading-6 text-[#294b77]">Complete one reading set and review every wrong answer.</p>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#ef5f55]" style={{ width: `${Math.max(readingProgressPercent, readingCompletedCount > 0 ? 8 : 0)}%` }}></div>
                  </div>
                </section>

                <section className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.06)] xl:hidden">
                  <h3 className="text-[18px] font-black text-[#05162E]">Recent Activity</h3>
                  <div className="mt-4 grid gap-3">
                    {(filteredReadingCards.length > 0 ? filteredReadingCards : readingPracticeCards).slice(0, 4).map(card => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleStartTest(card.test.id)}
                        disabled={startingTestId === card.test.id || card.test.is_locked}
                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[16px] border border-slate-100 bg-[#F8FAFC] px-4 py-3 text-left transition-all hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-black text-[#05162E]">{card.title}</span>
                          <span className="mt-1 block text-[11px] font-black uppercase text-slate-400">{card.questionTypeLabel}</span>
                        </span>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#05162E] text-white">
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        )
      ) : activeTab === 'practice' && practiceType === 'writing' && !writingPracticeType ? (
          <div className="mx-auto flex h-full w-full max-w-[1360px] flex-col gap-5">
            <section className="relative min-h-[260px] overflow-hidden rounded-[24px] bg-transparent lg:aspect-[2856/626] lg:max-h-[250px] lg:min-h-0">
              <img
                src={assets.writingPractice.background}
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
                    src={assets.writingPractice.header}
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
                    src={assets.writingPractice.notes}
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
                      src={assets.writingPractice.footer}
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

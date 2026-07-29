import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import StudentSidebar from '../components/StudentSidebar';
import WritingTask1Practice from '../components/WritingTask1Practice';
import { BarChart3, BookOpen, CheckSquare, ClipboardList, Headphones, Lock, ArrowLeft, ArrowRight, Play, Clock, Info, PenLine, Target, Star, Timer, Monitor, History, User, Settings, LogOut, Award, Menu, Video } from 'lucide-react';

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

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC] font-sans flex" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <StudentSidebar />

      <main className="flex-1 min-w-0 h-screen overflow-hidden">
        <header className="h-[68px] bg-white border-b border-slate-100 px-6 lg:px-10 flex items-center justify-between shadow-sm">
          <button className="lg:hidden p-2 rounded-xl hover:bg-slate-50 text-[#05162E]">
            <Menu className="h-6 w-6" />
          </button>
          <Link 
            to="/dashboard" 
            className="hidden sm:flex items-center gap-2 text-slate-500 hover:text-[#1E3A6E] transition-colors text-[14px] font-bold"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden md:flex items-center gap-2 text-[12px] text-slate-500 font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Jawaaf Testing Platform
            </span>
            <div className="h-10 w-10 rounded-full bg-[#EFF4FB] text-[#1E3A6E] flex items-center justify-center font-black">
              {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        <div className={`h-[calc(100vh-68px)] p-4 md:p-5 xl:p-6 w-full ${activeTab === 'practice' && !practiceType ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        
        {/* Header Section */}
        {!(activeTab === 'practice' && (!practiceType || (practiceType === 'writing' && (!writingPracticeType || writingPracticeType === 'task1')))) && (
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
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1E3A6E] rounded-full animate-spin"></div>
            <p className="text-slate-400 text-[14px] font-bold">Loading test library...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center">
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
        ) : activeTab === 'practice' && !practiceType ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="grid xl:grid-cols-[minmax(0,1fr)_330px] gap-8 p-7 md:p-8">
              <section>
                <div className="mb-7">
                  <h2 className="text-[30px] font-black text-[#05162E] tracking-tight">Practice Test</h2>
                  <p className="text-[15px] text-slate-500 mt-2">Choose a section to practice individually. Improve your skills step by step.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-7">
                  {practiceCards.map(card => {
                    const count = getPracticeTestsByType(card.type).length;
                    return (
                      <button
                        key={card.type}
                        type="button"
	                        onClick={() => {
	                          setPracticeType(card.type);
	                          setWritingPracticeType(null);
                            setReadingQuestionType('all');
	                        }}
                        className="bg-white border border-slate-200 hover:border-[#1E3A6E]/40 rounded-2xl p-6 min-h-[365px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-center flex flex-col items-center"
                      >
                        <div className={`h-20 w-20 rounded-3xl flex items-center justify-center mb-5 ${card.iconClass}`}>
                          {card.icon}
                        </div>
                        <h3 className="text-[24px] font-black text-[#05162E]">{card.title}</h3>
                        <p className="text-[14px] text-slate-500 leading-relaxed mt-3 min-h-[54px] max-w-[260px]">{card.description}</p>
                        <div className="mt-auto grid gap-1.5 text-[13px] font-bold text-[#1E3A6E]">
                          <span className="flex items-center justify-center gap-2">
                            <ClipboardList className="h-4 w-4" /> {count} Tests Available
                          </span>
                          <span className="flex items-center justify-center gap-2 text-slate-500">
                            <Clock className="h-4 w-4" /> {card.duration}
                          </span>
                        </div>
                        <span className="w-full mt-5 py-3.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[14px] font-black rounded-xl transition-colors">
                          Start Practice
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <aside className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit">
                <h3 className="text-[20px] font-black text-[#1E3A6E] mb-7">How Practice Test Works?</h3>
                <div className="grid gap-7">
                  {[
                    [<ClipboardList className="h-5 w-5" />, 'Choose a section', 'Select Reading, Listening or Writing.'],
                    [<CheckSquare className="h-5 w-5" />, 'Practice & Improve', 'Attempt questions and check your answers.'],
                    [<BarChart3 className="h-5 w-5" />, 'Track Progress', 'See your performance and improve your band score.']
                  ].map(([icon, title, desc]) => (
                    <div key={String(title)} className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-full bg-[#EFF4FB] text-[#1E3A6E] flex items-center justify-center shrink-0">
                        {icon}
                      </div>
                      <div>
                        <h4 className="font-black text-[#05162E] text-[15px]">{title}</h4>
                        <p className="text-[13px] text-slate-500 font-medium leading-relaxed mt-1">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 bg-[#F8FAFC] rounded-2xl p-5 text-center">
                  <p className="text-[14px] font-bold text-[#05162E] leading-relaxed">Practice is the key to success in IELTS!</p>
                  <p className="text-[13px] font-black text-slate-500 mt-3">- Keep Going</p>
                </div>
              </aside>
            </div>

            <div className="border-t border-slate-100 p-6 md:p-7">
              <h3 className="text-[18px] font-black text-[#05162E] mb-5">Tips for Practice</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  [<Timer className="h-6 w-6" />, 'Manage Your Time', 'Practice with timer to improve your speed.', 'bg-[#EFF4FB] text-[#1E3A6E]'],
                  [<Target className="h-6 w-6" />, 'Focus on Weak Areas', 'Identify your weak areas and work on them.', 'bg-emerald-50 text-emerald-600'],
                  [<BarChart3 className="h-6 w-6" />, 'Analyze Results', 'Review your performance and learn from mistakes.', 'bg-orange-50 text-orange-500'],
                  [<Star className="h-6 w-6" />, 'Stay Consistent', 'Practice daily and stay consistent.', 'bg-violet-50 text-violet-600']
                ].map(([icon, title, desc, colorClass]) => (
                  <div key={String(title)} className="flex items-start gap-4">
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                      {icon}
                    </div>
                    <div>
                      <h4 className="font-black text-[#05162E] text-[14px]">{title}</h4>
                      <p className="text-[13px] text-slate-500 font-medium leading-relaxed mt-1">{desc}</p>
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
                <div className="flex rounded-2xl bg-white border border-slate-200 p-1 shadow-sm">
                {readingCategories.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setReadingCategory(category);
                      setReadingQuestionType('all');
                    }}
                    className={`px-4 sm:px-6 py-3 rounded-xl text-[13px] font-black transition-all ${
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

            <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="lg:sticky lg:top-0 h-fit rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-[#294b77] px-5 py-4">
                  <h3 className="text-[15px] font-black text-white">Question Types</h3>
                  <p className="text-[12px] font-semibold text-white/70 mt-1">
                    {isCompleteReadingCategory || readingQuestionType === 'all'
                      ? `${activeReadingCategoryMeta.label} practice sets`
                      : `${activeReadingCategoryMeta.label} filtered by type`}
                  </p>
                </div>
                <div className="max-h-[calc(100vh-260px)] overflow-y-auto p-3">
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
                        }}
                        className={`w-full rounded-xl px-3 py-3 text-left transition-all flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-[#EFF4FB] text-[#294b77] ring-1 ring-[#294b77]/20'
                            : isDisabled
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-[#294b77]'
                        }`}
                      >
                        <span className="text-[13px] font-black leading-snug">{type.label}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                          isActive ? 'bg-white text-[#294b77]' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="min-w-0">
                <div className="mb-4 flex items-center justify-between gap-3">
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
                  <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center shadow-sm flex flex-col items-center">
                    <div className="w-16 h-16 bg-[#EFF4FB] rounded-full flex items-center justify-center mb-5">
                      <BookOpen className="h-8 w-8 text-[#294b77]" />
                    </div>
                    <h3 className="text-[19px] font-black text-[#05162E]">No practice set found</h3>
                    <p className="text-slate-500 mt-2 text-[14px] max-w-md">
                      No reading practice is available for {isCompleteReadingCategory || readingQuestionType === 'all' ? activeReadingCategoryMeta.label : activeReadingQuestionTypeMeta.label} yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
                    {filteredReadingCards.map(card => (
                      <div
                        key={card.id}
                        className={`bg-white rounded-2xl border ${card.test.is_locked ? 'border-slate-100 bg-slate-50/60' : 'border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1'} transition-all overflow-hidden`}
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

                          <h4 className="text-[18px] font-black text-[#05162E] leading-snug">{card.title}</h4>
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
                              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-[13px] font-black text-slate-600 hover:bg-slate-200"
                            >
                              Unlock Practice <Lock className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <button
                              disabled={startingTestId === card.test.id}
                              onClick={() => handleStartTest(card.test.id)}
                              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#294b77] py-3 text-[13px] font-black text-white shadow-sm hover:bg-[#203d63] disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pt-4 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setPracticeType(null);
                  setWritingPracticeType(null);
                }}
                className="inline-flex items-center gap-1.5 text-[12px] font-black text-slate-500 hover:text-[#1E3A6E]"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </button>
            </div>

            {/* Header Banner */}
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center rounded-2xl bg-white shadow-sm border border-slate-100 p-6 overflow-hidden shrink-0">
              {/* Left Side: Greeting */}
              <div className="relative z-10">
                <h1 className="text-[28px] font-black text-[#05162E] flex items-center gap-2">
                  Hi, {profile?.first_name || 'Kishor'}! 👋
                </h1>
                <p className="text-[14px] font-medium text-slate-500 mt-1">
                  Let's sharpen your writing skills and boost your <span className="font-bold text-[#294b77]">IELTS</span> score.
                </p>
              </div>
              
              {/* Right Side: Your Goal Box & Decorations */}
              <div className="relative z-20 mt-4 md:mt-0 flex items-center pr-2 -translate-y-2">
                <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-50 relative z-20">
                  <div className="h-10 w-10 rounded-full bg-[#294b77]/10 flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5 text-[#294b77]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Goal</p>
                    <p className="text-[14px] font-black text-[#294b77]">Band 7.0+</p>
                  </div>
                </div>
              </div>

              {/* Decorative background shapes inside the banner */}
              <div className="absolute right-0 bottom-0 top-0 w-1/2 pointer-events-none overflow-hidden rounded-r-2xl">
                {/* Large pale curve */}
                <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-slate-100/80 rounded-tl-full translate-x-12"></div>
                
                {/* Navy Blue Rectangles (exactly as in the screenshot) */}
                <div className="absolute right-0 bottom-0 flex items-end opacity-60">
                  {/* Left shorter block */}
                  <div className="w-16 h-10 bg-[#294b77] rounded-tl-md"></div>
                  {/* Middle taller block */}
                  <div className="w-10 h-16 bg-[#294b77]"></div>
                  {/* Right block */}
                  <div className="w-16 h-12 bg-[#294b77] opacity-80"></div>
                </div>
              </div>
            </div>

            {/* Title Section with Mascot */}
            <div className="mt-2 relative z-10 flex justify-between items-end">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#294b77]">Writing Practice</span>
                <h2 className="text-[32px] font-black text-[#05162E] mt-1 tracking-tight leading-tight">Choose Your Writing Practice</h2>
                <p className="text-[14px] font-medium text-slate-500 mt-1.5">Select the type of writing practice you want to focus on today.</p>
                <div className="w-12 h-1 bg-[#294b77] rounded-full mt-3"></div>
              </div>
              
              {/* Mascot Floating between Goal and Combo Card */}
              <div className="hidden lg:flex absolute right-10 bottom-0 translate-y-8 items-center justify-center animate-pulse-subtle z-20">
                <span className="text-[120px] drop-shadow-2xl" style={{ filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.15))' }}>🦉</span>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
              {writingPracticeCards.map((card, idx) => {
                const count = getWritingPracticeTestsByKind(card.type).length;
                
                // Determine styling based on card type utilizing brand colors
                let theme = {
                  border: 'border-[#294b77]/10',
                  bg: 'bg-[#294b77]/[0.02]',
                  iconBg: 'bg-white',
                  iconShadow: 'shadow-[0_4px_12px_rgb(41,75,119,0.15)]', // #294b77 shadow
                  iconText: 'text-[#294b77]',
                  btnGrad: 'from-[#294b77] to-[#294b77]',
                  shadow: 'hover:shadow-[0_12px_24px_rgb(41,75,119,0.12)]',
                  tipBadge: 'bg-[#294b77]/10 text-[#294b77]',
                  tipText: 'Improve data description skills'
                };
                
                if (card.type === 'task2') {
                  theme = {
                    border: 'border-teal-100',
                    bg: 'bg-teal-50/30',
                    iconBg: 'bg-white',
                    iconShadow: 'shadow-[0_4px_12px_rgb(13,148,136,0.1)]', // teal-600 shadow
                    iconText: 'text-teal-600',
                    btnGrad: 'from-teal-500 to-teal-600',
                    shadow: 'hover:shadow-[0_12px_24px_rgb(13,148,136,0.08)]',
                    tipBadge: 'bg-teal-50 text-teal-700',
                    tipText: 'Build strong essay writing skills'
                  };
                } else if (card.type === 'combo') {
                  theme = {
                    border: 'border-[#ef5f55]/10',
                    bg: 'bg-[#ef5f55]/[0.02]',
                    iconBg: 'bg-white',
                    iconShadow: 'shadow-[0_4px_12px_rgb(239,95,85,0.15)]', // #ef5f55 shadow
                    iconText: 'text-[#ef5f55]',
                    btnGrad: 'from-[#ef5f55] to-[#ef5f55]',
                    shadow: 'hover:shadow-[0_12px_24px_rgb(239,95,85,0.12)]',
                    tipBadge: 'bg-[#ef5f55]/10 text-[#ef5f55]',
                    tipText: 'Simulate real IELTS writing test'
                  };
                }

                return (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => setWritingPracticeType(card.type)}
                    className={`relative rounded-[24px] border ${theme.border} ${theme.bg} shadow-sm hover:-translate-y-1.5 transition-all duration-300 overflow-hidden text-center flex flex-col items-center p-6 group ${theme.shadow}`}
                  >
                    <div className="absolute top-4 left-0 right-0 flex justify-center opacity-[0.03] pointer-events-none">
                      <span className="font-black text-3xl tracking-widest uppercase">JAWAAF</span>
                    </div>

                    <div className={`relative h-16 w-16 rounded-full ${theme.iconBg} ${theme.iconShadow} flex items-center justify-center mb-6 shrink-0`}>
                      {card.type === 'task1' ? <PenLine className={`h-6 w-6 ${theme.iconText}`} /> :
                       card.type === 'task2' ? <PenLine className={`h-6 w-6 ${theme.iconText} rotate-12`} /> :
                       <ClipboardList className={`h-6 w-6 ${theme.iconText}`} />}
                    </div>
                    
                    <h3 className="text-[20px] font-black text-[#05162E]">{card.title}</h3>
                    <p className="text-[12px] text-slate-500 font-medium leading-relaxed mt-2 min-h-[48px]">
                      {card.description}
                    </p>
                    
                    <div className="w-full flex items-center justify-center gap-4 text-[11px] font-bold text-slate-400 mt-5 mb-6">
                      <span className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> {count} Tests</span>
                      <div className="w-[1px] h-3 bg-slate-200"></div>
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {card.duration}</span>
                    </div>
                    
                    <div className="w-full flex flex-col items-center mt-auto">
                      <span className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${theme.btnGrad} py-3 text-[14px] font-black text-white shadow-sm transition-transform group-hover:scale-[1.02]`}>
                        Start {card.title} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                      
                      <div className={`mt-4 px-4 py-1.5 rounded-full ${theme.tipBadge}`}>
                        <span className="text-[10px] font-bold">{theme.tipText}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Tip Bar */}
            <div className="mt-2 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-lg">🚀</span>
                </div>
                <p className="text-[13px] font-medium text-slate-600 text-left">
                  <span className="font-bold text-[#F59E0B]">💡 Tip:</span> Practice regularly and review your answers to improve faster! Consistency is the key to success.
                </p>
              </div>
              <button className="whitespace-nowrap px-4 py-2.5 bg-white border border-slate-200 text-[#1E3A6E] text-[12px] font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shrink-0 shadow-sm">
                <BookOpen className="h-3.5 w-3.5" /> View Writing Tips <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
	        ) : visibleTests.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleTests.map(test => (
              <div 
                key={test.id} 
                className={`bg-white rounded-2xl border ${test.is_locked ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1'} flex flex-col relative transition-all duration-300`}
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

                  <h3 className="text-[18px] font-black text-[#05162E] leading-snug mb-2">{test.title}</h3>
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
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        Unlock Test <Lock className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <button 
                        disabled={startingTestId === test.id}
                        onClick={() => handleStartTest(test.id)}
                        className="w-full py-3 text-white text-[13px] font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 bg-[#1E3A6E] hover:bg-[#162d57] disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}

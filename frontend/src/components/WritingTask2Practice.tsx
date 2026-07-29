import React, { useState } from 'react';
import { ArrowLeft, Clock, PenLine, MessageSquare, Users, Lightbulb, Puzzle, Calendar, Bookmark, FileText, ChevronRight, LineChart, Search, LayoutGrid, List, Target, ShieldCheck, Award, ClipboardCheck } from 'lucide-react';

interface MockTest {
  id: string;
  title: string;
  description: string;
  is_demo: boolean;
  duration: number;
  sections?: Array<{
    type: string;
    question_groups?: Array<{
      questions?: Array<{
        question_text?: string;
        question_type?: string;
        extra_data_json?: Record<string, any>;
      }>;
    }>;
  }>;
}

interface Props {
  tests: MockTest[];
  onBack: () => void;
  onStartTest: (testId: string) => void;
}

const CATEGORIES = [
  {
    id: 'Opinion Essay',
    label: 'Opinion Essay',
    icon: <MessageSquare className="w-4 h-4" />,
    img3d: '/images/task2-assets/IMG_6538.PNG',
    heroImg: '/images/task2-assets/IMG_6538.PNG',
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    lightBg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    iconColor: 'text-blue-500',
    desc: 'Write about a topic and give your personal opinion.',
    guide: 'State your position clearly, then support it with reasons, examples and a focused conclusion.'
  },
  {
    id: 'Discussion Essay',
    label: 'Discussion Essay',
    icon: <Users className="w-4 h-4" />,
    img3d: '/images/task2-assets/IMG_6539.PNG',
    heroImg: '/images/task2-assets/IMG_6539.PNG',
    color: 'bg-[#05162E]',
    hoverColor: 'hover:bg-[#1a365d]',
    lightBg: 'bg-red-50',
    text: 'text-red-500',
    border: 'border-red-100',
    iconColor: 'text-red-500',
    desc: 'Discuss both views and present a balanced argument.',
    guide: 'Explain both sides fairly, compare their strengths, and keep your final view consistent.'
  },
  {
    id: 'Opinion-Discussion Essay',
    label: 'Opinion-Discussion Essay',
    icon: <Lightbulb className="w-4 h-4" />,
    img3d: '/images/task2-assets/IMG_6540.PNG',
    heroImg: '/images/task2-assets/IMG_6540.PNG',
    color: 'bg-[#05162E]',
    hoverColor: 'hover:bg-[#1a365d]',
    lightBg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-100',
    iconColor: 'text-purple-500',
    desc: 'Discuss both views and give your own opinion.',
    guide: 'Cover each view in separate body paragraphs, then make your own stance unmistakable.'
  },
  {
    id: 'Mixed Essay',
    label: 'Mixed Essay',
    icon: <Puzzle className="w-4 h-4" />,
    img3d: '/images/task2-assets/IMG_6541.PNG',
    heroImg: '/images/task2-assets/IMG_6541.PNG',
    color: 'bg-[#05162E]',
    hoverColor: 'hover:bg-[#1a365d]',
    lightBg: 'bg-orange-50',
    text: 'text-orange-500',
    border: 'border-orange-100',
    iconColor: 'text-orange-500',
    desc: 'A mix of question types to test your all-round writing skills.',
    guide: 'Read both question parts carefully and make sure every paragraph answers the exact prompt.'
  },
];

const DIFFICULTIES = [
  { id: 'All', label: 'All Questions', dot: null },
  { id: 'Easy', label: 'Easy', dot: 'bg-green-500' },
  { id: 'Medium', label: 'Medium', dot: 'bg-yellow-500' },
  { id: 'Legend', label: 'Hard', dot: 'bg-red-500' },
  { id: 'Recently Added', label: 'Recently Added', icon: <Calendar className="w-3.5 h-3.5" /> }
];

const TASK2_HERO_COVER_IMAGE = '/images/task2-assets/hero-bg-cover.png';

function ImageWithFallback({ src, alt, fallback, className }: { src: string, alt: string, fallback: React.ReactNode, className?: string }) {
  const [error, setError] = useState(false);

  React.useEffect(() => {
    setError(false);
  }, [src]);

  if (error) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}

export default function WritingTask2Practice({ tests, onBack, onStartTest }: Props) {
  // Navigation State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // View 1 State
  const [activeTab, setActiveTab] = useState('All');
  
  // View 2 State
  const [activeDifficulty, setActiveDifficulty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getTestCategory = (test: MockTest) => {
    let category = 'Opinion Essay';
    if (test.description && test.description.startsWith('{')) {
      try {
        const parsed = JSON.parse(test.description);
        category = parsed.essayCategory || 'Opinion Essay';
      } catch (e) { }
    } else {
      const title = test.title.toLowerCase();
      if (title.includes('discussion') && title.includes('opinion')) return 'Opinion-Discussion Essay';
      if (title.includes('discussion')) return 'Discussion Essay';
      if (title.includes('opinion')) return 'Opinion Essay';
      if (title.includes('mixed') || title.includes('problem') || title.includes('advantage')) return 'Mixed Essay';
    }
    const validIds = CATEGORIES.map(c => c.id);
    if (!validIds.includes(category)) return 'Opinion Essay';
    return category;
  };

  const getTestDescription = (test: MockTest) => {
    if (test.description && test.description.startsWith('{')) {
      try {
        return JSON.parse(test.description).text || '';
      } catch (e) { }
    }
    return test.description || '';
  };

  const getTestDifficulty = (test: MockTest) => {
    if (test.description && test.description.startsWith('{')) {
      try {
        return JSON.parse(test.description).difficulty || 'Medium';
      } catch (e) { }
    }
    return 'Medium';
  };

  const getDifficultyMeta = (difficulty: string) =>
    DIFFICULTIES.find(d => d.id === difficulty) || DIFFICULTIES[2];

  const getDifficultyLabel = (difficulty: string) =>
    getDifficultyMeta(difficulty).label;

  const getQuestionPreview = (test: MockTest) => {
    const descriptionText = getTestDescription(test).trim();
    if (descriptionText) return descriptionText;

    const writingQuestion = test.sections
      ?.flatMap(section => section.question_groups || [])
      .flatMap(group => group.questions || [])
      .find(question => question.question_type === 'WRITING_TASK' || question.question_text);

    return writingQuestion?.question_text?.trim() || test.title;
  };

  const getCategoryTests = (categoryId: string) =>
    tests.filter(test => getTestCategory(test) === categoryId);

  const getCategoryDifficultySummary = (categoryTests: MockTest[]) => {
    if (categoryTests.length === 0) return 'Coming soon';
    const levels = [...new Set(categoryTests.map(getTestDifficulty))];
    if (levels.length === 1) return getDifficultyLabel(levels[0]);
    return `${levels.length} levels`;
  };

  // ---------------------------------------------------------------------------
  // VIEW 1: CATEGORY SELECTION
  // ---------------------------------------------------------------------------
  if (!selectedCategory) {
    const displayedCategories = activeTab === 'All' 
      ? CATEGORIES 
      : CATEGORIES.filter(c => c.id === activeTab);

    return (
      <div className="flex flex-col gap-6 h-full max-w-[1400px] mx-auto pb-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-[#05162E] transition-colors w-fit font-semibold text-[13px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Hero Banner Container */}
        <div className="relative w-full rounded-[32px] overflow-hidden bg-gradient-to-r from-white via-white to-[#F4F8FC] border border-slate-100 shadow-sm pt-14 pb-14 px-12 flex items-center justify-between min-h-[280px] mb-4">
          <div className="absolute inset-0 z-0 flex justify-end items-end pr-[260px]">
            <img
              src="/images/task2-assets/hero-bg-main.png"
              alt=""
              className="h-[280px] w-auto object-contain max-w-none mix-blend-multiply"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 100%)',
                maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 100%)'
              }}
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
          </div>
          <div className="relative z-10 min-w-[500px]">
            <div className="inline-flex items-center gap-2 text-blue-600 text-[12px] font-black tracking-widest uppercase mb-4">
              <PenLine className="h-4 w-4" /> WRITING TASK 2
            </div>
            <h1 className="text-[44px] font-black text-[#05162E] leading-tight mb-3 tracking-tight whitespace-nowrap">
              Writing Task 2 Practice Tests
            </h1>
            <p className="text-[16px] text-slate-500 font-medium">
              Choose an essay type and start practicing with<br />official IELTS-style questions.
            </p>
          </div>
          <div className="relative z-[20] bg-white rounded-[24px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col gap-3 w-[260px] border border-slate-50 shrink-0 translate-x-5">
            <div className="flex items-center gap-3">
              <h3 className="text-[38px] font-black text-[#05162E] leading-none tracking-tight">4</h3>
              <p className="text-[14px] font-bold text-[#05162E]">Essay Types</p>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {CATEGORIES.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center bg-white shadow-sm border border-slate-100 ${cat.iconColor}`}>
                    {cat.icon}
                  </div>
                  <span className="text-[13px] font-bold text-[#05162E]">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <button
            onClick={() => setActiveTab('All')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-[13.5px] font-bold transition-all shadow-sm ${activeTab === 'All'
              ? 'bg-[#05162E] text-white shadow-md border border-[#05162E]'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-[13.5px] font-bold transition-all shadow-sm ${activeTab === cat.id
                ? 'bg-[#05162E] text-white shadow-md border border-[#05162E]'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              <div className={`${activeTab === cat.id ? 'text-white' : cat.iconColor}`}>
                {cat.icon}
              </div>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedCategories.map((cat) => {
            const categoryTests = getCategoryTests(cat.id);
            const demoCount = categoryTests.filter(test => test.is_demo).length;
            const difficultySummary = getCategoryDifficultySummary(categoryTests);

            return (
              <div
                key={cat.id}
                className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
              <div className="flex justify-between items-start mb-6">
                <div className={`px-3 py-1.5 rounded-full ${cat.lightBg} ${cat.text} text-[9px] font-black tracking-widest uppercase`}>
                  {cat.label}
                </div>
                {demoCount > 0 && (
                  <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black tracking-widest uppercase border border-emerald-100">
                    {demoCount} Free
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center h-[130px] mb-4">
                <ImageWithFallback
                  src={cat.img3d}
                  alt={cat.label}
                  className="w-auto h-[120px] object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                  fallback={
                    <div className={`w-[110px] h-[110px] rounded-3xl ${cat.lightBg} border-2 border-dashed ${cat.border} flex flex-col items-center justify-center text-center p-3`}>
                      <span className={`text-xs font-bold ${cat.text}`}>
                        {cat.label}<br />Image
                      </span>
                    </div>
                  }
                />
              </div>

              <div className="flex flex-col flex-1">
                <h3 className="text-[20px] font-black text-[#05162E] leading-tight mb-2 tracking-tight">{cat.label}</h3>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed line-clamp-2 mb-5">
                  {cat.desc}
                </p>

                <div className="flex items-center gap-4 text-[12px] font-bold text-slate-400 mt-auto mb-4">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 40 min</span>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <span className="flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> {categoryTests.length || 0} Tests</span>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    {difficultySummary}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCategory(cat.id)}
                className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all hover:opacity-90 group/btn"
                style={{ background: 'linear-gradient(to right, #294b77 0%, #16243a 100%)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#ef5f55')}
                onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(to right, #294b77 0%, #16243a 100%)')}
              >
                Start Practice
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Features Bar */}
        <div className="w-full rounded-2xl border border-slate-100 bg-white shadow-sm px-8 py-5 grid grid-cols-4 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#05162E] leading-tight">Official IELTS Format</p>
              <p className="text-[11px] text-slate-400 font-medium">100% exam-style essays</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#05162E] leading-tight">Band 9 Model Answers</p>
              <p className="text-[11px] text-slate-400 font-medium">Learn from top quality essays</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#05162E] leading-tight">Detailed Evaluation</p>
              <p className="text-[11px] text-slate-400 font-medium">Improve with AI feedback</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#05162E] leading-tight">Track Your Progress</p>
              <p className="text-[11px] text-slate-400 font-medium">Monitor your band score</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW 2: QUESTION LIST FOR SELECTED CATEGORY
  // ---------------------------------------------------------------------------
  
  const selectedCatConfig = CATEGORIES.find(c => c.id === selectedCategory)!;
  const selectedCategoryTests = getCategoryTests(selectedCategory);
  const selectedDifficultySummary = getCategoryDifficultySummary(selectedCategoryTests);
  
  const filteredTests = tests.filter(test => {
    const categoryMatch = getTestCategory(test) === selectedCategory;
    const diffMatch = activeDifficulty === 'All' || activeDifficulty === 'Recently Added' || getTestDifficulty(test) === activeDifficulty;
    const prompt = getQuestionPreview(test).toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const searchMatch = !query || prompt.includes(query) || test.title.toLowerCase().includes(query);
    return categoryMatch && diffMatch && searchMatch;
  });

  if (activeDifficulty === 'Recently Added') {
    filteredTests.reverse();
  }

  return (
    <div className="flex h-full flex-col gap-5 pb-5">
      <button
        onClick={() => setSelectedCategory(null)}
        className="flex w-fit items-center gap-2 text-[14px] font-bold text-slate-500 transition-colors hover:text-[#05162E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Writing Task 2
      </button>

      <section className="relative min-h-[310px] overflow-hidden rounded-[28px] border border-[#E7EDF6] bg-white shadow-[0_18px_45px_rgba(5,22,46,0.05)]">
        <img
          src={TASK2_HERO_COVER_IMAGE}
          alt=""
          className="absolute -bottom-2 right-[300px] z-0 hidden h-[305px] w-auto max-w-none object-contain md:block 2xl:right-[340px] 2xl:h-[325px]"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 7%, black 18%, black 100%)',
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 7%, black 18%, black 100%)'
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        <div className="relative z-20 grid min-h-[310px] items-center gap-8 px-7 py-8 lg:grid-cols-[minmax(0,1fr)_265px] xl:px-10">
          <div className="max-w-[640px]">
            <div className="mb-4 inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-[#7C5CFF]">
              <PenLine className="h-4 w-4" />
              Writing Task 2
            </div>
            <h1 className="mb-3 text-[42px] font-black leading-none tracking-tight text-[#05162E] xl:text-[46px]">
              {selectedCatConfig.label}
            </h1>
            <p className="max-w-[560px] text-[14.5px] font-semibold leading-6 text-slate-500">
              {selectedCatConfig.desc} Practice with real IELTS-style questions and improve your writing.
            </p>

            <div className="mt-8 grid max-w-[590px] gap-3 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
              {[
                { icon: Clock, title: '40 min', subtitle: 'Recommended time' },
                { icon: PenLine, title: '1 Essay', subtitle: 'Per question' },
                { icon: LineChart, title: 'All Levels', subtitle: 'Beginner to Advanced' }
              ].map((item, index) => (
                <div key={item.title} className={`flex min-w-0 items-center gap-3 ${index === 0 ? 'pr-6' : 'px-6'}`}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-100 bg-white text-slate-400 shadow-sm">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-black leading-tight text-[#05162E]">{item.title}</span>
                    <span className="block whitespace-normal text-[11.5px] font-bold leading-snug text-slate-400">{item.subtitle}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="relative z-30 w-full max-w-[265px] rounded-[22px] bg-white p-6 shadow-[0_18px_40px_rgba(5,22,46,0.07)]">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#F0EAFE] text-[#7C5CFF]">
              {selectedCatConfig.icon}
            </div>
            <h3 className="mb-2 break-words text-[14px] font-black leading-snug text-[#05162E]">About {selectedCatConfig.label}s</h3>
            <p className="text-[12px] font-semibold leading-5 text-slate-500">{selectedCatConfig.guide}</p>
            <div className="mt-4 flex items-center gap-1 text-[13px] font-black text-[#2563EB]">
              View Guide <ArrowLeft className="h-4 w-4 rotate-180" />
            </div>
          </aside>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {DIFFICULTIES.map(diff => {
            const isActive = activeDifficulty === diff.id;
            return (
              <button
                key={diff.id}
                onClick={() => setActiveDifficulty(diff.id)}
                className={`flex h-12 items-center gap-2 rounded-full px-6 text-[13px] font-black transition-all ${
                  isActive
                    ? 'bg-[#05162E] text-white shadow-[0_12px_25px_rgba(5,22,46,0.16)]'
                    : 'border border-[#E2E8F0] bg-white text-slate-600 shadow-sm hover:border-[#CBD5E1]'
                }`}
              >
                {diff.dot && <span className={`h-2.5 w-2.5 rounded-full ${diff.dot}`}></span>}
                {diff.icon && <span className={isActive ? 'text-white' : 'text-slate-400'}>{diff.icon}</span>}
                {diff.label}
              </button>
            );
          })}
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <label className="flex h-12 w-full items-center gap-3 rounded-full border border-[#E2E8F0] bg-white px-5 text-slate-400 shadow-sm sm:w-[310px]">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search questions..."
              className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-[#05162E] outline-none placeholder:text-slate-400"
            />
            <Search className="h-5 w-5" />
          </label>
          <div className="flex h-12 items-center rounded-full border border-[#E2E8F0] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`grid h-10 w-10 place-items-center rounded-full transition-all ${viewMode === 'grid' ? 'bg-[#7C5CFF] text-white shadow-sm' : 'text-slate-400 hover:text-[#05162E]'}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`grid h-10 w-10 place-items-center rounded-full transition-all ${viewMode === 'list' ? 'bg-[#7C5CFF] text-white shadow-sm' : 'text-slate-400 hover:text-[#05162E]'}`}
              aria-label="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4' : 'grid grid-cols-1 gap-4'}>
        {filteredTests.map((test, idx) => {
          const difficulty = getTestDifficulty(test);
          const diffConfig = getDifficultyMeta(difficulty);
          const testNumber = (idx + 1).toString().padStart(2, '0');
          const prompt = getQuestionPreview(test);

          return (
            <button
              key={test.id}
              type="button"
              className={`group flex cursor-pointer flex-col rounded-[22px] border border-[#E2E8F0] bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(5,22,46,0.08)] ${
                viewMode === 'list' ? 'min-h-[190px]' : 'min-h-[280px]'
              }`}
              onClick={() => onStartTest(test.id)}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <span className="rounded-lg bg-[#F2ECFF] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#7C5CFF]">
                  {selectedCatConfig.label}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[11px] font-black uppercase text-[#05162E]">
                  {diffConfig.dot && <span className={`h-2.5 w-2.5 rounded-full ${diffConfig.dot}`}></span>}
                  {getDifficultyLabel(difficulty)}
                </span>
              </div>

              <div className="mb-4 text-[36px] font-black leading-none tracking-tight text-[#05162E]">{testNumber}</div>
              <p className={`font-bold leading-6 text-slate-600 ${viewMode === 'grid' ? 'line-clamp-4 text-[15px]' : 'line-clamp-2 text-[16px]'}`}>
                {prompt}
              </p>

              <div className="mt-auto pt-6">
                <div className="mb-5 flex items-center justify-between border-t border-slate-100 pt-5">
                  <span className="flex items-center gap-2 text-[13px] font-black text-slate-400">
                    <Clock className="h-4 w-4" /> {test.duration || 40} min
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-[#6D6FF5] transition-colors group-hover:bg-[#F2ECFF]">
                    <Bookmark className="h-4 w-4" />
                  </span>
                </div>
                <span className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F1EAFE] text-[14px] font-black text-[#7C5CFF] transition-colors group-hover:bg-[#E8DCFF]">
                  View Question <ArrowLeft className="h-4 w-4 rotate-180" />
                </span>
              </div>
            </button>
          );
        })}
        {filteredTests.length === 0 && (
          <div className="col-span-full grid min-h-[220px] place-items-center rounded-[24px] border-2 border-dashed border-slate-200 bg-white text-center">
            <div>
              <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-[15px] font-black text-[#05162E]">No questions found</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-400">Try changing your filters or search term.</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-1 grid grid-cols-1 items-center gap-5 rounded-[22px] border border-[#EDE7FF] bg-[#F6F0FF] px-6 py-5 shadow-sm xl:grid-cols-[minmax(260px,1.4fr)_1fr_1fr_1fr] xl:px-8">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#7C5CFF] shadow-sm">
            <Target className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[15px] font-black text-[#6D4DDB]">Improve Your Writing</p>
            <p className="text-[12px] font-semibold text-slate-500">Practice regularly, review model answers and get better every day.</p>
          </div>
        </div>
        {[
          { icon: ShieldCheck, title: 'Official IELTS Questions', subtitle: '100% authentic & up to date' },
          { icon: Award, title: 'Band 9 Model Answers', subtitle: 'Learn from top quality essays' },
          { icon: ClipboardCheck, title: 'Detailed Evaluation', subtitle: 'Improve with AI feedback' }
        ].map(item => (
          <div key={item.title} className="flex items-center gap-4 border-t border-[#E4D8FF] pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#7C5CFF] shadow-sm">
              <item.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[13px] font-black text-[#05162E]">{item.title}</p>
              <p className="text-[12px] font-semibold text-slate-500">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

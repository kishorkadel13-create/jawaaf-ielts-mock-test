import React, { useState } from 'react';
import { ArrowLeft, Clock, PenLine, MessageSquare, Users, Lightbulb, Puzzle, Calendar, Bookmark, FileText, ChevronRight, LineChart } from 'lucide-react';

interface MockTest {
  id: string;
  title: string;
  description: string;
  is_demo: boolean;
  duration: number;
}

interface Props {
  tests: MockTest[];
  onBack: () => void;
  onStartTest: (testId: string) => void;
}

const CATEGORIES = [
  { id: 'Opinion Essay', label: 'Opinion Essay', icon: <MessageSquare className="w-4 h-4" />, img3d: '/images/task2-assets/card-opinion.png', color: 'bg-blue-600', hoverColor: 'hover:bg-blue-700', lightBg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', iconColor: 'text-blue-500', desc: 'Write about a topic and give your personal opinion.' },
  { id: 'Discussion Essay', label: 'Discussion Essay', icon: <Users className="w-4 h-4" />, img3d: '/images/task2-assets/card-discussion.png', color: 'bg-[#05162E]', hoverColor: 'hover:bg-[#1a365d]', lightBg: 'bg-red-50', text: 'text-red-500', border: 'border-red-100', iconColor: 'text-red-500', desc: 'Discuss both views and present a balanced argument.' },
  { id: 'Opinion-Discussion Essay', label: 'Opinion-Discussion Essay', icon: <Lightbulb className="w-4 h-4" />, img3d: '/images/task2-assets/card-opinion-discussion.png', color: 'bg-[#05162E]', hoverColor: 'hover:bg-[#1a365d]', lightBg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', iconColor: 'text-purple-500', desc: 'Discuss both views and give your own opinion.' },
  { id: 'Mixed Essay', label: 'Mixed Essay', icon: <Puzzle className="w-4 h-4" />, img3d: '/images/task2-assets/card-mixed.png', color: 'bg-[#05162E]', hoverColor: 'hover:bg-[#1a365d]', lightBg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100', iconColor: 'text-orange-500', desc: 'A mix of question types to test your all-round writing skills.' },
];

const DIFFICULTIES = [
  { id: 'All', label: 'All Questions', dot: null },
  { id: 'Easy', label: 'Easy', dot: 'bg-green-500' },
  { id: 'Medium', label: 'Medium', dot: 'bg-yellow-500' },
  { id: 'Legend', label: 'Legend', dot: 'bg-red-500' },
  { id: 'Recently Added', label: 'Recently Added', icon: <Calendar className="w-3.5 h-3.5" /> }
];

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
          <div className="relative z-200 bg-white rounded-[24px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col gap-3 w-[260px] border border-slate-50 shrink-0 translate-x-5 ">
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
          {displayedCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`px-3 py-1.5 rounded-full ${cat.lightBg} ${cat.text} text-[9px] font-black tracking-widest uppercase`}>
                  {cat.label}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black tracking-widest uppercase border border-emerald-100">
                  FREE DEMO
                </div>
              </div>

              <div className="flex items-center justify-center h-[160px] mb-6">
                <ImageWithFallback
                  src={cat.img3d}
                  alt={cat.label}
                  className="w-auto h-[140px] object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                  fallback={
                    <div className={`w-[140px] h-[140px] rounded-3xl ${cat.lightBg} border-2 border-dashed ${cat.border} flex flex-col items-center justify-center text-center p-3`}>
                      <span className={`text-xs font-bold ${cat.text}`}>
                        {cat.label}<br />Image
                      </span>
                    </div>
                  }
                />
              </div>

              <div className="flex flex-col flex-1">
                <h3 className="text-[20px] font-black text-[#05162E] leading-tight mb-2 tracking-tight">{cat.label} 1</h3>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed line-clamp-2 mb-5">
                  {cat.desc}
                </p>

                <div className="flex items-center gap-4 text-[12px] font-bold text-slate-400 mt-auto mb-5">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 40 min</span>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <span className="flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> 1 Essay</span>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <span className={`flex items-center gap-1.5 text-emerald-500`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Easy
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all ${cat.color} ${cat.hoverColor}`}
              >
                Start Practice
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW 2: QUESTION LIST FOR SELECTED CATEGORY
  // ---------------------------------------------------------------------------
  
  const selectedCatConfig = CATEGORIES.find(c => c.id === selectedCategory)!;
  
  const filteredTests = tests.filter(test => {
    const categoryMatch = getTestCategory(test) === selectedCategory;
    const diffMatch = activeDifficulty === 'All' || activeDifficulty === 'Recently Added' || getTestDifficulty(test) === activeDifficulty;
    return categoryMatch && diffMatch;
  });

  if (activeDifficulty === 'Recently Added') {
    filteredTests.reverse();
  }

  return (
    <div className="flex flex-col gap-6 h-full max-w-[1400px] mx-auto pb-8">
      {/* Back Button */}
      <button
        onClick={() => setSelectedCategory(null)}
        className="flex items-center gap-2 text-slate-500 hover:text-[#05162E] transition-colors w-fit font-semibold text-[13px]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Writing Task 2
      </button>

      {/* Category Hero Banner */}
      <div className="relative w-full rounded-[32px] overflow-hidden bg-gradient-to-r from-white via-white to-[#F4F8FC] border border-slate-100 shadow-sm pt-14 pb-14 px-12 flex items-center justify-between min-h-[280px] mb-4">
        <div className="absolute inset-0 z-0 flex justify-end items-end pr-[260px]">
          <img
            src="/images/task2-assets/hero-bg-opinion.png"
            alt=""
            className="h-[280px] w-auto object-contain max-w-none mix-blend-multiply"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 100%)',
              maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 100%)'
            }}
            onError={(e) => e.currentTarget.style.display = 'none'}
          />
        </div>
        
        <div className="relative z-10 max-w-[600px]">
          <div className={`inline-flex items-center gap-2 ${selectedCatConfig.text} text-[12px] font-black tracking-widest uppercase mb-4`}>
            <PenLine className="h-4 w-4" /> WRITING TASK 2
          </div>
          <h1 className="text-[44px] font-black text-[#05162E] leading-tight mb-3 tracking-tight">
            {selectedCatConfig.label}
          </h1>
          <p className="text-[16px] text-slate-500 font-medium max-w-[400px] mb-6">
            {selectedCatConfig.desc} Practice with real IELTS-style questions and improve your writing.
          </p>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#05162E] leading-tight">40 min</p>
                <p className="text-[11px] font-bold text-slate-400">Recommended time</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                <PenLine className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#05162E] leading-tight">1 Essay</p>
                <p className="text-[11px] font-bold text-slate-400">Per question</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                <LineChart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#05162E] leading-tight">All Levels</p>
                <p className="text-[11px] font-bold text-slate-400">Beginner to Advanced</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-200 bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col gap-3 w-[260px] border border-slate-50 shrink-0 translate-x-5">
          <div className={`w-10 h-10 rounded-xl ${selectedCatConfig.lightBg} ${selectedCatConfig.text} flex items-center justify-center mb-1`}>
            {selectedCatConfig.icon}
          </div>
          <h3 className="text-[15px] font-black text-[#05162E] leading-tight">About {selectedCatConfig.label}s</h3>
          <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
            Express your personal opinion clearly and support it with relevant examples, reasons and explanations.
          </p>
          <button className={`text-[13px] font-bold ${selectedCatConfig.text} flex items-center gap-1 mt-1 hover:opacity-80 transition-opacity`}>
            View Guide <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Secondary Filters (Difficulty) */}
      <div className="flex flex-wrap items-center gap-3 mb-2">
        {DIFFICULTIES.map(diff => {
          const isActive = activeDifficulty === diff.id;
          return (
            <button
              key={diff.id}
              onClick={() => setActiveDifficulty(diff.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-bold transition-all shadow-sm ${isActive
                ? 'bg-[#05162E] text-white shadow-md border border-[#05162E]'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              {diff.dot && (
                <div className={`w-2 h-2 rounded-full ${diff.dot}`}></div>
              )}
              {diff.icon && (
                <div className={`${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {diff.icon}
                </div>
              )}
              {diff.label}
            </button>
          );
        })}
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredTests.map((test, idx) => {
          const difficulty = getTestDifficulty(test);
          const diffConfig = DIFFICULTIES.find(d => d.id === difficulty) || DIFFICULTIES[2];
          const testNumber = (idx + 1).toString().padStart(2, '0');

          return (
            <div
              key={test.id}
              className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer relative"
              onClick={() => onStartTest(test.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`px-2.5 py-1 rounded-md ${selectedCatConfig.lightBg} ${selectedCatConfig.text} text-[8.5px] font-black tracking-widest uppercase`}>
                  {selectedCatConfig.label}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${diffConfig.dot}`}></div>
                  <span className="text-[10px] font-bold text-[#05162E] uppercase">{difficulty}</span>
                </div>
              </div>

              <div className="text-[32px] font-black text-[#05162E] leading-none mb-3 tracking-tighter">
                {testNumber}
              </div>

              <p className="text-[14px] text-slate-700 font-semibold leading-relaxed mb-6 line-clamp-4 flex-1">
                {getTestDescription(test) || test.title}
              </p>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {test.duration} min
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                  <Bookmark className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[13px] font-bold text-[#8B5CF6] hover:text-[#7C3AED] transition-colors w-full bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 py-3 rounded-xl">
                View Question <ArrowLeft className="w-4 h-4 rotate-180" />
              </div>
            </div>
          );
        })}
        {filteredTests.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
            <FileText className="w-12 h-12 mb-3 text-slate-300" />
            <p className="text-sm font-bold text-[#05162E]">No questions found</p>
            <p className="text-xs">Try changing your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

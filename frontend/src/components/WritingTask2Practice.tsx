import React, { useState } from 'react';
import { ArrowLeft, Clock, PenLine, ChevronRight, MessageSquare, Users, Lightbulb, Puzzle, ShieldCheck, Award, Target, LineChart, Calendar } from 'lucide-react';

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
  { id: 'All', label: 'All', icon: null },
  { id: 'Opinion Essay', label: 'Opinion Essay', icon: <MessageSquare className="w-4 h-4" />, img3d: '/images/task2-icons/opinion-essay.png', color: 'bg-[#1a365d]', hoverColor: 'hover:bg-[#152e52]', lightBg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', iconColor: 'text-blue-500' },
  { id: 'Discussion Essay', label: 'Discussion Essay', icon: <Users className="w-4 h-4" />, img3d: '/images/task2-icons/discussion-essay.png', color: 'bg-[#1a365d]', hoverColor: 'hover:bg-[#152e52]', lightBg: 'bg-red-50', text: 'text-red-500', border: 'border-red-100', iconColor: 'text-red-500' },
  { id: 'Opinion-Discussion Essay', label: 'Opinion-Discussion Essay', icon: <Lightbulb className="w-4 h-4" />, img3d: '/images/task2-icons/opinion-discussion-essay.png', color: 'bg-[#1a365d]', hoverColor: 'hover:bg-[#152e52]', lightBg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', iconColor: 'text-purple-500' },
  { id: 'Mixed Essay', label: 'Mixed Essay', icon: <Puzzle className="w-4 h-4" />, img3d: '/images/task2-icons/mixed-essay.png', color: 'bg-[#1a365d]', hoverColor: 'hover:bg-[#152e52]', lightBg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100', iconColor: 'text-orange-500' },
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
  const [activeCategory, setActiveCategory] = useState('All');
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
    // Fallback normalization just in case
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

  const filteredTests = tests.filter(test => {
    const categoryMatch = activeCategory === 'All' || getTestCategory(test) === activeCategory;
    const diffMatch = activeDifficulty === 'All' || activeDifficulty === 'Recently Added' || getTestDifficulty(test) === activeDifficulty;
    return categoryMatch && diffMatch;
  });

  // Simple recently added sort
  if (activeDifficulty === 'Recently Added') {
    filteredTests.reverse(); // Assuming tests are fetched by created_at asc usually
  }

  return (
    <div className="flex flex-col gap-6 h-full max-w-[1400px] mx-auto pb-8">
      {/* Hero Banner Container */}
      <div className="relative w-full rounded-[32px] overflow-hidden bg-gradient-to-r from-white via-white to-[#F4F8FC] border border-slate-100 shadow-sm pt-14 pb-14 px-12 flex items-center justify-between min-h-[280px] mb-4">

        {/* Background Image (contains Mascot) */}
        <div className="absolute inset-0 z-0 flex justify-end items-end pr-[260px]">
          <img
            src="/images/london-bg.png"
            alt=""
            className="h-[280px] w-auto object-contain max-w-none mix-blend-multiply"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 100%)',
              maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 100%)'
            }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>

        {/* Left side: Text */}
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

        {/* Right side: Widget */}
        <div className="relative z-200 bg-white rounded-[24px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col gap-3 w-[260px] border border-slate-50 shrink-0 translate-x-5 ">
          <div className="flex items-center gap-3">
            <h3 className="text-[38px] font-black text-[#05162E] leading-none tracking-tight">4</h3>
            <p className="text-[14px] font-bold text-[#05162E]">Essay Types</p>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {CATEGORIES.slice(1).map((cat, idx) => (
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

      {/* Filter Bar */}
      <div className="flex flex-col gap-4">
        {/* Primary Categories */}
        <div className="flex flex-wrap items-center gap-3">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-[13.5px] font-bold transition-all shadow-sm ${isActive
                  ? 'bg-[#05162E] text-white shadow-md border border-[#05162E]'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {cat.icon && (
                  <div className={`${isActive ? 'text-white' : cat.iconColor}`}>
                    {cat.icon}
                  </div>
                )}
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Secondary Filters (Difficulty) */}
        <div className="flex flex-wrap items-center gap-3">
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
      </div>

      {/* Test Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredTests.map((test) => {
          const categoryName = getTestCategory(test);
          const catConfig = CATEGORIES.find(c => c.id === categoryName) || CATEGORIES[1];

          return (
            <div
              key={test.id}
              className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all flex flex-col group h-full relative"
            >
              {/* Badges */}
              <div className="flex justify-between items-start mb-6 z-10 relative">
                <div className="flex gap-2">
                  <div className={`px-3 py-1.5 rounded-full ${catConfig.lightBg} ${catConfig.text} text-[9px] font-black tracking-widest uppercase`}>
                    {categoryName}
                  </div>
                  {test.is_demo && (
                    <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black tracking-widest uppercase border border-emerald-100">
                      FREE DEMO
                    </div>
                  )}
                </div>
                {/* Difficulty Badge on Top Right */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                  <div className={`w-2 h-2 rounded-full ${DIFFICULTIES.find(d => d.id === getTestDifficulty(test))?.dot || 'bg-yellow-500'}`}></div>
                  <span className="text-[10px] font-bold text-[#05162E] uppercase">{getTestDifficulty(test)}</span>
                </div>
              </div>

              {/* 3D Image */}
              <div className="flex items-center justify-center h-[160px] mb-6">
                <ImageWithFallback
                  src={catConfig.img3d || ''}
                  alt={categoryName}
                  className="w-auto h-[140px] object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                  fallback={
                    <div className={`w-[140px] h-[140px] rounded-3xl ${catConfig.lightBg} border-2 border-dashed ${catConfig.border} flex flex-col items-center justify-center text-center p-3`}>
                      <span className={`text-xs font-bold ${catConfig.text}`}>
                        Put {categoryName}<br />3D Image Here
                      </span>
                    </div>
                  }
                />
              </div>

              <div className="flex flex-col flex-1">
                <h3 className="text-[20px] font-black text-[#05162E] leading-tight mb-2 tracking-tight">{test.title}</h3>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed line-clamp-2 mb-5">
                  {getTestDescription(test) || 'Write about a topic and give your personal opinion.'}
                </p>

                {/* Stats Row */}
                <div className="flex items-center gap-4 text-[12px] font-bold text-slate-400 mt-auto mb-5">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {test.duration} min</span>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <span className="flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> 1 Essay</span>
                </div>
              </div>

              <button
                onClick={() => onStartTest(test.id)}
                className={`w-full py-3.5 rounded-xl text-white text-[14px] font-black flex items-center justify-between px-6 ${catConfig.color} ${catConfig.hoverColor} transition-colors`}
              >
                <span>Start Practice</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {filteredTests.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <PenLine className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">No tests found</h3>
            <p className="text-slate-500 mt-2 text-[15px]">
              We couldn't find any practice tests matching the "{activeCategory}" category.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Features Banner */}
      <div className="w-full bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] mt-4 py-8 px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[14px] font-black text-[#05162E]">Official IELTS Format</h4>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">100% exam-style essays</p>
            </div>
          </div>
          <div className="flex items-center gap-4 pl-8">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[14px] font-black text-[#05162E]">Band 9 Model Answers</h4>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">Learn from top quality essays</p>
            </div>
          </div>
          <div className="flex items-center gap-4 pl-8">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[14px] font-black text-[#05162E]">Detailed Evaluation</h4>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">Improve with AI feedback</p>
            </div>
          </div>
          <div className="flex items-center gap-4 pl-8">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <LineChart className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[14px] font-black text-[#05162E]">Track Your Progress</h4>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">Monitor your band score</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

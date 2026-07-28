import React, { useState } from 'react';
import { ArrowLeft, Clock, PenLine, ChevronRight, BarChart3, LineChart, PieChart, Table as TableIcon, Map as MapIcon, Workflow } from 'lucide-react';

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
  { id: 'Bar Graph', label: 'Bar Graph', icon: '/images/flat-icons/bar-graph.png', img3d: '/images/chart-icons/bar-graph.png', color: 'bg-[#1a365d]', hoverColor: 'hover:bg-[#152e52]', lightBg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  { id: 'Line Graph', label: 'Line Graph', icon: '/images/flat-icons/line-graph.png', img3d: '/images/chart-icons/line-graph.png', color: 'bg-[#059669]', hoverColor: 'hover:bg-[#047857]', lightBg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  { id: 'Pie Chart', label: 'Pie Chart', icon: '/images/flat-icons/pie-chart.png', img3d: '/images/chart-icons/pie-chart.png', color: 'bg-[#7c3aed]', hoverColor: 'hover:bg-[#6d28d9]', lightBg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  { id: 'Table', label: 'Table', icon: '/images/flat-icons/table.png', img3d: '/images/chart-icons/table.png', color: 'bg-[#ea580c]', hoverColor: 'hover:bg-[#c2410c]', lightBg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100' },
  { id: 'Map', label: 'Map', icon: '/images/flat-icons/map.png', img3d: '/images/chart-icons/map.png', color: 'bg-[#0d9488]', hoverColor: 'hover:bg-[#0f766e]', lightBg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100' },
  { id: 'Process', label: 'Process', icon: '/images/flat-icons/process.png', img3d: '/images/chart-icons/process.png', color: 'bg-[#4338ca]', hoverColor: 'hover:bg-[#3730a3]', lightBg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
];

export default function WritingTask1Practice({ tests, onBack, onStartTest }: Props) {
  const [activeCategory, setActiveCategory] = useState('All');

  const getTestCategory = (test: MockTest) => {
    let category = 'Bar Graph';
    if (test.description && test.description.startsWith('{')) {
      try {
        const parsed = JSON.parse(test.description);
        category = parsed.chartCategory || 'Bar Graph';
      } catch (e) { }
    }
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

  const filteredTests = tests.filter(test => {
    if (activeCategory === 'All') return true;
    return getTestCategory(test) === activeCategory;
  });

  return (
    <div className="flex flex-col gap-6 h-full max-w-[1400px] mx-auto pb-8">

      {/* Hero Banner */}
      <div className="relative w-full rounded-[32px] overflow-hidden bg-gradient-to-r from-white via-white to-[#F4F8FC] border border-slate-100 shadow-sm pt-14 pb-14 px-12 flex items-center justify-between min-h-[280px]">
        
        {/* Background Image with Smooth Faded Edges */}
        <div className="absolute inset-0 z-0 flex justify-end items-end pr-[240px]">
          <img 
            src="/images/london-bg.png" 
            alt=""
            className="h-[280px] w-auto object-contain max-w-none mix-blend-multiply"
            style={{ 
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 90%, transparent 100%)',
              maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 90%, transparent 100%)'
            }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>

        {/* Left side: Text */}
        <div className="relative z-10 min-w-[550px]">
          <div className="inline-flex items-center gap-2 text-blue-600 text-[12px] font-black tracking-widest uppercase mb-4">
            <PenLine className="h-4 w-4" /> WRITING TASK 1
          </div>
          <h1 className="text-[44px] font-black text-[#05162E] leading-tight mb-3 tracking-tight whitespace-nowrap">
            Writing Task 1 Practice Tests
          </h1>
          <p className="text-[16px] text-slate-500 font-medium">
            Choose a test type and start practicing with official-style questions.
          </p>
        </div>

        {/* Right side: Widget */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col gap-2 w-[260px] relative z-10 border border-slate-50 shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-[14px] flex items-center justify-center shrink-0">
              <PenLine className="w-5 h-5" />
            </div>
            <div className="flex flex-col -mt-1">
              <h3 className="text-[38px] font-black text-[#05162E] leading-none tracking-tight">{tests.length}</h3>
              <p className="text-[13px] font-bold text-slate-500 mt-1">Tests Available</p>
            </div>
          </div>
          <p className="text-[12px] text-slate-500 font-medium leading-relaxed pr-2 mt-2">
            Keep practicing and achieve your target band!
          </p>
          <div className="mt-2 h-7 w-full bg-slate-50 rounded-lg overflow-hidden relative opacity-70">
             <svg className="absolute bottom-0 left-0 w-full h-full text-red-300" viewBox="0 0 100 100" preserveAspectRatio="none">
               <path d="M0,100 L10,80 L30,90 L50,50 L70,60 L90,20 L100,100 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
             </svg>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
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
                <img src={cat.icon} alt={cat.label} className={`w-4 h-4 object-contain ${isActive ? 'invert brightness-0' : 'opacity-60'}`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              )}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Test Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTests.map((test) => {
          const categoryName = getTestCategory(test);
          const catConfig = CATEGORIES.find(c => c.id === categoryName) || CATEGORIES[1];

          return (
            <div
              key={test.id}
              className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all flex flex-col group h-full"
            >
              <div className="flex justify-between items-start mb-5">
                <div className={`px-3 py-1 rounded-full ${catConfig.lightBg} ${catConfig.text} text-[10px] font-black tracking-widest uppercase`}>
                  {categoryName}
                </div>
                {test.is_demo && (
                  <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black tracking-widest uppercase border border-emerald-100">
                    FREE DEMO
                  </div>
                )}
              </div>

              <div className="flex gap-6 mb-6 items-center flex-1">
                <div className="w-[120px] shrink-0 flex items-center justify-center">
                  <img
                    src={catConfig.img3d}
                    alt={categoryName}
                    className="w-full h-auto object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<div class="w-[100px] h-[100px] rounded-2xl ${catConfig.lightBg} border-2 border-dashed ${catConfig.border} flex flex-col items-center justify-center text-center p-2"><span class="text-xs font-bold ${catConfig.text}">Put ${categoryName}<br/>3D Image Here</span></div>`;
                    }}
                  />
                </div>
                <div className="flex flex-col justify-center flex-1">
                  <h3 className="text-[22px] font-black text-[#05162E] leading-tight mb-2 tracking-tight">{test.title}</h3>
                  <p className="text-[13px] text-slate-500 font-medium leading-relaxed line-clamp-2 mb-4">
                    {getTestDescription(test) || 'Simulate official British Council IELTS exam requirements.'}
                  </p>

                  {/* Stats Row Moved INSIDE the right column */}
                  <div className="flex items-center gap-4 text-[12px] font-bold text-slate-400">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {test.duration} min</span>
                    <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                    <span className="flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> 1 Task</span>
                    <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                    <span className={`flex items-center gap-1.5 ${catConfig.text}`}>
                      <div className="flex gap-[2px] items-end h-2.5">
                        <div className={`w-[3px] h-[4px] rounded-[1px] ${catConfig.color}`}></div>
                        <div className={`w-[3px] h-[7px] rounded-[1px] ${catConfig.color}`}></div>
                        <div className="w-[3px] h-[10px] rounded-[1px] bg-slate-200"></div>
                      </div>
                      Easy
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onStartTest(test.id)}
                className={`w-full mt-auto py-3.5 rounded-2xl text-white text-[14px] font-black flex items-center justify-center gap-2 ${catConfig.color} ${catConfig.hoverColor} transition-colors`}
              >
                Start Practice <ChevronRight className="w-4 h-4" />
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
    </div>
  );
}

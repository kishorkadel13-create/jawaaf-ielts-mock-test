import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Clock, ClipboardList, Lock, Play, ArrowRight, Search, ChevronDown, Bookmark, BarChart3, BookOpen } from 'lucide-react';
import { assets } from '../config/assets';

interface MockTest {
  id: string;
  title: string;
  description: string;
  is_locked: boolean;
  is_demo: boolean;
  duration?: number;
  cover_image_url?: string;
  star_rating?: number;
  difficulty?: string;
}

interface ReadingCard {
  id: string;
  test: MockTest;
  category: 'complete' | 'passage-1' | 'passage-2' | 'passage-3';
  passage?: number;
  title: string;
  questionTypeKey: string;
  questionTypeLabel: string;
  questionTypeKeys: string[];
  questionTypeLabels: string[];
  questionCount: number;
  duration: number;
  difficulty: string;
  cover_image_url?: string;
  star_rating?: number;
}

interface Props {
  category: 'complete' | 'passage-1' | 'passage-2' | 'passage-3';
  cards: ReadingCard[];
  completedTestIds: Set<string>;
  startingTestId: string | null;
  onStartTest: (testId: string) => void;
  onBack: () => void;
  onCategoryChange: (category: 'complete' | 'passage-1' | 'passage-2' | 'passage-3') => void;
}

// 14 distinct question types from Question Builder (exact 1:1 mapping)
const READING_QUESTION_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'fill_in_the_blanks', label: 'Fill in the Blanks' },
  { key: 'summary_completion', label: 'Summary Completion' },
  { key: 'short_answer', label: 'Short Answer Question' },
  { key: 'diagram_labelling', label: 'Diagram Labelling' },
  { key: 'summary_completion_options', label: 'Summary Completion with Options' },
  { key: 'table_completion', label: 'Table Completion' },
  { key: 'tfng', label: 'True / False / Not Given' },
  { key: 'ynng', label: 'Yes / No / Not Given' },
  { key: 'multiple_choice', label: 'Standard Multiple Choice' },
  { key: 'sentence_completion', label: 'Sentence Completion' },
  { key: 'matching', label: 'Matching Question' },
  { key: 'matching_information', label: 'Matching Information' },
  { key: 'matching_headings', label: 'Matching Headings' },
  { key: 'multi_select', label: 'Choose Two / Multi-select' }
];

const CATEGORY_META = {
  complete: { label: 'Complete Test Set', shortLabel: 'Complete Set', icon: '🏆', textColor: 'text-[#05162E]' },
  'passage-1': { label: 'Passage 1 Library', shortLabel: 'Passage 1', icon: '📖', textColor: 'text-[#05162E]' },
  'passage-2': { label: 'Passage 2 Library', shortLabel: 'Passage 2', icon: '📖', textColor: 'text-[#05162E]' },
  'passage-3': { label: 'Passage 3 Library', shortLabel: 'Passage 3', icon: '📖', textColor: 'text-[#05162E]' }
};

const FILTER_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'tfng', label: 'TFNG' },
  { key: 'matching_headings', label: 'Headings' },
  { key: 'summary_completion', label: 'Summary' },
  { key: 'sentence_completion', label: 'Sentence Completion' },
  { key: 'diagram_labelling', label: 'Diagram' },
  { key: 'matching', label: 'Matching' }
];

export default function ReadingPracticeList({
  category,
  cards,
  completedTestIds,
  startingTestId,
  onStartTest,
  onBack,
  onCategoryChange
}: Props) {
  const [activeQuestionType, setActiveQuestionType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [completedFilter, setCompletedFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('newest');
  const [showAllCards, setShowAllCards] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const availableQuestionTypes = useMemo(() => {
    const typeKeys = new Set<string>();
    cards.forEach(card => {
      if (card.category === category) {
        card.questionTypeKeys.forEach(k => typeKeys.add(k));
      }
    });
    return READING_QUESTION_TYPES.filter(t => t.key === 'all' || typeKeys.has(t.key));
  }, [cards, category]);

  useEffect(() => {
    setActiveQuestionType('all');
    setShowAllCards(false);
  }, [category]);

  useEffect(() => {
    if (showAllCards && gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showAllCards]);

  const activeMeta = CATEGORY_META[category];
  const isComplete = category === 'complete';

  // Filter cards
  let filteredCards = cards.filter(card => {
    if (card.category !== category) return false;
    if (activeQuestionType !== 'all' && !card.questionTypeKeys.includes(activeQuestionType)) return false;
    if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    const cardDifficulty = card.difficulty || 'Standard';
    if (difficultyFilter !== 'all' && cardDifficulty !== difficultyFilter) return false;
    
    const isCompleted = completedTestIds.has(card.test.id);
    if (completedFilter === 'completed' && !isCompleted) return false;
    if (completedFilter === 'incomplete' && isCompleted) return false;
    
    return true;
  });

  // Sorting by test title number
  filteredCards = [...filteredCards].sort((a, b) => {
    const numA = parseInt((a.title || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.title || '').replace(/\D/g, ''), 10) || 0;
    return sortFilter === 'oldest' ? numA - numB : numB - numA;
  });

  const getQuestionTypeCount = (typeKey: string) => {
    return cards.filter(card => {
      if (card.category !== category) return false;
      if (typeKey === 'all') return true;
      return card.questionTypeKeys.includes(typeKey);
    }).length;
  };

  const renderStars = (rating = 4) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={`text-[18px] ${i < rating ? 'text-[#FFD166]' : 'text-slate-200'}`}>★</span>
    ));
  };

  return (
    <div className="flex min-h-0 w-full flex-col gap-8 pb-28 font-['Inter',sans-serif] text-[#05162E] xl:flex-row xl:pb-0">
      
      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">

      {/* Hero Section */}
      <div className="relative mt-2 flex min-h-[140px] w-full flex-col gap-5 overflow-hidden rounded-[20px] border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] sm:p-6 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex min-w-0 items-center gap-5 sm:gap-6">
          <div className="relative flex h-[88px] w-[104px] shrink-0 items-center justify-center sm:h-[100px] sm:w-[130px]">
            {/* Using book illustration since asset might be missing, or keeping it clean */}
            <div className="text-[58px] sm:text-[70px]">📖</div>
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            <h2 className="text-[28px] font-black leading-tight tracking-tight text-[#05162E] sm:text-[32px]">
              {CATEGORY_META[category].label.replace(' Library', '').replace(' Test Set', '')}
              {category === 'complete' ? ' Set' : ' Library'}
            </h2>
            <p className="mt-1 text-[15px] font-medium text-slate-500">
              Choose a passage and start practising.
            </p>
            <p className="mt-1.5 text-[14px] font-bold text-[#2259D8]">
              {cards.filter(c => c.category === category).length} Passage Sets Available
            </p>
          </div>
        </div>

        {/* Passage Tabs directly in Hero section as per design */}
        <div className="-mx-1 grid w-[calc(100%+0.5rem)] min-w-0 grid-cols-1 gap-3 overflow-visible px-1 pb-1 sm:grid-cols-2 2xl:ml-auto 2xl:w-[560px] 2xl:flex-none">
          {(['complete', 'passage-1', 'passage-2', 'passage-3'] as const).map(catKey => {
            const isActive = category === catKey;
            
            // Design logic: Complete Set is yellow, Passage 1 is solid blue (if active) or transparent, etc.
            if (catKey === 'complete') {
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => { onCategoryChange(catKey); setActiveQuestionType('all'); }}
                  className="flex h-[44px] w-full items-center justify-center gap-2 rounded-full border border-amber-300 bg-[#FFFDF5] px-5 text-[14px] font-bold text-amber-600 transition-all hover:bg-amber-50 2xl:px-4"
                >
                  <span>🏆</span>
                  <span className="whitespace-nowrap">Complete Set</span>
                </button>
              );
            }

            const buttonStyle = isActive 
              ? 'bg-[#05162E] text-white' 
              : catKey === 'passage-2' 
                ? 'border border-emerald-500 bg-white text-emerald-600 hover:bg-emerald-50'
                : catKey === 'passage-3'
                  ? 'border border-orange-500 bg-white text-orange-600 hover:bg-orange-50'
                  : 'border border-slate-200 bg-white text-[#05162E] hover:bg-slate-50';

            const iconColor = isActive ? 'text-white' : catKey === 'passage-2' ? 'text-emerald-500' : catKey === 'passage-3' ? 'text-orange-500' : 'text-[#2259D8]';

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => { onCategoryChange(catKey); setActiveQuestionType('all'); }}
                className={`flex h-[44px] w-full items-center justify-center gap-2 rounded-full px-5 text-[14px] font-bold shadow-sm transition-all 2xl:px-4 ${buttonStyle}`}
              >
                <BookOpen className={`h-[18px] w-[18px] ${iconColor}`} />
                <span className="whitespace-nowrap">{CATEGORY_META[catKey].shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Area */}
      <div className="mt-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2 rounded-[28px] border border-slate-100 bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between sm:rounded-full">
          <div className="relative min-w-0 flex-1 sm:max-w-[300px]">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search passage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[44px] w-full rounded-full bg-transparent pl-11 pr-4 text-[14px] font-medium text-[#05162E] placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pr-1 sm:pr-2">
            <div className="mx-2 hidden h-6 w-[1px] shrink-0 bg-slate-200 sm:block"></div>
            <div className="relative">
              <select 
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="flex h-[40px] appearance-none items-center rounded-full bg-transparent px-4 pr-8 text-[14px] font-bold text-[#05162E] hover:bg-slate-50 focus:outline-none cursor-pointer"
              >
                <option value="all">Difficulty</option>
                <option value="Beginner">Beginner</option>
                <option value="Standard">Standard</option>
                <option value="Advanced">Advanced</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            
            <div className="mx-1 h-6 w-[1px] shrink-0 bg-slate-200"></div>
            <div className="relative">
              <select
                value={activeQuestionType}
                onChange={(e) => setActiveQuestionType(e.target.value)}
                className="flex h-[40px] appearance-none items-center rounded-full bg-transparent px-4 pr-8 text-[14px] font-bold text-[#05162E] hover:bg-slate-50 focus:outline-none cursor-pointer"
              >
                {availableQuestionTypes.map(t => (
                  <option key={t.key} value={t.key}>{t.label === 'All' ? 'Question Type' : t.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            
            <div className="mx-1 h-6 w-[1px] shrink-0 bg-slate-200"></div>
            <div className="relative">
              <select
                value={completedFilter}
                onChange={(e) => setCompletedFilter(e.target.value)}
                className="flex h-[40px] appearance-none items-center rounded-full bg-transparent px-4 pr-8 text-[14px] font-bold text-[#05162E] hover:bg-slate-50 focus:outline-none cursor-pointer"
              >
                <option value="all">Status</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Incomplete</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            
            <div className="mx-1 h-6 w-[1px] shrink-0 bg-slate-200"></div>
            <div className="relative">
              <select
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value)}
                className="flex h-[40px] appearance-none items-center rounded-full bg-transparent px-4 pr-8 text-[14px] font-bold text-[#05162E] hover:bg-slate-50 focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-[10px]">
          {FILTER_PILLS.map(type => {
            const isActive = activeQuestionType === type.key;
            return (
              <button
                key={type.key}
                onClick={() => setActiveQuestionType(type.key)}
                className={`flex h-[36px] items-center justify-center rounded-full px-5 text-[13px] font-bold transition-all ${
                  isActive
                    ? 'bg-[#05162E] text-white shadow-md'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {type.label}
              </button>
            );
          })}
          
          {/* "More" Dropdown for remaining types */}
          {(() => {
            const moreTypes = availableQuestionTypes.filter(t => !FILTER_PILLS.find(p => p.key === t.key) && t.key !== 'all');
            if (moreTypes.length === 0) return null;
            
            const isMoreActive = moreTypes.some(t => t.key === activeQuestionType);
            const activeMoreType = moreTypes.find(t => t.key === activeQuestionType);
            
            return (
              <div className="relative">
                <select
                  value={isMoreActive ? activeQuestionType : 'more'}
                  onChange={(e) => setActiveQuestionType(e.target.value)}
                  className={`flex h-[36px] appearance-none items-center justify-center rounded-full pl-5 pr-8 text-[13px] font-bold transition-all cursor-pointer focus:outline-none ${
                    isMoreActive
                      ? 'bg-[#05162E] text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <option value="more" disabled>{isMoreActive ? activeMoreType?.label : 'More'}</option>
                  {moreTypes.map(t => (
                    <option key={t.key} value={t.key} className="text-[#05162E] bg-white">{t.label}</option>
                  ))}
                </select>
                <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isMoreActive ? 'text-white' : 'text-slate-400'}`} />
              </div>
            );
          })()}
        </div>
      </div>

      {/* Card Grid */}
      <div 
        ref={gridRef}
        className={`mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${
        showAllCards 
          ? 'max-h-[calc(100vh-400px)] overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200' 
          : ''
      }`}>
        {(showAllCards ? filteredCards : filteredCards.slice(0, 4)).map((card, idx) => {
          const isCompleted = completedTestIds.has(card.test.id);
          const isLocked = card.test.is_locked;
          
          // Complete Set Card
          if (isComplete) {
            return (
              <div
                key={card.id}
                className="flex h-[360px] w-full flex-col justify-between rounded-[20px] border border-[#FEF3C7] bg-gradient-to-b from-[#FFFDF5] to-[#FFF9E6] p-[20px] shadow-[0_4px_16px_rgba(251,191,36,0.1)] transition-transform hover:-translate-y-1"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-[16px] flex items-center gap-2 text-[13px] font-bold tracking-wider text-amber-600 uppercase">
                    🏆 COMPLETE SET
                  </div>
                  
                  <div className="mb-[12px] flex h-[100px] w-[100px] items-center justify-center text-[70px]">
                    🏆
                  </div>
                  
                  <h3 className="mb-[16px] text-[15px] font-bold leading-relaxed text-[#0F172A]">
                    3 Passages. {card.questionCount} Questions.<br/>Real IELTS test experience.
                  </h3>
                  
                  <div className="flex flex-col items-center gap-2.5 text-[13px] font-medium text-slate-600">
                    <span className="flex items-center gap-2"><BookOpen className="h-4 w-4"/> 3 Passages</span>
                    <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4"/> {card.questionCount} Questions</span>
                    <span className="flex items-center gap-2"><Clock className="h-4 w-4"/> {card.duration} Minutes</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={startingTestId === card.test.id || isLocked}
                  onClick={() => onStartTest(card.test.id)}
                  className="mx-auto flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border border-amber-300 bg-white text-[14px] font-bold text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50"
                >
                  Start Complete Set <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            );
          }

          // Regular Passage Card
          let theme = { 
            main: 'text-blue-600', 
            border: 'border-blue-600', 
            badge: 'bg-blue-50 text-blue-600' 
          };
          
          if (card.difficulty === 'Beginner') {
            theme = { main: 'text-emerald-500', border: 'border-emerald-500', badge: 'bg-emerald-50 text-emerald-600' };
          } else if (card.difficulty === 'Advanced') {
            theme = { main: 'text-violet-500', border: 'border-violet-500', badge: 'bg-violet-50 text-violet-600' };
          }

          return (
            <div
              key={card.id}
              className="group flex h-[350px] w-full flex-col justify-between rounded-[24px] border border-slate-100 bg-white p-[22px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-transform hover:-translate-y-1"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="mb-[14px] flex items-start justify-between">
                  <span className={`text-[11px] font-extrabold uppercase tracking-[0.1em] ${theme.main}`}>
                    TEST {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <button className={`${theme.main} opacity-80 hover:opacity-100 transition-opacity`}>
                    <Bookmark className="h-[18px] w-[18px] stroke-[2]" />
                  </button>
                </div>

                {/* Title & Image Area */}
                <div className="relative mb-[12px] flex flex-1 min-h-[90px]">
                  <h3 className="w-[62%] pr-2 text-[17px] font-extrabold leading-[1.3] text-[#0F172A] line-clamp-4">
                    {card.title}
                  </h3>
                  <div className="absolute top-1/2 -translate-y-1/2 right-0 h-[85px] w-[85px] flex items-center justify-center">
                    {card.cover_image_url ? (
                      <img src={card.cover_image_url} alt="" className="max-h-[85px] max-w-[85px] object-contain drop-shadow-sm" />
                    ) : (
                      <span className="text-[50px] leading-none drop-shadow-sm">🎨</span>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div className="mb-[18px] flex items-center gap-1">
                  {renderStars(card.star_rating || 4)}
                </div>

                {/* Information */}
                <div className="mb-[20px] flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    {/* Qs block */}
                    <div className="flex items-center gap-2 text-slate-500">
                      <Bookmark className="h-[18px] w-[18px] stroke-[1.5]" />
                      <div className="flex flex-col leading-tight">
                        <span className="text-[14px] font-extrabold text-[#334155]">{card.questionCount}</span>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase">Qs</span>
                      </div>
                    </div>
                    {/* Min block */}
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="h-[18px] w-[18px] stroke-[1.5]" />
                      <div className="flex flex-col leading-tight">
                        <span className="text-[14px] font-extrabold text-[#334155]">{card.duration}</span>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase">min</span>
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-[8px] px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${theme.badge}`}>
                    {card.difficulty || 'Standard'}
                  </span>
                </div>

                {/* Tags */}
                <div className="mb-[16px] flex gap-2 overflow-hidden h-[26px]">
                  {card.questionTypeLabels.length > 0 ? card.questionTypeLabels.slice(0, 2).map((label, i) => (
                    <span key={i} className="inline-flex h-[26px] items-center rounded-md bg-[#F1F5F9] px-2.5 text-[11px] font-extrabold tracking-wide text-[#475569] truncate">
                      {label}
                    </span>
                  )) : (
                    <div className="h-[26px] w-full"></div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  disabled={startingTestId === card.test.id || isLocked}
                  onClick={() => onStartTest(card.test.id)}
                  className={`mx-auto mt-auto flex h-[44px] w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] bg-white text-[14px] font-extrabold transition-colors disabled:opacity-50 ${theme.border} ${theme.main} hover:bg-slate-50 shadow-sm`}
                >
                  {isCompleted ? 'Retake Practice' : 'Start Practice'} <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredCards.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-[20px] font-bold text-[#05162E]">No practice sets found</h3>
            <p className="mt-2 text-[16px] text-slate-500">
              Try adjusting your filters to find more reading practice materials.
            </p>
          </div>
        )}
      </div>

      {!showAllCards && filteredCards.length > 4 && (
        <div className="mt-8 flex justify-center pb-8">
          <button 
            onClick={() => setShowAllCards(true)}
            className="flex items-center gap-2 text-[15px] font-bold text-[#2259D8] transition-colors hover:text-[#1E3A6E]"
          >
            View all {filteredCards.length} sets <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      </div>

      {/* Right Sidebar */}
      <aside className="hidden xl:flex w-[320px] shrink-0 flex-col gap-6">
        
        {/* Your Progress */}
        <div className="rounded-[24px] border border-slate-100 bg-white p-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#2259D8]" />
            <h3 className="text-[17px] font-extrabold text-[#05162E]">Your Progress</h3>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative flex h-[80px] w-[80px] shrink-0 items-center justify-center rounded-full bg-slate-50">
              <svg className="h-[80px] w-[80px] -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className="fill-none stroke-slate-200 stroke-[8]" />
                <circle cx="50" cy="50" r="40" className="fill-none stroke-[#2259D8] stroke-[8]" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 24) / 50} strokeLinecap="round" />
              </svg>
              <div className="text-center">
                <p className="text-[22px] font-black leading-none text-[#05162E]">24</p>
                <p className="text-[11px] font-bold text-slate-400">/ 50</p>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-[12px] font-semibold text-slate-500">Completed</p>
              <p className="mt-1 text-[18px] font-black text-[#05162E]">24 <span className="text-[14px] font-semibold text-slate-400">/ 50</span></p>
              <p className="text-[12px] font-semibold text-slate-500">Passages</p>
              <button className="mt-2 text-[12px] font-bold text-[#2259D8] hover:underline flex items-center gap-1">
                View Progress <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Continue Learning */}
        <div className="rounded-[22px] border border-slate-100 bg-white p-6 shadow-[0_8px_24px_rgba(26,38,88,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-500">
              <ArrowRight className="h-4 w-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#05162E]">Continue Learning</h3>
          </div>
          
          <div className="flex flex-col gap-3">
            {(['passage-2', 'passage-3', 'complete'] as const).map((cat, idx) => (
              <button key={cat} onClick={() => onCategoryChange(cat)} className="flex items-center justify-between rounded-[14px] border border-slate-100 bg-white p-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={cat === 'complete' ? 'text-amber-500' : 'text-emerald-500'}>
                    {cat === 'complete' ? '🏆' : '📖'}
                  </span>
                  <span className="text-[14px] font-bold text-[#05162E]">
                    {cat === 'complete' ? 'Complete Set' : `Passage ${idx + 2}`}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Hooty's Tip */}
        <div className="rounded-[22px] border border-slate-100 bg-white p-6 shadow-[0_8px_24px_rgba(26,38,88,0.04)]">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[20px]">💡</span>
            <h3 className="text-[16px] font-bold text-[#05162E]">Hooty's Tip</h3>
          </div>
          
          <div className="flex items-center gap-4">
            <p className="text-[13px] font-medium leading-relaxed text-[#05162E]">
              Read the title first. Look for keywords, not every word.
            </p>
            <img
              src={assets.readingPractice.hootyMascot}
              alt="Jawaaf mascot"
              className="h-[96px] w-[96px] shrink-0 object-contain drop-shadow-md"
              draggable={false}
            />
          </div>
        </div>

      </aside>

    </div>
  );
}

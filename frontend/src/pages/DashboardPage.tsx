import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import StudentSidebar from '../components/StudentSidebar';
import {
  Monitor, Headphones, BookOpen, History, Award,
  Settings, LogOut, Lock, CheckSquare, Calendar,
  ChevronRight, TrendingUp, Users, Crown, User, FileText, Star, Play, PenLine, Target, Search, Bell, Heart, CheckCircle2, Flame, ChevronLeft, ArrowRight
} from 'lucide-react';
import { getVideoThumbnailUrl } from '../utils/videoEmbed';
// Interfaces for typing
interface TestAttempt {
  id: string;
  score: string | number;
  status: string;
  submitted_at: string;
  attempt_mode?: 'mock' | 'practice';
  result_status?: string;
  reading_score?: string | number | null;
  listening_score?: string | number | null;
  writing_score?: string | number | null;
  feedback?: {
    band_score?: string | number | null;
  } | null;
  sections?: Array<{
    type: 'reading' | 'listening' | 'writing';
  }>;
  mock_tests?: {
    title: string;
    type?: string;
  };
}

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
    question_count: number;
    group_count: number;
  }>;
}

interface CourseLessonPreview {
  id: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  sectionSlug: string;
  sectionTitle: string;
  completed: boolean;
  thumbnail_url?: string;
  video_url?: string;
  video_file?: string;
}

interface CourseSectionPreview {
  id: string;
  title: string;
  slug: string;
  lessonCount: number;
  completedCount: number;
}

const courseSectionIcon = (slug: string) => {
  if (slug === 'listening') return Headphones;
  if (slug.startsWith('writing-task')) return PenLine;
  if (slug === 'speaking') return User;
  return BookOpen;
};

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState({
    attempts: 0,
    avgScore: '0.0',
    readingScore: '0.0',
    listeningScore: '0.0',
    writingScore: '0.0'
  });
  const [history, setHistory] = useState<TestAttempt[]>([]);
  const [availableTests, setAvailableTests] = useState<MockTest[]>([]);
  const [courseProgress, setCourseProgress] = useState({ total: 0, completed: 0, percent: 0 });
  const [courseLessons, setCourseLessons] = useState<CourseLessonPreview[]>([]);
  const [courseSections, setCourseSections] = useState<CourseSectionPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [streakData, setStreakData] = useState<{ activeDates: string[], currentStreak: number }>({ activeDates: [], currentStreak: 0 });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [progressStats, setProgressStats] = useState({
    mockTotal: 0, mockCompleted: 0,
    practiceTotal: 0, practiceCompleted: 0,
    courseTotal: 0, courseCompleted: 0,
    overallPercent: 0
  });

  useEffect(() => {
    if (!profile?.id) return;
    
    const storageKey = `user_streak_data_${profile.id}`;
    const savedData = localStorage.getItem(storageKey);
    let activeDates = savedData ? JSON.parse(savedData) : [];
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (!activeDates.includes(todayStr)) {
      activeDates.push(todayStr);
      localStorage.setItem(storageKey, JSON.stringify(activeDates));
    }
    
    let currentStreak = 0;
    let checkDate = new Date();
    
    while (true) {
      const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (activeDates.includes(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    setStreakData({ activeDates, currentStreak });
  }, [profile?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load attempts history
      const { data: attempts } = await api.get('/attempts/history').catch(() => ({ data: [] }));
      setHistory(attempts.slice(0, 5)); // show latest 5 attempts

      // Load available tests
      const { data: tests } = await api.get('/tests').catch(() => ({ data: [] }));
      setAvailableTests(tests.filter((test: MockTest) => (test.sections?.length || 0) > 1).slice(0, 3));

      const { data: courses } = await api.get('/courses').catch(() => ({ data: [] }));
      const rawSections = courses || [];
      const hasSplitWriting = rawSections.some((section: any) => section.slug === 'writing-task-1' || section.slug === 'writing-task-2');
      const visibleSections = hasSplitWriting ? rawSections.filter((section: any) => section.slug !== 'writing') : rawSections;
      const lessons = visibleSections.flatMap((section: any) =>
        (section.lessons || []).map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          duration_minutes: lesson.duration_minutes,
          sectionSlug: section.slug,
          sectionTitle: section.title,
          completed: Boolean(lesson.progress?.completed),
          thumbnail_url: lesson.thumbnail_url,
          video_url: lesson.video_url,
          video_file: lesson.video_file
        }))
      );
      const completedLessons = lessons.filter((lesson: CourseLessonPreview) => lesson.completed).length;
      setCourseLessons(lessons.slice(0, 3));
      setCourseSections(visibleSections.map((section: any) => ({
        id: section.id,
        title: section.title,
        slug: section.slug,
        lessonCount: section.lessons?.length || 0,
        completedCount: (section.lessons || []).filter((lesson: any) => lesson.progress?.completed).length
      })));
      setCourseProgress({
        total: lessons.length,
        completed: completedLessons,
        percent: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0
      });

      // Calculate dashboard statistics from real submitted attempts.
      const completed = (attempts || []).filter((a: TestAttempt) => a.status === 'completed');
      const mockAttempts = completed.filter((a: TestAttempt) => a.attempt_mode === 'mock');
      const practiceAttempts = completed.filter((a: TestAttempt) => a.attempt_mode === 'practice');
      const readyMockAttempts = mockAttempts.filter((a: TestAttempt) => a.result_status !== 'Pending teacher review');
      
      const allTestsCount = tests.length || 0;
      
      const mockPercent = allTestsCount ? (mockAttempts.length / allTestsCount) * 100 : 0;
      // We don't have availablePracticeTests from API directly in this slice easily, let's just use mock percent and course percent
      // Or just a combined percent
      const coursePercent = lessons.length ? (completedLessons / lessons.length) * 100 : 0;
      const overallP = Math.round((mockPercent + coursePercent) / 2);

      setProgressStats({
        mockTotal: allTestsCount, mockCompleted: mockAttempts.length,
        practiceTotal: 10, practiceCompleted: practiceAttempts.length, // Placeholder 10 for total practice
        courseTotal: lessons.length, courseCompleted: completedLessons,
        overallPercent: overallP
      });

      const parseScore = (value: any) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const formatScore = (value: number | null) => (value === null ? '0.0' : value.toFixed(1));
      const averageScore = (items: number[]) =>
        items.length ? Number((items.reduce((sum, value) => sum + value, 0) / items.length).toFixed(1)) : null;
      const highestScore = (values: Array<string | number | null | undefined>) => {
        const numericValues = values
          .map(parseScore)
          .filter((value): value is number => value !== null);
        return numericValues.length ? Math.max(...numericValues) : null;
      };

      const mockScores = readyMockAttempts
        .map((a: TestAttempt) => parseScore(a.feedback?.band_score ?? a.score))
        .filter((value: any): value is number => value !== null);

      const sectionHighest = (sectionType: 'reading' | 'listening' | 'writing') => {
        const explicitScores = completed.map((a: TestAttempt) => {
          if (sectionType === 'reading') return a.reading_score;
          if (sectionType === 'listening') return a.listening_score;
          return a.writing_score ?? a.feedback?.band_score;
        });
        const singleSectionFallbacks = completed
          .filter((a: TestAttempt) => (a.sections || []).length === 1 && a.sections?.[0]?.type === sectionType)
          .map((a: TestAttempt) => a.feedback?.band_score ?? a.score);
        return highestScore([...explicitScores, ...singleSectionFallbacks]);
      };

      setStats({
        attempts: mockAttempts.length,
        avgScore: formatScore(averageScore(mockScores)),
        readingScore: formatScore(sectionHighest('reading')),
        listeningScore: formatScore(sectionHighest('listening')),
        writingScore: formatScore(sectionHighest('writing'))
      });
      setLoading(false);
    } catch (err) {
      console.warn('Dashboard data fetch warning:', err);
      setStats({
        attempts: 0,
        avgScore: '0.0',
        readingScore: '0.0',
        listeningScore: '0.0',
        writingScore: '0.0'
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleStartTest = async (testId: string) => {
    try {
      const { data } = await api.post(`/attempts/start`, { mock_test_id: testId });
      navigate(`/attempts/${data.attempt.id}/exam`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start test');
    }
  };

  const getSectionTypes = (test: MockTest) => {
    const types = new Set((test.sections || []).map(section => section.type));
    return ['listening', 'reading', 'writing'].filter(type => types.has(type as any));
  };

  const getQuestionTotal = (test: MockTest) =>
    (test.sections || []).reduce((total, section) => total + (section.question_count || 0), 0);

  const getMockSummary = (test: MockTest) => {
    const sectionCount = test.sections?.length || 0;
    const questionTotal = getQuestionTotal(test);
    if (!sectionCount) return `${test.duration || 0} min`;
    return `${test.duration || 0} min • ${sectionCount} sections • ${questionTotal} tasks/Qs`;
  };

  const sectionBadgeClass = (type: string) => {
    if (type === 'listening') return 'bg-emerald-50 text-emerald-600';
    if (type === 'writing') return 'bg-rose-50 text-rose-600';
    return 'bg-[#EFF4FB] text-[#1E3A6E]';
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC] font-sans" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      <StudentSidebar />

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-grow flex flex-col xl:flex-row h-screen overflow-hidden">

        {/* COLUMN 1: MAIN PANEL */}
        <main className="flex-1 p-6 md:p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar">

          {/* Top Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#EBF0F9] text-[#1E3A6E] flex items-center justify-center font-black text-lg border border-[#1E3A6E]/10">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div>
                <h1 className="text-xl font-black text-[#05162E] tracking-tight">
                  Welcome back, {profile?.full_name || 'test'} ! 👋
                </h1>
                <p className="text-[13px] text-slate-500 font-semibold mt-0.5">Let's continue your IELTS preparation and achieve your target band.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex px-4 py-2 bg-[#EE6055]/10 text-[#EE6055] text-[12px] font-bold rounded-full items-center gap-2">
                <Crown className="h-4 w-4 fill-current" />
                <span>Premium Access Active</span>
              </div>

              <button className="h-10 w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-sm">
                <Search className="h-4 w-4" />
              </button>

              <button className="relative h-10 w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-sm">
                <Bell className="h-4 w-4" />
                <span className="absolute top-0 right-0 h-4 w-4 bg-[#EE6055] border-2 border-white rounded-full text-[9px] font-bold text-white flex items-center justify-center">3</span>
              </button>

              <div className="h-10 w-10 rounded-full bg-[#EBF0F9] text-[#1E3A6E] flex items-center justify-center font-black text-[14px] cursor-pointer shadow-sm">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'T'}
                <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="relative rounded-[30px] p-8 md:p-16 flex flex-col justify-center overflow-hidden mt-2 bg-[#E9F0FA] min-h-[320px]">
            {/* Background Image (User's Exact Asset) */}
            <div className="absolute inset-0 z-0">
              <img src="/images/cover.png" alt="Banner Background" className="w-full h-full  scale-[1.04]" />
            </div>

            {/* Text Content */}
            <div className="relative z-10 w-full max-w-sm flex flex-col">
              <h2 className="text-[28px] font-black text-[#0B1B3D] mb-1.5 leading-tight">Ready for today's challenge?</h2>
              <p className="text-[15px] text-[#4B5563] font-semibold mb-6">Quality Course, Quality Career</p>

              <div>
                <Link to="/tests?mode=practice" className="inline-flex items-center gap-2 bg-[#0B1B3D] hover:bg-[#1E3A6E] text-white px-7 py-3 rounded-xl font-bold text-[15px] transition-colors shadow-lg shadow-[#0B1B3D]/20">
                  Start a Practice Test <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <p className="text-[13px] text-[#6B7280] font-semibold mt-10">You have full access to all mock tests.</p>
            </div>

         
            
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

            {/* Tests Taken */}
            <div className="bg-white border border-slate-100 rounded-[18px] px-4 py-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
              <div className="h-8 w-8 bg-[#EFF4FB] text-[#1E3A6E] rounded-lg flex items-center justify-center mb-2">
                <FileText className="h-4 w-4" />
              </div>

              <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                Tests Taken
              </p>

              <div className="text-xl font-black text-[#05162E]">
                {stats.attempts}
              </div>

              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                Total Tests
              </p>
            </div>


            {/* Average Score */}
            <div className="bg-white border border-slate-100 rounded-[18px] px-4 py-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
              <div className="h-8 w-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center mb-2">
                <Star className="h-4 w-4 fill-current" />
              </div>

              <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                Average Score
              </p>

              <div className="text-xl font-black text-[#05162E]">
                {stats.avgScore}
              </div>

              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                Overall Band
              </p>
            </div>


            {/* Reading Score */}
            <div className="bg-white border border-slate-100 rounded-[18px] px-4 py-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
              <div className="h-8 w-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center mb-2">
                <BookOpen className="h-4 w-4" />
              </div>

              <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                Reading Score
              </p>

              <div className="text-xl font-black text-[#05162E]">
                {stats.readingScore}
              </div>

              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                Band Score
              </p>
            </div>


            {/* Listening Score */}
            <div className="bg-white border border-slate-100 rounded-[18px] px-4 py-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
              <div className="h-8 w-8 bg-[#EE6055]/10 text-[#EE6055] rounded-lg flex items-center justify-center mb-2">
                <Headphones className="h-4 w-4" />
              </div>

              <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                Listening Score
              </p>

              <div className="text-xl font-black text-[#05162E]">
                {stats.listeningScore}
              </div>

              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                Band Score
              </p>
            </div>


            {/* Writing Score */}
            <div className="bg-white border border-slate-100 rounded-[18px] px-4 py-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
              <div className="h-8 w-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center mb-2">
                <PenLine className="h-4 w-4" />
              </div>

              <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                Writing Score
              </p>

              <div className="text-xl font-black text-[#05162E]">
                {stats.writingScore}
              </div>

              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                Band Score
              </p>
            </div>

          </div>
          {/* Quick Links / Course Types */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Link to="/courses" className="bg-white border border-slate-50 rounded-[24px] p-7 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                <Play className="h-32 w-32" />
              </div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="h-12 w-12 rounded-xl bg-[#EFF4FB] text-[#1E3A6E] flex items-center justify-center">
                  <Play className="h-6 w-6 fill-current" />
                </div>
                <h3 className="text-[17px] font-black text-[#05162E]">Recorded Courses</h3>
              </div>
              <p className="text-[12px] font-semibold leading-relaxed text-slate-500 h-10 relative z-10">Watch IELTS lessons across Reading, Listening, Writing, and Speaking.</p>
              <div className="mt-6 text-[13px] font-black text-[#1E3A6E] flex items-center gap-1 group relative z-10">
                Continue Learning <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link to="/tests?mode=practice" className="bg-white border border-slate-50 rounded-[24px] p-7 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                <Target className="h-32 w-32" />
              </div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="text-[17px] font-black text-[#05162E]">Practice Tests</h3>
              </div>
              <p className="text-[12px] font-semibold leading-relaxed text-slate-500 h-10 relative z-10">Practice individual IELTS skills with section-wise question sets.</p>
              <div className="mt-6 text-[13px] font-black text-[#1E3A6E] flex items-center gap-1 group relative z-10">
                Open Practice <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link to="/tests?mode=mock" className="bg-white border border-slate-50 rounded-[24px] p-7 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                <PenLine className="h-32 w-32" />
              </div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="h-12 w-12 rounded-xl bg-[#EE6055]/10 text-[#EE6055] flex items-center justify-center">
                  <PenLine className="h-6 w-6" />
                </div>
                <h3 className="text-[17px] font-black text-[#05162E]">Full Mock Tests</h3>
              </div>
              <p className="text-[12px] font-semibold leading-relaxed text-slate-500 h-10 relative z-10">Simulate the computer-based IELTS test with timing and results.</p>
              <div className="mt-6 text-[13px] font-black text-[#1E3A6E] flex items-center gap-1 group relative z-10">
                Start Mock <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>

          {/* Browse Courses Sections */}
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-[16px] font-black text-[#05162E]">Browse Recorded Course Videos</h3>
                <p className="text-[12px] font-medium text-slate-500">Choose a skill and continue lessons section-wise.</p>
              </div>
              <Link to="/courses" className="text-[12px] text-[#1E3A6E] font-bold flex items-center gap-1 hover:text-[#EE6055]">
                View All Lessons <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {courseSections.length > 0 ? courseSections.map(section => {
                const Icon = courseSectionIcon(section.slug);
                return (
                  <Link
                    key={section.id}
                    to={'/courses?section=' + section.slug}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center justify-center text-center gap-2"
                  >
                    <div className="h-10 w-10 rounded-xl bg-[#EFF4FB] text-[#1E3A6E] flex items-center justify-center mb-1">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-[13px] font-black text-[#05162E] leading-tight">{section.title}</h4>
                    <p className="text-[10px] font-bold text-slate-400">
                      {section.completedCount}/{section.lessonCount} lessons completed
                    </p>
                  </Link>
                );
              }) : (
                <div className="col-span-full bg-white border border-slate-100 rounded-2xl p-6 text-center text-[13px] font-bold text-slate-500 shadow-sm">
                  Recorded course sections will appear here.
                </div>
              )}
            </div>
          </div>

          {/* Recorded Courses Video list */}
          <div className="flex flex-col gap-4 pb-10">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-[16px] font-black text-[#05162E]">Recorded Courses</h3>
                <p className="text-[12px] font-medium text-slate-500">Latest published IELTS lessons from your course library.</p>
              </div>
              <Link to="/courses" className="text-[12px] text-[#1E3A6E] font-bold flex items-center gap-1 hover:text-[#EE6055]">
                View All Lessons <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {courseLessons.map(lesson => {
                const thumbnailUrl = getVideoThumbnailUrl(lesson.video_file || lesson.video_url, lesson.thumbnail_url);
                return (
                <Link
                  key={lesson.id}
                  to={'/courses?section=' + lesson.sectionSlug + '&lesson=' + lesson.id}
                  className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
                >
                  {/* Thumbnail Area */}
                  <div className="flex-1 relative p-5 pb-0 flex flex-col justify-between overflow-hidden min-h-[160px]">
                    {/* Background Image */}
                    {thumbnailUrl ? (
                      <div className="absolute inset-0 z-0">
                        <img src={thumbnailUrl} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B3D]/90 via-[#0B1B3D]/40 to-transparent"></div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#E2EAF4] to-[#EEF2F8]">
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl"></div>
                        <div className="absolute -left-8 bottom-0 w-32 h-32 bg-purple-400/10 rounded-full blur-2xl"></div>
                      </div>
                    )}

                    {/* Top Row: Tag & Duration */}
                    <div className="flex justify-between items-start relative z-10 w-full mb-6">
                      <div className={`text-white text-[10px] font-bold px-2.5 py-1 rounded-[6px] uppercase tracking-wide
                        ${lesson.sectionTitle === 'Reading' ? 'bg-[#5B75E6]' :
                          lesson.sectionTitle === 'Listening' ? 'bg-[#F18835]' :
                            lesson.sectionTitle === 'Writing' ? 'bg-[#5B75E6]' : 'bg-[#984DD6]'}`}
                      >
                        {lesson.sectionTitle}
                      </div>
                      <div className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${thumbnailUrl ? 'bg-black/50 text-white backdrop-blur-sm' : 'text-slate-500 bg-white/50'}`}>
                        {lesson.duration_minutes || 15}:00
                      </div>
                    </div>

                    {/* Title Area */}
                    <div className="flex justify-between items-end relative z-10 mt-auto pb-4">
                      <h4 className={`text-[16px] font-black leading-tight max-w-[85%] ${thumbnailUrl ? 'text-white drop-shadow-md' : 'text-[#05162E]'}`}>
                        {lesson.title}
                      </h4>
                    </div>
                  </div>

                  {/* Bottom Area (White) */}
                  <div className="px-5 py-4 bg-white flex items-center justify-between z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
                      {lesson.completed ? (
                        <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Completed</span>
                      ) : (
                        <span>Pending</span>
                      )}
                    </div>
                    <div className="h-8 w-8 rounded-full bg-white shadow-md text-[#1E3A6E] flex items-center justify-center border border-slate-100 group-hover:bg-[#1E3A6E] group-hover:text-white transition-colors">
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
            </div>
          </div>

        </main>

        {/* COLUMN 2: RIGHT SIDEBAR */}
        <aside className="w-full xl:w-[320px] bg-white border-l border-slate-100 p-6 md:p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar shadow-sm">

          {/* Your Streak */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-black text-[#05162E]">Your Streak</h3>
                <p className="text-[11px] text-slate-500 font-medium">{streakData.currentStreak > 0 ? "Great job! Keep it up." : "Start your streak today!"}</p>
              </div>
              <div className={`flex items-center gap-1 font-black text-[14px] ${streakData.currentStreak > 0 ? 'text-[#EE6055]' : 'text-slate-400'}`}>
                <Flame className="h-4 w-4 fill-current" /> {streakData.currentStreak} Days
              </div>
            </div>

            <div className="flex items-center justify-between gap-1">
              {[6, 5, 4, 3, 2, 1, 0].map((daysAgo) => {
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' });
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                
                let isMissed = false;
                let isActive = false;
                
                if (streakData.activeDates.includes(dateStr)) {
                  isActive = true;
                } else if (daysAgo > 0) {
                  isMissed = true; // Missed day in the past
                }

                return (
                  <div key={daysAgo} className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{dayName}</span>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isActive ? 'bg-emerald-50 text-emerald-500' : isMissed ? 'bg-[#EE6055]/10 text-[#EE6055]' : 'bg-slate-50 text-slate-300'}`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Calendar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-black text-[#05162E]">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    setCurrentMonth(newMonth);
                  }}
                  className="h-6 w-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600">
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    setCurrentMonth(newMonth);
                  }}
                  className="h-6 w-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600">
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-3 text-center mb-2">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                <div key={d} className="text-[10px] font-bold text-slate-400">{d}</div>
              ))}
              
              {(() => {
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();
                const firstDay = new Date(year, month, 1);
                const startingDay = (firstDay.getDay() + 6) % 7; // Monday as 0
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = new Date();
                
                const days = [];
                for (let i = 0; i < startingDay; i++) {
                  days.push(<div key={`empty-${i}`} />);
                }
                
                for (let i = 1; i <= daysInMonth; i++) {
                  const checkDate = new Date(year, month, i);
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                  
                  const isFuture = checkDate > today;
                  const isActive = streakData.activeDates.includes(dateStr);
                  const isMissed = !isFuture && !isActive;
                  
                  days.push(
                    <div key={i} className={`text-[11px] font-bold flex items-center justify-center h-6 w-6 mx-auto rounded-full 
                      ${isActive ? 'bg-[#22C55E] text-white' : 
                        isMissed ? 'bg-[#EE6055] text-white' : 
                        'text-[#05162E] hover:bg-slate-100 cursor-pointer'
                      }`}>
                      {i}
                    </div>
                  );
                }
                return days;
              })()}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[16px] font-black text-[#05162E]">Overall Progress</h3>
              <span className="text-[11px] text-[#1E3A6E] font-bold cursor-pointer hover:text-[#EE6055]">View Details &gt;</span>
            </div>

            <div className="flex justify-center mb-8">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#1E3A6E]" strokeDasharray={`${progressStats.overallPercent}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="flex flex-col items-center justify-center bg-white h-24 w-24 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.05)]">
                  <span className="text-[24px] font-black text-[#05162E] leading-none">{progressStats.overallPercent}%</span>
                  <span className="text-[9px] text-slate-500 font-bold mt-1">Completed</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#EFF4FB] flex items-center justify-center text-[#1E3A6E]">
                    <PenLine className="h-4 w-4" />
                  </div>
                  <span className="text-[12px] font-bold text-slate-600">Mock Tests</span>
                </div>
                <span className="text-[12px] font-black text-[#05162E]">{progressStats.mockCompleted}/{progressStats.mockTotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="text-[12px] font-bold text-slate-600">Practice Tests</span>
                </div>
                <span className="text-[12px] font-black text-[#05162E]">{progressStats.practiceCompleted}/10</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                    <Heart className="h-4 w-4" />
                  </div>
                  <span className="text-[12px] font-bold text-slate-600">Recorded Courses</span>
                </div>
                <span className="text-[12px] font-black text-[#05162E]">{progressStats.courseCompleted}/{progressStats.courseTotal}</span>
              </div>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}

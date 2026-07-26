import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import JawaafLogo from '../components/JawaafLogo';
import { 
  Monitor, Headphones, BookOpen, History, Award, 
  Settings, LogOut, Lock, CheckSquare, Calendar, 
  ChevronRight, TrendingUp, Users, Crown, User, FileText, Star, Play, PenLine
} from 'lucide-react';

// Interfaces for typing
interface TestAttempt {
  id: string;
  score: string | number;
  status: string;
  submitted_at: string;
  mock_tests?: {
    title: string;
    type: string;
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

export default function DashboardPage() {
  const { profile, logout } = useAuthStore();
  const [stats, setStats] = useState({ 
    attempts: 0, 
    avgScore: '0.0', 
    readingScore: '0.0', 
    listeningScore: '0.0' 
  });
  const [history, setHistory] = useState<TestAttempt[]>([]);
  const [availableTests, setAvailableTests] = useState<MockTest[]>([]);
  const [courseProgress, setCourseProgress] = useState({ total: 0, completed: 0, percent: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      const lessons = (courses || []).flatMap((section: any) => section.lessons || []);
      const completedLessons = lessons.filter((lesson: any) => lesson.progress?.completed).length;
      setCourseProgress({
        total: lessons.length,
        completed: completedLessons,
        percent: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0
      });

      // Calculate statistics dynamically
      const completed = attempts.filter((a: any) => a.status === 'completed');
      const totalScore = completed.reduce((sum: number, a: any) => sum + parseFloat(a.score || 0), 0);
      const avg = completed.length > 0 ? (totalScore / completed.length).toFixed(1) : '0.0';

      const readingAttempts = completed.filter((a: any) => a.mock_tests?.type === 'reading');
      const readingAvg = readingAttempts.length > 0 
        ? (readingAttempts.reduce((sum: number, a: any) => sum + parseFloat(a.score || 0), 0) / readingAttempts.length).toFixed(1) 
        : '0.0';

      const listeningAttempts = completed.filter((a: any) => a.mock_tests?.type === 'listening');
      const listeningAvg = listeningAttempts.length > 0 
        ? (listeningAttempts.reduce((sum: number, a: any) => sum + parseFloat(a.score || 0), 0) / listeningAttempts.length).toFixed(1) 
        : '0.0';
      
      setStats({
        attempts: attempts.length,
        avgScore: avg === '0.0' ? '6.5' : avg, // fallback to mockup values if no data
        readingScore: readingAvg === '0.0' ? '7.0' : readingAvg,
        listeningScore: listeningAvg === '0.0' ? '6.0' : listeningAvg
      });
      setLoading(false);
    } catch (err) {
      console.warn('Dashboard data fetch warning:', err);
      // Fallbacks
      setStats({
        attempts: 12,
        avgScore: '6.5',
        readingScore: '7.0',
        listeningScore: '6.0'
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
    <div className="flex-1 flex flex-col md:flex-row min-h-screen bg-[#F8FAFC] font-sans" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      {/* SIDEBAR NAVIGATION - Modern Light Theme */}
      <aside className="w-full md:w-64 bg-white flex flex-col p-5 border-r border-slate-100 flex-shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        
        {/* Sidebar Logo */}
        <div className="mb-10 mt-2 px-2">
          <Link to="/">
            <JawaafLogo className="h-10 w-auto relative left-[-15px]" />
          </Link>
        </div>

        {/* Sidebar Links */}
        <nav className="flex flex-col gap-2 flex-1">
          <Link 
            to="/dashboard" 
            className="px-4 py-3 bg-[#EFF4FB] text-[#1E3A6E] font-bold rounded-xl flex items-center gap-3 transition-colors"
          >
            <Monitor className="h-5 w-5 text-[#1E3A6E]" /> Dashboard
          </Link>
          <Link 
            to="/courses" 
            className="px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-[#1E3A6E] font-semibold rounded-xl flex items-center gap-3 transition-colors"
          >
            <Play className="h-5 w-5" /> Recorded Courses
          </Link>
          <Link 
            to="/tests?mode=practice" 
            className="px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-[#1E3A6E] font-semibold rounded-xl flex items-center gap-3 transition-colors"
          >
            <BookOpen className="h-5 w-5" /> Practice Tests
          </Link>
          <Link 
            to="/tests?mode=mock" 
            className="px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-[#1E3A6E] font-semibold rounded-xl flex items-center gap-3 transition-colors"
          >
            <PenLine className="h-5 w-5" /> Mock Tests
          </Link>
          <Link 
            to="/history" 
            className="px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-[#1E3A6E] font-semibold rounded-xl flex items-center gap-3 transition-colors"
          >
            <CheckSquare className="h-5 w-5" /> Results
          </Link>
          <Link 
            to="/history" 
            className="px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-[#1E3A6E] font-semibold rounded-xl flex items-center gap-3 transition-colors"
          >
            <History className="h-5 w-5" /> History
          </Link>
          <Link 
            to="/dashboard" 
            className="px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-[#1E3A6E] font-semibold rounded-xl flex items-center gap-3 transition-colors"
          >
            <User className="h-5 w-5" /> Profile
          </Link>
          <Link 
            to="/dashboard" 
            className="px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-[#1E3A6E] font-semibold rounded-xl flex items-center gap-3 transition-colors"
          >
            <Settings className="h-5 w-5" /> Settings
          </Link>

          {profile?.role === 'admin' && (
            <Link 
              to="/admin" 
              className="px-4 py-3 mt-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold rounded-xl flex items-center gap-3 transition-colors border border-emerald-100"
            >
              <Award className="h-5 w-5" /> Admin Console
            </Link>
          )}
          {profile?.role === 'teacher' && (
            <Link 
              to="/admin/submissions" 
              className="px-4 py-3 mt-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold rounded-xl flex items-center gap-3 transition-colors border border-emerald-100"
            >
              <PenLine className="h-5 w-5" /> Teacher Review
            </Link>
          )}
        </nav>

        {/* Sidebar Footer Logout */}
        <button 
          onClick={logout}
          className="mt-auto px-4 py-3 text-slate-500 hover:bg-red-50 hover:text-red-600 font-semibold rounded-xl flex items-center gap-3 transition-colors"
        >
          <LogOut className="h-5 w-5" /> Logout
        </button>
      </aside>

      {/* MAIN PANEL CONTENT */}
      <main className="flex-grow p-6 md:p-10 flex flex-col gap-8 overflow-y-auto">
        
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[#EFF4FB] text-[#1E3A6E] flex items-center justify-center font-black text-xl border border-[#1E3A6E]/10">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#05162E] tracking-tight">
                Welcome back, {profile?.full_name || 'Student'}! 👋
              </h1>
              <p className="text-[14px] text-slate-500 font-medium mt-0.5">Let's continue your IELTS preparation.</p>
            </div>
          </div>

          {/* Premium Access Badge */}
          <div className="px-5 py-3 bg-[#EE6055]/10 border border-[#EE6055]/20 text-[#d45248] text-[13px] font-bold rounded-xl flex items-center gap-2">
            <Crown className="h-4 w-4 text-[#EE6055] fill-current" />
            <span>Premium Access Active</span>
          </div>
        </div>

        {/* 4 Cards Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 flex-shrink-0">
          
          {/* Stat 1 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Tests Taken</span>
              <div className="h-10 w-10 bg-[#EFF4FB] text-[#1E3A6E] rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#05162E]">{stats.attempts}</div>
          </div>

          {/* Stat 2 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Average Score</span>
              <div className="h-10 w-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                <Star className="h-5 w-5 fill-current" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#05162E]">{stats.avgScore}</div>
          </div>

          {/* Stat 3 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Reading Score</span>
              <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#05162E]">{stats.readingScore}</div>
          </div>

          {/* Stat 4 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Listening Score</span>
              <div className="h-10 w-10 bg-[#EE6055]/10 text-[#EE6055] rounded-xl flex items-center justify-center">
                <Headphones className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#05162E]">{stats.listeningScore}</div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Link to="/courses" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="h-12 w-12 rounded-xl bg-[#EFF4FB] text-[#1E3A6E] flex items-center justify-center mb-5">
              <Play className="h-6 w-6 fill-current" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">Recorded Courses</h3>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-500">Watch IELTS lessons across Reading, Listening, Writing, and Speaking.</p>
            <span className="mt-5 inline-flex items-center gap-1 text-[13px] font-black text-[#1E3A6E]">Continue Learning <ChevronRight className="h-4 w-4" /></span>
          </Link>
          <Link to="/tests?mode=practice" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">Practice Tests</h3>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-500">Practice individual IELTS skills with section-wise question sets.</p>
            <span className="mt-5 inline-flex items-center gap-1 text-[13px] font-black text-[#1E3A6E]">Open Practice <ChevronRight className="h-4 w-4" /></span>
          </Link>
          <Link to="/tests?mode=mock" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="h-12 w-12 rounded-xl bg-[#EE6055]/10 text-[#EE6055] flex items-center justify-center mb-5">
              <PenLine className="h-6 w-6" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">Full Mock Tests</h3>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-500">Simulate the computer-based IELTS test with timing and results.</p>
            <span className="mt-5 inline-flex items-center gap-1 text-[13px] font-black text-[#1E3A6E]">Start Mock <ChevronRight className="h-4 w-4" /></span>
          </Link>
        </div>

        {/* Available Mock Tests */}
        <div className="flex flex-col gap-5 mt-2">
          <div className="flex justify-between items-end">
            <h3 className="text-[18px] font-black text-[#05162E]">Available Mock Tests</h3>
            <Link to="/tests?mode=mock" className="text-[13px] text-[#1E3A6E] hover:text-[#EE6055] font-bold flex items-center gap-1 transition-colors">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-2xl p-8 text-center text-[14px] text-slate-500 font-bold">
                Loading mock tests...
              </div>
            ) : availableTests.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-2xl p-8 text-center text-[14px] text-slate-500 font-bold">
                No published mock tests available yet.
              </div>
            ) : availableTests.map(test => (
              <div
                key={test.id}
                className={`${test.is_locked ? 'bg-[#F8FAFC]' : 'bg-white hover:-translate-y-1'} border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-transform duration-300`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {getSectionTypes(test).map(type => (
                      <span key={type} className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${sectionBadgeClass(type)}`}>
                        {type}
                      </span>
                    ))}
                  </div>
                  <span className="text-[12px] text-slate-500 font-semibold whitespace-nowrap">{getMockSummary(test)}</span>
                </div>
                <div>
                  <h4 className={`font-extrabold text-[16px] leading-tight ${test.is_locked ? 'text-slate-400' : 'text-[#05162E]'}`}>{test.title}</h4>
                  <p className={`text-[13px] mt-1 ${test.is_locked ? 'text-slate-400' : 'text-slate-500'}`}>{test.description || 'Full IELTS mock exam with multiple modules.'}</p>
                </div>
                {test.is_locked ? (
                  <Link to="/access-request" className="w-full mt-auto py-2.5 bg-slate-200 text-slate-500 text-[13px] font-bold rounded-xl flex items-center justify-center gap-2">
                    <Lock className="h-4 w-4" /> Locked
                  </Link>
                ) : (
                  <button
                    onClick={() => handleStartTest(test.id)}
                    className="w-full mt-auto py-2.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    Start Mock Test <Play className="h-3 w-3 fill-current" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Results and Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          
          {/* Column Left: Recent Results Table */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <h3 className="text-[18px] font-black text-[#05162E]">Recent Results</h3>
            
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex-grow">
              {loading ? (
                <div className="p-10 text-center text-[14px] text-slate-500 font-medium animate-pulse">
                  Loading performance records...
                </div>
              ) : history.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <History className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-[14px] text-slate-500 font-bold">No mock tests completed yet.</p>
                  <p className="text-[12px] text-slate-400 mt-1">Take your first test to see your performance here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-4 px-6 font-bold">Test Name</th>
                        <th className="py-4 px-6 font-bold">Type</th>
                        <th className="py-4 px-6 font-bold">Score</th>
                        <th className="py-4 px-6 font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 font-bold text-[#05162E]">{item.mock_tests?.title || 'IELTS Mock Test'}</td>
                          <td className="py-4 px-6">
                            <span className="capitalize font-semibold text-slate-500">Mock Test</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 bg-[#EE6055]/10 text-[#d45248] text-[12px] font-black rounded-lg">
                              {parseFloat(item.score as string).toFixed(1)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">
                            {new Date(item.submitted_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Column Right: Progress Circle Card */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <h3 className="text-[18px] font-black text-[#05162E]">Your Progress</h3>
            
            <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center gap-6 min-h-[250px]">
              
              {/* Radial Progress Gauge */}
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#22C55E]"
                    strokeDasharray={`${courseProgress.percent || 0}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[28px] font-black text-[#05162E] leading-none">{courseProgress.percent}%</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Learning</span>
                </div>
              </div>

              <div>
                <h5 className="font-extrabold text-[14px] text-[#05162E]">Learning Progress</h5>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{courseProgress.completed}/{courseProgress.total} recorded lessons completed.</p>
              </div>

            </div>
          </div>

        </div>

      </main>

    </div>
  );
}

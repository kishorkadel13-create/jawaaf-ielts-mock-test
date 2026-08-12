import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  KeyRound,
  LogOut,
  Mail,
  Menu,
  MoreVertical,
  PenLine,
  Target,
  UserPlus,
  UsersRound,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import AdminSidebar from '../../components/admin/AdminSidebar';
import NotificationBell from '../../components/NotificationBell';

interface AdminTest {
  id: string;
  title: string;
  duration: number;
  is_published: boolean;
  created_at?: string;
  sections?: Array<{ type: 'reading' | 'listening' | 'writing' }>;
}

interface ActivityItem {
  label: string;
  meta: string;
  tone: 'blue' | 'green' | 'purple' | 'orange';
}

const formatDate = (value?: string) => {
  if (!value) return 'Recently';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [courseSections, setCourseSections] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [teacherCount, setTeacherCount] = useState(() => Number(localStorage.getItem('created_teacher_count') || '0'));
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ full_name: '', email: '', password: '' });
  const [creatingTeacher, setCreatingTeacher] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [{ data: testData }, { data: requestData }, { data: historyData }, { data: courseData }] = await Promise.all([
          api.get('/tests'),
          api.get('/access/requests').catch(() => ({ data: [] })),
          api.get('/attempts/history').catch(() => ({ data: [] })),
          api.get('/admin/courses').catch(() => ({ data: [] }))
        ]);

        setTests(Array.isArray(testData) ? testData : []);
        setAttempts(Array.isArray(historyData) ? historyData : []);
        setCourseSections(Array.isArray(courseData) ? courseData : []);
        setPendingRequests(Array.isArray(requestData) ? requestData.filter((request: any) => request.status === 'pending').length : 0);
      } catch (err) {
        console.warn('Unable to load admin dashboard:', err);
      }
    };

    loadDashboard();
  }, []);

  const mockTests = useMemo(
    () => tests.filter(test => (test.sections || []).length > 1 || new Set((test.sections || []).map(section => section.type)).size > 1),
    [tests]
  );

  const practiceTests = useMemo(
    () => tests.filter(test => {
      const sectionTypes = new Set((test.sections || []).map(section => section.type));
      return (test.sections || []).length === 1 || sectionTypes.size === 1;
    }),
    [tests]
  );

  const recentTests = useMemo(() => tests.slice(0, 4), [tests]);
  const lessonCount = useMemo(
    () => courseSections.reduce((total, section) => total + (section.lessons?.length || 0), 0),
    [courseSections]
  );

  const recentActivity: ActivityItem[] = useMemo(() => {
    const latestTests = tests.slice(0, 3).map((test, index) => ({
      label: `${test.title} ${test.is_published ? 'published' : 'saved as draft'}`,
      meta: formatDate(test.created_at),
      tone: (index === 0 ? 'blue' : index === 1 ? 'green' : 'orange') as ActivityItem['tone']
    }));

    return [
      ...latestTests,
      ...(teacherCount > 0 ? [{ label: 'Teacher account added', meta: 'Recently', tone: 'purple' as const }] : []),
      ...(pendingRequests > 0 ? [{ label: `${pendingRequests} student approval pending`, meta: 'Needs review', tone: 'orange' as const }] : [])
    ].slice(0, 5);
  }, [pendingRequests, teacherCount, tests]);

  const handleCreateTeacher = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setCreatingTeacher(true);
      await api.post('/admin/teachers', teacherForm);
      const nextTeacherCount = teacherCount + 1;
      localStorage.setItem('created_teacher_count', String(nextTeacherCount));
      setTeacherCount(nextTeacherCount);
      setTeacherForm({ full_name: '', email: '', password: '' });
      setIsTeacherModalOpen(false);
      alert(`Teacher account created. Login email: ${teacherForm.email}`);
    } catch (err: any) {
      console.error('Failed to create teacher:', err);
      alert(err.response?.data?.message || err.message || err.error || 'Failed to create teacher account.');
    } finally {
      setCreatingTeacher(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const statCards = [
    {
      title: 'Mock Tests',
      value: mockTests.length,
      subtitle: 'Total mock tests',
      href: '/admin/tests?create=mock',
      action: 'Create mock test',
      icon: ClipboardList,
      tone: 'blue'
    },
    {
      title: 'Practice Tests',
      value: practiceTests.length,
      subtitle: 'Total practice tests',
      href: '/admin/tests?create=practice',
      action: 'Create practice test',
      icon: Target,
      tone: 'green'
    },
    {
      title: 'Recorded Lessons',
      value: lessonCount,
      subtitle: 'Course videos',
      href: '/admin/courses',
      action: 'Manage lessons',
      icon: BookOpen,
      tone: 'purple'
    },
    {
      title: 'Teachers',
      value: teacherCount,
      subtitle: 'Created teacher logins',
      action: 'Add teacher',
      icon: UsersRound,
      tone: 'green',
      onClick: () => setIsTeacherModalOpen(true)
    },
    {
      title: 'Total Attempts',
      value: attempts.length,
      subtitle: 'Across all tests',
      href: '/admin/submissions',
      action: 'View report',
      icon: BarChart3,
      tone: 'orange'
    }
  ];

  const toneClass = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-500'
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="flex min-h-screen">
        <AdminSidebar
          activeTab="dashboard"
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onAddTeacherClick={() => setIsTeacherModalOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6 lg:min-h-[86px] lg:px-10">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="Open admin navigation"
              >
                <Menu className="h-6 w-6" />
              </button>
              <button className="hidden h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:grid">
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="min-w-0 truncate text-[20px] font-black tracking-tight text-[#061A36] sm:text-[24px]">Dashboard</h1>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-5">
              <NotificationBell
                fallbackCount={pendingRequests || 0}
                className="relative hidden h-11 w-11 place-items-center rounded-xl text-[#061A36] hover:bg-slate-100 sm:grid"
                iconClassName="h-6 w-6"
                badgeClassName="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#F59E24] px-1 text-[10px] font-black text-white"
              />
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <button onClick={handleLogout} className="flex items-center gap-3 rounded-2xl px-2 py-1 hover:bg-slate-100">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#EAF1FB] text-[15px] font-black text-[#1E3A6E]">A</div>
                <div className="hidden text-left sm:block">
                  <p className="text-[14px] font-black text-[#061A36]">Admin</p>
                  <p className="text-[12px] font-bold text-slate-500">Super Admin</p>
                </div>
                <LogOut className="hidden h-4 w-4 text-slate-500 sm:block" />
              </button>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-7">
            <div className="mx-auto max-w-[1480px] space-y-6">
              <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words text-[24px] font-black leading-tight tracking-tight text-[#061A36] sm:text-[28px]">Welcome back, Admin!</h2>
                  <p className="mt-1 text-[15px] font-medium text-slate-500">Here's what's happening with your IELTS Lab.</p>
                </div>
                <div className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-slate-600 shadow-sm sm:w-fit sm:px-5">
                  <CalendarDays className="h-5 w-5 text-slate-500" />
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  const content = (
                    <>
                      <div className="flex items-start gap-5">
                        <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${toneClass[card.tone as keyof typeof toneClass]}`}>
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-black text-[#061A36]">{card.title}</h3>
                          <p className="mt-3 text-[30px] font-black leading-none text-[#061A36]">{card.value}</p>
                          <p className="mt-2 text-[12px] font-bold text-slate-500">{card.subtitle}</p>
                        </div>
                      </div>
                      <span className={`mt-6 inline-flex items-center gap-2 text-[13px] font-black ${card.tone === 'green' ? 'text-emerald-600' : card.tone === 'purple' ? 'text-violet-600' : card.tone === 'orange' ? 'text-orange-500' : 'text-blue-600'
                        }`}>
                        {card.action} <ArrowRight className="h-4 w-4" />
                      </span>
                    </>
                  );

                  return card.href ? (
                    <Link key={card.title} to={card.href} className="flex min-h-[152px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:min-h-[178px] sm:p-6">
                      {content}
                    </Link>
                  ) : (
                    <button key={card.title} onClick={card.onClick} className="flex min-h-[152px] flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:min-h-[178px] sm:p-6">
                      {content}
                    </button>
                  );
                })}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <h3 className="text-[20px] font-black text-[#061A36]">Quick Actions</h3>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <Link to="/admin/tests?create=mock" className="group flex min-h-20 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:bg-blue-50/30 sm:gap-5 sm:p-5">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600 sm:h-[72px] sm:w-[72px]">
                      <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[16px] font-black text-[#061A36]">Create Mock Test</h4>
                      <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-500">Create a full length mock test with all 3 sections.</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#061A36] group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link to="/admin/tests?create=practice" className="group flex min-h-20 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/30 sm:gap-5 sm:p-5">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 sm:h-[72px] sm:w-[72px]">
                      <Target className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[16px] font-black text-[#061A36]">Create Practice Test</h4>
                      <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-500">Create a practice test for individual section.</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#061A36] group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <button onClick={() => setIsTeacherModalOpen(true)} className="group flex min-h-20 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-violet-200 hover:bg-violet-50/30 sm:gap-5 sm:p-5">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 sm:h-[72px] sm:w-[72px]">
                      <UsersRound className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[16px] font-black text-[#061A36]">Add Teacher</h4>
                      <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-500">Create new teacher account and manage access.</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#061A36] group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.38fr)_minmax(320px,0.86fr)]">
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-7 sm:py-6">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-[20px] font-black text-[#061A36]">Recent Tests</h3>
                    <Link to="/admin/tests" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-black text-blue-600 shadow-sm hover:bg-blue-50">View All</Link>
                  </div>
                  <div className="mt-6 flex gap-4 overflow-x-auto border-b border-slate-200 text-[14px] font-black text-slate-500 sm:gap-8 sm:text-[15px]">
                    <span className="whitespace-nowrap border-b-4 border-blue-600 px-3 pb-4 text-blue-700 sm:px-6">Mock Tests</span>
                    <span className="whitespace-nowrap px-2 pb-4">Practice Tests</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(recentTests.length ? recentTests : [
                      { id: 'empty', title: 'No tests created yet', duration: 0, is_published: false, sections: [] }
                    ]).map((test) => {
                      const isPractice = (test.sections || []).length <= 1;
                      return (
                        <div key={test.id} className="flex min-h-[76px] flex-wrap items-center gap-3 py-3 sm:flex-nowrap sm:gap-5">
                          <div className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl ${isPractice ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isPractice ? <Target className="h-6 w-6" /> : <ClipboardList className="h-6 w-6" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-black text-[#061A36]">{test.title}</p>
                            <p className="mt-1 text-[12px] font-bold text-slate-500">
                              {isPractice ? 'Practice' : 'Full Length'} <span className="px-1 text-slate-300">•</span> {test.duration ? `${test.duration} mins` : 'Ready to build'}
                            </p>
                          </div>
                          <span className={`rounded-lg px-3 py-2 text-[12px] font-black sm:px-4 ${test.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
                            {test.is_published ? 'Published' : 'Draft'}
                          </span>
                          <MoreVertical className="h-5 w-5 text-slate-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-7 sm:py-6">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-[20px] font-black text-[#061A36]">Recent Activity</h3>
                    <Link to="/admin/submissions" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-black text-blue-600 shadow-sm hover:bg-blue-50">View All</Link>
                  </div>
                  <div className="mt-6">
                    {(recentActivity.length ? recentActivity : [{ label: 'No recent activity yet', meta: 'Create your first test', tone: 'blue' as const }]).map((item, index) => (
                      <div
                        key={`${item.label}-${index}`}
                        className="grid min-h-[76px] grid-cols-[44px_minmax(0,1fr)] gap-3 sm:grid-cols-[52px_minmax(0,1fr)_88px] sm:gap-4"
                      >
                        <div className="relative flex flex-col items-center">
                          <div className={`grid h-12 w-12 place-items-center rounded-2xl ${toneClass[item.tone]}`}>
                            {item.tone === 'green' ? <Target className="h-6 w-6" /> : item.tone === 'purple' ? <UsersRound className="h-6 w-6" /> : item.tone === 'orange' ? <PenLine className="h-6 w-6" /> : <ClipboardList className="h-6 w-6" />}
                          </div>
                          {index < recentActivity.length - 1 && <div className="h-7 w-px bg-slate-200" />}
                        </div>
                        <div className="min-w-0 pb-4 pt-1">
                          <p className="text-[14px] font-black leading-relaxed text-[#061A36]">{item.label}</p>
                          <p className="mt-0.5 text-[12px] font-bold text-slate-500">by Admin</p>
                        </div>
                        <span className="col-start-2 -mt-4 pb-3 text-left text-[12px] font-bold text-slate-400 sm:col-start-auto sm:mt-0 sm:pb-0 sm:pt-2 sm:text-right">{item.meta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#05162E]/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateTeacher} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-[#F8FAFC] px-5 py-5 sm:px-7">
              <div>
                <h3 className="text-[20px] font-black text-[#061A36]">Create Teacher Account</h3>
                <p className="mt-1 text-[13px] font-semibold text-slate-500">Teacher login banayepachi writing review dashboard khulcha.</p>
              </div>
              <button type="button" onClick={() => setIsTeacherModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-[#061A36]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 p-5 sm:p-7">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Teacher Name</span>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={teacherForm.full_name}
                    onChange={(event) => setTeacherForm(current => ({ ...current, full_name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-3.5 pl-11 pr-4 text-[14px] font-semibold outline-none focus:border-[#1E3A6E]"
                    placeholder="e.g. IELTS Teacher"
                  />
                </div>
              </label>

              <label className="grid gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Login Email</span>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="email"
                    value={teacherForm.email}
                    onChange={(event) => setTeacherForm(current => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-3.5 pl-11 pr-4 text-[14px] font-semibold outline-none focus:border-[#1E3A6E]"
                    placeholder="teacher@example.com"
                  />
                </div>
              </label>

              <label className="grid gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Temporary Password</span>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={teacherForm.password}
                    onChange={(event) => setTeacherForm(current => ({ ...current, password: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-3.5 pl-11 pr-4 text-[14px] font-semibold outline-none focus:border-[#1E3A6E]"
                    placeholder="At least 6 characters"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={creatingTeacher}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#1E3A6E] px-5 py-3.5 text-[14px] font-black text-white transition-colors hover:bg-[#162d57] disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" /> {creatingTeacher ? 'Creating Teacher...' : 'Create Teacher Login'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

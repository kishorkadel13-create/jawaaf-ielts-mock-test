import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { 
  Award, BookOpen, ShieldCheck, Plus, 
  Trash2, Copy, Edit, ToggleLeft, ToggleRight, Clock, Eye, 
  EyeOff, ChevronRight, X, PenLine, Grid2X2, Target,
  UsersRound, BarChart3, Settings, History, Bell, Menu, LogOut
} from 'lucide-react';
import JawaafLogo from '../../components/JawaafLogo';

interface MockTest {
  id: string;
  title: string;
  description: string;
  duration: number;
  is_locked: boolean;
  is_demo: boolean;
  is_published: boolean;
  sections?: Array<{
    id: string;
    type: 'reading' | 'listening' | 'writing';
    title: string;
    duration?: number;
    order_no?: number;
    question_count?: number;
    group_count?: number;
  }>;
}

type SectionTemplate = 'full_mock' | 'reading' | 'reading_passage_1' | 'reading_passage_2' | 'reading_passage_3' | 'listening' | 'writing' | 'writing_task_1' | 'writing_task_2';

export default function AdminTestsPage() {
  const navigate = useNavigate();
  const { token, isLoading: authLoading, logout } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createContext, setCreateContext] = useState<'mock' | 'practice'>('mock');
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chartCategory, setChartCategory] = useState('Bar Graph');
  const [isDemo, setIsDemo] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [duration, setDuration] = useState(60);
  const [sectionTemplate, setSectionTemplate] = useState<SectionTemplate>('full_mock');
  const [submitting, setSubmitting] = useState(false);
  const pageMode = searchParams.get('mode') === 'practice' || searchParams.get('create') === 'practice'
    ? 'practice'
    : 'mock';

  const fetchTests = async () => {
    if (authLoading) return;

    if (!token) {
      setTests([]);
      setLoading(false);
      setFetchError('Your admin session is not ready. Please refresh or log in again.');
      return;
    }

    try {
      setLoading(true);
      setFetchError(null);
      const { data } = await api.get('/tests', {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!Array.isArray(data)) {
        throw new Error('Mock tests response was not a list.');
      }
      setTests(data);
    } catch (err: any) {
      console.error('Failed to fetch tests:', err);
      setTests([]);
      setFetchError(err.message || 'Failed to load mock tests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [authLoading, token]);

  const openCreateModal = (template: SectionTemplate = 'full_mock') => {
    setModalMode('create');
    setCreateContext(template === 'full_mock' ? 'mock' : 'practice');
    setTitle('');
    setDescription('');
    setIsDemo(false);
    setIsPublished(false);
    setSectionTemplate(template);
    setDuration(
      template === 'full_mock' ? 150
        : template.startsWith('reading_passage_') ? 20
        : template === 'listening' ? 30
        : template === 'writing_task_1' ? 30
        : template === 'writing_task_2' ? 50
        : 60
    );
    setIsModalOpen(true);
  };

  useEffect(() => {
    const createMode = searchParams.get('create');
    if (createMode === 'mock') {
      openCreateModal('full_mock');
      setSearchParams({ mode: 'mock' });
    }
    if (createMode === 'practice') {
      openCreateModal('reading');
      setSearchParams({ mode: 'practice' });
    }
  }, [searchParams, setSearchParams]);

  const openEditModal = (test: MockTest) => {
    setModalMode('edit');
    setCreateContext('mock');
    setEditingTestId(test.id);
    setTitle(test.title);
    
    let parsedDesc = test.description || '';
    let parsedCategory = 'Bar Graph';
    try {
      if (parsedDesc.trim().startsWith('{') && parsedDesc.includes('"chartCategory"')) {
        const parsed = JSON.parse(parsedDesc);
        parsedDesc = parsed.text || '';
        parsedCategory = parsed.chartCategory || 'Bar Graph';
      }
    } catch (e) {}

    setDescription(parsedDesc);
    setChartCategory(parsedCategory);
    
    setIsDemo(test.is_demo);
    setIsPublished(test.is_published);
    setDuration(test.duration);
    setSectionTemplate('full_mock');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const isWritingTask1 = sectionTemplate === 'writing_task_1' || (modalMode === 'edit' && chartCategory !== 'Bar Graph');
      const finalDescription = isWritingTask1 
        ? JSON.stringify({ text: description, chartCategory })
        : description;

      const payload = {
        title,
        description: finalDescription,
        is_demo: isDemo,
        is_published: isPublished,
        duration: Number(duration),
        ...(modalMode === 'create' ? { section_template: sectionTemplate } : {}),
      };

      if (modalMode === 'create') {
        await api.post('/tests', payload);
        fetchTests();
      } else {
        const { data } = await api.put(`/tests/${editingTestId}`, payload);
        setTests(prev => prev.map(t => t.id === editingTestId ? { ...t, ...data, sections: data.sections || t.sections } : t));
      }

      setIsModalOpen(false);
      setSubmitting(false);
    } catch (err: any) {
      console.error('Failed to submit test form:', err);
      alert(err.message || 'Operation failed.');
      setSubmitting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      if (!confirm('Are you sure you want to duplicate this entire test structure?')) return;
      const { data } = await api.post(`/tests/${id}/duplicate`);
      alert(data.message || 'Test duplicated successfully!');
      fetchTests();
    } catch (err: any) {
      console.error('Failed to duplicate test:', err);
      alert(err.message || 'Duplication failed.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (!confirm('Are you sure you want to delete this test? This will permanently remove all sections, question groups, questions, and student attempts.')) return;
      await api.delete(`/tests/${id}`);
      setTests(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Failed to delete test:', err);
      alert(err.message || 'Deletion failed.');
    }
  };

  const togglePublish = async (test: MockTest) => {
    try {
      const payload = {
        title: test.title,
        description: test.description,
        is_demo: test.is_demo,
        is_published: !test.is_published,
        duration: test.duration
      };
      const { data } = await api.put(`/tests/${test.id}`, payload);
      setTests(prev => prev.map(t => t.id === test.id ? { ...t, ...data, sections: data.sections || t.sections } : t));
    } catch (err: any) {
      console.error('Failed to toggle publish:', err);
      alert(err.message || 'Update failed.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isPracticeTest = (test: MockTest) => {
    const sections = (test as any).sections || [];
    const sectionTypes = new Set(sections.map((section: any) => section.type));
    return sections.length === 1 || sectionTypes.size === 1;
  };

  const visibleTests = tests.filter(test => pageMode === 'practice' ? isPracticeTest(test) : !isPracticeTest(test));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="flex min-h-screen">
        <aside
          className="hidden w-[318px] shrink-0 flex-col text-white lg:flex"
          style={{ background: '#172338' }}
        >
          <div className="px-9 pt-10 pb-10">
            <Link to="/" className="inline-flex">
              <JawaafLogo isWhite className="h-[58px] w-auto" />
            </Link>
          </div>

          <nav className="flex-1 px-5">
            <Link to="/admin" className="flex items-center gap-4 rounded-xl px-5 py-4 text-[16px] font-semibold text-slate-200 hover:bg-[#243047] hover:text-white">
              <Grid2X2 className="h-5 w-5" /> Dashboard
            </Link>

            <p className="px-4 pt-10 pb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">Test Management</p>
            <Link to="/admin/tests?mode=mock" className={`flex items-center gap-4 rounded-xl px-5 py-4 text-[16px] ${pageMode === 'mock' ? 'bg-[#F9544F] font-bold shadow-lg shadow-[#F9544F]/20' : 'font-semibold text-slate-200 hover:bg-[#243047] hover:text-white'}`}>
              <BookOpen className="h-5 w-5" /> Mock Tests
            </Link>
            <Link to="/admin/tests?mode=practice" className={`flex items-center gap-4 rounded-xl px-5 py-4 text-[16px] ${pageMode === 'practice' ? 'bg-[#F9544F] font-bold shadow-lg shadow-[#F9544F]/20' : 'font-semibold text-slate-200 hover:bg-[#243047] hover:text-white'}`}>
              <Target className="h-5 w-5" /> Practice Tests
            </Link>

            <p className="px-4 pt-8 pb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">User Management</p>
            <Link to="/admin" className="flex items-center gap-4 rounded-xl px-5 py-3.5 text-[16px] font-semibold text-slate-200 hover:bg-[#243047] hover:text-white">
              <UsersRound className="h-5 w-5" /> Teachers
            </Link>

            <p className="px-4 pt-8 pb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">Other</p>
            <Link to="/admin/submissions" className="flex items-center gap-4 rounded-xl px-5 py-3.5 text-[16px] font-semibold text-slate-200 hover:bg-[#243047] hover:text-white">
              <BarChart3 className="h-5 w-5" /> Reports
            </Link>
            <Link to="/admin" className="flex items-center gap-4 rounded-xl px-5 py-3.5 text-[16px] font-semibold text-slate-200 hover:bg-[#243047] hover:text-white">
              <Settings className="h-5 w-5" /> Settings
            </Link>
            <Link to="/admin" className="flex items-center gap-4 rounded-xl px-5 py-3.5 text-[16px] font-semibold text-slate-200 hover:bg-[#243047] hover:text-white">
              <History className="h-5 w-5" /> Activity Log
            </Link>
          </nav>

          <div className="p-5">
            <button onClick={handleLogout} className="w-full border-t border-slate-600/40 p-4 text-left hover:bg-[#243047]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF1FB] text-[16px] font-black text-[#1E3A6E]">A</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-black text-white">Admin</p>
                  <p className="text-[12px] font-medium text-slate-400">Super Admin</p>
                </div>
                <LogOut className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[86px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur lg:px-10">
            <div className="flex items-center gap-5">
              <button className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden">
                <Menu className="h-6 w-6" />
              </button>
              <button className="hidden h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:grid">
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-[24px] font-black tracking-tight text-[#061A36]">{pageMode === 'practice' ? 'Practice Tests' : 'Mock Tests'}</h1>
            </div>

            <div className="flex items-center gap-5">
              <div className="relative hidden sm:block">
                <Bell className="h-6 w-6 text-[#061A36]" />
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#F59E24] px-1 text-[10px] font-black text-white">0</span>
              </div>
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

          <main className="flex-1 p-6 md:p-10 flex flex-col gap-8 overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 pb-5">
              <div>
                <h1 className="text-[28px] md:text-[32px] font-black text-[#05162E] tracking-tight">{pageMode === 'practice' ? 'Practice Tests' : 'Mock Tests'}</h1>
                <p className="text-[14px] text-slate-500 mt-1">
                  {pageMode === 'practice'
                    ? 'Create and manage single-section reading, listening, and writing practice tests.'
                    : 'Create and manage full IELTS mock exams only.'}
                </p>
              </div>
              
              <button
                onClick={() => openCreateModal(pageMode === 'practice' ? 'reading' : 'full_mock')}
                className="px-5 py-2.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-[#1E3A6E]/20"
              >
                <Plus className="h-4 w-4" /> {pageMode === 'practice' ? 'Add Practice Test' : 'Add Mock Test'}
              </button>
            </div>

        {/* Tests List */}
        {loading ? (
          <div className="flex-1 flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1E3A6E] rounded-full animate-spin"></div>
          </div>
        ) : fetchError ? (
          <div className="bg-white border border-red-100 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <X className="h-10 w-10 text-red-400" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">Could not load mock tests</h3>
            <p className="text-red-500 mt-2 text-[14px] max-w-md">{fetchError}</p>
            <button
              onClick={fetchTests}
              className="mt-6 px-5 py-2.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : visibleTests.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">No {pageMode === 'practice' ? 'practice' : 'mock'} tests configured</h3>
            <p className="text-slate-500 mt-2 text-[15px]">Get started by creating your first IELTS {pageMode === 'practice' ? 'practice' : 'mock'} test.</p>
            <button
              onClick={() => openCreateModal(pageMode === 'practice' ? 'reading' : 'full_mock')}
              className="mt-6 px-5 py-2.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm"
            >
              Create {pageMode === 'practice' ? 'Practice' : 'Mock'} Test
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleTests.map((test) => (
              <div 
                key={test.id}
                className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-6 relative overflow-hidden"
              >
                {/* Decorative Top Border based on publish status */}
                <div className={`absolute top-0 left-0 w-full h-1 ${test.is_published ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>

                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-extrabold text-[16px] text-[#05162E] leading-snug">{test.title}</h3>
                      <p className="text-[13px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {test.description || 'No description provided.'}
                      </p>
                    </div>
                    
                    {test.is_demo ? (
                      <span className="shrink-0 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                        Free Demo
                      </span>
                    ) : (
                      <span className="shrink-0 px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                        Premium
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-5 text-[12px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-slate-400" /> {test.duration} Min
                    </span>
                    <span className="flex items-center gap-1.5">
                      {test.is_published ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <Eye className="h-4 w-4" /> Published
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <EyeOff className="h-4 w-4" /> Draft
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-auto">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => togglePublish(test)}
                      className={`p-2 rounded-xl transition-all ${
                        test.is_published 
                          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100'
                          : 'text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200'
                      }`}
                      title={test.is_published ? "Unpublish Test" : "Publish Test"}
                    >
                      {test.is_published ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => openEditModal(test)}
                      className="p-2 text-slate-400 hover:text-[#1E3A6E] hover:bg-[#F8FAFC] border border-transparent hover:border-slate-200 rounded-xl transition-all"
                      title="Edit Settings"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(test.id)}
                      className="p-2 text-slate-400 hover:text-[#1E3A6E] hover:bg-[#F8FAFC] border border-transparent hover:border-slate-200 rounded-xl transition-all"
                      title="Duplicate Test"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(test.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all"
                      title="Delete Test"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <Link
                    to={`/admin/tests/${test.id}`}
                    className="px-4 py-2 bg-[#F8FAFC] hover:bg-slate-100 text-[#05162E] border border-slate-200 text-[12px] font-bold rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    Manage Content <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05162E]/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
              >
                <div className="px-7 py-5 bg-[#F8FAFC] border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#F9544F]">Test Builder</p>
                    <h3 className="font-black text-[22px] text-[#05162E]">
                      {modalMode === 'create'
                        ? createContext === 'practice'
                          ? 'Create Practice Test'
                          : 'Create Mock Test'
                        : 'Edit Test'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-[#05162E] hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className={`grid gap-0 ${modalMode === 'create' ? 'lg:grid-cols-[0.95fr_1.05fr]' : ''}`}>
                  {modalMode === 'create' && (
                    <div className="bg-[#F8FAFC] p-7 border-r border-slate-100">
                      <h4 className="text-[15px] font-black text-[#05162E]">
                        {createContext === 'practice' ? 'Choose practice module' : 'Mock exam structure'}
                      </h4>
                      <p className="text-[12px] font-semibold text-slate-500 mt-1">
                        {createContext === 'practice'
                          ? 'Practice tests are single module only.'
                          : 'Mock test includes the complete exam flow.'}
                      </p>
                      <div className="mt-5 grid gap-3">
                      {[
                        { key: 'full_mock' as SectionTemplate, title: 'Full Mock', note: 'Listening + Reading + Writing', icon: BookOpen, durationValue: 150 },
                        { key: 'reading' as SectionTemplate, title: 'Reading Practice', note: 'Single reading section', icon: BookOpen, durationValue: 60 },
                        { key: 'reading_passage_1' as SectionTemplate, title: 'Reading Passage 1', note: 'Passage 1 practice set • 20 minutes', icon: BookOpen, durationValue: 20 },
                        { key: 'reading_passage_2' as SectionTemplate, title: 'Reading Passage 2', note: 'Passage 2 practice set • 20 minutes', icon: BookOpen, durationValue: 20 },
                        { key: 'reading_passage_3' as SectionTemplate, title: 'Reading Passage 3', note: 'Passage 3 practice set • 20 minutes', icon: BookOpen, durationValue: 20 },
                        { key: 'listening' as SectionTemplate, title: 'Listening Practice', note: 'Single listening section', icon: Award, durationValue: 30 },
                        { key: 'writing' as SectionTemplate, title: 'Writing Practice', note: 'Task 1 + Task 2', icon: PenLine, durationValue: 60 },
                        { key: 'writing_task_1' as SectionTemplate, title: 'Writing Task 1 Practice', note: 'Task 1 only • 30 minutes', icon: PenLine, durationValue: 30 },
                        { key: 'writing_task_2' as SectionTemplate, title: 'Writing Task 2 Practice', note: 'Task 2 only • 50 minutes', icon: PenLine, durationValue: 50 },
                      ]
                        .filter(template => createContext === 'mock' ? template.key === 'full_mock' : template.key !== 'full_mock')
                        .map((template) => {
                        const Icon = template.icon;
                        const isSelected = sectionTemplate === template.key;

                        return (
                          <button
                            key={template.key}
                            type="button"
                            onClick={() => { setSectionTemplate(template.key); setDuration(template.durationValue); }}
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                              isSelected
                                ? 'border-[#1E3A6E] bg-[#EFF4FB] text-[#1E3A6E]'
                                : 'border-slate-200 bg-white text-slate-500 hover:bg-[#F8FAFC]'
                            }`}
                          >
                            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isSelected ? 'bg-white text-[#1E3A6E]' : 'bg-slate-50 text-slate-500'}`}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <span>
                              <span className="block text-[14px] font-black">{template.title}</span>
                              <span className="block text-[11px] font-bold mt-1">{template.note}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    </div>
                  )}

                  <div className="p-7 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-bold text-[#05162E] uppercase tracking-wider">Test Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cambridge IELTS 18 Academic Test 1"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10 rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-bold text-[#05162E] uppercase tracking-wider">Description</label>
                    <textarea
                      placeholder="Enter a brief summary or instruction list..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10 rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-[#05162E] uppercase tracking-wider">Duration (Mins)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10 rounded-xl text-[14px] text-[#05162E] outline-none transition-all"
                      />
                    </div>
                    
                    {(sectionTemplate === 'writing_task_1' || (modalMode === 'edit' && chartCategory !== 'Bar Graph')) && (
                      <div className="flex flex-col gap-2">
                        <label className="text-[12px] font-bold text-[#05162E] uppercase tracking-wider text-[#F9544F]">Chart Category</label>
                        <select
                          value={chartCategory}
                          onChange={(e) => setChartCategory(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-[#F9544F]/30 focus:border-[#F9544F] focus:ring-4 focus:ring-[#F9544F]/10 rounded-xl text-[14px] text-[#05162E] outline-none transition-all appearance-none cursor-pointer font-bold"
                        >
                          <option value="Bar Graph">Bar Graph</option>
                          <option value="Line Graph">Line Graph</option>
                          <option value="Pie Chart">Pie Chart</option>
                          <option value="Table">Table</option>
                          <option value="Map">Map</option>
                          <option value="Process">Process Diagram</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 mt-1">
                    <label className="flex items-start gap-3 cursor-pointer group p-3 border border-slate-100 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isDemo}
                          onChange={(e) => setIsDemo(e.target.checked)}
                          className="rounded text-[#1E3A6E] focus:ring-[#1E3A6E] bg-white border-slate-300 h-5 w-5"
                        />
                      </div>
                      <div>
                        <span className="text-[13px] font-extrabold text-[#05162E]">Mark as Free Demo</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">Students can access without premium membership.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group p-3 border border-slate-100 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isPublished}
                          onChange={(e) => setIsPublished(e.target.checked)}
                          className="rounded text-[#1E3A6E] focus:ring-[#1E3A6E] bg-white border-slate-300 h-5 w-5"
                        />
                      </div>
                      <div>
                        <span className="text-[13px] font-extrabold text-[#05162E]">Publish Immediately</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">Make this test visible as soon as it is saved.</p>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[14px] font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 bg-[#F9544F] hover:bg-[#e64944] disabled:opacity-50 text-white text-[14px] font-bold rounded-xl transition-all shadow-sm"
                    >
                        {submitting ? 'Saving...' : createContext === 'practice' ? 'Save Practice Test' : 'Save Mock Test'}
                    </button>
                  </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

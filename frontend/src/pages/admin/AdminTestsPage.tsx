import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { 
  Award, BookOpen, ShieldCheck, Layers, ChevronLeft, Plus, 
  Trash2, Copy, Edit, ToggleLeft, ToggleRight, Clock, Eye, 
  EyeOff, ChevronRight, X 
} from 'lucide-react';
import JawaafLogo from '../../components/JawaafLogo';

interface MockTest {
  id: string;
  title: string;
  description: string;
  type: string;
  duration: number;
  is_locked: boolean;
  is_demo: boolean;
  is_published: boolean;
}

export default function AdminTestsPage() {
  const { token, isLoading: authLoading } = useAuthStore();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);

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

  const openCreateModal = () => {
    setModalMode('create');
    setTitle('');
    setDescription('');
    setIsDemo(false);
    setIsPublished(false);
    setDuration(60);
    setIsModalOpen(true);
  };

  const openEditModal = (test: MockTest) => {
    setModalMode('edit');
    setEditingTestId(test.id);
    setTitle(test.title);
    setDescription(test.description || '');
    setIsDemo(test.is_demo);
    setIsPublished(test.is_published);
    setDuration(test.duration);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        title,
        description,
        is_demo: isDemo,
        is_published: isPublished,
        duration: Number(duration),
      };

      if (modalMode === 'create') {
        const { data } = await api.post('/tests', payload);
        setTests(prev => [data, ...prev]);
      } else {
        const { data } = await api.put(`/tests/${editingTestId}`, payload);
        setTests(prev => prev.map(t => t.id === editingTestId ? data : t));
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
      setTests(prev => prev.map(t => t.id === test.id ? data : t));
    } catch (err: any) {
      console.error('Failed to toggle publish:', err);
      alert(err.message || 'Update failed.');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen bg-[#F8FAFC] font-sans" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      {/* Admin Sidebar - Navy Theme */}
      <aside className="w-full md:w-64 bg-[#05162E] text-white flex flex-col p-6 border-r border-[#1E3A6E]/30 flex-shrink-0 z-10 shadow-xl">
        
        <div className="mb-10 mt-2 px-2">
          <Link to="/" className="block bg-white p-2 rounded-xl w-fit">
            <JawaafLogo className="h-8 w-auto" />
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Admin Console</span>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <Link to="/admin" className="px-4 py-3 text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white font-semibold rounded-xl flex items-center gap-3 transition-colors">
            <Layers className="h-5 w-5" /> Overview
          </Link>
          <Link to="/admin/tests" className="px-4 py-3 bg-[#1E3A6E] text-white font-bold rounded-xl flex items-center gap-3 transition-colors">
            <BookOpen className="h-5 w-5" /> Mock Tests CMS
          </Link>
          <Link to="/admin/access" className="px-4 py-3 text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white font-semibold rounded-xl flex items-center gap-3 transition-colors">
            <ShieldCheck className="h-5 w-5" /> Access Approvals
          </Link>
          
          <div className="mt-8 pt-6 border-t border-[#1E3A6E]/50">
            <Link to="/dashboard" className="px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white font-semibold rounded-xl flex items-center gap-3 transition-colors">
              <ChevronLeft className="h-5 w-5" /> Student Portal
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-10 flex flex-col gap-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 pb-5">
          <div>
            <h1 className="text-[28px] md:text-[32px] font-black text-[#05162E] tracking-tight">Mock Tests CMS</h1>
            <p className="text-[14px] text-slate-500 mt-1">Manage mock exams, sections, reading passages, listening tracks, and configuration.</p>
          </div>
          
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-[#1E3A6E]/20"
          >
            <Plus className="h-4 w-4" /> Add Mock Test
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
        ) : tests.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">No mock tests configured</h3>
            <p className="text-slate-500 mt-2 text-[15px]">Get started by creating your first IELTS mock test.</p>
            <button
              onClick={openCreateModal}
              className="mt-6 px-5 py-2.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm"
            >
              Create Mock Test
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {tests.map((test) => (
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
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
              >
                <div className="px-8 py-6 bg-[#F8FAFC] border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-black text-[18px] text-[#05162E]">
                    {modalMode === 'create' ? 'Create New Mock Test' : 'Edit Mock Test'}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-[#05162E] hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-bold text-[#05162E] uppercase tracking-wider">Test Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cambridge IELTS 18 Academic Test 1"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10 rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-bold text-[#05162E] uppercase tracking-wider">Description</label>
                    <textarea
                      placeholder="Enter a brief summary or instruction list..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10 rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-[#05162E] uppercase tracking-wider">Duration (Mins)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10 rounded-xl text-[14px] text-[#05162E] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mt-2">
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
                        <span className="text-[14px] font-extrabold text-[#05162E]">Mark as Free Demo</span>
                        <p className="text-[12px] text-slate-500 mt-0.5">Students can access free demo tests without requesting premium membership.</p>
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
                        <span className="text-[14px] font-extrabold text-[#05162E]">Publish Immediately</span>
                        <p className="text-[12px] text-slate-500 mt-0.5">Make this mock test visible to students as soon as it is saved.</p>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
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
                      className="px-6 py-3 bg-[#EE6055] hover:bg-[#d45248] disabled:opacity-50 text-white text-[14px] font-bold rounded-xl transition-all shadow-sm"
                    >
                      {submitting ? 'Saving...' : 'Save Mock Test'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

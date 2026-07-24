import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { 
  Award, ShieldCheck, ShieldAlert, Clock, Check, X, 
  Search, ChevronLeft, Layers, BookOpen, Mail, Calendar, UserPlus
} from 'lucide-react';
import JawaafLogo from '../../components/JawaafLogo';

interface AccessRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function AdminAccessPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState({ full_name: '', email: '', password: '' });
  const [creatingTeacher, setCreatingTeacher] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/access/requests');
      setRequests(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch access requests:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    let result = requests;
    
    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(r => r.status === filter);
    }
    
    // Apply search filter (name or email)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => {
        const fullName = r.profiles?.full_name?.toLowerCase() || '';
        const email = r.profiles?.email?.toLowerCase() || '';
        return fullName.includes(term) || email.includes(term);
      });
    }

    setFilteredRequests(result);
  }, [requests, filter, searchTerm]);

  const handleReviewRequest = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setActioningId(id);
      await api.put(`/access/requests/${id}`, { status });
      
      // Update local state instead of re-fetching
      setRequests(prev => prev.map(req => {
        if (req.id === id) {
          return { ...req, status, reviewed_at: new Date().toISOString() };
        }
        return req;
      }));
      setActioningId(null);
    } catch (err: any) {
      console.error(`Failed to ${status} request:`, err);
      alert(err.message || `Failed to update request status to ${status}`);
      setActioningId(null);
    }
  };

  const handleCreateTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setCreatingTeacher(true);
      await api.post('/admin/teachers', teacherForm);
      alert(`Teacher account created. Login email: ${teacherForm.email}`);
      setTeacherForm({ full_name: '', email: '', password: '' });
    } catch (err: any) {
      console.error('Failed to create teacher:', err);
      alert(err.response?.data?.message || err.message || err.error || 'Failed to create teacher account.');
    } finally {
      setCreatingTeacher(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold rounded-lg flex items-center gap-1.5 w-fit">
            <ShieldCheck className="h-4 w-4" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-bold rounded-lg flex items-center gap-1.5 w-fit">
            <ShieldAlert className="h-4 w-4" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 text-[11px] font-bold rounded-lg flex items-center gap-1.5 w-fit">
            <Clock className="h-4 w-4" /> Pending Review
          </span>
        );
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
          <Link to="/admin/tests" className="px-4 py-3 text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white font-semibold rounded-xl flex items-center gap-3 transition-colors">
            <BookOpen className="h-5 w-5" /> Mock Tests CMS
          </Link>
          <Link to="/admin/access" className="px-4 py-3 bg-[#1E3A6E] text-white font-bold rounded-xl flex items-center justify-between transition-colors">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" /> Access Approvals
            </div>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-[#EE6055] text-white text-[10px] font-extrabold rounded-md">
                {pendingCount}
              </span>
            )}
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
            <h1 className="text-[28px] md:text-[32px] font-black text-[#05162E] tracking-tight">Access Approvals</h1>
            <p className="text-[14px] text-slate-500 mt-1">Review student subscription requests and create teacher reviewer accounts.</p>
          </div>
        </div>

        <form onSubmit={handleCreateTeacher} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm grid gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#EFF4FB] text-[#1E3A6E] flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-black text-[#05162E]">Create Teacher Login</h2>
              <p className="text-[12px] font-semibold text-slate-500">Teachers can review mock writing submissions and release feedback.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-[1fr_1fr_220px_auto] gap-3">
            <input
              required
              type="text"
              value={teacherForm.full_name}
              onChange={(event) => setTeacherForm(current => ({ ...current, full_name: event.target.value }))}
              className="px-4 py-3 bg-[#F8FAFC] border border-slate-100 focus:border-[#1E3A6E] rounded-xl text-[14px] outline-none"
              placeholder="Teacher name"
            />
            <input
              required
              type="email"
              value={teacherForm.email}
              onChange={(event) => setTeacherForm(current => ({ ...current, email: event.target.value }))}
              className="px-4 py-3 bg-[#F8FAFC] border border-slate-100 focus:border-[#1E3A6E] rounded-xl text-[14px] outline-none"
              placeholder="teacher@email.com"
            />
            <input
              required
              type="password"
              minLength={6}
              value={teacherForm.password}
              onChange={(event) => setTeacherForm(current => ({ ...current, password: event.target.value }))}
              className="px-4 py-3 bg-[#F8FAFC] border border-slate-100 focus:border-[#1E3A6E] rounded-xl text-[14px] outline-none"
              placeholder="Password"
            />
            <button
              type="submit"
              disabled={creatingTeacher}
              className="px-5 py-3 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-black rounded-xl transition-colors disabled:opacity-60"
            >
              {creatingTeacher ? 'Creating...' : 'Create Teacher'}
            </button>
          </div>
        </form>

        {/* Filters Header */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex bg-[#F8FAFC] border border-slate-100 p-1 rounded-xl w-full lg:w-auto">
            {['pending', 'approved', 'rejected', 'all'].map((statusOption) => (
              <button
                key={statusOption}
                onClick={() => setFilter(statusOption as any)}
                className={`flex-1 sm:flex-initial px-5 py-2 text-[13px] font-bold rounded-lg capitalize transition-all ${
                  filter === statusOption
                    ? 'bg-white text-[#1E3A6E] shadow-sm'
                    : 'text-slate-500 hover:text-[#05162E]'
                }`}
              >
                {statusOption} {statusOption === 'pending' && pendingCount > 0 && `(${pendingCount})`}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-slate-100 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10 rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all"
            />
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex-1 flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1E3A6E] rounded-full animate-spin"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-[20px] font-black text-[#05162E]">No access requests found</h3>
            <p className="text-slate-500 mt-2 text-[15px]">There are no requests matching the current filters.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#EFF4FB] border border-[#1E3A6E]/10 flex items-center justify-center text-[#1E3A6E] font-black text-[18px]">
                      {req.profiles?.full_name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <h4 className="text-[16px] font-extrabold text-[#05162E]">{req.profiles?.full_name || 'Anonymous Student'}</h4>
                      <p className="text-[13px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="h-4 w-4 text-slate-400" /> {req.profiles?.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-[12px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-slate-400" /> Requested: {new Date(req.requested_at).toLocaleString()}
                    </span>
                    {req.reviewed_at && (
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" /> Reviewed: {new Date(req.reviewed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col lg:flex-row items-center gap-4 self-start md:self-center">
                  {getStatusBadge(req.status)}
                  
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={actioningId !== null}
                        onClick={() => handleReviewRequest(req.id, 'approved')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                      >
                        {actioningId === req.id ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <><Check className="h-4 w-4" /> Approve</>
                        )}
                      </button>
                      <button
                        disabled={actioningId !== null}
                        onClick={() => handleReviewRequest(req.id, 'rejected')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 text-[13px] font-bold rounded-xl transition-colors disabled:opacity-50"
                      >
                        {actioningId === req.id ? (
                          <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <><X className="h-4 w-4" /> Reject</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

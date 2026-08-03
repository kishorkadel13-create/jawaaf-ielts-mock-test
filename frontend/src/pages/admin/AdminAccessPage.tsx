import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { 
  Award, ShieldCheck, ShieldAlert, Clock, Check, X, 
  Search, Mail, Calendar, UserPlus
} from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';

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
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans flex" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      {/* Shared Admin Sidebar */}
      <AdminSidebar activeTab="approvals" />

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        
        {/* Page Header */}
        <header className="sticky top-0 z-20 flex h-[86px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur lg:px-10">
          <div className="flex items-center gap-5">
            <h1 className="text-[24px] font-black tracking-tight text-[#061A36]">Student Approvals</h1>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: '#ef5f55' }}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Active Console</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 flex flex-col gap-8">

          {/* Create Teacher Form */}
          <form onSubmit={handleCreateTeacher} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: '#294b77' }}>
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[16px] font-black text-[#061A36]">Create Teacher Login</h2>
                <p className="text-[12px] font-semibold text-slate-500">Teachers can review mock writing submissions and release feedback.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-[1fr_1fr_220px_auto] gap-3">
              <input
                required
                type="text"
                value={teacherForm.full_name}
                onChange={(event) => setTeacherForm(current => ({ ...current, full_name: event.target.value }))}
                className="px-4 py-3 bg-[#F8FAFC] border border-slate-200 focus:border-[#294b77] focus:ring-4 focus:ring-[#294b77]/10 rounded-2xl text-[14px] outline-none transition-all"
                placeholder="Teacher name"
              />
              <input
                required
                type="email"
                value={teacherForm.email}
                onChange={(event) => setTeacherForm(current => ({ ...current, email: event.target.value }))}
                className="px-4 py-3 bg-[#F8FAFC] border border-slate-200 focus:border-[#294b77] focus:ring-4 focus:ring-[#294b77]/10 rounded-2xl text-[14px] outline-none transition-all"
                placeholder="teacher@email.com"
              />
              <input
                required
                type="password"
                minLength={6}
                value={teacherForm.password}
                onChange={(event) => setTeacherForm(current => ({ ...current, password: event.target.value }))}
                className="px-4 py-3 bg-[#F8FAFC] border border-slate-200 focus:border-[#294b77] focus:ring-4 focus:ring-[#294b77]/10 rounded-2xl text-[14px] outline-none transition-all"
                placeholder="Password"
              />
              <button
                type="submit"
                disabled={creatingTeacher}
                className="px-5 py-3 text-white text-[13px] font-black rounded-2xl transition-colors disabled:opacity-60 shadow-md"
                style={{ backgroundColor: '#294b77' }}
              >
                {creatingTeacher ? 'Creating...' : 'Create Teacher'}
              </button>
            </div>
          </form>

          {/* Filters + Search */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex bg-[#F8FAFC] border border-slate-100 p-1 rounded-2xl w-full lg:w-auto">
                {['pending', 'approved', 'rejected', 'all'].map((statusOption) => (
                  <button
                    key={statusOption}
                    onClick={() => setFilter(statusOption as any)}
                    className={`flex-1 sm:flex-initial px-5 py-2 text-[13px] font-bold rounded-xl capitalize transition-all ${
                      filter === statusOption
                        ? 'bg-white text-[#294b77] shadow-sm'
                        : 'text-slate-500 hover:text-[#061A36]'
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
                  className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-slate-200 focus:border-[#294b77] focus:ring-4 focus:ring-[#294b77]/10 rounded-2xl text-[14px] text-[#061A36] placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* Requests List */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-[#294b77] rounded-full animate-spin"></div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-[20px] font-black text-[#061A36]">No access requests found</h3>
                <p className="text-slate-500 mt-2 text-[15px]">There are no requests matching the current filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-black text-[18px]" style={{ backgroundColor: '#294b77' }}>
                          {req.profiles?.full_name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                          <h4 className="text-[16px] font-extrabold text-[#061A36]">{req.profiles?.full_name || 'Anonymous Student'}</h4>
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
          </div>

        </main>
      </div>
    </div>
  );
}

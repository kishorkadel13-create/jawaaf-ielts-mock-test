import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Award, Users, FileText, CheckSquare, ShieldCheck, ArrowRight, BookOpen, Layers, Plus, ChevronLeft } from 'lucide-react';
import JawaafLogo from '../../components/JawaafLogo';

interface AdminMetrics {
  users: number;
  tests: number;
  attempts: number;
  requests: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics>({ users: 0, tests: 0, attempts: 0, requests: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAdminMetrics = async () => {
    try {
      setLoading(true);
      
      const { data: tests } = await api.get('/tests');
      const { data: requests } = await api.get('/access/requests').catch(() => ({ data: [] }));
      const { data: history } = await api.get('/attempts/history').catch(() => ({ data: [] }));

      setMetrics({
        users: new Set(history.map((h: any) => h.user_id)).size || 1,
        tests: tests.length,
        attempts: history.length || 0,
        requests: requests.filter((r: any) => r.status === 'pending').length || 0
      });
      setLoading(false);
    } catch (err) {
      console.warn('Admin metrics loading error:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminMetrics();
  }, []);

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
          <Link to="/admin" className="px-4 py-3 bg-[#1E3A6E] text-white font-bold rounded-xl flex items-center gap-3 transition-colors">
            <Layers className="h-5 w-5" /> Overview
          </Link>
          <Link to="/admin/tests" className="px-4 py-3 text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white font-semibold rounded-xl flex items-center gap-3 transition-colors">
            <BookOpen className="h-5 w-5" /> Mock Tests CMS
          </Link>
          <Link to="/admin/access" className="px-4 py-3 text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white font-semibold rounded-xl flex items-center justify-between transition-colors">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" /> Access Approvals
            </div>
            {metrics.requests > 0 && (
              <span className="px-2 py-0.5 bg-[#EE6055] text-white text-[10px] font-extrabold rounded-md">
                {metrics.requests}
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

      {/* Main Admin Metrics */}
      <main className="flex-1 p-6 md:p-10 flex flex-col gap-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 pb-5">
          <div>
            <h1 className="text-[28px] md:text-[32px] font-black text-[#05162E] tracking-tight">Admin Command Center</h1>
            <p className="text-[14px] text-slate-500 mt-1">Simulated computer-based mock analytics and platform CMS controls.</p>
          </div>
          
          <Link to="/admin/tests" className="px-5 py-2.5 bg-[#EE6055] hover:bg-[#d45248] text-white text-[13px] font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-[#EE6055]/20">
            <Plus className="h-4 w-4" /> Create Mock Test
          </Link>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#EE6055] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Active Students</span>
              <div className="flex items-end justify-between">
                <div className="text-[36px] font-black text-[#05162E] leading-none">{metrics.users}</div>
                <div className="h-10 w-10 bg-[#EFF4FB] text-[#1E3A6E] rounded-xl flex items-center justify-center mb-1">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Available Tests</span>
              <div className="flex items-end justify-between">
                <div className="text-[36px] font-black text-[#05162E] leading-none">{metrics.tests}</div>
                <div className="h-10 w-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-1">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Total Attempts</span>
              <div className="flex items-end justify-between">
                <div className="text-[36px] font-black text-[#05162E] leading-none">{metrics.attempts}</div>
                <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-1">
                  <CheckSquare className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#EE6055]/5 rounded-bl-[100px]"></div>
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Pending Requests</span>
              <div className="flex items-end justify-between relative z-10">
                <div className="text-[36px] font-black text-[#EE6055] leading-none">{metrics.requests}</div>
                <div className="h-10 w-10 bg-[#EE6055]/10 text-[#EE6055] rounded-xl flex items-center justify-center mb-1">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
            </div>

          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mt-2">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-6">
            <h3 className="text-[18px] font-black text-[#05162E]">Quick Actions</h3>
            <div className="grid gap-4">
              <Link to="/admin/tests" className="p-5 bg-[#F8FAFC] border border-slate-100 hover:border-[#1E3A6E]/30 rounded-xl flex items-center justify-between text-[14px] font-bold text-[#05162E] transition-all group">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-[#1E3A6E]" />
                  <span>Manage Passages & Audio tracks</span>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-[#EE6055] group-hover:translate-x-1 transition-all" />
              </Link>
              <Link to="/admin/access" className="p-5 bg-[#F8FAFC] border border-slate-100 hover:border-[#1E3A6E]/30 rounded-xl flex items-center justify-between text-[14px] font-bold text-[#05162E] transition-all group">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#1E3A6E]" />
                  <span>Approve pending premium requests</span>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-[#EE6055] group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>

          <div className="bg-[#1E3A6E] p-8 rounded-2xl border border-[#05162E] shadow-[0_8px_32px_rgba(30,58,110,0.2)] flex flex-col justify-center items-center text-center relative overflow-hidden">
            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[#2C4B78] rounded-full opacity-50 blur-3xl"></div>
            <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-[#EE6055]/20 rounded-full opacity-50 blur-3xl"></div>
            
            <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center mb-5 backdrop-blur-sm border border-white/20 relative z-10">
              <Award className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-black text-[20px] text-white tracking-tight relative z-10">Platform Health Status</h4>
            <p className="text-[14px] text-blue-100/80 max-w-sm mt-2 leading-relaxed relative z-10">
              Jawaaf IELTS Lab simulation servers are fully configured and synced with database buckets.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

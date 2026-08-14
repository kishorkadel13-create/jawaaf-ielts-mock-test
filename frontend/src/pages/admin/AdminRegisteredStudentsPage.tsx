import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe2,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Target,
  UserPlus,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import AdminSidebar from '../../components/admin/AdminSidebar';

interface StudentSignup {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  interested_country: string;
  target_score: string;
  has_full_access: boolean;
  premium_access_expires_at: string | null;
  latest_access_request: {
    id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    requested_at: string;
    reviewed_at: string | null;
    premium_access_expires_at: string | null;
  } | null;
  created_at: string;
}

export default function AdminRegisteredStudentsPage() {
  const [students, setStudents] = useState<StudentSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentSignup | null>(null);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/students/signups');
      setStudents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load registered students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const formatTargetScore = (score?: string | null) => {
    const value = Number(score);
    return Number.isFinite(value) && value > 0 ? `Band ${value.toFixed(1)}` : 'N/A';
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString();
  };

  const getRequestStatusMeta = (student: StudentSignup) => {
    const request = student.latest_access_request;

    if (!request) {
      return {
        label: 'No request yet',
        dateLabel: 'Not submitted',
        icon: Clock,
        badgeClass: 'border-slate-200 bg-slate-50 text-slate-500'
      };
    }

    if (request.status === 'rejected') {
      return {
        label: 'Rejected',
        dateLabel: `Rejected: ${formatDate(request.reviewed_at || request.requested_at)}`,
        icon: ShieldAlert,
        badgeClass: 'border-rose-100 bg-rose-50 text-rose-600'
      };
    }

    if (request.status === 'approved') {
      return {
        label: 'Approved',
        dateLabel: `Requested: ${formatDate(request.requested_at)}`,
        icon: ShieldCheck,
        badgeClass: 'border-emerald-100 bg-emerald-50 text-emerald-600'
      };
    }

    return {
      label: 'Requested',
      dateLabel: `Requested: ${formatDate(request.requested_at)}`,
      icon: Clock,
      badgeClass: 'border-amber-100 bg-amber-50 text-amber-600'
    };
  };

  const filteredStudents = students.filter(student => {
    const term = searchTerm.toLowerCase();
    const requestStatus = student.latest_access_request?.status || 'no request';
    return (
      student.full_name?.toLowerCase().includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.phone?.toLowerCase().includes(term) ||
      student.interested_country?.toLowerCase().includes(term) ||
      String(student.target_score || '').toLowerCase().includes(term) ||
      requestStatus.toLowerCase().includes(term)
    );
  });

  const targetScores = students
    .map(student => Number(student.target_score))
    .filter(score => Number.isFinite(score) && score > 0);
  const averageTargetScore = targetScores.length
    ? `Band ${(targetScores.reduce((sum, score) => sum + score, 0) / targetScores.length).toFixed(1)}`
    : 'N/A';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-[#111827]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <AdminSidebar activeTab="registered-students" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[86px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur lg:px-10">
          <div className="flex items-center gap-5">
            <Link to="/admin" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-[24px] font-black tracking-tight text-[#061A36]">Total Registered Students</h1>
          </div>

          <div className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm md:flex" style={{ backgroundColor: '#ef5f55' }}>
            <ShieldCheck className="h-4 w-4" />
            <span>Active Console</span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10">
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex items-center gap-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md shadow-[#294b77]/20" style={{ backgroundColor: '#294b77' }}>
                <UserPlus className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Waiting Approval</p>
                <h3 className="mt-0.5 text-3xl font-black text-[#061A36]">{students.length}</h3>
              </div>
            </div>

            <div className="flex items-center gap-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md shadow-[#ef5f55]/20" style={{ backgroundColor: '#ef5f55' }}>
                <Target className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Average Target Score</p>
                <h3 className="mt-0.5 text-3xl font-black text-[#061A36]">{averageTargetScore}</h3>
              </div>
            </div>

            <div className="flex items-center gap-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                <Globe2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Countries Represented</p>
                <h3 className="mt-0.5 text-3xl font-black text-[#061A36]">
                  {new Set(students.map(s => s.interested_country).filter(Boolean)).size}
                </h3>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-100 p-6 md:flex-row">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search registered students name, phone, country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] py-3 pl-12 pr-4 text-[14px] text-[#061A36] outline-none transition-all focus:border-[#294b77] focus:ring-4 focus:ring-[#294b77]/10"
                />
              </div>

              <div className="text-sm font-semibold text-slate-500">
                Showing {filteredStudents.length} of {students.length} registered students
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#294b77]" />
                <p className="text-sm font-semibold text-slate-500">Loading registered students directory...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <UserPlus className="mb-4 h-16 w-16 text-slate-300" />
                <h4 className="text-lg font-black text-[#061A36]">No registered students found</h4>
                <p className="mt-1 text-sm text-slate-400">Approved students are removed from this list automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-[#F8FAFC]">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Student Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Contact Info</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Target Country</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Target Band</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Signup Date</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Access Request</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => {
                      const requestMeta = getRequestStatusMeta(student);
                      const RequestIcon = requestMeta.icon;

                      return (
                        <tr key={student.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#294b77' }}>
                              {student.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-[15px] font-bold text-[#061A36]">{student.full_name}</h4>
                              <span className="text-[12px] font-semibold text-slate-400">ID: {student.id.substring(0, 8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-2 text-[13px] text-slate-600">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              {student.email}
                            </span>
                            <span className="flex items-center gap-2 text-[13px] text-slate-600">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              {student.phone || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[13px] font-semibold text-slate-800">
                            <Globe2 className="h-3.5 w-3.5 text-slate-500" />
                            {student.interested_country || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-block rounded-xl px-3 py-1 text-xs font-black text-white" style={{ backgroundColor: '#ef5f55' }}>
                            {formatTargetScore(student.target_score)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[13px] font-medium text-slate-500">
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {formatDate(student.created_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-fit items-center gap-1.5 rounded-xl border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${requestMeta.badgeClass}`}>
                              <RequestIcon className="h-3.5 w-3.5" />
                              {requestMeta.label}
                            </span>
                            <span className="text-[12px] font-semibold text-slate-400">{requestMeta.dateLabel}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:border-[#294b77] hover:text-[#294b77]"
                          >
                            View Details
                          </button>
                        </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          {(() => {
            const requestMeta = getRequestStatusMeta(selectedStudent);
            const RequestIcon = requestMeta.icon;

            return (
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 text-white" style={{ backgroundColor: '#294b77' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white">
                  {selectedStudent.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black leading-none">{selectedStudent.full_name}</h3>
                  <span className="mt-1 inline-block text-[12px] text-white/70">Registered Student Account</span>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="rounded-full p-2 text-white transition-colors hover:bg-white/10">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Target Country</span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-[15px] font-bold text-[#061A36]">
                    <Globe2 className="h-4 w-4 text-slate-500" />
                    {selectedStudent.interested_country || 'N/A'}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Target Score</span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-[15px] font-bold" style={{ color: '#ef5f55' }}>
                    <Target className="h-4 w-4" />
                    {formatTargetScore(selectedStudent.target_score)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-slate-400">Email Address</span>
                    <a href={`mailto:${selectedStudent.email}`} className="text-[14px] font-semibold text-[#061A36] hover:underline">{selectedStudent.email}</a>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-slate-400">Phone Number</span>
                    <a href={`tel:${selectedStudent.phone}`} className="text-[14px] font-semibold text-[#061A36] hover:underline">{selectedStudent.phone || 'N/A'}</a>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-slate-400">Registration Date</span>
                    <span className="text-[14px] font-semibold text-[#061A36]">
                      {formatDateTime(selectedStudent.created_at)}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="block text-[11px] font-bold uppercase text-slate-400">Premium Access Request</span>
                      <span className={`mt-2 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-black uppercase tracking-wide ${requestMeta.badgeClass}`}>
                        <RequestIcon className="h-4 w-4" />
                        {requestMeta.label}
                      </span>
                    </div>
                    <Link to="/admin/access" className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#294b77] transition-colors hover:bg-slate-100">
                      Open Requests
                    </Link>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 text-[13px] font-semibold text-slate-600 sm:grid-cols-2">
                    <div>
                      <span className="block text-[11px] font-bold uppercase text-slate-400">Requested Date</span>
                      {formatDateTime(selectedStudent.latest_access_request?.requested_at)}
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase text-slate-400">Reviewed Date</span>
                      {formatDateTime(selectedStudent.latest_access_request?.reviewed_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-6">
              <button onClick={() => setSelectedStudent(null)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100">
                Close
              </button>
              <Link to="/admin/access" className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors" style={{ backgroundColor: '#294b77' }}>
                Go to Approval
              </Link>
            </div>
          </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

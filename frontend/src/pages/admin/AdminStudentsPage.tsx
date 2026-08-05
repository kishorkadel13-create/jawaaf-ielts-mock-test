import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Phone,
  Mail,
  Globe2,
  Target,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Calendar,
  CalendarClock,
  Save,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import AdminSidebar from '../../components/admin/AdminSidebar';

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  interested_country: string;
  target_score: string;
  has_full_access: boolean;
  premium_access_expires_at: string | null;
  created_at: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [accessExpiryInput, setAccessExpiryInput] = useState('');
  const [savingAccess, setSavingAccess] = useState(false);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/students');
      setStudents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudent?.premium_access_expires_at) {
      setAccessExpiryInput('');
      return;
    }

    const parsed = new Date(selectedStudent.premium_access_expires_at);
    if (Number.isNaN(parsed.getTime())) {
      setAccessExpiryInput('');
      return;
    }

    setAccessExpiryInput(parsed.toISOString().slice(0, 10));
  }, [selectedStudent]);

  const formatPremiumExpiry = (value?: string | null) => {
    if (!value) return 'No expiry set';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? 'No expiry set'
      : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const todayInputValue = new Date().toISOString().slice(0, 10);

  const getAccessStatus = (student: Student) => {
    if (!student.has_full_access) return { label: 'Revoked', className: 'bg-slate-100 text-slate-500 border-slate-200' };
    if (!student.premium_access_expires_at) return { label: 'No expiry set', className: 'bg-amber-50 text-amber-700 border-amber-100' };

    const expiry = new Date(student.premium_access_expires_at);
    if (Number.isNaN(expiry.getTime())) return { label: 'No expiry set', className: 'bg-amber-50 text-amber-700 border-amber-100' };
    if (expiry.getTime() <= Date.now()) return { label: 'Expired', className: 'bg-red-50 text-red-600 border-red-100' };

    return { label: `Until ${formatPremiumExpiry(student.premium_access_expires_at)}`, className: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  };

  const updateSelectedStudent = (updatedProfile: Partial<Student>) => {
    setStudents(current => current
      .map(student => student.id === updatedProfile.id ? { ...student, ...updatedProfile } : student)
      .filter(student => student.has_full_access)
    );

    if (updatedProfile.has_full_access === false) {
      setSelectedStudent(null);
      return;
    }

    setSelectedStudent(current => current && current.id === updatedProfile.id ? { ...current, ...updatedProfile } : current);
  };

  const handleSaveAccess = async () => {
    if (!selectedStudent) return;

    try {
      setSavingAccess(true);
      const premiumAccessExpiresAt = accessExpiryInput
        ? new Date(`${accessExpiryInput}T23:59:59`).toISOString()
        : null;

      const response = await api.put(`/admin/students/${selectedStudent.id}/access`, {
        has_full_access: true,
        premium_access_expires_at: premiumAccessExpiresAt
      });

      updateSelectedStudent({
        id: selectedStudent.id,
        has_full_access: response.data?.student?.has_full_access ?? true,
        premium_access_expires_at: response.data?.student?.premium_access_expires_at || null
      });
    } catch (error: any) {
      console.error('Failed to update student premium access:', error);
      alert(error.message || 'Failed to update student premium access.');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!selectedStudent) return;

    const confirmed = window.confirm(`Revoke premium access for ${selectedStudent.full_name}?`);
    if (!confirmed) return;

    try {
      setSavingAccess(true);
      await api.put(`/admin/students/${selectedStudent.id}/access`, {
        has_full_access: false,
        premium_access_expires_at: null
      });
      updateSelectedStudent({
        id: selectedStudent.id,
        has_full_access: false,
        premium_access_expires_at: null
      });
    } catch (error: any) {
      console.error('Failed to revoke student premium access:', error);
      alert(error.message || 'Failed to revoke student premium access.');
    } finally {
      setSavingAccess(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const term = searchTerm.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.phone?.toLowerCase().includes(term) ||
      student.interested_country?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans flex" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Shared Admin Sidebar */}
      <AdminSidebar activeTab="students" />

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[86px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur lg:px-10">
            <div className="flex items-center gap-5">
              <Link to="/admin" className="lg:hidden text-slate-600 hover:bg-slate-100 p-2 rounded-xl">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <h1 className="text-[24px] font-black tracking-tight text-[#061A36]">Approved Students</h1>
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

          <main className="flex-1 p-6 lg:p-10">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-md shadow-[#294b77]/20" style={{ backgroundColor: '#294b77' }}>
                  <Users className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Total Approved</p>
                  <h3 className="text-3xl font-black text-[#061A36] mt-0.5">{students.length}</h3>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-md shadow-[#ef5f55]/20" style={{ backgroundColor: '#ef5f55' }}>
                  <Target className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Average Target Score</p>
                  <h3 className="text-3xl font-black text-[#061A36] mt-0.5">7.5 Band</h3>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <Globe2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Countries Represented</p>
                  <h3 className="text-3xl font-black text-[#061A36] mt-0.5">
                    {new Set(students.map(s => s.interested_country).filter(Boolean)).size}
                  </h3>
                </div>
              </div>
            </div>

            {/* Main Section */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Table Toolbar */}
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students name, phone, country..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border border-slate-200 focus:border-[#294b77] focus:ring-4 focus:ring-[#294b77]/10 rounded-2xl text-[14px] text-[#061A36] outline-none transition-all"
                  />
                </div>

                <div className="text-sm font-semibold text-slate-500">
                  Showing {filteredStudents.length} of {students.length} approved students
                </div>
              </div>

              {/* Loader */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#294b77]" />
                  <p className="text-slate-500 text-sm font-semibold">Loading students directory...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <Users className="h-16 w-16 text-slate-300 mb-4" />
                  <h4 className="text-lg font-black text-[#061A36]">No students found</h4>
                  <p className="text-slate-400 text-sm mt-1">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-[#F8FAFC]">
                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Name</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Info</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Target Country</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Target Band</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Premium Access</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Joined Date</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: '#294b77' }}>
                                {student.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-[#061A36] text-[15px]">{student.full_name}</h4>
                                <span className="text-[12px] font-semibold text-slate-400">ID: {student.id.substring(0, 8)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-2 text-slate-600 text-[13px]">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                {student.email}
                              </span>
                              <span className="flex items-center gap-2 text-slate-600 text-[13px]">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                {student.phone || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-[13px] font-semibold">
                              <Globe2 className="h-3.5 w-3.5 text-slate-500" />
                              {student.interested_country || 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="inline-block px-3 py-1 rounded-xl text-white text-xs font-black" style={{ backgroundColor: '#ef5f55' }}>
                              Band {student.target_score || '7.0'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-[12px] font-black ${getAccessStatus(student).className}`}>
                              <CalendarClock className="h-3.5 w-3.5" />
                              {getAccessStatus(student).label}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 text-[13px] font-medium">
                            <span className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              {student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="px-4 py-2 border border-slate-200 hover:border-[#294b77] hover:text-[#294b77] text-slate-600 text-xs font-bold rounded-xl transition-all"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>

      {/* Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">

            {/* Modal Header */}
            <div className="p-6 text-white flex items-center justify-between" style={{ backgroundColor: '#294b77' }}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-black">
                  {selectedStudent.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black leading-none">{selectedStudent.full_name}</h3>
                  <span className="text-[12px] text-white/70 mt-1 inline-block">Approved Student Portal Account</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Target Country</span>
                  <span className="text-[#061A36] text-[15px] font-bold mt-1 inline-flex items-center gap-1.5">
                    <Globe2 className="h-4 w-4 text-slate-500" />
                    {selectedStudent.interested_country || 'N/A'}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Target Score</span>
                  <span className="text-[15px] font-bold mt-1 inline-flex items-center gap-1.5" style={{ color: '#ef5f55' }}>
                    <Target className="h-4 w-4" />
                    Band {selectedStudent.target_score || '7.0'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="premium-expiry" className="text-slate-400 text-xs font-bold uppercase tracking-wider block">
                      Premium Access Until
                    </label>
                    <input
                      id="premium-expiry"
                      type="date"
                      min={todayInputValue}
                      value={accessExpiryInput}
                      onChange={(event) => setAccessExpiryInput(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-[#061A36] outline-none transition-all focus:border-[#294b77] focus:ring-4 focus:ring-[#294b77]/10"
                    />
                    <p className="mt-2 text-[12px] font-semibold text-slate-500">
                      Current: {formatPremiumExpiry(selectedStudent.premium_access_expires_at)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleSaveAccess}
                      disabled={savingAccess}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white shadow-sm transition-colors disabled:opacity-60"
                      style={{ backgroundColor: '#294b77' }}
                    >
                      {savingAccess ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Access
                    </button>
                    <button
                      type="button"
                      onClick={handleRevokeAccess}
                      disabled={savingAccess}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-black text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] font-bold uppercase block">Email Address</span>
                    <a href={`mailto:${selectedStudent.email}`} className="text-[#061A36] text-[14px] font-semibold hover:underline">
                      {selectedStudent.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] font-bold uppercase block">Phone Number</span>
                    <a href={`tel:${selectedStudent.phone}`} className="text-[#061A36] text-[14px] font-semibold hover:underline">
                      {selectedStudent.phone || 'N/A'}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] font-bold uppercase block">Registration Date</span>
                    <span className="text-[#061A36] text-[14px] font-semibold">
                      {selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                Close
              </button>
              <a
                href={`mailto:${selectedStudent.email}`}
                className="px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                style={{ backgroundColor: '#294b77' }}
              >
                Send Email
              </a>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

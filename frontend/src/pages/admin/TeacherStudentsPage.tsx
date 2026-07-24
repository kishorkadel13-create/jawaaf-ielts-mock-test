import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Headphones,
  History,
  LogOut,
  Mail,
  PenLine,
  ShieldCheck,
  Star,
  Target,
  Timer,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import JawaafLogo from '../../components/JawaafLogo';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const fmtScore = (score: any) => {
  const value = Number(score || 0);
  return Number.isFinite(value) && value > 0 ? value.toFixed(1) : 'N/A';
};

const fmtDate = (date?: string | null) => {
  if (!date) return 'No activity yet';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'No activity yet' : parsed.toLocaleDateString();
};

const TeacherSidebar = ({ active }: { active: 'reviews' | 'students' }) => {
  const { logout } = useAuthStore();

  return (
    <aside className="w-full md:w-64 bg-[#05162E] text-white flex flex-col p-6 border-r border-[#1E3A6E]/30 flex-shrink-0 z-10 shadow-xl">
      <div className="mb-10 mt-2 px-2">
        <Link to="/" className="block bg-white p-2 rounded-xl w-fit">
          <JawaafLogo className="h-8 w-auto" />
        </Link>
        <div className="mt-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Teacher Portal</span>
        </div>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        <Link
          to="/teacher"
          className={`px-4 py-3 font-bold rounded-xl flex items-center gap-3 transition-colors ${
            active === 'reviews' ? 'bg-[#1E3A6E] text-white' : 'text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white'
          }`}
        >
          <PenLine className="h-5 w-5" /> Reviews
        </Link>
        <Link
          to="/teacher/students"
          className={`px-4 py-3 font-bold rounded-xl flex items-center gap-3 transition-colors ${
            active === 'students' ? 'bg-[#1E3A6E] text-white' : 'text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white'
          }`}
        >
          <Users className="h-5 w-5" /> Students
        </Link>
        <button onClick={logout} className="mt-auto px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white font-semibold rounded-xl flex items-center gap-3 transition-colors">
          <LogOut className="h-5 w-5" /> Logout
        </button>
      </nav>
    </aside>
  );
};

const BandCard = ({ icon, label, value, tone }: any) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${tone}`}>{icon}</div>
    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 text-3xl font-black text-[#05162E]">{fmtScore(value)}</p>
  </div>
);

export default function TeacherStudentsPage() {
  const { studentId } = useParams();
  const [students, setStudents] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const selectedStudentId = studentId || students[0]?.id || null;

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/attempts/teacher/students');
        setStudents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load teacher students:', err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;

    const fetchDetail = async () => {
      try {
        setDetailLoading(true);
        const { data } = await api.get(`/attempts/teacher/students/${selectedStudentId}`);
        setDetail(data);
      } catch (err) {
        console.error('Failed to load student detail:', err);
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    };
    fetchDetail();
  }, [selectedStudentId]);

  const activeStudent = useMemo(
    () => students.find(student => student.id === selectedStudentId) || null,
    [selectedStudentId, students]
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <TeacherSidebar active="students" />

      <main className="flex-1 min-w-0 p-6 md:p-8 overflow-y-auto">
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {studentId && (
              <Link to="/teacher/students" className="mb-3 inline-flex items-center gap-2 text-[13px] font-black text-slate-500 hover:text-[#294b77]">
                <ArrowLeft className="h-4 w-4" /> All students
              </Link>
            )}
            <h1 className="text-[30px] font-black tracking-tight text-[#05162E]">
              {studentId ? 'Student Performance Dashboard' : 'Students'}
            </h1>
            <p className="mt-1 text-[14px] font-semibold text-slate-500">
              Track verified students, learning activity, progress trends, and writing review status.
            </p>
          </div>
          <div className="rounded-xl border border-[#294b77]/10 bg-[#EFF4FB] px-4 py-2 text-[12px] font-black text-[#294b77]">
            {students.length} approved students
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-[360px] place-items-center rounded-2xl border border-slate-200 bg-white">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#294b77]"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-xl font-black text-[#05162E]">No approved students yet</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">Approved premium students will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="grid h-fit gap-3">
              {students.map(student => (
                <Link
                  key={student.id}
                  to={`/teacher/students/${student.id}`}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition-all hover:border-[#294b77]/40 ${
                    selectedStudentId === student.id ? 'border-[#294b77] ring-2 ring-[#294b77]/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#EFF4FB] text-[#294b77] font-black">
                      {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-black text-[#05162E]">{student.full_name}</h3>
                      <p className="truncate text-[12px] font-semibold text-slate-500">{student.email}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-[#F8FAFC] p-2">
                      <p className="text-[10px] font-black text-slate-400">Mock</p>
                      <p className="font-black">{student.mock_attempts}</p>
                    </div>
                    <div className="rounded-xl bg-[#F8FAFC] p-2">
                      <p className="text-[10px] font-black text-slate-400">Practice</p>
                      <p className="font-black">{student.practice_attempts}</p>
                    </div>
                    <div className="rounded-xl bg-[#FFF3F2] p-2">
                      <p className="text-[10px] font-black text-[#EE6055]">Pending</p>
                      <p className="font-black">{student.pending_writing_reviews}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </section>

            <section className="min-w-0">
              {detailLoading || !detail ? (
                <div className="grid min-h-[420px] place-items-center rounded-2xl border border-slate-200 bg-white">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#294b77]"></div>
                </div>
              ) : (
                <div className="grid gap-6">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-2 bg-[#294b77]"></div>
                    <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                      <div>
                        <div className="flex items-center gap-4">
                          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#EFF4FB] text-2xl font-black text-[#294b77]">
                            {detail.student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <h2 className="text-2xl font-black text-[#05162E]">{detail.student.full_name}</h2>
                            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                              <Mail className="h-4 w-4" /> {detail.student.email}
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                          <p><span className="font-black text-slate-400">Student ID:</span> {detail.student.id}</p>
                          <p><span className="font-black text-slate-400">Join Date:</span> {fmtDate(detail.student.created_at)}</p>
                          <p><span className="font-black text-slate-400">Course:</span> {detail.student.course}</p>
                          <p><span className="font-black text-slate-400">Status:</span> {detail.student.overall_status}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#294b77]/10 bg-[#F8FAFC] p-4">
                        <p className="mb-3 text-[12px] font-black uppercase tracking-wider text-[#294b77]">IELTS Progress Card</p>
                        <div className="grid grid-cols-2 gap-3">
                          <BandCard icon={<BookOpen className="h-5 w-5" />} label="Reading" value={detail.summary.estimated_bands.reading} tone="bg-[#EFF4FB] text-[#294b77]" />
                          <BandCard icon={<Headphones className="h-5 w-5" />} label="Listening" value={detail.summary.estimated_bands.listening} tone="bg-emerald-50 text-emerald-700" />
                          <BandCard icon={<PenLine className="h-5 w-5" />} label="Writing" value={detail.summary.estimated_bands.writing} tone="bg-[#FFF3F2] text-[#EE6055]" />
                          <BandCard icon={<Star className="h-5 w-5" />} label="Overall" value={detail.summary.estimated_bands.overall} tone="bg-amber-50 text-amber-700" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    {[
                      ['Mock Tests', detail.summary.total_mock_tests, <ClipboardList className="h-5 w-5" />],
                      ['Practice Tests', detail.summary.total_practice_tests, <Target className="h-5 w-5" />],
                      ['Average Score', fmtScore(detail.summary.average_overall_score), <BarChart3 className="h-5 w-5" />],
                      ['Highest Score', fmtScore(detail.summary.highest_score), <TrendingUp className="h-5 w-5" />],
                    ].map(([label, value, icon]: any) => (
                      <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#EFF4FB] text-[#294b77]">{icon}</div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
                        <p className="mt-1 text-2xl font-black text-[#05162E]">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-6 2xl:grid-cols-2">
                    <HistoryTable title="Mock Test History" rows={detail.mock_history} type="mock" />
                    <HistoryTable title="Practice Test History" rows={detail.practice_history} type="practice" />
                    <WritingPanel evaluations={detail.writing_evaluations} />
                    <AnalyticsPanel analytics={detail.analytics} />
                    <RecentActivities activities={detail.recent_activities} />
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

const HistoryTable = ({ title, rows, type }: any) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="mb-4 text-[15px] font-black text-[#05162E]">{title}</h3>
    {rows.length === 0 ? (
      <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm font-semibold text-slate-500">No records yet.</p>
    ) : (
      <div className="grid gap-3">
        {rows.map((row: any) => (
          <Link key={row.id} to={`/attempts/${row.id}/result`} className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-4 hover:border-[#294b77]/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-black text-[#05162E]">{row.mock_tests?.title || 'Untitled test'}</p>
                <p className="mt-1 text-[12px] font-semibold text-slate-500">
                  {fmtDate(row.submitted_at)} • {row.time_taken_minutes ?? 'N/A'} min taken
                </p>
                {type === 'mock' && (
                  <p className="mt-2 text-[12px] font-bold text-slate-500">
                    Reading {fmtScore(row.reading_score)} • Listening {fmtScore(row.listening_score)} • Writing {row.writing_status}
                  </p>
                )}
              </div>
              <span className={`rounded-lg px-3 py-1 text-[11px] font-black ${row.result_status === 'Ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#FFF3F2] text-[#EE6055]'}`}>
                {row.result_status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    )}
  </div>
);

const WritingPanel = ({ evaluations }: any) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="mb-4 text-[15px] font-black text-[#05162E]">Writing Evaluation</h3>
    <div className="grid gap-3">
      {evaluations.length === 0 ? (
        <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm font-semibold text-slate-500">No writing submissions yet.</p>
      ) : evaluations.map((item: any) => (
        <Link key={item.attempt_id} to={`/attempts/${item.attempt_id}/result`} className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-black text-[#05162E]">{item.test_name}</p>
              <p className="mt-1 text-[12px] font-semibold text-slate-500">{fmtDate(item.submitted_at)} • Review {item.review_date ? fmtDate(item.review_date) : 'pending'}</p>
              <p className="mt-2 line-clamp-2 text-[12px] font-semibold text-slate-600">{item.teacher_feedback || 'Teacher feedback pending.'}</p>
            </div>
            <span className={`rounded-lg px-3 py-1 text-[11px] font-black ${item.status === 'Checked' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#FFF3F2] text-[#EE6055]'}`}>
              {item.status === 'Checked' ? `Band ${fmtScore(item.teacher_band_score)}` : 'Pending'}
            </span>
          </div>
        </Link>
      ))}
    </div>
  </div>
);

const AnalyticsPanel = ({ analytics }: any) => {
  const maxScore = 9;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-[15px] font-black text-[#05162E]">Progress Analytics</h3>
      <div className="grid gap-4">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Section-wise performance</p>
          <div className="grid gap-3">
            {analytics.section_performance.map((item: any) => (
              <div key={item.section}>
                <div className="mb-1 flex justify-between text-[12px] font-black text-slate-600">
                  <span>{item.section}</span>
                  <span>{fmtScore(item.score)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-[#294b77]" style={{ width: `${Math.min(100, (Number(item.score || 0) / maxScore) * 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Score trend</p>
          <div className="flex h-28 items-end gap-2 rounded-xl bg-[#F8FAFC] p-3">
            {(analytics.progress_trend || []).slice(-10).map((item: any, index: number) => (
              <div key={`${item.date}-${index}`} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-lg bg-[#294b77]" style={{ height: `${Math.max(6, (Number(item.score || 0) / maxScore) * 88)}px` }}></div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] font-semibold text-slate-500">Total study activity: {analytics.total_study_activity}</p>
        </div>
      </div>
    </div>
  );
};

const RecentActivities = ({ activities }: any) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm 2xl:col-span-2">
    <h3 className="mb-4 text-[15px] font-black text-[#05162E]">Recent Activities</h3>
    <div className="grid gap-3 md:grid-cols-2">
      {activities.length === 0 ? (
        <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm font-semibold text-slate-500">No recent activity yet.</p>
      ) : activities.map((item: any) => (
        <div key={`${item.id}-${item.type}`} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-[#F8FAFC] p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#294b77]">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[13px] font-black text-[#05162E]">{item.type}</p>
            <p className="mt-1 text-[12px] font-semibold text-slate-500">{item.title} • {fmtDate(item.at)}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

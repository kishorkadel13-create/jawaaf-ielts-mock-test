import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  CheckCircle2,
  CheckSquare,
  Clock,
  ClipboardCheck,
  FileText,
  Home,
  LibraryBig,
  ListChecks,
  LogOut,
  Mail,
  MessageCircle,
  MoreVertical,
  PenLine,
  Save,
  Search,
  Send,
  Settings,
  Star,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import JawaafLogo from '../../components/JawaafLogo';
import { TfngOverallPerformanceDesign } from '../mastery/TFNGMasteryPage';

type TeacherView = 'dashboard' | 'reviews' | 'students' | 'tfng' | 'qa' | 'analytics' | 'resources' | 'settings';

type LessonQuestion = {
  id: string;
  lesson_id: string;
  question_text: string;
  answer_text?: string;
  created_at?: string;
  student?: { full_name?: string; email?: string } | null;
  lesson?: { title?: string; course_sections?: { title?: string } } | null;
};

type Submission = {
  id: string;
  score: string | number;
  submitted_at: string;
  review_status: 'teacher_review_pending' | 'auto_graded' | 'reviewed';
  attempt_mode: 'mock' | 'practice';
  writing_task_count: number;
  answered_writing_tasks: number;
  mock_tests?: { title: string; description?: string };
  profiles?: { full_name: string; email: string };
  feedback?: Feedback | null;
};

type TfngInstructorReport = {
  id: string;
  user_id: string;
  student?: { full_name?: string; email?: string } | null;
  evolution?: { evolution_number?: number; name?: string } | null;
  attempt_no: number;
  status: string;
  decision: string;
  accuracy: number;
  total_questions: number;
  questions_attempted: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered_questions: number;
  time_used_seconds: number;
  completed_at?: string;
  updated_at?: string;
  passages?: Array<{
    id: string;
    attempt_no?: number;
    set_no?: number;
    passage_order: number;
    title: string;
    score: number;
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    unanswered_questions: number;
    status: string;
    submitted_at?: string;
  }>;
};

type ReviewAnswer = {
  id: string;
  question_id?: string;
  question_number: number;
  question_text: string;
  student_answer: string | null;
  question_type: string;
  extra_data?: {
    task_type?: string;
    minimum_words?: number;
    suggested_minutes?: number;
  };
};

type TaskFeedback = {
  task_achievement_score?: string | number;
  coherence_cohesion_score?: string | number;
  lexical_resource_score?: string | number;
  grammar_score?: string | number;
  task_achievement?: string;
  coherence_cohesion?: string;
  lexical_resource?: string;
  grammar?: string;
};

type Feedback = {
  updated_at?: string;
  band_score?: string | number;
  task_feedback?: Record<string, TaskFeedback>;
  task_achievement_score?: string | number;
  coherence_cohesion_score?: string | number;
  lexical_resource_score?: string | number;
  grammar_score?: string | number;
  task_achievement?: string;
  coherence_cohesion?: string;
  lexical_resource?: string;
  grammar?: string;
  examiner_comments?: string;
};

const emptyFeedback: Feedback = {
  band_score: '',
  task_feedback: {},
  task_achievement_score: '',
  coherence_cohesion_score: '',
  lexical_resource_score: '',
  grammar_score: '',
  task_achievement: '',
  coherence_cohesion: '',
  lexical_resource: '',
  grammar: '',
  examiner_comments: ''
};

const writingDescriptorRows: Array<[keyof TaskFeedback, keyof TaskFeedback, string]> = [
  ['task_achievement_score', 'task_achievement', 'Task Achievement'],
  ['coherence_cohesion_score', 'coherence_cohesion', 'Coherence & Cohesion'],
  ['lexical_resource_score', 'lexical_resource', 'Lexical Resource'],
  ['grammar_score', 'grammar', 'Grammatical Range & Accuracy']
];

const viewFromPath = (pathname: string, hash: string): TeacherView => {
  if (pathname.includes('/teacher/reviews')) return 'reviews';
  if (pathname.includes('/teacher/students')) return 'students';
  if (pathname.includes('/teacher/tfng-support')) return 'tfng';
  if (hash === '#video-qa') return 'qa';
  return 'dashboard';
};

const fmtDate = (date?: string | null) => {
  if (!date) return 'No activity yet';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'No activity yet' : parsed.toLocaleDateString();
};

const fmtScore = (score: any) => {
  const value = Number(score || 0);
  return Number.isFinite(value) && value > 0 ? value.toFixed(1) : 'N/A';
};

const firstName = (name?: string | null) => {
  const value = String(name || '').trim();
  return value ? value.split(/\s+/)[0] : 'Teacher';
};

const initials = (name?: string | null) => {
  const parts = String(name || 'Teacher').trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || 'T') + (parts[1]?.[0] || '');
};

const relativeTime = (date?: string | null) => {
  if (!date) return 'Recently';
  const parsed = new Date(date).getTime();
  if (Number.isNaN(parsed)) return 'Recently';
  const diffMinutes = Math.max(1, Math.round((Date.now() - parsed) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const formatTfngReportTime = (seconds?: number | null) => {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
};

const greetingForNow = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const writingBandValue = (submission: Submission) => {
  const raw = submission.feedback?.band_score ?? submission.score;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const taskLabel = (submission: Submission) => {
  const count = submission.answered_writing_tasks || submission.writing_task_count || 1;
  return count > 1 ? `Task ${count}` : 'Task 1';
};

const submissionMatches = (submission: Submission, query: string) => {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [
    submission.profiles?.full_name,
    submission.profiles?.email,
    submission.mock_tests?.title,
    submission.mock_tests?.description,
    submission.review_status,
    taskLabel(submission)
  ].some(item => String(item || '').toLowerCase().includes(value));
};

const TeacherNav = ({ active, onSelect }: { active: TeacherView; onSelect: (view: TeacherView) => void }) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleSelect = (view: TeacherView) => {
    onSelect(view);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const items = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { key: 'reviews' as const, label: 'Writing Reviews', icon: PenLine },
    { key: 'students' as const, label: 'Students', icon: Users },
    { key: 'tfng' as const, label: 'TFNG Instruction Support', icon: Target },
    { key: 'qa' as const, label: 'Video Q&A', icon: MessageCircle },
    { key: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { key: 'resources' as const, label: 'Resources', icon: BookOpen },
    { key: 'settings' as const, label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col text-white lg:flex" style={{ background: '#172338' }}>
      <div className="px-7 pb-8 pt-8">
        <JawaafLogo className="h-auto w-[170px]" isWhite />
      </div>

      <nav className="grid flex-1 content-start gap-2 px-5">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSelect(item.key)}
              className={`flex items-center gap-4 rounded-xl px-5 py-3.5 text-left text-[15px] font-bold transition-colors ${
                active === item.key ? 'bg-[#294b77] text-white shadow-lg shadow-[#294b77]/20' : 'text-white/60 hover:bg-[#ef5f55] hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" /> {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-5">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-5 py-3.5 text-left text-[15px] font-bold text-white/60 hover:bg-[#ef5f55] hover:text-white">
          <LogOut className="h-5 w-5" /> Logout
        </button>
      </div>
    </aside>
  );
};

export default function TeacherDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [activeView, setActiveView] = useState<TeacherView>(() => viewFromPath(location.pathname, location.hash));
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [questions, setQuestions] = useState<LessonQuestion[]>([]);
  const [tfngReports, setTfngReports] = useState<TfngInstructorReport[]>([]);
  const [selectedTfngReportId, setSelectedTfngReportId] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingReplyId, setSavingReplyId] = useState('');
  const [unlockingTfngId, setUnlockingTfngId] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<ReviewAnswer[]>([]);
  const [feedbackForm, setFeedbackForm] = useState<Feedback>(emptyFeedback);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [activeSubmissionTab, setActiveSubmissionTab] = useState<'practice' | 'mock'>('practice');
  const [dashboardSearch, setDashboardSearch] = useState('');

  const setTeacherView = (view: TeacherView) => {
    setActiveView(view);
    if (view === 'dashboard') navigate('/teacher', { replace: true });
    if (view === 'reviews') navigate('/teacher/reviews', { replace: true });
    if (view === 'students') navigate('/teacher/students', { replace: true });
    if (view === 'tfng') navigate('/teacher/tfng-support', { replace: true });
    if (view === 'qa') navigate('/teacher/qa', { replace: true });
    if (['analytics', 'resources', 'settings'].includes(view)) navigate('/teacher', { replace: true });
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [{ data: inboxData }, { data: studentData }, { data: questionData }, { data: tfngData }] = await Promise.all([
        api.get('/attempts/admin/inbox').catch(() => ({ data: [] })),
        api.get('/attempts/teacher/students').catch(() => ({ data: [] })),
        api.get('/admin/lesson-questions').catch(() => ({ data: [] })),
        api.get('/mastery/tfng/instructor/reports').catch(() => ({ data: [] }))
      ]);

      const inboxList = Array.isArray(inboxData) ? inboxData : [];
      const studentList = Array.isArray(studentData) ? studentData : [];
      const questionList = Array.isArray(questionData) ? questionData : [];
      const tfngReportList = Array.isArray(tfngData) ? tfngData : [];

      setSubmissions(inboxList);
      setStudents(studentList);
      setQuestions(questionList);
      setTfngReports(tfngReportList);
      setSelectedTfngReportId(current => (
        current && tfngReportList.some((report: TfngInstructorReport) => report.id === current)
          ? current
          : ''
      ));
      setReplyDrafts(questionList.reduce((acc: Record<string, string>, question: LessonQuestion) => {
        acc[question.id] = question.answer_text || '';
        return acc;
      }, {}));
      setSelectedStudentId(current => current || studentList[0]?.id || '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveView(viewFromPath(location.pathname, location.hash));
  }, [location.pathname, location.hash]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const practiceSubmissions = useMemo(() => submissions.filter(item => item.attempt_mode === 'practice'), [submissions]);
  const mockSubmissions = useMemo(() => submissions.filter(item => item.attempt_mode === 'mock'), [submissions]);
  const visibleSubmissions = activeSubmissionTab === 'practice' ? practiceSubmissions : mockSubmissions;
  const selectedSubmission = visibleSubmissions.find(item => item.id === selectedSubmissionId) || null;
  const pendingReviews = submissions.filter(item => item.review_status === 'teacher_review_pending').length;
  const unansweredQuestions = questions.filter(question => !question.answer_text).length;
  const recentQuestions = useMemo(() => questions.slice(0, 8), [questions]);
  const activePendingCount = visibleSubmissions.filter(item => item.review_status === 'teacher_review_pending').length;

  const unlockTfngNextLevel = async (attemptId: string) => {
    try {
      setUnlockingTfngId(attemptId);
      const { data } = await api.post(`/mastery/tfng/instructor/attempts/${attemptId}/unlock-next`);
      await loadDashboard();
      alert(data?.next_page === 'coming_soon'
        ? 'Student unlocked. The next TFNG level will show as coming soon until passages are published.'
        : 'Next TFNG level unlocked for this student.');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to unlock the next TFNG level.');
    } finally {
      setUnlockingTfngId('');
    }
  };

  useEffect(() => {
    if (loading) return;
    setSelectedSubmissionId(current => (
      current && visibleSubmissions.some(item => item.id === current)
        ? current
        : visibleSubmissions[0]?.id || null
    ));
  }, [loading, visibleSubmissions]);

  useEffect(() => {
    if (!selectedSubmissionId) {
      setReviewAnswers([]);
      setFeedbackForm(emptyFeedback);
      return;
    }

    const fetchReview = async () => {
      try {
        setReviewLoading(true);
        const { data } = await api.get(`/attempts/${selectedSubmissionId}/review`);
        const writingAnswers = (data.answers || []).filter((answer: ReviewAnswer) => answer.question_type === 'WRITING_TASK');
        setReviewAnswers(writingAnswers);
        setFeedbackForm({ ...emptyFeedback, ...(data.feedback || {}) });
      } catch (err) {
        console.error('Failed to load attempt review:', err);
        setReviewAnswers([]);
        setFeedbackForm(emptyFeedback);
      } finally {
        setReviewLoading(false);
      }
    };

    fetchReview();
  }, [selectedSubmissionId]);

  useEffect(() => {
    if (!selectedStudentId || activeView !== 'students') return;

    const fetchDetail = async () => {
      try {
        setStudentDetailLoading(true);
        const { data } = await api.get(`/attempts/teacher/students/${selectedStudentId}`);
        setStudentDetail(data);
      } catch (err) {
        console.error('Failed to load student detail:', err);
        setStudentDetail(null);
      } finally {
        setStudentDetailLoading(false);
      }
    };

    fetchDetail();
  }, [selectedStudentId, activeView]);

  const updateFeedback = (field: keyof Feedback, value: string) => {
    setFeedbackForm(current => ({ ...current, [field]: value }));
  };

  const updateTaskFeedback = (questionId: string, field: keyof TaskFeedback, value: string) => {
    setFeedbackForm(current => ({
      ...current,
      task_feedback: {
        ...(current.task_feedback || {}),
        [questionId]: {
          ...(current.task_feedback?.[questionId] || {}),
          [field]: value
        }
      }
    }));
  };

  const submitFeedback = async () => {
    if (!selectedSubmissionId) return;

    try {
      setSavingFeedback(true);
      const { data } = await api.post(`/attempts/${selectedSubmissionId}/feedback`, feedbackForm);
      if (!data?.feedback?.id) throw new Error('Feedback was not saved by the server.');
      await loadDashboard();
      const { data: reviewData } = await api.get(`/attempts/${selectedSubmissionId}/review`);
      setFeedbackForm({ ...emptyFeedback, ...(reviewData.feedback || {}) });
      alert('Writing feedback submitted. Student result is now available.');
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      alert(err.message || 'Failed to submit feedback.');
    } finally {
      setSavingFeedback(false);
    }
  };

  const saveQuestionReply = async (questionId: string) => {
    const answerText = (replyDrafts[questionId] || '').trim();
    if (!answerText) {
      alert('Write a reply before saving.');
      return;
    }

    try {
      setSavingReplyId(questionId);
      await api.put(`/admin/lesson-questions/${questionId}`, { answer_text: answerText });
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to save teacher reply.');
    } finally {
      setSavingReplyId('');
    }
  };

  const openSubmissionReview = (submissionId: string) => {
    const target = submissions.find(item => item.id === submissionId);
    if (target?.attempt_mode) {
      setActiveSubmissionTab(target.attempt_mode);
    }
    setSelectedSubmissionId(submissionId);
    setTeacherView('reviews');
  };

  const renderTfngSupportSection = () => {
    const selectedReport = tfngReports.find(report => report.id === selectedTfngReportId) || null;

    if (selectedReport) {
      const studentName = selectedReport.student?.full_name || 'Student';
      const passageRows = selectedReport.passages || [];
      const passagesBySet = passageRows.reduce<Record<number, typeof passageRows>>((acc, passage) => {
        const setNo = Number(passage.set_no || passage.attempt_no || 1);
        acc[setNo] = acc[setNo] || [];
        acc[setNo].push(passage);
        return acc;
      }, {});
      const attemptSummaries = Object.entries(passagesBySet)
        .sort(([setA], [setB]) => Number(setA) - Number(setB))
        .map(([setNo, passages]) => {
          const totalQuestions = passages.reduce((total, passage) => total + Number(passage.total_questions || 0), 0);
          const correctAnswers = passages.reduce((total, passage) => total + Number(passage.correct_answers || passage.score || 0), 0);
          const wrongAnswers = passages.reduce((total, passage) => total + Number(passage.wrong_answers || 0), 0);
          const unansweredQuestions = passages.reduce((total, passage) => total + Number(passage.unanswered_questions || 0), 0);
          const questionsAttempted = correctAnswers + wrongAnswers;

          return {
            set_no: Number(setNo),
            attempt_no: Number(setNo),
            total_passages: passages.length,
            passages_completed: passages.length,
            total_questions: totalQuestions,
            questions_attempted: questionsAttempted,
            correct_answers: correctAnswers,
            wrong_answers: wrongAnswers,
            unanswered_questions: unansweredQuestions,
            accuracy: totalQuestions > 0 ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2)) : 0,
            passage_breakdown: passages.map(passage => ({
              id: passage.id,
              attempt_no: passage.attempt_no,
              set_no: passage.set_no,
              passage_order: passage.passage_order,
              title: passage.title,
              score: passage.score,
              total_questions: passage.total_questions,
              correct_answers: passage.correct_answers,
              wrong_answers: passage.wrong_answers,
              unanswered_questions: passage.unanswered_questions
            }))
          };
        });
      const teacherPerformanceData = {
        attempt: {
          id: selectedReport.id,
          attempt_no: selectedReport.attempt_no,
          status: selectedReport.status,
          decision: selectedReport.decision
        },
        evolution: {
          ...(selectedReport.evolution || {}),
          first_attempt_required_accuracy: 60
        },
        day_streak: 0,
        summary: {
          evolution_number: selectedReport.evolution?.evolution_number || 1,
          total_passages: selectedReport.passages?.length || 0,
          passages_completed: selectedReport.passages?.length || 0,
          total_questions: selectedReport.total_questions,
          questions_attempted: selectedReport.questions_attempted,
          correct_answers: selectedReport.correct_answers,
          wrong_answers: selectedReport.wrong_answers,
          unanswered_questions: selectedReport.unanswered_questions,
          accuracy: selectedReport.accuracy,
          time_used_seconds: selectedReport.time_used_seconds,
          decision: selectedReport.decision,
          requires_instructor: true,
          attempt_summaries: attemptSummaries,
          passage_breakdown: passageRows.map(passage => ({
            id: passage.id,
            attempt_no: passage.attempt_no,
            set_no: passage.set_no,
            passage_order: passage.passage_order,
            title: passage.title,
            score: passage.score,
            total_questions: passage.total_questions,
            correct_answers: passage.correct_answers,
            wrong_answers: passage.wrong_answers,
            unanswered_questions: passage.unanswered_questions
          }))
        }
      };

      return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <TfngOverallPerformanceDesign
            data={teacherPerformanceData}
            studentName={studentName}
            hasPassedLevel={false}
            timeSpent={formatTfngReportTime(selectedReport.time_used_seconds)}
            onBack={() => setSelectedTfngReportId('')}
            onContinue={() => unlockTfngNextLevel(selectedReport.id)}
            onContactInstructor={() => unlockTfngNextLevel(selectedReport.id)}
            backLabel="Back to TFNG support list"
            instructorMode
          />
        </div>
      );
    }

    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[24px] font-black text-[#07183D]">
              <Target className="h-6 w-6 text-[#294b77]" /> TFNG Instructor Support
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-slate-500">Students waiting for guidance after failing their retry set.</p>
          </div>
          <span className="w-fit rounded-full border border-[#294b77]/10 bg-[#EFF4FB] px-4 py-2 text-[12px] font-black text-[#294b77]">
            {tfngReports.length} waiting
          </span>
        </div>

        {tfngReports.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFD] p-6 text-center text-[14px] font-bold text-slate-500">
            No TFNG students are waiting for instructor unlock right now.
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[minmax(0,1.3fr)_150px_110px_120px_130px] bg-[#F7F9FC] px-4 py-3 text-[11px] font-black uppercase text-[#8995AF] md:grid">
              <span>Student</span>
              <span>Level</span>
              <span>Accuracy</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-slate-100">
              {tfngReports.map(report => {
              const studentName = report.student?.full_name || 'Student';
              const evolutionLabel = report.evolution?.name || `Evolution ${report.evolution?.evolution_number || ''}`.trim();
              return (
                  <div key={report.id} className="grid gap-3 px-4 py-4 text-[14px] font-bold text-[#07183D] md:grid-cols-[minmax(0,1.3fr)_150px_110px_120px_130px] md:items-center">
                    <div>
                        <p className="text-[15px] font-black">{studentName}</p>
                      <p className="mt-0.5 text-[12px] font-semibold text-slate-500">{report.student?.email || 'No email'} • {relativeTime(report.completed_at || report.updated_at)}</p>
                    </div>
                    <p className="truncate">{evolutionLabel}</p>
                    <p className="text-[#ef5f55]">{Math.round(Number(report.accuracy || 0))}%</p>
                    <span className="w-fit rounded-full bg-[#FFF3F2] px-3 py-1 text-[12px] font-black text-[#ef5f55]">Set {report.attempt_no} failed</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTfngReportId(report.id)}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[#294b77] px-4 text-[13px] font-black text-white shadow-sm hover:bg-[#1E3A6E] md:justify-self-end"
                    >
                      View Result
                    </button>
                  </div>
              );
            })}
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderTaskFeedbackForm = (answer: ReviewAnswer, index: number) => {
    const taskKey = answer.question_id || answer.id;
    const taskFeedback = feedbackForm.task_feedback?.[taskKey] || {};
    const taskTitle = answer.extra_data?.task_type || `Writing Task ${index + 1}`;

    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 bg-[#EFF4FB] px-4 py-3">
          <div>
            <p className="text-[12px] font-black text-[#05162E]">{taskTitle} Feedback</p>
            <p className="text-[11px] font-bold text-slate-500">Add descriptor scores and reasons right after reviewing this answer.</p>
          </div>
          <span className="rounded-lg bg-white px-3 py-1 text-[11px] font-black text-[#294b77]">Q{answer.question_number}</span>
        </div>
        <div className="grid gap-3 p-4">
          {writingDescriptorRows.map(([scoreField, noteField, label]) => (
            <div key={`${taskKey}-${String(scoreField)}`} className="grid gap-3 rounded-xl border border-slate-100 bg-[#F8FAFC] p-3 md:grid-cols-[150px_minmax(0,1fr)]">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-black uppercase text-slate-500">{label} Score</span>
                <input
                  type="number"
                  min="0"
                  max="9"
                  step="0.5"
                  value={String(taskFeedback[scoreField] || '')}
                  onChange={event => updateTaskFeedback(taskKey, scoreField, event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]"
                  placeholder="0-9"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-black uppercase text-slate-500">{label} Feedback</span>
                <textarea
                  value={String(taskFeedback[noteField] || '')}
                  onChange={event => updateTaskFeedback(taskKey, noteField, event.target.value)}
                  className="min-h-[78px] resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] leading-6 outline-none focus:border-[#294b77]"
                  placeholder={`Add ${label.toLowerCase()} feedback for ${taskTitle}...`}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHero = () => (
    <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 className="text-[28px] font-black leading-tight tracking-normal text-[#07183D] sm:text-[32px]">
          {greetingForNow()}, {firstName(profile?.full_name)}! <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1.5 text-[15px] font-semibold text-[#314264]">Here's your overview for today.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-12 w-full items-center gap-3 rounded-2xl border border-[#E4EAF3] bg-white px-5 shadow-[0_12px_35px_rgba(15,35,70,0.06)] sm:w-[350px]">
          <span className="sr-only">Search student or writing</span>
          <input
            type="search"
            placeholder="Search student or writing..."
            value={dashboardSearch}
            onChange={event => setDashboardSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[#07183D] outline-none placeholder:text-[#95A0B8]"
          />
          <Search className="h-5 w-5 text-[#294b77]" />
        </label>
        <button type="button" className="relative grid h-11 w-11 place-items-center rounded-full text-[#294b77] hover:bg-[#EFF4FB]" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ef5f55] px-1 text-[10px] font-black text-white">
            {pendingReviews + unansweredQuestions}
          </span>
        </button>
        <button type="button" className="flex min-w-[235px] items-center gap-3 rounded-2xl px-2 py-1 text-left hover:bg-white">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#0D2D67] text-[15px] font-black text-white">
            {initials(profile?.full_name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-black text-[#07183D]">{profile?.full_name || 'Teacher'}</span>
            <span className="block text-[12px] font-semibold text-[#6E7B95]">Teacher</span>
          </span>
          <ChevronDown className="h-5 w-5 text-[#6E7B95]" />
        </button>
      </div>
    </header>
  );

  const renderOverview = () => {
    const searchableSubmissions = submissions.filter(item => submissionMatches(item, dashboardSearch));
    const reviewedSubmissions = searchableSubmissions.filter(item => item.review_status === 'reviewed');
    const scoredReviewedSubmissions = reviewedSubmissions.filter(item => writingBandValue(item) !== null);
    const reviewedToday = reviewedSubmissions.filter(item => {
      const reviewedAt = item.feedback?.updated_at || item.submitted_at;
      if (!reviewedAt) return false;
      return new Date(reviewedAt).toDateString() === new Date().toDateString();
    }).length;
    const latestReviewedRows = reviewedSubmissions.slice(0, 5);
    const pendingSubmissionsForView = searchableSubmissions.filter(item => item.review_status === 'teacher_review_pending');
    const pendingRows = pendingSubmissionsForView.slice(0, 5);
    const activityRows = [
      ...reviewedSubmissions.slice(0, 2).map(item => ({
        icon: ClipboardCheck,
        tone: 'bg-emerald-50 text-emerald-600',
        title: `You reviewed a writing by ${item.profiles?.full_name || 'Student'}.`,
        detail: `Band ${writingBandValue(item)?.toFixed(1) || 'N/A'}`,
        time: relativeTime(item.feedback?.updated_at || item.submitted_at)
      })),
      ...students.slice(0, 1).map(student => ({
        icon: Users,
        tone: 'bg-indigo-50 text-indigo-600',
        title: `You approved new student ${student.full_name || 'Student'}`,
        detail: '',
        time: relativeTime(student.created_at)
      })),
      ...questions.slice(0, 1).map(question => ({
        icon: MessageCircle,
        tone: 'bg-blue-50 text-blue-600',
        title: question.answer_text
          ? `Answered a video question (${question.lesson?.title || 'Lesson'})`
          : `New video question (${question.lesson?.title || 'Lesson'})`,
        detail: '',
        time: relativeTime(question.created_at)
      }))
    ].slice(0, 4);
    const totalReviewed = reviewedSubmissions.length;
    const bandBuckets = [
      { label: 'Band 9', value: scoredReviewedSubmissions.filter(item => Number(writingBandValue(item)) >= 9).length, color: 'bg-violet-500', hex: '#8B5CF6' },
      { label: 'Band 8', value: scoredReviewedSubmissions.filter(item => Number(writingBandValue(item)) >= 8 && Number(writingBandValue(item)) < 9).length, color: 'bg-blue-400', hex: '#60A5FA' },
      { label: 'Band 7', value: scoredReviewedSubmissions.filter(item => Number(writingBandValue(item)) >= 7 && Number(writingBandValue(item)) < 8).length, color: 'bg-emerald-400', hex: '#6ED0B2' },
      { label: 'Band 6', value: scoredReviewedSubmissions.filter(item => Number(writingBandValue(item)) >= 6 && Number(writingBandValue(item)) < 7).length, color: 'bg-amber-300', hex: '#FFD166' },
      { label: 'Band 5 and below', value: scoredReviewedSubmissions.filter(item => Number(writingBandValue(item)) > 0 && Number(writingBandValue(item)) < 6).length, color: 'bg-orange-400', hex: '#FF7A4F' },
      { label: 'Unscored', value: reviewedSubmissions.length - scoredReviewedSubmissions.length, color: 'bg-slate-300', hex: '#CBD5E1' }
    ];

    return (
      <>
        {renderHero()}
        <section className="mb-4 grid gap-4 xl:grid-cols-3">
          <OverviewMetric icon={ClipboardCheck} label="Reviewed Today" value={reviewedToday} caption="Keep going! You're doing great." tone="green" />
          <OverviewMetric icon={ListChecks} label="Total Reviewed" value={totalReviewed} caption="All time" tone="blue" />
          <OverviewMetric icon={Clock} label="Pending Review" value={pendingSubmissionsForView.length} caption="Waiting for your feedback" tone="coral" />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <DashboardTable
            title="Latest Reviewed"
            subtitle="Your most recent reviewed scripts"
            icon={CheckCircle2}
            tone="bg-emerald-50 text-emerald-600"
            columns={['Student Name', 'Task Type', 'Band Score', 'Reviewed']}
            rows={latestReviewedRows.map(item => ({
              name: item.profiles?.full_name || 'Student',
              task: taskLabel(item),
              score: writingBandValue(item)?.toFixed(1) || 'N/A',
              time: relativeTime(item.feedback?.updated_at || item.submitted_at),
              attemptId: item.id
            }))}
            actionLabel="View all reviewed"
            onAction={() => setTeacherView('reviews')}
            variant="reviewed"
          />
          <DashboardTable
            title="Pending Reviews"
            subtitle="Scripts waiting for your feedback"
            icon={Clock}
            tone="bg-[#FFF3F2] text-[#ef5f55]"
            columns={['Student Name', 'Task Type', 'Submitted', 'Action']}
            rows={pendingRows.map(item => ({
              name: item.profiles?.full_name || 'Student',
              task: taskLabel(item),
              time: relativeTime(item.submitted_at),
              attemptId: item.id
            }))}
            actionLabel="View all pending"
            onAction={() => setTeacherView('reviews')}
            onReview={openSubmissionReview}
            variant="pending"
          />
          <BandDistribution total={totalReviewed} bands={bandBuckets} />
          <RecentActivity rows={activityRows} onAction={() => setTeacherView('analytics')} />
        </section>
      </>
    );
  };

  const renderReviewsSection = () => (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-[24px] font-black">
            <PenLine className="h-6 w-6 text-[#294b77]" /> Writing Reviews
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">Practice and full mock writing submissions are reviewed here, inside the new teacher dashboard.</p>
        </div>
        <div className="flex rounded-2xl bg-[#EFF4FB] p-1">
          {(['practice', 'mock'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubmissionTab(tab)}
              className={`rounded-xl px-4 py-2 text-[13px] font-black capitalize transition-colors ${activeSubmissionTab === tab ? 'bg-[#294b77] text-white shadow-sm' : 'text-[#294b77] hover:bg-[#EE6055] hover:text-white'}`}
            >
              {tab} ({tab === 'practice' ? practiceSubmissions.length : mockSubmissions.length})
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="grid min-h-[360px] place-items-center text-[14px] font-bold text-slate-400">Loading writing reviews...</div>
        ) : visibleSubmissions.length === 0 ? (
          <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] p-10 text-center">
            <div>
              <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-xl font-black">No {activeSubmissionTab} submissions yet</h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">Writing submissions will appear here when students finish tests.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
            <div className="grid content-start gap-3">
              <div className="rounded-2xl border border-[#294b77]/10 bg-[#EFF4FB] px-4 py-3 text-[12px] font-black text-[#294b77]">
                {activePendingCount} pending in {activeSubmissionTab}
              </div>
              {visibleSubmissions.map(submission => (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => setSelectedSubmissionId(submission.id)}
                  className={`flex items-start gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all ${
                    selectedSubmissionId === submission.id ? 'border-[#294b77] ring-2 ring-[#294b77]/10' : 'border-slate-100 hover:border-[#EE6055]'
                  }`}
                >
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                    submission.review_status === 'teacher_review_pending' ? 'border border-[#294b77]/10 bg-[#EFF4FB] text-[#294b77]' : 'border border-emerald-100 bg-emerald-50 text-emerald-600'
                  }`}>
                    {submission.review_status === 'teacher_review_pending' ? <PenLine className="h-5 w-5" /> : <CheckSquare className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-black">{submission.mock_tests?.title || 'IELTS Writing Test'}</h3>
                    <p className="mt-1 truncate text-[12px] font-semibold text-slate-500">
                      {submission.profiles?.full_name || 'Student'} • {submission.profiles?.email || 'No email'}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-slate-400">
                      {submission.answered_writing_tasks}/{submission.writing_task_count} tasks • {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'recently'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              {selectedSubmission ? (
                <>
                  <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-[22px] font-black">{selectedSubmission.mock_tests?.title || 'IELTS Writing Test'}</h3>
                      <p className="mt-1 text-[13px] font-semibold text-slate-500">
                        {selectedSubmission.profiles?.full_name || 'Student'} • {selectedSubmission.profiles?.email || 'No email'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-[#F8FAFC] px-3 py-2 text-[12px] font-black text-slate-600">
                      Objective band: {Number(selectedSubmission.score || 0).toFixed(1)}
                    </div>
                  </div>
                  {reviewLoading ? (
                    <div className="p-12 text-center text-sm font-bold text-slate-400">Loading answers...</div>
                  ) : (
                    <div className="grid gap-6 p-5">
                      <div className="grid gap-4">
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-400">Student Writing Answers</h4>
                        {reviewAnswers.length === 0 ? (
                          <div className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-5 text-sm font-semibold text-slate-500">No writing tasks were found for this submission.</div>
                        ) : reviewAnswers.map((answer, index) => (
                          <div key={answer.id} className="grid gap-4">
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                              <div className="border-b border-slate-100 bg-[#F8FAFC] p-4">
                                <span className="rounded-lg bg-[#EFF4FB] px-2.5 py-1 text-[10px] font-black uppercase text-[#294b77]">
                                  {answer.extra_data?.task_type || `Task ${answer.question_number}`}
                                </span>
                                <p className="mt-3 text-[14px] font-bold leading-relaxed">{answer.question_text}</p>
                              </div>
                              <div className="min-h-[140px] whitespace-pre-wrap p-4 text-[14px] leading-7 text-slate-700">{answer.student_answer || 'Not answered'}</div>
                            </div>
                            {renderTaskFeedbackForm(answer, index)}
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-4 border-t border-slate-100 pt-6">
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-400">Overall Result</h4>
                        <label className="grid gap-1.5">
                          <span className="text-[11px] font-black uppercase text-slate-500">Writing Band Score</span>
                          <input
                            type="number"
                            min="0"
                            max="9"
                            step="0.5"
                            value={feedbackForm.band_score || ''}
                            onChange={event => updateFeedback('band_score', event.target.value)}
                            className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]"
                            placeholder="e.g. 6.5"
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-[11px] font-black uppercase text-slate-500">Examiner Comments</span>
                          <textarea
                            value={String(feedbackForm.examiner_comments || '')}
                            onChange={event => updateFeedback('examiner_comments', event.target.value)}
                            className="min-h-[88px] resize-y rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-[14px] leading-6 outline-none focus:border-[#294b77]"
                            placeholder="Add examiner comments..."
                          />
                        </label>
                        <button onClick={submitFeedback} disabled={savingFeedback} className="justify-self-start rounded-xl bg-[#294b77] px-5 py-3 text-[13px] font-black text-white transition-colors hover:bg-[#EE6055] disabled:opacity-60">
                          <Save className="mr-2 inline h-4 w-4" /> {savingFeedback ? 'Saving Feedback...' : 'Submit Feedback'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-sm font-bold text-slate-400">Select a submission to review.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const renderStudentsSection = () => (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-[24px] font-black">
            <Users className="h-6 w-6 text-[#294b77]" /> Students
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">Approved learners, attempts, progress, and writing status inside this same teacher dashboard.</p>
        </div>
        <div className="rounded-xl border border-[#294b77]/10 bg-[#EFF4FB] px-4 py-2 text-[12px] font-black text-[#294b77]">{students.length} approved students</div>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="grid min-h-[360px] place-items-center text-[14px] font-bold text-slate-400">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] p-16 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-xl font-black">No approved students yet</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">Approved premium students will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="grid h-fit gap-3">
              {students.map(student => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:border-[#EE6055] ${
                    selectedStudentId === student.id ? 'border-[#294b77] ring-2 ring-[#294b77]/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#EFF4FB] font-black text-[#294b77]">
                      {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-black">{student.full_name}</h3>
                      <p className="truncate text-[12px] font-semibold text-slate-500">{student.email}</p>
                    </div>
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
                </button>
              ))}
            </div>
            {studentDetailLoading || !studentDetail ? (
              <div className="grid min-h-[420px] place-items-center rounded-2xl border border-slate-200 bg-[#F8FAFC] text-sm font-bold text-slate-400">Loading student profile...</div>
            ) : (
              <div className="grid gap-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-2 bg-[#294b77]"></div>
                  <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div>
                      <div className="flex items-center gap-4">
                        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#EFF4FB] text-2xl font-black text-[#294b77]">
                          {studentDetail.student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <h3 className="text-2xl font-black">{studentDetail.student.full_name}</h3>
                          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500"><Mail className="h-4 w-4" /> {studentDetail.student.email}</p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                        <p><span className="font-black text-slate-400">Join Date:</span> {fmtDate(studentDetail.student.created_at)}</p>
                        <p><span className="font-black text-slate-400">Course:</span> {studentDetail.student.course}</p>
                        <p><span className="font-black text-slate-400">Status:</span> {studentDetail.student.overall_status}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#294b77]/10 bg-[#F8FAFC] p-4">
                      <p className="mb-3 text-[12px] font-black uppercase tracking-wider text-[#294b77]">IELTS Progress Card</p>
                      <div className="grid grid-cols-2 gap-3">
                        <BandCard icon={<BookOpen className="h-5 w-5" />} label="Reading" value={studentDetail.summary.estimated_bands.reading} tone="bg-[#EFF4FB] text-[#294b77]" />
                        <BandCard icon={<PenLine className="h-5 w-5" />} label="Writing" value={studentDetail.summary.estimated_bands.writing} tone="bg-[#FFF3F2] text-[#EE6055]" />
                        <BandCard icon={<Star className="h-5 w-5" />} label="Overall" value={studentDetail.summary.estimated_bands.overall} tone="bg-amber-50 text-amber-700" />
                        <BandCard icon={<TrendingUp className="h-5 w-5" />} label="Average" value={studentDetail.summary.average_overall_score} tone="bg-emerald-50 text-emerald-700" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    ['Mock Tests', studentDetail.summary.total_mock_tests, <FileText className="h-5 w-5" />],
                    ['Practice Tests', studentDetail.summary.total_practice_tests, <Target className="h-5 w-5" />],
                    ['Highest Score', fmtScore(studentDetail.summary.highest_score), <TrendingUp className="h-5 w-5" />],
                    ['Activities', studentDetail.analytics.total_study_activity, <Clock className="h-5 w-5" />]
                  ].map(([label, value, icon]: any) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#EFF4FB] text-[#294b77]">{icon}</div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
                      <p className="mt-1 text-2xl font-black">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <HistoryList title="Mock Test History" rows={studentDetail.mock_history} />
                  <HistoryList title="Practice Test History" rows={studentDetail.practice_history} />
                  <WritingList rows={studentDetail.writing_evaluations} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );

  const renderQaSection = (compact = false) => (
    <section id="video-qa" className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-[22px] font-black">
            <MessageCircle className="h-6 w-6 text-[#294b77]" /> Video Lesson Q&amp;A
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">Questions students ask under recorded lessons appear here.</p>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        {loading ? (
          <div className="grid min-h-[260px] place-items-center text-[14px] font-bold text-slate-400">Loading teacher workspace...</div>
        ) : recentQuestions.length ? recentQuestions.map(question => (
          <div key={question.id} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-black uppercase tracking-wider text-slate-400">
                  {question.lesson?.course_sections?.title || 'Recorded Course'} • {question.lesson?.title || 'Lesson'}
                </p>
                <h3 className="mt-1 text-[15px] font-black">{question.student?.full_name || question.student?.email || 'Student'}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-black ${question.answer_text ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}`}>
                {question.answer_text ? 'Answered' : 'Needs reply'}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-4 text-[14px] font-semibold leading-6 text-slate-600">{question.question_text}</p>
            <textarea
              value={replyDrafts[question.id] || ''}
              onChange={event => setReplyDrafts(drafts => ({ ...drafts, [question.id]: event.target.value }))}
              placeholder="Write teacher response..."
              className="mt-3 min-h-[92px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]"
            />
            <div className="mt-3 flex justify-end">
              <button onClick={() => saveQuestionReply(question.id)} disabled={savingReplyId === question.id} className="rounded-xl bg-[#294b77] px-5 py-3 text-[13px] font-black text-white transition-colors hover:bg-[#EE6055] disabled:opacity-60">
                {savingReplyId === question.id ? 'Saving...' : <><Send className="mr-2 inline h-4 w-4" /> Save Reply</>}
              </button>
            </div>
          </div>
        )) : (
          <div className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] p-10 text-center">
            <div>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h3 className="mt-3 text-[18px] font-black">No video questions yet</h3>
              <p className="mt-1 text-[13px] font-semibold text-slate-500">Student questions from recorded lessons will appear here.</p>
            </div>
          </div>
        )}
        {compact && questions.length > 8 && (
          <button onClick={() => setTeacherView('qa')} className="justify-self-center rounded-xl border border-[#294b77]/20 px-4 py-2 text-[13px] font-black text-[#294b77] transition-colors hover:border-[#EE6055] hover:bg-[#EE6055] hover:text-white">
            View all questions
          </button>
        )}
      </div>
    </section>
  );

  const renderUtilitySection = (title: string, description: string, Icon: any) => (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EFF4FB] text-[#294b77]">
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-[28px] font-black text-[#07183D]">{title}</h1>
          <p className="mt-2 max-w-2xl text-[14px] font-semibold leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    </section>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <TeacherNav active={activeView} onSelect={setTeacherView} />
      <main className="min-w-0 flex-1 p-5 lg:p-7 xl:p-8">
        {activeView === 'dashboard' && renderOverview()}
        {activeView === 'reviews' && renderReviewsSection()}
        {activeView === 'students' && renderStudentsSection()}
        {activeView === 'tfng' && renderTfngSupportSection()}
        {activeView === 'qa' && renderQaSection()}
        {activeView === 'analytics' && renderUtilitySection('Analytics', 'Teacher analytics will show review speed, writing bands, activity history, and student progress trends here.', BarChart3)}
        {activeView === 'resources' && renderUtilitySection('Resources', 'Teacher resources for writing rubrics, response templates, and lesson support material will appear here.', LibraryBig)}
        {activeView === 'settings' && renderUtilitySection('Settings', 'Teacher profile, notification preferences, and workspace controls will appear here.', Settings)}
      </main>
    </div>
  );
}

const BandCard = ({ icon, label, value, tone }: any) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${tone}`}>{icon}</div>
    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 text-3xl font-black text-[#05162E]">{fmtScore(value)}</p>
  </div>
);

const OverviewMetric = ({ icon: Icon, label, value, caption, tone }: any) => {
  const toneMap: Record<string, { icon: string; value: string; line: string }> = {
    green: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-600', line: '#7DCDBA' },
    blue: { icon: 'bg-blue-50 text-[#294b77]', value: 'text-[#07183D]', line: '#8EB8FF' },
    coral: { icon: 'bg-[#FFF3F2] text-[#ef5f55]', value: 'text-[#ef5f55]', line: '#FFB49F' }
  };
  const selected = toneMap[tone] || toneMap.blue;

  return (
    <div className="grid min-h-[118px] grid-cols-[68px_minmax(0,1fr)_88px] items-center gap-4 rounded-2xl border border-[#E2E8F1] bg-white px-6 py-4 shadow-[0_12px_35px_rgba(15,35,70,0.06)]">
      <div className={`grid h-14 w-14 place-items-center rounded-full ${selected.icon}`}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-black text-[#07183D]">{label}</p>
        <p className={`mt-1.5 text-[34px] font-black leading-none ${selected.value}`}>{value}</p>
        <p className="mt-2 text-[12px] font-semibold text-[#52617F]">{caption}</p>
      </div>
      <svg viewBox="0 0 104 54" className="h-[44px] w-[88px] self-end" aria-hidden="true">
        <path d="M2 45 C18 45 16 18 30 18 C42 18 42 49 55 49 C69 49 68 14 80 14 C92 14 90 4 102 4" fill="none" stroke={selected.line} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
};

const avatarTones = [
  'bg-emerald-50 text-emerald-700',
  'bg-violet-50 text-violet-700',
  'bg-orange-50 text-orange-700',
  'bg-blue-50 text-blue-700',
  'bg-amber-50 text-amber-700'
];

const DashboardTable = ({ title, subtitle, icon: Icon, tone, columns, rows, actionLabel, onAction, onReview, variant }: any) => (
  <section className="overflow-hidden rounded-2xl border border-[#E2E8F1] bg-white shadow-[0_12px_35px_rgba(15,35,70,0.06)]">
    <div className="flex items-start gap-3 px-6 pb-3.5 pt-5">
      <div className={`grid h-8 w-8 place-items-center rounded-full ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-[17px] font-black text-[#07183D]">{title}</h2>
        <p className="mt-0.5 text-[12px] font-semibold text-[#52617F]">{subtitle}</p>
      </div>
    </div>
    <div className="px-5">
      <div className={`grid ${variant === 'pending' ? 'grid-cols-[minmax(0,1.15fr)_105px_115px_132px]' : 'grid-cols-[minmax(0,1.15fr)_105px_105px_112px]'} rounded-t-xl bg-[#F7F9FC] px-4 py-3 text-[11px] font-black text-[#8995AF]`}>
        {columns.map((column: string) => <span key={column}>{column}</span>)}
      </div>
      <div className="divide-y divide-[#E8EDF5]">
        {rows.length === 0 ? (
          <div className="grid min-h-[210px] place-items-center px-5 py-6 text-center">
            <div>
              <FileText className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-2 text-[14px] font-black text-[#10234C]">No records yet</p>
              <p className="mt-1 text-[12px] font-semibold text-[#7D8AA3]">New writing activity will appear here.</p>
            </div>
          </div>
        ) : rows.map((row: any, index: number) => (
          <div key={`${row.name}-${index}`} className={`grid ${variant === 'pending' ? 'grid-cols-[minmax(0,1.15fr)_105px_115px_132px]' : 'grid-cols-[minmax(0,1.15fr)_105px_105px_112px]'} items-center px-4 py-2.5 text-[13px] font-bold text-[#10234C]`}>
            <div className="flex min-w-0 items-center gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-black ${avatarTones[index % avatarTones.length]}`}>
                {initials(row.name).slice(0, 1)}
              </span>
              <span className="truncate">{row.name}</span>
            </div>
            <span>{row.task}</span>
            {variant === 'pending' ? (
              <>
                <span className="text-[#52617F]">{row.time}</span>
                <span className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => onReview?.(row.attemptId)} className="rounded-lg bg-[#294b77] px-4 py-1.5 text-[12px] font-black text-white shadow-[0_6px_14px_rgba(41,75,119,0.22)] hover:bg-[#ef5f55]">
                    Review
                  </button>
                  <MoreVertical className="h-4 w-4 text-[#294b77]" />
                </span>
              </>
            ) : (
              <>
                <span>
                  <span className={`rounded-lg px-2.5 py-1 text-[13px] font-black ${Number(row.score) >= 7 ? 'bg-emerald-50 text-emerald-700' : Number(row.score) >= 6.5 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {row.score}
                  </span>
                </span>
                <span className="text-[#52617F]">{row.time}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
    <div className="px-6 py-3.5 text-center">
      <button type="button" onClick={onAction} className="inline-flex items-center gap-2 text-[13px] font-black text-[#294b77] hover:text-[#ef5f55]">
        {actionLabel} <span className="text-[22px] leading-none">→</span>
      </button>
    </div>
  </section>
);

const BandDistribution = ({ total, bands }: { total: number; bands: Array<{ label: string; value: number; color: string; hex: string }> }) => {
  let cursor = 0;
  const gradientStops = total > 0
    ? bands.map(item => {
      const start = cursor;
      const size = (item.value / total) * 360;
      cursor += size;
      return `${item.hex} ${start}deg ${cursor}deg`;
    }).join(',')
    : '#E8EDF5 0deg 360deg';

  return (
    <section className="rounded-2xl border border-[#E2E8F1] bg-white p-6 shadow-[0_12px_35px_rgba(15,35,70,0.06)]">
      <h2 className="text-[17px] font-black text-[#07183D]">Band Distribution <span className="text-[12px] font-bold text-[#52617F]">(All Time)</span></h2>
      <div className="mt-5 grid gap-5 md:grid-cols-[175px_minmax(0,1fr)] md:items-center">
        <div className="relative mx-auto h-[160px] w-[160px] rounded-full" style={{ background: `conic-gradient(${gradientStops})` }}>
          <div className="absolute inset-8 grid place-items-center rounded-full bg-white text-center">
            <span className="block text-[28px] font-black text-[#07183D]">{total}</span>
            <span className="block text-[12px] font-semibold text-[#8A96AE]">Total</span>
          </div>
        </div>
        <div className="grid gap-3">
          {bands.map(({ label, value, color }) => (
            <div key={label} className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-3 text-[14px] font-bold text-[#10234C]">
              <span className="flex min-w-0 items-center gap-3">
                <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
                <span className="truncate">{label}</span>
              </span>
              <span className="text-right">{value} ({total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const RecentActivity = ({ rows, onAction }: any) => (
  <section className="rounded-2xl border border-[#E2E8F1] bg-white p-6 shadow-[0_12px_35px_rgba(15,35,70,0.06)]">
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-full bg-violet-50 text-violet-600">
        <ListChecks className="h-4 w-4" />
      </div>
      <h2 className="text-[17px] font-black text-[#07183D]">Recent Activity</h2>
    </div>
    <div className="mt-4 divide-y divide-[#E8EDF5]">
      {rows.length === 0 ? (
        <div className="grid min-h-[155px] place-items-center text-center">
          <div>
            <ListChecks className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-2 text-[14px] font-black text-[#10234C]">No recent activity yet</p>
            <p className="mt-1 text-[12px] font-semibold text-[#7D8AA3]">Teacher actions will appear here.</p>
          </div>
        </div>
      ) : rows.map((row: any, index: number) => {
        const Icon = row.icon;
        return (
          <div key={`${row.title}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)_86px] items-center gap-3 py-3">
            <span className={`grid h-8 w-8 place-items-center rounded-full ${row.tone}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-[#52617F]">
                {row.title}
              </span>
              {row.detail && <span className="mt-0.5 block text-[12px] font-black text-[#10234C]">{row.detail}</span>}
            </span>
            <span className="text-right text-[12px] font-semibold text-[#7D8AA3]">{row.time}</span>
          </div>
        );
      })}
    </div>
    <div className="pt-3 text-center">
      <button type="button" onClick={onAction} className="inline-flex items-center gap-2 text-[13px] font-black text-[#294b77] hover:text-[#ef5f55]">
        View all activity <span className="text-[22px] leading-none">→</span>
      </button>
    </div>
  </section>
);

const HistoryList = ({ title, rows }: any) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="mb-4 text-[15px] font-black">{title}</h3>
    {rows.length === 0 ? (
      <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm font-semibold text-slate-500">No records yet.</p>
    ) : (
      <div className="grid gap-3">
        {rows.slice(0, 6).map((row: any) => (
          <Link key={row.id} to={`/attempts/${row.id}/result`} className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-4 transition-colors hover:border-[#EE6055]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-black">{row.mock_tests?.title || 'Untitled test'}</p>
                <p className="mt-1 text-[12px] font-semibold text-slate-500">{fmtDate(row.submitted_at)} • {row.time_taken_minutes ?? 'N/A'} min taken</p>
              </div>
              <span className={`rounded-lg px-3 py-1 text-[11px] font-black ${row.result_status === 'Ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#FFF3F2] text-[#EE6055]'}`}>
                {row.result_status || 'Ready'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    )}
  </div>
);

const WritingList = ({ rows }: any) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
    <h3 className="mb-4 text-[15px] font-black">Writing Evaluation</h3>
    <div className="grid gap-3 md:grid-cols-2">
      {rows.length === 0 ? (
        <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm font-semibold text-slate-500">No writing submissions yet.</p>
      ) : rows.slice(0, 8).map((item: any) => (
        <Link key={item.attempt_id} to={`/attempts/${item.attempt_id}/result`} className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-4 transition-colors hover:border-[#EE6055]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-black">{item.test_name}</p>
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

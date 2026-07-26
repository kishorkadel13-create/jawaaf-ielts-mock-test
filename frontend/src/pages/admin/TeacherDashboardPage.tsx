import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileText,
  LogOut,
  Mail,
  MessageCircle,
  PenLine,
  Save,
  Send,
  Star,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type TeacherView = 'dashboard' | 'reviews' | 'students' | 'qa';

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
    { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { key: 'reviews' as const, label: 'Writing Reviews', icon: PenLine },
    { key: 'students' as const, label: 'Students', icon: Users },
    { key: 'qa' as const, label: 'Video Q&A', icon: MessageCircle }
  ];

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col bg-[#294b77] text-white lg:flex">
      <div className="h-10" />

      <nav className="grid flex-1 content-start gap-2 px-5">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSelect(item.key)}
              className={`flex items-center gap-4 rounded-xl px-5 py-3.5 text-left text-[15px] font-bold transition-colors ${
                active === item.key ? 'bg-white/15 text-white shadow-lg shadow-black/10' : 'text-white/75 hover:bg-[#EE6055] hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" /> {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-5">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-5 py-3.5 text-left text-[15px] font-bold text-white/75 hover:bg-[#EE6055] hover:text-white">
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
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingReplyId, setSavingReplyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<ReviewAnswer[]>([]);
  const [feedbackForm, setFeedbackForm] = useState<Feedback>(emptyFeedback);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [activeSubmissionTab, setActiveSubmissionTab] = useState<'practice' | 'mock'>('practice');

  const setTeacherView = (view: TeacherView) => {
    setActiveView(view);
    if (view === 'dashboard') navigate('/teacher', { replace: true });
    if (view === 'reviews') navigate('/teacher/reviews', { replace: true });
    if (view === 'students') navigate('/teacher/students', { replace: true });
    if (view === 'qa') navigate('/teacher/qa', { replace: true });
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [{ data: inboxData }, { data: studentData }, { data: questionData }] = await Promise.all([
        api.get('/attempts/admin/inbox').catch(() => ({ data: [] })),
        api.get('/attempts/teacher/students').catch(() => ({ data: [] })),
        api.get('/admin/lesson-questions').catch(() => ({ data: [] }))
      ]);

      const inboxList = Array.isArray(inboxData) ? inboxData : [];
      const studentList = Array.isArray(studentData) ? studentData : [];
      const questionList = Array.isArray(questionData) ? questionData : [];

      setSubmissions(inboxList);
      setStudents(studentList);
      setQuestions(questionList);
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
    <section className="mb-7 overflow-hidden rounded-3xl bg-[#294b77] text-white shadow-xl shadow-[#294b77]/10">
      <div className="grid gap-6 p-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/70">Teacher Dashboard</p>
          <h1 className="mt-3 text-[32px] font-black tracking-tight">Welcome back, {profile?.full_name || 'Teacher'}</h1>
          <p className="mt-2 max-w-2xl text-[15px] font-semibold leading-7 text-white/75">
            Review writing, monitor students, and answer video lesson questions from one clean workspace.
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
          <p className="text-[13px] font-black uppercase tracking-wider text-white/60">Today Focus</p>
          <div className="mt-4 grid gap-3">
            <button onClick={() => setTeacherView('reviews')} className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-left transition-colors hover:bg-[#EE6055]">
              <span className="font-bold">Writing pending</span>
              <span className="font-black">{pendingReviews}</span>
            </button>
            <button onClick={() => setTeacherView('qa')} className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-left transition-colors hover:bg-[#EE6055]">
              <span className="font-bold">Video Q&amp;A pending</span>
              <span className="font-black">{unansweredQuestions}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  const renderOverview = () => {
    const workCards = [
      { title: 'Writing Reviews', value: pendingReviews, subtitle: 'pending submissions', view: 'reviews' as const, icon: PenLine, tone: 'bg-[#EFF4FB] text-[#294b77]' },
      { title: 'Students', value: students.length, subtitle: 'approved learners', view: 'students' as const, icon: Users, tone: 'bg-emerald-50 text-emerald-700' },
      { title: 'Video Q&A', value: unansweredQuestions, subtitle: 'questions need reply', view: 'qa' as const, icon: MessageCircle, tone: 'bg-amber-50 text-amber-700' }
    ];

    return (
      <>
        {renderHero()}
        <section className="mb-7 grid gap-5 md:grid-cols-3">
          {workCards.map(card => {
            const Icon = card.icon;
            return (
              <button key={card.title} onClick={() => setTeacherView(card.view)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#EE6055] hover:shadow-lg">
                <div className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl ${card.tone}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-[12px] font-black uppercase tracking-wider text-slate-400">{card.title}</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-[34px] font-black">{card.value}</span>
                  <span className="pb-2 text-[13px] font-bold text-slate-500">{card.subtitle}</span>
                </div>
              </button>
            );
          })}
        </section>
        {renderQaSection(true)}
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

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <TeacherNav active={activeView} onSelect={setTeacherView} />
      <main className="min-w-0 flex-1 p-5 lg:p-8">
        {activeView === 'dashboard' && renderOverview()}
        {activeView === 'reviews' && renderReviewsSection()}
        {activeView === 'students' && renderStudentsSection()}
        {activeView === 'qa' && renderQaSection()}
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

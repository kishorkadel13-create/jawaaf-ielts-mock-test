import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import JawaafLogo from '../../components/JawaafLogo';
import { BookOpen, CheckSquare, ChevronLeft, FileText, Layers, PenLine, Save, ShieldCheck, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface Submission {
  id: string;
  score: string | number;
  submitted_at: string;
  review_status: 'teacher_review_pending' | 'auto_graded' | 'reviewed';
  attempt_mode: 'mock' | 'practice';
  writing_task_count: number;
  answered_writing_tasks: number;
  feedback?: Feedback | null;
  mock_tests?: {
    title: string;
    description?: string;
  };
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface ReviewAnswer {
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
}

interface TaskFeedback {
  task_achievement_score?: string | number;
  coherence_cohesion_score?: string | number;
  lexical_resource_score?: string | number;
  grammar_score?: string | number;
  task_achievement?: string;
  coherence_cohesion?: string;
  lexical_resource?: string;
  grammar?: string;
}

interface Feedback {
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
}

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

export default function AdminSubmissionsPage() {
  const { profile, logout } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<ReviewAnswer[]>([]);
  const [feedbackForm, setFeedbackForm] = useState<Feedback>(emptyFeedback);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSubmissionTab, setActiveSubmissionTab] = useState<'practice' | 'mock'>('practice');

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/attempts/admin/inbox');
      const list = Array.isArray(data) ? data : [];
      setSubmissions(list);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    if (!selectedSubmissionId) return;

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

  const practiceSubmissions = useMemo(
    () => submissions.filter(item => item.attempt_mode === 'practice'),
    [submissions]
  );
  const mockSubmissions = useMemo(
    () => submissions.filter(item => item.attempt_mode === 'mock'),
    [submissions]
  );
  const visibleSubmissions = activeSubmissionTab === 'practice' ? practiceSubmissions : mockSubmissions;
  const selectedSubmission = visibleSubmissions.find(item => item.id === selectedSubmissionId) || null;
  const activePendingCount = visibleSubmissions.filter(item => item.review_status === 'teacher_review_pending').length;
  const isTeacher = profile?.role === 'teacher';

  useEffect(() => {
    if (loading) return;
    setSelectedSubmissionId(current => (
      current && visibleSubmissions.some(item => item.id === current)
        ? current
        : visibleSubmissions[0]?.id || null
    ));
  }, [loading, visibleSubmissions]);

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
      setSaving(true);
      const { data } = await api.post(`/attempts/${selectedSubmissionId}/feedback`, feedbackForm);
      if (!data?.feedback?.id) {
        throw new Error('Feedback was not saved by the server.');
      }
      await fetchSubmissions();
      const { data: reviewData } = await api.get(`/attempts/${selectedSubmissionId}/review`);
      setFeedbackForm({ ...emptyFeedback, ...(reviewData.feedback || {}) });
      alert('Writing feedback submitted. Student result is now available.');
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      alert(err.message || 'Failed to submit feedback.');
    } finally {
      setSaving(false);
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
          <span className="rounded-lg bg-white px-3 py-1 text-[11px] font-black text-[#1E3A6E]">
            Q{answer.question_number}
          </span>
        </div>
        <div className="grid gap-3 p-4">
          {writingDescriptorRows.map(([scoreField, noteField, label]) => (
            <div key={`${taskKey}-${String(scoreField)}`} className="grid gap-3 rounded-xl border border-slate-100 bg-[#F8FAFC] p-3 md:grid-cols-[150px_minmax(0,1fr)]">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-black text-slate-500 uppercase">{label} Score</span>
                <input
                  type="number"
                  min="0"
                  max="9"
                  step="0.5"
                  value={String(taskFeedback[scoreField] || '')}
                  onChange={(event) => updateTaskFeedback(taskKey, scoreField, event.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#1E3A6E] text-[14px] font-bold"
                  placeholder="0-9"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-black text-slate-500 uppercase">{label} Feedback</span>
                <textarea
                  value={String(taskFeedback[noteField] || '')}
                  onChange={(event) => updateTaskFeedback(taskKey, noteField, event.target.value)}
                  className="min-h-[78px] px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#1E3A6E] text-[14px] leading-6 resize-y"
                  placeholder={`Add ${label.toLowerCase()} feedback for ${taskTitle}...`}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen bg-[#F8FAFC] font-sans" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <aside className="w-full md:w-64 bg-[#05162E] text-white flex flex-col p-6 border-r border-[#1E3A6E]/30 flex-shrink-0 z-10 shadow-xl">
        <div className="mb-10 mt-2 px-2">
          <Link to="/" className="block bg-white p-2 rounded-xl w-fit">
            <JawaafLogo className="h-8 w-auto" />
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">{isTeacher ? 'Teacher Portal' : 'Admin Console'}</span>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {!isTeacher && (
            <>
              <Link to="/admin" className="px-4 py-3 text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white font-semibold rounded-xl flex items-center gap-3 transition-colors">
                <Layers className="h-5 w-5" /> Overview
              </Link>
              <Link to="/admin/tests" className="px-4 py-3 text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white font-semibold rounded-xl flex items-center gap-3 transition-colors">
                <BookOpen className="h-5 w-5" /> Mock Tests CMS
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setActiveSubmissionTab('practice')}
            className={`px-4 py-3 text-left font-bold rounded-xl flex items-center justify-between gap-3 transition-colors ${
              activeSubmissionTab === 'practice'
                ? 'bg-[#1E3A6E] text-white'
                : 'text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <PenLine className="h-5 w-5" /> Practice Tests
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              activeSubmissionTab === 'practice' ? 'bg-white text-[#1E3A6E]' : 'bg-white/10 text-slate-300'
            }`}>
              {practiceSubmissions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubmissionTab('mock')}
            className={`px-4 py-3 text-left font-bold rounded-xl flex items-center justify-between gap-3 transition-colors ${
              activeSubmissionTab === 'mock'
                ? 'bg-[#1E3A6E] text-white'
                : 'text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <BookOpen className="h-5 w-5" /> Mock Tests
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              activeSubmissionTab === 'mock' ? 'bg-white text-[#1E3A6E]' : 'bg-white/10 text-slate-300'
            }`}>
              {mockSubmissions.length}
            </span>
          </button>
          {isTeacher && (
            <Link to="/teacher/students" className="px-4 py-3 text-slate-400 hover:bg-[#1E3A6E]/50 hover:text-white font-bold rounded-xl flex items-center gap-3 transition-colors">
              <Users className="h-5 w-5" /> Students
            </Link>
          )}
          <button onClick={logout} className="mt-auto px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white font-semibold rounded-xl flex items-center gap-3 transition-colors">
            <ChevronLeft className="h-5 w-5" /> Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-10 flex flex-col gap-7 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 pb-5">
          <div>
            <h1 className="text-[28px] md:text-[32px] font-black text-[#05162E] tracking-tight">
              {activeSubmissionTab === 'practice' ? 'Practice Test Reviews' : 'Mock Test Reviews'}
            </h1>
            <p className="text-[14px] text-slate-500 mt-1">
              {activeSubmissionTab === 'practice'
                ? 'Review writing answers submitted from practice tests.'
                : 'Review writing answers submitted from full mock tests.'}
            </p>
          </div>
          <div className="px-4 py-2 bg-[#EFF4FB] border border-[#1E3A6E]/10 text-[#1E3A6E] text-[12px] font-black rounded-xl">
            {activePendingCount} pending in {activeSubmissionTab}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1E3A6E] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid gap-5">
            {visibleSubmissions.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-14 text-center shadow-sm flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5">
                  <FileText className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-[18px] font-black text-[#05162E]">No {activeSubmissionTab} submissions yet</h3>
                <p className="text-slate-500 mt-2 text-[14px]">
                  {activeSubmissionTab === 'practice'
                    ? 'Practice writing submissions will appear in this tab.'
                    : 'Mock test writing submissions will appear in this tab.'}
                </p>
              </div>
            ) : (
          <div className="grid xl:grid-cols-[420px_1fr] gap-6 items-start">
            <div className="grid gap-3">
              {visibleSubmissions.map((submission) => (
                <button
                  type="button"
                  key={submission.id}
                  onClick={() => setSelectedSubmissionId(submission.id)}
                  className={`text-left bg-white border rounded-2xl p-5 shadow-sm flex items-start gap-4 transition-all ${
                    selectedSubmissionId === submission.id ? 'border-[#1E3A6E] ring-2 ring-[#1E3A6E]/10' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    submission.review_status === 'teacher_review_pending'
                      ? 'bg-[#EFF4FB] text-[#1E3A6E] border border-[#1E3A6E]/10'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                    {submission.review_status === 'teacher_review_pending' ? <PenLine className="h-5 w-5" /> : <CheckSquare className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-[15px] text-[#05162E] truncate">{submission.mock_tests?.title || 'IELTS Mock Test'}</h3>
                    <p className="text-[12px] text-slate-500 font-semibold mt-1 truncate">
                      {submission.profiles?.full_name || 'Student'} • {submission.profiles?.email || 'No email'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-bold mt-2">
                      {submission.attempt_mode === 'practice' ? 'Practice' : 'Mock'} • {submission.answered_writing_tasks}/{submission.writing_task_count} tasks answered • {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'recently'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 ${
                    submission.review_status === 'teacher_review_pending' ? 'bg-[#EFF4FB] text-[#1E3A6E]' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {submission.review_status === 'teacher_review_pending' ? 'Pending' : submission.review_status}
                  </span>
                </button>
              ))}
            </div>

            <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              {selectedSubmission ? (
                <>
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <h2 className="text-[22px] font-black text-[#05162E]">{selectedSubmission.mock_tests?.title || 'IELTS Mock Test'}</h2>
                      <p className="text-[13px] text-slate-500 font-semibold mt-1">
                        {selectedSubmission.profiles?.full_name || 'Student'} • {selectedSubmission.profiles?.email || 'No email'}
                      </p>
                    </div>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-black text-slate-600">
                      Objective band: {parseFloat(String(selectedSubmission.score || 0)).toFixed(1)}
                    </div>
                  </div>

                  {reviewLoading ? (
                    <div className="p-12 text-center text-slate-400 font-bold">Loading answers...</div>
                  ) : (
                    <div className="p-6 grid gap-6">
                      <div className="grid gap-4">
                        <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-400">Student Writing Answers</h3>
                        {reviewAnswers.length === 0 ? (
                          <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-500">
                            No writing tasks were found for this submission.
                          </div>
                        ) : reviewAnswers.map((answer, index) => (
                          <div key={answer.id} className="grid gap-4">
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                              <div className="p-4 bg-[#F8FAFC] border-b border-slate-100">
                                <span className="px-2.5 py-1 bg-[#EFF4FB] text-[#1E3A6E] text-[10px] font-black uppercase rounded-lg">
                                  {answer.extra_data?.task_type || `Task ${answer.question_number}`}
                                </span>
                                <p className="text-[14px] font-bold text-[#05162E] mt-3 leading-relaxed">{answer.question_text}</p>
                              </div>
                              <div className="p-4 text-[14px] leading-7 text-slate-700 whitespace-pre-wrap min-h-[140px]">
                                {answer.student_answer || 'Not answered'}
                              </div>
                            </div>
                            {renderTaskFeedbackForm(answer, index)}
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-4 border-t border-slate-100 pt-6">
                        <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-400">Overall Result</h3>
                        <label className="grid gap-1.5">
                          <span className="text-[11px] font-black text-slate-500 uppercase">Writing Band Score</span>
                          <input
                            type="number"
                            min="0"
                            max="9"
                            step="0.5"
                            value={feedbackForm.band_score || ''}
                            onChange={(event) => updateFeedback('band_score', event.target.value)}
                            className="px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl outline-none focus:border-[#1E3A6E] text-[14px] font-bold"
                            placeholder="e.g. 6.5"
                          />
                        </label>

                        <label className="grid gap-1.5">
                          <span className="text-[11px] font-black text-slate-500 uppercase">Examiner Comments</span>
                          <textarea
                            value={String(feedbackForm.examiner_comments || '')}
                            onChange={(event) => updateFeedback('examiner_comments', event.target.value)}
                            className="min-h-[88px] px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl outline-none focus:border-[#1E3A6E] text-[14px] leading-6 resize-y"
                            placeholder="Add examiner comments..."
                          />
                        </label>

                        <button
                          type="button"
                          onClick={submitFeedback}
                          disabled={saving}
                          className="justify-self-start px-5 py-3 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-black rounded-xl flex items-center gap-2 transition-colors disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" /> {saving ? 'Saving Feedback...' : 'Submit Feedback'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-slate-400 font-bold">Select a submission to review.</div>
              )}
            </section>
          </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

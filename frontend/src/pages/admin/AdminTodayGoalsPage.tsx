import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Loader2, Plus, Save, Target, Trash2, X } from 'lucide-react';
import JawaafLogo from '../../components/JawaafLogo';
import { api } from '../../services/api';

type Course = {
  id: string;
  title: string;
  slug: string;
};

type TodayGoal = {
  id: string;
  title: string;
  goal_text: string;
  tip_text?: string;
  section_slug?: string | null;
  order_no: number;
  is_active: boolean;
};

const emptyGoal = {
  title: "Today's Goal",
  goal_text: '',
  tip_text: '',
  section_slug: '',
  order_no: 1,
  is_active: true
};

const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.message || err?.details || fallback;

export default function AdminTodayGoalsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [goals, setGoals] = useState<TodayGoal[]>([]);
  const [goalForm, setGoalForm] = useState<any>(emptyGoal);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const visibleCourses = useMemo(() => {
    const hasSplitWriting = courses.some(course => course.slug === 'writing-task-1' || course.slug === 'writing-task-2');
    return hasSplitWriting ? courses.filter(course => course.slug !== 'writing') : courses;
  }, [courses]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [{ data: courseData }, { data: goalData }] = await Promise.all([
        api.get('/admin/courses').catch(() => ({ data: [] })),
        api.get('/admin/today-goals')
      ]);
      setCourses(Array.isArray(courseData) ? courseData : []);
      setGoals(Array.isArray(goalData) ? goalData : []);
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to load today goals.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const startCreate = () => {
    setGoalForm({ ...emptyGoal, order_no: goals.length + 1 });
    setShowForm(true);
  };

  const editGoal = (goal: TodayGoal) => {
    setGoalForm({
      id: goal.id,
      title: goal.title || "Today's Goal",
      goal_text: goal.goal_text || '',
      tip_text: goal.tip_text || '',
      section_slug: goal.section_slug || '',
      order_no: goal.order_no || 1,
      is_active: Boolean(goal.is_active)
    });
    setShowForm(true);
  };

  const saveGoal = async () => {
    if (!goalForm.goal_text.trim()) {
      alert('Goal text is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: goalForm.title || "Today's Goal",
        goal_text: goalForm.goal_text,
        tip_text: goalForm.tip_text,
        section_slug: goalForm.section_slug || null,
        order_no: Number(goalForm.order_no || 1),
        is_active: Boolean(goalForm.is_active)
      };

      if (goalForm.id) {
        await api.put(`/admin/today-goals/${goalForm.id}`, payload);
      } else {
        await api.post('/admin/today-goals', payload);
      }

      setShowForm(false);
      await loadData();
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to save today goal.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = async (goal: TodayGoal) => {
    if (!confirm('Delete this today goal?')) return;
    await api.delete(`/admin/today-goals/${goal.id}`);
    await loadData();
  };

  const getSectionLabel = (slug?: string | null) => {
    if (!slug) return 'All recorded courses';
    return visibleCourses.find(course => course.slug === slug)?.title || slug;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <header className="flex h-[78px] items-center justify-between border-b border-slate-200 bg-white px-6 lg:px-10">
        <div className="flex items-center gap-5">
          <Link to="/admin" className="text-slate-500 hover:text-[#294b77]"><ArrowLeft className="h-5 w-5" /></Link>
          <JawaafLogo className="h-9 w-auto" />
          <div>
            <h1 className="text-[22px] font-black">Today's Goals</h1>
            <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Manage rotating cinema sidebar goals</p>
          </div>
        </div>
        <button onClick={startCreate} className="rounded-xl bg-[#294b77] px-4 py-3 text-[13px] font-black text-white">
          <Plus className="mr-1 inline h-4 w-4" /> Add Goal
        </button>
      </header>

      <main className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:p-8">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-[18px] font-black">Goal Library</h2>
              <p className="text-[12px] font-semibold text-slate-400">Student side rotates by lesson order within matching course goals.</p>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
          </div>

          <div className="grid gap-3 p-5">
            {!loading && goals.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <Target className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-[15px] font-black text-slate-500">No goals added yet.</p>
                <button onClick={startCreate} className="mt-4 rounded-xl bg-[#294b77] px-4 py-3 text-[13px] font-black text-white">Add first goal</button>
              </div>
            )}

            {goals.map(goal => (
              <div key={goal.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${goal.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {goal.is_active ? 'Active' : 'Hidden'}
                      </span>
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-600">{getSectionLabel(goal.section_slug)}</span>
                      <span className="text-[11px] font-black text-slate-400">Order {goal.order_no}</span>
                    </div>
                    <h3 className="mt-3 text-[18px] font-black">{goal.title || "Today's Goal"}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-[14px] font-semibold leading-6 text-slate-600">{goal.goal_text}</p>
                    {goal.tip_text && <p className="mt-2 whitespace-pre-wrap text-[13px] font-bold leading-6 text-slate-500">{goal.tip_text}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => editGoal(goal)} className="rounded-lg p-2 text-[#294b77] hover:bg-[#EFF4FB]" title="Edit goal">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteGoal(goal)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="Delete goal">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-black">{showForm ? goalForm.id ? 'Edit Goal' : 'Add Goal' : 'Goal Editor'}</h2>
              <p className="text-[12px] font-semibold text-slate-400">Use section-specific goals for Reading, Speaking, etc.</p>
            </div>
            {showForm && <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>}
          </div>

          {showForm ? (
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Title</span>
                <input value={goalForm.title} onChange={event => setGoalForm({ ...goalForm, title: event.target.value })} className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
              </label>
              <label className="grid gap-2">
                <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Goal text</span>
                <textarea value={goalForm.goal_text} onChange={event => setGoalForm({ ...goalForm, goal_text: event.target.value })} placeholder="Learn how to..." className="min-h-[130px] rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />
              </label>
              <label className="grid gap-2">
                <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Tip text optional</span>
                <textarea value={goalForm.tip_text} onChange={event => setGoalForm({ ...goalForm, tip_text: event.target.value })} placeholder="Focus on keywords and synonyms!" className="min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Course</span>
                  <select value={goalForm.section_slug} onChange={event => setGoalForm({ ...goalForm, section_slug: event.target.value })} className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]">
                    <option value="">All recorded courses</option>
                    {visibleCourses.map(course => <option key={course.id} value={course.slug}>{course.title}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Order</span>
                  <input type="number" min="1" value={goalForm.order_no} onChange={event => setGoalForm({ ...goalForm, order_no: event.target.value })} className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-black">
                <input type="checkbox" checked={goalForm.is_active} onChange={event => setGoalForm({ ...goalForm, is_active: event.target.checked })} />
                Active on student cinema page
              </label>
              <button onClick={saveGoal} disabled={saving} className="rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white disabled:opacity-60">
                {saving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Save className="mr-2 inline h-4 w-4" />}
                Save Goal
              </button>
            </div>
          ) : (
            <button onClick={startCreate} className="grid min-h-[260px] w-full place-items-center rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] text-center text-slate-500 hover:border-[#294b77] hover:text-[#294b77]">
              <span>
                <Plus className="mx-auto h-8 w-8" />
                <span className="mt-2 block text-[14px] font-black">Create or edit a cinema goal</span>
              </span>
            </button>
          )}
        </section>
      </main>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  BookOpenCheck,
  FileQuestion,
  Highlighter,
  Layers3,
  Menu,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  Unlink,
  X,
  Zap
} from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { api } from '../../services/api';

type TfngAnswer = 'TRUE' | 'FALSE' | 'NOT GIVEN';

interface TfngQuestion {
  id: string;
  passage_id: string;
  question_number: number;
  question_text: string;
  correct_answer: TfngAnswer;
  detailed_explanation: string;
}

interface TfngPassage {
  id: string;
  title: string;
  passage_html: string;
  is_published: boolean;
  questions?: TfngQuestion[];
}

interface TfngLevel {
  id: string;
  evolution_number: number;
  name: string;
  timer_seconds: number;
  passages?: Array<{
    id: string;
    set_no?: number;
    order_no: number;
    passage?: Pick<TfngPassage, 'id' | 'title' | 'is_published'>;
  }>;
}

const inputClass = 'rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#061A36] outline-none transition focus:border-[#294b77] focus:ring-4 focus:ring-[#294b77]/10';
const labelClass = 'text-[12px] font-black uppercase tracking-[0.1em] text-slate-500';

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatFeedbackHtml = (value: string) => escapeHtml(value || '')
  .replace(/&lt;(\/?(strong|b|mark|em))&gt;/gi, '<$1>')
  .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
  .replace(/\n/g, '<br/>');

const initialLevelForm = {
  level_no: '1',
  level_name: '',
  timer_seconds: '180'
};

const initialPassageForm = {
  title: '',
  passage_html: ''
};

const initialQuestionForm = {
  passage_id: '',
  question_number: '1',
  question_text: '',
  correct_answer: 'TRUE' as TfngAnswer,
  feedback: ''
};

export default function AdminReadingMasteryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [levels, setLevels] = useState<TfngLevel[]>([]);
  const [passages, setPassages] = useState<TfngPassage[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedSetNo, setSelectedSetNo] = useState('1');
  const [selectedPassageIds, setSelectedPassageIds] = useState<string[]>([]);
  const [levelForm, setLevelForm] = useState(initialLevelForm);
  const [passageForm, setPassageForm] = useState(initialPassageForm);
  const [questionForm, setQuestionForm] = useState(initialQuestionForm);
  const [editingLevelId, setEditingLevelId] = useState('');
  const [editingPassageId, setEditingPassageId] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState('');
  const feedbackTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedLevel = useMemo(
    () => levels.find(level => level.id === selectedLevelId) || null,
    [levels, selectedLevelId]
  );

  const levelPassages = useMemo(() => {
    if (!selectedLevel) return [];
    const setNo = toNumber(selectedSetNo, 1);
    const ids = (selectedLevel.passages || [])
      .filter(item => (item.set_no || 1) === setNo)
      .slice()
      .sort((a, b) => a.order_no - b.order_no)
      .map(item => item.passage?.id)
      .filter(Boolean) as string[];
    const passageMap = new Map(passages.map(passage => [passage.id, passage]));
    return ids
      .map(id => passageMap.get(id))
      .filter(Boolean) as TfngPassage[];
  }, [passages, selectedLevel, selectedSetNo]);

  const availableSets = useMemo(() => {
    const setNumbers = new Set<number>(Array.from({ length: 10 }, (_, index) => index + 1));
    for (const level of levels) {
      for (const link of level.passages || []) {
        setNumbers.add(link.set_no || 1);
      }
    }
    return Array.from(setNumbers).sort((a, b) => a - b);
  }, [levels]);

  const totalQuestions = useMemo(
    () => passages.reduce((sum, passage) => sum + (passage.questions?.length || 0), 0),
    [passages]
  );

  const editingPassage = useMemo(
    () => passages.find(passage => passage.id === editingPassageId) || null,
    [editingPassageId, passages]
  );

  const questionPassageOptions = levelPassages.length > 0 ? levelPassages : passages;

  const loadMasteryAdmin = async () => {
    setLoading(true);
    try {
      const [{ data: levelData }, { data: passageData }] = await Promise.all([
        api.get('/mastery/tfng/admin'),
        api.get('/mastery/tfng/admin/passages')
      ]);
      const nextLevels = Array.isArray(levelData) ? levelData : [];
      const nextPassages = Array.isArray(passageData) ? passageData : [];

      setLevels(nextLevels);
      setPassages(nextPassages);

      const activeLevel = nextLevels.find((level: TfngLevel) => level.id === selectedLevelId) || nextLevels[0] || null;
      if (activeLevel) {
        const setNo = toNumber(selectedSetNo, 1);
        const ids = (activeLevel.passages || [])
          .filter((item: any) => (item.set_no || 1) === setNo)
          .slice()
          .sort((a: any, b: any) => a.order_no - b.order_no)
          .map((item: any) => item.passage?.id || item.passage_id)
          .filter(Boolean);
        setSelectedLevelId(activeLevel.id);
        setSelectedPassageIds(ids);
        if (!questionForm.passage_id && ids[0]) {
          setQuestionForm(prev => ({ ...prev, passage_id: ids[0] }));
        }
      }
    } catch (err: any) {
      setNotice(err.message || 'Reading Mastery admin data load हुन सकेन.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasteryAdmin();
  }, []);

  useEffect(() => {
    if (!selectedLevel) return;
    const setNo = toNumber(selectedSetNo, 1);
    const ids = (selectedLevel.passages || [])
      .filter(item => (item.set_no || 1) === setNo)
      .slice()
      .sort((a, b) => a.order_no - b.order_no)
      .map(item => item.passage?.id)
      .filter(Boolean) as string[];
    setSelectedPassageIds(ids);
    if (ids[0]) {
      setQuestionForm(prev => ({ ...prev, passage_id: ids.includes(prev.passage_id) ? prev.passage_id : ids[0] }));
    }
  }, [selectedLevel, selectedSetNo]);

  const resetLevelForm = () => {
    setEditingLevelId('');
    setLevelForm(initialLevelForm);
  };

  const resetPassageForm = () => {
    setEditingPassageId('');
    setPassageForm(initialPassageForm);
  };

  const resetQuestionForm = () => {
    setEditingQuestionId('');
    setQuestionForm(prev => ({
      ...initialQuestionForm,
      passage_id: prev.passage_id
    }));
  };

  const handleCreateLevel = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving('level');
    try {
      const levelNo = toNumber(levelForm.level_no, 1);
      const payload = {
        evolution_number: levelNo,
        name: levelForm.level_name,
        timer_seconds: toNumber(levelForm.timer_seconds, 180),
        order_no: levelNo,
        is_published: true
      };

      if (editingLevelId) {
        await api.put(`/mastery/tfng/admin/evolutions/${editingLevelId}`, payload);
        setEditingLevelId('');
        setNotice(`Level ${levelNo} updated.`);
      } else {
        const { data } = await api.post('/mastery/tfng/admin/evolutions', {
          ...payload,
          description: '',
          hooty_wisdom: '',
          current_hooty_artwork: '',
          next_hooty_artwork: '',
          unlock_animation_key: '',
          xp_per_passage: 20,
          xp_completion_bonus: 120,
          first_attempt_required_accuracy: 60,
          second_attempt_required_accuracy: 60,
          instructor_support_url: '/teacher'
        });
        setLevelForm({ level_no: String(levelNo + 1), level_name: '', timer_seconds: levelForm.timer_seconds });
        setSelectedLevelId(data.id);
        setSelectedPassageIds([]);
        setNotice(`Level ${levelNo} saved. अब यही level भित्र passages थप्नुहोस्.`);
      }
      await loadMasteryAdmin();
    } catch (err: any) {
      setNotice(err.message || 'Level save हुन सकेन.');
    } finally {
      setSaving('');
    }
  };

  const handleCreatePassage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLevelId && !editingPassageId) {
      setNotice('पहिला कुन level मा passage हाल्ने हो select गर्नुहोस्.');
      return;
    }

    setSaving('passage');
    try {
      const payload = {
        title: passageForm.title,
        passage_html: passageForm.passage_html,
        source_label: null,
        difficulty: null,
        estimated_minutes: null,
        is_published: true
      };

      if (editingPassageId) {
        await api.put(`/mastery/tfng/admin/passages/${editingPassageId}`, payload);
        setPassageForm(initialPassageForm);
        setEditingPassageId('');
        setNotice('Passage updated.');
        await loadMasteryAdmin();
        return;
      }

      const { data } = await api.post('/mastery/tfng/admin/passages', payload);

      const nextPassageIds = [...selectedPassageIds, data.id];
      await api.put(`/mastery/tfng/admin/evolutions/${selectedLevelId}/passages`, {
        set_no: toNumber(selectedSetNo, 1),
        passages: nextPassageIds.map((passageId, index) => ({ passage_id: passageId, order_no: index + 1 }))
      });

      setSelectedPassageIds(nextPassageIds);
      setPassageForm(initialPassageForm);
      setQuestionForm({
        ...initialQuestionForm,
        passage_id: data.id
      });
      setNotice(`Passage saved in Set ${selectedSetNo}. अब यही passage को questions, answers र feedback हाल्नुहोस्.`);
      await loadMasteryAdmin();
    } catch (err: any) {
      setNotice(err.message || 'Passage save हुन सकेन.');
    } finally {
      setSaving('');
    }
  };

  const handleCreateQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!questionForm.passage_id) {
      setNotice('Question save गर्न passage select गर्नुपर्छ.');
      return;
    }
    if (!questionForm.question_text.trim() || !questionForm.feedback.trim()) {
      setNotice('Question, answer र feedback भएपछि मात्र save हुन्छ.');
      return;
    }

    setSaving('question');
    try {
      const questionNumber = toNumber(questionForm.question_number, 1);
      const payload = {
        question_number: questionNumber,
        question_text: questionForm.question_text,
        correct_answer: questionForm.correct_answer,
        detailed_explanation: questionForm.feedback,
        trap_type: null,
        locate_paragraph: null,
        locate_sentence: null,
        keywords: [],
        highlight_phrases: [],
        order_no: questionNumber,
        marks: 1
      };

      if (editingQuestionId) {
        await api.put(`/mastery/tfng/admin/questions/${editingQuestionId}`, payload);
        setEditingQuestionId('');
        setNotice('Question, answer and feedback updated.');
      } else {
        await api.post(`/mastery/tfng/admin/passages/${questionForm.passage_id}/questions`, payload);
        setNotice('Question, answer and feedback saved. अर्को question हाल्नुस्, वा next passage थप्नुस्.');
      }

      setQuestionForm(prev => ({
        ...initialQuestionForm,
        passage_id: prev.passage_id,
        question_number: String(questionNumber + 1)
      }));
      await loadMasteryAdmin();
    } catch (err: any) {
      setNotice(err.message || 'Question save हुन सकेन.');
    } finally {
      setSaving('');
    }
  };

  const handleEditLevel = (level: TfngLevel) => {
    setEditingLevelId(level.id);
    setSelectedLevelId(level.id);
    setLevelForm({
      level_no: String(level.evolution_number),
      level_name: level.name,
      timer_seconds: String(level.timer_seconds || 180)
    });
    setNotice('Level edit mode खुल्यो. Changes गरेर Update Level थिच्नुहोस्.');
  };

  const handleDeleteLevel = async (level: TfngLevel) => {
    if (!window.confirm(`Delete Level ${level.evolution_number}: ${level.name}? This removes its set links and student attempts.`)) return;
    setSaving(`level-delete-${level.id}`);
    try {
      await api.delete(`/mastery/tfng/admin/evolutions/${level.id}`);
      setSelectedLevelId('');
      setSelectedPassageIds([]);
      if (editingLevelId === level.id) resetLevelForm();
      setNotice('Level deleted.');
      await loadMasteryAdmin();
    } catch (err: any) {
      setNotice(err.message || 'Level delete हुन सकेन.');
    } finally {
      setSaving('');
    }
  };

  const handleDeleteSet = async () => {
    if (!selectedLevelId) return;
    if (!window.confirm(`Delete Set ${selectedSetNo} from this level? Passages stay saved, only this flow is removed.`)) return;
    setSaving(`set-delete-${selectedLevelId}-${selectedSetNo}`);
    try {
      await api.delete(`/mastery/tfng/admin/evolutions/${selectedLevelId}/sets/${selectedSetNo}`);
      setSelectedPassageIds([]);
      setNotice(`Set ${selectedSetNo} removed from selected level.`);
      await loadMasteryAdmin();
    } catch (err: any) {
      setNotice(err.message || 'Set delete हुन सकेन.');
    } finally {
      setSaving('');
    }
  };

  const handleEditPassage = (passage: TfngPassage) => {
    setEditingPassageId(passage.id);
    setPassageForm({
      title: passage.title,
      passage_html: passage.passage_html
    });
    setQuestionForm(prev => ({ ...prev, passage_id: passage.id }));
    setNotice('Passage edit mode खुल्यो. Update Passage थिचेपछि content save हुन्छ.');
  };

  const handleRemovePassageFromSet = async (passage: TfngPassage) => {
    if (!selectedLevelId) return;
    if (!window.confirm(`Remove "${passage.title}" from Set ${selectedSetNo}? Passage and questions will remain saved.`)) return;
    setSaving(`flow-remove-${passage.id}`);
    try {
      await api.delete(`/mastery/tfng/admin/evolutions/${selectedLevelId}/sets/${selectedSetNo}/passages/${passage.id}`);
      setNotice('Passage removed from this set.');
      await loadMasteryAdmin();
    } catch (err: any) {
      setNotice(err.message || 'Passage set बाट remove हुन सकेन.');
    } finally {
      setSaving('');
    }
  };

  const handleDeletePassage = async (passage: TfngPassage) => {
    if (!window.confirm(`Permanently delete "${passage.title}" and all its questions/feedback?`)) return;
    setSaving(`passage-delete-${passage.id}`);
    try {
      await api.delete(`/mastery/tfng/admin/passages/${passage.id}`);
      if (editingPassageId === passage.id) resetPassageForm();
      if (questionForm.passage_id === passage.id) setQuestionForm(initialQuestionForm);
      setNotice('Passage and its questions deleted.');
      await loadMasteryAdmin();
    } catch (err: any) {
      setNotice(err.message || 'Passage delete हुन सकेन.');
    } finally {
      setSaving('');
    }
  };

  const handleEditQuestion = (question: TfngQuestion) => {
    setEditingQuestionId(question.id);
    setQuestionForm({
      passage_id: question.passage_id,
      question_number: String(question.question_number),
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      feedback: question.detailed_explanation
    });
    setNotice('Question edit mode खुल्यो. Answer/feedback मिलाएर Update Question थिच्नुहोस्.');
  };

  const handleDeleteQuestion = async (question: TfngQuestion) => {
    if (!window.confirm(`Delete Q${question.question_number} and its feedback?`)) return;
    setSaving(`question-delete-${question.id}`);
    try {
      await api.delete(`/mastery/tfng/admin/questions/${question.id}`);
      if (editingQuestionId === question.id) resetQuestionForm();
      setNotice('Question deleted.');
      await loadMasteryAdmin();
    } catch (err: any) {
      setNotice(err.message || 'Question delete हुन सकेन.');
    } finally {
      setSaving('');
    }
  };

  const applyFeedbackMarkup = (tag: 'strong' | 'mark') => {
    const textarea = feedbackTextareaRef.current;
    const currentFeedback = questionForm.feedback;
    const start = textarea?.selectionStart ?? currentFeedback.length;
    const end = textarea?.selectionEnd ?? currentFeedback.length;
    const selected = currentFeedback.slice(start, end);
    const fallbackText = tag === 'strong' ? 'bold text' : 'highlighted text';
    const wrapped = `<${tag}>${selected || fallbackText}</${tag}>`;
    const nextFeedback = `${currentFeedback.slice(0, start)}${wrapped}${currentFeedback.slice(end)}`;

    setQuestionForm(prev => ({ ...prev, feedback: nextFeedback }));
    window.requestAnimationFrame(() => {
      textarea?.focus();
      const cursorStart = start + tag.length + 2;
      const cursorEnd = cursorStart + (selected || fallbackText).length;
      textarea?.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="flex min-h-screen">
        <AdminSidebar activeTab="reading-mastery" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6 lg:min-h-[86px] lg:px-10">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <button type="button" onClick={() => setIsSidebarOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open admin navigation">
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-[20px] font-black tracking-tight text-[#061A36] sm:text-[24px]">Reading Mastery</h1>
                <p className="text-[13px] font-semibold text-slate-500">Simple setup: level, passages, questions, answers and feedback.</p>
              </div>
            </div>
            <button type="button" onClick={loadMasteryAdmin} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-black text-[#294b77] shadow-sm hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <section className="mb-6 grid gap-4 md:grid-cols-3">
              {[
                { label: 'Levels', value: levels.length, icon: Zap, tone: 'bg-orange-50 text-orange-500' },
                { label: 'Passages', value: passages.length, icon: BookOpenCheck, tone: 'bg-blue-50 text-blue-600' },
                { label: 'Questions', value: totalQuestions, icon: FileQuestion, tone: 'bg-emerald-50 text-emerald-600' }
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`grid h-14 w-14 place-items-center rounded-2xl ${item.tone}`}>
                      <item.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-slate-500">{item.label}</p>
                      <p className="text-[32px] font-black leading-none text-[#061A36]">{loading ? '-' : item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {notice && (
              <div className="mb-6 rounded-2xl border border-[#ef5f55]/20 bg-[#ef5f55]/10 px-5 py-4 text-[14px] font-bold text-[#8F2F2A]">
                {notice}
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-500"><Zap className="h-5 w-5" /></div>
                    <div>
                      <h2 className="text-[18px] font-black text-[#061A36]">{editingLevelId ? '1. Edit Level' : '1. Create Level'}</h2>
                      <p className="text-[13px] font-semibold text-slate-500">Only level number, level name and same timer for every passage inside this level.</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateLevel} className="grid gap-4 md:grid-cols-3">
                    <label className="grid gap-2">
                      <span className={labelClass}>Level No.</span>
                      <input required type="number" min="1" max="21" value={levelForm.level_no} onChange={event => setLevelForm({ ...levelForm, level_no: event.target.value })} className={inputClass} />
                    </label>
                    <label className="grid gap-2">
                      <span className={labelClass}>Level Name</span>
                      <input required value={levelForm.level_name} onChange={event => setLevelForm({ ...levelForm, level_name: event.target.value })} placeholder="Level-1" className={inputClass} />
                    </label>
                    <label className="grid gap-2">
                      <span className={labelClass}>Timer Seconds</span>
                      <input required type="number" min="30" value={levelForm.timer_seconds} onChange={event => setLevelForm({ ...levelForm, timer_seconds: event.target.value })} className={inputClass} />
                    </label>
                    <div className="flex flex-wrap justify-end gap-3 md:col-span-3">
                      {editingLevelId && (
                        <button type="button" onClick={resetLevelForm} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-black text-slate-600 hover:bg-slate-50">
                          <X className="h-4 w-4" /> Cancel
                        </button>
                      )}
                      <button disabled={saving === 'level'} className="inline-flex items-center gap-2 rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white shadow-lg shadow-[#294b77]/20 hover:bg-[#1f3d64] disabled:opacity-60">
                        <Save className="h-4 w-4" /> {editingLevelId ? 'Update Level' : 'Save Level'}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><BookOpenCheck className="h-5 w-5" /></div>
                    <div>
                      <h2 className="text-[18px] font-black text-[#061A36]">{editingPassageId ? '2. Edit Passage' : '2. Add Passage Inside Level'}</h2>
                      <p className="text-[13px] font-semibold text-slate-500">{editingPassageId ? `Editing: ${editingPassage?.title || 'selected passage'}` : 'Same level भित्र Passage 1, Passage 2, Passage 3... जति पनि add गर्न मिल्छ.'}</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreatePassage} className="grid gap-4">
	                    <label className="grid gap-2">
	                      <span className={labelClass}>Level</span>
	                      <select required value={selectedLevelId} onChange={event => setSelectedLevelId(event.target.value)} className={inputClass}>
	                        <option value="">Select level</option>
	                        {levels.map(level => <option key={level.id} value={level.id}>Level {level.evolution_number}: {level.name}</option>)}
	                      </select>
	                    </label>
                    <label className="grid gap-2">
                      <span className={labelClass}>Practice Set</span>
                      <select value={selectedSetNo} onChange={event => setSelectedSetNo(event.target.value)} className={inputClass}>
                        {availableSets.map(setNo => <option key={setNo} value={setNo}>Set {setNo}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className={labelClass}>Passage Title</span>
                      <input required value={passageForm.title} onChange={event => setPassageForm({ ...passageForm, title: event.target.value })} placeholder={`Set ${selectedSetNo} - Passage ${levelPassages.length + 1}`} className={inputClass} />
                    </label>
                    <label className="grid gap-2">
                      <span className={labelClass}>Passage Content</span>
                      <textarea required value={passageForm.passage_html} onChange={event => setPassageForm({ ...passageForm, passage_html: event.target.value })} className={`${inputClass} min-h-[240px] font-medium leading-7`} />
                    </label>
                    <div className="flex flex-wrap justify-end gap-3">
                      {editingPassageId && (
                        <button type="button" onClick={resetPassageForm} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-black text-slate-600 hover:bg-slate-50">
                          <X className="h-4 w-4" /> Cancel
                        </button>
                      )}
                      <button disabled={saving === 'passage'} className="inline-flex items-center gap-2 rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white shadow-lg shadow-[#294b77]/20 hover:bg-[#1f3d64] disabled:opacity-60">
                        <Save className="h-4 w-4" /> {editingPassageId ? 'Update Passage' : 'Save Passage'}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><FileQuestion className="h-5 w-5" /></div>
                    <div>
                      <h2 className="text-[18px] font-black text-[#061A36]">{editingQuestionId ? '3. Edit Question, Answer And Feedback' : '3. Add Question, Answer And Feedback'}</h2>
                      <p className="text-[13px] font-semibold text-slate-500">Each question save हुन answer र feedback compulsory छ.</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateQuestion} className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 md:col-span-2">
                      <span className={labelClass}>Passage</span>
                      <select required value={questionForm.passage_id} onChange={event => setQuestionForm({ ...questionForm, passage_id: event.target.value })} className={inputClass}>
                        <option value="">Select passage</option>
                        {questionPassageOptions.map(passage => <option key={passage.id} value={passage.id}>{passage.title}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className={labelClass}>Question No.</span>
                      <input required type="number" min="1" value={questionForm.question_number} onChange={event => setQuestionForm({ ...questionForm, question_number: event.target.value })} className={inputClass} />
                    </label>
                    <label className="grid gap-2">
                      <span className={labelClass}>Answer</span>
                      <select value={questionForm.correct_answer} onChange={event => setQuestionForm({ ...questionForm, correct_answer: event.target.value as TfngAnswer })} className={inputClass}>
                        <option>TRUE</option>
                        <option>FALSE</option>
                        <option>NOT GIVEN</option>
                      </select>
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <span className={labelClass}>Question</span>
                      <textarea required value={questionForm.question_text} onChange={event => setQuestionForm({ ...questionForm, question_text: event.target.value })} className={`${inputClass} min-h-[100px]`} />
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={labelClass}>Feedback</span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => applyFeedbackMarkup('strong')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-black text-[#294b77] hover:bg-[#294b77]/10">
                            <Bold className="h-4 w-4" /> Bold
                          </button>
                          <button type="button" onClick={() => applyFeedbackMarkup('mark')} className="inline-flex items-center gap-1 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-[12px] font-black text-yellow-700 hover:bg-yellow-100">
                            <Highlighter className="h-4 w-4" /> Highlight
                          </button>
                        </div>
                      </div>
                      <textarea ref={feedbackTextareaRef} required value={questionForm.feedback} onChange={event => setQuestionForm({ ...questionForm, feedback: event.target.value })} placeholder="Why this answer is TRUE/FALSE/NOT GIVEN..." className={`${inputClass} min-h-[130px]`} />
                      {questionForm.feedback.trim() && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">Student Preview</p>
                          <div
                            className="text-[13px] font-bold leading-6 text-slate-700 [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-1 [&_strong]:font-black"
                            dangerouslySetInnerHTML={{ __html: formatFeedbackHtml(questionForm.feedback) }}
                          />
                        </div>
                      )}
                    </label>
                    <div className="flex flex-wrap justify-end gap-3 md:col-span-2">
                      {editingQuestionId && (
                        <button type="button" onClick={resetQuestionForm} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-black text-slate-600 hover:bg-slate-50">
                          <X className="h-4 w-4" /> Cancel
                        </button>
                      )}
                      <button disabled={saving === 'question'} className="inline-flex items-center gap-2 rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white shadow-lg shadow-[#294b77]/20 hover:bg-[#1f3d64] disabled:opacity-60">
                        <Save className="h-4 w-4" /> {editingQuestionId ? 'Update Question' : 'Save Question'}
                      </button>
                    </div>
                  </form>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Layers3 className="h-5 w-5" /></div>
                    <div>
                      <h2 className="text-[18px] font-black text-[#061A36]">Current Level Flow</h2>
                      <p className="text-[13px] font-semibold text-slate-500">Passage order inside selected level and set.</p>
                    </div>
                  </div>

                  <label className="mb-4 grid gap-2">
                    <span className={labelClass}>Level</span>
	                    <select value={selectedLevelId} onChange={event => setSelectedLevelId(event.target.value)} className={inputClass}>
	                      <option value="">Select level</option>
	                      {levels.map(level => <option key={level.id} value={level.id}>Level {level.evolution_number}: {level.name}</option>)}
	                    </select>
	                  </label>
                  <label className="mb-4 grid gap-2">
                    <span className={labelClass}>Practice Set</span>
                    <select value={selectedSetNo} onChange={event => setSelectedSetNo(event.target.value)} className={inputClass}>
                      {availableSets.map(setNo => <option key={setNo} value={setNo}>Set {setNo}</option>)}
                    </select>
                  </label>

                  {selectedLevel && (
                    <div className="mb-4 rounded-2xl bg-[#294b77]/5 p-4">
                      <p className="text-[13px] font-black text-[#061A36]">Level {selectedLevel.evolution_number}: {selectedLevel.name}</p>
                      <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">Set {selectedSetNo} · {selectedLevel.timer_seconds} seconds per passage</p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => handleEditLevel(selectedLevel)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-black text-[#294b77] hover:bg-slate-50">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button type="button" onClick={handleDeleteSet} disabled={levelPassages.length === 0 || saving.startsWith('set-delete')} className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-[11px] font-black text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                          <Unlink className="h-3.5 w-3.5" /> Set
                        </button>
                        <button type="button" onClick={() => handleDeleteLevel(selectedLevel)} disabled={saving === `level-delete-${selectedLevel.id}`} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-[11px] font-black text-red-600 hover:bg-red-100 disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" /> Level
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {levelPassages.length === 0 && <p className="text-[14px] font-semibold text-slate-500">यो level को Set {selectedSetNo} मा अझै passage छैन.</p>}
                    {levelPassages.map((passage, index) => (
                      <div key={passage.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#294b77] text-[12px] font-black text-white">{index + 1}</div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-black text-[#061A36]">{passage.title}</p>
                            <p className="mt-1 text-[12px] font-bold text-slate-500">{passage.questions?.length || 0} questions saved</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <button type="button" onClick={() => handleEditPassage(passage)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-black text-[#294b77] hover:bg-slate-50">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button type="button" onClick={() => handleRemovePassageFromSet(passage)} disabled={saving === `flow-remove-${passage.id}`} className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-[11px] font-black text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                            <Unlink className="h-3.5 w-3.5" /> Remove
                          </button>
                          <button type="button" onClick={() => handleDeletePassage(passage)} disabled={saving === `passage-delete-${passage.id}`} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-[11px] font-black text-red-600 hover:bg-red-100 disabled:opacity-50">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                        {(passage.questions || []).length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                            {(passage.questions || []).slice(0, 4).map(question => (
                              <div key={question.id} className="rounded-xl bg-slate-50 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-[12px] font-bold text-slate-600">Q{question.question_number}. {question.question_text}</p>
                                <p className="mt-1 text-[11px] font-black text-[#294b77]">{question.correct_answer}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <button type="button" onClick={() => handleEditQuestion(question)} className="grid h-7 w-7 place-items-center rounded-lg text-[#294b77] hover:bg-[#294b77]/10" aria-label={`Edit question ${question.question_number}`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => handleDeleteQuestion(question)} disabled={saving === `question-delete-${question.id}`} className="grid h-7 w-7 place-items-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label={`Delete question ${question.question_number}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                            ))}
                          </div>
                        )}
                        {(passage.questions || []).length > 4 && (
                          <p className="mt-2 text-[11px] font-black text-slate-400">{(passage.questions || []).length - 4} more questions saved</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

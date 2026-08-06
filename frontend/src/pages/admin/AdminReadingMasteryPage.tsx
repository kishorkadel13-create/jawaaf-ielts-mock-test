import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  FileQuestion,
  Layers3,
  Menu,
  RefreshCw,
  Save,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState('');

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

  const handleCreateLevel = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving('level');
    try {
      const levelNo = toNumber(levelForm.level_no, 1);
      const { data } = await api.post('/mastery/tfng/admin/evolutions', {
        evolution_number: levelNo,
        name: levelForm.level_name,
        timer_seconds: toNumber(levelForm.timer_seconds, 180),
        order_no: levelNo,
        is_published: true,
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
      await loadMasteryAdmin();
    } catch (err: any) {
      setNotice(err.message || 'Level save हुन सकेन.');
    } finally {
      setSaving('');
    }
  };

  const handleCreatePassage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLevelId) {
      setNotice('पहिला कुन level मा passage हाल्ने हो select गर्नुहोस्.');
      return;
    }

    setSaving('passage');
    try {
      const { data } = await api.post('/mastery/tfng/admin/passages', {
        title: passageForm.title,
        passage_html: passageForm.passage_html,
        source_label: null,
        difficulty: null,
        estimated_minutes: null,
        is_published: true
      });

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
      await api.post(`/mastery/tfng/admin/passages/${questionForm.passage_id}/questions`, {
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
      });

      setQuestionForm(prev => ({
        ...initialQuestionForm,
        passage_id: prev.passage_id,
        question_number: String(questionNumber + 1)
      }));
      setNotice('Question, answer and feedback saved. अर्को question हाल्नुस्, वा next passage थप्नुस्.');
      await loadMasteryAdmin();
    } catch (err: any) {
      setNotice(err.message || 'Question save हुन सकेन.');
    } finally {
      setSaving('');
    }
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
                      <h2 className="text-[18px] font-black text-[#061A36]">1. Create Level</h2>
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
                    <div className="flex justify-end md:col-span-3">
                      <button disabled={saving === 'level'} className="inline-flex items-center gap-2 rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white shadow-lg shadow-[#294b77]/20 hover:bg-[#1f3d64] disabled:opacity-60">
                        <Save className="h-4 w-4" /> Save Level
                      </button>
                    </div>
                  </form>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><BookOpenCheck className="h-5 w-5" /></div>
                    <div>
                      <h2 className="text-[18px] font-black text-[#061A36]">2. Add Passage Inside Level</h2>
                      <p className="text-[13px] font-semibold text-slate-500">Same level भित्र Passage 1, Passage 2, Passage 3... जति पनि add गर्न मिल्छ.</p>
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
                    <div className="flex justify-end">
                      <button disabled={saving === 'passage'} className="inline-flex items-center gap-2 rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white shadow-lg shadow-[#294b77]/20 hover:bg-[#1f3d64] disabled:opacity-60">
                        <Save className="h-4 w-4" /> Save Passage
                      </button>
                    </div>
                  </form>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><FileQuestion className="h-5 w-5" /></div>
                    <div>
                      <h2 className="text-[18px] font-black text-[#061A36]">3. Add Question, Answer And Feedback</h2>
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
                      <span className={labelClass}>Feedback</span>
                      <textarea required value={questionForm.feedback} onChange={event => setQuestionForm({ ...questionForm, feedback: event.target.value })} placeholder="Why this answer is TRUE/FALSE/NOT GIVEN..." className={`${inputClass} min-h-[130px]`} />
                    </label>
                    <div className="flex justify-end md:col-span-2">
                      <button disabled={saving === 'question'} className="inline-flex items-center gap-2 rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white shadow-lg shadow-[#294b77]/20 hover:bg-[#1f3d64] disabled:opacity-60">
                        <Save className="h-4 w-4" /> Save Question
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
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="mb-4 text-[18px] font-black text-[#061A36]">All Content</h2>
                  <div className="space-y-4">
                    {passages.length === 0 && <p className="text-[14px] font-semibold text-slate-500">अहिले passage छैन.</p>}
                    {passages.slice(0, 8).map(passage => (
                      <div key={passage.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[15px] font-black text-[#061A36]">{passage.title}</p>
                            <p className="text-[12px] font-bold text-slate-500">{passage.questions?.length || 0} TFNG questions</p>
                          </div>
                          {passage.is_published && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                        </div>
                        {(passage.questions || []).slice(0, 3).map(question => (
                          <div key={question.id} className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                            <p className="line-clamp-2 text-[12px] font-bold text-slate-600">Q{question.question_number}. {question.question_text}</p>
                            <p className="mt-1 text-[11px] font-black text-[#294b77]">{question.correct_answer}</p>
                          </div>
                        ))}
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

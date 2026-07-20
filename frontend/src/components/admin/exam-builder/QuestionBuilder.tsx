import React from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Info } from 'lucide-react';

export interface QuestionData {
  id?: string;
  question_type: string;
  question_number: number;
  question_text: string;
  instruction?: string;
  options_json?: string[];
  correct_answers_json: string[];
  extra_data_json?: Record<string, any>;
  marks: number;
  order_no: number;
}

// All 13 IELTS Reading question types
const QUESTION_TYPES = [
  { value: 'FILL_IN_THE_BLANK', label: '1. Fill in the Blanks', category: 'blank' },
  { value: 'SUMMARY_COMPLETION', label: '2. Summary Completion', category: 'blank' },
  { value: 'SHORT_ANSWER', label: '3. Short Answer', category: 'blank' },
  { value: 'DIAGRAM_LABELLING', label: '4. Diagram Labelling', category: 'blank' },
  { value: 'SUMMARY_COMPLETION_OPTIONS', label: '5. Summary with Options', category: 'mcq' },
  { value: 'TABLE_COMPLETION', label: 'Table Completion', category: 'blank' },
  { value: 'TRUE_FALSE_NOT_GIVEN', label: '6. True / False / Not Given', category: 'mcq' },
  { value: 'YES_NO_NOT_GIVEN', label: '7. Yes / No / Not Given', category: 'mcq' },
  { value: 'SINGLE_MCQ', label: '8. Multiple Choice (Single)', category: 'mcq' },
  { value: 'SENTENCE_COMPLETION', label: '9. Sentence Completion', category: 'mcq' },
  { value: 'MATCHING', label: '10. Matching', category: 'mcq' },
  { value: 'MATCHING_INFORMATION', label: '11. Matching Information', category: 'mcq' },
  { value: 'MATCHING_HEADINGS', label: '12. Matching Headings', category: 'mcq' },
  { value: 'MULTI_SELECT', label: '13. Choose Two / Multi-Select', category: 'mcq' },
];

// Determine whether a question type uses blanks
const isBlankType = (type: string) => ['FILL_IN_THE_BLANK', 'SUMMARY_COMPLETION', 'TABLE_COMPLETION', 'SHORT_ANSWER', 'DIAGRAM_LABELLING'].includes(type);
// Determine whether a question type uses options
const isOptionsType = (type: string) => ['SINGLE_MCQ', 'MULTI_SELECT', 'SENTENCE_COMPLETION', 'SUMMARY_COMPLETION_OPTIONS', 'MATCHING', 'MATCHING_INFORMATION', 'MATCHING_HEADINGS'].includes(type);

interface QuestionBuilderProps {
  question: QuestionData;
  onChange: (updated: QuestionData) => void;
  onSave: () => void;
  onCancel: () => void;
  submitting?: boolean;
}

export default function QuestionBuilder({ question, onChange, onSave, onCancel, submitting }: QuestionBuilderProps) {
  
  const updateField = (field: keyof QuestionData, value: any) => {
    onChange({ ...question, [field]: value });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(question.options_json || [])];
    newOptions[index] = value;
    updateField('options_json', newOptions);
  };

  const addOption = () => {
    updateField('options_json', [...(question.options_json || []), '']);
  };

  const removeOption = (index: number) => {
    const newOptions = [...(question.options_json || [])];
    newOptions.splice(index, 1);
    updateField('options_json', newOptions);
  };

  const toggleCorrectAnswer = (value: string, multi: boolean = false) => {
    let current = [...question.correct_answers_json];
    if (multi) {
      if (current.includes(value)) current = current.filter(c => c !== value);
      else current.push(value);
    } else {
      current = [value];
    }
    updateField('correct_answers_json', current);
  };

  // --- TYPE-SPECIFIC UI BUILDERS ---

  const renderBlankAnswerBuilder = () => {
    const helpText: Record<string, string> = {
      'FILL_IN_THE_BLANK': 'Use [blank] in the question text above where you want the student input box to appear.',
      'SUMMARY_COMPLETION': 'Write the summary paragraph above with [blank] for each gap. Students will type their answers.',
      'TABLE_COMPLETION': 'Use [blank] in table cells, or use the bulk builder with | between table columns for better layout.',
      'SHORT_ANSWER': 'Write the question above. Students will type a short answer.',
      'DIAGRAM_LABELLING': 'Write the diagram labels above using [blank] for each space. If you have a diagram image, upload it via the group settings.',
    };

    return (
      <div className="flex flex-col gap-4">
        {/* Hint Banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <Info className="h-4 w-4 text-[#1E3A6E] shrink-0 mt-0.5" />
          <p className="text-[12px] text-blue-800 leading-relaxed font-medium">
            {helpText[question.question_type] || 'Enter the accepted answers below.'}
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Accepted Answers (comma separated)</span>
          <input 
            type="text" 
            placeholder="e.g. agriculture, farming"
            value={question.correct_answers_json.join(', ')}
            onChange={(e) => updateField('correct_answers_json', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10 text-[14px] outline-none transition-all"
          />
          <span className="text-[11px] text-slate-400">The system accepts any of these variations as correct. Case-insensitive.</span>
        </div>
      </div>
    );
  };

  const renderTFNGBuilder = () => {
    const isTF = question.question_type === 'TRUE_FALSE_NOT_GIVEN';
    const opts = isTF ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN'];
    return (
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select the Correct Answer</span>
        <div className="flex gap-3">
          {opts.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleCorrectAnswer(opt)}
              className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-[13px] border-2 transition-all flex items-center justify-center gap-2 ${
                question.correct_answers_json.includes(opt)
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              {question.correct_answers_json.includes(opt) ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderOptionsBuilder = (multi: boolean) => {
    const typeLabels: Record<string, string> = {
      'SINGLE_MCQ': 'Add MCQ options. Click the circle to mark the correct answer.',
      'MULTI_SELECT': 'Add options. Click circles to mark ALL correct answers.',
      'SENTENCE_COMPLETION': 'Add sentence completion tails. Click the circle to mark correct.',
      'SUMMARY_COMPLETION_OPTIONS': 'Add the word bank options. Mark all correct ones.',
      'MATCHING': 'Add the items to match. Mark the correct pairing.',
      'MATCHING_INFORMATION': 'Add paragraph labels (A, B, C, D...). Mark the correct paragraph.',
      'MATCHING_HEADINGS': 'Add headings using Roman numerals (i, ii, iii...). Mark the correct heading.',
    };

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Options</span>
            <span className="text-[10px] text-slate-400">{typeLabels[question.question_type] || ''}</span>
          </div>
          <button 
            type="button" onClick={addOption}
            className="text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Plus className="h-3 w-3" /> Add Option
          </button>
        </div>
        
        <div className="grid gap-3">
          {(question.options_json || []).map((opt, idx) => {
            const prefix = question.question_type === 'MATCHING_HEADINGS' 
              ? toRoman(idx + 1)
              : String.fromCharCode(65 + idx);
            const answerValue = question.question_type === 'MATCHING_HEADINGS' ? prefix : opt;
            const isCorrect = question.correct_answers_json.includes(answerValue) && opt.trim() !== '';
            return (
              <div key={idx} className={`flex items-center gap-3 p-2 pr-3 rounded-xl border-2 transition-all ${
                isCorrect ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white focus-within:border-[#1E3A6E]/30'
              }`}>
                <button 
                  type="button" 
                  onClick={() => opt.trim() !== '' && toggleCorrectAnswer(answerValue, multi)}
                  className={`p-2 rounded-lg transition-colors ${
                    isCorrect ? 'text-emerald-500 bg-emerald-100' : 'text-slate-400 hover:bg-slate-100'
                  }`}
                  title="Mark as correct answer"
                >
                  {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </button>
                
                <span className="text-[12px] font-black text-slate-400 w-6 shrink-0">{prefix}.</span>
                
                <input 
                  type="text" 
                  value={opt} 
                  onChange={(e) => {
                    const oldVal = opt;
                    updateOption(idx, e.target.value);
                    // Update correct answer reference if it was correct
                    if (question.question_type !== 'MATCHING_HEADINGS' && question.correct_answers_json.includes(oldVal)) {
                      const updated = question.correct_answers_json.map(a => a === oldVal ? e.target.value : a);
                      updateField('correct_answers_json', updated);
                    }
                  }}
                  placeholder={`Option ${prefix}`}
                  className="flex-1 bg-transparent text-[14px] text-[#05162E] font-medium outline-none"
                />
                
                <button 
                  type="button" onClick={() => removeOption(idx)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTypeSpecificBuilder = () => {
    switch (question.question_type) {
      // Blank Filling Types (1-4)
      case 'FILL_IN_THE_BLANK':
      case 'SUMMARY_COMPLETION':
      case 'TABLE_COMPLETION':
      case 'SHORT_ANSWER':
      case 'DIAGRAM_LABELLING':
        return renderBlankAnswerBuilder();

      // T/F/NG & Y/N/NG (6-7)
      case 'TRUE_FALSE_NOT_GIVEN':
      case 'YES_NO_NOT_GIVEN':
        return renderTFNGBuilder();

      // Multi Select / Choose Two (13)
      case 'MULTI_SELECT':
      case 'SUMMARY_COMPLETION_OPTIONS':
        return renderOptionsBuilder(true);

      // Single Selection MCQ Types (8-12)
      case 'SINGLE_MCQ':
      case 'SENTENCE_COMPLETION':
      case 'MATCHING':
      case 'MATCHING_INFORMATION':
      case 'MATCHING_HEADINGS':
        return renderOptionsBuilder(false);

      default:
        return (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[13px] font-medium">
            Builder not available for this type yet.
          </div>
        );
    }
  };

  // Helper to get blank hint text
  const getBlankHint = () => {
    if (question.question_type === 'FILL_IN_THE_BLANK' || question.question_type === 'SUMMARY_COMPLETION' || question.question_type === 'TABLE_COMPLETION' || question.question_type === 'DIAGRAM_LABELLING') {
      return <span className="text-emerald-500">Use [blank] for gaps</span>;
    }
    return null;
  };

  return (
    <div className="bg-white border-2 border-[#1E3A6E]/20 rounded-2xl shadow-xl overflow-hidden mt-4">
      <div className="px-6 py-4 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-black text-[16px] text-[#05162E]">
          {question.id ? `Edit Question ${question.question_number}` : 'New Question'}
        </h3>
        <select 
          value={question.question_type} 
          onChange={(e) => updateField('question_type', e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-[#1E3A6E] outline-none cursor-pointer min-w-[220px]"
        >
          <optgroup label="── Blank Filling Types ──">
            {QUESTION_TYPES.filter(t => t.category === 'blank').map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </optgroup>
          <optgroup label="── Multiple Choice Types ──">
            {QUESTION_TYPES.filter(t => t.category === 'mcq').map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* Row 1: Q-Num, Marks, Order */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Q Number</label>
            <input 
              type="number" value={question.question_number} onChange={(e) => updateField('question_number', Number(e.target.value))}
              className="px-4 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[14px] font-bold text-[#05162E] outline-none focus:border-[#1E3A6E]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marks</label>
            <input 
              type="number" value={question.marks} onChange={(e) => updateField('marks', Number(e.target.value))}
              className="px-4 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[14px] font-bold text-[#05162E] outline-none focus:border-[#1E3A6E]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order No</label>
            <input 
              type="number" value={question.order_no} onChange={(e) => updateField('order_no', Number(e.target.value))}
              className="px-4 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[14px] font-bold text-[#05162E] outline-none focus:border-[#1E3A6E]"
            />
          </div>
        </div>

        {/* Row 2: Instruction */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sub-Instruction (Optional)</label>
          <input 
            type="text" placeholder="e.g. Choose NO MORE THAN TWO WORDS from the passage..."
            value={question.instruction || ''} onChange={(e) => updateField('instruction', e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1E3A6E] text-[13px] outline-none transition-all"
          />
        </div>

        {/* Row 3: Main Text */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
            <span>Question Text / Statement</span>
            {getBlankHint()}
          </label>
          <textarea 
            rows={3}
            placeholder="Type the question or statement here..."
            value={question.question_text} onChange={(e) => updateField('question_text', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10 text-[14px] font-medium text-[#05162E] outline-none resize-none transition-all"
          />
        </div>

        {/* Row 4: Dynamic Type Builder */}
        <div className="pt-4 border-t border-slate-100">
          {renderTypeSpecificBuilder()}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button 
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-bold rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onSave}
            disabled={submitting}
            className="px-6 py-2.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm shadow-[#1E3A6E]/20"
          >
            {submitting ? 'Saving...' : 'Save Question'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper: convert integer to Roman numeral
function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
  ];
  let result = '';
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

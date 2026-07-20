import React from 'react';
import { isMatchingHeadingsQuestion, toRoman } from '../utils/matchingHeadings';

interface QuestionRendererProps {
  question: any;
  value: any;
  onChange: (value: any) => void;
  mode?: 'dark' | 'light';
}

export const QuestionRenderer = ({ question, value, onChange, mode = 'dark' }: QuestionRendererProps) => {
  const { question_type, question_text, options_json } = question;
  const options = options_json || [];
  const isLight = mode === 'light';
  const bodyTextClass = isLight ? 'text-[#05162E]' : 'text-slate-200';
  const mutedTextClass = isLight ? 'text-slate-700' : 'text-slate-300';
  const inputClass = isLight
    ? 'bg-slate-50 border-slate-300 focus:border-[#1E3A6E] text-[#05162E]'
    : 'bg-slate-950 border-slate-700 focus:border-emerald-500 text-white';
  const inlineInputClass = isLight
    ? 'bg-slate-50 border-slate-300 focus:border-[#1E3A6E] text-[#05162E]'
    : 'bg-slate-950 border-slate-600 focus:border-emerald-500 text-white';
  const optionClass = (selected: boolean) => isLight
    ? selected
      ? 'bg-[#EFF4FB] border-[#1E3A6E] text-[#05162E]'
      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-[#F8FAFC]'
    : selected
      ? 'bg-emerald-600/10 border-emerald-500 text-white'
      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900';

  const renderInlineTextInputs = (placeholder = 'Answer') => {
    const parts = question_text.split('[blank]');

    if (parts.length < 2) {
      return (
        <div className="flex flex-col gap-3">
          <p className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed`}>{question_text}</p>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full border-2 px-4 py-3 rounded-xl outline-none transition-all ${inputClass}`}
          />
        </div>
      );
    }

    return (
      <div className={`text-[15px] ${mutedTextClass} leading-loose font-medium`}>
        {parts.map((part: string, idx: number) => (
          <React.Fragment key={idx}>
            {part}
            {idx < parts.length - 1 && (
              <input
                type="text"
                value={Array.isArray(value) ? (value[idx] || '') : (idx === 0 ? (value || '') : '')}
                onChange={(e) => {
                  if (parts.length > 2) {
                    const arr = Array.isArray(value) ? [...value] : [];
                    arr[idx] = e.target.value;
                    onChange(arr);
                  } else {
                    onChange(e.target.value);
                  }
                }}
                className={`inline-block w-36 mx-2 border-b-2 px-2 py-1 text-center outline-none transition-colors rounded-t-sm ${inlineInputClass}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderShortAnswer = () => (
    <div className={`text-[15px] ${bodyTextClass} font-medium leading-loose`}>
      <span>{question_text}</span>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Answer for question ${question.question_number}`}
        className={`inline-block w-48 max-w-full ml-3 border-0 border-b-2 px-2 py-1 text-center outline-none transition-colors rounded-none ${inlineInputClass}`}
      />
    </div>
  );

  const renderInlineDropdowns = () => {
    const parts = question_text.split('[blank]');

    if (parts.length < 2) {
      return renderSelectAnswer('Choose an option');
    }

    return (
      <div className={`text-[15px] ${mutedTextClass} leading-loose font-medium`}>
        {parts.map((part: string, idx: number) => (
          <React.Fragment key={idx}>
            {part}
            {idx < parts.length - 1 && (
              <select
                value={Array.isArray(value) ? (value[idx] || '') : (idx === 0 ? (value || '') : '')}
                onChange={(e) => {
                  if (parts.length > 2) {
                    const arr = Array.isArray(value) ? [...value] : [];
                    arr[idx] = e.target.value;
                    onChange(arr);
                  } else {
                    onChange(e.target.value);
                  }
                }}
                className={`inline-block min-w-36 mx-2 border-2 px-3 py-1.5 rounded-lg outline-none transition-colors ${inputClass}`}
              >
                <option value="">Select</option>
                {options.map((opt: string, optionIdx: number) => (
                  <option key={optionIdx} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const getOptionValue = (opt: string, idx: number) => (
    isMatchingHeadingsQuestion(question) ? toRoman(idx + 1) : opt
  );

  const getOptionLabel = (opt: string, idx: number) => (
    isMatchingHeadingsQuestion(question) ? toRoman(idx + 1) : opt
  );

  const renderSelectAnswer = (placeholder = 'Select answer') => (
    <div className="flex flex-col gap-3">
      <p className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed`}>{question_text}</p>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border-2 px-4 py-3 rounded-xl outline-none transition-all ${inputClass}`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt: string, idx: number) => (
          <option key={idx} value={getOptionValue(opt, idx)}>{getOptionLabel(opt, idx)}</option>
        ))}
      </select>
    </div>
  );

  // ─── BLANK FILLING TYPES (1-4): Fill in the Blank, Summary Completion, Short Answer, Diagram ───
  if (['FILL_IN_THE_BLANK', 'SUMMARY_COMPLETION', 'TABLE_COMPLETION', 'DIAGRAM_LABELLING'].includes(question_type)) {
    return renderInlineTextInputs('Type your answer here...');
  }

  // Short Answer (just a text input, no [blank] parsing)
  if (question_type === 'SHORT_ANSWER') {
    return renderShortAnswer();
  }

  // Summary Completion with Options: dropdowns inside the summary blanks
  if (question_type === 'SUMMARY_COMPLETION_OPTIONS') {
    return renderInlineDropdowns();
  }

  // ─── TRUE / FALSE / NOT GIVEN & YES / NO / NOT GIVEN (6-7) ───
  if (question_type === 'TRUE_FALSE_NOT_GIVEN' || question_type === 'YES_NO_NOT_GIVEN') {
    const isTF = question_type === 'TRUE_FALSE_NOT_GIVEN';
    const options = isTF ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN'];
    
    return (
      <div className="flex flex-col gap-4">
        <p className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed`}>{question_text}</p>
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex-1 py-3 px-2 rounded-xl text-[12px] font-bold transition-all border-2 ${
                value === opt
                  ? isLight
                    ? 'bg-[#1E3A6E] border-[#1E3A6E] text-white shadow-sm'
                    : 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:border-[#1E3A6E]/40 hover:bg-[#F8FAFC]'
                  : 'bg-slate-950/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Matching / find-the-paragraph / headings: one dropdown per question
  if (['MATCHING', 'MATCHING_INFORMATION', 'MATCHING_HEADINGS'].includes(question_type)) {
    return renderSelectAnswer('Select match');
  }

  // Sentence Completion: choose the correct tail from options
  if (question_type === 'SENTENCE_COMPLETION') {
    return renderSelectAnswer('Select sentence ending');
  }

  // Standard MCQ
  if (question_type === 'SINGLE_MCQ') {
    return (
      <div className="flex flex-col gap-4">
        <p className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed`}>{question_text}</p>
        <div className="flex flex-col gap-2">
          {options.map((opt: string, idx: number) => {
            const isSelected = value === opt;
            const letter = String.fromCharCode(65 + idx);
            return (
              <label 
                key={idx} 
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${optionClass(isSelected)}`}
              >
                <div className="pt-0.5">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-emerald-500 bg-emerald-500' : isLight ? 'border-slate-300' : 'border-slate-600'
                  }`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    value={opt}
                    checked={isSelected}
                    onChange={() => onChange(opt)}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <span className="font-bold mr-2 text-[13px]">{letter}.</span>
                  <span className="text-[14px] leading-snug">{opt}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // Choose Two / Multi Select
  if (question_type === 'MULTI_SELECT') {
    const selectedValues = Array.isArray(value) ? value : [];
    
    const toggleValue = (opt: string) => {
      if (selectedValues.includes(opt)) {
        onChange(selectedValues.filter((v: string) => v !== opt));
      } else {
        onChange([...selectedValues, opt]);
      }
    };

    return (
      <div className="flex flex-col gap-4">
        <p className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed`}>{question_text}</p>
        <div className="flex flex-col gap-2">
          {options.map((opt: string, idx: number) => {
            const isSelected = selectedValues.includes(opt);
            const letter = String.fromCharCode(65 + idx);
            return (
              <label 
                key={idx} 
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${optionClass(isSelected)}`}
              >
                <div className="pt-0.5">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-emerald-500 bg-emerald-500' : isLight ? 'border-slate-300' : 'border-slate-600'
                  }`}>
                    {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleValue(opt)}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <span className="font-bold mr-2 text-[13px]">{letter}.</span>
                  <span className="text-[14px] leading-snug">{opt}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── DEFAULT FALLBACK ───
  return (
    <div className="flex flex-col gap-4">
      <p className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed`}>{question_text}</p>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here..."
        className={`w-full border-2 px-4 py-3 rounded-xl outline-none transition-all ${inputClass}`}
      />
    </div>
  );
};

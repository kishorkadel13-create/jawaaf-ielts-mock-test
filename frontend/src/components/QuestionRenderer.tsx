import React from 'react';
import { isMatchingHeadingsQuestion, toRoman } from '../utils/matchingHeadings';
import { renderFormattedBlockText, renderFormattedText } from '../utils/renderFormattedText';

interface QuestionRendererProps {
  question: any;
  value: any;
  onChange: (value: any) => void;
  mode?: 'dark' | 'light';
  onPasteText?: (event: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => string | null;
}

export const QuestionRenderer = ({ question, value, onChange, mode = 'dark', onPasteText }: QuestionRendererProps) => {
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
  const readingPasteProps = onPasteText ? { onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => pasteTextIntoInput(event, String(value || ''), onChange) } : {};

  const renderQuestionText = (keyPrefix: string) => (
    renderFormattedBlockText(question_text, keyPrefix)
  );

  const pasteTextIntoInput = (
    event: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    currentValue: string,
    commitValue: (nextValue: string) => void
  ) => {
    if (!onPasteText) return;

    const pasteText = onPasteText(event);
    if (pasteText === null) return;

    const input = event.currentTarget;
    const start = input.selectionStart ?? currentValue.length;
    const end = input.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${pasteText}${currentValue.slice(end)}`;
    commitValue(nextValue);

    window.requestAnimationFrame(() => {
      const cursor = start + pasteText.length;
      input.setSelectionRange(cursor, cursor);
    });
  };

  const renderInlineFormattedText = (text: string, keyPrefix: string) => (
    text.split('\n').map((line, index) => {
      const headingMatch = line.match(/^#{1,3}\s+(.+)$/);

      if (headingMatch) {
        return (
          <span key={`${keyPrefix}-${index}`} className="block text-[20px] font-black leading-snug text-inherit mb-2">
            {renderFormattedText(headingMatch[1], `${keyPrefix}-heading-${index}`)}
          </span>
        );
      }

      return (
        <React.Fragment key={`${keyPrefix}-${index}`}>
          {renderFormattedText(line, `${keyPrefix}-line-${index}`)}
          {index < text.split('\n').length - 1 ? '\n' : null}
        </React.Fragment>
      );
    })
  );

  const renderInlineTextInputs = (placeholder = 'Answer') => {
    const parts = question_text.split('[blank]');

    if (parts.length < 2) {
      return (
        <div className="flex flex-col gap-3">
          <div className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed whitespace-pre-wrap`}>{renderQuestionText(`question-${question.id}-inline`)}</div>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            {...readingPasteProps}
            data-reading-answer={onPasteText ? 'true' : undefined}
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
            {renderInlineFormattedText(part, `question-${question.id}-part-${idx}`)}
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
                onPaste={(event) => {
                  if (!onPasteText) return;
                  const currentValue = Array.isArray(value) ? String(value[idx] || '') : (idx === 0 ? String(value || '') : '');
                  pasteTextIntoInput(event, currentValue, (nextValue) => {
                    if (parts.length > 2) {
                      const arr = Array.isArray(value) ? [...value] : [];
                      arr[idx] = nextValue;
                      onChange(arr);
                    } else {
                      onChange(nextValue);
                    }
                  });
                }}
                data-reading-answer={onPasteText ? 'true' : undefined}
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
      <span className="whitespace-pre-wrap">{renderInlineFormattedText(question_text, `question-${question.id}-short`)}</span>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        {...readingPasteProps}
        data-reading-answer={onPasteText ? 'true' : undefined}
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
            {renderInlineFormattedText(part, `question-${question.id}-select-part-${idx}`)}
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
      <div className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed whitespace-pre-wrap`}>{renderQuestionText(`question-${question.id}-select`)}</div>
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

  if (question_type === 'WRITING_TASK') {
    const wordCount = String(value || '').trim()
      ? String(value || '').trim().split(/\s+/).length
      : 0;
    const minimumWords = question.extra_data_json?.minimum_words || 250;

    return (
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${isLight ? 'bg-rose-50 text-rose-600' : 'bg-rose-500/10 text-rose-300'}`}>
              {question.extra_data_json?.task_type || 'Writing Task'}
            </span>
            <span className={`text-[11px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Minimum {minimumWords} words
            </span>
          </div>
          <div className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed whitespace-pre-wrap`}>{renderQuestionText(`question-${question.id}-writing`)}</div>
        </div>
        <textarea
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          rows={14}
          placeholder="Write your answer here..."
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          className={`w-full border-2 px-4 py-3 rounded-xl outline-none transition-all resize-y leading-relaxed ${inputClass}`}
        />
        <div className={`text-[11px] font-bold text-right ${wordCount < minimumWords ? 'text-amber-600' : 'text-emerald-600'}`}>
          {wordCount} words
        </div>
      </div>
    );
  }

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
        <div className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed whitespace-pre-wrap`}>{renderQuestionText(`question-${question.id}-tf`)}</div>
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
        <div className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed whitespace-pre-wrap`}>{renderQuestionText(`question-${question.id}-mcq`)}</div>
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
        <div className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed whitespace-pre-wrap`}>{renderQuestionText(`question-${question.id}-multi`)}</div>
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
      <div className={`text-[15px] ${bodyTextClass} font-medium leading-relaxed whitespace-pre-wrap`}>{renderQuestionText(`question-${question.id}-fallback`)}</div>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        {...readingPasteProps}
        data-reading-answer={onPasteText ? 'true' : undefined}
        placeholder="Type your answer here..."
        className={`w-full border-2 px-4 py-3 rounded-xl outline-none transition-all ${inputClass}`}
      />
    </div>
  );
};

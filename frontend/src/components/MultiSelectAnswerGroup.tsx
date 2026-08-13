import React from 'react';
import { renderFormattedBlockText, renderFormattedText } from '../utils/renderFormattedText';

interface MultiSelectAnswerGroupProps {
  questions: any[];
  instruction?: string;
  values: Record<string, any>;
  onChange: (questionId: string, value: any) => void;
  disabled?: boolean;
  onActivateQuestion?: (questionId: string) => void;
}

const optionLetter = (index: number) => String.fromCharCode(65 + index);

const getGroupKey = (question: any) => (
  question?.extra_data_json?.multi_select_group_id || question?.extra_data_json?.bulk_source || ''
);

export const isMultiSelectAnswerGroup = (questions: any[] = []) => (
  questions.length > 1 &&
  questions.every((question) => question?.question_type === 'MULTI_SELECT') &&
  Boolean(getGroupKey(questions[0])) &&
  questions.every((question) => getGroupKey(question) === getGroupKey(questions[0]))
);

export const MultiSelectAnswerGroup = ({
  questions,
  instruction = '',
  values,
  onChange,
  disabled = false,
  onActivateQuestion,
}: MultiSelectAnswerGroupProps) => {
  const orderedQuestions = [...questions].sort((a, b) => Number(a.question_number || 0) - Number(b.question_number || 0));
  const firstQuestion = orderedQuestions[0];
  const options = firstQuestion?.options_json || [];
  const selectedByQuestion = orderedQuestions.map((question) => ({
    question,
    value: values[question.id] || '',
  }));
  const selectedValues = selectedByQuestion.map((item) => item.value).filter(Boolean);
  const maxSelections = orderedQuestions.length;

  const toggleOption = (option: string) => {
    if (disabled) return;

    const existing = selectedByQuestion.find((item) => item.value === option);
    if (existing) {
      onChange(existing.question.id, '');
      return;
    }

    const emptySlot = selectedByQuestion.find((item) => !item.value);
    if (!emptySlot || selectedValues.length >= maxSelections) return;

    onChange(emptySlot.question.id, option);
  };

  const rangeLabel = orderedQuestions.length === 2
    ? `${orderedQuestions[0].question_number} and ${orderedQuestions[1].question_number}`
    : `${orderedQuestions[0].question_number}-${orderedQuestions[orderedQuestions.length - 1].question_number}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {instruction && (
        <div className="mb-6 text-[16px] leading-8 text-[#05162E]">
          {renderFormattedBlockText(instruction, `multi-select-instruction-${firstQuestion?.id || 'group'}`)}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {orderedQuestions.map((question) => (
          <span
            key={question.id}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#1E3A6E] px-3 text-[13px] font-black text-white"
            onClick={() => onActivateQuestion?.(question.id)}
          >
            {question.question_number}
          </span>
        ))}
        <span className="text-[12px] font-black uppercase tracking-wider text-slate-400">
          Choose {maxSelections} answers for Questions {rangeLabel}
        </span>
      </div>

      <div className="mb-5 text-[16px] font-black leading-7 text-[#05162E]">
        {renderFormattedText(firstQuestion?.question_text || '', `multi-select-question-${firstQuestion?.id || 'group'}`)}
      </div>

      <div className="grid gap-3">
        {options.map((option: string, index: number) => {
          const isSelected = selectedValues.includes(option);
          const isDisabled = !isSelected && selectedValues.length >= maxSelections;

          return (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={disabled || isDisabled}
              onClick={() => toggleOption(option)}
              className={`grid min-h-14 grid-cols-[40px_1fr] items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? 'border-[#1E3A6E] bg-[#EFF4FB] text-[#05162E]'
                  : isDisabled
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-60'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-[#1E3A6E]/40 hover:bg-[#F8FAFC]'
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded border-2 text-[12px] font-black ${
                isSelected ? 'border-[#1E3A6E] bg-[#1E3A6E] text-white' : 'border-slate-300 bg-white text-[#1E3A6E]'
              }`}>
                {isSelected ? '✓' : optionLetter(index)}
              </span>
              <span className="text-[15px] leading-snug">{renderFormattedText(option, `multi-select-option-${index}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { renderFormattedBlockText, renderFormattedText } from '../utils/renderFormattedText';

interface ListeningMatchingTextGroupProps {
  questions: any[];
  instruction?: string;
  values: Record<string, any>;
  onChange: (questionId: string, value: any) => void;
  disabled?: boolean;
  onActivateQuestion?: (questionId: string) => void;
}

const optionLetter = (index: number) => String.fromCharCode(65 + index);

const getOptionBank = (questions: any[]) => (
  questions.find((question) => Array.isArray(question.options_json) && question.options_json.length)?.options_json || []
);

const cleanQuestionText = (question: any) => (
  String(question.question_text || '')
    .replace(/\[blank\]/g, '')
    .replace(/\s+\.?\s*$/, '')
    .trim()
);

export const isListeningMatchingTextQuestion = (question: any) => (
  ['MATCHING', 'MATCHING_INFORMATION'].includes(question?.question_type) &&
  Array.isArray(question?.options_json) &&
  question.options_json.length > 0
);

export const isListeningMatchingTextBlock = (questions: any[] = []) => (
  questions.length > 1 && questions.every(isListeningMatchingTextQuestion)
);

export const ListeningMatchingTextGroup = ({
  questions,
  instruction = '',
  values,
  onChange,
  disabled = false,
  onActivateQuestion,
}: ListeningMatchingTextGroupProps) => {
  const orderedQuestions = [...questions].sort((a, b) => Number(a.question_number || 0) - Number(b.question_number || 0));
  const options = getOptionBank(orderedQuestions);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {instruction && (
        <div className="mb-6 text-[16px] leading-8 text-[#05162E]">
          {renderFormattedBlockText(instruction, `listening-matching-instruction-${orderedQuestions[0]?.id || 'group'}`)}
        </div>
      )}

      {options.length > 0 && (
        <div className="mb-7 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 sm:p-5">
          <h4 className="mb-4 text-[16px] font-black text-[#05162E]">Options</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option: string, index: number) => (
              <div key={`${option}-${index}`} className="grid grid-cols-[36px_1fr] gap-3 text-[15px] leading-snug text-[#05162E]">
                <span className="font-black">{optionLetter(index)}</span>
                <span>{renderFormattedText(option, `listening-matching-option-${index}`)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {orderedQuestions.map((question) => {
          const answerKey = question.id || `q-${question.question_number}`;

          return (
            <div
              key={answerKey}
              id={`question-${answerKey}`}
              className="grid gap-3 rounded-xl border border-slate-100 bg-white p-4 sm:grid-cols-[48px_minmax(0,1fr)_160px] sm:items-center"
              onClick={() => onActivateQuestion?.(answerKey)}
            >
              <span className="text-[18px] font-black text-[#05162E]">{question.question_number}</span>
              <div className="text-[16px] font-medium leading-7 text-[#05162E]">
                {renderFormattedText(cleanQuestionText(question), `listening-matching-question-${answerKey}`)}
              </div>
              <input
                type="text"
                disabled={disabled}
                value={values[answerKey] || ''}
                onFocus={() => onActivateQuestion?.(answerKey)}
                onChange={(event) => onChange(answerKey, event.target.value.toUpperCase())}
                maxLength={1}
                inputMode="text"
                autoCapitalize="characters"
                aria-label={`Answer for question ${question.question_number}`}
                className="min-h-11 w-full rounded-none border-0 border-b-2 border-slate-300 bg-slate-50 px-3 py-2 text-center text-[16px] font-black uppercase text-[#05162E] outline-none transition-colors focus:border-[#1E3A6E] disabled:opacity-60"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

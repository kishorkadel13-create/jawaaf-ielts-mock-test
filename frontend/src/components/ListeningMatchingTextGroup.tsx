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

const getOptionBank = (questions: any[]): string[] => (
  questions.find((question) => Array.isArray(question.options_json) && question.options_json.length)?.options_json || []
);

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getParsedOptionsAndBoxTitle = (questions: any[]) => {
  const explicitTitle = questions.find((q) => q.extra_data_json?.box_title)?.extra_data_json?.box_title;
  const rawOptions: string[] = questions.find((q) => Array.isArray(q.options_json) && q.options_json.length)?.options_json || [];

  if (rawOptions.length > 1) {
    const firstOpt = rawOptions[0]?.trim() || '';
    const cleanFirstOpt = firstOpt.replace(/^\*\*|\*\*$/g, '').replace(/^#{1,3}\s+/, '').replace(/:$/, '').trim();

    // If explicitTitle matches the first option, strip it
    if (explicitTitle && cleanFirstOpt.toLowerCase() === explicitTitle.toLowerCase()) {
      return {
        boxTitle: explicitTitle,
        options: rawOptions.slice(1),
      };
    }

    // If first option was saved as "**Topics**" or "## Topics" or ending with colon
    if (/^\*\*[^*]+\*\*$/.test(firstOpt) || /^#{1,3}\s+/.test(firstOpt) || /:$/.test(firstOpt)) {
      return {
        boxTitle: explicitTitle || cleanFirstOpt,
        options: rawOptions.slice(1),
      };
    }
  }

  return {
    boxTitle: explicitTitle || null,
    options: rawOptions,
  };
};

export const parseQuestionHeadingAndText = (rawText: string, extraData?: any, boxTitle?: string | null) => {
  let text = String(rawText || '').trim();
  let heading: string | null = extraData?.section_heading ? String(extraData.section_heading).trim() : null;

  if (heading) {
    text = text.replace(new RegExp(`^#{1,3}\\s+${escapeRegExp(heading)}\\s*\\n*`, 'i'), '').trim();
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // If there are multiple lines (e.g. ["Topics", "Speakers", "Jim Clowrie"] or ["Speakers", "Jim Clowrie"])
  if (lines.length > 1) {
    const filteredLines = lines.filter((l) => {
      const clean = l.replace(/^#{1,3}\s+/, '').replace(/^\*\*|\*\*$/g, '').trim();
      // If line is the same as the box title (e.g. "Topics"), remove it from the question body
      if (boxTitle && clean.toLowerCase() === boxTitle.toLowerCase()) return false;
      return true;
    });

    if (filteredLines.length > 1) {
      const firstLine = filteredLines[0];
      const headingMatch = firstLine.match(/^#{1,3}\s+(.+)$/);
      if (headingMatch) {
        heading = headingMatch[1].trim();
        text = filteredLines.slice(1).join(' ').trim();
      } else if (!/^(?:answer|ans|correct)\s*[:\-]/i.test(firstLine) && !/^[A-Z][\.\)]\s+/i.test(firstLine)) {
        heading = firstLine.replace(/^\*\*|\*\*$/g, '').trim();
        text = filteredLines.slice(1).join(' ').trim();
      }
    } else if (filteredLines.length === 1) {
      text = filteredLines[0];
    }
  } else {
    // Single line: check if it's "## Heading"
    const singleMatch = text.match(/^#{1,3}\s+([^\n]+)$/);
    if (singleMatch) {
      heading = singleMatch[1].trim();
      text = '';
    }
  }

  // Strip any residual [blank], blanks like ________, or trailing punctuation
  text = text
    .replace(/\[blank\]/g, '')
    .replace(/_{2,}/g, '')
    .replace(/\s+\.?\s*$/, '')
    .trim();

  return { heading, text };
};

export const isListeningMatchingTextQuestion = (question: any) => (
  ['MATCHING', 'MATCHING_INFORMATION'].includes(question?.question_type) &&
  Array.isArray(question?.options_json) &&
  question.options_json.length > 0
);

export const isListeningMatchingTextBlock = (questions: any[] = []) => (
  questions.length > 0 && questions.every(isListeningMatchingTextQuestion)
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
  const { boxTitle, options } = getParsedOptionsAndBoxTitle(orderedQuestions);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {instruction && (
        <div className="mb-6 text-[16px] leading-8 text-[#05162E]">
          {renderFormattedBlockText(instruction, `listening-matching-instruction-${orderedQuestions[0]?.id || 'group'}`)}
        </div>
      )}

      {options.length > 0 && (
        <div className="mb-8 max-w-2xl rounded-md border-2 border-slate-700 bg-white p-5 shadow-sm">
          {boxTitle && (
            <h4 className="mb-3 text-center text-[15px] font-black text-[#05162E]">{boxTitle}</h4>
          )}
          <div className="flex flex-col gap-2.5">
            {options.map((option: string, index: number) => (
              <div key={`${option}-${index}`} className="flex items-start gap-4 text-[15px] leading-relaxed text-[#05162E]">
                <span className="w-5 font-black shrink-0 text-[#05162E]">{optionLetter(index)}</span>
                <span className="font-medium text-[#1E293B]">
                  {renderFormattedText(option, `listening-matching-option-${index}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-2xl divide-y divide-slate-100">
        {orderedQuestions.map((question) => {
          const answerKey = question.id || `q-${question.question_number}`;
          const currentVal = values[answerKey] || '';
          const { heading, text: cleanText } = parseQuestionHeadingAndText(question.question_text, question.extra_data_json, boxTitle);

          return (
            <React.Fragment key={answerKey}>
              {heading && (
                <div className="pt-7 pb-3 border-b-0 first:pt-2">
                  <h4 className="text-[16px] font-black text-[#05162E] tracking-tight">
                    {renderFormattedText(heading, `heading-${answerKey}`)}
                  </h4>
                </div>
              )}
              <div
                id={`question-${answerKey}`}
                className="flex items-center justify-between gap-4 py-3.5"
                onClick={() => onActivateQuestion?.(answerKey)}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="text-[17px] font-black text-[#05162E] w-7 shrink-0">
                    {question.question_number}
                  </span>
                  <span className="text-[15px] font-medium leading-relaxed text-[#1E293B]">
                    {renderFormattedText(cleanText, `listening-matching-question-${answerKey}`)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    disabled={disabled}
                    value={currentVal}
                    onFocus={() => onActivateQuestion?.(answerKey)}
                    onChange={(event) => onChange(answerKey, event.target.value)}
                    aria-label={`Answer for question ${question.question_number}`}
                    className="h-10 min-w-[72px] cursor-pointer rounded-lg border-2 border-slate-300 bg-white px-3 text-center text-[15px] font-black uppercase text-[#05162E] outline-none transition-all hover:border-slate-400 focus:border-[#1E3A6E] focus:ring-2 focus:ring-[#1E3A6E]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">—</option>
                    {options.map((_: string, index: number) => {
                      const letter = optionLetter(index);
                      return (
                        <option key={letter} value={letter}>
                          {letter}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

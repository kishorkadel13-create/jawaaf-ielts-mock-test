import React from 'react';
import { renderFormattedBlockText, renderFormattedText, splitQuestionInstruction } from '../utils/renderFormattedText';

interface SummaryCompletionGroupProps {
  questions: any[];
  values: Record<string, any>;
  onChange: (questionId: string, value: any) => void;
  mode?: 'dark' | 'light';
  onActivateQuestion?: (questionId: string) => void;
  groupInstruction?: string;
  onPasteText?: (event: React.ClipboardEvent<HTMLInputElement>) => string | null;
}

const blankTokenRe = /\b(\d{1,2})\s*[\.\)]?\s*(?:\[\s*blank\s*\]|\.{3,}|_+|-+|…+)/gi;
const optionLineRe = /^\s*([A-Z])[\.\)]\s+(.+?)\s*$/;

const restoreTargetBlank = (question: any) =>
  String(question.question_text || '').replace('[blank]', `${question.question_number}........`);

const canonicalizeSummaryText = (text: string) =>
  text.replace(blankTokenRe, (_match, number) => `{{blank-${number}}}`).replace(/\s+/g, ' ').trim();

const splitTableRow = (line: string) => {
  const trimmed = line.trim();

  if (trimmed.includes('|')) {
    const isWrappedMarkdownRow = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.slice(1, -1).includes('|');

    if (isWrappedMarkdownRow) {
      return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
    }

    if (trimmed.startsWith('|')) {
      return ['', ...trimmed.slice(1).replace(/\|\s*$/, '').split('|').map((cell) => cell.trim())];
    }

    return trimmed.replace(/\|\s*$/, '').split('|').map((cell) => cell.trim());
  }

  if (line.includes('\t')) {
    return line.split('\t').map((cell) => cell.trim());
  }

  return null;
};

const tableSeparatorRe = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

const parseTableRows = (source: string) => {
  const rows: string[][] = [];
  let lastTableRow: string[] | null = null;

  source
    .split('\n')
    .map((line) => line.trimEnd())
    .forEach((line) => {
      if (!line.trim() || tableSeparatorRe.test(line)) return;

      const row = splitTableRow(line);

      if (!row || row.length < 2) {
        if (lastTableRow && line.trim()) {
          const targetIndex = Math.max(lastTableRow.length - 1, 0);
          lastTableRow[targetIndex] = [lastTableRow[targetIndex], line.trim()].filter(Boolean).join('\n');
        }
        return;
      }

      const previous = rows[rows.length - 1];
      const isContinuationRow = previous && row[0] === '' && row.slice(1).some(Boolean);

      if (isContinuationRow) {
        row.slice(1).forEach((cell, index) => {
          if (!cell) return;
          const targetIndex = index + 1;
          previous[targetIndex] = [previous[targetIndex], cell].filter(Boolean).join('\n\n');
        });
        lastTableRow = previous;
        return;
      }

      rows.push(row);
      lastTableRow = row;
    });

  if (rows.length < 2) return null;

  const columnCount = Math.max(...rows.map((row) => row?.length || 0));

  return rows.map((row) => {
    const padded = [...(row || [])];
    while (padded.length < columnCount) padded.push('');
    return padded;
  });
};

const normalizeIeltsTableRows = (rows: string[][]) => {
  const columnCount = Math.max(...rows.map((row) => row.length));

  return rows.map((row) => {
    const trimmed = row.map((cell) => cell.trim());

    if (trimmed.length === columnCount) return trimmed;

    const hasDayCell = /^day\s*\d+/i.test(trimmed[0] || '');
    if (columnCount === 4 && trimmed.length === 3 && hasDayCell) {
      return [trimmed[0], trimmed[1], trimmed[2], ''];
    }

    const padded = [...trimmed];
    while (padded.length < columnCount) padded.push('');
    return padded;
  });
};

const isTitleRow = (row: string[]) => {
  const filledCells = row.filter((cell) => cell.trim());
  return filledCells.length === 1 && !new RegExp(blankTokenRe.source, 'i').test(filledCells[0]);
};

const isHeaderRow = (row: string[]) => {
  const normalized = row.map((cell) => cell.trim().toLowerCase());
  return normalized.includes('activity') && normalized.includes('notes');
};

const parseTableSegment = (source: string) => {
  const lines = source.split('\n');
  const firstTableLineIndex = lines.findIndex((line) => Boolean(splitTableRow(line)) || tableSeparatorRe.test(line));

  if (firstTableLineIndex >= 0) {
    const rows = parseTableRows(lines.slice(firstTableLineIndex).join('\n'));

    if (rows) {
      return {
        rows: normalizeIeltsTableRows(rows),
        beforeLines: lines.slice(0, firstTableLineIndex).map((line) => line.trim()).filter(Boolean),
        afterLines: [],
      };
    }
  }

  const groups: Array<{ start: number; end: number; lines: string[] }> = [];
  let current: { start: number; end: number; lines: string[] } | null = null;

  lines.forEach((line, index) => {
    const isTableLike = Boolean(splitTableRow(line)) || tableSeparatorRe.test(line);

    if (isTableLike) {
      if (!current) {
        current = { start: index, end: index, lines: [line] };
      } else {
        current.end = index;
        current.lines.push(line);
      }
      return;
    }

    if (current) {
      groups.push(current);
      current = null;
    }
  });

  if (current) groups.push(current);

  const parsedGroups = groups
    .map((group) => ({ group, rows: parseTableRows(group.lines.join('\n')) }))
    .filter((item): item is { group: { start: number; end: number; lines: string[] }; rows: string[][] } => Boolean(item.rows));

  if (!parsedGroups.length) return null;

  const best = parsedGroups.sort((a, b) => b.rows.length - a.rows.length)[0];

  return {
    rows: normalizeIeltsTableRows(best.rows),
    beforeLines: lines.slice(0, best.group.start).map((line) => line.trim()).filter(Boolean),
    afterLines: lines.slice(best.group.end + 1).map((line) => line.trim()).filter(Boolean),
  };
};

const splitSummarySegments = (questions: any[]) => {
  const groups = new Map<string, { source: string; questions: any[] }>();

  questions.forEach((question) => {
    const source = question.extra_data_json?.bulk_source || restoreTargetBlank(question);
    const key = canonicalizeSummaryText(source);
    const current = groups.get(key);

    if (current) {
      current.questions.push(question);
    } else {
      groups.set(key, { source, questions: [question] });
    }
  });

  return Array.from(groups.values()).map((segment) => ({
    ...segment,
    questions: segment.questions.sort((a, b) => Number(a.question_number) - Number(b.question_number)),
  }));
};

const optionLetter = (index: number) => String.fromCharCode(65 + index);

const getSegmentRange = (questions: any[]) => {
  const ordered = [...questions].sort((a, b) => Number(a.question_number) - Number(b.question_number));
  const first = ordered[0]?.question_number;
  const last = ordered[ordered.length - 1]?.question_number;

  if (!first) return '';
  return first === last ? `Question ${first}` : `Questions ${first}-${last}`;
};

const getInstructionRange = (instruction: string) => {
  const match = instruction.match(/questions?\s*(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?/i);

  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2] || match[1]);

  return start && end ? { start, end } : null;
};

const instructionMatchesQuestions = (instruction: string, questions: any[]) => {
  const range = getInstructionRange(instruction);

  if (!range) return false;

  return questions.some((question) => {
    const number = Number(question.question_number);
    return number >= range.start && number <= range.end;
  });
};

const getSegmentInstruction = (questions: any[], groupInstruction = '') => {
  const explicitInstruction = questions.find((question) =>
    question.extra_data_json?.bulk_instruction || question.instruction
  );
  const instruction = explicitInstruction?.extra_data_json?.bulk_instruction || explicitInstruction?.instruction || '';

  if (instruction) return instruction;
  if (groupInstruction && instructionMatchesQuestions(groupInstruction, questions)) return groupInstruction;

  return '';
};

const formatInstructionLines = (instruction: string, fallbackHeading: string) => {
  const splitInstruction = splitQuestionInstruction(instruction);
  const normalized = (splitInstruction.body || instruction)
    .replace(/\s+/g, ' ')
    .replace(/\.([A-Z])/g, '. $1')
    .trim();

  if (!normalized) return { heading: splitInstruction.heading || fallbackHeading, lines: [] };

  const match = normalized.match(/^(Questions?\s*\d{1,2}(?:\s*[–-]\s*\d{1,2})?)(.*)$/i);
  const heading = splitInstruction.heading || match?.[1]?.replace(/\s*[–-]\s*/g, '-') || fallbackHeading;
  const body = (match?.[2] || normalized).trim();
  const lines = body
    .replace(/\s+(Complete|Write|Choose|Answer|Label|Match|Do|Which)\b/g, '\n$1')
    .replace(/\.\s+(Write|Choose|Answer|Label|Match|Do|Which)\b/g, '.\n$1')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return { heading, lines };
};

const extractOptionBank = (source: string) => source
  .split('\n')
  .map((line) => line.match(optionLineRe))
  .filter((match): match is RegExpMatchArray => Boolean(match))
  .map((match) => ({ letter: match[1].toUpperCase(), text: match[2].trim() }));

const getDropdownOptionBank = (questions: any[], source: string) => {
  const options = questions.find((question) =>
    question.question_type === 'SUMMARY_COMPLETION_OPTIONS' &&
    Array.isArray(question.options_json) &&
    question.options_json.length > 0
  )?.options_json;

  if (Array.isArray(options) && options.length > 0) {
    return options.map((option: string, index: number) => ({
      letter: optionLetter(index),
      text: option,
    }));
  }

  return extractOptionBank(source);
};

export const SummaryCompletionGroup = ({
  questions,
  values,
  onChange,
  mode = 'light',
  onActivateQuestion,
  groupInstruction = '',
  onPasteText,
}: SummaryCompletionGroupProps) => {
  const orderedQuestions = [...questions].sort((a, b) => Number(a.question_number) - Number(b.question_number));
  const questionByNumber = new Map(orderedQuestions.map((question) => [Number(question.question_number), question]));
  const segments = splitSummarySegments(orderedQuestions);
  const isDark = mode === 'dark';

  const inputClass = isDark
    ? 'inline-block w-32 mx-1.5 bg-slate-950 border-b-2 border-slate-600 focus:border-emerald-500 text-white px-2 py-1 text-center outline-none rounded-t-sm'
    : 'inline-block w-36 mx-1.5 bg-slate-50 border-b-2 border-slate-300 focus:border-[#1E3A6E] text-[#05162E] px-2 py-1 text-center outline-none rounded-t-sm';

  const selectClass = isDark
    ? 'inline-block min-w-32 mx-1.5 bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 text-white px-2 py-1 rounded-lg outline-none'
    : 'inline-block min-w-36 mx-1.5 bg-slate-50 border-2 border-slate-200 focus:border-[#1E3A6E] text-[#05162E] px-2 py-1 rounded-lg outline-none';

  const textClass = isDark
    ? 'text-[15px] text-slate-300 leading-loose font-serif'
    : 'text-[15px] text-[#05162E] leading-loose font-medium';

  const panelClass = isDark
    ? 'p-6 rounded-2xl border-2 bg-slate-900 border-[#1E3A6E]/40 shadow-lg'
    : 'bg-white border border-slate-200 rounded-2xl p-6 shadow-sm';

  const renderTextWithBlanks = (source: string, segmentKey: string) => {
    const parts: React.ReactNode[] = [];
    const sourceOptionBank = extractOptionBank(source);
    let lastIndex = 0;
    const re = new RegExp(blankTokenRe.source, 'gi');
    let match: RegExpExecArray | null;
    const pushFormattedText = (text: string, key: string) => {
      if (!text) return;
      parts.push(...(renderFormattedBlockText(text, key) || []));
    };

    const pasteTextIntoInput = (
      event: React.ClipboardEvent<HTMLInputElement>,
      answerKey: string
    ) => {
      if (!onPasteText) return;

      const pasteText = onPasteText(event);
      if (pasteText === null) return;

      const input = event.currentTarget;
      const currentValue = String(values[answerKey] || '');
      const start = input.selectionStart ?? currentValue.length;
      const end = input.selectionEnd ?? currentValue.length;
      const nextValue = `${currentValue.slice(0, start)}${pasteText}${currentValue.slice(end)}`;
      onChange(answerKey, nextValue);

      window.requestAnimationFrame(() => {
        const cursor = start + pasteText.length;
        input.setSelectionRange(cursor, cursor);
      });
    };

    while ((match = re.exec(source)) !== null) {
      const number = Number(match[1]);
      const question = questionByNumber.get(number);

      pushFormattedText(source.slice(lastIndex, match.index), `${segmentKey}-text-${lastIndex}`);

      if (question) {
        const isDropdown = question.question_type === 'SUMMARY_COMPLETION_OPTIONS';
        const answerKey = question.id || `q-${question.question_number}`;
        const dropdownOptions = question.options_json?.length
          ? question.options_json.map((option: string, optionIndex: number) => ({
            letter: optionLetter(optionIndex),
            text: option,
          }))
          : sourceOptionBank;
        parts.push(
          <React.Fragment key={`${segmentKey}-${answerKey}-${match.index}`}>
            <span className={isDark ? 'font-bold text-white' : 'font-black text-[#05162E]'}>{number}</span>
            {isDropdown ? (
              <select
                value={values[answerKey] || ''}
                onFocus={() => onActivateQuestion?.(answerKey)}
                onChange={(event) => onChange(answerKey, event.target.value)}
                className={selectClass}
              >
                <option value="">Select</option>
                {dropdownOptions.map((option) => (
                  <option key={option.letter} value={option.text}>{option.letter}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={values[answerKey] || ''}
                onFocus={() => onActivateQuestion?.(answerKey)}
                onChange={(event) => onChange(answerKey, event.target.value)}
                onPaste={(event) => pasteTextIntoInput(event, answerKey)}
                data-reading-answer={onPasteText ? 'true' : undefined}
                className={inputClass}
              />
            )}
          </React.Fragment>
        );
      } else {
        pushFormattedText(match[0], `${segmentKey}-missing-${match.index}`);
      }

      lastIndex = match.index + match[0].length;
    }

    pushFormattedText(source.slice(lastIndex), `${segmentKey}-text-${lastIndex}`);
    return parts;
  };

  return (
    <div className={panelClass}>
      <div className="space-y-8">
        {segments.map((segment, segmentIndex) => {
          const tableSegment = parseTableSegment(segment.source);
          const fallbackHeading = getSegmentRange(segment.questions);
          const instruction = getSegmentInstruction(segment.questions, groupInstruction);
          const { heading, lines } = formatInstructionLines(instruction, fallbackHeading);
          const dropdownOptionBank = getDropdownOptionBank(segment.questions, segment.source);
          const instructionBlock = (
            <div className={segmentIndex === 0 ? 'mb-5' : 'mb-5 border-t border-slate-200 pt-7'}>
              <h3 className={`text-[22px] font-black mb-4 ${isDark ? 'text-white' : 'text-[#05162E]'}`}>
                {renderFormattedText(heading, `summary-heading-${segmentIndex}`)}
              </h3>
              {lines.length > 0 && (
                <div className={`space-y-3 text-[16px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-[#05162E]'}`}>
                  {lines.map((line, lineIndex) => (
                    <p key={lineIndex}>{renderFormattedText(line)}</p>
                  ))}
                </div>
              )}
              {dropdownOptionBank.length > 0 && (
                <div className={`mt-5 rounded-xl border p-4 ${
                  isDark
                    ? 'border-slate-700 bg-slate-950/40 text-slate-200'
                    : 'border-[#1E3A6E]/15 bg-[#EFF4FB] text-[#05162E]'
                }`}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {dropdownOptionBank.map((option) => (
                      <div key={option.letter} className="grid grid-cols-[28px_1fr] gap-2 text-[15px] leading-relaxed">
                        <span className={isDark ? 'font-black text-white' : 'font-black text-[#1E3A6E]'}>
                          {option.letter}.
                        </span>
                        <span>{renderFormattedText(option.text, `summary-option-${segmentIndex}-${option.letter}`)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );

          if (tableSegment) {
            return (
              <div key={segmentIndex}>
                {instructionBlock}
                {tableSegment.beforeLines.length > 0 && (
                  <div className={`${textClass} mb-4 space-y-2`}>
                    {tableSegment.beforeLines.map((line, lineIndex) => (
                      <div key={lineIndex}>
                        {renderFormattedBlockText(line, `table-before-${segmentIndex}-${lineIndex}`)}
                      </div>
                    ))}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className={`w-full border-collapse text-left ${isDark ? 'text-slate-300' : 'text-[#05162E]'}`}>
                    <tbody>
                      {tableSegment.rows.map((row, rowIndex) => {
                        if (isTitleRow(row)) {
                          const title = row.find((cell) => cell.trim()) || '';
                          return (
                            <tr key={rowIndex}>
                              <td
                                colSpan={row.length}
                                className={`border px-5 py-4 text-[22px] font-black leading-tight ${
                                  isDark ? 'border-slate-700 bg-slate-950/40 text-white' : 'border-slate-200 bg-white text-[#05162E]'
                                }`}
                              >
                                {renderFormattedBlockText(title, `table-title-${segmentIndex}-${rowIndex}`)}
                              </td>
                            </tr>
                          );
                        }

                        const headerRow = isHeaderRow(row);

                        return (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className={`align-middle border px-4 py-4 leading-loose whitespace-pre-wrap ${
                                  isDark
                                    ? 'border-slate-700 bg-slate-950/40'
                                    : 'border-slate-200 bg-white'
                                } ${headerRow ? 'text-center text-[20px] font-black' : 'text-[17px] font-medium'} ${
                                  cellIndex === 0 ? 'w-[15%]' : cellIndex === 1 ? 'w-[25%]' : 'w-[30%]'
                                }`}
                              >
                                {renderTextWithBlanks(cell, `${segmentIndex}-${rowIndex}-${cellIndex}`)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {tableSegment.afterLines.length > 0 && (
                  <div className={`${textClass} mt-4 space-y-2`}>
                    {tableSegment.afterLines.map((line, lineIndex) => (
                      <p key={lineIndex}>{renderFormattedText(line, `table-after-${segmentIndex}-${lineIndex}`)}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={segmentIndex}>
              {instructionBlock}
              <div className={`${textClass} whitespace-pre-wrap`}>
                {renderTextWithBlanks(segment.source, String(segmentIndex))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const isSummaryCompletionQuestion = (question: any) =>
  ['FILL_IN_THE_BLANK', 'TABLE_COMPLETION', 'SUMMARY_COMPLETION', 'SUMMARY_COMPLETION_OPTIONS'].includes(question?.question_type);

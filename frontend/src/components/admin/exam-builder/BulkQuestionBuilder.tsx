import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileText, Plus, Wand2, X } from 'lucide-react';
import { QuestionData } from './QuestionBuilder';
import { SummaryCompletionGroup, isSummaryCompletionQuestion } from '../../SummaryCompletionGroup';

interface BulkQuestionBuilderProps {
  onSave: (questions: QuestionData[], instruction?: string) => void;
  onCancel: () => void;
  nextOrderNo: number;
  currentInstruction?: string;
}

const BULK_TYPES = [
  { value: 'AUTO', label: 'Auto detect' },
  { value: 'FILL_IN_THE_BLANK', label: '1. Fill in the Blanks' },
  { value: 'SUMMARY_COMPLETION', label: '2. Summary Completion' },
  { value: 'SHORT_ANSWER', label: '3. Short Answer Question' },
  { value: 'DIAGRAM_LABELLING', label: '4. Diagram Labelling' },
  { value: 'SUMMARY_COMPLETION_OPTIONS', label: '5. Summary Completion with Options' },
  { value: 'TABLE_COMPLETION', label: 'Table Completion' },
  { value: 'TRUE_FALSE_NOT_GIVEN', label: '6. True / False / Not Given' },
  { value: 'YES_NO_NOT_GIVEN', label: '7. Yes / No / Not Given' },
  { value: 'SINGLE_MCQ', label: '8. Standard Multiple Choice' },
  { value: 'SENTENCE_COMPLETION', label: '9. Sentence Completion / Find the Tail' },
  { value: 'MATCHING', label: '10. Matching Question' },
  { value: 'MATCHING_INFORMATION', label: '11. Matching Information' },
  { value: 'MATCHING_HEADINGS', label: '12. Matching Headings' },
  { value: 'MULTI_SELECT', label: '13. Choose Two / Multi-select' },
];

const FORMAT_GUIDES: Record<string, { title: string; hint: string; example: string }> = {
  AUTO: {
    title: 'Auto detect',
    hint: 'Use this when your paste already has numbered questions, blanks/options, and an answer key.',
    example: `1. The cocoon fell into the wife’s 1........\n2. She invented a 2........\n\nAnswer Key:\n1 tea\n2 reel`,
  },
  FILL_IN_THE_BLANK: {
    title: '1. Fill in the Blanks',
    hint: 'Use numbered note/table lines with numbered blanks. For tables, separate columns with |.',
    example: `Notes format:\nEarly silk production in China\n- cocoon fell into emperor’s wife’s 1........\n- emperor’s wife invented a 2........ to pull silk fibres\n\nTable format:\nMiddle Ages | Nutmeg was brought to Europe by the 8........\n16th century | European nations took control of the nutmeg trade\n17th century | Demand grew against the disease known as the 9........\n17th century | put 10........ on nutmeg\n\nAnswer Key:\n1 tea\n2 reel\n8 Venetians\n9 plague\n10 lime`,
  },
  SUMMARY_COMPLETION: {
    title: '2. Summary Completion',
    hint: 'Paste a paragraph or summary with numbered blanks. Students type answers in the blanks.',
    example: `1. Silk was first discovered when a cocoon fell into a cup of 1........ . Lei Tzu then developed a 2........ to draw fibres from the cocoon.\n\nAnswer Key:\n1 tea\n2 reel`,
  },
  SHORT_ANSWER: {
    title: '3. Short Answer Question',
    hint: 'Paste numbered questions. Students get a text box after each question.',
    example: `1. What material is silk made from?\n2. Who was originally responsible for silk farming?\n\nAnswer Key:\n1 cocoons\n2 women`,
  },
  DIAGRAM_LABELLING: {
    title: '4. Diagram Labelling',
    hint: 'Paste numbered diagram labels or callouts with blanks. Attach the diagram image in the group settings if needed.',
    example: `1. Label A: 1........\n2. Label B: 2........\n3. Label C: 3........\n\nAnswer Key:\n1 cocoon\n2 fibre\n3 reel`,
  },
  SUMMARY_COMPLETION_OPTIONS: {
    title: '5. Summary Completion with Options',
    hint: 'Paste summary blanks plus options. Students select from dropdowns inside the summary.',
    example: `1. Silk became a symbol of 1........ and was later used as 2........ .\n\nA. currency\nB. status\nC. paper\nD. taxes\n\nAnswer Key:\n1 B\n2 A`,
  },
  TABLE_COMPLETION: {
    title: 'Table Completion',
    hint: 'Paste table rows with columns separated by |. Use a leading | for continuation rows where the first column is blank.',
    example: `Middle Ages | Nutmeg was brought to Europe by the 8........\n16th century | European nations took control of the nutmeg trade\n17th century | Demand grew against the disease known as the 9........\n| The Dutch\n| - took control of the Banda Islands\n| - put 10........ on nutmeg\nLate 18th century | 1770 - plants were taken to 12........\n| 1778 - plantations were destroyed by a 13........\n\nAnswer Key:\n8 Venetians\n9 plague\n10 lime\n12 Mauritius\n13 hurricane`,
  },
  TRUE_FALSE_NOT_GIVEN: {
    title: '6. True / False / Not Given',
    hint: 'Paste numbered statements. Answers must be TRUE, FALSE, or NOT GIVEN.',
    example: `1. Silk cultivation began in China several millennia ago.\n2. Lei Tzu was the emperor of China.\n3. Silk was used as a form of currency.\n\nAnswer Key:\n1 TRUE\n2 FALSE\n3 TRUE`,
  },
  YES_NO_NOT_GIVEN: {
    title: '7. Yes / No / Not Given',
    hint: 'Paste numbered opinion/claim statements. Answers must be YES, NO, or NOT GIVEN.',
    example: `1. The writer believes silk was highly valuable in ancient China.\n2. The writer thinks all silk legends are completely true.\n\nAnswer Key:\n1 YES\n2 NO`,
  },
  SINGLE_MCQ: {
    title: '8. Standard Multiple Choice',
    hint: 'Paste each numbered question followed by A/B/C/D options. Use answer letters in the key.',
    example: `1. What did Lei Tzu discover?\nA. Cotton\nB. Silkworms\nC. Paper\nD. Tea\n\nAnswer Key:\n1 B`,
  },
  SENTENCE_COMPLETION: {
    title: '9. Sentence Completion / Find the Tail',
    hint: 'Paste sentence starts as numbered prompts and endings as options. Students pick one ending.',
    example: `1. Silk was used by officials as\n2. Silk was sent by emperors as\n\nA. diplomatic gifts\nB. salary\nC. building material\nD. food\n\nAnswer Key:\n1 B\n2 A`,
  },
  MATCHING: {
    title: '10. Matching Question',
    hint: 'Paste numbered prompts and matching options. Students select the matching option.',
    example: `1. Lei Tzu\n2. Han Dynasty\n3. Qin Dynasty\n\nA. Silk used as currency\nB. Discovery legend\nC. Rules relaxed\n\nAnswer Key:\n1 B\n2 A\n3 C`,
  },
  MATCHING_INFORMATION: {
    title: '11. Matching Information',
    hint: 'Paste numbered statements. Options are paragraph letters; letters may repeat.',
    example: `1. Mentions silk being used for taxes.\n2. Describes the discovery legend.\n3. Lists products made from silk.\n\nA. Paragraph A\nB. Paragraph B\nC. Paragraph C\nD. Paragraph D\n\nAnswer Key:\n1 B\n2 A\n3 B`,
  },
  MATCHING_HEADINGS: {
    title: '12. Matching Headings',
    hint: 'Paste paragraph prompts/questions and heading options in roman numerals.',
    example: `1. Paragraph A\n2. Paragraph B\n3. Paragraph C\n\ni. Early discovery of silk\nii. Silk as money and gifts\niii. Silk production spreads\niv. Modern uses of silk\n\nAnswer Key:\n1 i\n2 ii\n3 iii`,
  },
  MULTI_SELECT: {
    title: '13. Choose Two / Multi-select',
    hint: 'Paste one or more numbered prompts with options. Give multiple answer letters separated by comma.',
    example: `1. Which TWO things were made using silk?\nA. Fishing lines\nB. Glass bottles\nC. Bowstrings\nD. Stone tools\nE. Bricks\n\nAnswer Key:\n1 A, C`,
  },
};

const SUGGESTED_STATEMENTS: Record<string, string> = {
  AUTO: '',
  FILL_IN_THE_BLANK: 'Questions 1-9 Complete the notes below. Choose ONE WORD ONLY from the passage for each answer.',
  SUMMARY_COMPLETION: 'Questions 1-5 Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.',
  SHORT_ANSWER: 'Questions 1-5 Answer the questions below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
  DIAGRAM_LABELLING: 'Questions 1-5 Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
  SUMMARY_COMPLETION_OPTIONS: 'Questions 1-5 Complete the summary using the list of options below.',
  TABLE_COMPLETION: 'Questions 8-13 Complete the table below. Choose ONE WORD ONLY from the passage for each answer.',
  TRUE_FALSE_NOT_GIVEN: 'Questions 14-18 Do the following statements agree with the information given in the reading passage? Write TRUE, FALSE or NOT GIVEN.',
  YES_NO_NOT_GIVEN: 'Questions 14-18 Do the following statements agree with the views of the writer? Write YES, NO or NOT GIVEN.',
  SINGLE_MCQ: 'Questions 1-5 Choose the correct letter, A, B, C or D.',
  SENTENCE_COMPLETION: 'Questions 1-5 Complete each sentence with the correct ending, A-F.',
  MATCHING: 'Questions 1-5 Match each statement with the correct option.',
  MATCHING_INFORMATION: 'Questions 1-5 Which paragraph contains the following information? Write the correct letter, A-D.',
  MATCHING_HEADINGS: 'Questions 1-5 Choose the correct heading for each paragraph from the list of headings below.',
  MULTI_SELECT: 'Questions 1-2 Choose TWO letters, A-E.',
};

const MATCHING_HEADINGS_OPTIONS_PLACEHOLDER = `i. Early discovery of silk
ii. Silk as money and gifts
iii. Silk production spreads
iv. Modern uses of silk`;

const MATCHING_HEADINGS_QUESTIONS_PLACEHOLDER = `14. Paragraph A
15. Paragraph B
16. Paragraph C
17. Paragraph D

Answer Key:
14 i
15 ii
16 iii
17 iv`;

const OPTION_RE = /^([A-Z]|[ivxlcdm]+)[\.\)]\s+(.+)$/i;
const QUESTION_START_RE = /^\s*(\d{1,2})[\.\)]?\s+(.+)$/;
const NUMBERED_BLANK_RE = (num: number) => new RegExp(`["'“”‘’]?\\b${num}\\s*[\\.\\)]?\\s*(?:\\[\\s*blank\\s*\\]|\\.{3,}|_+|-+|…+)["'“”‘’]?`, 'i');
const ANY_NUMBERED_BLANK_RE = /["'“”‘’]?\b(\d{1,2})\s*[\.\)]?\s*(?:\[\s*blank\s*\]|\.{3,}|_+|-+|…+)["'“”‘’]?/i;
const ROMAN_RE = /^[ivxlcdm]+$/i;

type AnswerMap = Record<number, string[]>;

const splitAnswers = (value: string) => value
  .split(/[,/|;]+/)
  .map((part) => part.trim())
  .filter(Boolean);

const parseAnswerLine = (line: string): Array<[number, string[]]> => {
  const cleaned = line
    .replace(/^(?:answer(?:s)?|ans|key|correct answers?)\s*[:\-]?\s*/i, '')
    .trim();

  const results: Array<[number, string[]]> = [];
  const pairRe = /(\d{1,2})\s*[\.\):\-]?\s*([A-Za-z][A-Za-z\s]*|[^\d,;]+)/g;
  let match: RegExpExecArray | null;

  while ((match = pairRe.exec(cleaned)) !== null) {
    const questionNumber = Number(match[1]);
    const answer = match[2].trim();
    if (questionNumber && answer) {
      results.push([questionNumber, splitAnswers(answer)]);
    }
  }

  return results;
};

const extractAnswerMap = (lines: string[]) => {
  const answerMap: AnswerMap = {};
  const questionLines: string[] = [];
  let inAnswerKey = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    const startsAnswerKey = /^(?:answer(?:s)?|ans|key|correct answers?)\b/i.test(trimmed);
    const answerPairs = startsAnswerKey ? parseAnswerLine(trimmed) : [];
    const isAnswerKeyHeader = /^(?:answer\s*key|answers|key|correct answers?)\b/i.test(trimmed);
    const compactAnswerPair = /^(\d{1,2})[\.\):\-]?\s+(.+)$/.exec(trimmed);

    if (startsAnswerKey) {
      if (answerPairs.length === 0 && !isAnswerKeyHeader) {
        questionLines.push(line);
        return;
      }

      inAnswerKey = true;
      answerPairs.forEach(([num, answers]) => {
        answerMap[num] = answers;
      });
      return;
    }

    if (inAnswerKey && compactAnswerPair && !OPTION_RE.test(trimmed)) {
      const num = Number(compactAnswerPair[1]);
      const answer = compactAnswerPair[2].trim();
      if (num && answer) {
        answerMap[num] = splitAnswers(answer);
        return;
      }
    }

    if (/^\s*$/.test(line)) {
      questionLines.push('');
      return;
    }

    questionLines.push(line);
  });

  return { answerMap, questionLines };
};

const splitQuestionBlocks = (text: string) => {
  const lines = text.split('\n').map((line) => line.trimEnd());
  const blocks: Array<{ number: number; lines: string[] }> = [];
  let current: { number: number; lines: string[] } | null = null;

  lines.forEach((line) => {
    const startMatch = line.match(QUESTION_START_RE);
    const optionMatch = line.match(OPTION_RE);

    if (startMatch && !optionMatch) {
      if (current) blocks.push(current);
      current = { number: Number(startMatch[1]), lines: [startMatch[2].trim()] };
      return;
    }

    if (current) {
      current.lines.push(line.trim());
    }
  });

  if (current) blocks.push(current);
  return blocks;
};

const cleanNoteLine = (line: string) => line
  .replace(/^[\s•*\-–—]+/, '')
  .replace(/\s+/g, ' ')
  .trim();

const splitNumberedBlankBlocks = (text: string) => {
  const blocks: Array<{ number: number; lines: string[] }> = [];
  let pendingContext: string[] = [];

  text.split('\n').forEach((line) => {
    const cleaned = cleanNoteLine(line);

    if (!cleaned) {
      return;
    }

    const blankMatches = Array.from(cleaned.matchAll(new RegExp(ANY_NUMBERED_BLANK_RE.source, 'gi')));

    if (blankMatches.length > 0) {
      const context = pendingContext.join(' ');
      const questionLine = `${context ? `${context} ` : ''}${cleaned}`.trim();
      blankMatches.forEach((blankMatch) => {
        const number = Number(blankMatch[1]);
        blocks.push({ number, lines: [questionLine] });
      });
      pendingContext = [];
      return;
    }

    if (!OPTION_RE.test(cleaned) && !/^(?:answer|ans|correct)\s*[:\-]/i.test(cleaned)) {
      pendingContext.push(cleaned);
      if (pendingContext.length > 2) {
        pendingContext = pendingContext.slice(-2);
      }
    }
  });

  return blocks;
};

const blankFocusedTypes = new Set([
  'FILL_IN_THE_BLANK',
  'SUMMARY_COMPLETION',
  'TABLE_COMPLETION',
  'SHORT_ANSWER',
  'DIAGRAM_LABELLING',
  'SUMMARY_COMPLETION_OPTIONS',
]);

const sharedOptionTypes = new Set([
  'MATCHING',
  'MATCHING_INFORMATION',
  'MATCHING_HEADINGS',
  'SENTENCE_COMPLETION',
]);

const extractSharedOptions = (text: string) => text
  .split('\n')
  .map((line) => line.trim())
  .map((line) => line.match(OPTION_RE))
  .filter((match): match is RegExpMatchArray => Boolean(match))
  .map((match) => match[2].trim());

const removeSharedOptionLines = (text: string) => text
  .split('\n')
  .filter((line) => !OPTION_RE.test(line.trim()))
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const normalizeBlankText = (text: string, questionNumber: number, isolateTargetBlank = false) => {
  const withNumberedBlank = text.replace(NUMBERED_BLANK_RE(questionNumber), '[blank]');

  if (isolateTargetBlank) {
    return withNumberedBlank
      .replace(/\[\s*blank\s*\]/gi, '[blank]')
      .replace(/["'“”‘’]\s*\[blank\]\s*["'“”‘’]/g, '[blank]');
  }

  return withNumberedBlank
    .replace(/\[\s*blank\s*\]/gi, '[blank]')
    .replace(/["'“”‘’]\s*\[blank\]\s*["'“”‘’]/g, '[blank]')
    .replace(/\.{4,}|_{4,}|-{4,}|…+/g, '[blank]');
};

const inferType = (forcedType: string, options: string[], answers: string[], questionText: string) => {
  if (forcedType !== 'AUTO') return forcedType;

  const answerUpper = answers[0]?.toUpperCase();
  if (['TRUE', 'FALSE', 'NOT GIVEN'].includes(answerUpper)) return 'TRUE_FALSE_NOT_GIVEN';
  if (['YES', 'NO', 'NOT GIVEN'].includes(answerUpper)) return 'YES_NO_NOT_GIVEN';
  if (options.length > 0 && answers.length > 1) return 'MULTI_SELECT';
  if (options.length > 0) return 'SINGLE_MCQ';
  if (questionText.includes('[blank]')) return 'FILL_IN_THE_BLANK';
  return 'SHORT_ANSWER';
};

const normalizeAnswersForOptions = (answers: string[], options: string[], questionType: string) => answers.map((answer) => {
  if (questionType === 'MATCHING_HEADINGS' && ROMAN_RE.test(answer.trim())) {
    return answer.trim().toLowerCase();
  }

  const answerUpper = answer.toUpperCase();
  if (/^[A-Z]$/.test(answerUpper)) {
    const index = answerUpper.charCodeAt(0) - 65;
    return options[index] || answerUpper;
  }
  return answer;
});

export default function BulkQuestionBuilder({ onSave, onCancel, nextOrderNo, currentInstruction = '' }: BulkQuestionBuilderProps) {
  const [rawText, setRawText] = useState('');
  const [headingOptionsText, setHeadingOptionsText] = useState('');
  const [bulkType, setBulkType] = useState('AUTO');
  const [questionStatement, setQuestionStatement] = useState(currentInstruction);
  const [parsedQuestions, setParsedQuestions] = useState<QuestionData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const formatGuide = useMemo(() => FORMAT_GUIDES[bulkType] || FORMAT_GUIDES.AUTO, [bulkType]);
  const suggestedStatement = useMemo(() => SUGGESTED_STATEMENTS[bulkType] || '', [bulkType]);

  useEffect(() => {
    if (bulkType !== 'MATCHING_HEADINGS') return;

    if (!questionStatement.trim() || /complete the table|table below|one word only/i.test(questionStatement)) {
      setQuestionStatement(SUGGESTED_STATEMENTS.MATCHING_HEADINGS);
    }

    if (!headingOptionsText.trim() && rawText.trim()) {
      const optionLines: string[] = [];
      const remainingLines: string[] = [];

      rawText.split('\n').forEach((line) => {
        const optionMatch = line.trim().match(OPTION_RE);
        if (optionMatch && ROMAN_RE.test(optionMatch[1])) {
          optionLines.push(line);
        } else {
          remainingLines.push(line);
        }
      });

      if (optionLines.length > 0) {
        setHeadingOptionsText(optionLines.join('\n'));
        setRawText(remainingLines.join('\n').replace(/\n{3,}/g, '\n\n').trim());
      }
    }
  }, [bulkType, headingOptionsText, questionStatement, rawText]);

  const parseQuestions = () => {
    setError(null);

    const sourceText = bulkType === 'MATCHING_HEADINGS'
      ? `${headingOptionsText.trim()}\n\n${rawText.trim()}`.trim()
      : rawText.trim();

    if (!sourceText) {
      setError('Please paste questions first.');
      return;
    }

    if (bulkType === 'MATCHING_HEADINGS' && !extractSharedOptions(sourceText).length) {
      setError('Please add the List of Headings options using roman numerals like "i. ...", "ii. ...".');
      return;
    }

    const normalized = sourceText.replace(/\r/g, '').replace(/\u00a0/g, ' ');
    const { answerMap, questionLines } = extractAnswerMap(normalized.split('\n'));
    const questionTextSource = questionLines.join('\n');
    const optionBankOptions = bulkType === 'SUMMARY_COMPLETION_OPTIONS' ? extractSharedOptions(questionTextSource) : [];
    const parseTextSource = bulkType === 'SUMMARY_COMPLETION_OPTIONS' && optionBankOptions.length > 0
      ? removeSharedOptionLines(questionTextSource)
      : questionTextSource;
    const sharedOptions = sharedOptionTypes.has(bulkType) ? extractSharedOptions(questionTextSource) : optionBankOptions;
    const blankBlocks = splitNumberedBlankBlocks(parseTextSource);
    const regularBlocks = splitQuestionBlocks(parseTextSource);
    const shouldPreferBlankBlocks = blankFocusedTypes.has(bulkType) || (bulkType === 'AUTO' && blankBlocks.length > regularBlocks.length);
    const blocks = shouldPreferBlankBlocks && blankBlocks.length > 0 ? blankBlocks : regularBlocks;

    if (blocks.length === 0) {
      setError('No questions found. Use numbered items like "1. ..." or notes with numbered blanks like "1. ........".');
      return;
    }

    let order = nextOrderNo;
    const parsed = blocks.map((block) => {
      const options: string[] = [];
      const bodyLines: string[] = [];
      let inlineAnswers: string[] = [];

      block.lines.forEach((line) => {
        const answerMatch = line.match(/^(?:answer|ans|correct)\s*[:\-]\s*(.+)$/i);
        if (answerMatch) {
          inlineAnswers = splitAnswers(answerMatch[1]);
          return;
        }

        const optionMatch = line.match(OPTION_RE);
        if (optionMatch) {
          options.push(optionMatch[2].trim());
          return;
        }

        if (line.trim()) {
          bodyLines.push(line.trim());
        }
      });

      const isolateTargetBlank = blankFocusedTypes.has(bulkType) || (bulkType === 'AUTO' && bodyLines.join(' ').match(ANY_NUMBERED_BLANK_RE));
      const questionText = normalizeBlankText(bodyLines.join(' ').replace(/\s+/g, ' ').trim(), block.number, Boolean(isolateTargetBlank));
      const answersFromKey = answerMap[block.number] || [];
      const rawAnswers = inlineAnswers.length > 0 ? inlineAnswers : answersFromKey;
      const questionType = inferType(bulkType, options, rawAnswers, questionText);
      const finalOptions = (sharedOptionTypes.has(questionType) || questionType === 'SUMMARY_COMPLETION_OPTIONS') && sharedOptions.length > 0 ? sharedOptions : options;
      const shouldNormalizeOptionAnswers = ['SINGLE_MCQ', 'MULTI_SELECT', 'SUMMARY_COMPLETION_OPTIONS', 'MATCHING', 'MATCHING_HEADINGS', 'MATCHING_INFORMATION', 'SENTENCE_COMPLETION'].includes(questionType);
      const answers = shouldNormalizeOptionAnswers ? normalizeAnswersForOptions(rawAnswers, finalOptions, questionType) : rawAnswers;

      return {
        question_type: questionType,
        question_number: block.number,
        question_text: questionText || `Question ${block.number}`,
        options_json: finalOptions.length > 0 ? finalOptions : undefined,
        correct_answers_json: answers.length > 0 ? answers : ['[NO ANSWER DETECTED]'],
        extra_data_json: blankFocusedTypes.has(questionType)
          ? { bulk_source: parseTextSource }
          : undefined,
        marks: 1,
        order_no: order++,
      };
    });

    setParsedQuestions(parsed);
  };

  const handleSaveClick = async () => {
    if (!parsedQuestions) return;
    setIsSaving(true);
    try {
      await onSave(parsedQuestions, questionStatement.trim());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#1E3A6E]/20 rounded-2xl shadow-xl overflow-hidden mt-4">
      <div className="px-6 py-4 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-black text-[16px] text-[#05162E] flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-[#1E3A6E]" /> Bulk Question Group Builder
        </h3>
        <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Question Type</label>
            <select
              value={bulkType}
              onChange={(event) => {
                const nextType = event.target.value;
                const previousSuggested = SUGGESTED_STATEMENTS[bulkType] || '';
                const nextSuggested = SUGGESTED_STATEMENTS[nextType] || '';
                setBulkType(nextType);
                setParsedQuestions(null);
                if (
                  nextType === 'MATCHING_HEADINGS' ||
                  !questionStatement.trim() ||
                  questionStatement === previousSuggested ||
                  Object.values(SUGGESTED_STATEMENTS).includes(questionStatement)
                ) {
                  setQuestionStatement(nextSuggested);
                }
              }}
              className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-[#05162E] outline-none focus:border-[#1E3A6E]"
            >
              {BULK_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-[#EFF4FB] border border-[#1E3A6E]/20 p-4 rounded-xl text-[13px] text-slate-700">
            <h4 className="font-bold text-[#05162E] flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4" /> {formatGuide.title}
            </h4>
            <p>{formatGuide.hint}</p>
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-white/75 border border-[#1E3A6E]/10 p-3 text-[11px] leading-relaxed font-mono whitespace-pre-wrap text-slate-600">
              {formatGuide.example}
            </pre>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[13px] flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {!parsedQuestions ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Question Statement / Student Instruction
                </label>
                {suggestedStatement && (
                  <button
                    type="button"
                    onClick={() => setQuestionStatement(suggestedStatement)}
                    className="text-[11px] font-bold text-[#1E3A6E] hover:underline"
                  >
                    Use suggested
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={questionStatement}
                onChange={(e) => setQuestionStatement(e.target.value)}
                placeholder="e.g. Questions 14-18 Do the following statements agree with the information given in the reading passage? Write TRUE, FALSE or NOT GIVEN."
                className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl focus:border-[#1E3A6E] text-[13px] outline-none resize-y transition-colors"
              />
              <span className="text-[11px] text-slate-400">
                This appears above the questions for students.
              </span>
            </div>
            {bulkType === 'MATCHING_HEADINGS' ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-[#EFF4FB] border-b border-[#1E3A6E]/10 px-4 py-3">
                  <h4 className="text-center text-[13px] font-black text-[#1E3A6E]">List of Headings</h4>
                </div>
                <textarea
                  rows={7}
                  value={headingOptionsText}
                  onChange={(e) => setHeadingOptionsText(e.target.value)}
                  placeholder={MATCHING_HEADINGS_OPTIONS_PLACEHOLDER}
                  className="w-full p-4 bg-[#F8FAFC] border-0 focus:bg-white text-[13px] font-mono outline-none resize-y transition-colors"
                />
                <div className="border-t border-slate-200 px-4 py-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Paragraph Questions / Answer Key
                  </label>
                  <textarea
                    rows={9}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={MATCHING_HEADINGS_QUESTIONS_PLACEHOLDER}
                    className="mt-2 w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#1E3A6E] focus:bg-white text-[13px] font-mono outline-none resize-y transition-colors"
                  />
                </div>
              </div>
            ) : (
              <textarea
                rows={15}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={formatGuide.example}
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#1E3A6E] focus:bg-white text-[13px] font-mono outline-none resize-y transition-colors"
              />
            )}
            <div className="flex justify-end gap-3">
              <button onClick={onCancel} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[13px] rounded-xl transition-all">
                Cancel
              </button>
              <button onClick={parseQuestions} className="px-6 py-2.5 bg-[#1E3A6E] text-white font-bold text-[13px] rounded-xl hover:bg-[#162d57] transition-all shadow-sm">
                Parse & Preview
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="font-bold text-[15px] text-emerald-600">Parsed {parsedQuestions.length} questions</h4>
              <button onClick={() => setParsedQuestions(null)} className="text-[12px] font-bold text-slate-500 hover:text-[#1E3A6E] underline">
                Edit Raw Text
              </button>
            </div>

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
              {parsedQuestions.some((q) => q.question_type === 'MATCHING_HEADINGS' && q.options_json?.length) && (
                <div className="p-4 bg-[#EFF4FB] border border-[#1E3A6E]/20 rounded-xl">
                  <h5 className="text-[12px] font-black text-[#1E3A6E] mb-3">List of Headings</h5>
                  <div className="grid gap-2 text-[13px] text-[#05162E]">
                    {parsedQuestions.find((q) => q.question_type === 'MATCHING_HEADINGS' && q.options_json?.length)?.options_json?.map((opt, i) => (
                      <div key={i} className="grid grid-cols-[36px_1fr] gap-2">
                        <span className="font-black">{toRoman(i + 1)}</span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parsedQuestions.some(isSummaryCompletionQuestion) && (
                <SummaryCompletionGroup
                  questions={parsedQuestions.filter(isSummaryCompletionQuestion)}
                  values={{}}
                  onChange={() => undefined}
                  mode="light"
                />
              )}

              {parsedQuestions.filter((q) => !isSummaryCompletionQuestion(q)).map((q, idx) => {
                const showInlineOptions = Boolean(q.options_json?.length) && !sharedOptionTypes.has(q.question_type);

                return (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                    <span className="absolute top-4 right-4 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-black uppercase text-slate-500">
                      {q.question_type.replace(/_/g, ' ')}
                    </span>
                    <p className="font-bold text-[14px] text-[#05162E] mb-2 pr-28">
                      {q.question_number}. {q.question_text.replace(/\[blank\]/g, '__________')}
                    </p>

                    {showInlineOptions && (
                      <ul className="list-disc pl-5 mb-3 text-[13px] text-slate-600 space-y-1">
                        {q.options_json?.map((opt, i) => (
                          <li key={i}>{String.fromCharCode(65 + i)}. {opt}</li>
                        ))}
                      </ul>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-600 uppercase">Answers:</span>
                      <div className="flex flex-wrap gap-1">
                        {q.correct_answers_json.map((ans, i) => (
                          <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded">
                            {ans}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setParsedQuestions(null)}
                disabled={isSaving}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 font-bold text-[13px] rounded-xl transition-all"
              >
                Edit
              </button>
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 text-white disabled:bg-emerald-400 font-bold text-[13px] rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm"
              >
                {isSaving ? <AlertCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isSaving ? 'Saving...' : `Save ${parsedQuestions.length} Questions`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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

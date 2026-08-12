const isMatchingHeadingsInstruction = (text = '') => (
  /\bheading(s)?\b/i.test(text) || /\blist of headings\b/i.test(text)
);
const isMatchingHeadingsQuestion = (question, groupInstruction = '') => {
  if (!question) return false;
  const originalType = question.extra_data_json?.original_type;
  if (question.question_type === 'MATCHING_HEADINGS' || originalType === 'MATCHING_HEADINGS') {
    return true;
  }
  return question.question_type === 'MATCHING' && isMatchingHeadingsInstruction(`${question.instruction || ''} ${groupInstruction}`);
};
const isSummaryCompletionQuestion = (question) =>
  ['FILL_IN_THE_BLANK', 'TABLE_COMPLETION', 'SUMMARY_COMPLETION', 'SUMMARY_COMPLETION_OPTIONS'].includes(question?.question_type);

const getQuestionInstruction = (question) => (
  question?.extra_data_json?.bulk_instruction || question?.instruction || ''
);
const getQuestionKind = (question, groupInstruction = '') => {
  if (isMatchingHeadingsQuestion(question, groupInstruction)) return 'matching';
  if (isSummaryCompletionQuestion(question)) return 'summary';
  return 'standard';
};
const getQuestionBlockKey = (question, kind) => (
  [
    kind,
    question?.extra_data_json?.bulk_source,
    getQuestionInstruction(question),
    question?.extra_data_json?.bulk_id,
  ].filter(Boolean).join('|') || `${kind}-${question?.id}`
);
const sortQuestionsByNumber = (questions = []) => (
  [...questions].sort((a, b) => Number(a.question_number || 0) - Number(b.question_number || 0))
);
const buildOrderedQuestionBlocks = (questions = [], groupInstruction = '') => {
  const sorted = sortQuestionsByNumber(questions);
  const blocks = [];
  const used = new Set();
  sorted.forEach((question) => {
    if (used.has(question.id)) return;
    const kind = getQuestionKind(question, groupInstruction);
    const blockKey = getQuestionBlockKey(question, kind);
    const blockQuestions = sorted.filter((candidate) => (
      !used.has(candidate.id) &&
      getQuestionKind(candidate, groupInstruction) === kind &&
      getQuestionBlockKey(candidate, kind) === blockKey
    ));
    blockQuestions.forEach((candidate) => used.add(candidate.id));
    blocks.push({
      id: blockKey,
      kind,
      instruction: getQuestionInstruction(question),
      questions: blockQuestions,
    });
  });
  return blocks;
};

const questions = [
  { id: '1', question_number: 1, question_type: 'TRUE_FALSE_NOT_GIVEN', instruction: 'Do the following statements agree...' },
  { id: '2', question_number: 2, question_type: 'TRUE_FALSE_NOT_GIVEN', instruction: 'Do the following statements agree...' },
  { id: '3', question_number: 3, question_type: 'YES_NO_NOT_GIVEN', instruction: 'Do the following statements agree... YES NO' },
  { id: '4', question_number: 4, question_type: 'YES_NO_NOT_GIVEN', instruction: 'Do the following statements agree... YES NO' }
];

console.log(JSON.stringify(buildOrderedQuestionBlocks(questions, ''), null, 2));

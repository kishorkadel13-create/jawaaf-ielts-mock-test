export const isMatchingHeadingsInstruction = (text = '') => (
  /\bheading(s)?\b/i.test(text) || /\blist of headings\b/i.test(text)
);

export const isMatchingHeadingsQuestion = (question: any, groupInstruction = '') => {
  if (!question) return false;

  const originalType = question.extra_data_json?.original_type;
  if (question.question_type === 'MATCHING_HEADINGS' || originalType === 'MATCHING_HEADINGS') {
    return true;
  }

  return question.question_type === 'MATCHING' && isMatchingHeadingsInstruction(`${question.instruction || ''} ${groupInstruction}`);
};

export const normalizeMatchingQuestionType = (question: any, groupInstruction = '') => {
  if (isMatchingHeadingsQuestion(question, groupInstruction)) {
    question.question_type = 'MATCHING_HEADINGS';
  }
};

export const getMatchingHeadingQuestion = (questions: any[] = [], groupInstruction = '') => (
  questions.find((question) => isMatchingHeadingsQuestion(question, groupInstruction) && question.options_json?.length)
);

export const getMatchingHeadingQuestions = (questions: any[] = [], groupInstruction = '') => (
  questions.filter((question) => isMatchingHeadingsQuestion(question, groupInstruction))
);

export function toRoman(num: number): string {
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

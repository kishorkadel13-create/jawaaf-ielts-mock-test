// Helper to clean and sanitize string inputs for comparison
export const cleanString = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // Replace double/triple spaces with single space
};

const expandWithOptionLetters = (answers = [], options = []) => {
  if (!Array.isArray(options) || options.length === 0) return answers.map(cleanString);

  const expanded = new Set();

  answers.forEach(answer => {
    const cleanedAnswer = cleanString(answer);
    if (!cleanedAnswer) return;

    expanded.add(cleanedAnswer);

    if (/^[a-z]$/.test(cleanedAnswer)) {
      const option = options[cleanedAnswer.charCodeAt(0) - 97];
      if (option) expanded.add(cleanString(option));
      return;
    }

    const optionIndex = options.findIndex(option => cleanString(option) === cleanedAnswer);
    if (optionIndex >= 0) {
      expanded.add(String.fromCharCode(97 + optionIndex));
    }
  });

  return Array.from(expanded);
};

export const scoreAnswer = (submittedAnswer, correctAnswers, questionType = '', options = [], marks = 1) => {
  if (!correctAnswers || !Array.isArray(correctAnswers) || correctAnswers.length === 0) {
    return 0;
  }

  if (questionType === 'MULTI_SELECT' && Array.isArray(submittedAnswer)) {
    const cleanedCorrect = expandWithOptionLetters(correctAnswers, options);
    const uniqueSubmitted = Array.from(new Set(submittedAnswer.map(cleanString).filter(Boolean)));
    const correctSelectedCount = uniqueSubmitted.filter(answer => cleanedCorrect.includes(answer)).length;

    return Math.min(Number(marks) || correctAnswers.length || 1, correctSelectedCount);
  }

  return evaluateAnswer(submittedAnswer, correctAnswers, questionType, options) ? (Number(marks) || 1) : 0;
};

// Auto-grade a single answer against correct options
export const evaluateAnswer = (submittedAnswer, correctAnswers, questionType = '', options = []) => {
  if (!correctAnswers || !Array.isArray(correctAnswers) || correctAnswers.length === 0) {
    return false;
  }

  // If correct answers are simple string arrays (e.g. ["A"] or ["TRUE"] or ["carbon dioxide", "co2"])
  if (Array.isArray(submittedAnswer)) {
    const cleanedSubmitted = submittedAnswer.map(s => cleanString(s));
    const cleanedCorrect = expandWithOptionLetters(correctAnswers, options);
    
    if (cleanedSubmitted.length !== cleanedCorrect.length) return false;

    if (questionType === 'MULTI_SELECT') {
      return cleanedSubmitted.length > 0 && cleanedSubmitted.every(val => cleanedCorrect.includes(val));
    }

    // Multi-blank and dropdown-blank answers are order-sensitive.
    return cleanedSubmitted.every((val, index) => val === cleanedCorrect[index]);
  }

  // Standard single string evaluation
  const submission = cleanString(submittedAnswer);
  const cleanedCorrect = expandWithOptionLetters(correctAnswers, options);
  
  // Return true if submission matches any of the accepted correct alternatives
  return cleanedCorrect.includes(submission);
};

// Map correct raw score (e.g., out of 40) to official IELTS Band Scores
export const convertScoreToIeltsBand = (correctCount, totalQuestions = 40) => {
  // Normalize score out of 40 if the test is short
  const normalizedScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 40) : 0;

  if (normalizedScore >= 39) return 9.0;
  if (normalizedScore >= 37) return 8.5;
  if (normalizedScore >= 35) return 8.0;
  if (normalizedScore >= 32) return 7.5;
  if (normalizedScore >= 30) return 7.0;
  if (normalizedScore >= 27) return 6.5;
  if (normalizedScore >= 23) return 6.0;
  if (normalizedScore >= 19) return 5.5;
  if (normalizedScore >= 15) return 5.0;
  if (normalizedScore >= 13) return 4.5;
  if (normalizedScore >= 10) return 4.0;
  if (normalizedScore >= 8)  return 3.5;
  if (normalizedScore >= 6)  return 3.0;
  if (normalizedScore >= 4)  return 2.5;
  if (normalizedScore >= 3)  return 2.0;
  if (normalizedScore >= 2)  return 1.5;
  if (normalizedScore >= 1)  return 1.0;
  
  return 0.0;
};

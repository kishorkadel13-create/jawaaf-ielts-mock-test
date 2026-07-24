import React from 'react';

export const renderFormattedText = (text: string, keyPrefix = 'formatted') => {
  if (!text) return null;

  const parts = text.split(/(\*\*[\s\S]+?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <React.Fragment key={`${keyPrefix}-${index}`}>{part.replace(/\*\*/g, '')}</React.Fragment>;
  });
};

export const stripBoldMarkers = (text: string) => text.replace(/\*\*/g, '');

export const splitQuestionInstruction = (instruction: string) => {
  const normalized = instruction.trim();

  if (!normalized) return { heading: '', body: '' };

  const match = normalized.match(/^\s*\*\*(Questions?\s*\d{1,2}(?:\s*[–-]\s*\d{1,2})?)(?:\*\*)?/i) ||
    normalized.match(/^\s*(Questions?\s*\d{1,2}(?:\s*[–-]\s*\d{1,2})?)/i);

  if (!match) return { heading: '', body: normalized };

  return {
    heading: stripBoldMarkers(match[1]).replace(/\s*[–-]\s*/g, '-'),
    body: normalized.slice(match[0].length).trim(),
  };
};

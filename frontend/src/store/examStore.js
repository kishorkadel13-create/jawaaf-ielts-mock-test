import { create } from 'zustand';
import { api } from '../services/api.js';

export const useExamStore = create((set, get) => ({
  activeTest: null,
  attemptId: null,
  answers: {},             // Record<question_id, any>
  secondsRemaining: 0,
  isActive: false,
  activeSectionIndex: 0,
  flaggedQuestions: [],   // list of question_ids
  autosaveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'
  isSubmitting: false,
  isFinished: false,

  // Initialize a new/resumed test session
  startExam: (test, attempt, resumedState = null) => {
    const localStorageKey = `jawaaf_exam_state_${attempt.id}`;
    let savedState = null;

    try {
      const serialized = localStorage.getItem(localStorageKey);
      if (serialized) {
        savedState = JSON.parse(serialized);
      }
    } catch (e) {
      console.warn('Failed to parse local storage cache:', e);
    }

    const sectionDurationTotal = Array.isArray(test.sections)
      ? test.sections.reduce((total, section) => total + (Number(section.duration) || 0), 0)
      : 0;
    const durationMinutes = Number(test.duration) || sectionDurationTotal || 60;
    const totalDurationSeconds = durationMinutes * 60;
    
    // Fallback: If resumed, calculate time elapsed or load cached values
    let answers = {};
    let secondsRemaining = totalDurationSeconds;
    let flaggedQuestions = [];
    let activeSectionIndex = 0;

    if (savedState && savedState.attemptId === attempt.id) {
      answers = savedState.answers || {};
      secondsRemaining = Math.min(savedState.secondsRemaining || totalDurationSeconds, totalDurationSeconds);
      flaggedQuestions = savedState.flaggedQuestions || [];
      activeSectionIndex = savedState.activeSectionIndex || 0;
    } else if (resumedState) {
      // Handle resuming state loaded directly from server if local storage is missing
      answers = resumedState.answers || {};
      secondsRemaining = resumedState.secondsRemaining || totalDurationSeconds;
    }

    set({
      activeTest: test,
      attemptId: attempt.id,
      answers,
      secondsRemaining,
      flaggedQuestions,
      activeSectionIndex,
      isActive: true,
      isFinished: false,
      isSubmitting: false,
      autosaveStatus: 'idle'
    });

    // Write primary local storage key
    get().saveToCache();
  },

  // Save state to local storage cache for offline resilience
  saveToCache: () => {
    const { attemptId, answers, secondsRemaining, flaggedQuestions, activeSectionIndex } = get();
    if (!attemptId) return;

    try {
      localStorage.setItem(`jawaaf_exam_state_${attemptId}`, JSON.stringify({
        attemptId,
        answers,
        secondsRemaining,
        flaggedQuestions,
        activeSectionIndex
      }));
    } catch (e) {
      console.warn('Failed to write to local storage cache:', e);
    }
  },

  // Update a student's answer in local state and cache
  setAnswer: (questionId, answer) => {
    const currentAnswers = { ...get().answers };
    
    // Clear key if answer is empty/blank
    if (answer === undefined || answer === null || answer === '') {
      delete currentAnswers[questionId];
    } else {
      currentAnswers[questionId] = answer;
    }

    set({ answers: currentAnswers });
    get().saveToCache();
  },

  // Toggle flagging status of a question
  toggleFlag: (questionId) => {
    const flagged = [...get().flaggedQuestions];
    const index = flagged.indexOf(questionId);
    
    if (index > -1) {
      flagged.splice(index, 1);
    } else {
      flagged.push(questionId);
    }

    set({ flaggedQuestions: flagged });
    get().saveToCache();
  },

  // Set the current section index
  setActiveSection: (index) => {
    set({ activeSectionIndex: index });
    get().saveToCache();
  },

  // Tick timer countdown
  tick: () => {
    const { secondsRemaining, isActive, isFinished } = get();
    if (!isActive || isFinished) return;

    if (secondsRemaining <= 1) {
      set({ secondsRemaining: 0, isActive: false });
      get().saveToCache();
      get().autoSubmit(); // Auto-submit when time reaches zero
    } else {
      set({ secondsRemaining: secondsRemaining - 1 });
      // Cache time every 5 seconds to reduce Disk IO
      if (secondsRemaining % 5 === 0) {
        get().saveToCache();
      }
    }
  },

  // Auto-saves answers to database REST api
  autosave: async () => {
    const { attemptId, answers, autosaveStatus, isFinished } = get();
    if (!attemptId || isFinished) return;

    try {
      set({ autosaveStatus: 'saving' });

      // Transform Record map into list format expected by API
      const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
        question_id: qId,
        answer: val
      }));

      await api.put(`/attempts/${attemptId}/save`, { answers: formattedAnswers });
      set({ autosaveStatus: 'saved' });
    } catch (err) {
      console.error('Autosave sync failed:', err);
      set({ autosaveStatus: 'error' });
    }
  },

  // Auto-submit triggers when timer expires
  autoSubmit: async () => {
    console.log('⏰ Timer expired! Triggering auto-submit...');
    await get().submitExam(true);
  },

  // Core submit exam method
  submitExam: async (isAutomatic = false) => {
    const { attemptId, answers, isSubmitting, isFinished } = get();
    if (!attemptId || isSubmitting || isFinished) return null;

    try {
      set({ isSubmitting: true, isActive: false });

      // 1. Force final save of all current answers first
      const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
        question_id: qId,
        answer: val
      }));

      await api.put(`/attempts/${attemptId}/save`, { answers: formattedAnswers });

      // 2. Trigger final submit & score grading API
      const { data } = await api.post(`/attempts/${attemptId}/submit`);

      set({
        isFinished: true,
        isSubmitting: false
      });

      // 3. Clear Local cache to prevent reload loop
      try {
        localStorage.removeItem(`jawaaf_exam_state_${attemptId}`);
      } catch (e) {
        // ignore
      }

      return data;
    } catch (err) {
      console.error('Submit Exam failed:', err);
      set({ isSubmitting: false, isActive: true }); // Unlock timer if submit failed
      throw err;
    }
  },

  // Resets store state
  resetExam: () => {
    set({
      activeTest: null,
      attemptId: null,
      answers: {},
      secondsRemaining: 0,
      isActive: false,
      activeSectionIndex: 0,
      flaggedQuestions: [],
      autosaveStatus: 'idle',
      isSubmitting: false,
      isFinished: false
    });
  }
}));

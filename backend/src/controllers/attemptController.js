import { supabaseAdmin } from '../config/supabase.js';
import { evaluateAnswer, scoreAnswer, convertScoreToIeltsBand } from '../services/scoreService.js';
import { createNotifications, notifyRoles } from '../services/notificationService.js';

const canReviewWriting = (user) => ['admin', 'teacher'].includes(user?.role);

const getAttemptMode = (sections = []) => {
  const sectionTypes = new Set(sections.map(section => section.type));
  return sections.length <= 1 || sectionTypes.size === 1 ? 'practice' : 'mock';
};

const getPracticeKind = (sections = []) => {
  const section = sections[0];
  const label = `${section?.title || ''}`.toLowerCase();
  if (section?.type === 'writing' && /task\s*1/.test(label)) return 'writing_task_1';
  if (section?.type === 'writing' && /task\s*2/.test(label)) return 'writing_task_2';
  if (section?.type === 'writing') return 'writing_combo';
  return section?.type || 'mock';
};

const getScoreValue = (attempt, feedback) => {
  const rawScore = feedback?.band_score ?? attempt?.score ?? 0;
  const score = Number(rawScore);
  return Number.isFinite(score) ? score : 0;
};

// 1. Initialize a new attempt for a mock test
export const startAttempt = async (req, res) => {
  try {
    const { mock_test_id } = req.body;
    const userId = req.user.id;
    const hasFullAccess = req.user.has_full_access;
    const isStudent = req.user.role === 'student';

    // Fetch mock test parameters
    const { data: test, error: testError } = await supabaseAdmin
      .from('mock_tests')
      .select('*')
      .eq('id', mock_test_id)
      .single();

    if (testError || !test) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Mock test not found.' });
    }

    // Verify student locks
    if (isStudent) {
      if (!test.is_published) {
        return res.status(403).json({ error: 'Forbidden', message: 'Test is not published.' });
      }
      if (!test.is_demo && !hasFullAccess) {
        return res.status(403).json({ error: 'PremiumLocked', message: 'Full subscription required.' });
      }
    }

    // Check if there is an uncompleted/active progress attempt for this test
    const { data: activeAttempt, error: activeError } = await supabaseAdmin
      .from('user_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('mock_test_id', mock_test_id)
      .eq('status', 'progress')
      .maybeSingle();

    if (activeAttempt) {
      // Resume existing active attempt
      return res.status(200).json({
        message: 'Resuming active exam attempt.',
        attempt: activeAttempt,
        resumed: true
      });
    }

    // Create a new progress attempt
    const { data: attempt, error: insertError } = await supabaseAdmin
      .from('user_attempts')
      .insert([{
        user_id: userId,
        mock_test_id,
        status: 'progress',
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({
      message: 'Exam attempt started successfully.',
      attempt,
      resumed: false
    });
  } catch (err) {
    console.error('startAttempt Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to start exam attempt.' });
  }
};

// 2. Autosave student answers in real-time (10s intervals)
export const saveAttemptAnswers = async (req, res) => {
  try {
    const { id } = req.params; // attempt_id
    const { answers } = req.body; // array of { question_id, answer }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'BadRequest', message: 'Answers payload must be an array.' });
    }

    // Verify attempt ownership
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('user_attempts')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Attempt record not found.' });
    }

    if (attempt.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    if (attempt.status === 'completed') {
      return res.status(400).json({ error: 'BadRequest', message: 'Cannot save answers to a submitted exam.' });
    }

    if (answers.length > 0) {
      // Format bulk upsert inputs
      const upsertData = answers.map(item => ({
        attempt_id: id,
        question_id: item.question_id,
        answer: item.answer,
        score: 0,
        is_correct: false
      }));

      const { error: upsertError } = await supabaseAdmin
        .from('attempt_answers')
        .upsert(upsertData, { onConflict: 'attempt_id,question_id' });

      if (upsertError) throw upsertError;
    }

    res.status(200).json({ message: 'Progress saved successfully.' });
  } catch (err) {
    console.error('saveAttemptAnswers Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to save progress.' });
  }
};

// 3. Final Submission & Automatic Score Grading
export const submitAttempt = async (req, res) => {
  try {
    const { id } = req.params; // attempt_id

    // Fetch active attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('user_attempts')
      .select('*')
      .eq('id', id)
      .single();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Attempt record not found.' });
    }

    if (attempt.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    if (attempt.status === 'completed') {
      return res.status(200).json({
        message: 'Exam was already submitted.',
        attempt
      });
    }

    // Fetch all test sections -> question groups -> questions for correct keys
    const { data: testSections, error: secError } = await supabaseAdmin
      .from('test_sections')
      .select('id')
      .eq('mock_test_id', attempt.mock_test_id);

    if (secError) throw secError;

    const sectionIds = testSections.map(s => s.id);
    let questions = [];

    if (sectionIds.length > 0) {
      const { data: groups, error: grpError } = await supabaseAdmin
        .from('question_groups')
        .select('id')
        .in('section_id', sectionIds);

      if (grpError) throw grpError;
      const groupIds = groups.map(g => g.id);

      if (groupIds.length > 0) {
        const { data: qList, error: qError } = await supabaseAdmin
          .from('questions')
          .select('*')
          .in('group_id', groupIds);

        if (qError) throw qError;
        questions = qList;
      }
    }

    // Fetch existing saved student answers
    const { data: savedAnswers, error: saveError } = await supabaseAdmin
      .from('attempt_answers')
      .select('*')
      .eq('attempt_id', id);

    if (saveError) throw saveError;

    let totalCorrect = 0;
    const gradingPayloads = [];

    const objectiveQuestions = questions.filter(question => question.question_type !== 'WRITING_TASK');
    const totalObjectiveMarks = objectiveQuestions.reduce((sum, question) => sum + (Number(question.marks) || 1), 0);

    // Grade objective questions in the test. Writing is saved for manual review.
    objectiveQuestions.forEach(question => {
      const saved = savedAnswers.find(sa => sa.question_id === question.id);
      const studentAns = saved ? saved.answer : null;
      
      const originalType = question.extra_data_json?.original_type || question.question_type;
      const questionScore = scoreAnswer(studentAns, question.correct_answers_json, originalType, question.options_json, question.marks);
      const isCorrect = questionScore >= (Number(question.marks) || 1) || evaluateAnswer(studentAns, question.correct_answers_json, originalType, question.options_json);
      
      totalCorrect += questionScore;

      gradingPayloads.push({
        attempt_id: id,
        question_id: question.id,
        answer: studentAns,
        is_correct: isCorrect,
        score: questionScore
      });
    });

    questions
      .filter(question => question.question_type === 'WRITING_TASK')
      .forEach(question => {
        const saved = savedAnswers.find(sa => sa.question_id === question.id);

        gradingPayloads.push({
          attempt_id: id,
          question_id: question.id,
          answer: saved ? saved.answer : null,
          is_correct: false,
          score: 0
        });
      });

    // Write final score details into attempt_answers (upserting scores)
    if (gradingPayloads.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('attempt_answers')
        .upsert(gradingPayloads, { onConflict: 'attempt_id,question_id' });

      if (upsertError) throw upsertError;
    }

    // Convert raw score to official IELTS Band
    const bandScore = convertScoreToIeltsBand(totalCorrect, totalObjectiveMarks || objectiveQuestions.length);

    // Update user_attempts header
    const { data: finalAttempt, error: finalError } = await supabaseAdmin
      .from('user_attempts')
      .update({
        status: 'completed',
        submitted_at: new Date().toISOString(),
        score: bandScore
      })
      .eq('id', id)
      .select()
      .single();

    if (finalError) throw finalError;

    if (questions.some(question => question.question_type === 'WRITING_TASK')) {
      const { data: test } = await supabaseAdmin
        .from('mock_tests')
        .select('title')
        .eq('id', attempt.mock_test_id)
        .maybeSingle();

      const notificationPayload = {
        actorId: req.user.id,
        type: 'writing_submitted',
        title: 'Writing submitted for review',
        body: `${req.user.full_name || req.user.email || 'A student'} submitted ${test?.title || 'a writing test'}.`,
        metadata: { attempt_id: id, mock_test_id: attempt.mock_test_id }
      };

      await Promise.all([
        notifyRoles({
          roles: ['teacher'],
          ...notificationPayload,
          link: '/teacher/reviews'
        }),
        notifyRoles({
          roles: ['admin'],
          ...notificationPayload,
          link: '/admin/submissions'
        })
      ]);
    }

    res.status(200).json({
      message: 'Exam submitted and graded successfully.',
      attempt: finalAttempt,
      correct_answers: totalCorrect,
      total_questions: objectiveQuestions.length,
      writing_tasks: questions.length - objectiveQuestions.length
    });
  } catch (err) {
    console.error('submitAttempt Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to submit exam attempt.' });
  }
};

// 4. Retrieve student past attempts history
export const getAttemptHistory = async (req, res) => {
  try {
    const summaryOnly = req.query.summary === '1' || req.query.summary === 'true';
    if (summaryOnly) {
      const { data, error } = await supabaseAdmin
        .from('user_attempts')
        .select('id, mock_test_id, status, submitted_at')
        .eq('user_id', req.user.id)
        .eq('status', 'completed')
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    const { data: attempts, error } = await supabaseAdmin
      .from('user_attempts')
      .select(`
        *,
        mock_tests (
          title,
          description,
          is_demo,
          duration
        )
      `)
      .eq('user_id', req.user.id)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    const attemptIds = (attempts || []).map(attempt => attempt.id);
    const testIds = [...new Set((attempts || []).map(attempt => attempt.mock_test_id).filter(Boolean))];

    let sections = [];
    let groups = [];
    let questions = [];
    let answers = [];
    let feedbackList = [];

    if (testIds.length > 0) {
      const { data: sectionList, error: sectionError } = await supabaseAdmin
        .from('test_sections')
        .select('id, mock_test_id, type, title, duration, order_no')
        .in('mock_test_id', testIds)
        .order('order_no', { ascending: true });

      if (sectionError) throw sectionError;
      sections = sectionList || [];

      const sectionIds = sections.map(section => section.id);
      if (sectionIds.length > 0) {
        const { data: groupList, error: groupError } = await supabaseAdmin
          .from('question_groups')
          .select('id, section_id')
          .in('section_id', sectionIds);

        if (groupError) throw groupError;
        groups = groupList || [];

        const groupIds = groups.map(group => group.id);
        if (groupIds.length > 0) {
          const { data: questionList, error: questionError } = await supabaseAdmin
            .from('questions')
            .select('id, group_id, question_type')
            .in('group_id', groupIds);

          if (questionError) throw questionError;
          questions = questionList || [];
        }
      }
    }

    if (attemptIds.length > 0) {
      const { data: answerRows, error: answerError } = await supabaseAdmin
        .from('attempt_answers')
        .select('attempt_id, question_id, is_correct')
        .in('attempt_id', attemptIds);

      if (answerError) throw answerError;
      answers = answerRows || [];

      const { data: feedbackRows, error: feedbackError } = await supabaseAdmin
        .from('writing_feedback')
        .select('*')
        .in('attempt_id', attemptIds);

      if (feedbackError) throw feedbackError;
      feedbackList = feedbackRows || [];
    }

    const sectionsByTestId = sections.reduce((acc, section) => {
      acc[section.mock_test_id] = acc[section.mock_test_id] || [];
      acc[section.mock_test_id].push(section);
      return acc;
    }, {});

    const groupsBySectionId = groups.reduce((acc, group) => {
      acc[group.section_id] = acc[group.section_id] || [];
      acc[group.section_id].push(group);
      return acc;
    }, {});

    const questionsByGroupId = questions.reduce((acc, question) => {
      acc[question.group_id] = acc[question.group_id] || [];
      acc[question.group_id].push(question);
      return acc;
    }, {});

    const feedbackByAttemptId = feedbackList.reduce((acc, feedback) => {
      acc[feedback.attempt_id] = feedback;
      return acc;
    }, {});

    const groupById = groups.reduce((acc, group) => {
      acc[group.id] = group;
      return acc;
    }, {});

    const questionById = questions.reduce((acc, question) => {
      acc[question.id] = question;
      return acc;
    }, {});

    const sectionById = sections.reduce((acc, section) => {
      acc[section.id] = section;
      return acc;
    }, {});

    const answersByAttemptId = answers.reduce((acc, answer) => {
      acc[answer.attempt_id] = acc[answer.attempt_id] || [];
      acc[answer.attempt_id].push(answer);
      return acc;
    }, {});

    const getSectionBand = (attemptId, sectionType) => {
      const sectionAnswers = (answersByAttemptId[attemptId] || []).filter(answer => {
        const question = questionById[answer.question_id];
        const group = question ? groupById[question.group_id] : null;
        const section = group ? sectionById[group.section_id] : null;
        return section?.type === sectionType && question?.question_type !== 'WRITING_TASK';
      });

      if (sectionAnswers.length === 0) return null;
      const correct = sectionAnswers.filter(answer => answer.is_correct).length;
      return convertScoreToIeltsBand(correct, sectionAnswers.length);
    };

    const formattedAttempts = (attempts || []).map(attempt => {
      const testSections = sectionsByTestId[attempt.mock_test_id] || [];
      const sectionSummaries = testSections.map(section => {
        const sectionGroups = groupsBySectionId[section.id] || [];
        const sectionQuestions = sectionGroups.flatMap(group => questionsByGroupId[group.id] || []);
        return {
          ...section,
          question_count: sectionQuestions.length,
          writing_task_count: sectionQuestions.filter(question => question.question_type === 'WRITING_TASK').length,
          objective_question_count: sectionQuestions.filter(question => question.question_type !== 'WRITING_TASK').length
        };
      });
      const writingTaskCount = sectionSummaries.reduce((total, section) => total + section.writing_task_count, 0);
      const objectiveQuestionCount = sectionSummaries.reduce((total, section) => total + section.objective_question_count, 0);
      const sectionTypes = new Set(sectionSummaries.map(section => section.type));
      const attemptMode = sectionSummaries.length <= 1 || sectionTypes.size === 1 ? 'practice' : 'mock';
      const feedback = feedbackByAttemptId[attempt.id] || null;
      const writingSection = sectionSummaries.some(section => section.type === 'writing');

      return {
        ...attempt,
        sections: sectionSummaries,
        attempt_mode: attemptMode,
        reading_score: getSectionBand(attempt.id, 'reading'),
        listening_score: getSectionBand(attempt.id, 'listening'),
        writing_score: feedback?.band_score ?? null,
        result_status: writingSection && !feedback ? 'Pending teacher review' : 'Ready',
        writing_task_count: writingTaskCount,
        objective_question_count: objectiveQuestionCount,
        review_status: writingTaskCount > 0
          ? feedback ? 'reviewed' : 'teacher_review_pending'
          : 'auto_graded',
        feedback
      };
    });

    res.status(200).json(formattedAttempts);
  } catch (err) {
    console.error('getAttemptHistory Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve history.' });
  }
};

// 5. Admin/teacher inbox for submitted attempts
export const getAdminAttemptInbox = async (req, res) => {
  try {
    if (!canReviewWriting(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Teacher access required.' });
    }

    const { data: attempts, error } = await supabaseAdmin
      .from('user_attempts')
      .select(`
        *,
        mock_tests (
          title,
          description,
          is_demo
        )
      `)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    const userIds = [...new Set((attempts || []).map(attempt => attempt.user_id).filter(Boolean))];
    const attemptIds = (attempts || []).map(attempt => attempt.id);
    const testIds = [...new Set((attempts || []).map(attempt => attempt.mock_test_id).filter(Boolean))];

    let profiles = [];
    if (userIds.length > 0) {
      const { data: profileList, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profileError) throw profileError;
      profiles = profileList || [];
    }

    let writingAnswers = [];
    let feedbackList = [];
    let sectionList = [];
    if (attemptIds.length > 0) {
      const { data: answerList, error: answerError } = await supabaseAdmin
        .from('attempt_answers')
        .select(`
          attempt_id,
          answer,
          questions!attempt_answers_question_id_fkey (
            question_type
          )
        `)
        .in('attempt_id', attemptIds);

      if (answerError) throw answerError;
      writingAnswers = (answerList || []).filter(item => item.questions?.question_type === 'WRITING_TASK');

      const { data: feedbackRows, error: feedbackError } = await supabaseAdmin
        .from('writing_feedback')
        .select('*')
        .in('attempt_id', attemptIds);

      if (feedbackError) throw feedbackError;
      feedbackList = feedbackRows || [];
    }

    if (testIds.length > 0) {
      const { data: sections, error: sectionError } = await supabaseAdmin
        .from('test_sections')
        .select('mock_test_id, type')
        .in('mock_test_id', testIds);

      if (sectionError) throw sectionError;
      sectionList = sections || [];
    }

    const profileById = profiles.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    const writingSummaryByAttemptId = writingAnswers.reduce((acc, item) => {
      const current = acc[item.attempt_id] || { writing_task_count: 0, answered_writing_tasks: 0 };
      current.writing_task_count += 1;
      if (String(item.answer || '').trim()) {
        current.answered_writing_tasks += 1;
      }
      acc[item.attempt_id] = current;
      return acc;
    }, {});

    const feedbackByAttemptId = feedbackList.reduce((acc, feedback) => {
      acc[feedback.attempt_id] = feedback;
      return acc;
    }, {});

    const sectionCountByTestId = sectionList.reduce((acc, section) => {
      acc[section.mock_test_id] = (acc[section.mock_test_id] || 0) + 1;
      return acc;
    }, {});

    const inbox = (attempts || [])
      .map(attempt => ({
        ...attempt,
        profiles: profileById[attempt.user_id] || null,
        feedback: feedbackByAttemptId[attempt.id] || null,
        writing_task_count: writingSummaryByAttemptId[attempt.id]?.writing_task_count || 0,
        answered_writing_tasks: writingSummaryByAttemptId[attempt.id]?.answered_writing_tasks || 0,
        attempt_mode: (sectionCountByTestId[attempt.mock_test_id] || 0) > 1 ? 'mock' : 'practice',
        review_status: feedbackByAttemptId[attempt.id]
          ? 'reviewed'
          : writingSummaryByAttemptId[attempt.id]?.writing_task_count
          ? 'teacher_review_pending'
          : 'auto_graded'
      }))
      .filter(attempt => attempt.writing_task_count > 0);

    res.status(200).json(inbox);
  } catch (err) {
    console.error('getAdminAttemptInbox Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve submitted attempts.' });
  }
};

export const submitWritingFeedback = async (req, res) => {
  try {
    if (!canReviewWriting(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Teacher access required.' });
    }

    const { id } = req.params;
    const {
      band_score,
      task_achievement_score,
      coherence_cohesion_score,
      lexical_resource_score,
      grammar_score,
      task_feedback,
      task_achievement,
      coherence_cohesion,
      lexical_resource,
      grammar,
      examiner_comments
    } = req.body;
    const normalizeScore = (value) => {
      if (value === undefined || value === null || value === '') return null;
      const score = Number(value);
      return Number.isFinite(score) ? score : null;
    };

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('user_attempts')
      .select('id, user_id, mock_test_id, mock_tests(title)')
      .eq('id', id)
      .single();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Attempt not found.' });
    }

    const { data: feedback, error } = await supabaseAdmin
      .from('writing_feedback')
      .upsert([{
        attempt_id: id,
        reviewed_by: req.user.id,
        band_score: normalizeScore(band_score),
        task_achievement_score: normalizeScore(task_achievement_score),
        coherence_cohesion_score: normalizeScore(coherence_cohesion_score),
        lexical_resource_score: normalizeScore(lexical_resource_score),
        grammar_score: normalizeScore(grammar_score),
        task_feedback: task_feedback && typeof task_feedback === 'object' ? task_feedback : {},
        task_achievement,
        coherence_cohesion,
        lexical_resource,
        grammar,
        examiner_comments,
        updated_at: new Date().toISOString()
      }], { onConflict: 'attempt_id' })
      .select()
      .single();

    if (error) throw error;

    await createNotifications([{
      user_id: attempt.user_id,
      actor_id: req.user.id,
      type: 'writing_feedback_ready',
      title: 'Writing feedback ready',
      body: `Your teacher has reviewed ${attempt.mock_tests?.title || 'your writing submission'}.`,
      link: `/attempts/${id}/result`,
      metadata: { attempt_id: id, mock_test_id: attempt.mock_test_id, band_score: feedback.band_score }
    }]);

    res.status(200).json({
      message: 'Writing feedback submitted successfully.',
      feedback
    });
  } catch (err) {
    console.error('submitWritingFeedback Error:', err);
    res.status(500).json({
      error: 'DatabaseError',
      message: err.message || 'Failed to submit writing feedback.',
      details: err.details || err.hint || null
    });
  }
};

export const getTeacherStudents = async (req, res) => {
  try {
    if (!canReviewWriting(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Teacher access required.' });
    }

    const { data: students, error: studentError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, has_full_access, created_at')
      .eq('role', 'student')
      .eq('has_full_access', true)
      .order('created_at', { ascending: false });

    if (studentError) throw studentError;

    const studentIds = (students || []).map(student => student.id);
    let attempts = [];
    let feedbackRows = [];
    let sections = [];

    if (studentIds.length > 0) {
      const { data: attemptRows, error: attemptError } = await supabaseAdmin
        .from('user_attempts')
        .select('id, user_id, mock_test_id, submitted_at, status, score, mock_tests(title, duration)')
        .in('user_id', studentIds)
        .eq('status', 'completed')
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (attemptError) throw attemptError;
      attempts = attemptRows || [];

      const attemptIds = attempts.map(attempt => attempt.id);
      const testIds = [...new Set(attempts.map(attempt => attempt.mock_test_id).filter(Boolean))];

      if (attemptIds.length > 0) {
        const { data: feedbackList, error: feedbackError } = await supabaseAdmin
          .from('writing_feedback')
          .select('id, attempt_id, band_score, updated_at')
          .in('attempt_id', attemptIds);

        if (feedbackError) throw feedbackError;
        feedbackRows = feedbackList || [];
      }

      if (testIds.length > 0) {
        const { data: sectionRows, error: sectionError } = await supabaseAdmin
          .from('test_sections')
          .select('id, mock_test_id, type, title, duration, order_no')
          .in('mock_test_id', testIds);

        if (sectionError) throw sectionError;
        sections = sectionRows || [];
      }
    }

    const sectionsByTestId = sections.reduce((acc, section) => {
      acc[section.mock_test_id] = acc[section.mock_test_id] || [];
      acc[section.mock_test_id].push(section);
      return acc;
    }, {});

    const feedbackByAttemptId = feedbackRows.reduce((acc, feedback) => {
      acc[feedback.attempt_id] = feedback;
      return acc;
    }, {});

    const attemptsByStudentId = attempts.reduce((acc, attempt) => {
      acc[attempt.user_id] = acc[attempt.user_id] || [];
      acc[attempt.user_id].push(attempt);
      return acc;
    }, {});

    const formattedStudents = (students || []).map(student => {
      const studentAttempts = attemptsByStudentId[student.id] || [];
      const scores = studentAttempts.map(attempt => getScoreValue(attempt, feedbackByAttemptId[attempt.id]));
      const practiceAttempts = studentAttempts.filter(attempt => getAttemptMode(sectionsByTestId[attempt.mock_test_id] || []) === 'practice');
      const mockAttempts = studentAttempts.filter(attempt => getAttemptMode(sectionsByTestId[attempt.mock_test_id] || []) === 'mock');
      const writingAttempts = studentAttempts.filter(attempt => (sectionsByTestId[attempt.mock_test_id] || []).some(section => section.type === 'writing'));
      const pendingWriting = writingAttempts.filter(attempt => !feedbackByAttemptId[attempt.id]).length;

      return {
        ...student,
        course: 'IELTS Preparation',
        overall_status: student.has_full_access ? 'Approved' : 'Limited',
        total_attempts: studentAttempts.length,
        mock_attempts: mockAttempts.length,
        practice_attempts: practiceAttempts.length,
        writing_attempts: writingAttempts.length,
        pending_writing_reviews: pendingWriting,
        average_score: scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) : 0,
        highest_score: scores.length ? Math.max(...scores) : 0,
        latest_activity: studentAttempts[0]?.submitted_at || null
      };
    });

    res.status(200).json(formattedStudents);
  } catch (err) {
    console.error('getTeacherStudents Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve student progress list.' });
  }
};

export const getTeacherStudentDetail = async (req, res) => {
  try {
    if (!canReviewWriting(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Teacher access required.' });
    }

    const { studentId } = req.params;

    const { data: student, error: studentError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, has_full_access, created_at')
      .eq('id', studentId)
      .eq('role', 'student')
      .eq('has_full_access', true)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Approved student not found.' });
    }

    const { data: attempts, error: attemptError } = await supabaseAdmin
      .from('user_attempts')
      .select('id, user_id, mock_test_id, started_at, submitted_at, status, score, mock_tests(title, description, duration)')
      .eq('user_id', studentId)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false, nullsFirst: false });

    if (attemptError) throw attemptError;

    const attemptRows = attempts || [];
    const attemptIds = attemptRows.map(attempt => attempt.id);
    const testIds = [...new Set(attemptRows.map(attempt => attempt.mock_test_id).filter(Boolean))];

    let sections = [];
    let groups = [];
    let questions = [];
    let answers = [];
    let feedbackRows = [];

    if (testIds.length > 0) {
      const { data: sectionRows, error: sectionError } = await supabaseAdmin
        .from('test_sections')
        .select('id, mock_test_id, type, title, duration, order_no')
        .in('mock_test_id', testIds)
        .order('order_no', { ascending: true });

      if (sectionError) throw sectionError;
      sections = sectionRows || [];

      const sectionIds = sections.map(section => section.id);
      if (sectionIds.length > 0) {
        const { data: groupRows, error: groupError } = await supabaseAdmin
          .from('question_groups')
          .select('id, section_id')
          .in('section_id', sectionIds);

        if (groupError) throw groupError;
        groups = groupRows || [];

        const groupIds = groups.map(group => group.id);
        if (groupIds.length > 0) {
          const { data: questionRows, error: questionError } = await supabaseAdmin
            .from('questions')
            .select('id, group_id, question_type')
            .in('group_id', groupIds);

          if (questionError) throw questionError;
          questions = questionRows || [];
        }
      }
    }

    if (attemptIds.length > 0) {
      const { data: answerRows, error: answerError } = await supabaseAdmin
        .from('attempt_answers')
        .select('attempt_id, question_id, answer, is_correct')
        .in('attempt_id', attemptIds);

      if (answerError) throw answerError;
      answers = answerRows || [];

      const { data: feedbackList, error: feedbackError } = await supabaseAdmin
        .from('writing_feedback')
        .select('*')
        .in('attempt_id', attemptIds);

      if (feedbackError) throw feedbackError;
      feedbackRows = feedbackList || [];
    }

    const sectionsByTestId = sections.reduce((acc, section) => {
      acc[section.mock_test_id] = acc[section.mock_test_id] || [];
      acc[section.mock_test_id].push(section);
      return acc;
    }, {});
    const groupById = groups.reduce((acc, group) => {
      acc[group.id] = group;
      return acc;
    }, {});
    const questionById = questions.reduce((acc, question) => {
      acc[question.id] = question;
      return acc;
    }, {});
    const feedbackByAttemptId = feedbackRows.reduce((acc, feedback) => {
      acc[feedback.attempt_id] = feedback;
      return acc;
    }, {});
    const answersByAttemptId = answers.reduce((acc, answer) => {
      acc[answer.attempt_id] = acc[answer.attempt_id] || [];
      acc[answer.attempt_id].push(answer);
      return acc;
    }, {});

    const getSectionBand = (attemptId, sectionType) => {
      const sectionAnswers = (answersByAttemptId[attemptId] || []).filter(answer => {
        const question = questionById[answer.question_id];
        const group = question ? groupById[question.group_id] : null;
        const section = group ? sections.find(item => item.id === group.section_id) : null;
        return section?.type === sectionType && question?.question_type !== 'WRITING_TASK';
      });

      if (sectionAnswers.length === 0) return null;
      const correct = sectionAnswers.filter(answer => answer.is_correct).length;
      return convertScoreToIeltsBand(correct, sectionAnswers.length);
    };

    const formattedAttempts = attemptRows.map(attempt => {
      const attemptSections = sectionsByTestId[attempt.mock_test_id] || [];
      const attemptMode = getAttemptMode(attemptSections);
      const practiceKind = getPracticeKind(attemptSections);
      const feedback = feedbackByAttemptId[attempt.id] || null;
      const writingSection = attemptSections.some(section => section.type === 'writing');
      const timeTakenMinutes = attempt.started_at && attempt.submitted_at
        ? Math.max(0, Math.round((new Date(attempt.submitted_at) - new Date(attempt.started_at)) / 60000))
        : null;

      return {
        ...attempt,
        sections: attemptSections,
        attempt_mode: attemptMode,
        practice_kind: practiceKind,
        time_taken_minutes: timeTakenMinutes,
        reading_score: getSectionBand(attempt.id, 'reading'),
        listening_score: getSectionBand(attempt.id, 'listening'),
        writing_status: writingSection ? feedback ? 'Checked' : 'Pending' : 'N/A',
        writing_score: feedback?.band_score ?? null,
        result_status: writingSection && !feedback ? 'Pending teacher review' : 'Ready',
        feedback
      };
    });

    const mockHistory = formattedAttempts.filter(attempt => attempt.attempt_mode === 'mock');
    const practiceHistory = formattedAttempts.filter(attempt => attempt.attempt_mode === 'practice');
    const writingEvaluations = formattedAttempts
      .filter(attempt => attempt.sections.some(section => section.type === 'writing'))
      .map(attempt => ({
        attempt_id: attempt.id,
        test_name: attempt.mock_tests?.title || 'Writing practice',
        submitted_at: attempt.submitted_at,
        status: attempt.writing_status,
        teacher_band_score: attempt.writing_score,
        teacher_feedback: attempt.feedback?.examiner_comments || '',
        review_date: attempt.feedback?.updated_at || null
      }));

    const scores = formattedAttempts
      .filter(attempt => attempt.result_status === 'Ready')
      .map(attempt => getScoreValue(attempt, attempt.feedback));
    const readingScores = formattedAttempts.map(attempt => attempt.reading_score).filter(score => score !== null);
    const listeningScores = formattedAttempts.map(attempt => attempt.listening_score).filter(score => score !== null);
    const writingScores = formattedAttempts.map(attempt => Number(attempt.writing_score)).filter(score => Number.isFinite(score));
    const average = (items) => items.length ? Number((items.reduce((sum, score) => sum + Number(score), 0) / items.length).toFixed(1)) : 0;
    const latestActivity = formattedAttempts[0]?.submitted_at || student.created_at;
    const progressTrend = [...formattedAttempts]
      .reverse()
      .map(attempt => ({
        date: attempt.submitted_at,
        score: getScoreValue(attempt, attempt.feedback),
        label: attempt.mock_tests?.title || 'Attempt'
      }));
    const recentActivities = formattedAttempts.slice(0, 12).map(attempt => ({
      id: attempt.id,
      type: attempt.sections.some(section => section.type === 'writing')
        ? attempt.feedback ? 'Writing Reviewed' : 'Writing Submitted'
        : attempt.attempt_mode === 'mock' ? 'Mock Test Completed' : 'Practice Test Completed',
      title: attempt.mock_tests?.title || 'IELTS activity',
      at: attempt.feedback?.updated_at || attempt.submitted_at,
      status: attempt.result_status
    }));

    const summary = {
      total_mock_tests: mockHistory.length,
      total_practice_tests: practiceHistory.length,
      reading_practice_count: practiceHistory.filter(attempt => attempt.practice_kind === 'reading').length,
      listening_practice_count: practiceHistory.filter(attempt => attempt.practice_kind === 'listening').length,
      writing_practice_count: practiceHistory.filter(attempt => String(attempt.practice_kind).startsWith('writing')).length,
      average_overall_score: average(scores),
      highest_score: scores.length ? Math.max(...scores) : 0,
      latest_activity: latestActivity,
      pending_writing_reviews: writingEvaluations.filter(item => item.status === 'Pending').length,
      checked_essays: writingEvaluations.filter(item => item.status === 'Checked').length,
      estimated_bands: {
        reading: average(readingScores),
        listening: average(listeningScores),
        writing: average(writingScores),
        overall: average([
          average(readingScores),
          average(listeningScores),
          average(writingScores)
        ].filter(score => score > 0))
      }
    };

    res.status(200).json({
      student: {
        ...student,
        course: 'IELTS Preparation',
        overall_status: student.has_full_access ? 'Approved' : 'Limited'
      },
      summary,
      mock_history: mockHistory,
      practice_history: practiceHistory,
      writing_evaluations: writingEvaluations,
      analytics: {
        progress_trend: progressTrend,
        section_performance: [
          { section: 'Reading', score: summary.estimated_bands.reading },
          { section: 'Listening', score: summary.estimated_bands.listening },
          { section: 'Writing', score: summary.estimated_bands.writing }
        ],
        total_study_activity: formattedAttempts.length
      },
      recent_activities: recentActivities
    });
  } catch (err) {
    console.error('getTeacherStudentDetail Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve student performance dashboard.' });
  }
};

// 6. Retrieve attempt answers and correct keys for answer review page
export const getAttemptReview = async (req, res) => {
  try {
    const { id } = req.params; // attempt_id

    // Fetch attempt details
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('user_attempts')
      .select('*, mock_tests(title)')
      .eq('id', id)
      .single();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Attempt not found.' });
    }

    // Security: Student can only view their own history; admins can view anyone's
    if (attempt.user_id !== req.user.id && !canReviewWriting(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    // Fetch review list (questions + correct keys + student answers)
    const { data: answers, error: ansError } = await supabaseAdmin
      .from('attempt_answers')
      .select(`
        id,
        question_id,
        answer,
        is_correct,
        score,
        questions!attempt_answers_question_id_fkey (
          question_number,
          question_text,
          instruction,
          options_json,
          correct_answers_json,
          extra_data_json,
          question_type,
          marks
        )
      `)
      .eq('attempt_id', id);

    if (ansError) throw ansError;

    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from('writing_feedback')
      .select('*')
      .eq('attempt_id', id)
      .maybeSingle();

    if (feedbackError) throw feedbackError;

    const { data: sections, error: sectionError } = await supabaseAdmin
      .from('test_sections')
      .select('id, type')
      .eq('mock_test_id', attempt.mock_test_id);

    if (sectionError) throw sectionError;

    const attemptMode = (sections || []).length > 1 ? 'mock' : 'practice';
    const hasWriting = answers.some(item => item.questions.question_type === 'WRITING_TASK');
    const canViewFullResults = !hasWriting || Boolean(feedback) || canReviewWriting(req.user);

    // Fetch the active mock test details to structure sections if needed
    res.status(200).json({
      attempt,
      feedback,
      attempt_mode: attemptMode,
      can_view_results: canViewFullResults,
      answers: answers.map(item => {
        const questionType = item.questions.question_type;
        const marks = Number(item.questions.marks) || 1;
        const liveScore = questionType === 'WRITING_TASK'
          ? Number(item.score) || 0
          : scoreAnswer(item.answer, item.questions.correct_answers_json, questionType, item.questions.options_json, marks);
        const liveIsCorrect = questionType === 'WRITING_TASK'
          ? item.is_correct
          : liveScore >= marks || evaluateAnswer(item.answer, item.questions.correct_answers_json, questionType, item.questions.options_json);

        return {
          id: item.id,
          question_id: item.question_id,
          student_answer: item.answer,
          is_correct: liveIsCorrect,
          score: liveScore,
          marks,
          question_number: item.questions.question_number,
          question_text: item.questions.question_text,
          instruction: item.questions.instruction,
          options: item.questions.options_json,
          correct_answers: item.questions.correct_answers_json,
          extra_data: item.questions.extra_data_json,
          question_type: questionType
        };
      }).sort((a, b) => a.question_number - b.question_number)
    });
  } catch (err) {
    console.error('getAttemptReview Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to load attempt review.' });
  }
};

import { supabaseAdmin } from '../config/supabase.js';
import { evaluateAnswer, convertScoreToIeltsBand } from '../services/scoreService.js';

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

    // Grade each question in the test
    questions.forEach(question => {
      const saved = savedAnswers.find(sa => sa.question_id === question.id);
      const studentAns = saved ? saved.answer : null;
      
      const originalType = question.extra_data_json?.original_type || question.question_type;
      const isCorrect = evaluateAnswer(studentAns, question.correct_answers_json, originalType);
      const questionScore = isCorrect ? question.marks : 0;
      
      if (isCorrect) {
        totalCorrect += question.marks;
      }

      gradingPayloads.push({
        attempt_id: id,
        question_id: question.id,
        answer: studentAns,
        is_correct: isCorrect,
        score: questionScore
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
    const bandScore = convertScoreToIeltsBand(totalCorrect, questions.length);

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

    res.status(200).json({
      message: 'Exam submitted and graded successfully.',
      attempt: finalAttempt,
      correct_answers: totalCorrect,
      total_questions: questions.length
    });
  } catch (err) {
    console.error('submitAttempt Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to submit exam attempt.' });
  }
};

// 4. Retrieve student past attempts history
export const getAttemptHistory = async (req, res) => {
  try {
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
      .eq('user_id', req.user.id)
      .order('submitted_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    res.status(200).json(attempts);
  } catch (err) {
    console.error('getAttemptHistory Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve history.' });
  }
};

// 5. Retrieve attempt answers and correct keys for answer review page
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
    if (attempt.user_id !== req.user.id && req.user.role !== 'admin') {
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
          question_type
        )
      `)
      .eq('attempt_id', id);

    if (ansError) throw ansError;

    // Fetch the active mock test details to structure sections if needed
    res.status(200).json({
      attempt,
      answers: answers.map(item => ({
        id: item.id,
        question_id: item.question_id,
        student_answer: item.answer,
        is_correct: item.is_correct,
        score: item.score,
        question_number: item.questions.question_number,
        question_text: item.questions.question_text,
        instruction: item.questions.instruction,
        options: item.questions.options_json,
        correct_answers: item.questions.correct_answers_json,
        extra_data: item.questions.extra_data_json,
        question_type: item.questions.question_type
      })).sort((a, b) => a.question_number - b.question_number)
    });
  } catch (err) {
    console.error('getAttemptReview Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to load attempt review.' });
  }
};

import { supabaseAdmin } from '../config/supabase.js';

const TFNG_ANSWERS = new Set(['TRUE', 'FALSE', 'NOT GIVEN']);

const isStaff = (user) => ['admin', 'teacher'].includes(user?.role);

const ensureStudentAccess = (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Login required.' });
    return false;
  }
  if (req.user.role === 'student' && !req.user.has_full_access) {
    res.status(403).json({ error: 'PremiumAccessRequired', message: 'TFNG Mastery requires approved premium access.' });
    return false;
  }
  return true;
};

const normalizeAnswer = (value) => {
  const normalized = String(value || '').trim().toUpperCase().replace(/[_-]+/g, ' ');
  if (normalized === 'NOTGIVEN') return 'NOT GIVEN';
  return TFNG_ANSWERS.has(normalized) ? normalized : null;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isMissingSetNoColumn = (error) => {
  const message = String(error?.message || error?.details || '');
  return message.includes('set_no') && (
    message.includes('does not exist') ||
    message.includes('Could not find') ||
    message.includes('schema cache')
  );
};

const getPublishedEvolutions = async () => {
  const { data, error } = await supabaseAdmin
    .from('tfng_mastery_evolutions')
    .select('*')
    .eq('is_published', true)
    .order('order_no', { ascending: true })
    .order('evolution_number', { ascending: true });
  if (error) throw error;
  return data || [];
};

const getEvolution = async (evolutionId) => {
  const { data, error } = await supabaseAdmin
    .from('tfng_mastery_evolutions')
    .select('*')
    .eq('id', evolutionId)
    .single();
  if (error) throw error;
  return data;
};

const getEvolutionPassageLinks = async (evolutionId, setNo = null) => {
  let query = supabaseAdmin
    .from('tfng_mastery_evolution_passages')
    .select('id, evolution_id, passage_id, set_no, order_no, passage:tfng_mastery_passages(*)')
    .eq('evolution_id', evolutionId);

  if (setNo) {
    query = query.eq('set_no', setNo);
  }

  const { data, error } = await query.order('order_no', { ascending: true });
  if (error && isMissingSetNoColumn(error)) {
    if (setNo && setNo !== 1) return [];
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('tfng_mastery_evolution_passages')
      .select('id, evolution_id, passage_id, order_no, passage:tfng_mastery_passages(*)')
      .eq('evolution_id', evolutionId)
      .order('order_no', { ascending: true });
    if (fallbackError) throw fallbackError;
    return (fallbackData || []).map(item => ({ ...item, set_no: 1 }));
  }
  if (error) throw error;
  return data || [];
};

const getPassageQuestions = async (passageId) => {
  const { data, error } = await supabaseAdmin
    .from('tfng_mastery_questions')
    .select('*')
    .eq('passage_id', passageId)
    .order('order_no', { ascending: true });
  if (error) throw error;
  return data || [];
};

const getPlayableEvolutionPassageLinks = async (evolutionId, setNo = 1) => {
  let links = await getEvolutionPassageLinks(evolutionId, setNo);
  if (links.length === 0 && setNo !== 1) {
    links = await getEvolutionPassageLinks(evolutionId, 1);
  }
  const playableLinks = [];

  for (const link of links) {
    if (link.passage?.is_published === false) continue;
    const questions = await getPassageQuestions(link.passage_id);
    if (questions.length > 0) {
      playableLinks.push({ ...link, questions });
    }
  }

  return playableLinks;
};

const getPlayablePublishedEvolutions = async () => {
  const evolutions = await getPublishedEvolutions();
  const playable = [];

  for (const evolution of evolutions) {
    const links = await getPlayableEvolutionPassageLinks(evolution.id, 1);
    if (links.length > 0) {
      playable.push({ ...evolution, playable_passages_count: links.length });
    }
  }

  return playable;
};

const getAttemptWithEvolution = async (attemptId, userId) => {
  const { data, error } = await supabaseAdmin
    .from('tfng_mastery_evolution_attempts')
    .select('*, evolution:tfng_mastery_evolutions(*)')
    .eq('id', attemptId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
};

const getActiveAttempt = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('tfng_mastery_evolution_attempts')
    .select('*, evolution:tfng_mastery_evolutions(*)')
    .eq('user_id', userId)
    .in('status', ['design', 'in_progress', 'performance', 'failed_locked'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const getAttemptPassageAttempts = async (evolutionAttemptId) => {
  const { data, error } = await supabaseAdmin
    .from('tfng_mastery_passage_attempts')
    .select('*')
    .eq('evolution_attempt_id', evolutionAttemptId)
    .order('passage_order', { ascending: true });
  if (error) throw error;
  return data || [];
};

const calculateAttemptStats = async (evolutionAttemptId) => {
  const passageAttempts = await getAttemptPassageAttempts(evolutionAttemptId);
  const submittedPassages = passageAttempts.filter(item => ['submitted', 'expired'].includes(item.status));

  const totals = submittedPassages.reduce((acc, item) => {
    acc.passages_completed += 1;
    acc.total_questions += toNumber(item.total_questions);
    acc.questions_attempted += toNumber(item.correct_answers) + toNumber(item.wrong_answers);
    acc.correct_answers += toNumber(item.correct_answers);
    acc.wrong_answers += toNumber(item.wrong_answers);
    acc.unanswered_questions += toNumber(item.unanswered_questions);
    acc.time_used_seconds += toNumber(item.time_used_seconds);
    acc.xp_earned += toNumber(item.xp_awarded);
    return acc;
  }, {
    passages_completed: 0,
    total_questions: 0,
    questions_attempted: 0,
    correct_answers: 0,
    wrong_answers: 0,
    unanswered_questions: 0,
    time_used_seconds: 0,
    xp_earned: 0
  });

  return {
    ...totals,
    accuracy: totals.total_questions > 0
      ? Number(((totals.correct_answers / totals.total_questions) * 100).toFixed(2))
      : 0
  };
};

const getDecision = (attempt, stats) => {
  const requiredAccuracy = toNumber(attempt.evolution.first_attempt_required_accuracy, 60);
  return stats.accuracy >= requiredAccuracy
    ? 'unlock_next'
    : 'repeat_evolution';
};

const buildHootyComment = (decision, stats) => {
  if (decision === 'unlock_next') {
    return `Great work! ${stats.accuracy}% accuracy means you are ready for the next Hooty evolution.`;
  }
  if (decision === 'repeat_evolution') {
    return "Good effort! You're getting closer. Let's strengthen your TFNG skills before moving to the next evolution.";
  }
  return 'You worked hard. Please contact your instructor so they can guide your next practice step.';
};

const buildAttemptPayload = async (attempt) => {
  const links = await getPlayableEvolutionPassageLinks(attempt.evolution_id, attempt.attempt_no || 1);
  const nextLink = links.find(link => link.order_no === attempt.current_passage_order) || links[0] || null;
  return {
    attempt,
    evolution: attempt.evolution || await getEvolution(attempt.evolution_id),
    total_passages: links.length,
    current_passage_order: attempt.current_passage_order,
    current_passage: nextLink ? {
      id: nextLink.passage_id,
      order_no: nextLink.order_no,
      title: nextLink.passage?.title
    } : null,
    progress: {
      passages_completed: attempt.passages_completed,
      total_passages: attempt.total_passages || links.length,
      accuracy: attempt.accuracy,
      xp_earned: attempt.xp_earned,
      status: attempt.status,
      decision: attempt.decision
    }
  };
};

const createEvolutionAttempt = async ({ userId, evolution, attemptNo = 1 }) => {
  const links = await getPlayableEvolutionPassageLinks(evolution.id, attemptNo);
  if (links.length === 0) {
    const error = new Error('This TFNG level needs at least one published passage with questions before students can start.');
    error.status = 409;
    throw error;
  }
  const totalQuestions = links.map(link => link.questions || []);
  const { data, error } = await supabaseAdmin
    .from('tfng_mastery_evolution_attempts')
    .insert([{
      user_id: userId,
      evolution_id: evolution.id,
      attempt_no: attemptNo,
      status: 'design',
      current_passage_order: 1,
      total_passages: links.length,
      total_questions: totalQuestions.reduce((sum, questions) => sum + questions.length, 0),
      decision: 'pending'
    }])
    .select('*, evolution:tfng_mastery_evolutions(*)')
    .single();
  if (error) throw error;
  return data;
};

export const getTfngMasteryOverview = async (req, res) => {
  try {
    if (!ensureStudentAccess(req, res)) return;

    const evolutions = await getPlayablePublishedEvolutions();
    const { data: attempts, error } = await supabaseAdmin
      .from('tfng_mastery_evolution_attempts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('started_at', { ascending: false });
    if (error) throw error;

    const attemptsByEvolution = (attempts || []).reduce((acc, attempt) => {
      acc[attempt.evolution_id] = acc[attempt.evolution_id] || [];
      acc[attempt.evolution_id].push(attempt);
      return acc;
    }, {});

    let unlocked = true;
    const mapped = evolutions.map(evolution => {
      const evolutionAttempts = attemptsByEvolution[evolution.id] || [];
      const activeAttempt = evolutionAttempts.find(item => ['design', 'in_progress', 'performance', 'failed_locked'].includes(item.status)) || null;
      const completedAttempt = evolutionAttempts.find(item => item.status === 'completed') || null;
      const status = completedAttempt
        ? 'completed'
        : activeAttempt
        ? activeAttempt.status === 'failed_locked' ? 'contact_instructor' : 'active'
        : unlocked ? 'available' : 'locked';

      if (!completedAttempt) unlocked = false;

      return {
        ...evolution,
        student_status: status,
        active_attempt_id: activeAttempt?.id || null,
        attempts: evolutionAttempts.length,
        accuracy: activeAttempt?.accuracy ?? completedAttempt?.accuracy ?? 0,
        xp_earned: activeAttempt?.xp_earned ?? completedAttempt?.xp_earned ?? 0
      };
    });

    res.status(200).json({
      evolutions: mapped,
      active_attempt: await getActiveAttempt(req.user.id),
      total_xp: (attempts || []).reduce((sum, item) => sum + toNumber(item.xp_earned), 0)
    });
  } catch (err) {
    console.error('getTfngMasteryOverview Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to load TFNG Mastery overview.' });
  }
};

export const startOrResumeTfngMastery = async (req, res) => {
  try {
    if (!ensureStudentAccess(req, res)) return;

    const activeAttempt = await getActiveAttempt(req.user.id);
    if (activeAttempt) {
      const activeLinks = await getPlayableEvolutionPassageLinks(activeAttempt.evolution_id, activeAttempt.attempt_no || 1);
      if (activeLinks.length === 0) {
        return res.status(409).json({
          error: 'SetupIncomplete',
          message: 'This TFNG level needs at least one published passage with saved questions before students can start.'
        });
      }
      return res.status(200).json(await buildAttemptPayload(activeAttempt));
    }

    const evolutions = await getPlayablePublishedEvolutions();
    if (evolutions.length === 0) {
      return res.status(404).json({
        error: 'NoReadyEvolution',
        message: 'No Reading Mastery level is ready yet. Please add a level, at least one passage, and questions from admin.'
      });
    }

    const { data: completed, error } = await supabaseAdmin
      .from('tfng_mastery_evolution_attempts')
      .select('evolution_id')
      .eq('user_id', req.user.id)
      .eq('status', 'completed');
    if (error) throw error;

    const completedIds = new Set((completed || []).map(item => item.evolution_id));
    const nextEvolution = evolutions.find(evolution => !completedIds.has(evolution.id));
    if (!nextEvolution) {
      return res.status(200).json({
        next_page: 'complete_mastery',
        message: 'All TFNG Mastery evolutions are complete.',
        evolutions_completed: evolutions.length
      });
    }
    const attempt = await createEvolutionAttempt({ userId: req.user.id, evolution: nextEvolution });

    res.status(201).json(await buildAttemptPayload(attempt));
  } catch (err) {
    console.error('startOrResumeTfngMastery Error:', err);
    res.status(err.status || 500).json({
      error: err.status === 409 ? 'SetupIncomplete' : 'DatabaseError',
      message: err.status === 409 ? err.message : 'Failed to start TFNG Mastery.'
    });
  }
};

export const getTfngDesignPage = async (req, res) => {
  try {
    if (!ensureStudentAccess(req, res)) return;
    const attempt = await getAttemptWithEvolution(req.params.attemptId, req.user.id);
    const playableLinks = await getPlayableEvolutionPassageLinks(attempt.evolution_id, attempt.attempt_no || 1);
    if (playableLinks.length === 0) {
      return res.status(409).json({
        error: 'SetupIncomplete',
        message: 'This TFNG level needs at least one published passage with saved questions before students can start.'
      });
    }
    const evolutions = await getPlayablePublishedEvolutions();
    const currentIndex = evolutions.findIndex(item => item.id === attempt.evolution_id);
    res.status(200).json({
      ...(await buildAttemptPayload(attempt)),
      next_evolution: currentIndex >= 0 ? evolutions[currentIndex + 1] || null : null
    });
  } catch (err) {
    console.error('getTfngDesignPage Error:', err);
    res.status(404).json({ error: 'NotFound', message: 'TFNG Mastery attempt was not found.' });
  }
};

export const getTfngCurrentPractice = async (req, res) => {
  try {
    if (!ensureStudentAccess(req, res)) return;
    const attempt = await getAttemptWithEvolution(req.params.attemptId, req.user.id);
    if (attempt.status === 'performance' || attempt.status === 'failed_locked') {
      return res.status(409).json({ error: 'PerformanceRequired', message: 'This evolution attempt is waiting on the Overall Performance page.' });
    }

    const links = await getPlayableEvolutionPassageLinks(attempt.evolution_id, attempt.attempt_no || 1);
    const link = links.find(item => item.order_no === attempt.current_passage_order);
    if (!link) {
      return res.status(404).json({ error: 'NoCurrentPassage', message: 'No current passage is available for this evolution.' });
    }

    let { data: passageAttempt, error: attemptError } = await supabaseAdmin
      .from('tfng_mastery_passage_attempts')
      .select('*')
      .eq('evolution_attempt_id', attempt.id)
      .eq('passage_id', link.passage_id)
      .maybeSingle();
    if (attemptError) throw attemptError;

    if (!passageAttempt) {
      const questions = link.questions || await getPassageQuestions(link.passage_id);
      const { data: created, error: createError } = await supabaseAdmin
        .from('tfng_mastery_passage_attempts')
        .insert([{
          evolution_attempt_id: attempt.id,
          passage_id: link.passage_id,
          passage_order: link.order_no,
          timer_seconds: attempt.evolution.timer_seconds,
          total_questions: questions.length
        }])
        .select('*')
        .single();
      if (createError) throw createError;
      passageAttempt = created;
      await supabaseAdmin
        .from('tfng_mastery_evolution_attempts')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', attempt.id);
    }

    const questions = link.questions || await getPassageQuestions(link.passage_id);
    res.status(200).json({
      attempt,
      passage_attempt: passageAttempt,
      passage: link.passage,
      questions: questions.map(question => ({
        id: question.id,
        question_number: question.question_number,
        question_text: question.question_text,
        order_no: question.order_no
      })),
      timer_seconds: passageAttempt.timer_seconds,
      progress: {
        current_passage_order: attempt.current_passage_order,
        total_passages: links.length,
        passages_completed: attempt.passages_completed
      }
    });
  } catch (err) {
    console.error('getTfngCurrentPractice Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to load TFNG practice passage.' });
  }
};

export const saveTfngPassageAnswers = async (req, res) => {
  try {
    if (!ensureStudentAccess(req, res)) return;
    const passageAttempt = await getOwnedPassageAttempt(req.params.passageAttemptId, req.user.id);
    if (passageAttempt.status !== 'in_progress') {
      return res.status(409).json({ error: 'AlreadySubmitted', message: 'This passage has already been submitted.' });
    }

    const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const rows = Object.entries(answers)
      .map(([questionId, value]) => ({ questionId, studentAnswer: normalizeAnswer(value) }))
      .filter(item => item.studentAnswer);

    for (const row of rows) {
      await supabaseAdmin
        .from('tfng_mastery_answers')
        .upsert([{
          passage_attempt_id: passageAttempt.id,
          question_id: row.questionId,
          student_answer: row.studentAnswer,
          is_correct: false,
          score: 0,
          answered_at: new Date().toISOString()
        }], { onConflict: 'passage_attempt_id,question_id' });
    }

    res.status(200).json({ saved: rows.length });
  } catch (err) {
    console.error('saveTfngPassageAnswers Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to save TFNG answers.' });
  }
};

const getOwnedPassageAttempt = async (passageAttemptId, userId) => {
  const { data, error } = await supabaseAdmin
    .from('tfng_mastery_passage_attempts')
    .select('*, evolution_attempt:tfng_mastery_evolution_attempts(*, evolution:tfng_mastery_evolutions(*))')
    .eq('id', passageAttemptId)
    .single();
  if (error) throw error;
  if (data.evolution_attempt.user_id !== userId) {
    const forbidden = new Error('Forbidden');
    forbidden.status = 403;
    throw forbidden;
  }
  return data;
};

export const submitTfngPassage = async (req, res) => {
  try {
    if (!ensureStudentAccess(req, res)) return;
    const passageAttempt = await getOwnedPassageAttempt(req.params.passageAttemptId, req.user.id);
    if (passageAttempt.status !== 'in_progress') {
      return res.status(200).json(await buildFeedbackPayload(passageAttempt.id, req.user.id));
    }

    const submittedAnswers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const expired = Boolean(req.body?.expired);
    const now = new Date();
    const timeUsed = Math.max(0, Math.min(
      toNumber(req.body?.time_used_seconds, Math.round((now.getTime() - new Date(passageAttempt.started_at).getTime()) / 1000)),
      passageAttempt.timer_seconds
    ));

    const questions = await getPassageQuestions(passageAttempt.passage_id);
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    for (const question of questions) {
      const normalized = normalizeAnswer(submittedAnswers[question.id]);
      const isCorrect = normalized === question.correct_answer;
      if (!normalized) unanswered += 1;
      else if (isCorrect) correct += 1;
      else wrong += 1;

      await supabaseAdmin
        .from('tfng_mastery_answers')
        .upsert([{
          passage_attempt_id: passageAttempt.id,
          question_id: question.id,
          student_answer: normalized,
          is_correct: isCorrect,
          score: isCorrect ? toNumber(question.marks, 1) : 0,
          answered_at: now.toISOString()
        }], { onConflict: 'passage_attempt_id,question_id' });
    }

    const xpAwarded = toNumber(passageAttempt.evolution_attempt.evolution.xp_per_passage, 20);
    const { data: updatedPassageAttempt, error: updateError } = await supabaseAdmin
      .from('tfng_mastery_passage_attempts')
      .update({
        status: expired ? 'expired' : 'submitted',
        submitted_at: now.toISOString(),
        time_used_seconds: timeUsed,
        score: correct,
        total_questions: questions.length,
        correct_answers: correct,
        wrong_answers: wrong,
        unanswered_questions: unanswered,
        xp_awarded: xpAwarded,
        updated_at: now.toISOString()
      })
      .eq('id', passageAttempt.id)
      .select('*')
      .single();
    if (updateError) throw updateError;

    await supabaseAdmin
      .from('tfng_mastery_xp_events')
      .insert([{
        user_id: req.user.id,
        evolution_attempt_id: passageAttempt.evolution_attempt_id,
        passage_attempt_id: passageAttempt.id,
        event_type: 'passage_complete',
        xp: xpAwarded
      }]);

    await updateEvolutionAttemptAfterPassage(passageAttempt.evolution_attempt, updatedPassageAttempt);

    res.status(200).json(await buildFeedbackPayload(passageAttempt.id, req.user.id));
  } catch (err) {
    console.error('submitTfngPassage Error:', err);
    res.status(err.status || 500).json({ error: err.message === 'Forbidden' ? 'Forbidden' : 'DatabaseError', message: 'Failed to submit TFNG passage.' });
  }
};

const updateEvolutionAttemptAfterPassage = async (attempt, submittedPassageAttempt) => {
  const stats = await calculateAttemptStats(attempt.id);
  const links = await getPlayableEvolutionPassageLinks(attempt.evolution_id, attempt.attempt_no || 1);
  const isFinalPassage = submittedPassageAttempt.passage_order >= links.length;
  const updates = {
    ...stats,
    updated_at: new Date().toISOString(),
    current_passage_order: isFinalPassage ? submittedPassageAttempt.passage_order : submittedPassageAttempt.passage_order + 1
  };

  if (isFinalPassage) {
    const fullAttempt = { ...attempt, evolution: attempt.evolution || await getEvolution(attempt.evolution_id) };
    const decision = getDecision(fullAttempt, stats);
    updates.status = decision === 'contact_instructor' ? 'failed_locked' : 'performance';
    updates.decision = decision;
    updates.completed_at = new Date().toISOString();

    if (decision === 'unlock_next') {
      updates.xp_earned = stats.xp_earned + toNumber(fullAttempt.evolution.xp_completion_bonus, 120);
      await supabaseAdmin
        .from('tfng_mastery_xp_events')
        .insert([{
          user_id: attempt.user_id,
          evolution_attempt_id: attempt.id,
          event_type: 'evolution_complete',
          xp: toNumber(fullAttempt.evolution.xp_completion_bonus, 120)
        }]);
    }
  }

  const { error } = await supabaseAdmin
    .from('tfng_mastery_evolution_attempts')
    .update(updates)
    .eq('id', attempt.id);
  if (error) throw error;
};

const buildFeedbackPayload = async (passageAttemptId, userId) => {
  const passageAttempt = await getOwnedPassageAttempt(passageAttemptId, userId);
  const { data: passage, error: passageError } = await supabaseAdmin
    .from('tfng_mastery_passages')
    .select('*')
    .eq('id', passageAttempt.passage_id)
    .single();
  if (passageError) throw passageError;

  const questions = await getPassageQuestions(passageAttempt.passage_id);
  const { data: answerRows, error: answerError } = await supabaseAdmin
    .from('tfng_mastery_answers')
    .select('*')
    .eq('passage_attempt_id', passageAttempt.id);
  if (answerError) throw answerError;

  const answerByQuestion = (answerRows || []).reduce((acc, row) => {
    acc[row.question_id] = row;
    return acc;
  }, {});

  return {
    passage_attempt: passageAttempt,
    passage,
    questions: questions.map(question => ({
      id: question.id,
      question_number: question.question_number,
      question_text: question.question_text,
      student_answer: answerByQuestion[question.id]?.student_answer || null,
      correct_answer: question.correct_answer,
      is_correct: Boolean(answerByQuestion[question.id]?.is_correct),
      detailed_explanation: question.detailed_explanation,
      trap_type: question.trap_type,
      locate_paragraph: question.locate_paragraph,
      locate_sentence: question.locate_sentence,
      keywords: question.keywords_json || [],
      highlight_phrases: question.highlight_phrases_json || []
    })),
    next_action: passageAttempt.evolution_attempt.status === 'performance' || passageAttempt.evolution_attempt.status === 'failed_locked'
      ? 'performance'
      : 'continue'
  };
};

export const getTfngFeedback = async (req, res) => {
  try {
    if (!ensureStudentAccess(req, res)) return;
    res.status(200).json(await buildFeedbackPayload(req.params.passageAttemptId, req.user.id));
  } catch (err) {
    console.error('getTfngFeedback Error:', err);
    res.status(err.status || 500).json({ error: err.message === 'Forbidden' ? 'Forbidden' : 'DatabaseError', message: 'Failed to load TFNG feedback.' });
  }
};

export const getTfngPerformance = async (req, res) => {
  try {
    if (!ensureStudentAccess(req, res)) return;
    const attempt = await getAttemptWithEvolution(req.params.attemptId, req.user.id);
    const links = await getPlayableEvolutionPassageLinks(attempt.evolution_id, attempt.attempt_no || 1);
    res.status(200).json({
      attempt,
      evolution: attempt.evolution,
      summary: {
        evolution_number: attempt.evolution.evolution_number,
        total_passages: links.length,
        passages_completed: attempt.passages_completed,
        total_questions: attempt.total_questions,
        questions_attempted: attempt.questions_attempted,
        correct_answers: attempt.correct_answers,
        wrong_answers: attempt.wrong_answers,
        unanswered_questions: attempt.unanswered_questions,
        accuracy: attempt.accuracy,
        time_used_seconds: attempt.time_used_seconds,
        xp_earned: attempt.xp_earned,
        decision: attempt.decision,
        hooty_comment: buildHootyComment(attempt.decision, attempt),
        instructor_support_url: attempt.evolution.instructor_support_url || '/teacher'
      }
    });
  } catch (err) {
    console.error('getTfngPerformance Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to load TFNG performance summary.' });
  }
};

export const continueTfngMastery = async (req, res) => {
  try {
    if (!ensureStudentAccess(req, res)) return;
    const attempt = await getAttemptWithEvolution(req.params.attemptId, req.user.id);

    if (attempt.status === 'design') {
      await supabaseAdmin.from('tfng_mastery_evolution_attempts').update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      }).eq('id', attempt.id);
      return res.status(200).json({ next_page: 'practice', attempt_id: attempt.id });
    }

    if (attempt.status === 'in_progress') {
      return res.status(200).json({ next_page: 'practice', attempt_id: attempt.id });
    }

    if (attempt.status === 'failed_locked' || attempt.decision === 'contact_instructor') {
      return res.status(200).json({
        next_page: 'contact_instructor',
        instructor_support_url: attempt.evolution.instructor_support_url || '/teacher'
      });
    }

    if (attempt.status !== 'performance') {
      return res.status(409).json({ error: 'InvalidState', message: 'This TFNG Mastery attempt cannot continue from its current state.' });
    }

    if (attempt.decision === 'repeat_evolution') {
      const retry = await createEvolutionAttempt({
        userId: req.user.id,
        evolution: attempt.evolution,
        attemptNo: attempt.attempt_no + 1
      });
      return res.status(200).json({ next_page: 'design', attempt_id: retry.id, attempt: retry });
    }

    await supabaseAdmin
      .from('tfng_mastery_evolution_attempts')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', attempt.id);

    const evolutions = await getPlayablePublishedEvolutions();
    const currentIndex = evolutions.findIndex(item => item.id === attempt.evolution_id);
    const nextEvolution = currentIndex >= 0 ? evolutions[currentIndex + 1] : null;
    if (!nextEvolution) {
      return res.status(200).json({ next_page: 'complete_mastery', completed_attempt_id: attempt.id });
    }

    const nextAttempt = await createEvolutionAttempt({ userId: req.user.id, evolution: nextEvolution });
    res.status(200).json({ next_page: 'design', attempt_id: nextAttempt.id, attempt: nextAttempt });
  } catch (err) {
    console.error('continueTfngMastery Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to continue TFNG Mastery.' });
  }
};

export const listTfngMasteryAdmin = async (req, res) => {
  try {
    if (!isStaff(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Teacher or admin access required.' });
    }
    let { data, error } = await supabaseAdmin
      .from('tfng_mastery_evolutions')
      .select('*, passages:tfng_mastery_evolution_passages(id, set_no, order_no, passage:tfng_mastery_passages(id, title, is_published))')
      .order('order_no', { ascending: true });
    if (error && isMissingSetNoColumn(error)) {
      const fallback = await supabaseAdmin
        .from('tfng_mastery_evolutions')
        .select('*, passages:tfng_mastery_evolution_passages(id, order_no, passage:tfng_mastery_passages(id, title, is_published))')
        .order('order_no', { ascending: true });
      data = (fallback.data || []).map(evolution => ({
        ...evolution,
        passages: (evolution.passages || []).map(link => ({ ...link, set_no: 1 }))
      }));
      error = fallback.error;
    }
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err) {
    console.error('listTfngMasteryAdmin Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to load TFNG Mastery admin data.' });
  }
};

export const listTfngPassagesAdmin = async (req, res) => {
  try {
    if (!isStaff(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Teacher or admin access required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('tfng_mastery_passages')
      .select('*, questions:tfng_mastery_questions(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const passages = (data || []).map(passage => ({
      ...passage,
      questions: (passage.questions || []).sort((a, b) => toNumber(a.order_no) - toNumber(b.order_no))
    }));

    res.status(200).json(passages);
  } catch (err) {
    console.error('listTfngPassagesAdmin Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to load TFNG Mastery passages.' });
  }
};

const requireStaff = (req, res) => {
  if (!isStaff(req.user)) {
    res.status(403).json({ error: 'Forbidden', message: 'Teacher or admin access required.' });
    return false;
  }
  return true;
};

const pickEvolutionPayload = (body, userId) => ({
  evolution_number: body.evolution_number,
  name: body.name,
  description: body.description || null,
  hooty_wisdom: body.hooty_wisdom || null,
  current_hooty_artwork: body.current_hooty_artwork || null,
  next_hooty_artwork: body.next_hooty_artwork || null,
  unlock_animation_key: body.unlock_animation_key || null,
  xp_per_passage: body.xp_per_passage ?? 20,
  xp_completion_bonus: body.xp_completion_bonus ?? 120,
  timer_seconds: body.timer_seconds ?? 180,
  first_attempt_required_accuracy: body.first_attempt_required_accuracy ?? 60,
  second_attempt_required_accuracy: body.second_attempt_required_accuracy ?? 50,
  instructor_support_url: body.instructor_support_url || null,
  is_published: Boolean(body.is_published),
  order_no: body.order_no ?? body.evolution_number ?? 1,
  created_by: userId,
  updated_at: new Date().toISOString()
});

const pickPartialEvolutionPayload = (body) => {
  const fields = [
    'evolution_number',
    'name',
    'description',
    'hooty_wisdom',
    'current_hooty_artwork',
    'next_hooty_artwork',
    'unlock_animation_key',
    'xp_per_passage',
    'xp_completion_bonus',
    'timer_seconds',
    'first_attempt_required_accuracy',
    'second_attempt_required_accuracy',
    'instructor_support_url',
    'is_published',
    'order_no'
  ];
  const payload = { updated_at: new Date().toISOString() };
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = field === 'is_published' ? Boolean(body[field]) : body[field];
    }
  }
  return payload;
};

export const createTfngEvolution = async (req, res) => {
  try {
    if (!requireStaff(req, res)) return;
    if (!req.body?.evolution_number || !req.body?.name) {
      return res.status(400).json({ error: 'ValidationError', message: 'Evolution number and name are required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('tfng_mastery_evolutions')
      .insert([pickEvolutionPayload(req.body, req.user.id)])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('createTfngEvolution Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: err.message || 'Failed to create TFNG evolution.' });
  }
};

export const updateTfngEvolution = async (req, res) => {
  try {
    if (!requireStaff(req, res)) return;
    const payload = pickPartialEvolutionPayload(req.body || {});

    const { data, error } = await supabaseAdmin
      .from('tfng_mastery_evolutions')
      .update(payload)
      .eq('id', req.params.evolutionId)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('updateTfngEvolution Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: err.message || 'Failed to update TFNG evolution.' });
  }
};

const pickPassagePayload = (body, userId) => ({
  title: body.title,
  passage_html: body.passage_html,
  source_label: body.source_label || null,
  difficulty: body.difficulty || null,
  estimated_minutes: body.estimated_minutes || null,
  is_published: Boolean(body.is_published),
  created_by: userId,
  updated_at: new Date().toISOString()
});

const pickPartialPassagePayload = (body) => {
  const fields = ['title', 'passage_html', 'source_label', 'difficulty', 'estimated_minutes', 'is_published'];
  const payload = { updated_at: new Date().toISOString() };
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = field === 'is_published' ? Boolean(body[field]) : body[field];
    }
  }
  return payload;
};

export const createTfngPassage = async (req, res) => {
  try {
    if (!requireStaff(req, res)) return;
    if (!req.body?.title || !req.body?.passage_html) {
      return res.status(400).json({ error: 'ValidationError', message: 'Passage title and content are required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('tfng_mastery_passages')
      .insert([pickPassagePayload(req.body, req.user.id)])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('createTfngPassage Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: err.message || 'Failed to create TFNG passage.' });
  }
};

export const updateTfngPassage = async (req, res) => {
  try {
    if (!requireStaff(req, res)) return;
    const payload = pickPartialPassagePayload(req.body || {});

    const { data, error } = await supabaseAdmin
      .from('tfng_mastery_passages')
      .update(payload)
      .eq('id', req.params.passageId)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('updateTfngPassage Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: err.message || 'Failed to update TFNG passage.' });
  }
};

export const assignTfngEvolutionPassages = async (req, res) => {
  try {
    if (!requireStaff(req, res)) return;
    const passages = Array.isArray(req.body?.passages) ? req.body.passages : [];
    const setNo = Math.max(1, toNumber(req.body?.set_no, 1));
    if (passages.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'Passages array is required.' });
    }

    const rows = passages.map((item, index) => ({
      evolution_id: req.params.evolutionId,
      passage_id: item.passage_id || item.id,
      set_no: setNo,
      order_no: item.order_no || index + 1
    }));

    const { error: deleteError } = await supabaseAdmin
      .from('tfng_mastery_evolution_passages')
      .delete()
      .eq('evolution_id', req.params.evolutionId)
      .eq('set_no', setNo);
    if (deleteError && isMissingSetNoColumn(deleteError)) {
      if (setNo !== 1) {
        return res.status(409).json({
          error: 'MigrationRequired',
          message: 'Practice sets need the latest TFNG Mastery migration. Please apply the set_no migration in Supabase before saving Set 2 or above.'
        });
      }

      const { error: fallbackDeleteError } = await supabaseAdmin
        .from('tfng_mastery_evolution_passages')
        .delete()
        .eq('evolution_id', req.params.evolutionId);
      if (fallbackDeleteError) throw fallbackDeleteError;

      const fallbackRows = rows.map(({ set_no, ...row }) => row);
      const { data: fallbackData, error: fallbackInsertError } = await supabaseAdmin
        .from('tfng_mastery_evolution_passages')
        .insert(fallbackRows)
        .select('*, passage:tfng_mastery_passages(id, title, is_published)');
      if (fallbackInsertError) throw fallbackInsertError;
      return res.status(200).json((fallbackData || []).map(item => ({ ...item, set_no: 1 })));
    }
    if (deleteError) throw deleteError;

    const { data, error } = await supabaseAdmin
      .from('tfng_mastery_evolution_passages')
      .insert(rows)
      .select('*, passage:tfng_mastery_passages(id, title, is_published)');
    if (error && isMissingSetNoColumn(error)) {
      return res.status(409).json({
        error: 'MigrationRequired',
        message: 'Practice sets need the latest TFNG Mastery migration. Please apply the set_no migration in Supabase.'
      });
    }
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err) {
    console.error('assignTfngEvolutionPassages Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: err.message || 'Failed to assign TFNG evolution passages.' });
  }
};

const pickQuestionPayload = (body, passageId) => ({
  passage_id: passageId,
  question_number: body.question_number,
  question_text: body.question_text,
  correct_answer: normalizeAnswer(body.correct_answer),
  detailed_explanation: body.detailed_explanation,
  trap_type: body.trap_type || null,
  locate_paragraph: body.locate_paragraph || null,
  locate_sentence: body.locate_sentence || null,
  keywords_json: Array.isArray(body.keywords) ? body.keywords : Array.isArray(body.keywords_json) ? body.keywords_json : [],
  highlight_phrases_json: Array.isArray(body.highlight_phrases) ? body.highlight_phrases : Array.isArray(body.highlight_phrases_json) ? body.highlight_phrases_json : [],
  order_no: body.order_no ?? body.question_number,
  marks: body.marks ?? 1,
  updated_at: new Date().toISOString()
});

const pickPartialQuestionPayload = (body) => {
  const payload = { updated_at: new Date().toISOString() };
  const directFields = [
    'passage_id',
    'question_number',
    'question_text',
    'detailed_explanation',
    'trap_type',
    'locate_paragraph',
    'locate_sentence',
    'order_no',
    'marks'
  ];
  for (const field of directFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'correct_answer')) {
    payload.correct_answer = normalizeAnswer(body.correct_answer);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'keywords') || Object.prototype.hasOwnProperty.call(body, 'keywords_json')) {
    payload.keywords_json = Array.isArray(body.keywords) ? body.keywords : Array.isArray(body.keywords_json) ? body.keywords_json : [];
  }
  if (Object.prototype.hasOwnProperty.call(body, 'highlight_phrases') || Object.prototype.hasOwnProperty.call(body, 'highlight_phrases_json')) {
    payload.highlight_phrases_json = Array.isArray(body.highlight_phrases) ? body.highlight_phrases : Array.isArray(body.highlight_phrases_json) ? body.highlight_phrases_json : [];
  }
  return payload;
};

export const createTfngQuestion = async (req, res) => {
  try {
    if (!requireStaff(req, res)) return;
    const payload = pickQuestionPayload(req.body || {}, req.params.passageId);
    if (!payload.question_number || !payload.question_text || !payload.correct_answer || !payload.detailed_explanation) {
      return res.status(400).json({ error: 'ValidationError', message: 'Question number, text, correct answer, and explanation are required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('tfng_mastery_questions')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('createTfngQuestion Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: err.message || 'Failed to create TFNG question.' });
  }
};

export const updateTfngQuestion = async (req, res) => {
  try {
    if (!requireStaff(req, res)) return;
    const payload = pickPartialQuestionPayload(req.body || {});

    const { data, error } = await supabaseAdmin
      .from('tfng_mastery_questions')
      .update(payload)
      .eq('id', req.params.questionId)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('updateTfngQuestion Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: err.message || 'Failed to update TFNG question.' });
  }
};

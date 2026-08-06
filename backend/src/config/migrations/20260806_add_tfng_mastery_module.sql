-- ==========================================
-- TFNG MASTERY MODULE
-- Progression-based Hooty evolution practice
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tfng_mastery_evolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evolution_number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    hooty_wisdom TEXT,
    current_hooty_artwork TEXT,
    next_hooty_artwork TEXT,
    unlock_animation_key TEXT,
    xp_per_passage INTEGER NOT NULL DEFAULT 20,
    xp_completion_bonus INTEGER NOT NULL DEFAULT 120,
    timer_seconds INTEGER NOT NULL DEFAULT 180,
    first_attempt_required_accuracy NUMERIC NOT NULL DEFAULT 60,
    second_attempt_required_accuracy NUMERIC NOT NULL DEFAULT 50,
    instructor_support_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    order_no INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT tfng_mastery_evolution_number_positive CHECK (evolution_number > 0),
    CONSTRAINT tfng_mastery_timer_positive CHECK (timer_seconds > 0),
    CONSTRAINT tfng_mastery_first_threshold_range CHECK (first_attempt_required_accuracy >= 0 AND first_attempt_required_accuracy <= 100),
    CONSTRAINT tfng_mastery_second_threshold_range CHECK (second_attempt_required_accuracy >= 0 AND second_attempt_required_accuracy <= 100)
);

ALTER TABLE tfng_mastery_evolutions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tfng_mastery_passages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    passage_html TEXT NOT NULL,
    source_label TEXT,
    difficulty TEXT,
    estimated_minutes INTEGER,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tfng_mastery_passages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tfng_mastery_evolution_passages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evolution_id UUID NOT NULL REFERENCES tfng_mastery_evolutions(id) ON DELETE CASCADE,
    passage_id UUID NOT NULL REFERENCES tfng_mastery_passages(id) ON DELETE CASCADE,
    set_no INTEGER NOT NULL DEFAULT 1,
    order_no INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tfng_evolution_passage UNIQUE (evolution_id, set_no, passage_id),
    CONSTRAINT unique_tfng_evolution_passage_order UNIQUE (evolution_id, set_no, order_no),
    CONSTRAINT tfng_evolution_passage_set_positive CHECK (set_no > 0),
    CONSTRAINT tfng_evolution_passage_order_positive CHECK (order_no > 0)
);

ALTER TABLE tfng_mastery_evolution_passages
    ADD COLUMN IF NOT EXISTS set_no INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tfng_mastery_evolution_passages
    DROP CONSTRAINT IF EXISTS unique_tfng_evolution_passage;

ALTER TABLE tfng_mastery_evolution_passages
    DROP CONSTRAINT IF EXISTS unique_tfng_evolution_passage_order;

ALTER TABLE tfng_mastery_evolution_passages
    ADD CONSTRAINT unique_tfng_evolution_passage UNIQUE (evolution_id, set_no, passage_id);

ALTER TABLE tfng_mastery_evolution_passages
    ADD CONSTRAINT unique_tfng_evolution_passage_order UNIQUE (evolution_id, set_no, order_no);

ALTER TABLE tfng_mastery_evolution_passages
    DROP CONSTRAINT IF EXISTS tfng_evolution_passage_set_positive;

ALTER TABLE tfng_mastery_evolution_passages
    ADD CONSTRAINT tfng_evolution_passage_set_positive CHECK (set_no > 0);

ALTER TABLE tfng_mastery_evolution_passages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tfng_mastery_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passage_id UUID NOT NULL REFERENCES tfng_mastery_passages(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('TRUE', 'FALSE', 'NOT GIVEN')),
    detailed_explanation TEXT NOT NULL,
    trap_type TEXT,
    locate_paragraph TEXT,
    locate_sentence TEXT,
    keywords_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    highlight_phrases_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    order_no INTEGER NOT NULL,
    marks INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tfng_passage_question_order UNIQUE (passage_id, order_no),
    CONSTRAINT unique_tfng_passage_question_number UNIQUE (passage_id, question_number)
);

ALTER TABLE tfng_mastery_questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tfng_mastery_evolution_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    evolution_id UUID NOT NULL REFERENCES tfng_mastery_evolutions(id) ON DELETE CASCADE,
    attempt_no INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'design' CHECK (status IN (
        'design',
        'in_progress',
        'performance',
        'completed',
        'failed_locked'
    )),
    current_passage_order INTEGER NOT NULL DEFAULT 1,
    total_passages INTEGER NOT NULL DEFAULT 0,
    passages_completed INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    questions_attempted INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    wrong_answers INTEGER NOT NULL DEFAULT 0,
    unanswered_questions INTEGER NOT NULL DEFAULT 0,
    accuracy NUMERIC NOT NULL DEFAULT 0,
    time_used_seconds INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    decision TEXT CHECK (decision IN ('pending', 'unlock_next', 'repeat_evolution', 'contact_instructor')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tfng_user_evolution_attempt UNIQUE (user_id, evolution_id, attempt_no),
    CONSTRAINT tfng_evolution_attempt_no_positive CHECK (attempt_no > 0)
);

ALTER TABLE tfng_mastery_evolution_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tfng_mastery_passage_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evolution_attempt_id UUID NOT NULL REFERENCES tfng_mastery_evolution_attempts(id) ON DELETE CASCADE,
    passage_id UUID NOT NULL REFERENCES tfng_mastery_passages(id) ON DELETE CASCADE,
    passage_order INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    timer_seconds INTEGER NOT NULL,
    time_used_seconds INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    wrong_answers INTEGER NOT NULL DEFAULT 0,
    unanswered_questions INTEGER NOT NULL DEFAULT 0,
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tfng_passage_attempt_per_evolution_attempt UNIQUE (evolution_attempt_id, passage_id)
);

ALTER TABLE tfng_mastery_passage_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tfng_mastery_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passage_attempt_id UUID NOT NULL REFERENCES tfng_mastery_passage_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES tfng_mastery_questions(id) ON DELETE CASCADE,
    student_answer TEXT CHECK (student_answer IN ('TRUE', 'FALSE', 'NOT GIVEN')),
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    score INTEGER NOT NULL DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tfng_answer_question UNIQUE (passage_attempt_id, question_id)
);

ALTER TABLE tfng_mastery_answers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tfng_mastery_xp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    evolution_attempt_id UUID REFERENCES tfng_mastery_evolution_attempts(id) ON DELETE CASCADE,
    passage_attempt_id UUID REFERENCES tfng_mastery_passage_attempts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('passage_complete', 'evolution_complete')),
    xp INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tfng_mastery_xp_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tfng_evolutions_published ON tfng_mastery_evolutions(is_published, order_no);
CREATE INDEX IF NOT EXISTS idx_tfng_evolution_passages_evolution ON tfng_mastery_evolution_passages(evolution_id, set_no, order_no);
CREATE INDEX IF NOT EXISTS idx_tfng_questions_passage ON tfng_mastery_questions(passage_id, order_no);
CREATE INDEX IF NOT EXISTS idx_tfng_evolution_attempts_user ON tfng_mastery_evolution_attempts(user_id, evolution_id, attempt_no);
CREATE INDEX IF NOT EXISTS idx_tfng_passage_attempts_attempt ON tfng_mastery_passage_attempts(evolution_attempt_id, passage_order);
CREATE INDEX IF NOT EXISTS idx_tfng_answers_passage_attempt ON tfng_mastery_answers(passage_attempt_id);
CREATE INDEX IF NOT EXISTS idx_tfng_xp_events_user ON tfng_mastery_xp_events(user_id, created_at);

CREATE POLICY "Published TFNG evolutions are readable" ON tfng_mastery_evolutions
    FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage TFNG evolutions" ON tfng_mastery_evolutions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher'))
    );

CREATE POLICY "Published TFNG passages are readable" ON tfng_mastery_passages
    FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage TFNG passages" ON tfng_mastery_passages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher'))
    );

CREATE POLICY "Published TFNG evolution passage links are readable" ON tfng_mastery_evolution_passages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tfng_mastery_evolutions
            WHERE tfng_mastery_evolutions.id = tfng_mastery_evolution_passages.evolution_id
              AND tfng_mastery_evolutions.is_published = true
        )
    );

CREATE POLICY "Admins can manage TFNG evolution passage links" ON tfng_mastery_evolution_passages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher'))
    );

CREATE POLICY "Published TFNG questions are readable" ON tfng_mastery_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tfng_mastery_passages
            WHERE tfng_mastery_passages.id = tfng_mastery_questions.passage_id
              AND tfng_mastery_passages.is_published = true
        )
    );

CREATE POLICY "Admins can manage TFNG questions" ON tfng_mastery_questions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher'))
    );

CREATE POLICY "Students can read own TFNG evolution attempts" ON tfng_mastery_evolution_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can read own TFNG passage attempts" ON tfng_mastery_passage_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tfng_mastery_evolution_attempts
            WHERE tfng_mastery_evolution_attempts.id = tfng_mastery_passage_attempts.evolution_attempt_id
              AND tfng_mastery_evolution_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Students can read own TFNG answers" ON tfng_mastery_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tfng_mastery_passage_attempts
            JOIN tfng_mastery_evolution_attempts
              ON tfng_mastery_evolution_attempts.id = tfng_mastery_passage_attempts.evolution_attempt_id
            WHERE tfng_mastery_passage_attempts.id = tfng_mastery_answers.passage_attempt_id
              AND tfng_mastery_evolution_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Students can read own TFNG XP events" ON tfng_mastery_xp_events
    FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- JAWAAF IELTS LAB - SUPABASE POSTGRESQL SCHEMA
-- ==========================================

-- ENABLE UUID EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'teacher')),
    has_full_access BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. MOCK TESTS TABLE
CREATE TABLE IF NOT EXISTS mock_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    audio_file TEXT, -- Listening audio storage path, e.g. audio/<test-id>/cam18-test1.mp3; never stores audio bytes
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    duration INTEGER NOT NULL, -- duration in minutes
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;

-- 3. TEST SECTIONS TABLE
CREATE TABLE IF NOT EXISTS test_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mock_test_id UUID NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('reading', 'listening', 'writing')),
    title TEXT NOT NULL,
    duration INTEGER, -- Section-specific duration overrides (optional)
    order_no INTEGER NOT NULL,
    CONSTRAINT unique_section_order UNIQUE(mock_test_id, order_no)
);

-- Enable RLS
ALTER TABLE test_sections ENABLE ROW LEVEL SECURITY;

-- 4. QUESTION GROUPS TABLE
CREATE TABLE IF NOT EXISTS question_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES test_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instruction TEXT NOT NULL,
    passage TEXT, -- HTML text content for reading passages
    audio_url TEXT, -- Storage URL for listening mp3 files
    image_url TEXT, -- Storage URL for images/charts
    order_no INTEGER NOT NULL
);

-- Enable RLS
ALTER TABLE question_groups ENABLE ROW LEVEL SECURITY;

-- 5. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES question_groups(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL CHECK (question_type IN (
        'INPUT_TEXT',
        'DROPDOWN_SELECT',
        'TRUE_FALSE_NOT_GIVEN',
        'YES_NO_NOT_GIVEN',
        'SINGLE_MCQ',
        'MATCHING',
        'MULTI_SELECT',
        'WRITING_TASK'
    )),
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    instruction TEXT,
    options_json JSONB, -- Array of items, e.g. ["A", "B", "C"]
    correct_answers_json JSONB NOT NULL, -- Array of answers, e.g. ["TRUE"] or ["A"]
    extra_data_json JSONB, -- Custom layout details e.g. matching headers list
    marks INTEGER NOT NULL DEFAULT 1,
    order_no INTEGER NOT NULL
);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- 6. ACCESS REQUESTS TABLE
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- 7. USER ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS user_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mock_test_id UUID NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'progress' CHECK (status IN ('progress', 'completed')),
    score NUMERIC DEFAULT 0
);

-- Enable RLS
ALTER TABLE user_attempts ENABLE ROW LEVEL SECURITY;

-- 8. ATTEMPT ANSWERS TABLE
CREATE TABLE IF NOT EXISTS attempt_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES user_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer JSONB,
    is_correct BOOLEAN DEFAULT FALSE,
    score NUMERIC DEFAULT 0,
    CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)
);

-- Enable RLS
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;

-- 9. WRITING FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS writing_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL UNIQUE REFERENCES user_attempts(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    band_score NUMERIC,
    task_achievement_score NUMERIC,
    coherence_cohesion_score NUMERIC,
    lexical_resource_score NUMERIC,
    grammar_score NUMERIC,
    task_feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
    task_achievement TEXT,
    coherence_cohesion TEXT,
    lexical_resource TEXT,
    grammar TEXT,
    examiner_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE writing_feedback ENABLE ROW LEVEL SECURITY;

-- CREATE INDEXES FOR OPTIMAL RELATIONAL SEARCHES
CREATE INDEX IF NOT EXISTS idx_mock_tests_published ON mock_tests(is_published, is_demo);
CREATE INDEX IF NOT EXISTS idx_test_sections_test ON test_sections(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_question_groups_section ON question_groups(section_id);
CREATE INDEX IF NOT EXISTS idx_questions_group ON questions(group_id);
CREATE INDEX IF NOT EXISTS idx_user_attempts_user ON user_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_writing_feedback_attempt ON writing_feedback(attempt_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Profiles policies
CREATE POLICY "Public profiles are readable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can edit their own profiles" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Mock tests policies
CREATE POLICY "Published or demo tests are readable by everyone" ON mock_tests
    FOR SELECT USING (is_published = true OR is_demo = true);

CREATE POLICY "Admins have full access to tests" ON mock_tests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Access requests policies
CREATE POLICY "Users can read/create their own access requests" ON access_requests
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to all requests" ON access_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- User attempts policies
CREATE POLICY "Users can manage their own attempts" ON user_attempts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts" ON user_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );

-- Attempt answers policies
CREATE POLICY "Users can manage their own attempt answers" ON attempt_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_attempts
            WHERE user_attempts.id = attempt_id AND user_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Teachers and admins can manage writing feedback" ON writing_feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Students can read feedback for their attempts" ON writing_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_attempts
            WHERE user_attempts.id = attempt_id AND user_attempts.user_id = auth.uid()
        )
    );

-- AUTOMATIC DATABASE PROFILE CREATION ON USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, has_full_access)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Student User'),
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'student'),
        CASE WHEN new.raw_user_meta_data->>'role' = 'admin' THEN TRUE ELSE FALSE END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger linked to Supabase auth.users inserts
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

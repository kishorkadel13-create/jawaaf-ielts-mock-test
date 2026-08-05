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
    premium_access_expires_at TIMESTAMP WITH TIME ZONE,
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
    reviewed_by UUID REFERENCES profiles(id),
    premium_access_expires_at TIMESTAMP WITH TIME ZONE
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

-- 10. RECORDED COURSE SECTIONS
CREATE TABLE IF NOT EXISTS course_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    order_no INTEGER NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;

-- 11. RECORDED COURSE LESSONS
CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    video_file TEXT,
    thumbnail_url TEXT,
    notes TEXT,
    duration_minutes INTEGER DEFAULT 0,
    order_no INTEGER NOT NULL DEFAULT 1,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

-- 12. LESSON DOWNLOADABLE RESOURCES
CREATE TABLE IF NOT EXISTS lesson_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    resource_url TEXT,
    resource_file TEXT,
    order_no INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE lesson_resources ENABLE ROW LEVEL SECURITY;

-- 13. STUDENT LESSON PROGRESS
CREATE TABLE IF NOT EXISTS student_lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    watched_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_student_lesson_progress UNIQUE (user_id, lesson_id)
);

ALTER TABLE student_lesson_progress ENABLE ROW LEVEL SECURITY;

-- 14. LESSON Q&A THREADS
CREATE TABLE IF NOT EXISTS lesson_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    answered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    answered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE lesson_questions ENABLE ROW LEVEL SECURITY;

-- CREATE INDEXES FOR OPTIMAL RELATIONAL SEARCHES
CREATE INDEX IF NOT EXISTS idx_mock_tests_published ON mock_tests(is_published, is_demo);
CREATE INDEX IF NOT EXISTS idx_test_sections_test ON test_sections(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_question_groups_section ON question_groups(section_id);
CREATE INDEX IF NOT EXISTS idx_questions_group ON questions(group_id);
CREATE INDEX IF NOT EXISTS idx_user_attempts_user ON user_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_writing_feedback_attempt ON writing_feedback(attempt_id);
CREATE INDEX IF NOT EXISTS idx_course_sections_order ON course_sections(order_no);
CREATE INDEX IF NOT EXISTS idx_course_lessons_section ON course_lessons(section_id, order_no);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson ON lesson_resources(lesson_id, order_no);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_user ON student_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson ON lesson_questions(lesson_id, created_at);

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

-- Recorded learning policies
CREATE POLICY "Published course sections are readable" ON course_sections
    FOR SELECT USING (is_published = true);

CREATE POLICY "Published course lessons are readable" ON course_lessons
    FOR SELECT USING (is_published = true);

CREATE POLICY "Lesson resources are readable" ON lesson_resources
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_lessons
            WHERE course_lessons.id = lesson_resources.lesson_id
              AND course_lessons.is_published = true
        )
    );

CREATE POLICY "Students can manage their own lesson progress" ON student_lesson_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Students can read lesson questions" ON lesson_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_lessons
            WHERE course_lessons.id = lesson_questions.lesson_id
              AND course_lessons.is_published = true
        )
    );

CREATE POLICY "Students can create their own lesson questions" ON lesson_questions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage course sections" ON course_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Admins manage course lessons" ON course_lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Admins manage lesson resources" ON lesson_resources
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Admins view all lesson progress" ON student_lesson_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Admins manage lesson questions" ON lesson_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
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

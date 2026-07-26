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

CREATE TABLE IF NOT EXISTS lesson_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    resource_url TEXT,
    resource_file TEXT,
    order_no INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_course_sections_order ON course_sections(order_no);
CREATE INDEX IF NOT EXISTS idx_course_lessons_section ON course_lessons(section_id, order_no);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson ON lesson_resources(lesson_id, order_no);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_user ON student_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson ON lesson_questions(lesson_id, created_at);

ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE course_lessons
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE course_lessons
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

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

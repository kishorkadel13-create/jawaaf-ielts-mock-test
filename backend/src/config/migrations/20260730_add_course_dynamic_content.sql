-- Dynamic recorded-course copy for the cinema learning experience.
-- Run this in Supabase SQL editor, then reload the PostgREST schema cache.

ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS learning_points JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS course_today_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL DEFAULT 'Today''s Goal',
    goal_text TEXT NOT NULL,
    tip_text TEXT,
    section_slug TEXT,
    order_no INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_today_goals_active_order
ON course_today_goals(is_active, order_no, created_at);

CREATE INDEX IF NOT EXISTS idx_course_today_goals_section_slug
ON course_today_goals(section_slug);

ALTER TABLE course_today_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active course today goals are readable" ON course_today_goals;
CREATE POLICY "Active course today goals are readable"
ON course_today_goals
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage course today goals" ON course_today_goals;
CREATE POLICY "Admins manage course today goals"
ON course_today_goals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

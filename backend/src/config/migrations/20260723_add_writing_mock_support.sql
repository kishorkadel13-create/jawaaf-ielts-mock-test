-- Add Writing support to existing Supabase databases.
-- Run this once in the Supabase SQL editor before creating writing sections/tasks.

DO $$
DECLARE
  section_constraint_name TEXT;
  question_constraint_name TEXT;
BEGIN
  SELECT conname INTO section_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.test_sections'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%reading%'
    AND pg_get_constraintdef(oid) LIKE '%listening%';

  IF section_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.test_sections DROP CONSTRAINT %I', section_constraint_name);
  END IF;

  ALTER TABLE public.test_sections
    ADD CONSTRAINT test_sections_type_check
    CHECK (type IN ('reading', 'listening', 'writing'));

  SELECT conname INTO question_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.questions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%question_type%INPUT_TEXT%'
    AND pg_get_constraintdef(oid) LIKE '%MULTI_SELECT%';

  IF question_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.questions DROP CONSTRAINT %I', question_constraint_name);
  END IF;

  ALTER TABLE public.questions
    ADD CONSTRAINT questions_question_type_check
    CHECK (question_type IN (
      'INPUT_TEXT',
      'DROPDOWN_SELECT',
      'TRUE_FALSE_NOT_GIVEN',
      'YES_NO_NOT_GIVEN',
      'SINGLE_MCQ',
      'MATCHING',
      'MULTI_SELECT',
      'WRITING_TASK'
    ));
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'admin', 'teacher'));

CREATE TABLE IF NOT EXISTS public.writing_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL UNIQUE REFERENCES public.user_attempts(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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

ALTER TABLE public.writing_feedback ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_writing_feedback_attempt
  ON public.writing_feedback(attempt_id);

DROP POLICY IF EXISTS "Admins can view all attempts" ON public.user_attempts;
CREATE POLICY "Admins can view all attempts" ON public.user_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "Teachers and admins can manage writing feedback" ON public.writing_feedback;
CREATE POLICY "Teachers and admins can manage writing feedback" ON public.writing_feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "Students can read feedback for their attempts" ON public.writing_feedback;
CREATE POLICY "Students can read feedback for their attempts" ON public.writing_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_attempts
      WHERE user_attempts.id = attempt_id AND user_attempts.user_id = auth.uid()
    )
  );

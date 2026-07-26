ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.course_lessons.is_demo IS
  'If true, published lesson is available to free users as a demo. If false, lesson requires premium access.';

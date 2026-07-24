DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'writing_feedback_attempt_id_key'
      AND conrelid = 'public.writing_feedback'::regclass
  ) THEN
    ALTER TABLE public.writing_feedback
      ADD CONSTRAINT writing_feedback_attempt_id_key UNIQUE (attempt_id);
  END IF;
END $$;

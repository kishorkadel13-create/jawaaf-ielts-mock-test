ALTER TABLE public.writing_feedback
  ADD COLUMN IF NOT EXISTS task_achievement_score NUMERIC,
  ADD COLUMN IF NOT EXISTS coherence_cohesion_score NUMERIC,
  ADD COLUMN IF NOT EXISTS lexical_resource_score NUMERIC,
  ADD COLUMN IF NOT EXISTS grammar_score NUMERIC,
  ADD COLUMN IF NOT EXISTS task_feedback JSONB NOT NULL DEFAULT '{}'::jsonb;

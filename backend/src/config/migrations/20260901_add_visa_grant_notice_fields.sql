ALTER TABLE public.visa_promotions
ADD COLUMN IF NOT EXISTS display_type TEXT NOT NULL DEFAULT 'popup',
ADD COLUMN IF NOT EXISTS student_name TEXT,
ADD COLUMN IF NOT EXISTS program_name TEXT,
ADD COLUMN IF NOT EXISTS visa_type TEXT,
ADD COLUMN IF NOT EXISTS granted_label TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'visa_promotions_display_type_check'
  ) THEN
    ALTER TABLE public.visa_promotions
    ADD CONSTRAINT visa_promotions_display_type_check
    CHECK (display_type IN ('popup', 'grant_notice'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visa_promotions_grant_notices
ON public.visa_promotions(is_active, display_type, display_order, created_at DESC);

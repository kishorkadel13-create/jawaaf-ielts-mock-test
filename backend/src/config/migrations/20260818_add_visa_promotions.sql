CREATE TABLE IF NOT EXISTS public.visa_promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_promotions_active_created
ON public.visa_promotions(is_active, created_at DESC);

ALTER TABLE public.visa_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active visa promotions are readable" ON public.visa_promotions;
CREATE POLICY "Active visa promotions are readable"
ON public.visa_promotions
FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins manage visa promotions" ON public.visa_promotions;
CREATE POLICY "Admins manage visa promotions"
ON public.visa_promotions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

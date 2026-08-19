ALTER TABLE public.visa_promotions
ADD COLUMN IF NOT EXISTS country_name TEXT,
ADD COLUMN IF NOT EXISTS country_flag TEXT,
ADD COLUMN IF NOT EXISTS student_quote TEXT,
ADD COLUMN IF NOT EXISTS institute_name TEXT;

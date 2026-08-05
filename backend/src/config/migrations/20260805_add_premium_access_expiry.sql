-- Track premium access expiry for students and reviewed access requests.
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS premium_access_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS premium_access_expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_premium_access_expires_at
ON profiles(premium_access_expires_at);

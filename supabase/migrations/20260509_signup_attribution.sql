ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_term text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_landing_path text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_captured_at timestamptz;

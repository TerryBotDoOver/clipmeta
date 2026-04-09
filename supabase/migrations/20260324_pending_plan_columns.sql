-- Add columns for tracking scheduled plan downgrades
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_plan text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_plan_effective_date timestamptz;

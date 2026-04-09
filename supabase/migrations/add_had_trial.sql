-- Add had_trial column to profiles table
-- Tracks whether a user has already used their free trial
-- Prevents abuse of trial system (cancel + restart)

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS had_trial BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark existing paying customers as having used their trial
UPDATE profiles 
SET had_trial = TRUE 
WHERE stripe_subscription_id IS NOT NULL;

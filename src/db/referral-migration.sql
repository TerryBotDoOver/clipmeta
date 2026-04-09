-- Referral reward system migration
-- Run this in your Supabase SQL editor before deploying.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_qualified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bonus_clips INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_tier TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_pro_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_pro_forever BOOLEAN DEFAULT false;

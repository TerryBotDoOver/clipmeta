-- Add promo unlock timestamp to profiles.
-- Set when user completes onboarding checklist.
-- Used to gate the 24-hour 50% off welcome reward.
alter table profiles
  add column if not exists promo_unlocked_at timestamptz;

-- Migration: add drip_track columns to profiles
-- Run in Supabase SQL editor or via: supabase db push
--
-- drip_track:            'free' | 'paid'  — which email sequence the user is on
-- drip_track_switched_at: timestamp when the user moved to 'paid' track
--   (used as the reference point for paid drip scheduling)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS drip_track text NOT NULL DEFAULT 'free'
    CHECK (drip_track IN ('free', 'paid')),
  ADD COLUMN IF NOT EXISTS drip_track_switched_at timestamptz;

-- Backfill: move existing paying/trialing customers to the paid track.
-- Use updated_at as a proxy for when they converted (best available signal).
UPDATE public.profiles
SET
  drip_track              = 'paid',
  drip_track_switched_at  = COALESCE(updated_at, now())
WHERE
  stripe_subscription_status IN ('active', 'trialing', 'founder')
  AND plan != 'free';

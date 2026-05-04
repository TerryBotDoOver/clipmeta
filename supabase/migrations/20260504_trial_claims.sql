-- Durable trial guard.
-- This table intentionally does not cascade from profiles/auth.users, so deleting
-- an account does not erase the fact that a free trial was already claimed.

create table if not exists public.trial_claims (
  id uuid primary key default gen_random_uuid(),
  first_user_id uuid,
  latest_user_id uuid,
  email_hash text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  payment_fingerprint_hash text,
  ip_hash text,
  plan text,
  source text not null default 'checkout',
  first_claimed_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists trial_claims_email_hash_key
  on public.trial_claims (email_hash);

create unique index if not exists trial_claims_stripe_customer_id_key
  on public.trial_claims (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists trial_claims_payment_fingerprint_hash_key
  on public.trial_claims (payment_fingerprint_hash)
  where payment_fingerprint_hash is not null;

create index if not exists trial_claims_ip_hash_idx
  on public.trial_claims (ip_hash)
  where ip_hash is not null;

alter table public.trial_claims enable row level security;

-- Keep the older profile flag in place for same-account checks, but make sure
-- newer environments have it even if the earlier loose migration was missed.
alter table public.profiles
  add column if not exists had_trial boolean not null default false;

alter table public.profiles
  add column if not exists trial_ip_hash text;

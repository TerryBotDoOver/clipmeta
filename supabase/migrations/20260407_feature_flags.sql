-- Feature flags for beta-testing new features without launching them
create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,           -- e.g. 'batch_upload', 'ai_keywording_v2'
  description text,                     -- what the feature does
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only admins (service role) should read/write flags
-- RLS: block all public access, only service role can manage
alter table feature_flags enable row level security;

-- No RLS policies = only service_role can access (which is what we want)
-- The client-side hook will fetch flags through an API route that uses the service role

-- Index for fast lookups by name
create index if not exists idx_feature_flags_name on feature_flags(name);

-- Auto-update updated_at
create or replace function update_feature_flags_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger feature_flags_updated_at
  before update on feature_flags
  for each row
  execute function update_feature_flags_updated_at();

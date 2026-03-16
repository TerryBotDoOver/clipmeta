alter table public.clips
  add column if not exists is_reviewed boolean not null default false;

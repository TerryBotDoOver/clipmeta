create table if not exists public.email_captures (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'unknown',
  created_at timestamptz not null default now()
);
create unique index if not exists email_captures_email_idx on public.email_captures(email);

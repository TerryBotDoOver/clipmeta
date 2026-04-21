-- Records upload failures that exhaust the client-side retry loop.
-- Lets us tell the difference between "one user has a flaky connection"
-- and "everyone is failing right now" without waiting for support tickets.
create table if not exists public.upload_failures (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  project_id     uuid,
  filename       text,
  file_size_bytes bigint,
  file_type      text,
  upload_method  text,            -- 'single-put' or 'multipart'
  error_message  text,
  attempts_tried int,
  failed_at_part int,             -- for multipart: which part number failed; null for single-put
  user_agent     text,
  created_at     timestamptz not null default now()
);

create index if not exists upload_failures_created_at_idx on public.upload_failures(created_at desc);
create index if not exists upload_failures_user_id_idx    on public.upload_failures(user_id);

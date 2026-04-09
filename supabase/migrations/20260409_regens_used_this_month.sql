-- Add dedicated regeneration counter to profiles.
-- Replaces the broken derivation: clips_used_this_month - clip_history_created_count
alter table profiles
  add column if not exists regens_used_this_month integer not null default 0;

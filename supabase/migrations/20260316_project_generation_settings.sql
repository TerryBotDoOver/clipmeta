alter table public.projects
  add column if not exists platform text not null default 'generic',
  add column if not exists generation_settings jsonb not null default '{
    "keywordCount": 35,
    "titleStyle": "seo",
    "includeLocation": true,
    "includeCameraDetails": true
  }'::jsonb;

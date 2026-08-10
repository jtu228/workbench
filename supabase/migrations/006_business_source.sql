alter table public.projects
  add column if not exists business_source text not null default '';

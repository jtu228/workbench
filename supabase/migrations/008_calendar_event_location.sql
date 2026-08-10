alter table public.calendar_events
  add column if not exists province text not null default '',
  add column if not exists city text not null default '';

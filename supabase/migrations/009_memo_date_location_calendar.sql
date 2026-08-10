alter table public.memos
  add column if not exists event_date date,
  add column if not exists province text not null default '',
  add column if not exists city text not null default '',
  add column if not exists add_to_calendar boolean not null default false,
  add column if not exists calendar_event_id uuid references public.calendar_events(id) on delete set null;

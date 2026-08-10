alter table public.calendar_events
  add column if not exists leave_kind text
  check (leave_kind is null or leave_kind in ('sick', 'annual', 'only_child'));

create table if not exists public.user_leave_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  annual_leave_days numeric(4, 1) not null default 5,
  only_child_leave_days numeric(4, 1) not null default 5,
  sick_leave_days_per_month numeric(4, 1) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_leave_settings enable row level security;

drop policy if exists "Users manage own leave settings" on public.user_leave_settings;
create policy "Users manage own leave settings" on public.user_leave_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger user_leave_settings_updated_at
  before update on public.user_leave_settings
  for each row execute function public.set_updated_at();

-- Personal workbench schema

create extension if not exists "pgcrypto";

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client_name text not null default '',
  project_type text not null default 'other' check (project_type in ('certification', 'training', 'other')),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  contract_no text,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract finance (1:1 with projects)
create table if not exists public.contract_finance (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  is_invoiced boolean not null default false,
  is_paid boolean not null default false,
  has_subcontract boolean not null default false,
  subcontract_paid boolean not null default false,
  system_completed boolean not null default false,
  has_travel_expense boolean not null default false,
  is_installment boolean not null default false,
  contract_amount numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Installment payments
create table if not exists public.installment_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  period_number int not null,
  amount numeric(12, 2) not null default 0,
  due_date date,
  is_paid boolean not null default false,
  paid_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, period_number)
);

-- Certification progress
create table if not exists public.certification_progress (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  audit_scheduled boolean not null default false,
  audit_date date,
  teacher_invoice_processed boolean not null default false,
  feedback_submitted boolean not null default false,
  feedback_processed boolean not null default false,
  certificate_issued boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Training progress
create table if not exists public.training_progress (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  survey_arranged boolean not null default false,
  standard_training_arranged boolean not null default false,
  coaching_arranged boolean not null default false,
  system_docs_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Calendar events
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  event_type text not null default 'other' check (event_type in ('client_visit', 'leave', 'audit', 'other')),
  project_id uuid references public.projects(id) on delete set null,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Memos
create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  tags text[] not null default '{}',
  is_pinned boolean not null default false,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  doc_type text not null default 'other' check (doc_type in ('contract', 'certification', 'template', 'other')),
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  mime_type text,
  local_cache_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract number sequence
create table if not exists public.contract_number_seq (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prefix text not null default 'ZD',
  year int not null,
  last_number int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger contract_finance_updated_at before update on public.contract_finance for each row execute function public.set_updated_at();
create trigger installment_payments_updated_at before update on public.installment_payments for each row execute function public.set_updated_at();
create trigger certification_progress_updated_at before update on public.certification_progress for each row execute function public.set_updated_at();
create trigger training_progress_updated_at before update on public.training_progress for each row execute function public.set_updated_at();
create trigger calendar_events_updated_at before update on public.calendar_events for each row execute function public.set_updated_at();
create trigger memos_updated_at before update on public.memos for each row execute function public.set_updated_at();
create trigger documents_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger contract_number_seq_updated_at before update on public.contract_number_seq for each row execute function public.set_updated_at();

-- Auto-create related records on project insert
create or replace function public.handle_new_project()
returns trigger as $$
begin
  insert into public.contract_finance (project_id) values (new.id);
  if new.project_type = 'certification' then
    insert into public.certification_progress (project_id) values (new.id);
  elsif new.project_type = 'training' then
    insert into public.training_progress (project_id) values (new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- Generate contract number
create or replace function public.generate_contract_number(p_user_id uuid, p_prefix text default 'ZD')
returns text as $$
declare
  v_year int := extract(year from now())::int;
  v_number int;
begin
  insert into public.contract_number_seq (user_id, prefix, year, last_number)
  values (p_user_id, p_prefix, v_year, 1)
  on conflict (user_id, year)
  do update set last_number = public.contract_number_seq.last_number + 1, updated_at = now()
  returning last_number into v_number;

  return p_prefix || '-' || v_year::text || '-' || lpad(v_number::text, 3, '0');
end;
$$ language plpgsql security definer;

-- RLS
alter table public.projects enable row level security;
alter table public.contract_finance enable row level security;
alter table public.installment_payments enable row level security;
alter table public.certification_progress enable row level security;
alter table public.training_progress enable row level security;
alter table public.calendar_events enable row level security;
alter table public.memos enable row level security;
alter table public.documents enable row level security;
alter table public.contract_number_seq enable row level security;

create policy "Users manage own projects" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own contract finance" on public.contract_finance for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);
create policy "Users manage own installments" on public.installment_payments for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);
create policy "Users manage own cert progress" on public.certification_progress for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);
create policy "Users manage own training progress" on public.training_progress for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);
create policy "Users manage own calendar events" on public.calendar_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own memos" on public.memos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own documents" on public.documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own contract seq" on public.contract_number_seq for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for documents
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "Users upload own documents" on storage.objects for insert
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read own documents" on storage.objects for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own documents" on storage.objects for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

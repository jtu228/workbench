alter table public.documents
  alter column storage_path drop not null;

alter table public.documents
  add column if not exists external_url text,
  add column if not exists source text not null default 'upload',
  add column if not exists provider_file_id text;

do $$
begin
  alter table public.documents drop constraint if exists documents_source_check;
exception when undefined_object then null;
end $$;

alter table public.documents
  add constraint documents_source_check
  check (source in ('upload', 'google_drive', 'quark_link', 'aliyun_link', 'other_link'));

create table if not exists public.user_cloud_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google_drive', 'quark', 'aliyun')),
  account_email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.user_cloud_accounts enable row level security;

drop policy if exists "Users manage own cloud accounts" on public.user_cloud_accounts;
create policy "Users manage own cloud accounts" on public.user_cloud_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists user_cloud_accounts_updated_at on public.user_cloud_accounts;
create trigger user_cloud_accounts_updated_at
  before update on public.user_cloud_accounts
  for each row execute function public.set_updated_at();

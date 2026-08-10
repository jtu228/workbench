alter table public.documents
  alter column storage_path drop not null;

alter table public.documents
  add column if not exists external_url text,
  add column if not exists source text not null default 'upload';

alter table public.documents
  drop constraint if exists documents_source_check;

alter table public.documents
  add constraint documents_source_check
  check (source in ('upload', 'quark_link', 'other_link'));

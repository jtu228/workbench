alter table public.documents drop constraint if exists documents_source_check;

update public.documents
set source = 'other_link'
where source in ('quark_link', 'aliyun_link');

alter table public.documents
  add constraint documents_source_check
  check (source in ('upload', 'google_drive', 'nutstore', 'other_link'));

delete from public.user_cloud_accounts where provider in ('quark', 'aliyun');

alter table public.user_cloud_accounts drop constraint if exists user_cloud_accounts_provider_check;

alter table public.user_cloud_accounts
  add constraint user_cloud_accounts_provider_check
  check (provider in ('google_drive', 'nutstore'));

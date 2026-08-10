-- Expand document categories for business docs
alter table public.documents drop constraint if exists documents_doc_type_check;

update public.documents set doc_type = 'cert_contract' where doc_type = 'contract';
update public.documents set doc_type = 'cert_form' where doc_type = 'certification';

alter table public.documents
  add constraint documents_doc_type_check
  check (doc_type in (
    'cert_contract',
    'training_agreement',
    'tech_service_agreement',
    'cert_form',
    'template',
    'other'
  ));

alter table public.documents drop constraint if exists documents_source_check;
alter table public.documents
  add constraint documents_source_check
  check (source in ('upload', 'google_drive', 'nutstore', 'local_folder', 'other_link'));

alter table public.user_cloud_accounts drop constraint if exists user_cloud_accounts_provider_check;
alter table public.user_cloud_accounts
  add constraint user_cloud_accounts_provider_check
  check (provider in ('google_drive', 'nutstore', 'local_folder'));

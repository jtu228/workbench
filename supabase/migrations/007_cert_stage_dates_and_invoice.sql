alter table public.certification_progress
  add column if not exists stage_1_date date,
  add column if not exists stage_2_date date,
  add column if not exists teacher_invoice_provided boolean not null default false;

update public.certification_progress
set stage_1_date = audit_date
where stage_1_date is null and audit_date is not null;

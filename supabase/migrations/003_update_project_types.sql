-- Update project types: certification, training, technical_service, custom
update public.projects set project_type = 'custom' where project_type = 'other';

alter table public.projects drop constraint if exists projects_project_type_check;
alter table public.projects add constraint projects_project_type_check
  check (project_type in ('certification', 'training', 'technical_service', 'custom'));

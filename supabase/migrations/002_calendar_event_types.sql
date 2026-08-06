-- Align calendar event types: remove leader_travel, keep client_visit/leave/audit/other
update public.calendar_events set event_type = 'other' where event_type = 'leader_travel';

alter table public.calendar_events drop constraint if exists calendar_events_event_type_check;
alter table public.calendar_events add constraint calendar_events_event_type_check
  check (event_type in ('client_visit', 'leave', 'audit', 'other'));

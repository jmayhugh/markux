-- 003_add_feedback_status.sql
-- Expands the annotations.status CHECK constraint to allow 'feedback'
-- as a third value alongside 'open' and 'resolved'.

alter table annotations drop constraint annotations_status_check;

alter table annotations add constraint annotations_status_check
  check (status in ('open', 'feedback', 'resolved'));

-- =====================================================================
-- FitScribe — Communication automation settings (reminders & nudges)
-- Run AFTER schema.sql and schema_messages.sql.
-- Adds per-coach preferences that the comms-cron Edge Function reads to
-- decide which automated system messages to post.
-- =====================================================================

alter table settings
  add column if not exists "remindersEnabled"  boolean default true,
  add column if not exists "reminderLeadHours" integer default 24,
  add column if not exists "nudgeMissed"       boolean default true,
  add column if not exists "nudgeLowActivity"  boolean default true,
  add column if not exists "lowActivityDays"   integer default 4,
  add column if not exists "nudgeIncomplete"   boolean default true,
  add column if not exists "nudgeReassess"     boolean default true,
  add column if not exists "reassessIntervalDays" integer default 84;

-- ---------------------------------------------------------------------
-- Scheduling the cron (run once, after `supabase functions deploy comms-cron`).
-- Requires the pg_cron and pg_net extensions (enable them under
-- Database → Extensions). Replace <PROJECT-REF> and <SERVICE_ROLE_KEY>.
-- The function is safe to call repeatedly: it de-dupes by broadcastId.
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--
--   select cron.schedule('fitscribe-comms-hourly', '0 * * * *', $$
--     select net.http_post(
--       url     := 'https://<PROJECT-REF>.functions.supabase.co/comms-cron',
--       headers := jsonb_build_object(
--                    'Content-Type', 'application/json',
--                    'Authorization', 'Bearer <SERVICE_ROLE_KEY>'),
--       body    := '{}'::jsonb
--     );
--   $$);
--
-- (To change the cadence, cron.unschedule('fitscribe-comms-hourly') then
--  re-schedule with a different cron expression.)
-- ---------------------------------------------------------------------

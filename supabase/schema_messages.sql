-- =====================================================================
-- FitScribe — In-app messaging (run AFTER schema.sql and schema_athlete.sql)
-- One table backs coach<->athlete chat (and later broadcasts / voice /
-- form-check via the `kind` + `attachmentPath` columns). A BEFORE INSERT
-- trigger derives `coachId` from the client row, so athlete inserts land
-- under the right coach without the client trusting the sender.
-- =====================================================================

create table if not exists messages (
  "id" text primary key,
  "coachId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "clientId" text not null references clients(id) on delete cascade,
  "senderId" uuid references auth.users(id),
  "senderRole" text not null default 'coach',   -- 'coach' | 'athlete'
  "kind" text not null default 'text',           -- 'text' | 'voice' | 'video' | 'system'
  "body" text,
  "attachmentPath" text,
  "durationSec" integer,
  "broadcastId" text,
  "createdAt" timestamptz not null default now(),
  "readAt" timestamptz
);
create index if not exists messages_client_idx on messages ("clientId", "createdAt");
create index if not exists messages_coach_idx on messages ("coachId");

-- Derive coachId from the client (and default senderId to the caller) so an
-- athlete insert is owned by their coach, not by the athlete.
create or replace function set_message_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select "coachId" into new."coachId" from clients where id = new."clientId";
  if new."senderId" is null then new."senderId" := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists trg_set_message_owner on messages;
create trigger trg_set_message_owner before insert on messages
  for each row execute function set_message_owner();

alter table messages enable row level security;

-- Coach: full access to threads for the clients they own.
drop policy if exists coach_messages on messages;
create policy coach_messages on messages for all to authenticated
  using ("clientId" in (select id from clients where "coachId" = auth.uid()))
  with check ("clientId" in (select id from clients where "coachId" = auth.uid()));

-- Athlete: read their own thread, post as themselves, and mark read.
drop policy if exists athlete_reads_messages on messages;
create policy athlete_reads_messages on messages for select to authenticated
  using ("clientId" in (select id from clients where "userId" = auth.uid()));

drop policy if exists athlete_writes_messages on messages;
create policy athlete_writes_messages on messages for insert to authenticated
  with check ("clientId" in (select id from clients where "userId" = auth.uid()) and "senderRole" = 'athlete');

drop policy if exists athlete_marks_read on messages;
create policy athlete_marks_read on messages for update to authenticated
  using ("clientId" in (select id from clients where "userId" = auth.uid()))
  with check ("clientId" in (select id from clients where "userId" = auth.uid()));

-- Realtime delivery. Safe to re-run: ignore the error if already added.
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; end $$;

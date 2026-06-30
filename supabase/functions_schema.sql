-- =====================================================================
-- FitScribe — Edge Function support tables (run AFTER schema.sql)
-- Stores wearable OAuth tokens. Only Edge Functions (service role) write these;
-- coaches may read their own rows. Secrets never reach the browser.
-- =====================================================================
create table if not exists wearable_tokens (
  "clientId" text not null,
  "coachId" uuid not null references auth.users(id) on delete cascade,
  "provider" text not null,
  "accessToken" text,
  "refreshToken" text,
  "expiresAt" timestamptz,
  primary key ("clientId", "provider")
);

alter table wearable_tokens enable row level security;
drop policy if exists coach_reads_tokens on wearable_tokens;
-- Coaches can see which providers are connected; tokens are written by the
-- service role inside Edge Functions (which bypasses RLS), never by the client.
create policy coach_reads_tokens on wearable_tokens for select to authenticated
  using ("coachId" = auth.uid());

-- Athletes can see and remove their own device connections.
drop policy if exists athlete_reads_tokens on wearable_tokens;
create policy athlete_reads_tokens on wearable_tokens for select to authenticated
  using ("clientId" in (select id from clients where "userId" = auth.uid()));
drop policy if exists athlete_deletes_tokens on wearable_tokens;
create policy athlete_deletes_tokens on wearable_tokens for delete to authenticated
  using ("clientId" in (select id from clients where "userId" = auth.uid()));

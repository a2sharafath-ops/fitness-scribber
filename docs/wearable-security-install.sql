-- Applied to production haxxetirrcrwzwdzsdui on 11 October 2026 with explicit user approval.
-- Preflight: neither wearable table existed in the configured project.
begin;
create table if not exists public.wearable_tokens (
  "clientId" text not null,
  "coachId" uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  "accessToken" text,
  "refreshToken" text,
  "expiresAt" timestamptz,
  primary key ("clientId", provider)
);

-- Per-user short-lived OAuth transactions; no browser role gets access.
create table public.wearable_oauth_requests (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{43}$'),
  "clientId" text not null references public.clients(id) on delete cascade,
  "coachId" uuid not null references auth.users(id) on delete cascade,
  "userId" uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('oura', 'whoop', 'fitbit')),
  challenge text not null check (challenge ~ '^[A-Za-z0-9_-]{43}$'),
  "expiresAt" timestamptz not null,
  code text check (length(code) <= 4096)
);
create index wearable_oauth_expiry on public.wearable_oauth_requests ("expiresAt");
alter table public.wearable_oauth_requests enable row level security;
revoke all on public.wearable_oauth_requests from PUBLIC, anon, authenticated;
grant select, insert, update, delete on public.wearable_oauth_requests to service_role;

alter table public.wearable_tokens enable row level security;
drop policy if exists coach_reads_tokens on public.wearable_tokens;
drop policy if exists athlete_reads_tokens on public.wearable_tokens;
drop policy if exists athlete_deletes_tokens on public.wearable_tokens;
revoke all on public.wearable_tokens from PUBLIC, anon, authenticated;
-- Table REVOKE does not remove independently granted column privileges.
do $$
declare col record;
begin
  for col in select attname from pg_attribute
    where attrelid = 'public.wearable_tokens'::regclass and attnum > 0 and not attisdropped
  loop
    execute format('revoke all (%I) on public.wearable_tokens from PUBLIC, anon, authenticated', col.attname);
  end loop;
end $$;
grant select, insert, update, delete on public.wearable_tokens to service_role;

commit;
-- After approval, arrange a server-only scheduled cleanup of expired requests:
-- DELETE FROM public.wearable_oauth_requests WHERE "expiresAt" < now();
-- Never restore browser access as a rollback. Pause wearable connections instead.

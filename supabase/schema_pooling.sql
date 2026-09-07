-- Additive pooling foundation. Local synthetic testing only until release approval.
-- Apply after schema.sql and schema_athlete.sql. No legacy row is rewritten.
begin;
create table if not exists public.pooling_runtime (
  singleton boolean primary key default true check(singleton),
  r1 boolean not null default false,
  r2 boolean not null default false,
  r3 boolean not null default false,
  check (r1 or (not r2 and not r3))
);
insert into public.pooling_runtime(singleton) values(true) on conflict do nothing;
alter table public.pooling_runtime enable row level security;
revoke all on public.pooling_runtime from public, anon, authenticated;
create table if not exists public.pooling_contexts (
  client_id text primary key references public.clients(id),
  generation bigint not null default 1 check (generation > 0),
  held boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.pooling_reports (
  id bigint generated always as identity primary key,
  client_id text not null references public.clients(id),
  actor_id uuid not null references auth.users(id),
  reporter_kind text not null check (reporter_kind in ('coach_entry','client_report')),
  field text not null,
  value jsonb not null,
  effective_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  generation bigint not null,
  operation_key text not null,
  unique(actor_id, client_id, operation_key)
);
create table if not exists public.pooling_drafts (
  id bigint generated always as identity primary key,
  client_id text not null references public.clients(id),
  actor_id uuid not null references auth.users(id),
  revision bigint not null check(revision > 0),
  context_generation bigint not null,
  parent_id bigint references public.pooling_drafts(id),
  proposal jsonb not null,
  state text not null default 'draft' check(state = 'draft'),
  operation_key text not null,
  created_at timestamptz not null default now(),
  unique(actor_id, client_id, operation_key)
);

alter table public.pooling_contexts enable row level security;
alter table public.pooling_reports enable row level security;
alter table public.pooling_drafts enable row level security;
revoke all on public.pooling_contexts, public.pooling_reports, public.pooling_drafts from public, anon, authenticated;
grant select on public.pooling_contexts, public.pooling_reports, public.pooling_drafts to authenticated;

drop policy if exists pool_context_read on public.pooling_contexts;
create policy pool_context_read on public.pooling_contexts for select to authenticated using (
  exists(select 1 from public.clients c where c.id=client_id and (c."coachId"=auth.uid() or c."userId"=auth.uid()))
);
drop policy if exists pool_report_read on public.pooling_reports;
create policy pool_report_read on public.pooling_reports for select to authenticated using (
  exists(select 1 from public.clients c where c.id=client_id and c."coachId"=auth.uid()) or actor_id=auth.uid()
);
drop policy if exists pool_draft_read on public.pooling_drafts;
create policy pool_draft_read on public.pooling_drafts for select to authenticated using (
  exists(select 1 from public.clients c where c.id=client_id and c."coachId"=auth.uid())
);

create or replace function public.pooling_submit_report(
  target_client text, expected_generation bigint, operation_key text,
  report_field text, report_value jsonb, effective_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.clients%rowtype; ctx public.pooling_contexts%rowtype;
  prior public.pooling_reports%rowtype; report_id bigint; actor uuid := auth.uid();
begin
  if actor is null then raise exception 'forbidden'; end if;
  if not (select r1 from public.pooling_runtime where singleton) then raise exception 'feature_disabled'; end if;
  select * into c from public.clients where id=target_client for update;
  if not found or (c."coachId" is distinct from actor and c."userId" is distinct from actor) then raise exception 'forbidden'; end if;
  if length(operation_key) not between 8 and 200 or operation_key is null then raise exception 'invalid_operation_key'; end if;
  if report_field is null or report_field not in ('healthChange','sleep','stress','fatigue','soreness','equipment','budgetSeconds') then raise exception 'invalid_field'; end if;
  if report_value is null or report_value='null'::jsonb or effective_at is null or effective_at > clock_timestamp() then raise exception 'invalid_report'; end if;
  if report_field='healthChange' and report_value not in ('"changed"'::jsonb,'"no_change"'::jsonb,'"declined"'::jsonb) then raise exception 'invalid_health_change'; end if;
  if report_field in ('sleep','stress','fatigue','soreness') and
    (jsonb_typeof(report_value)<>'number' or report_value::text::numeric < 1 or report_value::text::numeric > 7 or trunc(report_value::text::numeric) <> report_value::text::numeric)
    then raise exception 'invalid_wellness'; end if;
  if report_field='budgetSeconds' and (jsonb_typeof(report_value)<>'number' or report_value::text::numeric <= 0) then raise exception 'invalid_budget'; end if;
  if report_field='equipment' and jsonb_typeof(report_value)<>'array' then raise exception 'invalid_equipment'; end if;
  select * into prior from public.pooling_reports r where r.client_id=target_client and r.actor_id=actor and r.operation_key=pooling_submit_report.operation_key;
  if found then
    if prior.field<>report_field or prior.value<>report_value or prior.effective_at<>pooling_submit_report.effective_at then raise exception 'idempotency_conflict'; end if;
    return jsonb_build_object('id',prior.id,'generation',prior.generation,'status','saved');
  end if;
  insert into public.pooling_contexts(client_id) values(target_client) on conflict do nothing;
  select * into ctx from public.pooling_contexts where client_id=target_client for update;
  if expected_generation is distinct from ctx.generation then raise exception 'stale_context'; end if;
  update public.pooling_contexts set generation=generation+1,
    held=held or (report_field='healthChange' and report_value <> '"no_change"'::jsonb), updated_at=now()
    where client_id=target_client returning * into ctx;
  insert into public.pooling_reports(client_id, actor_id,reporter_kind,field,value,effective_at,generation,operation_key)
    values(target_client,actor,case when c."coachId"=actor then 'coach_entry' else 'client_report' end,
    report_field,report_value,pooling_submit_report.effective_at,ctx.generation,pooling_submit_report.operation_key)
    returning id into report_id;
  return jsonb_build_object('id',report_id,'generation',ctx.generation,'status','saved');
end $$;

create or replace function public.pooling_save_draft(
  target_client text, expected_generation bigint, operation_key text, proposal jsonb, parent_id bigint default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.clients%rowtype; ctx public.pooling_contexts%rowtype; prior public.pooling_drafts%rowtype;
  parent public.pooling_drafts%rowtype; draft_id bigint; actor uuid := auth.uid(); next_revision bigint := 1;
begin
  if actor is null then raise exception 'forbidden'; end if;
  if not (select r1 from public.pooling_runtime where singleton) then raise exception 'feature_disabled'; end if;
  select * into c from public.clients where id=target_client for update;
  if not found or c."coachId" is distinct from actor then raise exception 'forbidden'; end if;
  if operation_key is null or length(operation_key) not between 8 and 200 then raise exception 'invalid_operation_key'; end if;
  if proposal is null or jsonb_typeof(proposal)<>'object' or octet_length(proposal::text)>262144 then raise exception 'invalid_proposal'; end if;
  if proposal ?| array['approval','assignment','approvedBy','assigned','coachId','actorId'] then raise exception 'protected_field'; end if;
  select * into prior from public.pooling_drafts d where d.client_id=target_client and d.actor_id=actor and d.operation_key=pooling_save_draft.operation_key;
  if found then
    if prior.proposal<>pooling_save_draft.proposal or prior.parent_id is distinct from pooling_save_draft.parent_id then raise exception 'idempotency_conflict'; end if;
    return jsonb_build_object('id',prior.id,'revision',prior.revision,'status','saved','state','draft');
  end if;
  insert into public.pooling_contexts(client_id) values(target_client) on conflict do nothing;
  select * into ctx from public.pooling_contexts where client_id=target_client for update;
  if expected_generation is distinct from ctx.generation then raise exception 'stale_context'; end if;
  if parent_id is not null then
    select * into parent from public.pooling_drafts d where d.id=pooling_save_draft.parent_id and d.client_id=target_client;
    if not found then raise exception 'invalid_parent'; end if;
    if exists(select 1 from public.pooling_drafts d where d.parent_id=parent.id) then raise exception 'draft_conflict'; end if;
    next_revision := parent.revision+1;
  end if;
  insert into public.pooling_drafts(client_id,actor_id,revision,context_generation,parent_id,proposal,operation_key)
    values(target_client,actor,next_revision,ctx.generation,pooling_save_draft.parent_id,pooling_save_draft.proposal,pooling_save_draft.operation_key)
    returning id into draft_id;
  return jsonb_build_object('id',draft_id,'revision',next_revision,'status','saved','state','draft');
end $$;
revoke all on function public.pooling_submit_report(text,bigint,text,text,jsonb,timestamptz) from public, anon;
revoke all on function public.pooling_save_draft(text,bigint,text,jsonb,bigint) from public, anon;
grant execute on function public.pooling_submit_report(text,bigint,text,text,jsonb,timestamptz) to authenticated;
grant execute on function public.pooling_save_draft(text,bigint,text,jsonb,bigint) to authenticated;
commit;

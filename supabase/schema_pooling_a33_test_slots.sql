-- A33: bounded engineering fixtures only. No original rows or flags are changed.
begin;
create table if not exists public.pooling_engineering_slots (
 coach_id uuid primary key references auth.users(id),
 workspace_limit integer not null check(workspace_limit in (1,2)),
 run_id text not null check(run_id like 'fs_pool_a33_%'),
 expires_at timestamptz not null,
 revoked_at timestamptz
);
create unique index if not exists pooling_one_engineering_pair on public.pooling_engineering_slots(workspace_limit);
alter table public.pooling_engineering_slots enable row level security;
revoke all on public.pooling_engineering_slots from public,anon,authenticated;
grant select,insert,update on public.pooling_engineering_slots to service_role;

create or replace function public.pooling_engineering_slot_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if (to_jsonb(new)-'revoked_at') is distinct from (to_jsonb(old)-'revoked_at') or (old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at) then raise exception 'engineering_grant_immutable';end if;
  return new;
 end if;
 perform 1 from public.pooling_test_config where singleton for update;
 if not exists(select 1 from auth.users u join public.pooling_test_config x on x.singleton
  where u.id=new.coach_id and u.raw_user_meta_data->>'fixture'=new.run_id
  and u.raw_user_meta_data->>'scope'='A33' and u.raw_user_meta_data->>'fictional'='true'
  and u.email like '%@example.invalid' and u.created_at>='2026-09-08T00:00:00Z'
  and new.expires_at=x.ends_at and x.enabled and x.ends_at>clock_timestamp())
  or exists(select 1 from public.pooling_test_workspaces where coach_id=new.coach_id)
  then raise exception 'new_engineering_fixture_required';end if;
 return new;
end $$;
drop trigger if exists pooling_engineering_slot_guard on public.pooling_engineering_slots;
create trigger pooling_engineering_slot_guard before insert or update on public.pooling_engineering_slots for each row execute function public.pooling_engineering_slot_guard();

create or replace function public.pooling_workspace_slot_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare allowed integer:=1;x public.pooling_test_config%rowtype;
begin
 if TG_OP='UPDATE' then
  if new.client_id is distinct from old.client_id or new.coach_id is distinct from old.coach_id or new.created_at is distinct from old.created_at
   or new.manifest_id is distinct from old.manifest_id or new.notice_id is distinct from old.notice_id or new.expires_at is distinct from old.expires_at
   then raise exception 'workspace_identity_locked';end if;
  return new;
 end if;
 -- Serialize all creation, including privileged inserts, across every coach.
 select * into x from public.pooling_test_config where singleton for update;
 if not found or not x.enabled or x.ends_at<=clock_timestamp() or not(new.coach_id=any(x.coach_ids)) then raise exception 'test_unavailable';end if;
 if new.expires_at>x.ends_at or new.expires_at<=clock_timestamp() then raise exception 'invalid_test_expiry';end if;
 if (select count(*) from public.pooling_test_workspaces)>=9 then raise exception 'test_limit_reached';end if;
 select workspace_limit into allowed from public.pooling_engineering_slots where coach_id=new.coach_id and revoked_at is null and expires_at>clock_timestamp();
 allowed:=coalesce(allowed,1);
 if (select count(*) from public.pooling_test_workspaces where coach_id=new.coach_id)>=allowed then raise exception 'coach_workspace_limit';end if;
 return new;
end $$;
drop trigger if exists pooling_workspace_slot_guard on public.pooling_test_workspaces;
create trigger pooling_workspace_slot_guard before insert or update on public.pooling_test_workspaces for each row execute function public.pooling_workspace_slot_guard();
-- The guarded replacement still enforces one workspace for every non-grantee.
alter table public.pooling_test_workspaces drop constraint if exists pooling_test_workspaces_coach_id_key;
create index if not exists pooling_test_workspace_coach_order on public.pooling_test_workspaces(coach_id,created_at,client_id);

create or replace function public.pooling_create_test_slot(acknowledged boolean,requested_slot integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare x public.pooling_test_config%rowtype;w public.pooling_test_workspaces%rowtype;actor uuid:=auth.uid();cid text;mid text;nid text;doc jsonb;expiry timestamptz;
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and role='coach') then raise exception 'forbidden';end if;
 if acknowledged is distinct from true then raise exception 'test_acknowledgement_required';end if;
 if requested_slot is null or requested_slot not in (1,2) then raise exception 'invalid_test_slot';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,6090831));
 if requested_slot=2 and not exists(select 1 from public.pooling_engineering_slots where coach_id=actor and workspace_limit=2 and revoked_at is null and expires_at>clock_timestamp()) then raise exception 'engineering_slot_forbidden';end if;
 select * into w from public.pooling_test_workspaces where coach_id=actor order by created_at,client_id limit 1 offset requested_slot-1;
 if found then return public.pooling_client_runtime(w.client_id);end if;
 if requested_slot=2 and not exists(select 1 from public.pooling_test_workspaces where coach_id=actor) then raise exception 'primary_workspace_required';end if;
 select * into x from public.pooling_test_config where singleton for update;
 if not found or not x.enabled or x.ends_at<=clock_timestamp() or not(actor=any(x.coach_ids)) then raise exception 'test_unavailable';end if;
 if (select count(*) from public.pooling_test_workspaces)>=9 then raise exception 'test_limit_reached';end if;
 cid:='fs_pool_coachtest_'||gen_random_uuid()::text;mid:=cid||'_manifest';nid:=cid||'_notice';expiry:=least(x.ends_at,clock_timestamp()+interval '7 days');
 doc:=jsonb_set(x.template,'{manifest,id}',to_jsonb(mid));
 insert into public.clients(id,"coachId","userId",name,goal,level,status,joined,notes,intake)
 values(cid,actor,actor,'FICTIONAL SOFTWARE TEST — DO NOT TRAIN','general_fitness','beginner','Active',to_char(clock_timestamp(),'YYYY-MM-DD'),
 'Software workflow testing only. This is not a real client or clinical consent.',jsonb_build_object('testOnly',true,'source','A33','slot',requested_slot));
 insert into public.pooling_manifests(id,state,document) values(mid,'published',doc);
 insert into public.pooling_policy_documents(id,scope,market,title,body,state,evidence_reference)
 values(nid,'adult_general_fitness',cid,'Fictional software-test acknowledgement',
 'I am testing a fictional scenario under my own login. No exercise should be performed. This is not another person’s consent, a privacy policy or professional acceptance.','published','Owner-authorized bounded software testing only');
 -- now() is transaction-stable: two calls in one transaction must not tie.
 insert into public.pooling_test_workspaces(client_id,coach_id,manifest_id,notice_id,expires_at,created_at)
 values(cid,actor,mid,nid,expiry,greatest(clock_timestamp(),(select max(created_at)+interval '1 microsecond' from public.pooling_test_workspaces where coach_id=actor)));
 insert into public.pooling_scope_grants(id,client_id,scope,market,reviewer_id,evidence_reference,valid_until)
 values(cid||'_scope',cid,'adult_general_fitness',cid,'fictional-engineering-scenario','Software fixture only; no professional authority',expiry);
 perform public.pooling_record_consent(cid,nid,'accepted',cid||'_acknowledgement');
 return public.pooling_client_runtime(cid);
end $$;
revoke all on function public.pooling_create_test_slot(boolean,integer) from public,anon,authenticated,service_role;

create or replace function public.pooling_create_test_workspace(acknowledged boolean)
returns jsonb language sql security definer set search_path='' as $$ select public.pooling_create_test_slot(acknowledged,1) $$;
create or replace function public.pooling_create_engineering_secondary(acknowledged boolean)
returns jsonb language sql security definer set search_path='' as $$ select public.pooling_create_test_slot(acknowledged,2) $$;
revoke all on function public.pooling_create_engineering_secondary(boolean) from public,anon;
grant execute on function public.pooling_create_engineering_secondary(boolean) to authenticated;

create or replace function public.pooling_test_status()
returns jsonb language plpgsql security definer set search_path='' as $$
declare x public.pooling_test_config%rowtype;w public.pooling_test_workspaces%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='coach') then raise exception 'forbidden';end if;
 select * into x from public.pooling_test_config where singleton;
 select * into w from public.pooling_test_workspaces where coach_id=auth.uid() order by created_at,client_id limit 1;
 return jsonb_build_object('available',coalesce(x.enabled and x.ends_at>clock_timestamp() and auth.uid()=any(x.coach_ids),false),
 'endsAt',x.ends_at,'clientId',w.client_id,'runtime',case when w.client_id is not null then public.pooling_client_runtime(w.client_id) else null end);
end $$;
create or replace function public.pooling_actor_runtime()
returns jsonb language plpgsql security definer set search_path='' as $$
declare cid text;linked_count integer;
begin
 if auth.uid() is null then raise exception 'forbidden';end if;
 select count(*) into linked_count from public.clients where "userId"=auth.uid();
 if linked_count>1 then
  if linked_count=2 and exists(select 1 from public.pooling_engineering_slots where coach_id=auth.uid() and workspace_limit=2)
   and (select count(*) from public.pooling_test_workspaces w join public.clients c on c.id=w.client_id where w.coach_id=auth.uid() and c."userId"=auth.uid() and c."coachId"=auth.uid())=2 then
   select client_id into cid from public.pooling_test_workspaces where coach_id=auth.uid() order by created_at,client_id limit 1;
  else raise exception 'client_selection_required';end if;
 else select id into cid from public.clients where "userId"=auth.uid();end if;
 if cid is null then return '{"clientId":null,"governed":false,"r1":false,"r2":false,"r3":false}'::jsonb;end if;
 return public.pooling_client_runtime(cid);
end $$;
revoke all on function public.pooling_engineering_slot_guard(),public.pooling_workspace_slot_guard() from public,anon,authenticated,service_role;
commit;

-- A31 owner-approved fictional coach-test scope. No global activation.
create table if not exists public.pooling_test_config (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false, ends_at timestamptz not null,
 coach_ids uuid[] not null default '{}', template jsonb not null,
 check(cardinality(coach_ids)<=3)
);
create table if not exists public.pooling_test_workspaces (
 client_id text primary key references public.clients(id),
 coach_id uuid not null unique references auth.users(id),
 manifest_id text not null unique references public.pooling_manifests(id),
 notice_id text not null references public.pooling_policy_documents(id),
 expires_at timestamptz not null, revoked_at timestamptz,
 writes integer not null default 0 check(writes between 0 and 160),
 created_at timestamptz not null default now()
);
alter table public.pooling_test_config enable row level security;
alter table public.pooling_test_workspaces enable row level security;
revoke all on public.pooling_test_config,public.pooling_test_workspaces from public,anon,authenticated;
grant all on public.pooling_test_config,public.pooling_test_workspaces to service_role;

create or replace function public.pooling_module_enabled(target_client text,module text)
returns boolean language sql volatile security definer set search_path='' as $$
 select module in ('r1','r2','r3') and (
 exists(select 1 from public.pooling_runtime where singleton and r1 and case module when 'r2' then r2 when 'r3' then r3 else true end)
 or exists(select 1 from public.pooling_test_workspaces w join public.pooling_test_config x on x.singleton
 join public.clients c on c.id=w.client_id and c."coachId"=w.coach_id and c."userId"=w.coach_id
 where w.client_id=target_client and w.revoked_at is null and w.expires_at>clock_timestamp()
 and x.enabled and x.ends_at>clock_timestamp() and w.coach_id=any(x.coach_ids)))
$$;
create or replace function public.pooling_governed_client(target_client text)
returns boolean language sql stable security definer set search_path='' as $$
 select public.pooling_enabled() or exists(select 1 from public.pooling_test_workspaces where client_id=target_client)
$$;
create or replace function public.pooling_manifest_allowed(target_client text,target_manifest text)
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.pooling_test_workspaces where manifest_id=target_manifest and client_id<>target_client)
 and not exists(select 1 from public.pooling_test_workspaces where client_id=target_client and manifest_id<>target_manifest)
$$;
revoke all on function public.pooling_module_enabled(text,text),public.pooling_governed_client(text),public.pooling_manifest_allowed(text,text) from public,anon;
grant execute on function public.pooling_module_enabled(text,text),public.pooling_governed_client(text),public.pooling_manifest_allowed(text,text) to authenticated,service_role;

create or replace function public.pooling_client_runtime(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype;w public.pooling_test_workspaces%rowtype;active boolean;
begin
 select * into c from public.clients where id=target_client;
 if not found or auth.uid() is null or (c."coachId" is distinct from auth.uid() and c."userId" is distinct from auth.uid()) then raise exception 'forbidden';end if;
 select * into w from public.pooling_test_workspaces where client_id=target_client;
 active:=public.pooling_module_enabled(target_client,'r1');
 return jsonb_build_object('clientId',target_client,'r1',active,'r2',public.pooling_module_enabled(target_client,'r2'),'r3',public.pooling_module_enabled(target_client,'r3'),
 'governed',public.pooling_governed_client(target_client),'testOnly',w.client_id is not null,'expiresAt',w.expires_at,'revoked',w.revoked_at is not null,
 'manifestId',w.manifest_id,'noticeId',w.notice_id,'remainingWrites',case when w.client_id is not null then 160-w.writes else null end);
end $$;
create or replace function public.pooling_actor_runtime()
returns jsonb language plpgsql security definer set search_path='' as $$
declare cid text;
begin
 if auth.uid() is null then raise exception 'forbidden';end if;
 if (select count(*) from public.clients where "userId"=auth.uid())>1 then raise exception 'client_selection_required';end if;
 select id into cid from public.clients where "userId"=auth.uid();
 if cid is null then return '{"clientId":null,"governed":false,"r1":false,"r2":false,"r3":false}'::jsonb;end if;
 return public.pooling_client_runtime(cid);
end $$;
create or replace function public.pooling_test_status()
returns jsonb language plpgsql security definer set search_path='' as $$
declare x public.pooling_test_config%rowtype;w public.pooling_test_workspaces%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='coach') then raise exception 'forbidden';end if;
 select * into x from public.pooling_test_config where singleton;
 select * into w from public.pooling_test_workspaces where coach_id=auth.uid();
 return jsonb_build_object('available',coalesce(x.enabled and x.ends_at>clock_timestamp() and auth.uid()=any(x.coach_ids),false),
 'endsAt',x.ends_at,'clientId',w.client_id,'runtime',case when w.client_id is not null then public.pooling_client_runtime(w.client_id) else null end);
end $$;

create or replace function public.pooling_create_test_workspace(acknowledged boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare x public.pooling_test_config%rowtype;w public.pooling_test_workspaces%rowtype;actor uuid:=auth.uid();cid text;mid text;nid text;doc jsonb;expiry timestamptz;
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and role='coach') then raise exception 'forbidden';end if;
 if acknowledged is distinct from true then raise exception 'test_acknowledgement_required';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,6090831));
 select * into w from public.pooling_test_workspaces where coach_id=actor;
 if found then return public.pooling_client_runtime(w.client_id);end if;
 select * into x from public.pooling_test_config where singleton for share;
 if not found or not x.enabled or x.ends_at<=clock_timestamp() or not(actor=any(x.coach_ids)) then raise exception 'test_unavailable';end if;
 if (select count(*) from public.pooling_test_workspaces)>=3 then raise exception 'test_limit_reached';end if;
 cid:='fs_pool_coachtest_'||gen_random_uuid()::text;mid:=cid||'_manifest';nid:=cid||'_notice';expiry:=least(x.ends_at,clock_timestamp()+interval '7 days');
 doc:=jsonb_set(x.template,'{manifest,id}',to_jsonb(mid));
 insert into public.clients(id,"coachId","userId",name,goal,level,status,joined,notes,intake)
 values(cid,actor,actor,'FICTIONAL SOFTWARE TEST — DO NOT TRAIN','general_fitness','beginner','Active',to_char(clock_timestamp(),'YYYY-MM-DD'),
 'Software workflow testing only. The coach operates a fictional self-linked scenario; this is not a real client or clinical consent.',jsonb_build_object('testOnly',true,'source','A31'));
 insert into public.pooling_manifests(id,state,document) values(mid,'published',doc);
 insert into public.pooling_policy_documents(id,scope,market,title,body,state,evidence_reference)
 values(nid,'adult_general_fitness',cid,'Fictional software-test acknowledgement',
 'I am testing a fictional scenario under my own login. No exercise should be performed. This is not another person’s consent, a privacy policy or professional acceptance.','published','Owner-authorized A31 software testing only');
 insert into public.pooling_test_workspaces(client_id,coach_id,manifest_id,notice_id,expires_at) values(cid,actor,mid,nid,expiry);
 insert into public.pooling_scope_grants(id,client_id,scope,market,reviewer_id,evidence_reference,valid_until)
 values(cid||'_scope',cid,'adult_general_fitness',cid,'fictional-engineering-scenario','A31 fixture only; no professional authority',expiry);
 -- The actor is the new fictional self-linked tester, never another real client.
 perform public.pooling_record_consent(cid,nid,'accepted',cid||'_acknowledgement');
 return public.pooling_client_runtime(cid);
end $$;

create or replace function public.pooling_revoke_test_workspace(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.pooling_test_workspaces where client_id=target_client and coach_id=auth.uid()) then raise exception 'forbidden';end if;
 perform 1 from public.clients where id=target_client for update;
 update public.pooling_test_workspaces set revoked_at=coalesce(revoked_at,clock_timestamp()) where client_id=target_client;
 return public.pooling_client_runtime(target_client);
end $$;

create or replace function public.pooling_test_scenario(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.pooling_test_workspaces%rowtype;doc jsonb;at timestamptz:=clock_timestamp();source jsonb;inventory jsonb;exercise jsonb;dose jsonb;
begin
 select * into w from public.pooling_test_workspaces where client_id=target_client and coach_id=auth.uid();
 if not found then raise exception 'forbidden';end if;
 if not public.pooling_module_enabled(target_client,'r1') then raise exception 'test_unavailable';end if;
 select document into doc from public.pooling_manifests where id=w.manifest_id and state='published';
 if doc is null then raise exception 'content_revoked';end if;
 inventory:=public.pooling_source_inventory(auth.uid(),target_client);
 select v into source from jsonb_array_elements(inventory) v where v->>'source'='clients' and v->>'id'=target_client;
 exercise:=doc->'catalogue'->0;dose:=doc->'doses'->0;
 return jsonb_build_object('testOnly',true,'at',at,'source',source,'generation',(select generation from public.pooling_contexts where client_id=target_client),
 'values',jsonb_build_object('adult',true,'purpose',true,'health','no_change','equipment','[]'::jsonb,'fictional-signal',2,'support','none'),
 'proposal',jsonb_build_object('date',to_char(at at time zone 'UTC','YYYY-MM-DD'),'manifestId',w.manifest_id,
 'session',jsonb_build_object('sessionAt',at,'timeZone','UTC','request',jsonb_build_object('setting','home','level','beginner','roles',jsonb_build_array(jsonb_build_object('id','main','required',true)),'budgetSeconds',10)),
 'selection',jsonb_build_array(jsonb_build_object('occurrenceId','fictional-occ1','role','main','exerciseId',exercise->>'id','exerciseRevision',1,'doseId',dose->>'id','doseRevision',1))));
end $$;

create or replace function public.pooling_protect_test_identity()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.pooling_test_workspaces where client_id=old.id) then
  if TG_OP='DELETE' or to_jsonb(old) is distinct from to_jsonb(new) then raise exception 'fictional_identity_locked';end if;
 end if;
 if TG_OP='DELETE' then return old;end if;return new;
end $$;
drop trigger if exists pooling_test_identity on public.clients;
create trigger pooling_test_identity before update or delete on public.clients for each row execute function public.pooling_protect_test_identity();

create or replace function public.pooling_test_write_limit()
returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb:=to_jsonb(new);cid text;open_sessions integer;write_cap integer;
begin
 cid:=coalesce(row_data->>'client_id',row_data->>'clientId');
 if cid is null and row_data ? 'assignment_id' then select client_id into cid from public.pooling_assignments where id=(row_data->>'assignment_id')::bigint;end if;
 if cid is null and row_data ? 'draft_id' then select client_id into cid from public.pooling_drafts where id=(row_data->>'draft_id')::bigint;end if;
 if cid is null and row_data ? 'week_id' then select client_id into cid from public.pooling_week_reviews where id=(row_data->>'week_id')::bigint;end if;
 if cid is not null and exists(select 1 from public.pooling_test_workspaces where client_id=cid) then
  -- Never let results/corrections consume the last Stop slot for an open session.
  -- Serialize even direct privileged test inserts against the per-workspace cap.
  perform 1 from public.pooling_test_workspaces where client_id=cid for update;
  select count(*) into open_sessions from public.pooling_assignments a where a.client_id=cid and
   (select e.kind from public.pooling_execution_events e where e.assignment_id=a.id and e.kind<>'actual' order by e.id desc limit 1) in ('start','pause','resume');
  write_cap:=least(140,160-open_sessions);
  if TG_TABLE_NAME='pooling_execution_events' then
   if row_data->>'kind' in ('stop','complete') then write_cap:=160;
   elsif row_data->>'kind'='actual' then write_cap:=160-open_sessions;
   elsif row_data->>'kind'='start' then write_cap:=least(140,159-open_sessions);end if;
  end if;
  update public.pooling_test_workspaces set writes=writes+1 where client_id=cid and writes<write_cap;
  if not found then raise exception 'test_limit_reached';end if;
 end if;
 return new;
end $$;
do $$declare t text;begin
 for t in select distinct c.table_name from information_schema.columns c join information_schema.tables b using(table_schema,table_name) where c.table_schema='public' and b.table_type='BASE TABLE' and c.column_name in ('client_id','clientId','assignment_id','draft_id','week_id') and c.table_name not in ('pooling_test_workspaces') loop
  execute format('drop trigger if exists pooling_test_row_limit on public.%I',t);
  execute format('create trigger pooling_test_row_limit before insert on public.%I for each row execute function public.pooling_test_write_limit()',t);
 end loop;
end $$;
revoke all on function public.pooling_client_runtime(text),public.pooling_actor_runtime(),public.pooling_test_status(),public.pooling_create_test_workspace(boolean),public.pooling_revoke_test_workspace(text),public.pooling_test_scenario(text) from public,anon;
grant execute on function public.pooling_client_runtime(text),public.pooling_actor_runtime(),public.pooling_test_status(),public.pooling_create_test_workspace(boolean),public.pooling_revoke_test_workspace(text),public.pooling_test_scenario(text) to authenticated;
revoke all on function public.pooling_protect_test_identity(),public.pooling_test_write_limit() from public,anon,authenticated;

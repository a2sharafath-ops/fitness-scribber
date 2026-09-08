-- Local restore only. All fixture writes roll back; no original hosted identity.
begin;
set local role postgres;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();d uuid:=gen_random_uuid();e uuid:=gen_random_uuid();u uuid;
 ids uuid[];expires timestamptz;p jsonb;s jsonb;v jsonb;n integer;
begin
 if has_function_privilege('authenticated','public.pooling_create_test_slot(boolean,integer)','execute')
  or has_function_privilege('anon','public.pooling_create_engineering_secondary(boolean)','execute')
  or has_table_privilege('authenticated','public.pooling_engineering_slots','insert') then raise exception 'permissions_leak';end if;
 if (select count(*) from public.pooling_test_workspaces)<>4 then raise exception 'baseline_required';end if;
 select ends_at,coach_ids into expires,ids from public.pooling_test_config where singleton;
 foreach u in array array[a,b,c,d,e] loop
  insert into auth.users(id,email,raw_user_meta_data,created_at) values(u,u::text||'@example.invalid',jsonb_build_object('fictional',true,'scope','A33','fixture','fs_pool_a33_local'),clock_timestamp());
  insert into public.profiles(id,role) values(u,'coach') on conflict(id) do update set role='coach';
 end loop;
 insert into public.pooling_engineering_slots values(a,2,'fs_pool_a33_local',expires,null),(b,1,'fs_pool_a33_local',expires,null);
 begin insert into public.pooling_engineering_slots values(ids[1],1,'fs_pool_a33_local',expires,null);raise exception 'original_grant_not_blocked';exception when raise_exception then if sqlerrm<>'new_engineering_fixture_required' then raise;end if;end;
 begin insert into public.pooling_engineering_slots values(c,2,'fs_pool_a33_local',expires,null);raise exception 'grant_limit_missing';exception when unique_violation then null;end;
 update public.pooling_test_config set coach_ids=array[a,b,c,d,e] where singleton;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 begin perform public.pooling_create_engineering_secondary(true);raise exception 'primary_guard_missing';exception when raise_exception then if sqlerrm<>'primary_workspace_required' then raise;end if;end;
 p:=public.pooling_create_test_workspace(true);perform pg_sleep(0.01);s:=public.pooling_create_engineering_secondary(true);
 if p->>'clientId'=s->>'clientId' then raise exception 'secondary_not_distinct';end if;
 if public.pooling_create_test_workspace(true)->>'clientId'<>p->>'clientId'
  or public.pooling_create_engineering_secondary(true)->>'clientId'<>s->>'clientId'
  or public.pooling_test_status()->>'clientId'<>p->>'clientId'
  or public.pooling_actor_runtime()->>'clientId'<>p->>'clientId' then raise exception 'primary_not_deterministic';end if;
 if public.pooling_manifest_allowed(p->>'clientId',s->>'manifestId') then raise exception 'manifest_scope_leak';end if;
 begin update public.pooling_engineering_slots set workspace_limit=1 where coach_id=a;raise exception 'grant_mutable';exception when raise_exception then if sqlerrm<>'engineering_grant_immutable' then raise;end if;end;
 begin update public.pooling_test_workspaces set coach_id=b where client_id=p->>'clientId';raise exception 'identity_mutable';exception when raise_exception then if sqlerrm<>'workspace_identity_locked' then raise;end if;end;
 -- Privileged inserts cannot bypass the original single-workspace constraint.
 foreach u in array array[b,c,d] loop
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  v:=public.pooling_create_test_workspace(true);
  if u in (b,c) then
   begin insert into public.pooling_test_workspaces select * from public.pooling_test_workspaces where client_id=v->>'clientId';raise exception 'privileged_limit_missing';exception when raise_exception then if sqlerrm<>'coach_workspace_limit' then raise;end if;end;
  end if;
  begin perform public.pooling_create_engineering_secondary(true);raise exception 'secondary_auth_missing';exception when raise_exception then if sqlerrm<>'engineering_slot_forbidden' then raise;end if;end;
  if public.pooling_create_test_workspace(true)->>'clientId'<>v->>'clientId' then raise exception 'ordinary_primary_changed';end if;
  if public.pooling_test_status()->>'clientId'<>v->>'clientId' then raise exception 'ordinary_status_changed';end if;
 end loop;
 select count(*) into n from public.pooling_test_workspaces;if n<>9 then raise exception 'unexpected_lifetime_count';end if;
 perform set_config('request.jwt.claim.sub',e::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',e,'role','authenticated')::text,true);
 begin perform public.pooling_create_test_workspace(true);raise exception 'lifetime_guard_missing';exception when raise_exception then if sqlerrm<>'test_limit_reached' then raise;end if;end;
 begin perform public.pooling_client_runtime(p->>'clientId');raise exception 'cross_actor_leak';exception when raise_exception then if sqlerrm<>'forbidden' then raise;end if;end;
 if exists(select 1 from public.pooling_runtime where r1 or r2 or r3) then raise exception 'global_flag_changed';end if;
 if exists(select 1 from public.pooling_test_workspaces where expires_at>expires or writes>160) then raise exception 'expiry_or_quota_changed';end if;
end $$;
rollback;

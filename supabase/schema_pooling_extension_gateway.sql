-- Apply after extension lifecycle and review projection. Server-only numerical IO.
begin;
alter table public.pooling_extension_proposals add column if not exists source_token text;
alter table public.pooling_extension_proposals add column if not exists baseline_assignment_id bigint references public.pooling_assignments(id);
alter table public.pooling_extension_proposals add column if not exists policy_id text;
create unique index if not exists pooling_extension_source_unique on public.pooling_extension_proposals(request_id,source_token);
create or replace function public.pooling_extension_input(verified_actor uuid,target_client text,target_request bigint,target_draft bigint,baseline_assignment bigint,target_policy text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; r public.pooling_extension_requests%rowtype; a public.pooling_assignments%rowtype; v public.pooling_decisions%rowtype; p jsonb; result jsonb; manifest_doc jsonb;
begin
 snapshot:=public.pooling_decision_input(verified_actor,target_client,target_draft);
 select * into r from public.pooling_extension_requests where id=target_request and client_id=target_client;
 if not found then raise exception 'forbidden'; end if;
 if not exists(select 1 from public.pooling_runtime where singleton and r1 and case when r.kind='daily' then r2 else r3 end) then raise exception 'feature_disabled'; end if;
 select * into a from public.pooling_assignments where id=baseline_assignment and client_id=target_client;
 if not found then raise exception 'forbidden'; end if;
 -- Temporary adjustments are not silently reused as the programme baseline.
 if exists(select 1 from public.pooling_extension_reviews x where x.draft_id=a.draft_id) then raise exception 'baseline_review_required'; end if;
 if exists(select 1 from public.pooling_extension_reviews x where x.request_id=r.id) then raise exception 'draft_conflict'; end if;
 if (select proposal->>'date' from public.pooling_drafts where id=target_draft) is distinct from r.proposal->>'date' then raise exception 'session_mismatch'; end if;
 select * into v from public.pooling_decisions where id=a.decision_id;
 select document into manifest_doc from public.pooling_manifests where id=snapshot->'manifest'->>'id';
 select value into p from jsonb_array_elements(coalesce(manifest_doc->'extensionPolicies','[]')) where value->>'id'=target_policy and value->>'kind'=r.kind;
 if p is null then raise exception 'unsupported_policy'; end if;
 result:=jsonb_build_object('clientId',target_client,'kind',r.kind,'policy',p,'manifest',snapshot->'manifest','held',snapshot->'held','contextInput',snapshot->'contextInput',
   'targetProposal',(select proposal from public.pooling_drafts where id=target_draft),'catalogue',snapshot->'catalogue','doses',snapshot->'doses',
   'baselineBlocks',v.result->'blocks','baselineRevision',a.draft_id,'baselineAssignmentId',a.id,
   'completedOccurrences',(select coalesce(jsonb_agg(distinct e.payload->>'occurrenceId'),'[]') from public.pooling_execution_events e where e.assignment_id=a.id and e.kind='actual'),
   'performances',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id::text,'lineageId',e.id::text,'assignmentId',aa.id,'occurrenceId',e.payload->>'occurrenceId','setIndex',e.payload->'setIndex','expectedSets',b->'dose'->'prescription'->'sets',
      'variantId',b->>'exerciseId','variantRevision',b->'exerciseRevision','side',coalesce(e.payload->>'side','not_applicable'),'loadBasis',case when b->'dose'->'prescription'->'loadKg'='null'::jsonb then '"no_external_load"'::jsonb else jsonb_build_object('unit','kg','value',e.payload->'loadKg') end,
      'range',b->'dose'->'prescription'->'comparison'->'range','equipment',b->'dose'->'prescription'->'comparison'->'equipment','unit',e.payload->>'unit',
      'method',b->'dose'->'prescription'->'comparison'->'method','assistance',b->'dose'->'prescription'->'comparison'->'assistance',
      'actual',e.payload->'actual','quality','confirmed','effortConfirmed',e.payload ?& array['effort','effortMethod'] and nullif(b->'dose'->'prescription'->'comparison'->>'effortMethod','') is not null and e.payload->>'effortMethod'=b->'dose'->'prescription'->'comparison'->>'effortMethod',
      'complete',exists(select 1 from public.pooling_execution_events done where done.assignment_id=aa.id and done.kind='complete' and done.recorded_at<=(snapshot->'contextInput'->>'knowledgeCutoff')::timestamptz),
      'effectiveAt',coalesce(e.payload->>'performedAt',e.recorded_at::text),'recordedAt',e.recorded_at)),'[]')
    from public.pooling_assignments aa join public.pooling_decisions vv on vv.id=aa.decision_id join public.pooling_execution_events e on e.assignment_id=aa.id
    cross join lateral jsonb_array_elements(vv.result->'blocks') b where aa.client_id=target_client and e.kind='actual' and b->>'occurrenceId'=e.payload->>'occurrenceId'
     and e.recorded_at<=(snapshot->'contextInput'->>'knowledgeCutoff')::timestamptz
     and not exists(select 1 from public.pooling_execution_events correction where correction.assignment_id=aa.id and correction.payload->>'supersedes'=e.id::text and correction.recorded_at<=(snapshot->'contextInput'->>'knowledgeCutoff')::timestamptz)),
   'sourceToken',snapshot->>'sourceToken');
 return result||jsonb_build_object('extensionToken',encode(sha256(convert_to(result::text,'UTF8')),'hex'));
end $$;
create or replace function public.pooling_record_extension(verified_actor uuid,target_client text,target_request bigint,target_draft bigint,target_decision bigint,baseline_assignment bigint,target_policy text,expected_token text,proposal_result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; rid bigint;
begin
 snapshot:=public.pooling_extension_input(verified_actor,target_client,target_request,target_draft,baseline_assignment,target_policy);
 if snapshot->>'extensionToken' is distinct from expected_token then raise exception 'source_changed'; end if;
 perform public.pooling_assert_decision_current(verified_actor,target_client,target_draft,target_decision);
 if proposal_result is null or jsonb_typeof(proposal_result)<>'object' or octet_length(proposal_result::text)>262144 or proposal_result->>'policyId' is distinct from target_policy then raise exception 'invalid_proposal'; end if;
 insert into public.pooling_extension_proposals(request_id,draft_id,decision_id,result,source_token,baseline_assignment_id,policy_id)
 values(target_request,target_draft,target_decision,proposal_result,expected_token,baseline_assignment,target_policy)
 on conflict(request_id,source_token) do nothing returning id into rid;
 if rid is null then select id into rid from public.pooling_extension_proposals where request_id=target_request and source_token=expected_token and result=proposal_result;end if;
 if rid is null then raise exception 'source_changed'; end if;
 return jsonb_build_object('id',rid,'status','saved','assignment',null);
end $$;
revoke all on function public.pooling_extension_input(uuid,text,bigint,bigint,bigint,text),public.pooling_record_extension(uuid,text,bigint,bigint,bigint,bigint,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.pooling_extension_input(uuid,text,bigint,bigint,bigint,text),public.pooling_record_extension(uuid,text,bigint,bigint,bigint,bigint,text,text,jsonb) to service_role;
commit;

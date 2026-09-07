-- Narrow coach/client assignment projection. No raw decision evidence or notes.
begin;
revoke all on public.pooling_assignments,public.pooling_execution_events from anon,authenticated;
grant select on public.pooling_assignments,public.pooling_execution_events to authenticated;
drop policy if exists assignment_read on public.pooling_assignments;
create policy assignment_read on public.pooling_assignments for select to authenticated using
 (exists(select 1 from public.clients c where c.id=client_id and c."coachId"=auth.uid()));
drop policy if exists execution_read on public.pooling_execution_events;
create policy execution_read on public.pooling_execution_events for select to authenticated using
 (exists(select 1 from public.pooling_assignments a join public.clients c on c.id=a.client_id where a.id=assignment_id and c."coachId"=auth.uid()));

create or replace function public.pooling_read_assignments(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; result jsonb;
begin
 select * into c from public.clients where id=target_client;
 if not found or auth.uid() is null or (c."coachId" is distinct from auth.uid() and c."userId" is distinct from auth.uid()) then raise exception 'forbidden'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',a.id,'draftId',a.draft_id,'date',d.proposal->>'date','approvedAt',a.approved_at,'generation',a.context_generation,
   'contextGeneration',ctx.generation,'held',ctx.held,'stale',ctx.generation<>a.context_generation or m.state<>'published' or v.valid_until<=clock_timestamp(),
   'status',coalesce((select e.kind from public.pooling_execution_events e where e.assignment_id=a.id and e.kind<>'actual' order by e.id desc limit 1),'assigned'),
   'blocks',(select coalesce(jsonb_agg(jsonb_build_object('occurrenceId',b->>'occurrenceId','role',b->>'role','exerciseId',b->>'exerciseId','exerciseRevision',b->'exerciseRevision',
       'prescription',b->'dose'->'prescription') order by ord),'[]') from jsonb_array_elements(v.result->'blocks') with ordinality as x(b,ord)),
   'actuals',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'recordedAt',e.recorded_at,'performedAt',e.payload->>'performedAt','occurrenceId',e.payload->>'occurrenceId','setIndex',e.payload->'setIndex','actual',e.payload->'actual','unit',e.payload->>'unit','side',coalesce(e.payload->>'side','not_applicable'),'loadKg',e.payload->'loadKg','effort',e.payload->'effort','effortMethod',e.payload->>'effortMethod','supersedes',e.payload->'supersedes') order by e.id),'[]') from public.pooling_execution_events e where e.assignment_id=a.id and e.kind='actual')
 ) order by a.id desc),'[]') into result
 from public.pooling_assignments a join public.pooling_drafts d on d.id=a.draft_id join public.pooling_decisions v on v.id=a.decision_id
 join public.pooling_manifests m on m.id=v.manifest_id join public.pooling_contexts ctx on ctx.client_id=a.client_id where a.client_id=target_client;
 return result;
end $$;

-- Receipt lookup is scoped to actor AND operation kind AND target. No global keys.
create or replace function public.pooling_operation_status(target_client text,operation_kind text,operation_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; receipt jsonb;
begin
 select * into c from public.clients where id=target_client;
 if not found or auth.uid() is null or (c."coachId" is distinct from auth.uid() and c."userId" is distinct from auth.uid()) then raise exception 'forbidden'; end if;
 case operation_kind
 when 'draft' then
   select jsonb_build_object('id',d.id,'revision',d.revision,'state','draft','status','saved') into receipt from public.pooling_drafts d
   where d.actor_id=auth.uid() and d.client_id=target_client and d.operation_key=pooling_operation_status.operation_key;
 when 'approve' then
   select jsonb_build_object('assignmentId',a.id,'draftId',a.draft_id,'approvedAt',a.approved_at,'status','committed') into receipt from public.pooling_assignments a
   where a.coach_id=auth.uid() and a.client_id=target_client and a.operation_key=pooling_operation_status.operation_key;
 when 'execution' then
   select jsonb_build_object('eventId',e.id,'status','committed') into receipt from public.pooling_execution_events e join public.pooling_assignments a on a.id=e.assignment_id
   where e.actor_id=auth.uid() and a.client_id=target_client and e.operation_key=pooling_operation_status.operation_key;
 else raise exception 'invalid_operation';
 end case;
 return coalesce(receipt,'{"status":"not_found"}'::jsonb);
end $$;
revoke all on function public.pooling_read_assignments(text),public.pooling_operation_status(text,text,text) from public,anon;
grant execute on function public.pooling_read_assignments(text),public.pooling_operation_status(text,text,text) to authenticated;
commit;

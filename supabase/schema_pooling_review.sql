-- Coach-only review projection. No browser write access to manifests/decisions.
begin;
create or replace function public.pooling_review_workspace(target_client text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype;
begin
 select * into c from public.clients where id=target_client;
 if not found or auth.uid() is null or c."coachId" is distinct from auth.uid() then raise exception 'forbidden'; end if;
 if (select r1 from public.pooling_runtime where singleton) is distinct from true then raise exception 'feature_disabled'; end if;
 return jsonb_build_object(
  'manifests',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'state',m.state,'document',m.document) order by m.id) from public.pooling_manifests m where m.state='published'),'[]'),
  'decisions',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'draftId',v.draft_id,'generation',v.context_generation,'result',v.result,'validUntil',v.valid_until,'manifestState',m.state) order by v.id desc)
    from public.pooling_decisions v join public.pooling_drafts d on d.id=v.draft_id join public.pooling_manifests m on m.id=v.manifest_id where d.client_id=target_client),'[]'),
  'assignments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'draftId',a.draft_id,'decisionId',a.decision_id,'approvedAt',a.approved_at)) from public.pooling_assignments a where a.client_id=target_client),'[]'));
end $$;
revoke all on function public.pooling_review_workspace(text) from public,anon;
grant execute on function public.pooling_review_workspace(text) to authenticated;
commit;

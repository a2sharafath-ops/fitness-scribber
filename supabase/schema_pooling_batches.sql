begin;
create table if not exists public.pooling_approval_batches (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 client_id text not null references public.clients(id),
 operation_key text not null,
 selection jsonb not null,
 expected_generation bigint not null,
 receipts jsonb not null,
 committed_at timestamptz not null default now(),
 unique(actor_id,client_id,operation_key)
);
alter table public.pooling_approval_batches enable row level security;
revoke all on public.pooling_approval_batches from public,anon,authenticated;
create or replace function public.pooling_approve_batch(target_client text,expected_generation bigint,operation_key text,selection jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; prior public.pooling_approval_batches%rowtype; item jsonb; receipts jsonb:='[]'; batch_id bigint;
begin
 select * into c from public.clients where id=target_client for update;
 if not found or auth.uid() is null or c."coachId" is distinct from auth.uid() then raise exception 'forbidden'; end if;
 if operation_key is null or length(operation_key) not between 8 and 150 or selection is null or jsonb_typeof(selection)<>'array' then raise exception 'invalid_batch'; end if;
 if jsonb_array_length(selection) not between 1 and 31 or exists(select 1 from jsonb_array_elements(selection) s where jsonb_typeof(s)<>'object' or not (s ?& array['draftId','decisionId'])
   or exists(select 1 from jsonb_object_keys(s) k where k not in ('draftId','decisionId')))
   or (select count(distinct s->>'draftId') from jsonb_array_elements(selection) s)<>jsonb_array_length(selection) then raise exception 'invalid_batch'; end if;
 select * into prior from public.pooling_approval_batches b where b.actor_id=auth.uid() and b.client_id=target_client and b.operation_key=pooling_approve_batch.operation_key;
 if found then
   if prior.selection<>pooling_approve_batch.selection or prior.expected_generation<>pooling_approve_batch.expected_generation then raise exception 'idempotency_conflict'; end if;
   return jsonb_build_object('batchId',prior.id,'assignments',prior.receipts,'status','committed');
 end if;
 for item in select value from jsonb_array_elements(selection) loop
   receipts:=receipts||jsonb_build_array(public.pooling_approve(target_client,(item->>'draftId')::bigint,(item->>'decisionId')::bigint,expected_generation,operation_key||':'||(item->>'draftId')));
 end loop;
 insert into public.pooling_approval_batches(actor_id,client_id,operation_key,selection,expected_generation,receipts)
 values(auth.uid(),target_client,pooling_approve_batch.operation_key,pooling_approve_batch.selection,pooling_approve_batch.expected_generation,receipts) returning id into batch_id;
 return jsonb_build_object('batchId',batch_id,'assignments',receipts,'status','committed');
end $$;
revoke all on function public.pooling_approve_batch(text,bigint,text,jsonb) from public,anon;
grant execute on function public.pooling_approve_batch(text,bigint,text,jsonb) to authenticated;
commit;

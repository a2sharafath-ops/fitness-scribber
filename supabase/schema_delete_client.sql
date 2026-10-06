-- Run in the Supabase SQL editor before deploying the matching frontend change.
-- One RPC call deletes a coach-owned client and every dependent row in one
-- transaction. A failed foreign key or SQL statement rolls the whole call back.

create schema if not exists app_private;
revoke all on schema app_private from public;

create or replace function app_private.delete_client_dependents(
  p_relation regclass,
  p_predicate text,
  p_path oid[] default '{}'::oid[]
) returns void
language plpgsql
set search_path = pg_catalog
as $function$
declare
  fk record;
  child_columns text;
  parent_columns text;
  child_predicate text;
begin
  if p_relation::oid = any(p_path) then
    raise exception 'Cyclic client data dependency at %', p_relation;
  end if;

  -- Pooling drafts can reference a parent draft. Expand the selected set to
  -- every descendant, then delete them together after other FK children.
  if p_relation = pg_catalog.to_regclass('public.pooling_drafts') then
    p_predicate := format($predicate$
      id in (
        with recursive draft_tree(id) as (
          select id from public.pooling_drafts where %s
          union
          select child.id from public.pooling_drafts child
          join draft_tree parent on child.parent_id = parent.id
        )
        select id from draft_tree
      )$predicate$, p_predicate);
  end if;

  -- Follow actual foreign keys, including pooling tables that the browser
  -- store does not know about. Delete descendants before their parents.
  for fk in
    select conrelid, conkey, confkey
    from pg_catalog.pg_constraint
    where contype = 'f' and confrelid = p_relation and conrelid <> p_relation
  loop
    select string_agg(format('%I', child_att.attname), ', ' order by i),
           string_agg(format('%I', parent_att.attname), ', ' order by i)
      into child_columns, parent_columns
    from generate_subscripts(fk.conkey, 1) as i
    join pg_catalog.pg_attribute child_att
      on child_att.attrelid = fk.conrelid and child_att.attnum = fk.conkey[i]
    join pg_catalog.pg_attribute parent_att
      on parent_att.attrelid = p_relation and parent_att.attnum = fk.confkey[i];

    child_predicate := format('(%s) in (select %s from %s where %s)',
      child_columns, parent_columns, p_relation, p_predicate);
    perform app_private.delete_client_dependents(
      fk.conrelid, child_predicate, p_path || p_relation::oid);
  end loop;

  execute format('delete from %s where %s', p_relation, p_predicate);
end;
$function$;

revoke all on function app_private.delete_client_dependents(regclass, text, oid[]) from public;

create or replace function public.delete_client_and_data(p_client_id text)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  direct_table record;
  has_media boolean;
begin
  if p_client_id is null or p_client_id = '' or auth.uid() is null then
    raise exception 'Client not found or not owned by current coach' using errcode = '42501';
  end if;

  perform 1 from public.clients
    where id = p_client_id and "coachId" = auth.uid()
    for update;
  if not found then
    raise exception 'Client not found or not owned by current coach' using errcode = '42501';
  end if;

  -- Storage files need the Storage API for physical removal. Refuse to leave
  -- inaccessible files behind after deleting the client and its access policy.
  if pg_catalog.to_regclass('storage.objects') is not null then
    execute $query$
      select exists (
        select 1 from storage.objects
        where bucket_id = 'media' and split_part(name, '/', 1) = $1
      )$query$ into has_media using p_client_id;
    if has_media then
      raise exception 'This client has media attachments. Remove them before deleting the client.';
    end if;
  end if;

  -- Older workout tables have no client FK. Include every public table with
  -- a direct client identifier, while the helper resolves its FK descendants.
  for direct_table in
    select c.oid::regclass as relation, a.attname as column_name
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and c.relname <> 'clients'
      and a.attname in ('clientId', 'client_id') and not a.attisdropped
    order by c.oid, a.attname
  loop
    perform app_private.delete_client_dependents(
      direct_table.relation,
      format('%I::text = %L', direct_table.column_name, p_client_id));
  end loop;

  perform app_private.delete_client_dependents(
    'public.clients'::regclass, format('id = %L', p_client_id));

  if exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'Client deletion incomplete';
  end if;
end;
$function$;

revoke all on function public.delete_client_and_data(text) from public, anon;
grant execute on function public.delete_client_and_data(text) to authenticated;

-- =====================================================================
-- FitScribe — Chat media (voice notes + form-check video)
-- Run AFTER schema.sql, schema_athlete.sql, schema_messages.sql.
-- A private Storage bucket holds attachments; objects are named
-- "<clientId>/<file>" so access can be checked by the first path segment.
-- The messages row keeps the object key in "attachmentPath"; the app reads
-- it back through short-lived signed URLs.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- Coach: full access to media under their own clients' folders.
drop policy if exists "media coach all" on storage.objects;
create policy "media coach all" on storage.objects for all to authenticated
  using (
    bucket_id = 'media'
    and split_part(name, '/', 1) in (select id from clients where "coachId" = auth.uid())
  )
  with check (
    bucket_id = 'media'
    and split_part(name, '/', 1) in (select id from clients where "coachId" = auth.uid())
  );

-- Athlete: read + upload media under their own linked client's folder.
drop policy if exists "media athlete read" on storage.objects;
create policy "media athlete read" on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and split_part(name, '/', 1) in (select id from clients where "userId" = auth.uid())
  );

drop policy if exists "media athlete write" on storage.objects;
create policy "media athlete write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and split_part(name, '/', 1) in (select id from clients where "userId" = auth.uid())
  );

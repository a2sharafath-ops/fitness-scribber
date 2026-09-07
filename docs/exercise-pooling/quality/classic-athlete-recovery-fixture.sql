-- Isolated synthetic baseline only; no production execution.
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000003');
update clients set "userId"='00000000-0000-4000-8000-000000000003' where id='recovery-client-a';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
do $$ begin
  if (select count(*) from clients) <> 1 then raise exception 'Linked client read isolation failed'; end if;
  update clients set name='UNAUTHORIZED' where id='recovery-client-a';
  if found then raise exception 'Client changed protected client row'; end if;
end $$;
reset role;

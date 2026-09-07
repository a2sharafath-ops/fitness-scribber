-- Synthetic local recovery only. Never run against a hosted project.
insert into auth.users(id) values
('00000000-0000-4000-8000-000000000001'),
('00000000-0000-4000-8000-000000000002');
insert into clients(id,"coachId",name) values
('recovery-client-a','00000000-0000-4000-8000-000000000001','Synthetic A'),
('recovery-client-b','00000000-0000-4000-8000-000000000002','Synthetic B');
grant usage on schema auth to authenticated;
grant select,insert,update,delete on clients to authenticated;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
do $$ begin
  if (select count(*) from clients) <> 1 then raise exception 'Owner isolation failed'; end if;
  update clients set name = 'Synthetic updated A' where id = 'recovery-client-a';
  update clients set name = 'UNAUTHORIZED' where id = 'recovery-client-b';
  if found then raise exception 'Cross-owner write succeeded'; end if;
end $$;
reset role;
do $$ begin
  if (select name from clients where id='recovery-client-b') <> 'Synthetic B'
    then raise exception 'Cross-owner preservation failed'; end if;
end $$;

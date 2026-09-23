-- New members are added by the invite-member edge function (which also creates their login)
drop policy if exists "members add" on public.members;

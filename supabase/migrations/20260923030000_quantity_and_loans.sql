-- quantity: how many of this item; loans: portions lent out when quantity > 1,
-- e.g. [{"member_id": "...", "name": null, "qty": 6}, {"member_id": null, "name": "Mum", "qty": 4}]
alter table public.items
  add column quantity integer not null default 1 check (quantity >= 1),
  add column loans jsonb not null default '[]'::jsonb check (jsonb_typeof(loans) = 'array');

create or replace function public.log_item_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  act text;
begin
  if tg_op = 'INSERT' then
    insert into public.item_events(item_id, actor_id, action, before, after)
    values (new.id, public.current_member_id(), 'created', null, to_jsonb(new));
    return new;
  end if;

  new.updated_at := now();
  if new.deleted_at is not null and old.deleted_at is null then act := 'deleted';
  elsif new.deleted_at is null and old.deleted_at is not null then act := 'undeleted';
  elsif new.archived and not old.archived then act := 'archived';
  elsif not new.archived and old.archived then act := 'unarchived';
  elsif new.holder_id is distinct from old.holder_id or new.holder_name is distinct from old.holder_name
     or new.loans is distinct from old.loans then act := 'handed_over';
  elsif new.available and not old.available then act := 'made_available';
  elsif not new.available and old.available then act := 'made_unavailable';
  else act := 'updated';
  end if;

  insert into public.item_events(item_id, actor_id, action, before, after)
  values (new.id, public.current_member_id(), act, to_jsonb(old), to_jsonb(new));
  return new;
end $$;

revoke execute on function public.log_item_change() from public, anon, authenticated;

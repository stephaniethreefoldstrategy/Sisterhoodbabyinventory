-- Applied to Supabase project eblyucklornvjollzfha (sisterhood-baby-inventory)

create table public.members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  display_name text not null,
  colour text not null default 'pink',
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  product_link text,
  photo_path text,
  owner_id uuid references public.members(id) on delete set null,
  holder_id uuid references public.members(id) on delete set null,
  archived boolean not null default false,
  archive_reason text,
  deleted_at timestamptz,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.item_events (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.items(id) on delete cascade,
  actor_id uuid references public.members(id) on delete set null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index item_events_item_idx on public.item_events(item_id, created_at desc);
create index item_events_created_idx on public.item_events(created_at desc);
create index items_owner_idx on public.items(owner_id);
create index items_holder_idx on public.items(holder_id);
create index items_created_by_idx on public.items(created_by);
create index item_events_actor_idx on public.item_events(actor_id);

-- Current signed-in member, matched on Google account email
create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.members where email = lower(auth.jwt() ->> 'email')
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where email = lower(auth.jwt() ->> 'email'))
$$;

-- Keep updated_at fresh and write every change to the history log (powers undo)
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
  elsif new.holder_id is distinct from old.holder_id then act := 'handed_over';
  else act := 'updated';
  end if;

  insert into public.item_events(item_id, actor_id, action, before, after)
  values (new.id, public.current_member_id(), act, to_jsonb(old), to_jsonb(new));
  return new;
end $$;

create trigger items_log_insert after insert on public.items
  for each row execute function public.log_item_change();
create trigger items_log_update before update on public.items
  for each row execute function public.log_item_change();

alter table public.members enable row level security;
alter table public.items enable row level security;
alter table public.item_events enable row level security;

create policy "members read" on public.members for select to authenticated using ((select public.is_member()));
create policy "members add" on public.members for insert to authenticated with check ((select public.is_member()));
create policy "members edit" on public.members for update to authenticated using ((select public.is_member()));

create policy "items read" on public.items for select to authenticated using ((select public.is_member()));
create policy "items add" on public.items for insert to authenticated with check ((select public.is_member()));
create policy "items edit" on public.items for update to authenticated using ((select public.is_member()));

create policy "events read" on public.item_events for select to authenticated using ((select public.is_member()));

-- Photos: private bucket, members only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', false, 5242880, array['image/jpeg','image/png','image/webp']);

create policy "photos read" on storage.objects for select to authenticated
  using (bucket_id = 'item-photos' and (select public.is_member()));
create policy "photos add" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (select public.is_member()));

insert into public.members (email, display_name, colour)
values ('stephanie@threefoldstrategy.com.au', 'Stephanie', 'plum');

-- Live updates
alter publication supabase_realtime add table public.items, public.item_events, public.members;

-- Lock down function execution
revoke execute on function public.log_item_change() from public, anon, authenticated;
revoke execute on function public.is_member() from public, anon;
revoke execute on function public.current_member_id() from public, anon;
grant execute on function public.is_member() to authenticated;
grant execute on function public.current_member_id() to authenticated;

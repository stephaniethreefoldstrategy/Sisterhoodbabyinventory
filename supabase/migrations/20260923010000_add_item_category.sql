alter table public.items add column category text not null default 'Other';
create index items_category_idx on public.items(category);

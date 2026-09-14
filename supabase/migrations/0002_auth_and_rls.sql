-- Roles: Editor (data entry) and Analyst (dashboard view only), per client spec.
-- Every authenticated user sees both PL and CZ data (client's own answer to Q8) —
-- there is no market-based row restriction, only an application-level market switcher.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_editor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'editor'
  );
$$;

alter table retailers enable row level security;
alter table brands enable row level security;
alter table categories enable row level security;
alter table profiles enable row level security;
alter table promotions enable row level security;
alter table promotion_brands enable row level security;
alter table promotion_creatives enable row level security;

-- Reference tables: everyone signed in can read; only editors can add
-- (covers "add a brand inline during entry" from the client's Q5 answer).
create policy "retailers_select" on retailers for select to authenticated using (true);
create policy "retailers_insert" on retailers for insert to authenticated with check (is_editor());

create policy "brands_select" on brands for select to authenticated using (true);
create policy "brands_insert" on brands for insert to authenticated with check (is_editor());

create policy "categories_select" on categories for select to authenticated using (true);

-- Profiles: users can only see their own row.
create policy "profiles_select_own" on profiles for select to authenticated using (auth.uid() = id);

-- Promotions: readable by anyone signed in (PL+CZ both visible to all roles),
-- writable only by editors.
create policy "promotions_select" on promotions for select to authenticated using (true);
create policy "promotions_insert" on promotions for insert to authenticated with check (is_editor());
create policy "promotions_update" on promotions for update to authenticated using (is_editor()) with check (is_editor());
create policy "promotions_delete" on promotions for delete to authenticated using (is_editor());

create policy "promotion_brands_select" on promotion_brands for select to authenticated using (true);
create policy "promotion_brands_insert" on promotion_brands for insert to authenticated with check (is_editor());
create policy "promotion_brands_delete" on promotion_brands for delete to authenticated using (is_editor());

create policy "promotion_creatives_select" on promotion_creatives for select to authenticated using (true);
create policy "promotion_creatives_insert" on promotion_creatives for insert to authenticated with check (is_editor());
create policy "promotion_creatives_delete" on promotion_creatives for delete to authenticated using (is_editor());

-- Storage bucket for uploaded promo screenshots/creatives.
insert into storage.buckets (id, name, public)
values ('promotion-creatives', 'promotion-creatives', false)
on conflict (id) do nothing;

create policy "creatives_storage_select" on storage.objects for select to authenticated
  using (bucket_id = 'promotion-creatives');
create policy "creatives_storage_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'promotion-creatives' and is_editor());

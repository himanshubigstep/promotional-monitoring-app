-- Public POC access: the deployed frontend currently authenticates as no one
-- (login UI isn't built yet — see CLAUDE.md), so it always runs as the `anon`
-- Postgres role. Every existing select policy is scoped `to authenticated`,
-- so anon visitors got zero rows anywhere, regardless of what's seeded.
--
-- This migration adds anon read access, deliberately narrower than what
-- authenticated users get: reference tables are fully readable (as they
-- already are for authenticated), but promotions and everything joined off
-- a promotion are restricted to `status = 'approved'` — pending_review and
-- rejected rows stay invisible to anon, same backstop `0003` put in place
-- for the analyst role. Nothing here changes existing `to authenticated`
-- policies or grants anon any insert/update/delete.

create policy "retailers_select_anon" on retailers for select to anon using (true);
create policy "brands_select_anon" on brands for select to anon using (true);
create policy "categories_select_anon" on categories for select to anon using (true);

create policy "promotions_select_anon" on promotions for select to anon
  using (status = 'approved');

create policy "promotion_brands_select_anon" on promotion_brands for select to anon
  using (
    exists (
      select 1 from promotions p
      where p.id = promotion_brands.promotion_id and p.status = 'approved'
    )
  );

create policy "promotion_creatives_select_anon" on promotion_creatives for select to anon
  using (
    exists (
      select 1 from promotions p
      where p.id = promotion_creatives.promotion_id and p.status = 'approved'
    )
  );

-- Storage: the app calls storage.createSignedUrl() for promo screenshots,
-- which itself needs a read policy on storage.objects — a table-level
-- policy on promotion_creatives alone isn't enough to sign the file.
create policy "creatives_storage_select_anon" on storage.objects for select to anon
  using (
    bucket_id = 'promotion-creatives'
    and exists (
      select 1 from promotion_creatives pc
      join promotions p on p.id = pc.promotion_id
      where pc.storage_path = storage.objects.name and p.status = 'approved'
    )
  );

-- Display-only fields for the "product" view of a promotion (price,
-- currency, rating, stock). These have no reliable source from the
-- scraper or OCR flow — they're populated only when an editor fills them
-- in manually via the form. Nullable throughout.

alter table promotions
  add column price numeric,
  add column currency text check (currency in ('PLN', 'CZK')),
  add column rating numeric,
  add column stock integer;

-- Real product catalog, independent of promotions.
--
-- Until now "products" were just promotions viewed differently (one row,
-- same id, backfilled fields — see src/lib/promotionsData.ts) because the
-- scraper only ever extracted promo banners, never a store's actual catalog.
-- This table is what the scraper's new catalog crawl (scraper/src/scrapeProducts.ts)
-- writes to, so a product can exist before — and independent of — any
-- promotion being run for it. The promotion creation form now picks from
-- this table instead of only offering products that already have a promo.
--
-- Same RLS shape as brands/retailers/categories: open read (including anon,
-- since the deployed POC has no login UI yet — see 0005), editor-only write.
-- The scraper writes via the service-role client (supabaseAdmin), which
-- bypasses RLS entirely, same as it does for promotions today.

create table products (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references retailers (id),
  market text not null check (market in ('PL', 'CZ')),
  brand_id uuid references brands (id),
  category_id uuid references categories (id),
  name text not null,
  image_url text,
  product_url text,
  price numeric,
  currency text check (currency in ('PLN', 'CZK')),
  -- Site-native id/slug scraped from the listing, used to dedupe repeat
  -- crawls (upsert on retailer_id+external_id) without re-inserting the
  -- same product every run. Null for manually-added products.
  external_id text,
  source text not null default 'manual' check (source in ('manual', 'scraper')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (retailer_id, external_id)
);

create index products_market_idx on products (market);
create index products_retailer_idx on products (retailer_id);
create index products_brand_idx on products (brand_id);
create index products_category_idx on products (category_id);

create trigger products_set_updated_at
before update on products
for each row execute function set_updated_at();

-- Optional traceability: which catalog product a promotion was created from.
-- Nullable — manual/OCR promotions won't have one.
alter table promotions add column product_id uuid references products (id);
create index promotions_product_idx on promotions (product_id);

alter table products enable row level security;

create policy "products_select" on products for select to authenticated using (true);
create policy "products_insert" on products for insert to authenticated with check (is_editor());
create policy "products_update" on products for update to authenticated using (is_editor()) with check (is_editor());
create policy "products_select_anon" on products for select to anon using (true);

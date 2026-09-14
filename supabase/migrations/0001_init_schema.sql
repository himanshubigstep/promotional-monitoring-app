-- Core schema for the promotional monitoring app.
-- Market is PL/CZ throughout, matching the client's Market Switcher requirement.

create extension if not exists pgcrypto;

create table retailers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  market text not null check (market in ('PL', 'CZ')),
  is_client boolean not null default false,
  created_at timestamptz not null default now(),
  unique (name, market)
);

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  market text not null check (market in ('PL', 'CZ')),
  created_at timestamptz not null default now(),
  unique (name, market)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'analyst' check (role in ('editor', 'analyst')),
  created_at timestamptz not null default now()
);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  market text not null check (market in ('PL', 'CZ')),
  retailer_id uuid not null references retailers (id),
  category_id uuid references categories (id),
  name text not null,
  date_from date not null,
  date_to date not null,
  scope text,
  channel text,
  discount_text text,
  threshold text,
  sku_count integer,
  notes text,
  promotion_type text,
  avg_market_discount text,
  price_after_discount numeric,
  is_extended boolean not null default false,
  parent_promotion_id uuid references promotions (id),
  -- 'pending_review' is unused until Phase 2 (OCR) / scraper write here directly.
  status text not null default 'approved' check (status in ('pending_review', 'approved', 'rejected')),
  source text not null default 'manual' check (source in ('manual', 'ocr', 'scraper')),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table promotion_brands (
  promotion_id uuid not null references promotions (id) on delete cascade,
  brand_id uuid not null references brands (id),
  primary key (promotion_id, brand_id)
);

create table promotion_creatives (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index promotions_market_idx on promotions (market);
create index promotions_retailer_idx on promotions (retailer_id);
create index promotions_dates_idx on promotions (date_from, date_to);
create index promotions_status_idx on promotions (status);
create index brands_market_idx on brands (market);
create index retailers_market_idx on retailers (market);

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger promotions_set_updated_at
before update on promotions
for each row execute function set_updated_at();

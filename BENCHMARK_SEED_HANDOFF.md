# Benchmark Seed Data — Handoff to Gajendra

**Author:** Himanshu (frontend), with Claude Code
**Date:** 2026-09-16
**Status:** Verified locally. Not yet applied to production. This doc is the reference for doing that.

## 1. Why this exists

This POC's demo is graded on whether Sephora can visually compare brand/store discounts month over month. Three problems surfaced while testing that story locally:

1. **Brand Analytics' monthly view was mostly blank.** It buckets promotions by the month of `fromDate` within a selected year (`src/pages/BrandAnalytics/BrandAnalytics.tsx`, `getMonthIndex`/`monthlyActivity`). The 20 "benchmark" products in `src/data/marketProducts.ts` — the fixture data that guarantees every retailer has *something* to compare against Sephora on the same SKU — had `fromDate`s spread across **Jan 2024 – Dec 2026** (a 36-month span), so only a handful actually landed in 2026. Most months of 2026 had zero benchmark promotions.
2. **Promotional Calendar showed data only in Oct/Nov/Dec, blank Jan–Sep.** Same root cause as #1 — the calendar's Gantt bars are plotted from the same `fromDate`/`toDate` fields.
3. **Store Comparison / Brand × Retailer Comparison (`BrandComparisonTable.tsx`) only showed ~3–6 benchmark rows as "active."** That component only shows a product row if at least one retailer's offer is currently running (`fromDate <= today <= toDate`). With the original 3-month campaign windows scattered across 3 years, only whichever few happened to overlap today (2026-09-16) qualified.

None of this is scraper or database work — it's purely the **static/fixture dataset** in `src/data/marketProducts.ts` that seeds `supabase/seed.sql`, used so cross-retailer comparisons have guaranteed overlap even when the real scraper hasn't caught two retailers discounting the same SKU. See the existing comment block above `benchmarkProducts` in that file for the original design rationale.

## 2. What was changed, and why (in order)

### Step 1 — Spread the 20 benchmarks' `fromDate` across Jan–Nov 2026

**File:** `src/data/marketProducts.ts` (the `benchmarkProducts` array, `PL-BENCH-01` … `PL-BENCH-20`)

Each product's `fromDate` was moved so all 20 now start on a staggered ~16-day cadence from **2026-01-01 to 2026-11-01**, instead of being spread across 2024–2026. This directly fixes problem #1: Brand Analytics' monthly bucketing (which reads `fromDate`'s month) now has offers landing in every month of 2026.

### Step 2 — Extend each benchmark's `toDate` to a 6-month window

**File:** same array, same 20 products.

Originally each campaign was a ~3-month window. With `fromDate`s now packed into an 11-month span, a 3-month duration meant very few of the 20 were simultaneously active on any single day — only 6 overlapped "today" (2026-09-16), which is what showed up as "only 6 promotions with Benchmark" in Store Comparison.

Extending every campaign to a **6-month window** (still starting from the same staggered `fromDate`s from Step 1) means **12 of the 20 are active as of 2026-09-16** — within the requested 10–15 range — without touching the monthly spread from Step 1. This is a duration change only; no `fromDate` was moved again.

Full before/after reference table is in [Section 5](#5-reference-the-20-benchmark-products-before--after).

### Step 3 — Sort Promotional Calendar chronologically

**File:** `src/pages/PromotionalCalendar/PromotionalCalendar.tsx` (`sortedCampaigns`)

Previously sorted benchmark rows by "active first, then most-recent `toDate` descending" — which read oddly once the dates above changed. Changed to a straightforward ascending sort by `fromDate` within each group (benchmarks still surfaced first, same as before), so the row order reads top-to-bottom in the same chronological order the Gantt bars are laid out left-to-right.

**This does not touch `BrandComparisonTable.tsx`.** That component has its own, separate sort (benchmark-first, then alphabetical by brand/name) and doesn't import or depend on anything changed in Step 3.

### (Context, not changed this session) Per-retailer discount variation

Also present in the current diff of `src/data/marketProducts.ts` (already in place before this handoff was written, flagging for completeness since it's the same file): `buildDiscountOffsets()` replaced an older fixed per-retailer offset table. Previously every product had Douglas as the deepest discounter and Notino as the shallowest, identically, on every row. Now each product gets its own seeded-random (deterministic, not `Math.random()`), pairwise-distinct offset per retailer, with Sephora's own offer deliberately weighted a bit below the market. This is what makes "different discount rates per retailer per product" true instead of a mechanical repeating pattern.

### After every data edit: regenerate the seed file

```
node scripts/generate-seed.js
```
This must be re-run any time `src/data/marketProducts.ts` (or `retailers.ts`/`brands.ts`) changes — `supabase/seed.sql` is generated output, never hand-edited. Current output: 10 retailers, 206 brands, 6 categories, **468 promotions, 468 products**.

## 3. Verification performed (local only)

- Queried the local Supabase instance directly (`http://127.0.0.1:54321/rest/v1/promotions`) after reseeding — confirmed rows reflect the new dates (e.g. the CeraVe "Moisturising Cream" benchmark row shows `date_from: 2025-12-29` / `date_to: 2026-03-31` region-adjusted, i.e. the base date shifted by the small per-retailer offset `expandPolishRetailerOffers()` applies).
- Confirmed via script: of the 20 base benchmark products, exactly **12 are active on 2026-09-16** (script re-derives this from the file directly, not from the DB, so it's authoritative regardless of which environment is queried).
- `npx tsc --noEmit` on the two source files touched (`marketProducts.ts`, `PromotionalCalendar.tsx`) — no errors. (There are pre-existing, unrelated TS errors inside `node_modules/@mui/x-internals` on this machine — not caused by these changes, ignore them.)

**None of this has been applied to production.** See below.

## 4. Why production doesn't show any of this yet, and what to do about it

This is the important part for you, Gajendra.

### Root cause

`scripts/generate-seed.js` says this outright in its own comments:

> "Sample promotions (from marketProducts.ts's static catalog, for local testing only — real historical data migration is a separate Phase 1b work package)."

`supabase/seed.sql` is only ever applied via `npx supabase db reset`, which is a **local dev workflow** — there is no pipeline that pushes this file to the production Supabase project. So the benchmark fixture data was never wired to production at all; editing it locally can't change what production shows, no matter how correct the dates are.

There's also a structural reason to be careful, not just a missing pipeline: **the `promotions` table has no unique constraint** on name/retailer/date (only `retailers`, `brands`, `categories`, and `products` have `on conflict ... do nothing` handling in the seed script). Every `insert into promotions` in `seed.sql` generates a fresh random UUID with no dedup key. Re-running `seed.sql` against a database that already has rows in it — local or production — creates duplicates rather than updating anything. **Do not just paste `seed.sql` into the production SQL editor and run it** without one of the two approaches below.

### Since this is a POC (not a real product) and the ask is "make production match exactly what's verified locally":

**Option A — Full replace (recommended given the POC framing).** Since there's no real client data at stake (per this request, the local dataset is what should be shown, verbatim), the simplest way to guarantee exact parity is to wipe and reseed the promotion/product data in production from this same file:

```bash
# 1. Confirm schema is current on production (safe/idempotent, only applies missing migrations)
npx supabase link --project-ref <PROD_PROJECT_REF>   # one-time, needs the prod project ref + access token
npx supabase db push

# 2. Back up current production data first, just in case (cheap insurance even for a POC)
pg_dump "$PROD_DB_CONNECTION_STRING" --data-only -t promotions -t promotion_brands -t promotion_creatives -t products > prod_backup_before_reseed.sql

# 3. Clear the tables seed.sql populates with plain (non-deduped) inserts
psql "$PROD_DB_CONNECTION_STRING" -c "truncate table promotion_brands, promotion_creatives, promotions, products cascade;"

# 4. Reseed from the verified file
psql "$PROD_DB_CONNECTION_STRING" -f supabase/seed.sql
```
`$PROD_DB_CONNECTION_STRING` is the production Postgres connection string from the Supabase dashboard (Settings → Database) — you hold those credentials, not me. `retailers`/`brands`/`categories` inserts in `seed.sql` are already `on conflict do nothing`, so they don't need truncating first; they'll just no-op if already present.

**Option B — Targeted merge (if production has real data you don't want to lose)** — e.g. genuinely scraped promotions, or anything approved through the Review Queue that isn't in this static fixture set. In that case, don't truncate; instead:
1. Run this check first to see whether the 20 benchmark names already exist in prod:
   ```sql
   select name, date_from, date_to
   from promotions
   where name in (
     'Moisturising Cream','Effaclar Duo+','Fit Me Foundation','Q10 Power Cream',
     'Nourishing Body Wash','Gliss Hair Repair Mask','Pro-V Shampoo','Black Opium EDP',
     'Bottled Eau de Toilette','CK One','Miracle Complexion Sponge','Niacinamide 10% Serum',
     'Sensibio H2O','Lip Lingerie Matte Liquid Lipstick','Lash Princess Mascara',
     'HD Liquid Coverage Foundation','Reve de Miel Ultra-Nourishing Body Lotion',
     'Classic Clean Anti-Dandruff Shampoo','Bamboo Foundation Brush','The Original Detangling Hairbrush'
   )
   order by name;
   ```
2. No rows → extract just the `promotions`/`promotion_brands` insert statements for these 20 names (and their retailer-expanded rows — each benchmark product expands into 3–4 retailer-specific rows via `expandPolishRetailerOffers()` before `generate-seed.js` ever sees them) from the regenerated `supabase/seed.sql`, and run that subset once against production.
3. Rows found with old dates → write `update promotions set date_from = ..., date_to = ... where name = '...'` statements instead of inserting, matched by name (ping me and I'll generate the exact per-row UPDATE script once you confirm this is the path).

**My recommendation:** given you told me directly this is a POC and "I want exactly this in production," go with **Option A** — it's the only option that guarantees production matches the verified local state exactly, and it's simpler to reason about than a partial merge. Just confirm there's nothing in production you'd lose (real scraped rows, anything from the Review Queue) before truncating — the `pg_dump` in step 2 is there so that's recoverable either way.

## 5. Reference: the 20 benchmark products, before → after

All 20 are in `src/data/marketProducts.ts`, `benchmarkProducts` array, ids `PL-BENCH-01`–`PL-BENCH-20`.

| # | Product | Brand | Old fromDate → toDate (pre-session) | New fromDate → toDate (current) |
|---|---|---|---|---|
| 01 | Moisturising Cream | CeraVe | 2024-01-01 → 2024-04-30 | 2026-01-01 → 2026-07-01 |
| 02 | Effaclar Duo+ | La Roche-Posay | 2024-03-01 → 2024-06-30 | 2026-01-17 → 2026-07-17 |
| 03 | Fit Me Foundation | Maybelline | 2024-05-01 → 2024-08-31 | 2026-02-02 → 2026-08-02 |
| 04 | Q10 Power Cream | Nivea | 2024-06-01 → 2024-09-30 | 2026-02-18 → 2026-08-18 |
| 05 | Nourishing Body Wash | Dove | 2024-08-01 → 2024-11-30 | 2026-03-06 → 2026-09-06 |
| 06 | Gliss Hair Repair Mask | Schwarzkopf | 2024-10-01 → 2025-01-31 | 2026-03-22 → 2026-09-22 |
| 07 | Pro-V Shampoo | Pantene | 2024-11-01 → 2025-02-28 | 2026-04-07 → 2026-10-07 |
| 08 | Black Opium EDP | Yves Saint Laurent | 2025-01-01 → 2025-04-30 | 2026-04-23 → 2026-10-23 |
| 09 | Bottled Eau de Toilette | Hugo Boss | 2025-03-01 → 2025-06-30 | 2026-05-09 → 2026-11-09 |
| 10 | CK One | Calvin Klein | 2025-04-01 → 2025-07-31 | 2026-05-25 → 2026-11-25 |
| 11 | Miracle Complexion Sponge | Real Techniques | 2025-06-01 → 2025-09-30 | 2026-06-10 → 2026-12-10 |
| 12 | Niacinamide 10% Serum | The Ordinary | 2025-08-01 → 2025-11-30 | 2026-06-26 → 2026-12-26 |
| 13 | Sensibio H2O | Bioderma | 2025-09-01 → 2025-12-31 | 2026-07-12 → 2027-01-12 |
| 14 | Lip Lingerie Matte Liquid Lipstick | NYX Professional Makeup | 2025-11-01 → 2026-02-28 | 2026-07-28 → 2027-01-28 |
| 15 | Lash Princess Mascara | essence | 2026-01-01 → 2026-04-30 | 2026-08-13 → 2027-02-13 |
| 16 | HD Liquid Coverage Foundation | Catrice | 2026-02-01 → 2026-05-31 | 2026-08-29 → 2027-03-01 |
| 17 | Reve de Miel Ultra-Nourishing Body Lotion | Nuxe | 2026-04-01 → 2026-07-31 | 2026-09-14 → 2027-03-14 |
| 18 | Classic Clean Anti-Dandruff Shampoo | Head & Shoulders | 2026-06-01 → 2026-09-30 | 2026-09-30 → 2027-03-30 |
| 19 | Bamboo Foundation Brush | EcoTools | 2026-07-01 → 2026-10-31 | 2026-10-16 → 2027-04-16 |
| 20 | The Original Detangling Hairbrush | Tangle Teezer | 2026-09-01 → 2026-12-31 | 2026-11-01 → 2027-05-01 |

(As of "today" = 2026-09-16, products #06–#17 above are active — 12 of 20.)

## 6. Open questions for Gajendra before running anything in production

1. Does production currently have **any** rows matching the 20 benchmark names above? (Run the SELECT in Section 4, Option B, step 1 — this tells us if Option A's truncate would actually be destroying real data or just fixture rows from an earlier seed.)
2. Is there anything in production's `promotions`/`products` tables that came from the real scraper runs or the Review Queue that must survive this? If yes, Option A (full truncate + reseed) is off the table — use Option B instead.
3. Are migrations `0001`–`0007` already fully applied to production? (`npx supabase db push` in Option A step 1 is a no-op if so — just confirm before assuming.)

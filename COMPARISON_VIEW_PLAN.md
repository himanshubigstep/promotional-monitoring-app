# Comparison views fix — scope plan

Status: **planning only, nothing built yet.** Crosses into Himanshu's ownership area (`src/pages/`) — flagging before it's touched, per the mandatory workflow.

## Why this exists

The client wants 3 distinct views: (1) all competitor products/promos, (2) their own store's data, (3) a real side-by-side comparison to decide whether to run a promotion. I checked the current pages against this rather than assume they already do it — two real gaps found:

1. **No dedicated "our store only" view exists.** [Promotions](src/pages/Promotions/Promotions.tsx) mixes the client's own retailer in with competitors, with no toggle to isolate either side.
2. **[StoreComparison](src/pages/StoreComparison/StoreComparison.tsx) looks like the real comparison, but isn't one.** Its "YOUR DISCOUNT" column is not the client's real data — it's `Math.max(0, discount - 2)` ([StoreComparison.tsx:54](src/pages/StoreComparison/StoreComparison.tsx:54)), a number fabricated by subtracting 2 from the competitor's own discount. There is no real client-vs-competitor differencing happening in the app today.

**One more finding that shapes the scope:** there is no cross-retailer product identity in the schema. Each `promotions`/`products` row belongs to one retailer, brand, and category — there's no canonical "this is the same SKU at two different stores" link anywhere (checked `productTypes.ts` and every migration; no `sku`/`canonical_product_id`/matching table exists). This means **true product-level, apples-to-apples comparison ("our exact SKU vs. the identical SKU at Notino") isn't supported by the current data model** — only brand+category-level benchmarking is ("our average Skincare discount" vs "the market's average Skincare discount"), which is what [BrandAnalytics](src/pages/BrandAnalytics/BrandAnalytics.tsx) already approximates.

## In scope

1. **Competitor view**: filter to `retailers.is_client = false` — this signal already exists and is populated correctly. Likely a toggle/tab on the existing Promotions page rather than a whole new page.
2. **Client's own store view**: same mechanism, filtered to `is_client = true`. New, but small — same page, same query pattern, opposite filter.
3. **Real comparison (the actual fix)**: replace `StoreComparison`'s fabricated `discount - 2` with a genuine calculation — for each brand + category, compute the real average discount from `is_client = true` rows separately from the real average across `is_client = false` rows, and show both plus the actual gap. This directly answers "should we run a promotion" at the granularity the data actually supports (brand/category), not at a granularity it doesn't (individual SKU).

## Explicitly out of scope, and why

- **True SKU/product-level matching** ("our exact 340ml CeraVe vs. their exact 340ml CeraVe") — the schema has no concept linking equivalent products across retailers. Building this would mean either a new canonical-product table + a real matching process (manual curation, or fuzzy name/brand matching with real error rates) — a materially bigger, separate effort, not a "fix" to existing pages. Flagging as a decision: does the client actually need this level of precision, or is brand/category benchmarking sufficient for a promo go/no-go call?
- **A recommendation engine** ("gap > X% → run a promo now") — the plan covers showing the real numbers accurately; turning that into an automated suggestion is a separate, follow-on decision once the underlying numbers are trustworthy.

## What already exists — no schema work needed for the in-scope items

- `retailers.is_client` — real, populated, already the documented "is this ours" signal (CLAUDE.md).
- `promotions.category_id` / `promotion_brands` — already the join path needed to group by brand/category on both sides of the comparison.
- The `products`/`Promotion` shape already carries every field needed (`competitorDiscount`, `brand`, `category`, `retailer`) — the fix is in how `StoreComparison.tsx` computes from them, not in fetching anything new.

## File-level breakdown

| File | Change | Owner |
|---|---|---|
| `src/pages/StoreComparison/StoreComparison.tsx` | Replace the fabricated `discount - 2` with a real split: group `categoryProducts` by `isClient`, compute separate averages, show both + real gap | Himanshu |
| `src/pages/Promotions/Promotions.tsx` | Add a client/competitor filter toggle (reusing the existing filter bar pattern) so the page can serve views 1 and 2 without becoming two separate pages | Himanshu |
| `src/context/AppContext.tsx` | Likely no change — `isClient` is already exposed on the mapped `Product`/`Promotion` shape from the real DB path; confirm it's populated correctly for every consumer, not just the ones currently reading it | Himanshu |
| `src/data/productTypes.ts` | Consider renaming `competitorDiscount` — the field is misleadingly named; it holds *this row's* discount regardless of whether the retailer is the client or a competitor, and that naming is likely what let the fabricated `-2` placeholder go unnoticed | Himanshu (naming/comms decision, small effort) |

## Sequencing

1. Fix `StoreComparison`'s calculation first — it's the one currently showing fabricated numbers to real users, highest-priority correction.
2. Add the client/competitor toggle to `Promotions` — additive, lower risk.
3. Only after both land: revisit whether the client actually needs SKU-level matching (the bigger, separate decision above) — don't build that speculatively.

## Open decisions — need your/team's call, not mine

- Is brand/category-level comparison good enough for the client's promotion decision, or do they specifically need product/SKU-level matching? (Materially changes scope/cost if the latter.)
- Should the competitor/client toggle live on the existing Promotions page, or does the client expect three visually distinct, separately-named pages/nav items?

## Rough sizing

- `StoreComparison` real-number fix: small — a few hours, it's a calculation change, not new data plumbing.
- Promotions page client/competitor toggle: small — reuses the existing filter UI pattern already in the codebase.
- SKU-level matching (if the team decides it's needed): out of this estimate entirely — a separate, larger data-modeling effort.

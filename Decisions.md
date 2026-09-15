# Decisions log

## Gajendra

- Build scraping + AI assistant now, ahead of the client's phased spec, for pitch impact.
- Team split: Gajendra = backend/auth/persistence/scraping, Divyanshu = AI chatbot, Himanshu = frontend.
- Priority: speed and demo impact, zero infra spend.
- Approved Supabase over a custom Postgres+auth+storage stack.

## Claude

- **Supabase**, running locally via Docker for now — no cloud account created yet, no cost.
- **Schema:** normalized `retailers` / `brands` / `categories` tables, not free-text fields.
- Added `status` and `source` columns now (unused in Phase 1) so Phase 2 (OCR) and Phase 3 (scraper) don't need a migration later.
- **Roles:** Editor (read+write) / Analyst (read-only). PL and CZ both visible to everyone — no market restriction.
- New signups default to Analyst; promoting to Editor is manual for now (no admin UI yet).
- **Open item:** seeded 6 categories (data has `Body Care`/`Tools`) but the frontend type only declares 4 — needs a decision, not yet resolved.

## Scraper (step 2)

- **Extraction: screenshot + Gemini vision**, not per-site HTML parsers — one code path for all retailers, reuses the same approach as the manual OCR upload.
- **Runs in GitHub Actions** (daily cron), not Vercel — headless Chromium doesn't fit Vercel's serverless time/size limits.
- **Scraped rows default to `pending_review`** — needs a review screen before they're useful (not yet built).
- **Only 4 of 7 sites are actually automatable**: Notino, Super-Pharm, Drogerie Natura, Flaconi work. **Hebe** (Cloudflare CAPTCHA) and **Douglas + Sephora** (WAF blocks headless browsers, no CAPTCHA involved) are excluded — all three stay on manual entry. Decided not to spend time hardening the browser fingerprint for Douglas/Sephora; revisit if it matters later.

## Product catalog (step 3)

- **New `products` table** (`0006_products.sql`), independent of `promotions` — until now "products" were just promotions viewed differently (see `src/lib/promotionsData.ts`), which only ever covered items with an active/past campaign. The promotion form's product picker now reads from this table instead, so it offers a store's full range, not just what's been promoted.
- **Catalog crawl is DOM selectors (`scrapeProducts.ts`), not Gemini vision** — unlike the promo scrape, a store's listing pages are numerous (paginated categories) and structurally regular, which is exactly what CSS-selector scraping is good at and vision-per-page would be slow/expensive for.
- **Runs weekly** (Mondays), not daily like the promo scrape — same GitHub Actions workflow, a second scheduled cron plus its own job, since a full catalog crawl touches far more pages per run.
- **Selectors verified live 2026-09-14** against each site's real listing markup (not guessed) — see the comments in `scraper/src/retailers.ts` next to each `CatalogTarget` for what was actually checked and why. Two things fell out of that reconnaissance:
  - **Pagination not implemented for Notino/Super-Pharm/Drogerie Natura** — each site's page-2+ control is client-side JS that didn't respond to a plain click or a `?page=` query param in testing. Rather than ship a guess at the real mechanism, the crawl only takes each category's first (most-relevant-sorted) page for now. Revisit once someone confirms how it actually works per site.
  - **Flaconi excluded from the catalog crawl** (still fine for the promo scraper's screenshot flow) — its product cards have no `data-testid` and no stable class names, only auto-generated CSS-module hashes that change on every frontend deploy. A selector written against those would likely already be stale by the next scheduled run.
- **Brand is left null when a listing doesn't expose it separately from the product name** (only Notino does) — nullable on `products`, rather than guessing at parsing "Brand Product Name" apart.

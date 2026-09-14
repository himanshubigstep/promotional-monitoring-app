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

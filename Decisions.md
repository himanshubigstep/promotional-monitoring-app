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

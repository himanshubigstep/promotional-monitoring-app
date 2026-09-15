-- Extraction-quality metadata for scraped/OCR promotions, so a reviewer
-- isn't stuck eyeballing a screenshot against sparse text with zero signal.
-- All nullable and additive: manual entries (source = 'manual') never set
-- these, existing rows backfill to NULL, and nothing outside the review
-- queue needs to read them (approved-data consumers keep selecting their
-- own explicit column lists, so this is invisible to them).

alter table promotions
  add column extraction_confidence numeric check (extraction_confidence between 0 and 1),
  add column discount_percent numeric,
  add column uncertain_fields text[];

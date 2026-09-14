-- Review-queue support: who verified a scraped/OCR promotion, and when.
-- Also tightens read access so unverified rows aren't mixed into what
-- analysts (read-only role) see in the normal app views.

alter table promotions
  add column reviewed_by uuid references profiles(id),
  add column reviewed_at timestamptz,
  add column rejection_reason text;

-- Previously: any authenticated user could read any status. Now: analysts
-- only ever see approved rows; editors (who own the review queue) see
-- everything. Every other page must filter `.eq('status', 'approved')`
-- explicitly for editors too — this policy is the security backstop for
-- analysts, not a UX filter for editors.
drop policy "promotions_select" on promotions;
create policy "promotions_select" on promotions for select to authenticated
  using (status = 'approved' or is_editor());

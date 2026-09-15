import { supabase } from "./supabaseClient";

export type PendingPromotion = {
  id: string;
  name: string;
  market: string;
  discount_text: string | null;
  threshold: string | null;
  notes: string | null;
  date_from: string;
  date_to: string;
  promotion_type: string | null;
  status: string;
  created_at: string;
  // Review-time-only extraction-quality metadata (see
  // supabase/migrations/0007_extraction_quality.sql) — null for manual/OCR
  // entries and for rows scraped before this was added.
  extraction_confidence: number | null;
  uncertain_fields: string[] | null;
  retailer: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  brands: { id: string; name: string }[];
  screenshotPath: string | null;
  screenshotUrl: string | null;
};

const CREATIVES_BUCKET = "promotion-creatives";

// A promotion can end up with more than one screenshot row over time; we
// only show the most recent one in the review card.
type RawRow = {
  id: string;
  name: string;
  market: string;
  discount_text: string | null;
  threshold: string | null;
  notes: string | null;
  date_from: string;
  date_to: string;
  promotion_type: string | null;
  status: string;
  created_at: string;
  extraction_confidence: number | null;
  uncertain_fields: string[] | null;
  retailers: { id: string; name: string } | null;
  categories: { id: string; name: string } | null;
  promotion_brands: { brands: { id: string; name: string } | null }[];
  promotion_creatives: { storage_path: string; created_at: string }[];
};

async function resolveScreenshotUrl(path: string | null) {
  if (!path) return null;
  // Bucket is private — a signed URL is required, getPublicUrl() won't work here.
  const { data, error } = await supabase.storage
    .from(CREATIVES_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) {
    console.warn("Failed to sign screenshot URL", path, error);
    return null;
  }
  return data.signedUrl;
}

export async function fetchPendingPromotions(): Promise<PendingPromotion[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select(
      `
      id, name, market, discount_text, threshold, notes, date_from, date_to,
      promotion_type, status, created_at, extraction_confidence, uncertain_fields,
      retailers ( id, name ),
      categories ( id, name ),
      promotion_brands ( brands ( id, name ) ),
      promotion_creatives ( storage_path, created_at )
    `,
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawRow[];

  const pending = await Promise.all(
    rows.map(async (row) => {
      const latestCreative = [...row.promotion_creatives].sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      )[0];
      const screenshotPath = latestCreative?.storage_path ?? null;

      return {
        id: row.id,
        name: row.name,
        market: row.market,
        discount_text: row.discount_text,
        threshold: row.threshold,
        notes: row.notes,
        date_from: row.date_from,
        date_to: row.date_to,
        promotion_type: row.promotion_type,
        status: row.status,
        created_at: row.created_at,
        extraction_confidence: row.extraction_confidence,
        uncertain_fields: row.uncertain_fields,
        retailer: row.retailers,
        category: row.categories,
        brands: row.promotion_brands.map((pb) => pb.brands).filter((b): b is { id: string; name: string } => !!b),
        screenshotPath,
        screenshotUrl: await resolveScreenshotUrl(screenshotPath),
      };
    }),
  );

  // Lowest-confidence scraped rows first, so the sketchiest extractions get
  // a reviewer's attention before the ones Gemini was already sure about.
  // Rows with no confidence value (manual/OCR entries, or scraped rows from
  // before this field existed) sort after every scored row, keeping their
  // relative created_at-desc order via Array#sort's stability rather than
  // being treated as either best or worst.
  return pending.sort(
    (a, b) => (a.extraction_confidence ?? Infinity) - (b.extraction_confidence ?? Infinity),
  );
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function approvePromotion(id: string) {
  const reviewedBy = await currentUserId();
  const { error } = await supabase
    .from("promotions")
    .update({ status: "approved", reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function rejectPromotion(id: string, reason: string) {
  const reviewedBy = await currentUserId();
  const { error } = await supabase
    .from("promotions")
    .update({
      status: "rejected",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export type ReviewEditFields = {
  name: string;
  discount_text: string;
  threshold: string;
  notes: string;
  date_from: string;
  date_to: string;
};

// Editing is treated as verifying: saving a correction also approves the
// row in the same call, since there'd be no reason to fix bad OCR/scraper
// data and leave it unapproved. Flagged as a decision worth revisiting.
export async function editAndApprovePromotion(id: string, fields: ReviewEditFields) {
  const reviewedBy = await currentUserId();
  const { error } = await supabase
    .from("promotions")
    .update({
      ...fields,
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

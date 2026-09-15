import { chromium } from "playwright";
import { retailerTargets } from "./retailers";
import { extractPromotionFields } from "./extract";
import { supabaseAdmin } from "./supabaseAdmin";

const CREATIVES_BUCKET = "promotion-creatives";
const NAV_TIMEOUT_MS = 30_000;
const BOT_WALL_TITLE_MARKERS = ["just a moment", "attention required", "access denied"];

// Matches the "accept all" button on every consent-management platform seen
// across these retailers' sites so far (Polish and English wording) — best
// effort, not an exhaustive list. Scoped to actual button roles so a false
// match on an unrelated page button is unlikely and harmless either way:
// worst case it clicks nothing (timeout) or clicks something inert.
const COOKIE_CONSENT_BUTTON_PATTERN = /akceptuj|zaakceptuj|zgadzam|accept all|allow all/i;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function inOneWeekIso() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function isIsoDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const PROMOTION_TYPES = ["Fixed promotion", "Buy one get one free", "Custom"] as const;

function sanitizePromotionType(value: string | undefined): (typeof PROMOTION_TYPES)[number] | null {
  return value && (PROMOTION_TYPES as readonly string[]).includes(value)
    ? (value as (typeof PROMOTION_TYPES)[number])
    : null;
}

// Gemini's confidence/discountPercent are free-form model output, not
// guaranteed to respect the shape we asked for — clamp rather than trust
// them verbatim, since `promotions.extraction_confidence` has a 0-1 DB
// check constraint that would otherwise reject the whole insert.
function clampConfidence(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.min(1, Math.max(0, value));
}

function sanitizeDiscountPercent(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) return null;
  return value;
}

// promotions has no unique constraint beyond its id, and this scraper now
// runs every 12 hours — without this check, a campaign that's still live
// gets a brand-new duplicate row every single run. Approving one duplicate
// in the review queue doesn't clear its siblings, so these pile up as
// permanent unreviewed clutter, and if multiple get approved they show up as
// separate duplicate cards on the Dashboard/analytics.
//
// Matching is deliberately conservative: same retailer + market, a
// case-insensitive exact name match, AND an overlapping date range (not
// just "starts on the same day"). This trades recall for safety — a
// genuinely new promotion that happens to reuse an old name and land in an
// overlapping window would be wrongly skipped, but that's a much rarer and
// more tolerable failure than the guaranteed daily duplication this
// prevents. Skips are logged, never silent, so a wrongly-skipped promotion
// is at least visible in the run output rather than just vanishing.
async function findExistingPromotionId(
  retailerId: string,
  market: "PL",
  name: string,
  dateFrom: string,
  dateTo: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("promotions")
    .select("id")
    .eq("retailer_id", retailerId)
    .eq("market", market)
    .ilike("name", name)
    .in("status", ["pending_review", "approved"])
    .lte("date_from", dateTo)
    .gte("date_to", dateFrom)
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function findCategoryId(categories: { id: string; name: string }[], raw: string | undefined) {
  if (!raw) return null;
  const needle = raw.trim().toLowerCase();
  const exact = categories.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = categories.find(
    (c) => needle.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(needle),
  );
  return partial?.id ?? null;
}

// Best-effort dismissal of a cookie-consent modal before the screenshot is
// taken — GH Actions launches a completely cookie-free browser every run, so
// any retailer running a consent-management platform shows this on every
// single scrape, potentially covering the real promo content in the
// screenshot Gemini sees. No-ops harmlessly if no matching button appears in
// time (most likely there's no modal on this page, or its wording doesn't
// match — either way the scrape proceeds exactly as before this existed).
async function dismissCookieConsent(page: import("playwright").Page) {
  try {
    await page
      .getByRole("button", { name: COOKIE_CONSENT_BUTTON_PATTERN })
      .first()
      .click({ timeout: 3000 });
    await page.waitForTimeout(500);
  } catch {
    // No matching consent button found/clickable in time — not fatal.
  }
}

async function findOrCreateBrandIds(market: "PL", rawBrands: string | undefined) {
  if (!rawBrands) return [];
  const names = rawBrands
    .split(/[,/&]| i | and /gi)
    .map((n) => n.trim())
    .filter(Boolean);

  const ids: string[] = [];
  for (const name of names) {
    const { data: existing } = await supabaseAdmin
      .from("brands")
      .select("id")
      .ilike("name", name)
      .eq("market", market)
      .limit(1)
      .maybeSingle();

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const { data: created, error } = await supabaseAdmin
      .from("brands")
      .insert({ name, market })
      .select("id")
      .single();

    if (!error && created) ids.push(created.id);
  }
  return ids;
}

async function scrapeRetailer(
  browser: import("playwright").Browser,
  target: (typeof retailerTargets)[number],
  categories: { id: string; name: string }[],
) {
  console.log(`[${target.name}] navigating to ${target.url}`);
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
  });
  // Playwright/CDP-launched Chromium exposes navigator.webdriver=true by
  // default, one of the most basic signals a WAF can check for. Patching it
  // (plus the launch args below) removes that tell for free and is safe
  // hygiene either way, but it is NOT sufficient on its own against a
  // sophisticated product like Akamai Bot Manager (confirmed by testing
  // directly against sephora.pl/douglas.pl with exactly this hardening
  // applied — still an immediate 403; see the long comment in retailers.ts
  // for what was actually tried and ruled out for those two).
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  try {
    const response = await page.goto(target.url, {
      waitUntil: "networkidle",
      timeout: NAV_TIMEOUT_MS,
    });

    const title = (await page.title()).toLowerCase();
    if (BOT_WALL_TITLE_MARKERS.some((marker) => title.includes(marker))) {
      console.warn(`[${target.name}] blocked by bot protection (title: "${title}") — skipping`);
      return { retailer: target.name, status: "blocked" as const };
    }
    if (response && !response.ok()) {
      console.warn(`[${target.name}] HTTP ${response.status()} — skipping`);
      return { retailer: target.name, status: "http_error" as const };
    }

    await dismissCookieConsent(page);
    const screenshot = await page.screenshot({ fullPage: true, type: "png" });

    const { data: retailer } = await supabaseAdmin
      .from("retailers")
      .select("id")
      .eq("name", target.name)
      .eq("market", target.market)
      .single();

    if (!retailer) {
      console.warn(`[${target.name}] retailer not found in DB — skipping`);
      return { retailer: target.name, status: "no_retailer_row" as const };
    }

    let extracted;
    try {
      extracted = await extractPromotionFields(screenshot);
    } catch (err) {
      console.warn(`[${target.name}] extraction failed:`, err);
      return { retailer: target.name, status: "extraction_failed" as const };
    }

    let inserted = 0;
    let skipped = 0;
    for (const item of extracted) {
      const dateFrom = isIsoDate(item.dateFrom) ? item.dateFrom : todayIso();
      const dateTo = isIsoDate(item.dateTo) ? item.dateTo : inOneWeekIso();
      const categoryId = await findCategoryId(categories, item.category);
      const name = item.name || `${target.name} promotion (scraped ${todayIso()})`;

      const existingId = await findExistingPromotionId(retailer.id, target.market, name, dateFrom, dateTo);
      if (existingId) {
        console.log(
          `[${target.name}] skipping "${name}" — matches existing promotion ${existingId} (same retailer/name, overlapping dates)`,
        );
        skipped += 1;
        continue;
      }

      const { data: promotion, error } = await supabaseAdmin
        .from("promotions")
        .insert({
          market: target.market,
          retailer_id: retailer.id,
          category_id: categoryId,
          name,
          date_from: dateFrom,
          date_to: dateTo,
          discount_text: item.discount || null,
          discount_percent: sanitizeDiscountPercent(item.discountPercent),
          threshold: item.threshold || null,
          notes: item.notes || null,
          avg_market_discount: item.averageMarketDiscount || null,
          promotion_type: sanitizePromotionType(item.promotionType),
          extraction_confidence: clampConfidence(item.confidence),
          uncertain_fields: item.uncertainFields?.length ? item.uncertainFields : null,
          status: "pending_review",
          source: "scraper",
        })
        .select("id")
        .single();

      if (error || !promotion) {
        console.warn(`[${target.name}] failed to insert promotion:`, error);
        continue;
      }

      const brandIds = await findOrCreateBrandIds(target.market, item.brands);
      if (brandIds.length) {
        await supabaseAdmin
          .from("promotion_brands")
          .insert(brandIds.map((brand_id) => ({ promotion_id: promotion.id, brand_id })));
      }

      const storagePath = `${target.market}/${target.name}/${todayIso()}/${promotion.id}.png`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(CREATIVES_BUCKET)
        .upload(storagePath, screenshot, { contentType: "image/png" });

      if (!uploadError) {
        await supabaseAdmin
          .from("promotion_creatives")
          .insert({ promotion_id: promotion.id, storage_path: storagePath });
      } else {
        console.warn(`[${target.name}] screenshot upload failed:`, uploadError);
      }

      inserted += 1;
    }

    console.log(
      `[${target.name}] done — ${inserted} promotion(s) created as pending_review, ${skipped} skipped as duplicates`,
    );
    return { retailer: target.name, status: "ok" as const, inserted, skipped };
  } catch (err) {
    console.warn(`[${target.name}] navigation/scrape error:`, err);
    return { retailer: target.name, status: "error" as const };
  } finally {
    await page.close();
  }
}

// Set by the GH Actions workflow_dispatch "retailer" input (see
// .github/workflows/scrape.yml) when triggered manually — either from the
// Actions UI or the frontend's "Check for Promotions" button via
// api/trigger-scrape.ts. Unset (undefined/empty) on every scheduled run,
// which keeps scraping every retailer exactly as before this existed.
function resolveTargets(): typeof retailerTargets {
  const filter = process.env.RETAILER_FILTER?.trim();
  if (!filter || filter === "all") return retailerTargets;

  const matched = retailerTargets.filter((t) => t.name === filter);
  if (matched.length === 0) {
    console.warn(
      `RETAILER_FILTER="${filter}" matched no known retailer (expected one of: ${retailerTargets
        .map((t) => t.name)
        .join(", ")}, or "all") — scraping nothing this run.`,
    );
  }
  return matched;
}

async function main() {
  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from("categories")
    .select("id, name");

  if (categoriesError || !categories) {
    throw new Error(`Failed to load categories: ${categoriesError?.message}`);
  }

  const targets = resolveTargets();
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const results = [];

  try {
    for (const target of targets) {
      results.push(await scrapeRetailer(browser, target, categories));
    }
  } finally {
    await browser.close();
  }

  console.log("Summary:", JSON.stringify(results, null, 2));

  const failures = results.filter((r) => r.status !== "ok");
  if (failures.length) {
    console.warn(`${failures.length}/${results.length} retailer(s) did not produce data this run.`);
  }
}

main().catch((err) => {
  console.error("Scraper run failed:", err);
  process.exit(1);
});

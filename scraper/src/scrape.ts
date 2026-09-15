import { chromium } from "playwright";
import { retailerTargets } from "./retailers";
import { extractPromotionFields } from "./extract";
import { supabaseAdmin } from "./supabaseAdmin";

const CREATIVES_BUCKET = "promotion-creatives";
const NAV_TIMEOUT_MS = 30_000;
const BOT_WALL_TITLE_MARKERS = ["just a moment", "attention required", "access denied"];

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
    for (const item of extracted) {
      const dateFrom = isIsoDate(item.dateFrom) ? item.dateFrom : todayIso();
      const dateTo = isIsoDate(item.dateTo) ? item.dateTo : inOneWeekIso();
      const categoryId = await findCategoryId(categories, item.category);

      const { data: promotion, error } = await supabaseAdmin
        .from("promotions")
        .insert({
          market: target.market,
          retailer_id: retailer.id,
          category_id: categoryId,
          name: item.name || `${target.name} promotion (scraped ${todayIso()})`,
          date_from: dateFrom,
          date_to: dateTo,
          discount_text: item.discount || null,
          threshold: item.threshold || null,
          notes: item.notes || null,
          avg_market_discount: item.averageMarketDiscount || null,
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

    console.log(`[${target.name}] done — ${inserted} promotion(s) created as pending_review`);
    return { retailer: target.name, status: "ok" as const, inserted };
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
  const browser = await chromium.launch({ headless: true });
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

// Full product-catalog crawl — separate from scrape.ts (promo banners).
// Walks each retailer's actual listing pages and reads product cards
// directly from the DOM (see CatalogTarget in retailers.ts for why this is
// selector-based rather than a Gemini vision call like the promo scrape).

import { chromium, type Page } from "playwright";
import { catalogTargets, type CatalogTarget } from "./retailers";
import { supabaseAdmin } from "./supabaseAdmin";

const NAV_TIMEOUT_MS = 30_000;
const BOT_WALL_TITLE_MARKERS = ["just a moment", "attention required", "access denied"];

type ExtractedItem = {
  name: string;
  brand: string | null;
  price: number | null;
  image: string | null;
  url: string | null;
  externalId: string;
};

function parsePrice(text: string | null): number | null {
  if (!text) return null;
  const match = text.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  return Number(match[1].replace(",", "."));
}

function resolveUrl(value: string | null, base: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

// Sites that lazy-load images keep a shared placeholder/spinner in `src`
// until the real <img> scrolls into view, at which point their lazy-load
// library swaps it in (often reading from `data-src`, which typically holds
// the correct real URL the whole time regardless of whether that swap has
// happened yet). A listing page is usually 20-60+ cards tall, and this crawl
// never scrolled before reading each card's image — so every card below the
// fold ended up recording the same placeholder as its photo. Scrolling
// through the full page before reading gives lazy-load libraries a chance to
// swap in the real image everywhere, and preferring `data-src` (when present)
// over `src` covers the sites that never bother updating `src` at all.
async function scrollThroughPage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const step = 600;
      let scrolled = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        scrolled += step;
        if (scrolled >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
  // Scroll back to top so the extraction step below doesn't depend on
  // wherever the loop above happened to land.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

async function extractPageItems(
  page: Page,
  selectors: CatalogTarget["selectors"],
  pageUrl: string,
): Promise<ExtractedItem[]> {
  type RawItem = {
    name: string;
    brand: string | null;
    priceText: string | null;
    image: string | null;
    href: string | null;
  };

  const raw = await page.$$eval(
    selectors.item,
    (nodes: Element[], sel: CatalogTarget["selectors"]): RawItem[] =>
      nodes.map((node: Element): RawItem => {
        const nameEl = node.querySelector(sel.name);
        const brandEl = sel.brand ? node.querySelector(sel.brand) : null;
        const priceEl = node.querySelector(sel.price);
        const imageEl = node.querySelector(sel.image);
        const linkEl = node.querySelector(sel.link);
        const name = sel.nameFromImageAlt
          ? nameEl?.getAttribute("alt")?.trim() || ""
          : nameEl?.textContent?.trim() || "";
        return {
          name,
          brand: brandEl?.textContent?.trim() || null,
          priceText: sel.priceIsText
            ? priceEl?.textContent?.trim() || null
            : priceEl?.getAttribute("content") || null,
          // data-src (where present) is checked first, not just as a
          // fallback — see scrollThroughPage's comment for why `src` alone
          // is unreliable on lazy-loading listing pages.
          image:
            imageEl?.getAttribute("data-src") ||
            imageEl?.getAttribute("src") ||
            null,
          href: linkEl?.getAttribute("href") || null,
        };
      }),
    selectors,
  );

  return raw
    .filter((item: RawItem) => item.name)
    .map((item: RawItem) => {
      const url = resolveUrl(item.href, pageUrl);
      return {
        name: item.name,
        brand: item.brand,
        price: parsePrice(item.priceText),
        image: resolveUrl(item.image, pageUrl),
        url,
        externalId: url || item.name,
      };
    });
}

async function crawlCategory(
  browser: import("playwright").Browser,
  target: CatalogTarget,
  categoryUrl: string,
): Promise<ExtractedItem[]> {
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });
  const items: ExtractedItem[] = [];
  let currentUrl = categoryUrl;

  try {
    for (let pageIndex = 0; pageIndex < target.maxPagesPerCategory; pageIndex += 1) {
      const response = await page.goto(currentUrl, {
        waitUntil: "networkidle",
        timeout: NAV_TIMEOUT_MS,
      });

      const title = (await page.title()).toLowerCase();
      if (BOT_WALL_TITLE_MARKERS.some((marker) => title.includes(marker))) {
        console.warn(`[${target.name}] blocked by bot protection (title: "${title}") — stopping this category`);
        break;
      }
      if (response && !response.ok()) {
        console.warn(`[${target.name}] HTTP ${response.status()} on page ${pageIndex + 1} — stopping this category`);
        break;
      }

      await scrollThroughPage(page);
      const pageItems = await extractPageItems(page, target.selectors, currentUrl);
      if (pageItems.length === 0) {
        console.warn(
          `[${target.name}] 0 items matched on page ${pageIndex + 1} (${currentUrl}) — selectors likely need updating`,
        );
      }
      items.push(...pageItems);

      if (!target.selectors.nextPage) break;
      const nextHref = await page
        .getAttribute(target.selectors.nextPage, "href")
        .catch(() => null);
      const nextUrl = resolveUrl(nextHref, currentUrl);
      if (!nextUrl || nextUrl === currentUrl) break;
      currentUrl = nextUrl;
    }
  } catch (err) {
    console.warn(`[${target.name}] crawl error on ${currentUrl}:`, err);
  } finally {
    await page.close();
  }

  return items;
}

async function upsertProducts(
  target: CatalogTarget,
  category: string,
  items: ExtractedItem[],
): Promise<number> {
  const { data: retailer } = await supabaseAdmin
    .from("retailers")
    .select("id")
    .eq("name", target.name)
    .eq("market", target.market)
    .single();

  if (!retailer) {
    console.warn(`[${target.name}] retailer not found in DB — skipping ${items.length} item(s)`);
    return 0;
  }

  const { data: categoryRow } = await supabaseAdmin
    .from("categories")
    .select("id")
    .ilike("name", category)
    .maybeSingle();

  const brandIdCache = new Map<string, string | null>();

  async function resolveBrandId(name: string | null): Promise<string | null> {
    if (!name) return null;
    const cached = brandIdCache.get(name);
    if (cached !== undefined) return cached;

    const { data: existing } = await supabaseAdmin
      .from("brands")
      .select("id")
      .ilike("name", name)
      .eq("market", target.market)
      .maybeSingle();

    if (existing) {
      brandIdCache.set(name, existing.id);
      return existing.id;
    }

    const { data: created, error } = await supabaseAdmin
      .from("brands")
      .insert({ name, market: target.market })
      .select("id")
      .single();

    const id = !error && created ? created.id : null;
    brandIdCache.set(name, id);
    return id;
  }

  let upserted = 0;
  for (const item of items) {
    const brandId = await resolveBrandId(item.brand);

    const { error } = await supabaseAdmin.from("products").upsert(
      {
        retailer_id: retailer.id,
        market: target.market,
        brand_id: brandId,
        category_id: categoryRow?.id ?? null,
        name: item.name,
        image_url: item.image,
        product_url: item.url,
        price: item.price,
        // catalogTargets is PL-only today (see retailers.ts) — hardcoded
        // rather than branching on target.market like the promo scrape does.
        currency: "PLN",
        external_id: item.externalId,
        source: "scraper",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "retailer_id,external_id" },
    );

    if (error) {
      console.warn(`[${target.name}] failed to upsert "${item.name}":`, error.message);
      continue;
    }
    upserted += 1;
  }

  return upserted;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results: { retailer: string; category: string; found: number; upserted: number }[] = [];

  try {
    for (const target of catalogTargets) {
      for (const categoryUrl of target.categoryUrls) {
        console.log(`[${target.name}] crawling ${categoryUrl.category}: ${categoryUrl.url}`);
        try {
          const items = await crawlCategory(browser, target, categoryUrl.url);
          const upserted = await upsertProducts(target, categoryUrl.category, items);
          results.push({
            retailer: target.name,
            category: categoryUrl.category,
            found: items.length,
            upserted,
          });
          console.log(
            `[${target.name}] ${categoryUrl.category} done — ${items.length} found, ${upserted} upserted`,
          );
        } catch (err) {
          console.warn(`[${target.name}] ${categoryUrl.category} crawl failed:`, err);
          results.push({ retailer: target.name, category: categoryUrl.category, found: 0, upserted: 0 });
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log("Summary:", JSON.stringify(results, null, 2));

  const totalUpserted = results.reduce((sum, r) => sum + r.upserted, 0);
  if (totalUpserted === 0) {
    console.warn("0 products upserted across every retailer/category this run — selectors in retailers.ts likely need re-checking against the live sites.");
  }
}

main().catch((err) => {
  console.error("Product catalog crawl failed:", err);
  process.exit(1);
});

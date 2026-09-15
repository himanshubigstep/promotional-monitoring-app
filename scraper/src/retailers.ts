// Target promo/sale pages per retailer, found by manual reconnaissance
// (see Decisions.md). Public pages only, no login — matches the client's
// own answer that only public data is in scope for now.
//
// Three retailers are deliberately excluded — all fall back to manual entry:
// - Hebe: serves an interactive Cloudflare Turnstile challenge.
// - Douglas, Sephora: block plain headless Playwright with a WAF "access
//   denied" (no challenge to solve, just a hard reject). Decision made to
//   treat these as blocked rather than spend time on fingerprint hardening —
//   revisit if that changes.

export type RetailerTarget = {
  name: string; // must match `retailers.name` in the DB (see supabase/seed.sql)
  market: "PL";
  url: string;
};

export const retailerTargets: RetailerTarget[] = [
  { name: "Notino", market: "PL", url: "https://www.notino.pl/aktualne-promocje/" },
  { name: "superpharm", market: "PL", url: "https://www.superpharm.pl/promocje" },
  { name: "drogerienatura", market: "PL", url: "https://drogerienatura.pl/promocje" },
  { name: "flaconi", market: "PL", url: "https://www.flaconi.pl/kategoria/sale/" },
];

// Full catalog targets for scrapeProducts.ts — a store's actual product
// listing pages, not its promo page. Unlike the promo scrape (one
// screenshot, sent to Gemini vision), this walks each listing page's DOM
// directly with CSS selectors: catalog pages are far more numerous per
// retailer than promo pages, so a per-page vision call would be slow and
// expensive, and listing markup is far more regular/structured than a
// promo banner's, which is exactly what DOM scraping is good at.
//
// Selectors below are a first pass from manual reconnaissance of each
// site's current listing markup (see Decisions.md) — sites change their
// markup without notice, so `npm run scrape:products` logging a suspiciously
// low item count for a retailer is the signal to go re-inspect and update
// its selectors here, not a bug in the crawl loop itself.
export type CatalogTarget = {
  name: string; // must match retailers.name in the DB, same as RetailerTarget
  market: "PL";
  // First listing page per category to crawl. Keep this list short — every
  // extra URL multiplies page-load + pagination cost across a weekly run.
  categoryUrls: { category: string; url: string }[];
  maxPagesPerCategory: number;
  selectors: {
    // Repeating card/tile wrapping one product on the listing page.
    item: string;
    name: string;
    // When true, `name` is an <img> selector and the product name is read
    // from its alt text instead of textContent — needed for at least one
    // retailer (drogerienatura) whose visible ".product-name" element is a
    // dead placeholder, unrelated to the actual product, on every card.
    nameFromImageAlt?: boolean;
    // Separate brand element, for the few sites that expose one distinct
    // from the product name. Omit where the listing only ever shows one
    // combined string — brand_id is nullable, so those rows just go in
    // without a brand rather than guessing at parsing "Brand Product Name".
    brand?: string;
    price: string;
    priceIsText?: boolean;
    image: string;
    link: string;
    // Selector (relative to the page, not the item) for a "next page" link.
    // Omit for retailers whose listing has no pagination to follow.
    nextPage?: string;
  };
};

export const catalogTargets: CatalogTarget[] = [
  {
    // Verified live 2026-09-14 against notino.pl. Its pagination ("1 2 3 …
    // 56") is client-side and didn't reliably respond to a plain click or a
    // ?page= query param in testing — rather than ship an unverified guess
    // at how it actually paginates, this only takes each category's first
    // (most-relevant-sorted) page. Revisit nextPage once someone confirms
    // the real mechanism.
    name: "Notino",
    market: "PL",
    categoryUrls: [
      { category: "Skincare", url: "https://www.notino.pl/kremy-na-dzien/" },
      { category: "Fragrance", url: "https://www.notino.pl/perfumy/" },
      { category: "Makeup", url: "https://www.notino.pl/tusze/" },
    ],
    maxPagesPerCategory: 1,
    selectors: {
      item: "[data-testid='product-container']",
      name: "[data-testid='product-card-name']",
      brand: "[data-testid='product-card-brand']",
      price: "[data-testid='product-price']",
      priceIsText: true,
      image: "img",
      link: "a",
    },
  },
  {
    // Verified live 2026-09-14. Runs on Magento + Algolia InstantSearch —
    // the grid mixes real product tiles (li.ais-Hits-item containing a
    // .product-reviews-summary) with promo/banner tiles in the same list,
    // hence the :has() filter. Its "1 z 105" pager didn't respond to a
    // plain click in testing (same as Notino) — single page per category
    // for now, see the Notino comment above for the same reasoning.
    name: "superpharm",
    market: "PL",
    categoryUrls: [
      { category: "Skincare", url: "https://www.superpharm.pl/pielegnacja-twarzy" },
      { category: "Makeup", url: "https://www.superpharm.pl/makijaz" },
      { category: "Haircare", url: "https://www.superpharm.pl/wlosy" },
    ],
    maxPagesPerCategory: 1,
    selectors: {
      item: "li.ais-Hits-item:has(.product-reviews-summary)",
      name: ".result-title",
      price: ".price",
      priceIsText: true,
      image: "img",
      link: "a",
    },
  },
  {
    // Verified live 2026-09-14. Runs on Magento — the visible
    // ".product-name" element is some kind of dead template artifact:
    // every card on the page has the exact same text in it regardless of
    // the actual product, so the real name is read from the product
    // image's alt text instead (see nameFromImageAlt), which does vary
    // correctly per card and was cross-checked against each item's own
    // product URL and price to confirm they line up.
    name: "drogerienatura",
    market: "PL",
    categoryUrls: [{ category: "Skincare", url: "https://drogerienatura.pl/kategoria/twarz-1749" }],
    maxPagesPerCategory: 1,
    selectors: {
      item: "form.product-item",
      name: "img",
      nameFromImageAlt: true,
      price: ".product-price-html",
      priceIsText: true,
      image: "img",
      link: "a",
    },
  },
  // flaconi is deliberately excluded from the catalog crawl (though it's
  // still fine for the promo scraper's screenshot-based flow above): its
  // product cards (verified live 2026-09-14 on flaconi.pl/kategoria/perfumy/)
  // carry no data-testid and no stable class names on the name/brand/price
  // elements inside each card — only auto-generated CSS-module hashes
  // (e.g. "KUbC6 dQMKd bhVeR…") that change on every frontend deploy. A
  // selector written against those would likely already be stale by the
  // next scheduled run. Revisit if the site ever exposes stable hooks, or
  // if this becomes worth a structural (nth-child-position) selector
  // instead — deliberately not attempted here since card layouts (e.g. a
  // "DEAL" badge appearing on some cards but not others) shift the count
  // of child elements between cards, which would make position-based
  // matching unreliable too.
];

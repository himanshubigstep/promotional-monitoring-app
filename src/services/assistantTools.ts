// Deterministic, data-grounded "tools" the AI assistant can call. Each
// function reads only from the application's real data (never from the LLM)
// and returns a renderable AssistantResult plus a compact summary that is fed
// back to Gemini so its written reply cannot drift from what's on screen.
import type { Product } from "../data/productTypes";
import type { Promotion } from "../context/AppContext";
import { appNavigation, findNavigation } from "../data/navigation";
import type {
  CellValue,
  ProductCardItem,
  PromotionCardItem,
  ToolExecutionResult,
} from "../types/assistant";

export type UnifiedSource = "ours" | "competitor";

export type UnifiedProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number | null;
  currency: string;
  market: string;
  retailer: string;
  rating: number | null;
  stock: number | null;
  competitorDiscount: number | null;
  image: string | null;
  fromDate: string | null;
  toDate: string | null;
  promotionName: string | null;
  description: string | null;
  promotionDescription: string | null;
  terms: string | null;
  priceAfterDiscount: number | null;
  source: UnifiedSource;
};

export type AssistantDataContext = {
  catalog: Product[]; // static competitor dataset (data/products.json)
  productsList: Product[]; // AppContext-managed products (ours + CZ demo)
  promotions: Promotion[]; // AppContext-managed promotions
  retailers: string[];
  brands: string[];
};

// "(Your brand)" is the only real "this is our own product" signal anywhere
// in the app's data model today (seeded in src/data/marketProducts.ts).
// Known limitation: the existing Add Promotion form's retailer dropdown
// (src/data/retailers.ts) never offers that value, so a promotion a user
// adds through the app's own UI can currently only be classified as a
// competitor here — there is no broader/existing "ours" signal to fall back
// to (the pre-existing Store comparison page has the same gap: its "your
// discount" column is a synthetic `discount - 2`, not derived from real
// product data). Fixing this for real needs a model-level change (e.g. an
// explicit `isOurs` field threaded through the existing Product type and
// form), which is out of scope for this assistant-only change.
const isOurs = (retailer: string) => /\(your brand\)/i.test(retailer);

function fromProduct(product: Product): UnifiedProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price ?? null,
    currency: product.currency,
    market: product.market,
    retailer: product.retailer,
    rating: product.rating ?? null,
    stock: product.stock ?? null,
    competitorDiscount: product.competitorDiscount ?? null,
    image: product.image ?? null,
    fromDate: product.fromDate ?? null,
    toDate: product.toDate ?? null,
    promotionName: product.promotionName ?? null,
    description: product.description ?? null,
    promotionDescription: product.promotionDescription ?? null,
    terms: product.terms ?? null,
    priceAfterDiscount: product.priceAfterDiscount ?? null,
    source: isOurs(product.retailer) ? "ours" : "competitor",
  };
}

export function buildUnifiedCatalog(ctx: AssistantDataContext): UnifiedProduct[] {
  const seen = new Set<string>();
  const out: UnifiedProduct[] = [];
  for (const list of [ctx.productsList, ctx.catalog]) {
    for (const product of list) {
      const key = product.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(fromProduct(product));
    }
  }
  return out;
}

// Diacritic-insensitive so "Estee Lauder"/"Estée Lauder" or "Lakme"/"Lakmé"
// match regardless of which spelling the user or a given retailer's catalog
// uses — a real inconsistency across this app's own datasets.
//
// Args ultimately come from Gemini's function-call JSON, which is untrusted
// input as far as shape goes — coerce defensively instead of assuming
// `string` so a stray number/boolean/null from the model can't throw and
// surface as a generic "Something went wrong" in the UI.
const norm = (value: unknown) =>
  (typeof value === "string" ? value : String(value ?? ""))
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const includesCI = (haystack: unknown, needle: unknown) =>
  norm(haystack).includes(norm(needle));

// Same defensive idea for boolean-ish tool args: Gemini's function-calling
// JSON has been observed to serialize booleans as strings in some SDKs/paths,
// and `"false"` is truthy in JS — treat only true/"true" as true instead of
// `if (args.flag)`.
const toBool = (value: unknown): boolean => value === true || value === "true";

// `Date#toISOString` always converts to UTC, but promotion dates are entered
// and read by a person in their own local timezone — for anyone behind UTC,
// "today" in UTC can already be tomorrow locally, silently shifting a
// "last N days" cutoff by a day. Format using local calendar fields instead.
const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function toProductCard(product: UnifiedProduct): ProductCardItem {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    retailer: product.retailer,
    category: product.category,
    market: product.market,
    price: product.price,
    currency: product.currency,
    priceAfterDiscount: product.priceAfterDiscount,
    discount: product.competitorDiscount,
    rating: product.rating,
    image: product.image,
    promotionName: product.promotionName,
    fromDate: product.fromDate,
    toDate: product.toDate,
    source: product.source,
  };
}

function toPromotionCard(promotion: Promotion): PromotionCardItem {
  return {
    id: promotion.id,
    name: promotion.name,
    brand: promotion.brands,
    retailer: promotion.retailer,
    category: promotion.category,
    market: promotion.market,
    discount: promotion.discount,
    from: promotion.from,
    to: promotion.to,
    notes: promotion.notes,
  };
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const average = (values: number[]) =>
  values.length ? round1(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;

// The UI now shows a compact preview (5 rows/cards) with a "View More"
// expander over the *full* result, so tools can afford to hand back a larger
// slice of the real dataset than before without cluttering the chat — the
// progressive disclosure happens at render time, not here. What Gemini itself
// sees for its 1-4 sentence summary is capped separately and much smaller
// (MODEL_PREVIEW_ROWS): it doesn't need every row to describe the result, and
// a smaller payload keeps token usage sane regardless of how much the UI ends
// up rendering.
const UI_ROW_LIMIT = 50;
const MODEL_PREVIEW_ROWS = 5;
const capForModel = <T>(items: T[], n = MODEL_PREVIEW_ROWS): T[] => items.slice(0, n);

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

export function toolGetNavigation(args: { query?: string }): ToolExecutionResult {
  const items = findNavigation(args.query || "");
  const list = items.length ? items : appNavigation;
  return {
    result: {
      type: "navigation",
      title: args.query ? `Navigation matching "${args.query}"` : "App navigation",
      items: list,
    },
    summaryForModel: list.map((item) => ({
      name: item.name,
      route: item.route,
      description: item.description,
      capabilities: item.capabilities,
    })),
  };
}

export function toolSearchStores(
  args: { market?: string; query?: string },
  ctx: AssistantDataContext,
): ToolExecutionResult {
  const unified = buildUnifiedCatalog(ctx);
  const filtered = unified.filter(
    (p) =>
      (!args.market || args.market === "All" || p.market === args.market) &&
      (!args.query || includesCI(p.retailer, args.query)),
  );
  const retailers = Array.from(new Set(filtered.map((p) => p.retailer)));
  const ranked = retailers
    .map((retailer) => {
      const offers = filtered.filter((p) => p.retailer === retailer);
      const discounts = offers.map((p) => p.competitorDiscount || 0);
      const prices = offers.map((p) => p.price || 0).filter((v) => v > 0);
      const brandCount = new Set(offers.map((p) => p.brand)).size;
      return {
        retailer,
        count: offers.length,
        brandCount,
        avgDiscount: average(discounts),
        avgPrice: prices.length ? average(prices) : null,
      };
    })
    // Ranked by discount so a "which stores have the highest discount"
    // question is answered correctly by simply showing the top of the list
    // (the UI's "top 5" preview), not an arbitrary/insertion order.
    .sort((a, b) => b.avgDiscount - a.avgDiscount);

  const rows: CellValue[][] = ranked.map((r) => [
    r.retailer,
    r.count,
    r.brandCount,
    `${r.avgDiscount}%`,
    r.avgPrice !== null ? `${r.avgPrice}` : "—",
  ]);

  const insights = ranked.length
    ? [
        `Highest avg. discount: **${ranked[0].retailer}** (${ranked[0].avgDiscount}%)`,
        `${ranked.length} retailer(s) tracked${args.market && args.market !== "All" ? ` in ${args.market}` : ""}.`,
      ]
    : undefined;

  return {
    result: {
      type: "table",
      title: "Stores / retailers",
      columns: ["Retailer", "Tracked products", "Brands", "Avg. discount", "Avg. price"],
      rows,
      insights,
    },
    summaryForModel: capForModel(rows),
  };
}

export function toolSearchBrands(
  args: { market?: string; query?: string },
  ctx: AssistantDataContext,
): ToolExecutionResult {
  const unified = buildUnifiedCatalog(ctx);
  const filtered = unified.filter(
    (p) =>
      (!args.market || args.market === "All" || p.market === args.market) &&
      (!args.query || includesCI(p.brand, args.query)),
  );
  const brands = Array.from(new Set(filtered.map((p) => p.brand)));
  const ranked = brands
    .map((brand) => {
      const offers = filtered.filter((p) => p.brand === brand);
      const discounts = offers.map((p) => p.competitorDiscount || 0);
      const prices = offers.map((p) => p.price || 0).filter((v) => v > 0);
      const retailers = Array.from(new Set(offers.map((p) => p.retailer)));
      return {
        brand,
        count: offers.length,
        retailers,
        avgPrice: prices.length ? average(prices) : null,
        avgDiscount: average(discounts),
      };
    })
    // Ranked by discount by default so "most discounted brand" is just the
    // top of the list, same as toolSearchStores.
    .sort((a, b) => b.avgDiscount - a.avgDiscount);

  const rows: CellValue[][] = ranked.map((r) => [
    r.brand,
    r.count,
    r.retailers.join(", "),
    r.avgPrice !== null ? `${r.avgPrice}` : "—",
    `${r.avgDiscount}%`,
  ]);

  const insights = ranked.length
    ? [`Highest avg. discount: **${ranked[0].brand}** (${ranked[0].avgDiscount}%).`]
    : undefined;

  return {
    result: {
      type: "table",
      title: args.query ? `Brands matching "${args.query}"` : "Brands",
      columns: ["Brand", "Offers", "Retailers", "Avg. price", "Avg. discount"],
      rows,
      insights,
    },
    summaryForModel: capForModel(rows),
  };
}

export type SearchProductsArgs = {
  brand?: string;
  category?: string;
  retailer?: string;
  market?: string;
  query?: string;
  source?: UnifiedSource | "all";
  minDiscount?: number;
  maxPrice?: number;
  sortBy?: "discount" | "price" | "rating";
  order?: "asc" | "desc";
  limit?: number;
};

export function toolSearchProducts(
  args: SearchProductsArgs,
  ctx: AssistantDataContext,
): ToolExecutionResult {
  const unified = buildUnifiedCatalog(ctx);
  let filtered = unified.filter(
    (p) =>
      (!args.brand || includesCI(p.brand, args.brand)) &&
      (!args.category || includesCI(p.category, args.category)) &&
      (!args.retailer || includesCI(p.retailer, args.retailer)) &&
      (!args.market || args.market === "All" || p.market === args.market) &&
      (!args.query ||
        includesCI(p.name, args.query) ||
        includesCI(p.brand, args.query) ||
        includesCI(p.category, args.query)) &&
      (!args.source || args.source === "all" || p.source === args.source) &&
      (args.minDiscount === undefined || (p.competitorDiscount || 0) >= args.minDiscount) &&
      (args.maxPrice === undefined || (p.price || 0) <= args.maxPrice),
  );

  const sortKey = args.sortBy || "discount";
  const order = args.order || "desc";
  filtered = filtered.slice().sort((a, b) => {
    const av =
      sortKey === "discount" ? a.competitorDiscount || 0 : sortKey === "price" ? a.price || 0 : a.rating || 0;
    const bv =
      sortKey === "discount" ? b.competitorDiscount || 0 : sortKey === "price" ? b.price || 0 : b.rating || 0;
    return order === "asc" ? av - bv : bv - av;
  });

  // Fetch a generous slice for the UI's progressive-disclosure table (up to
  // UI_ROW_LIMIT) — the model can still ask for a smaller/larger `limit`
  // explicitly, but the default is no longer tied to how many rows the chat
  // bubble shows at once (that's the UI's job now, see AssistantResultView).
  const limited = filtered.slice(0, Math.min(args.limit || UI_ROW_LIMIT, UI_ROW_LIMIT));
  const items = limited.map(toProductCard);

  const metricLabel = sortKey === "discount" ? "discount" : sortKey === "price" ? "price" : "rating";
  const formatMetric = (item: ProductCardItem) =>
    sortKey === "discount"
      ? `${item.discount ?? 0}%`
      : sortKey === "price"
        ? `${item.price ?? "?"} ${item.currency}`
        : `${item.rating ?? "?"}★`;
  const insights =
    items.length > 0
      ? [
          `${order === "asc" ? "Lowest" : "Highest"} ${metricLabel}: **${items[0].name}** — ${formatMetric(items[0])} at ${items[0].retailer}.`,
        ]
      : undefined;

  return {
    result: {
      type: "product_cards",
      title: "Products",
      items,
      caption: `${filtered.length} matching product(s) in total.`,
      insights,
    },
    summaryForModel: {
      totalMatches: filtered.length,
      shown: capForModel(items).map((i) => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
        retailer: i.retailer,
        price: i.price,
        priceAfterDiscount: i.priceAfterDiscount,
        discount: i.discount,
        source: i.source,
      })),
    },
  };
}

export type SearchPromotionsArgs = {
  brand?: string;
  category?: string;
  retailer?: string;
  market?: string;
  query?: string;
  minDiscount?: number;
  fromDate?: string;
  toDate?: string;
  limit?: number;
};

const discountNumberOf = (promotion: Promotion) =>
  Number((promotion.discount.match(/(\d+(?:\.\d+)?)/) || [])[1] || 0);

export function toolSearchPromotions(
  args: SearchPromotionsArgs,
  ctx: AssistantDataContext,
): ToolExecutionResult {
  const filtered = ctx.promotions
    .filter((p) => {
      const discountNumber = discountNumberOf(p);
      return (
        (!args.brand || includesCI(p.brands, args.brand)) &&
        (!args.category || includesCI(p.category, args.category)) &&
        (!args.retailer || includesCI(p.retailer, args.retailer)) &&
        (!args.market || args.market === "All" || p.market === args.market) &&
        (!args.query ||
          includesCI(p.name, args.query) ||
          includesCI(p.brands, args.query) ||
          includesCI(p.category, args.query)) &&
        (args.minDiscount === undefined || discountNumber >= args.minDiscount) &&
        (!args.fromDate || p.to >= args.fromDate) &&
        (!args.toDate || p.from <= args.toDate)
      );
    })
    // Ranked by discount by default, same reasoning as toolSearchProducts —
    // "biggest promotions" is then simply the top of the UI's preview.
    .sort((a, b) => discountNumberOf(b) - discountNumberOf(a));

  const limited = filtered.slice(0, Math.min(args.limit || UI_ROW_LIMIT, UI_ROW_LIMIT));
  const items = limited.map(toPromotionCard);
  const insights =
    items.length > 0
      ? [`Biggest promotion: **${items[0].name}** — ${items[0].discount} at ${items[0].retailer}.`]
      : undefined;

  return {
    result: {
      type: "promotion_cards",
      title: "Promotions",
      items,
      caption: `${filtered.length} matching promotion(s) in total.`,
      insights,
    },
    summaryForModel: {
      totalMatches: filtered.length,
      shown: capForModel(items),
    },
  };
}

export type CompareProductsArgs = {
  brand?: string;
  query?: string;
  market?: string;
  onlyCheaperCompetitor?: boolean;
  limit?: number;
};

function bestOurMatch(ours: UnifiedProduct[], brand: string): UnifiedProduct | null {
  const brandMatches = ours.filter((p) => includesCI(p.brand, brand));
  if (!brandMatches.length) return null;
  return brandMatches.slice().sort((a, b) => (a.price || Infinity) - (b.price || Infinity))[0];
}

export function toolCompareProducts(
  args: CompareProductsArgs,
  ctx: AssistantDataContext,
  competitorSource: UnifiedSource | "all" = "all",
): ToolExecutionResult {
  const unified = buildUnifiedCatalog(ctx);
  const matches = (p: UnifiedProduct) =>
    (!args.brand || includesCI(p.brand, args.brand)) &&
    (!args.query ||
      includesCI(p.name, args.query) ||
      includesCI(p.brand, args.query) ||
      includesCI(p.category, args.query)) &&
    (!args.market || args.market === "All" || p.market === args.market);

  const ours = unified.filter((p) => p.source === "ours" && matches(p));
  const competitors = unified.filter(
    (p) =>
      p.source !== "ours" &&
      (competitorSource === "all" || p.source === competitorSource) &&
      matches(p),
  );

  type Row = {
    product: string;
    ourPrice: number | null;
    competitor: string;
    competitorPrice: number | null;
    discount: number | null;
  };
  const rows: Row[] = competitors.map((competitor) => {
    const ourMatch = bestOurMatch(ours, competitor.brand);
    return {
      product: competitor.name,
      ourPrice: ourMatch ? ourMatch.priceAfterDiscount ?? ourMatch.price : null,
      competitor: competitor.retailer,
      competitorPrice: competitor.priceAfterDiscount ?? competitor.price,
      discount: competitor.competitorDiscount,
    };
  });

  const scoped = toBool(args.onlyCheaperCompetitor)
    ? rows.filter(
        (row) =>
          row.ourPrice !== null &&
          row.competitorPrice !== null &&
          row.competitorPrice < row.ourPrice,
      )
    : rows;
  // Ranked by discount by default so "biggest competitor discount" is simply
  // the top of the UI's 5-row preview rather than an arbitrary match order.
  const filteredRows = scoped.slice().sort((a, b) => (b.discount || 0) - (a.discount || 0));

  const limited = filteredRows.slice(0, Math.min(args.limit || UI_ROW_LIMIT, UI_ROW_LIMIT));
  const tableRows: CellValue[][] = limited.map((row) => [
    row.product,
    row.ourPrice !== null ? row.ourPrice : "No matching product",
    row.competitor,
    row.competitorPrice,
    row.discount !== null ? `${row.discount}%` : "—",
  ]);

  if (!ours.length && !competitors.length) {
    return {
      result: {
        type: "text",
        text: args.brand
          ? `I couldn't find any products for brand "${args.brand}" in our catalog or competitor data.`
          : "I couldn't find products matching that request.",
      },
      summaryForModel: { totalMatches: 0 },
    };
  }

  const cheaperCount = rows.filter(
    (row) => row.ourPrice !== null && row.competitorPrice !== null && row.competitorPrice < row.ourPrice,
  ).length;
  const insights: string[] = [];
  if (filteredRows.length > 0 && filteredRows[0].discount !== null) {
    insights.push(
      `Biggest competitor discount: **${filteredRows[0].discount}%** — ${filteredRows[0].product} at ${filteredRows[0].competitor}.`,
    );
  }
  if (rows.length > 0) {
    insights.push(`${cheaperCount} of ${rows.length} competitor offer(s) beat our price.`);
  }

  return {
    result: {
      type: "comparison_table",
      title: args.brand ? `${args.brand}: our products vs. competitors` : "Product comparison",
      columns: ["Product", "Our price", "Competitor", "Competitor price", "Discount"],
      rows: tableRows,
      caption: `${filteredRows.length} competitor offer(s) compared against ${ours.length} of our matching product(s).`,
      insights: insights.length ? insights : undefined,
    },
    summaryForModel: { ourProductCount: ours.length, rows: capForModel(limited) },
  };
}

export function toolCompareBrands(
  args: { brand: string; market?: string },
  ctx: AssistantDataContext,
): ToolExecutionResult {
  const unified = buildUnifiedCatalog(ctx);
  const offers = unified.filter(
    (p) =>
      includesCI(p.brand, args.brand) &&
      (!args.market || args.market === "All" || p.market === args.market),
  );
  if (!offers.length) {
    return {
      result: { type: "text", text: `No products found for brand "${args.brand}".` },
      summaryForModel: { totalMatches: 0 },
    };
  }
  const retailers = Array.from(new Set(offers.map((p) => p.retailer)));
  const ranked = retailers
    .map((retailer) => {
      const retailerOffers = offers.filter((p) => p.retailer === retailer);
      const prices = retailerOffers.map((p) => p.price || 0).filter((v) => v > 0);
      const discounts = retailerOffers.map((p) => p.competitorDiscount || 0);
      return {
        retailer,
        count: retailerOffers.length,
        avgPrice: prices.length ? average(prices) : null,
        avgDiscount: average(discounts),
      };
    })
    .sort((a, b) => b.avgDiscount - a.avgDiscount);

  const rows: CellValue[][] = ranked.map((r) => [
    r.retailer,
    r.count,
    r.avgPrice !== null ? r.avgPrice : "—",
    `${r.avgDiscount}%`,
  ]);

  return {
    result: {
      type: "comparison_table",
      title: `${args.brand}: average price & discount by retailer`,
      columns: ["Retailer", "Products", "Avg. price", "Avg. discount"],
      rows,
      insights: ranked.length
        ? [`Highest avg. discount for ${args.brand}: **${ranked[0].retailer}** (${ranked[0].avgDiscount}%).`]
        : undefined,
    },
    summaryForModel: capForModel(rows),
  };
}

export function toolCompareStores(
  args: { retailerA: string; retailerB: string; market?: string },
  ctx: AssistantDataContext,
): ToolExecutionResult {
  const unified = buildUnifiedCatalog(ctx);
  const forRetailer = (retailer: string) =>
    unified.filter(
      (p) =>
        includesCI(p.retailer, retailer) &&
        (!args.market || args.market === "All" || p.market === args.market),
    );
  const a = forRetailer(args.retailerA);
  const b = forRetailer(args.retailerB);
  const stat = (list: UnifiedProduct[]) => {
    const prices = list.map((p) => p.price || 0).filter((v) => v > 0);
    const discounts = list.map((p) => p.competitorDiscount || 0);
    return {
      count: list.length,
      avgPrice: prices.length ? average(prices) : 0,
      avgDiscount: average(discounts),
      brands: new Set(list.map((p) => p.brand)).size,
    };
  };
  const statA = stat(a);
  const statB = stat(b);
  const rows: CellValue[][] = [
    ["Tracked products", statA.count, statB.count],
    ["Brands covered", statA.brands, statB.brands],
    ["Avg. price", statA.avgPrice, statB.avgPrice],
    ["Avg. discount", `${statA.avgDiscount}%`, `${statB.avgDiscount}%`],
  ];
  const discountWinner =
    statA.avgDiscount === statB.avgDiscount
      ? null
      : statA.avgDiscount > statB.avgDiscount
        ? args.retailerA
        : args.retailerB;

  return {
    result: {
      type: "comparison_table",
      title: `${args.retailerA} vs. ${args.retailerB}`,
      columns: ["Metric", args.retailerA, args.retailerB],
      rows,
      insights: discountWinner
        ? [`**${discountWinner}** has the higher average discount.`]
        : undefined,
    },
    summaryForModel: { [args.retailerA]: statA, [args.retailerB]: statB },
  };
}

export function toolGetRecentPromotions(
  args: { days?: number },
  ctx: AssistantDataContext,
): ToolExecutionResult {
  const days = args.days ?? 10;
  const today = new Date();
  const todayISO = toLocalISODate(today);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = toLocalISODate(cutoff);
  // "Started or was added in the last N days" — bounded at today, so a
  // promotion campaigning months from now doesn't count just because it was
  // scheduled recently, unless it was actually added (createdAt) recently.
  const recent = ctx.promotions
    .filter(
      (p) =>
        (p.createdAt >= cutoffISO && p.createdAt <= todayISO) ||
        (p.from >= cutoffISO && p.from <= todayISO),
    )
    .sort((a, b) => b.from.localeCompare(a.from));
  const items = recent.slice(0, UI_ROW_LIMIT).map(toPromotionCard);
  return {
    result: {
      type: "promotion_cards",
      title: `Promotions from the last ${days} days`,
      items,
      caption: `${recent.length} promotion(s) started or were added in the last ${days} days.`,
      insights: items.length
        ? [`Most recent: **${items[0].name}** at ${items[0].retailer} (started ${items[0].from}).`]
        : undefined,
    },
    summaryForModel: { count: recent.length, items: capForModel(items) },
  };
}

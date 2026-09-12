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
const norm = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const includesCI = (haystack: string, needle: string) =>
  norm(haystack).includes(norm(needle));

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
  const rows: CellValue[][] = retailers.map((retailer) => {
    const offers = filtered.filter((p) => p.retailer === retailer);
    const discounts = offers.map((p) => p.competitorDiscount || 0);
    const prices = offers.map((p) => p.price || 0).filter((v) => v > 0);
    const brandCount = new Set(offers.map((p) => p.brand)).size;
    return [
      retailer,
      offers.length,
      brandCount,
      `${average(discounts)}%`,
      prices.length ? `${average(prices)}` : "—",
    ];
  });
  return {
    result: {
      type: "table",
      title: "Stores / retailers",
      columns: ["Retailer", "Tracked products", "Brands", "Avg. discount", "Avg. price"],
      rows,
    },
    summaryForModel: rows,
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
  const brands = Array.from(new Set(filtered.map((p) => p.brand))).sort();
  const rows: CellValue[][] = brands.map((brand) => {
    const offers = filtered.filter((p) => p.brand === brand);
    const discounts = offers.map((p) => p.competitorDiscount || 0);
    const prices = offers.map((p) => p.price || 0).filter((v) => v > 0);
    const retailers = Array.from(new Set(offers.map((p) => p.retailer)));
    return [
      brand,
      offers.length,
      retailers.join(", "),
      prices.length ? `${average(prices)}` : "—",
      `${average(discounts)}%`,
    ];
  });
  return {
    result: {
      type: "table",
      title: args.query ? `Brands matching "${args.query}"` : "Brands",
      columns: ["Brand", "Offers", "Retailers", "Avg. price", "Avg. discount"],
      rows,
    },
    summaryForModel: rows,
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

  const limited = filtered.slice(0, Math.min(args.limit || 12, 30));
  const items = limited.map(toProductCard);
  return {
    result: {
      type: "product_cards",
      title: "Products",
      items,
      caption: `${filtered.length} matching product(s), showing ${items.length}.`,
    },
    summaryForModel: {
      totalMatches: filtered.length,
      shown: items.map((i) => ({
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

export function toolSearchPromotions(
  args: SearchPromotionsArgs,
  ctx: AssistantDataContext,
): ToolExecutionResult {
  const filtered = ctx.promotions.filter((p) => {
    const discountNumber = Number((p.discount.match(/(\d+(?:\.\d+)?)/) || [])[1] || 0);
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
  });
  const limited = filtered.slice(0, Math.min(args.limit || 12, 30));
  const items = limited.map(toPromotionCard);
  return {
    result: {
      type: "promotion_cards",
      title: "Promotions",
      items,
      caption: `${filtered.length} matching promotion(s), showing ${items.length}.`,
    },
    summaryForModel: {
      totalMatches: filtered.length,
      shown: items,
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

  const filteredRows = args.onlyCheaperCompetitor
    ? rows.filter(
        (row) =>
          row.ourPrice !== null &&
          row.competitorPrice !== null &&
          row.competitorPrice < row.ourPrice,
      )
    : rows;

  const limited = filteredRows.slice(0, Math.min(args.limit || 15, 30));
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

  return {
    result: {
      type: "comparison_table",
      title: args.brand ? `${args.brand}: our products vs. competitors` : "Product comparison",
      columns: ["Product", "Our price", "Competitor", "Competitor price", "Discount"],
      rows: tableRows,
      caption: `${filteredRows.length} competitor offer(s) compared against ${ours.length} of our matching product(s).`,
    },
    summaryForModel: { ourProductCount: ours.length, rows: limited },
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
  const rows: CellValue[][] = retailers.map((retailer) => {
    const retailerOffers = offers.filter((p) => p.retailer === retailer);
    const prices = retailerOffers.map((p) => p.price || 0).filter((v) => v > 0);
    const discounts = retailerOffers.map((p) => p.competitorDiscount || 0);
    return [
      retailer,
      retailerOffers.length,
      prices.length ? average(prices) : "—",
      `${average(discounts)}%`,
    ];
  });
  return {
    result: {
      type: "comparison_table",
      title: `${args.brand}: average price & discount by retailer`,
      columns: ["Retailer", "Products", "Avg. price", "Avg. discount"],
      rows,
    },
    summaryForModel: rows,
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
  return {
    result: {
      type: "comparison_table",
      title: `${args.retailerA} vs. ${args.retailerB}`,
      columns: ["Metric", args.retailerA, args.retailerB],
      rows,
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
  const todayISO = today.toISOString().slice(0, 10);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
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
  const items = recent.slice(0, 15).map(toPromotionCard);
  return {
    result: {
      type: "promotion_cards",
      title: `Promotions from the last ${days} days`,
      items,
      caption: `${recent.length} promotion(s) started or were added in the last ${days} days.`,
    },
    summaryForModel: { count: recent.length, items },
  };
}

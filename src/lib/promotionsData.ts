import { supabase } from "./supabaseClient";
import { getNoImagePlaceholder } from "./media";
import type { CatalogProduct, Product, ProductCategory, PromotionType } from "../data/productTypes";
import type { Promotion } from "../context/AppContext";

const CREATIVES_BUCKET = "promotion-creatives";

export type RetailerOption = { id: string; name: string; market: "PL" | "CZ"; isClient: boolean };
export type CategoryOption = { id: string; name: string };

export type LoadedData = {
  promotions: Promotion[];
  products: Product[];
  productCatalog: CatalogProduct[];
  brandsByMarket: Record<"PL" | "CZ", string[]>;
  retailers: RetailerOption[];
  categories: CategoryOption[];
};

type ProductRow = {
  id: string;
  name: string;
  market: string;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  product_url: string | null;
  brands: { name: string } | null;
  categories: { name: string } | null;
  retailers: { name: string; is_client: boolean } | null;
};

const PRODUCT_SELECT = `
  id, name, market, price, currency, image_url, product_url,
  brands ( name ),
  categories ( name ),
  retailers ( name, is_client )
`;

function mapProductRow(row: ProductRow): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    brand: row.brands?.name ?? "",
    category: (row.categories?.name as ProductCategory) ?? "",
    retailer: row.retailers?.name ?? "",
    market: row.market as "PL" | "CZ",
    price: row.price,
    currency: (row.currency as "PLN" | "CZK") ?? null,
    imageUrl: row.image_url,
    productUrl: row.product_url,
    isClient: row.retailers?.is_client ?? false,
  };
}

type PromotionRow = {
  id: string;
  market: string;
  name: string;
  date_from: string;
  date_to: string;
  scope: string | null;
  channel: string | null;
  discount_text: string | null;
  threshold: string | null;
  sku_count: number | null;
  notes: string | null;
  promotion_type: string | null;
  avg_market_discount: string | null;
  price_after_discount: number | null;
  price: number | null;
  currency: string | null;
  rating: number | null;
  stock: number | null;
  created_at: string;
  retailers: { id: string; name: string; is_client: boolean } | null;
  categories: { id: string; name: string } | null;
  promotion_brands: { brands: { id: string; name: string } | null }[];
  promotion_creatives: { storage_path: string; created_at: string }[];
};

async function resolveScreenshotUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(CREATIVES_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) {
    console.warn("Failed to sign screenshot URL", path, error);
    return null;
  }
  return data.signedUrl;
}

function parseDiscountNumber(discountText: string | null): number {
  if (!discountText) return 0;
  const match = discountText.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

async function mapRow(row: PromotionRow): Promise<{ promotion: Promotion; product: Product }> {
  const market = row.market as "PL" | "CZ";
  const brandNames = row.promotion_brands
    .map((pb) => pb.brands?.name)
    .filter((name): name is string => !!name);
  const latestCreative = [...row.promotion_creatives].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )[0];
  const screenshotUrl = await resolveScreenshotUrl(latestCreative?.storage_path ?? null);
  const isClient = row.retailers?.is_client ?? false;

  const promotion: Promotion = {
    id: row.id,
    market,
    name: row.name,
    from: row.date_from,
    to: row.date_to,
    scope: row.scope ?? "",
    channel: row.channel ?? "",
    category: row.categories?.name ?? "",
    brands: brandNames.join(", "),
    retailer: row.retailers?.name ?? "",
    discount: row.discount_text ?? "",
    threshold: row.threshold ?? "",
    promoPrice: row.price_after_discount != null ? String(row.price_after_discount) : "",
    promotionType: (row.promotion_type as PromotionType) || "Fixed promotion",
    skuCount: row.sku_count ?? 1,
    notes: row.notes ?? "",
    creativeName: latestCreative?.storage_path?.split("/").pop() ?? "",
    creativeData: screenshotUrl ?? undefined,
    averageMarketDiscount: row.avg_market_discount ?? "",
    createdAt: row.created_at,
    isClient,
  };

  const product: Product = {
    id: row.id,
    name: row.name,
    brand: brandNames[0] ?? "",
    category: (row.categories?.name as ProductCategory) ?? "Skincare",
    price: row.price ?? 0,
    currency: (row.currency as "PLN" | "CZK") ?? (market === "CZ" ? "CZK" : "PLN"),
    market,
    retailer: row.retailers?.name ?? "",
    rating: row.rating ?? 0,
    stock: row.stock ?? 0,
    competitorDiscount: parseDiscountNumber(row.discount_text),
    image: screenshotUrl ?? getNoImagePlaceholder(),
    fromDate: row.date_from,
    toDate: row.date_to,
    promotionName: row.name,
    description: row.notes ?? "",
    promotionDescription: row.notes ?? "",
    terms: row.notes ?? "",
    priceAfterDiscount: row.price_after_discount ?? 0,
    promoPrice: row.price_after_discount ?? undefined,
    promotionType: (row.promotion_type as PromotionType) || "Fixed promotion",
    isClient,
  };

  return { promotion, product };
}

const PROMOTION_SELECT = `
  id, market, name, date_from, date_to, scope, channel, discount_text, threshold,
  sku_count, notes, promotion_type, avg_market_discount, price_after_discount,
  price, currency, rating, stock, created_at,
  retailers ( id, name, is_client ),
  categories ( id, name ),
  promotion_brands ( brands ( id, name ) ),
  promotion_creatives ( storage_path, created_at )
`;

// Every non-review-queue view must only ever see approved rows — this is
// the client-side half of the RLS split introduced in 0003_review_audit.sql
// (RLS blocks analysts from seeing anything else, but editors get no such
// filter for free from the database).
export async function loadApprovedData(): Promise<LoadedData> {
  const [promotionsResult, brandsResult, retailersResult, categoriesResult, productsResult] = await Promise.all([
    supabase.from("promotions").select(PROMOTION_SELECT).eq("status", "approved").order("created_at", { ascending: false }),
    supabase.from("brands").select("id, name, market"),
    supabase.from("retailers").select("id, name, market, is_client"),
    supabase.from("categories").select("id, name"),
    supabase.from("products").select(PRODUCT_SELECT).order("name"),
  ]);

  if (promotionsResult.error) throw promotionsResult.error;
  if (brandsResult.error) throw brandsResult.error;
  if (retailersResult.error) throw retailersResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  // Deliberately non-fatal, unlike the other four: a freshly-migrated DB
  // legitimately has zero rows here until the scraper's catalog crawl (or a
  // manual add) runs for the first time, and — more importantly — an older
  // DB that hasn't had 0006_products.sql applied yet doesn't even have this
  // table (PostgREST returns PGRST205, "not found in schema cache"). Either
  // way, that shouldn't force the whole app into offline/static fallback —
  // just an empty product catalog until the table/migration exists.
  if (productsResult.error) {
    console.warn(
      "Failed to load the product catalog (falling back to an empty one, everything else still loads normally):",
      productsResult.error,
    );
  }

  const dataSets = [
    ["promotions", promotionsResult.data],
    ["brands", brandsResult.data],
    ["retailers", retailersResult.data],
    ["categories", categoriesResult.data],
  ] as const;
  const emptyDataSet = dataSets.find(
    ([, data]) => !Array.isArray(data) || data.length === 0,
  );
  if (emptyDataSet) {
    throw new Error(`Supabase returned no ${emptyDataSet[0]} data`);
  }

  const rows = (promotionsResult.data ?? []) as unknown as PromotionRow[];
  const mapped = await Promise.all(rows.map(mapRow));

  const brandsByMarket: Record<"PL" | "CZ", string[]> = { PL: [], CZ: [] };
  for (const brand of brandsResult.data ?? []) {
    const market = brand.market as "PL" | "CZ";
    brandsByMarket[market]?.push(brand.name);
  }

  const retailers: RetailerOption[] = (retailersResult.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    market: r.market as "PL" | "CZ",
    isClient: r.is_client,
  }));

  const productCatalog = ((productsResult.data ?? []) as unknown as ProductRow[]).map(mapProductRow);

  return {
    promotions: mapped.map((m) => m.promotion),
    products: mapped.map((m) => m.product),
    productCatalog,
    brandsByMarket,
    retailers,
    categories: categoriesResult.data ?? [],
  };
}

async function lookupOrCreateBrandId(name: string, market: "PL" | "CZ"): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .ilike("name", trimmed)
    .eq("market", market)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("brands")
    .insert({ name: trimmed, market })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function lookupRetailerId(name: string, market: "PL" | "CZ"): Promise<string | null> {
  const { data } = await supabase.from("retailers").select("id").eq("name", name).eq("market", market).maybeSingle();
  return data?.id ?? null;
}

async function lookupCategoryId(name: string): Promise<string | null> {
  const { data } = await supabase.from("categories").select("id").ilike("name", name).maybeSingle();
  return data?.id ?? null;
}

type PromotionInput = Omit<Promotion, "id" | "createdAt">;

async function toRowInput(promotion: PromotionInput) {
  const market = promotion.market;
  const retailerId = await lookupRetailerId(promotion.retailer, market);
  const categoryId = await lookupCategoryId(promotion.category);
  const promoPriceValue = Number(promotion.promoPrice || 0);

  return {
    market,
    retailer_id: retailerId,
    category_id: categoryId,
    name: promotion.name,
    date_from: promotion.from,
    date_to: promotion.to,
    scope: promotion.scope || null,
    channel: promotion.channel || null,
    discount_text: promotion.discount || null,
    threshold: promotion.threshold || null,
    sku_count: promotion.skuCount || null,
    notes: promotion.notes || null,
    promotion_type: promotion.promotionType || null,
    avg_market_discount: promotion.averageMarketDiscount || null,
    price_after_discount: promoPriceValue > 0 ? promoPriceValue : null,
    status: "approved",
    source: "manual",
  };
}

async function linkBrands(promotionId: string, brandsCsv: string, market: "PL" | "CZ") {
  const names = brandsCsv
    .split(/[,/]| i | and /gi)
    .map((n) => n.trim())
    .filter(Boolean);

  await supabase.from("promotion_brands").delete().eq("promotion_id", promotionId);

  for (const name of names) {
    const brandId = await lookupOrCreateBrandId(name, market);
    if (brandId) {
      await supabase.from("promotion_brands").insert({ promotion_id: promotionId, brand_id: brandId });
    }
  }
}

export async function insertPromotion(promotion: PromotionInput): Promise<string> {
  const rowInput = await toRowInput(promotion);
  if (!rowInput.retailer_id) {
    throw new Error(`Unknown retailer "${promotion.retailer}" for market ${promotion.market}`);
  }
  const insertPayload = { ...rowInput, retailer_id: rowInput.retailer_id };
  const { data, error } = await supabase.from("promotions").insert(insertPayload).select("id").single();
  if (error) throw error;
  await linkBrands(data.id, promotion.brands, promotion.market);
  return data.id;
}

export async function updatePromotionRow(id: string, promotion: PromotionInput): Promise<void> {
  const rowInput = await toRowInput(promotion);
  if (!rowInput.retailer_id) {
    throw new Error(`Unknown retailer "${promotion.retailer}" for market ${promotion.market}`);
  }
  const updatePayload = { ...rowInput, retailer_id: rowInput.retailer_id };
  const { error } = await supabase.from("promotions").update(updatePayload).eq("id", id);
  if (error) throw error;
  await linkBrands(id, promotion.brands, promotion.market);
}

export async function deletePromotionRow(id: string): Promise<void> {
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw error;
}

export type ProductInput = {
  name: string;
  brand: string;
  category: string;
  retailer: string;
  market: "PL" | "CZ";
  price?: number;
  currency?: "PLN" | "CZK";
  imageUrl?: string;
  productUrl?: string;
};

export async function addProductRow(product: ProductInput): Promise<void> {
  const retailerId = await lookupRetailerId(product.retailer, product.market);
  if (!retailerId) {
    throw new Error(`Unknown retailer "${product.retailer}" for market ${product.market}`);
  }
  const brandId = await lookupOrCreateBrandId(product.brand, product.market);
  const categoryId = await lookupCategoryId(product.category);

  const { error } = await supabase.from("products").insert({
    id: crypto.randomUUID(),
    retailer_id: retailerId,
    market: product.market,
    brand_id: brandId,
    category_id: categoryId,
    name: product.name,
    price: product.price ?? null,
    currency: product.currency ?? null,
    image_url: product.imageUrl ?? null,
    product_url: product.productUrl ?? null,
    source: "manual",
  }).select(PRODUCT_SELECT).single();
  if (error) throw error;
}

export async function addBrandRow(name: string, market: "PL" | "CZ"): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("brands")
    .insert({ id: crypto.randomUUID(), name: trimmed, market })
    .select("id, name, market")
    .maybeSingle();
  // Duplicate brand names are expected (unique constraint) — not a real error.
  if (error && error.code !== "23505") throw error;
}

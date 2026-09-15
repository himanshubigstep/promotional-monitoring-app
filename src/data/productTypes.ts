export type PromotionType =
  | "Fixed promotion"
  | "Buy one get one free"
  | "Custom";

// Widened from the original 4 to match what's actually in the database's
// categories table (products.json always had Body Care/Tools rows too —
// this was a known, tracked mismatch, see Decisions.md).
export type ProductCategory =
  | "Skincare"
  | "Fragrance"
  | "Makeup"
  | "Haircare"
  | "Body Care"
  | "Tools";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  currency: "PLN" | "CZK";
  market: "PL" | "CZ";
  retailer: string;
  rating: number;
  stock: number;
  competitorDiscount: number;
  image: string;
  fromDate: string;
  toDate: string;
  promotionName: string;
  description: string;
  promotionDescription: string;
  terms: string;
  priceAfterDiscount: number;
  promoPrice?: number;
  promotionType?: PromotionType;
  // True when the row's retailer is the client (retailers.is_client in the
  // DB) — replaces the old "(Your brand)" text-matching heuristic some
  // code used to guess this.
  isClient?: boolean;
};

// A real catalog entry — "this store carries this product" — independent of
// any promotion (see the `products` table, supabase/migrations/0006_products.sql).
// Distinct from `Product` above, which is actually a promotion viewed as a
// product (one entry per campaign, not per store listing). Populated by the
// scraper's catalog crawl (scraper/src/scrapeProducts.ts) or added manually.
export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory | "";
  retailer: string;
  market: "PL" | "CZ";
  price: number | null;
  currency: "PLN" | "CZK" | null;
  imageUrl: string | null;
  productUrl: string | null;
  isClient?: boolean;
};

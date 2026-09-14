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

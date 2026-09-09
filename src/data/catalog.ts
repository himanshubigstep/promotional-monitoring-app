import products from "./products.json";
import { czDummyRetailers, normalizeRetailer } from "./retailers";
import type { Product } from "./productTypes";

const czDemoImage =
  "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80";

const czDemoProducts: Product[] = czDummyRetailers.map((retailer, index) => ({
  id: `CZ-DEMO-${String(index + 1).padStart(3, "0")}`,
  name: `CZ demo promotion ${index + 1}`,
  brand: "",
  category: "Skincare",
  price: 0,
  currency: "CZK",
  market: "CZ",
  retailer,
  rating: 0,
  stock: 0,
  competitorDiscount: [15, 20, 25][index],
  image: czDemoImage,
  fromDate: "2026-09-01",
  toDate: "2026-09-30",
  promotionName: `CZ demo promotion ${index + 1}`,
  description: "Placeholder record for the CZ market until client data is available.",
  promotionDescription: "Demo data only. Not a real retailer promotion.",
  terms: "Demo data only.",
  priceAfterDiscount: 0,
}));

export const catalog: Product[] = [
  ...(products as Product[]).map((product) => ({
    ...product,
    retailer: normalizeRetailer(product.retailer),
  })),
  ...czDemoProducts,
];

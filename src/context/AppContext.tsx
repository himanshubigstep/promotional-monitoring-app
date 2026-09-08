import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import products from "../data/products.json";
import type { Product } from "../data/productTypes";

export type UserRole = "Admin" | "Data Analytics" | "Viewer";

export type PromotionFilters = {
  category: string;
  fromDate: string;
  toDate: string;
  discount: string;
  retailer: string;
  market: string;
};

export const emptyPromotionFilters: PromotionFilters = {
  category: "All",
  fromDate: "",
  toDate: "",
  discount: "All",
  retailer: "All",
  market: "All",
};

export const filterYears = ["2024", "2025", "2026", "2027"];
export const filterMonths = [
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
] as const;

export function getMonthFilterValue(date: string) {
  return date ? date.slice(0, 7) : "";
}

export function getYearFilterValue(date: string) {
  return date ? date.slice(0, 4) : "";
}

export function getMonthFilterParts(value: string) {
  return value ? value.split("-") : ["", ""];
}

export function getMonthEnd(value: string) {
  if (!value) return "";
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

export type Promotion = {
  id: string;
  market: "PL" | "CZ";
  name: string;
  from: string;
  to: string;
  scope: string;
  channel: string;
  category: string;
  brands: string[];
  retailer: string;
  discount: string;
  threshold: string;
  skuCount: number;
  notes: string;
  creativeName: string;
  creativeData?: string;
  averageMarketDiscount: string;
  createdAt: string;
};

type AppContextValue = {
  role: UserRole;
  setRole: (role: UserRole) => void;
  promotions: Promotion[];
  products: Product[];
  lastAddedProduct: Product | null;
  addPromotion: (promotion: Omit<Promotion, "id" | "createdAt">) => void;
  canEdit: boolean;
  filters: PromotionFilters;
  setFilters: (filters: PromotionFilters) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function promotionsFromProducts(): Promotion[] {
  return (products as Product[])
    .filter((product) => product.market === "PL" || product.market === "CZ")
    .map((product) => ({
      id: product.id,
      market: product.market,
      name: product.promotionName,
      from: product.fromDate,
      to: product.toDate,
      scope: "Wielokanałowa",
      channel: "Sklep stacjonarny",
      category: product.category,
      brands: [product.brand],
      retailer: product.retailer,
      discount: `-${product.competitorDiscount}%`,
      threshold: "",
      skuCount: 1,
      notes: product.terms,
      creativeName: "",
      creativeData: undefined,
      averageMarketDiscount: `${product.competitorDiscount}%`,
      createdAt: product.fromDate,
    }));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("Admin");
  const [promotions, setPromotions] = useState<Promotion[]>(
    promotionsFromProducts,
  );
  const [addedProducts, setAddedProducts] = useState<Product[]>([]);
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<PromotionFilters>(
    emptyPromotionFilters,
  );

  const addPromotion = useCallback(
    (promotion: Omit<Promotion, "id" | "createdAt">) => {
      const next = {
        ...promotion,
        id: `PROMO-${String(promotions.length + 1).padStart(3, "0")}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const updated = [next, ...promotions];
      setPromotions(updated);
      const discountMatch = promotion.discount.match(/(\d+(?:\.\d+)?)/);
      const discount = discountMatch ? Number(discountMatch[1]) : 0;
      const categoryMap: Record<string, Product["category"]> = {
        Pielęgnacja: "Skincare",
        Perfumy: "Fragrance",
        Makijaż: "Makeup",
        Włosy: "Haircare",
      };
      const product: Product = {
        id: next.id,
        name: next.name,
        brand: next.brands[0] || "",
        category: categoryMap[next.category] || (next.category as Product["category"]),
        price: 0,
        currency: "PLN",
        market: next.market,
        retailer: next.retailer,
        rating: 0,
        stock: next.skuCount,
        competitorDiscount: discount,
        image: promotion.creativeData || "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80",
        fromDate: next.from,
        toDate: next.to,
        promotionName: next.name,
        description: next.notes,
        promotionDescription: next.notes,
        terms: next.notes,
        priceAfterDiscount: 0,
      };
      const updatedProducts = [product, ...addedProducts];
      setAddedProducts(updatedProducts);
      setLastAddedProduct(product);
    },
    [promotions, addedProducts],
  );

  const value = useMemo(
    () => ({
      role,
      setRole,
      promotions,
      products: [...addedProducts, ...(products as Product[])],
      lastAddedProduct,
      addPromotion,
      canEdit: role !== "Viewer",
      filters,
      setFilters,
    }),
    [role, promotions, addedProducts, lastAddedProduct, addPromotion, filters],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
}

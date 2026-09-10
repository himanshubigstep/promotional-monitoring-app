import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { catalog } from "../data/catalog";
import { czDummyBrands, sephoraBrands } from "../data/brands";
import type { Product, PromotionType } from "../data/productTypes";

export type UserRole = "Admin" | "Data Analytics" | "Viewer";

export type PromotionFilters = {
  search: string;
  category: string;
  fromDate: string;
  toDate: string;
  discount: string;
  retailer: string;
  market: string;
};

export const emptyPromotionFilters: PromotionFilters = {
  search: "",
  category: "All",
  fromDate: "",
  toDate: "",
  discount: "All",
  retailer: "All",
  market: "All",
};

export const filterYears = Array.from(
  new Set(
    catalog.flatMap((product) => [
      product.fromDate.slice(0, 4),
      product.toDate.slice(0, 4),
    ]),
  ),
).sort();
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
  brands: string;
  retailer: string;
  discount: string;
  threshold: string;
  promoPrice: string;
  promotionType: PromotionType;
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
  productsList: Product[];
  brands: string[];
  brandsByMarket: Record<"PL" | "CZ", string[]>;
  lastAddedProduct: Product | null;
  addPromotion: (promotion: Omit<Promotion, "id" | "createdAt">) => void;
  addBrand: (brand: string, market?: "PL" | "CZ") => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  canEdit: boolean;
  filters: PromotionFilters;
  setFilters: (filters: PromotionFilters) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function promotionsFromProducts(): Promotion[] {
  return catalog
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
      brands: product.brand,
      retailer: product.retailer,
      discount: `-${product.competitorDiscount}%`,
      threshold: "",
      promoPrice: product.priceAfterDiscount ? String(product.priceAfterDiscount) : "",
      promotionType: product.promotionType || "Fixed promotion",
      skuCount: 1,
      notes: product.terms,
      creativeName: "",
      creativeData: undefined,
      averageMarketDiscount: `${product.competitorDiscount}%`,
      createdAt: product.fromDate,
    }));
}

const englishPromotionValues: Record<string, string> = {
  Pielęgnacja: "Skincare",
  Perfumy: "Fragrance",
  Makijaż: "Makeup",
  Włosy: "Haircare",
  Wielokanałowa: "Omnichannel",
  "Tylko e-commerce": "E-commerce only",
  "Tylko aplikacja mobilna": "Mobile app only",
  "Media społecznościowe": "Social media",
  "Strona internetowa": "Website",
  Telewizja: "TV",
  "E-mail": "Email",
  "Sklep stacjonarny": "In-store",
  "Aplikacja mobilna": "Mobile app",
};

function toEnglish(value: string) {
  return englishPromotionValues[value] || value;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("Admin");
  const [promotions, setPromotions] = useState<Promotion[]>(
    promotionsFromProducts,
  );
  const [brandsByMarket, setBrandsByMarket] = useState<
    Record<"PL" | "CZ", string[]>
  >({
    PL: [...sephoraBrands],
    CZ: [...czDummyBrands],
  });
  const brands = brandsByMarket.PL;
  const [productsList, setProductsList] = useState<Product[]>(catalog);
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(
    null,
  );
  const [filters, setFilters] = useState<PromotionFilters>(
    emptyPromotionFilters,
  );

  const addBrand = useCallback((brand: string, market: "PL" | "CZ" = "PL") => {
    const normalizedBrand = brand.trim();
    if (!normalizedBrand) return;

    setBrandsByMarket((current) => {
      const nextList = current[market] ?? [];
      if (
        nextList.some(
          (item) => item.toLowerCase() === normalizedBrand.toLowerCase(),
        )
      ) {
        return current;
      }

      return {
        ...current,
        [market]: [...nextList, normalizedBrand],
      };
    });
  }, []);

  const addProduct = useCallback((product: Product) => {
    setProductsList((current) => {
      const isDuplicate = current.some(
        (item) =>
          item.id === product.id ||
          (item.name.toLowerCase() === product.name.toLowerCase() &&
            item.brand.toLowerCase() === product.brand.toLowerCase()),
      );

      return isDuplicate ? current : [product, ...current];
    });
  }, []);

  const addPromotion = useCallback(
    (promotion: Omit<Promotion, "id" | "createdAt">) => {
      const normalizedPromotion = {
        ...promotion,
        category: toEnglish(promotion.category),
        scope: toEnglish(promotion.scope),
        channel: toEnglish(promotion.channel),
      };
      const next = {
        ...normalizedPromotion,
        id: `PROMO-${String(promotions.length + 1).padStart(3, "0")}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const updated = [next, ...promotions];
      setPromotions(updated);
      const discountMatch =
        normalizedPromotion.discount.match(/(\d+(?:\.\d+)?)/);
      const discount = discountMatch ? Number(discountMatch[1]) : 0;
      const categoryMap: Record<string, Product["category"]> = {
        Pielęgnacja: "Skincare",
        Perfumy: "Fragrance",
        Makijaż: "Makeup",
        Włosy: "Haircare",
      };
      const promoPriceValue = Number(next.promoPrice || 0);
      const product: Product = {
        id: next.id,
        name: next.name,
        brand: next.brands || "",
        category:
          categoryMap[next.category] || (next.category as Product["category"]),
        price: promoPriceValue > 0 ? promoPriceValue : 0,
        currency: next.market === "CZ" ? "CZK" : "PLN",
        market: next.market,
        retailer: next.retailer,
        rating: 0,
        stock: next.skuCount,
        competitorDiscount: next.promotionType === "Buy one get one free" ? 100 : discount,
        image:
          promotion.creativeData ||
          "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80",
        fromDate: next.from,
        toDate: next.to,
        promotionName: next.name,
        description: next.notes,
        promotionDescription: next.notes,
        terms: next.notes,
        priceAfterDiscount: promoPriceValue > 0 ? promoPriceValue : 0,
        promoPrice: promoPriceValue > 0 ? promoPriceValue : undefined,
        promotionType: next.promotionType,
      };
      setProductsList((current) => {
        const exists = current.some(
          (item) =>
            item.id === product.id ||
            (item.name.toLowerCase() === product.name.toLowerCase() &&
              item.brand.toLowerCase() === product.brand.toLowerCase()),
        );

        return exists ? current : [product, ...current];
      });
      setLastAddedProduct(product);
    },
    [promotions],
  );

  const deleteProduct = useCallback((id: string) => {
    setProductsList((current) => current.filter((item) => item.id !== id));
    setPromotions((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      role,
      setRole,
      promotions,
      products: productsList,
      productsList,
      brands,
      brandsByMarket,
      lastAddedProduct,
      addPromotion,
      addBrand,
      addProduct,
      deleteProduct,
      canEdit: role !== "Viewer",
      filters,
      setFilters,
    }),
    [
      role,
      promotions,
      productsList,
      brands,
      brandsByMarket,
      lastAddedProduct,
      addPromotion,
      addBrand,
      addProduct,
      deleteProduct,
      filters,
    ],
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

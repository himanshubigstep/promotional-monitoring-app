import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { czDummyBrands, sephoraBrands } from "../data/brands";
import { czDummyRetailers, plRetailers } from "../data/retailers";
import {
  czProducts as initialCzProducts,
  plProducts as initialPlProducts,
} from "../data/marketProducts";
import type { CatalogProduct, Product, PromotionType } from "../data/productTypes";
import {
  addBrandRow,
  addProductRow,
  deletePromotionRow,
  insertPromotion,
  loadApprovedData,
  updatePromotionRow,
  type CategoryOption,
  type ProductInput,
  type RetailerOption,
} from "../lib/promotionsData";

// Real editor/analyst role from the profiles table for the signed-in user —
// null when nobody is signed in (the app still works read-only as anon in
// that case; see AUTH_LOGIN_PLAN.md for why login doesn't gate the whole app).
export type AuthRole = "editor" | "analyst" | null;

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

export function matchesPromotionFilters(
  product: Product,
  filters: PromotionFilters,
) {
  const minimumDiscount =
    filters.discount === "All"
      ? 0
      : Number(filters.discount.replace("%+", ""));
  const search = filters.search.trim().toLowerCase();

  return (
    (!search ||
      product.name.toLowerCase().includes(search) ||
      product.brand.toLowerCase().includes(search)) &&
    (filters.category === "All" || product.category === filters.category) &&
    (filters.market === "All" || product.market === filters.market) &&
    (filters.retailer === "All" || product.retailer === filters.retailer) &&
    product.competitorDiscount >= minimumDiscount &&
    (!filters.fromDate || product.toDate >= filters.fromDate) &&
    (!filters.toDate || product.fromDate <= filters.toDate)
  );
}

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
  // True when the row's retailer is the client (retailers.is_client) —
  // replaces the old "(Your brand)" text-matching heuristic.
  isClient?: boolean;
};

type AppContextValue = {
  user: User | null;
  authRole: AuthRole;
  authLoading: boolean;
  signOut: () => Promise<void>;
  promotions: Promotion[];
  products: Product[];
  productsList: Product[];
  // The real store catalog — "this retailer carries this product" —
  // independent of promotions. See supabase/migrations/0006_products.sql
  // and CatalogProduct in data/productTypes.ts.
  productCatalog: CatalogProduct[];
  brands: string[];
  brandsByMarket: Record<"PL" | "CZ", string[]>;
  retailers: RetailerOption[];
  categories: CategoryOption[];
  lastAddedProduct: Product | null;
  addPromotion: (promotion: Omit<Promotion, "id" | "createdAt">) => Promise<void>;
  updatePromotion: (id: string, promotion: Omit<Promotion, "id" | "createdAt">) => Promise<void>;
  addBrand: (brand: string, market?: "PL" | "CZ") => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  addCatalogProduct: (product: ProductInput) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  canEdit: boolean;
  filters: PromotionFilters;
  setFilters: (filters: PromotionFilters) => void;
  loading: boolean;
  usingFallbackData: boolean;
  showToast: (message: string, severity?: "success" | "error") => void;
  toast: { message: string; severity: "success" | "error" } | null;
  clearToast: () => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Used only when Supabase is unreachable at load — see the useEffect below.
// Static files are deliberately kept (not deleted) for exactly this path.
function promotionsFromProducts(products: Product[]): Promotion[] {
  return products
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

// Used only when Supabase is unreachable at load — same reasoning as
// promotionsFromProducts above. Dedupes by name+retailer since the static
// catalog has one entry per historical promotion, not per store listing.
function catalogFromProducts(products: Product[]): CatalogProduct[] {
  const seen = new Set<string>();
  const catalog: CatalogProduct[] = [];
  for (const product of products) {
    const key = `${product.name}|${product.retailer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    catalog.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      retailer: product.retailer,
      market: product.market,
      price: product.price ?? null,
      currency: product.currency ?? null,
      imageUrl: product.image ?? null,
      productUrl: null,
      isClient: product.isClient,
    });
  }
  return catalog;
}

function staticRetailerOptions(): RetailerOption[] {
  return [
    ...plRetailers.map((name) => ({
      id: name,
      name,
      market: "PL" as const,
      isClient: name === "sephora",
    })),
    ...czDummyRetailers.map((name) => ({
      id: name,
      name,
      market: "CZ" as const,
      isClient: false,
    })),
  ];
}

function staticCategoryOptions(): CategoryOption[] {
  return ["Skincare", "Fragrance", "Makeup", "Haircare", "Body Care", "Tools"].map((name) => ({
    id: name,
    name,
  }));
}

const englishPromotionValues: Record<string, string> = {
  Pielęgnacja: "Skincare",
  Perfumy: "Fragrance",
  Makijaż: "Makeup",
  Włosy: "Haircare",
  "Pielęgnacja ciała": "Body Care",
  Akcesoria: "Tools",
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
  const [user, setUser] = useState<User | null>(null);
  const [authRole, setAuthRole] = useState<AuthRole>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCatalog, setProductCatalog] = useState<CatalogProduct[]>([]);
  const [brandsByMarket, setBrandsByMarket] = useState<Record<"PL" | "CZ", string[]>>({
    PL: [],
    CZ: [],
  });
  const [retailers, setRetailers] = useState<RetailerOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const brands = brandsByMarket.PL;
  const [lastAddedProductId, setLastAddedProductId] = useState<string | null>(null);
  const [filters, setFilters] = useState<PromotionFilters>(emptyPromotionFilters);
  const [loading, setLoading] = useState(true);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const showToast = useCallback(
    (message: string, severity: "success" | "error" = "success") => {
      setToast({ message, severity });
    },
    [],
  );
  const clearToast = useCallback(() => setToast(null), []);
  const lastAddedProduct = useMemo(
    () => products.find((product) => product.id === lastAddedProductId) ?? null,
    [products, lastAddedProductId],
  );

  const refresh = useCallback(async () => {
    const data = await loadApprovedData();
    setPromotions(data.promotions);
    setProducts(data.products);
    setProductCatalog(data.productCatalog);
    setBrandsByMarket(data.brandsByMarket);
    setRetailers(data.retailers);
    setCategories(data.categories);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await loadApprovedData();
        if (cancelled) return;
        setPromotions(data.promotions);
        setProducts(data.products);
        setProductCatalog(data.productCatalog);
        setBrandsByMarket(data.brandsByMarket);
        setRetailers(data.retailers);
        setCategories(data.categories);
        setUsingFallbackData(false);
      } catch (err) {
        console.warn("Falling back to static data - Supabase fetch failed:", err);
        if (cancelled) return;
        const fallbackProducts = [...initialPlProducts, ...initialCzProducts];
        setPromotions(promotionsFromProducts(fallbackProducts));
        setProducts(fallbackProducts);
        setProductCatalog(catalogFromProducts(fallbackProducts));
        setBrandsByMarket({ PL: [...sephoraBrands], CZ: [...czDummyBrands] });
        setRetailers(staticRetailerOptions());
        setCategories(staticCategoryOptions());
        setUsingFallbackData(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Real Supabase auth session — separate from the data-loading effect
  // above, which runs regardless of whether anyone is signed in (anon reads
  // stay working either way, per AUTH_LOGIN_PLAN.md / CLAUDE.md). This only
  // adds real editor/analyst capability on top when a session exists.
  useEffect(() => {
    let cancelled = false;

    async function loadRoleFor(session: Session | null) {
      if (!session?.user) {
        if (!cancelled) setAuthRole(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("Failed to load profile role for signed-in user:", error);
        setAuthRole(null);
        return;
      }
      // profiles.role defaults to 'analyst' at the DB level for new signups;
      // mirror that default here rather than treating a missing row as "no role".
      setAuthRole((data?.role as "editor" | "analyst" | undefined) ?? "analyst");
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      loadRoleFor(data.session).finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        loadRoleFor(session);
      },
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const assertWritable = useCallback(() => {
    if (usingFallbackData) {
      throw new Error(
        "Can't save right now - the database is unreachable and the app is showing offline data.",
      );
    }
  }, [usingFallbackData]);

  const addBrand = useCallback(
    async (brand: string, market: "PL" | "CZ" = "PL") => {
      assertWritable();
      await addBrandRow(brand, market);
      await refresh();
    },
    [refresh, assertWritable],
  );

  const addPromotion = useCallback(
    async (promotion: Omit<Promotion, "id" | "createdAt">) => {
      assertWritable();
      const normalizedPromotion = {
        ...promotion,
        category: toEnglish(promotion.category),
        scope: toEnglish(promotion.scope),
        channel: toEnglish(promotion.channel),
      };
      const newId = await insertPromotion(normalizedPromotion);
      await refresh();
      setLastAddedProductId(newId);
    },
    [refresh, assertWritable],
  );

  const updatePromotion = useCallback(
    async (id: string, promotion: Omit<Promotion, "id" | "createdAt">) => {
      assertWritable();
      const normalizedPromotion = {
        ...promotion,
        category: toEnglish(promotion.category),
        scope: toEnglish(promotion.scope),
        channel: toEnglish(promotion.channel),
      };
      await updatePromotionRow(id, normalizedPromotion);
      await refresh();
    },
    [refresh, assertWritable],
  );

  // Product and Promotion are the same underlying row (the earlier split
  // between a static "catalog" and a separately-tracked "productsList" is
  // gone — see Decisions.md). addProduct exists for the bulk-upload flow,
  // which builds a Product directly rather than going through the form.
  const addProduct = useCallback(
    async (product: Product) => {
      assertWritable();
      const promotionInput: Omit<Promotion, "id" | "createdAt"> = {
        market: product.market,
        name: product.promotionName || product.name,
        from: product.fromDate,
        to: product.toDate,
        scope: "Omnichannel",
        channel: "In-store",
        category: product.category,
        brands: product.brand,
        retailer: product.retailer,
        discount: product.competitorDiscount ? `-${product.competitorDiscount}%` : "",
        threshold: "",
        promoPrice: product.priceAfterDiscount ? String(product.priceAfterDiscount) : "",
        promotionType: product.promotionType || "Fixed promotion",
        skuCount: product.stock || 1,
        notes: product.terms || product.description || "",
        creativeName: "",
        creativeData: undefined,
        averageMarketDiscount: "",
      };
      const newId = await insertPromotion(promotionInput);
      await refresh();
      setLastAddedProductId(newId);
    },
    [refresh, assertWritable],
  );

  const addCatalogProduct = useCallback(
    async (product: ProductInput) => {
      assertWritable();
      await addProductRow(product);
      await refresh();
    },
    [refresh, assertWritable],
  );

  const deletePromotion = useCallback(
    async (id: string) => {
      assertWritable();
      await deletePromotionRow(id);
      await refresh();
    },
    [refresh, assertWritable],
  );

  // Same underlying row as deletePromotion now — kept as a separate name
  // only because existing pages call both.
  const deleteProduct = deletePromotion;

  const value = useMemo(
    () => ({
      user,
      authRole,
      authLoading,
      signOut,
      promotions,
      products,
      productsList: products,
      productCatalog,
      brands,
      brandsByMarket,
      retailers,
      categories,
      lastAddedProduct,
      addPromotion,
      updatePromotion,
      addBrand,
      addProduct,
      addCatalogProduct,
      deleteProduct,
      deletePromotion,
      canEdit: authRole === "editor",
      filters,
      setFilters,
      loading,
      usingFallbackData,
      showToast,
      toast,
      clearToast,
    }),
    [
      user,
      authRole,
      authLoading,
      signOut,
      promotions,
      products,
      productCatalog,
      brands,
      brandsByMarket,
      retailers,
      categories,
      lastAddedProduct,
      addPromotion,
      updatePromotion,
      addBrand,
      addProduct,
      addCatalogProduct,
      deleteProduct,
      deletePromotion,
      filters,
      loading,
      usingFallbackData,
      showToast,
      toast,
      clearToast,
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

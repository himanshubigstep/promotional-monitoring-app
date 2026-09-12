import type { AppNavigation } from "../data/navigation";

// A single row of a table/comparison result. Kept as primitives so the value
// can be shown as-is and also serialized back to Gemini as grounding data.
export type CellValue = string | number | null;

export type ProductCardItem = {
  id: string;
  name: string;
  brand: string;
  retailer: string;
  category: string;
  market: string;
  price: number | null;
  currency: string;
  priceAfterDiscount: number | null;
  discount: number | null;
  rating: number | null;
  image: string | null;
  promotionName: string | null;
  fromDate: string | null;
  toDate: string | null;
  source: "ours" | "competitor";
};

export type PromotionCardItem = {
  id: string;
  name: string;
  brand: string;
  retailer: string;
  category: string;
  market: string;
  discount: string;
  from: string;
  to: string;
  notes: string;
};

// Discriminated union of everything a tool can hand back to the UI. The
// assistant renders these directly instead of asking the model to format
// tables/JSON as text, so numbers on screen always come from real data.
export type AssistantResult =
  | { type: "text"; title?: string; text: string }
  | { type: "navigation"; title: string; items: AppNavigation[] }
  | {
      type: "table";
      title: string;
      columns: string[];
      rows: CellValue[][];
      caption?: string;
    }
  | {
      type: "comparison_table";
      title: string;
      columns: string[];
      rows: CellValue[][];
      caption?: string;
    }
  | { type: "product_cards"; title: string; items: ProductCardItem[]; caption?: string }
  | { type: "promotion_cards"; title: string; items: PromotionCardItem[]; caption?: string }
  | {
      type: "summary";
      title: string;
      stats: { label: string; value: string }[];
      caption?: string;
    }
  | { type: "error"; message: string };

// What a tool implementation returns internally: the renderable result plus a
// compact, JSON-safe summary that gets fed back to Gemini as the
// functionResponse payload so its final text reply stays grounded in the same
// numbers shown on screen.
export type ToolExecutionResult = {
  result: AssistantResult;
  summaryForModel: unknown;
};

export type AssistantToolName =
  | "get_navigation"
  | "search_stores"
  | "search_brands"
  | "search_products"
  | "search_promotions"
  | "compare_products"
  | "compare_brands"
  | "compare_stores"
  | "get_recent_promotions";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  result?: AssistantResult;
  toolName?: AssistantToolName;
  isError?: boolean;
};

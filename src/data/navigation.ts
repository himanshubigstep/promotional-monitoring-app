// Structured description of the application's real routes/features.
// Kept in sync manually with the routes declared in src/App.tsx.
// The AI assistant queries this list instead of guessing pages that don't exist.

export type AppNavigation = {
  name: string;
  route: string;
  description: string;
  capabilities: string[];
  keywords: string[];
};

export const appNavigation: AppNavigation[] = [
  {
    name: "Dashboard",
    route: "/",
    description:
      "Home screen with a greeting, catalog overview, and quick actions for adding promotions, brands, and products (bulk import included).",
    capabilities: [
      "View a summary of tracked products and promotions",
      "Add a new promotion (single or bulk via Excel/CSV template)",
      "Add new brands or products",
      "Edit or delete existing promotions/products",
      "Search and paginate the product catalog",
    ],
    keywords: ["home", "start", "overview", "add promotion", "bulk upload", "import"],
  },
  {
    name: "Promotional calendar",
    route: "/calendar",
    description:
      "Calendar view of when promotions start and end, useful for planning campaigns across months.",
    capabilities: [
      "See promotions laid out by date",
      "Spot overlapping or upcoming campaigns",
    ],
    keywords: ["calendar", "schedule", "dates", "campaign planning", "when"],
  },
  {
    name: "Promotions",
    route: "/promotions",
    description:
      "Full list of tracked promotions across retailers, with filters for market, category, retailer, discount, and dates.",
    capabilities: [
      "Browse all current and past promotions",
      "Filter promotions by brand, retailer, category, market, or discount",
      "Open a product's detail page from a promotion row",
    ],
    keywords: ["promotions", "promo", "deals", "discounts", "offers", "all promotions"],
  },
  {
    name: "Product detail",
    route: "/products/:productId",
    description:
      "Detail page for a single product showing its image, price, competitor discount, and promotion terms.",
    capabilities: ["View full details for one product/promotion"],
    keywords: ["product detail", "single product"],
  },
  {
    name: "Brand analytics",
    route: "/analytics",
    description:
      "Analytics dashboards for a brand: pricing trends, discount trends, and performance across retailers.",
    capabilities: [
      "See analytics/charts for a specific brand",
      "Compare brand performance across time",
    ],
    keywords: ["analytics", "brand analytics", "charts", "trends", "performance", "insights"],
  },
  {
    name: "Store comparison",
    route: "/stores",
    description:
      "Side-by-side comparison of retailers' discounts versus our own, including campaign dates, status, and discount trend.",
    capabilities: [
      "Compare two or more stores/retailers",
      "See which retailer currently has the best discount",
      "See active vs expired retailer campaigns",
    ],
    keywords: ["compare stores", "store comparison", "retailers", "competitors", "vs"],
  },
];

export function findNavigation(query: string): AppNavigation[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return appNavigation;
  return appNavigation.filter((item) =>
    [item.name, item.description, ...item.capabilities, ...item.keywords]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

// Compact text block injected into the assistant's system instructions so it
// always has grounded knowledge of real routes without needing a tool call.
export const navigationSummaryForPrompt = appNavigation
  .map(
    (item) =>
      `- ${item.name} (${item.route}): ${item.description} Capabilities: ${item.capabilities.join(
        "; ",
      )}.`,
  )
  .join("\n");

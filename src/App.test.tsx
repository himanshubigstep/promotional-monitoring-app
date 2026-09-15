import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import FormField from "./components/FormField";
import { getPromotionTypeFieldConfig } from "./components/PromotionFormModal";
import { getMarketBrandOptions } from "./data/brands";
import { getMarketRetailers } from "./data/retailers";
import { getMarketProducts } from "./data/marketProducts";
import { upsertProductInMarket } from "./data/marketProducts";
import { supabase } from "./lib/supabaseClient";

// Bulk upload is editor-gated (canEdit derives from the real signed-in
// user's profiles.role now, not a locally-toggleable fake role) — simulate
// a signed-in editor for this one test so the button is reachable, without
// disturbing .env.test's deliberate unreachable-URL fallback-data behavior
// for every other table/test. Restored after each test.
function mockSignedInEditor() {
  const realFrom = supabase.from.bind(supabase);
  jest.spyOn(supabase.auth, "getSession").mockResolvedValue({
    data: {
      session: {
        user: { id: "test-editor-id", email: "editor@test.local" },
      } as any,
    },
    error: null,
  } as any);
  jest.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
    data: { subscription: { unsubscribe: () => undefined } },
  } as any);
  jest.spyOn(supabase, "from").mockImplementation((table: any) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { role: "editor" }, error: null }),
          }),
        }),
      } as any;
    }
    return realFrom(table);
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

test("renders the Sephora Promotional Monitoring dashboard", () => {
  render(<App />);
  expect(screen.getAllByText(/SEPHORA/i).length).toBeGreaterThan(0);
});

test("renders a label action for adding a new option", () => {
  render(
    <FormField
      type="select"
      label="Brand"
      value=""
      onValueChange={() => undefined}
      options={[{ label: "Brand A", value: "brand-a" }]}
      labelAction={{ label: "Add brand", onClick: () => undefined }}
    />,
  );

  expect(screen.getByRole("button", { name: "Add brand" })).toBeInTheDocument();
});

test("bulk upload modal omits store selection from rows and templates", async () => {
  mockSignedInEditor();
  render(<App />);

  fireEvent.click(
    await screen.findByRole("button", { name: /bulk upload brands/i }),
  );

  expect(
    screen.queryByText(/store name|nazwa sklepu|název obchodu/i),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText(/brand name \| title|nazwa marki \| tytuł|název značky \| název/i),
  ).not.toBeInTheDocument();
});

test("stores a created product in the correct market product list", () => {
  const baseProduct = {
    id: "PL-BULK-TEST-001",
    name: "Test product",
    brand: "Rare Beauty",
    category: "Makeup" as const,
    price: 120,
    currency: "PLN" as const,
    market: "PL" as const,
    retailer: "Douglas",
    rating: 4.5,
    stock: 5,
    competitorDiscount: 10,
    image: "https://example.com/image.jpg",
    fromDate: "2026-09-01",
    toDate: "2026-09-30",
    promotionName: "Test product",
    description: "PL test",
    promotionDescription: "PL test",
    terms: "Demo",
    priceAfterDiscount: 108,
    promotionType: "Fixed promotion" as const,
  };

  const result = upsertProductInMarket("PL", baseProduct, [
    {
      ...baseProduct,
      id: "PL-EXISTING-001",
      name: "Existing product",
    },
  ]);

  expect(result[0].id).toBe("PL-BULK-TEST-001");
  expect(result[0].market).toBe("PL");
});

test("scopes retailer and brand options to the selected market", () => {
  expect(getMarketRetailers("PL")).toEqual([
    "Douglas",
    "Notino",
    "superpharm",
    "hebe",
    "drogerienatura",
    "flaconi",
    "sephora",
  ]);

  expect(getMarketRetailers("CZ")).toEqual([
    "CZ Demo Store Prague",
    "CZ Demo Store Brno",
    "CZ Demo Store Ostrava",
  ]);

  expect(getMarketBrandOptions("PL")).toContain("Sephora Collection");
  expect(getMarketBrandOptions("PL")).not.toContain("CZ Demo Brand Prague");
  expect(getMarketBrandOptions("CZ")).toContain("CZ Demo Brand Prague");
  expect(getMarketBrandOptions("CZ")).not.toContain("Sephora Collection");
});

test("creates one offer for every Polish retailer per product", () => {
  const productsByName = new Map<string, ReturnType<typeof getMarketProducts>>();

  getMarketProducts("PL")
    .filter((product) => !product.id.includes("BULK-"))
    .forEach((product) => {
    const key = `${product.brand}::${product.name}`;
    productsByName.set(key, [...(productsByName.get(key) ?? []), product]);
    });

  productsByName.forEach((offers) => {
    expect(new Set(offers.map((product) => product.retailer))).toEqual(
      new Set(getMarketRetailers("PL")),
    );
    expect(offers).toHaveLength(getMarketRetailers("PL").length);
  });
});

test("applies the correct field rules for each promotion type by market", () => {
  expect(getPromotionTypeFieldConfig("PL", "Fixed promotion")).toMatchObject({
    showDiscount: true,
    showThreshold: true,
    showPromoPrice: true,
    requiredFields: {
      discount: true,
      threshold: true,
      promoPrice: true,
    },
    currency: "PLN",
  });

  expect(getPromotionTypeFieldConfig("CZ", "Fixed promotion")).toMatchObject({
    currency: "CZK",
    requiredFields: {
      discount: true,
      threshold: true,
      promoPrice: true,
    },
  });

  expect(getPromotionTypeFieldConfig("PL", "Buy one get one free")).toMatchObject({
    showDiscount: true,
    showThreshold: false,
    showPromoPrice: false,
    requiredFields: {
      discount: false,
      threshold: false,
      promoPrice: false,
    },
  });

  expect(getPromotionTypeFieldConfig("PL", "Custom")).toMatchObject({
    showDiscount: true,
    showThreshold: true,
    showPromoPrice: true,
    requiredFields: {
      discount: false,
      threshold: false,
      promoPrice: false,
    },
  });
});

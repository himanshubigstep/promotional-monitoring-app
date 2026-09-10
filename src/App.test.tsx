import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";
import FormField from "./components/FormField";
import { getPromotionTypeFieldConfig } from "./components/PromotionFormModal";
import { getMarketBrandOptions } from "./data/brands";
import { getMarketRetailers } from "./data/retailers";

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

import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";
import FormField from "./components/FormField";
import { getMarketBrandOptions } from "./data/brands";
import { getMarketRetailers } from "./data/retailers";

test("renders the PromoPulse dashboard", () => {
  render(<App />);
  expect(screen.getAllByText("PromoPulse").length).toBeGreaterThan(0);
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
    "Douglas.pl",
    "Notino.pl",
    "superpharm.pl",
    "hebe.pl",
    "drogerienatura.pl",
    "flaconi.pl",
    "sephora.pl (Your brand)",
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

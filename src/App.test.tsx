import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the PromoPulse dashboard", () => {
  render(<App />);
  expect(screen.getAllByText("PromoPulse").length).toBeGreaterThan(0);
  expect(screen.getByText("Active promotions")).toBeInTheDocument();
});

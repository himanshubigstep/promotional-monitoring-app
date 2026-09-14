export const plRetailers = [
  "Douglas",
  "Notino",
  "superpharm",
  "hebe",
  "drogerienatura",
  "flaconi",
  "sephora",
] as const;

export const czDummyRetailers = [
  "CZ Demo Store Prague",
  "CZ Demo Store Brno",
  "CZ Demo Store Ostrava",
] as const;

export const getMarketRetailers = (market: "PL" | "CZ" | "All") => {
  if (market === "CZ") return [...czDummyRetailers];
  if (market === "PL") return [...plRetailers];
  return [...plRetailers, ...czDummyRetailers];
};

const legacyRetailerMap: Record<string, string> = {
  "Rossmann Polska": "Douglas",
  "Hebe": "hebe",
  "Douglas Polska": "Douglas",
  "Super-Pharm": "superpharm",
  "Natura": "drogerienatura",
  "Kontigo": "flaconi",
  "Fryzjerzy": "Notino",
  "Cocolita": "sephora",
  "dm drogerie markt": "Notino",
  "Teta drogerie": "flaconi",
  "Notino CZ": "Notino",
};

export function normalizeRetailer(retailer: string) {
  if (retailer.startsWith("Sephora CZ Prague")) return "CZ Demo Store Prague";
  if (retailer.startsWith("Sephora CZ Brno")) return "CZ Demo Store Brno";
  if (
    retailer.startsWith("Sephora CZ Ostrava") ||
    retailer.startsWith("Sephora CZ Pilsen") ||
    retailer.startsWith("Sephora CZ Liberec") ||
    retailer.startsWith("Sephora CZ Olomouc") ||
    retailer.startsWith("Sephora CZ Karlovy Vary")
  ) {
    return "CZ Demo Store Ostrava";
  }
  return legacyRetailerMap[retailer] || retailer;
}

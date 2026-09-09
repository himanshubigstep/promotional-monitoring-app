export const plRetailers = [
  "Douglas.pl",
  "Notino.pl",
  "superpharm.pl",
  "hebe.pl",
  "drogerienatura.pl",
  "flaconi.pl",
  "sephora.pl (Your brand)",
] as const;

export const czDummyRetailers = [
  "CZ Demo Store Prague",
  "CZ Demo Store Brno",
  "CZ Demo Store Ostrava",
] as const;

const legacyRetailerMap: Record<string, string> = {
  "Rossmann Polska": "Douglas.pl",
  Hebe: "hebe.pl",
  "Douglas Polska": "Douglas.pl",
  "Super-Pharm": "superpharm.pl",
  Natura: "drogerienatura.pl",
  Kontigo: "flaconi.pl",
  "Fryzjerzy.pl": "Notino.pl",
  Cocolita: "sephora.pl (Your brand)",
  "dm drogerie markt": "Notino.pl",
  "Teta drogerie": "flaconi.pl",
  "Notino CZ": "Notino.pl",
};

export function normalizeRetailer(retailer: string) {
  return legacyRetailerMap[retailer] || retailer;
}

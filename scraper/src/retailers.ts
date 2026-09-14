// Target promo/sale pages per retailer, found by manual reconnaissance
// (see Decisions.md). Public pages only, no login — matches the client's
// own answer that only public data is in scope for now.
//
// Three retailers are deliberately excluded — all fall back to manual entry:
// - Hebe: serves an interactive Cloudflare Turnstile challenge.
// - Douglas, Sephora: block plain headless Playwright with a WAF "access
//   denied" (no challenge to solve, just a hard reject). Decision made to
//   treat these as blocked rather than spend time on fingerprint hardening —
//   revisit if that changes.

export type RetailerTarget = {
  name: string; // must match `retailers.name` in the DB (see supabase/seed.sql)
  market: "PL";
  url: string;
};

export const retailerTargets: RetailerTarget[] = [
  { name: "Notino", market: "PL", url: "https://www.notino.pl/aktualne-promocje/" },
  { name: "superpharm", market: "PL", url: "https://www.superpharm.pl/promocje" },
  { name: "drogerienatura", market: "PL", url: "https://drogerienatura.pl/promocje" },
  { name: "flaconi", market: "PL", url: "https://www.flaconi.pl/kategoria/sale/" },
];

// Vercel serverless function (zero-config: any file under /api is deployed
// as its own function, no vercel.json needed). Proxies a GitHub Actions
// workflow_dispatch call for scraper/../.github/workflows/scrape.yml — the
// ONLY way a browser button can trigger that workflow, since the dispatch
// endpoint requires a token that can never live in client-side JS.
//
// Not part of the CRA build: tsconfig.json's "include" is scoped to "src",
// so this file is compiled independently by Vercel's Node builder, not by
// `npm run build` / `npx tsc --noEmit` for the frontend.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const GITHUB_OWNER = "himanshubigstep";
const GITHUB_REPO = "promotional-monitoring-app";
const WORKFLOW_FILE = "scrape.yml";
const ALLOWED_RETAILERS = ["all", "Notino", "superpharm", "drogerienatura", "flaconi"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const retailer = typeof req.body?.retailer === "string" ? req.body.retailer : "all";
  if (!ALLOWED_RETAILERS.includes(retailer)) {
    return res.status(400).json({ error: `Unknown retailer "${retailer}"` });
  }

  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("trigger-scrape: missing REACT_APP_SUPABASE_URL/REACT_APP_SUPABASE_ANON_KEY");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // Deliberately the anon key, acting as the calling user (RLS-scoped), not
  // the scraper's service-role key — this only ever needs to read the
  // caller's OWN profile row to check their role (see
  // supabase/migrations/0002_auth_and_rls.sql's "profiles_select_own"
  // policy), never anyone else's data.
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "editor") {
    return res.status(403).json({ error: "Only editors can trigger a scrape" });
  }

  const pat = process.env.GITHUB_ACTIONS_PAT;
  if (!pat) {
    console.error("trigger-scrape: missing GITHUB_ACTIONS_PAT env var");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const dispatchResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: { retailer } }),
    },
  );

  if (!dispatchResponse.ok) {
    const detail = await dispatchResponse.text();
    console.error("trigger-scrape: GitHub dispatch failed", dispatchResponse.status, detail);
    return res.status(502).json({ error: "Failed to trigger the scrape workflow" });
  }

  return res.status(202).json({ triggered: true, retailer });
}

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

// Service role key bypasses RLS — this file must never be imported by the
// browser frontend, only run server-side in CI (see .github/workflows/scrape.yml).
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

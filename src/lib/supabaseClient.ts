import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in the values from `supabase status`.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Dev-only convenience until a real login screen exists: lets you sign in
// from the browser console, e.g.
//   await window.supabase.auth.signInWithPassword({ email, password })
// Never exposed in a production build.
if (process.env.NODE_ENV === "development") {
  (window as unknown as { supabase: typeof supabase }).supabase = supabase;
}

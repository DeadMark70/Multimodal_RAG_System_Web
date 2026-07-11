import { createClient } from "@supabase/supabase-js";

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist sessions across browser restarts by product policy.
    // Supabase Auth settings enforce token lifetime and refresh-token reuse protections.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

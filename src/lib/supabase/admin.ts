import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
}

/**
 * Supabase client com privilégios de service role.
 * Utilize apenas em código server-side (rotas de API, actions, scripts).
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database, "public">(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  : null;

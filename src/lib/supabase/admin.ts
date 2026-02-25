import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Server-only Supabase client with service role.
 * Use ONLY in API routes / Server Actions - never expose to client.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for admin operations");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

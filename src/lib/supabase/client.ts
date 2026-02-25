import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseKey);
  return client;
}

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

  // Use default cookie-based storage so middleware can read session on redirect.
  // Do NOT pass storage: localStorage - that breaks SSR/middleware auth.
  client = createBrowserClient<Database>(supabaseUrl, supabaseKey);
  return client;
}

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Fail fast in non-production to surface misconfiguration during development/build.
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "Supabase client not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }

    // In production, log a clear error and still throw so the UI shows a meaningful message instead of hanging.
    // eslint-disable-next-line no-console
    console.error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. Authentication will not work."
    );
    throw new Error("Authentication service is temporarily unavailable. Please contact the administrator.");
  }

  // Use default cookie-based storage so middleware can read session on redirect.
  // Do NOT pass storage: localStorage - that breaks SSR/middleware auth.
  client = createBrowserClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

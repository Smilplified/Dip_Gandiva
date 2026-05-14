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
  // Do NOT pass storage: localStorage — that breaks SSR/middleware auth.
  // Do NOT set auth.storageKey here: @supabase/ssr manages chunked cookie keys; a
  // custom key can desync the client from middleware session refresh.
  client = createBrowserClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Disable the navigator.locks-based storage serialization.
      // @supabase/auth-js v2.64+ acquires an exclusive NavigatorLock for every
      // getSession / getUser / signIn call. With cookie-based sessions (@supabase/ssr)
      // the middleware already handles token refresh server-side, so the browser
      // client does not need lock-serialized localStorage access.
      // Without this, concurrent calls during login (signInWithPassword +
      // waitForSessionConfirmation polling + onAuthStateChange + init fast-path)
      // queue up on the same exclusive lock and the 10 000 ms timeout fires,
      // causing the "Acquiring an exclusive Navigator LockManager lock timed out"
      // warning and blocking the entire auth flow.
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => fn(),
    },
  });
  return client;
}

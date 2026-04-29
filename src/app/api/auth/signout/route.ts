import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/signout
 *
 * Server-side session invalidation. Called by the client's signOut() helper
 * before it performs the local Supabase signOut and hard-redirects to /login.
 * This ensures the HttpOnly auth cookie is cleared even if the client-side
 * call fails or runs in a context where cookies can't be written from JS.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    // Best-effort — the client will still clear localStorage and reload.
    console.warn("[api/auth/signout] error:", err);
  }

  return NextResponse.json({ ok: true });
}

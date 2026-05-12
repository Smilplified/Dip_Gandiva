import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  // Invalidate the session on Supabase's server (invalidates the refresh token).
  // The @supabase/ssr server client's setAll callback writes the cleared session
  // cookies back to the Route Handler response automatically.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Server signOut failed:", err);
  }

  // Belt-and-suspenders: explicitly clear any remaining Supabase cookies by
  // name so the browser discards them even if the SSR setAll path missed any.
  const response = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );

  try {
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith("sb-") || cookie.name.includes("supabase")) {
        response.cookies.set(cookie.name, "", {
          path: "/",
          maxAge: 0,
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }
  } catch {
    // Non-fatal — the supabase.auth.signOut() above is the primary mechanism.
  }

  return response;
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Server signOut failed:", err);
  }

  const cookieStore = await cookies();
  const response = NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );

  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.includes("sb-") || cookie.name.includes("supabase")) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
      });
    }
  }

  return response;
}

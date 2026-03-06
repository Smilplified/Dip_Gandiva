import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  
  // Sign out from Supabase
  await supabase.auth.signOut();
  
  // Explicitly clear all Supabase auth cookies
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  // Clear all Supabase auth-related cookies
  allCookies.forEach((cookie) => {
    if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
      cookieStore.delete(cookie.name);
    }
  });
  
  return NextResponse.json({ success: true });
}

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

const PUBLIC_PATHS = ["/login", "/no-access"];
const ROLE_ROUTES: Record<string, string[]> = {
  "/admin": ["admin"],
  "/agent": ["agent"],
  "/tl": ["team_leader", "tl"],
  "/sales": ["sales", "admin"],
};

// Role name (normalized) -> dashboard path
const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin/dashboard",
  agent: "/agent/dashboard",
  team_leader: "/tl/dashboard",
  tl: "/tl/dashboard",
  sales: "/sales",
};

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function getRequiredRole(pathname: string): string[] | null {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) return roles;
  }
  return null;
}

function isProtectedPath(pathname: string): boolean {
  if (getRequiredRole(pathname) !== null) return true;
  // Root and legacy dashboard paths require auth
  return pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Update session (refresh tokens)
  const response = await updateSession(request);

  // 2. Public paths - allow
  if (isPublicPath(pathname)) {
    // If logged in and on /login, redirect to default dashboard
    if (pathname === "/login") {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
          cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (cookiesToSet) => {
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              );
            },
          },
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch roles to redirect to correct dashboard
          const { data: roleRows } = await supabase
            .from("user_roles")
            .select("roles(name)")
            .eq("user_id", user.id);

          const userRoleNames = (roleRows ?? [])
            .map((r: { roles: { name: string } | null }) => r.roles?.name?.toLowerCase().replace(/\s+/g, "_"))
            .filter(Boolean);

          let redirectPath = "/agent/dashboard";
          for (const r of ["admin", "team_leader", "tl", "sales", "agent"]) {
            if (userRoleNames.includes(r)) {
              redirectPath = ROLE_DASHBOARD[r] ?? redirectPath;
              break;
            }
          }

          const redirect = NextResponse.redirect(new URL(redirectPath, request.url));
          response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
          return redirect;
        }
      }
    }
    return response;
  }

  // 3. Non-protected paths (e.g. /, static) - allow
  if (!isProtectedPath(pathname)) {
    return response;
  }

  // 4. Protected path - check auth
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
    return redirect;
  }

  // 4b. Root/dashboard - redirect authenticated users to role dashboard immediately
  if (pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const userRoleNames = (roleRows ?? [])
      .map((r: { roles: { name: string } | null }) => r.roles?.name?.toLowerCase().replace(/\s+/g, "_"))
      .filter(Boolean);

    let redirectPath = "/agent/dashboard";
    for (const r of ["admin", "team_leader", "tl", "sales", "agent"]) {
      if (userRoleNames.includes(r)) {
        redirectPath = ROLE_DASHBOARD[r] ?? redirectPath;
        break;
      }
    }

    const redirect = NextResponse.redirect(new URL(redirectPath, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
    return redirect;
  }

  // 5. Check role permission (only for role-specific paths)
  const requiredRoles = getRequiredRole(pathname);
  if (requiredRoles && requiredRoles.length > 0) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const userRoleNames = (roleRows ?? [])
      .map((r: { roles: { name: string } | null }) => r.roles?.name?.toLowerCase().replace(/\s+/g, "_"))
      .filter(Boolean);

    const hasAccess = requiredRoles.some((r) =>
      userRoleNames.includes(r.toLowerCase())
    );

    if (!hasAccess) {
      const redirect = NextResponse.redirect(new URL("/no-access", request.url));
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
      return redirect;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

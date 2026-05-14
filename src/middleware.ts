import { NextResponse, type NextRequest } from "next/server";
import {
  buildLoginRedirectPath,
  canAccessPath,
  getDefaultRedirectPath,
  isProtectedPath,
  isPublicPath,
  normalizeRoleNames,
} from "@/lib/auth/config";
import { authDebug } from "@/lib/auth/debug";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";

const CANONICAL_PRODUCTION_HOST = "www.simplifiedmarketplace.com";

function appendSetCookieHeaders(from: NextResponse, to: NextResponse) {
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      to.headers.append(key, value);
    }
  });

  return to;
}

function redirectWithCookies(request: NextRequest, response: NextResponse, pathname: string) {
  const targetUrl = new URL(pathname, request.url);
  const redirect = NextResponse.redirect(targetUrl);
  return appendSetCookieHeaders(response, redirect);
}

function maybeRedirectToCanonicalHost(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const host = request.headers.get("host")?.toLowerCase();
  if (host !== "simplifiedmarketplace.com") {
    return null;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.host = CANONICAL_PRODUCTION_HOST;
  redirectUrl.protocol = "https:";
  return NextResponse.redirect(redirectUrl, 308);
}

async function getUserRoleNames(
  supabase: NonNullable<ReturnType<typeof createMiddlewareSupabaseClient>["supabase"]>,
  userId: string
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return normalizeRoleNames(
    (data ?? []).map((row: { roles: { name: string } | null }) => row.roles?.name)
  );
}

export async function middleware(request: NextRequest) {
  const canonicalRedirect = maybeRedirectToCanonicalHost(request);
  if (canonicalRedirect) return canonicalRedirect;

  const pathname = request.nextUrl.pathname;
  const currentSearch = request.nextUrl.search;

  const { supabase, getResponse } = createMiddlewareSupabaseClient(request);

  let response = getResponse();

  if (!supabase) {
    return response;
  }

  let user = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;

    // Refresh cookies ONLY ONCE
    response = getResponse();
  } catch (err) {
    console.warn("[middleware] auth failed:", err);
  }

  // Allow public routes
  if (isPublicPath(pathname)) {
    return response;
  }

  // Protected route + no user → login
  if (isProtectedPath(pathname) && !user) {
    const loginPath = buildLoginRedirectPath(pathname, currentSearch);

    authDebug("middleware", "redirect anonymous protected route", {
      pathname,
      loginPath,
    });

    return redirectWithCookies(request, response, loginPath);
  }

  // If user exists, fetch roles — but only when the middleware actually needs
  // them to make a redirect decision. For normal sub-path navigation by an
  // authenticated user (e.g. /dashboard/campaigns, /sales/leads) the role check
  // is not needed and the DB round-trip only adds latency to every SPA navigation.
  if (user) {
    const needsRoleCheck =
      pathname === "/" ||
      pathname === "/dashboard" ||
      !canAccessPath(pathname, []) === false; // always check unknown paths

    // Only hit the DB when we actually need to make a role-based redirect.
    // For /dashboard/* and other role-gated prefixes we still need the check.
    const isRoleGatedPath =
      pathname === "/" ||
      pathname === "/dashboard" ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/agent") ||
      pathname.startsWith("/tl") ||
      pathname.startsWith("/sales") ||
      pathname.startsWith("/qa") ||
      pathname.startsWith("/mis");

    if (isRoleGatedPath) {
      try {
        const roleNames = await getUserRoleNames(supabase, user.id);

        // Root/dashboard redirect
        if (pathname === "/" || pathname === "/dashboard") {
          const redirectPath = getDefaultRedirectPath(roleNames);

          authDebug("middleware", "redirect root/dashboard", {
            userId: user.id,
            redirectPath,
          });

          return redirectWithCookies(request, response, redirectPath);
        }

        // Unauthorized route
        if (!canAccessPath(pathname, roleNames)) {
          const fallbackPath = getDefaultRedirectPath(roleNames);

          authDebug("middleware", "redirect unauthorized", {
            userId: user.id,
            pathname,
            fallbackPath,
          });

          return redirectWithCookies(request, response, fallbackPath);
        }
      } catch (err) {
        console.warn("[middleware] role fetch failed:", err);
      }
    }
  }

  return response;
}

export const config = {
  
  matcher: [
  "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
],
};

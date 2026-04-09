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
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  const pathname = request.nextUrl.pathname;
  const currentSearch = request.nextUrl.search;
  const { supabase, getResponse } = createMiddlewareSupabaseClient(request);

  try {
    if (supabase) {
      await supabase.auth.getUser();
    }
  } catch (err) {
    console.warn("[middleware] updateSession failed:", (err as Error)?.message ?? err);
  }

  let response = getResponse();

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && supabase) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        response = getResponse();

        if (user) {
          const roleNames = await getUserRoleNames(supabase, user.id);
          const redirectPath = getDefaultRedirectPath(roleNames);
          authDebug("middleware", "redirect authenticated user away from login", {
            userId: user.id,
            redirectPath,
          });
          return redirectWithCookies(request, response, redirectPath);
        }
      } catch (err) {
        console.warn("[middleware] /login auth check failed:", (err as Error)?.message ?? err);
      }
    }

    return response;
  }

  if (!isProtectedPath(pathname)) {
    return response;
  }

  if (!supabase) {
    return redirectWithCookies(
      request,
      response,
      buildLoginRedirectPath(pathname, currentSearch)
    );
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    response = getResponse();

    if (!user) {
      const loginPath = buildLoginRedirectPath(pathname, currentSearch);
      authDebug("middleware", "redirect anonymous protected route", {
        pathname,
        loginPath,
      });
      return redirectWithCookies(request, response, loginPath);
    }

    const roleNames = await getUserRoleNames(supabase, user.id);
    response = getResponse();

    if (pathname === "/" || pathname === "/dashboard") {
      const redirectPath = getDefaultRedirectPath(roleNames);
      authDebug("middleware", "redirect root/dashboard to role default", {
        userId: user.id,
        redirectPath,
      });
      return redirectWithCookies(request, response, redirectPath);
    }

    if (!canAccessPath(pathname, roleNames)) {
      const fallbackPath =
        roleNames.length > 0
          ? getDefaultRedirectPath(roleNames)
          : buildLoginRedirectPath(pathname, currentSearch);

      authDebug("middleware", "redirect unauthorized protected route", {
        userId: user.id,
        pathname,
        fallbackPath,
        roleNames,
      });
      return redirectWithCookies(request, response, fallbackPath);
    }
  } catch (err) {
    console.warn("[middleware] Supabase auth/roles failed:", (err as Error)?.message ?? err);
    const loginPath = buildLoginRedirectPath(pathname, currentSearch);
    return redirectWithCookies(request, response, loginPath);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

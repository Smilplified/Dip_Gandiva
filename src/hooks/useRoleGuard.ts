"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { buildLoginRedirectPath } from "@/lib/auth/config";
import { authDebug } from "@/lib/auth/debug";

type GuardStatus = "loading" | "authorized" | "redirecting";

export function useRoleGuard(allowedRoles: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, session, isLoading, isInitialized, hasRole, getDefaultRedirect } = useAuth();

  const isAuthorized = useMemo(
    () => allowedRoles.some((role) => hasRole(role)),
    [allowedRoles, hasRole]
  );

  useEffect(() => {
    if (!isInitialized || isLoading) {
      return;
    }

    if (!user && !session) {
      const currentSearch =
        typeof window !== "undefined" ? window.location.search : "";
      const loginPath = buildLoginRedirectPath(pathname, currentSearch);
      authDebug("guard", "redirect anonymous user to login", {
        pathname,
        loginPath,
      });
      router.replace(loginPath);
      return;
    }

    if (!isAuthorized) {
      const fallbackPath = getDefaultRedirect();
      authDebug("guard", "redirect authenticated user to default dashboard", {
        pathname,
        fallbackPath,
        allowedRoles,
      });
      router.replace(fallbackPath);
    }
  }, [
    allowedRoles,
    getDefaultRedirect,
    isAuthorized,
    isInitialized,
    isLoading,
    pathname,
    router,
    session,
    user,
  ]);

  if (!isInitialized || isLoading) {
    return { status: "loading" as GuardStatus, isAuthorized: false };
  }

  if ((!user && !session) || !isAuthorized) {
    return { status: "redirecting" as GuardStatus, isAuthorized: false };
  }

  return { status: "authorized" as GuardStatus, isAuthorized: true };
}

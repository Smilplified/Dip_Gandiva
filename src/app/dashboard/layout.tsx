"use client";

import AppLayout from "@/components/Dashboard/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { AUTH_STORAGE_KEYS } from "@/lib/auth/config";
import { Spin } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const ALLOWED_ROLES = [
  "client_viewer",
  "internal_operator",
  "internal_admin",
  "admin",
  "qa",
  "mis",
  "sales",
  "sales_manager",
  "agent",
  "team_leader",
  "tl",
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isInitialized, isLoading, hasRole, user } = useAuth();
  const router = useRouter();

  const isAllowed = ALLOWED_ROLES.some((r) => hasRole(r));

  // Track last known stable authorized state so background token refreshes
  // (isLoading=true momentarily) don't flash a spinner on an already-loaded page.
  const wasAuthorizedRef = useRef(false);
  if (isInitialized && !isLoading && user && isAllowed) {
    wasAuthorizedRef.current = true;
  }

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    if (!user) {
      router.replace("/login?reason=session_expired");
      return;
    }

    if (!isAllowed) {
      router.replace("/login?reason=unauthorized");
    }
  }, [isInitialized, isLoading, user, isAllowed, router]);

  // Reset wasAuthorizedRef when the user signs out so a subsequent login on
  // the same SPA session doesn't skip the loading spinner for the wrong user.
  useEffect(() => {
    if (isInitialized && !isLoading && !user) {
      wasAuthorizedRef.current = false;
    }
  }, [isInitialized, isLoading, user]);

  // Hard browser refresh: revalidate the App Router tree once the session is stable so
  // client pages and server middleware see the same cookies (avoids empty data until a second refresh).
  useEffect(() => {
    if (!isInitialized || isLoading || !user || !isAllowed) {
      return;
    }
    if (typeof window === "undefined" || typeof performance === "undefined") return;
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type !== "reload") return;
    try {
      const key = AUTH_STORAGE_KEYS.dashboardRscResyncOnce;
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    router.refresh();
  }, [isInitialized, isLoading, user, isAllowed, router]);

  // Show spinner only on first load (not yet initialized, or actively loading
  // before we've ever confirmed authorization).
  if (!isInitialized || (isLoading && !wasAuthorizedRef.current)) {
    return (
      <AppLayout>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <Spin size="large" tip="Loading…" />
        </div>
      </AppLayout>
    );
  }

  // Redirect in progress (useEffect fires async — show brief transition spinner).
  if (!user || !isAllowed) {
    return (
      <AppLayout>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <Spin size="large" tip="Redirecting…" />
        </div>
      </AppLayout>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/Admin/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hasRole, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("admin")) {
      router.replace("/no-access");
    }
  }, [isInitialized, hasRole, router]);

  // Always show layout shell (sidebar + header) for responsive feel
  // Content area shows loading or dashboard based on auth state
  return (
    <AdminLayout>
      {!isInitialized ? (
        <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
          <Spin size="large" tip="Loading..." />
        </div>
      ) : !hasRole("admin") ? (
        <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
          <Spin size="large" tip="Redirecting..." />
        </div>
      ) : (
        children
      )}
    </AdminLayout>
  );
}

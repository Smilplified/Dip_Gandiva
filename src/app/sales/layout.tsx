"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SalesLayout from "@/components/Sales/SalesLayout";
import { useAuth } from "@/context/AuthContext";
import { Spin, Typography } from "antd";

export default function SalesRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hasRole, isInitialized, isLoading } = useAuth();

  useEffect(() => {
    if (!isInitialized || isLoading) return;
    if (!hasRole("sales") && !hasRole("sales_manager") && !hasRole("admin")) {
      router.replace("/login");
    }
  }, [isInitialized, isLoading, hasRole, router]);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Spin size="large" />
        <Typography.Text type="secondary">Loading...</Typography.Text>
      </div>
    );
  }

  if (!hasRole("sales") && !hasRole("sales_manager") && !hasRole("admin")) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Spin size="large" />
        <Typography.Text type="secondary">Redirecting to login...</Typography.Text>
      </div>
    );
  }

  return <SalesLayout>{children}</SalesLayout>;
}

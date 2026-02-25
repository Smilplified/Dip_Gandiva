"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SalesLayout from "@/components/Sales/SalesLayout";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";

export default function SalesRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hasRole, isInitialized, isLoading } = useAuth();

  useEffect(() => {
    if (!isInitialized || isLoading) return;
    if (!hasRole("sales") && !hasRole("admin")) {
      router.replace("/login");
    }
  }, [isInitialized, isLoading, hasRole, router]);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("sales") && !hasRole("admin")) {
    return null;
  }

  return <SalesLayout>{children}</SalesLayout>;
}

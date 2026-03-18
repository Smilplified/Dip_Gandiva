"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import SalesDashboard from "@/components/Sales/SalesDashboard";
import { useAuth } from "@/context/AuthContext";

export default function SalesPage() {
  const router = useRouter();
  const { hasRole, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    const canViewSales =
      hasRole("sales") || hasRole("sales_manager") || hasRole("admin");
    if (!canViewSales) {
      router.replace("/login");
    }
  }, [isInitialized, hasRole, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const canViewSales =
    hasRole("sales") || hasRole("sales_manager") || hasRole("admin");

  if (!canViewSales) {
    return null;
  }

  return <SalesDashboard />;
}


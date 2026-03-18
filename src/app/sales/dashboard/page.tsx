"use client";

import { Spin } from "antd";
import SalesManagerDashboard from "@/components/Sales/SalesManagerDashboard";
import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function SalesDashboardPage() {
  const { status } = useRoleGuard(["sales_manager", "admin"]);

  if (status === "loading" || status === "redirecting") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return <SalesManagerDashboard />;
}

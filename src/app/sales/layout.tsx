"use client";

import SalesLayout from "@/components/Sales/SalesLayout";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { Spin, Typography } from "antd";

export default function SalesRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useRoleGuard(["sales", "sales_manager", "admin"]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Spin size="large" />
        <Typography.Text type="secondary">Loading...</Typography.Text>
      </div>
    );
  }

  if (status === "redirecting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Spin size="large" />
        <Typography.Text type="secondary">Redirecting to dashboard...</Typography.Text>
      </div>
    );
  }

  return <SalesLayout>{children}</SalesLayout>;
}

"use client";

import StatsCards from "@/components/Dashboard/StatsCards";
import SalesChart from "@/components/Dashboard/SalesChart";
import DealsTable from "@/components/Dashboard/DealsTable";
import ActivityFeed from "@/components/Dashboard/ActivityFeed";
import PipelineChart from "@/components/Dashboard/PipelineChart";

export default function AdminDashboardPage() {
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Admin Dashboard</h1>
        <p style={{ margin: "4px 0 0", color: "#8c8c8c", fontSize: 14 }}>
          Welcome back! Here&apos;s your CRM overview and pipeline.
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <StatsCards />
      </div>

      <div style={{ marginBottom: 24 }}>
        <SalesChart />
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 400px", minWidth: 0 }}>
          <DealsTable />
        </div>
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div style={{ marginBottom: 24 }}>
            <PipelineChart />
          </div>
          <ActivityFeed />
        </div>
      </div>
    </>
  );
}

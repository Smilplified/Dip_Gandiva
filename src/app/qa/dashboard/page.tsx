"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Row, Col, Statistic, Spin, Typography, message } from "antd";
import {
  FundProjectionScreenOutlined,
  RiseOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  PercentageOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

type QaStats = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  totalInterested: number;
  conversionPct: number;
};

type CampaignWithLeads = { id: string; leads: { qa_status: string | null }[] };

export default function QADashboardPage() {
  const { hasRole, isInitialized, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignWithLeads[]>([]);
  const [stats, setStats] = useState<QaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const fetchData = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }

    setIsOffline(false);
    setLoading(true);
    try {
      const [dashboardRes, statsRes] = await Promise.all([
        fetch("/api/qa/dashboard", { credentials: "include" }),
        fetch("/api/tl/campaigns/stats", { credentials: "include" }),
      ]);
      const dashboardData = await dashboardRes.json();
      const statsData = await statsRes.json();
      if (!dashboardRes.ok) throw new Error(dashboardData.error || "Failed to load");
      setCampaigns(dashboardData.campaigns ?? []);
      if (statsRes.ok) setStats(statsData);
    } catch {
      message.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("qa") && !hasRole("admin")) return;
    fetchData();
  }, [isInitialized, hasRole, fetchData]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchData();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [fetchData]);

  const pendingQaCount = campaigns.reduce(
    (sum, c) => sum + (c.leads?.filter((l) => !l.qa_status || l.qa_status.trim() === "").length ?? 0),
    0
  );

  if (!isInitialized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("qa") && !hasRole("admin")) {
    return null;
  }

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Welcome back, {profile?.full_name || "QA"}
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 15 }}>
          Review and edit leads across campaigns. Set QA status and reasons below.
        </Typography.Text>
      </div>

      {isOffline && (
        <div style={{ marginBottom: 24 }}>
          <Typography.Text type="danger" style={{ fontSize: 14 }}>
            You appear to be offline. Check your internet connection. Data will reload
            automatically once you are back online, or{" "}
            <a
              onClick={(e) => {
                e.preventDefault();
                fetchData();
              }}
            >
              click here to retry now
            </a>
            .
          </Typography.Text>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small">
              <Statistic
                title="Total Campaigns"
                value={stats?.totalCampaigns ?? 0}
                prefix={<FundProjectionScreenOutlined style={{ color: "#1677ff" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small">
              <Statistic
                title="Active Campaigns"
                value={stats?.activeCampaigns ?? 0}
                prefix={<RiseOutlined style={{ color: "#52c41a" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small">
              <Statistic
                title="Total Leads"
                value={stats?.totalLeads ?? 0}
                prefix={<TeamOutlined style={{ color: "#722ed1" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small">
              <Statistic
                title="Interested Leads"
                value={stats?.totalInterested ?? 0}
                prefix={<CheckCircleOutlined style={{ color: "#fa8c16" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small">
              <Statistic
                title="Conversion Rate"
                value={stats?.conversionPct ?? 0}
                suffix="%"
                prefix={<PercentageOutlined style={{ color: "#13c2c2" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small">
              <Statistic
                title="Pending QA Review"
                value={pendingQaCount}
                prefix={<AuditOutlined style={{ color: "#eb2f96" }} />}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

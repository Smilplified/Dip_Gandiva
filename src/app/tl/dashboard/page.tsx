"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Tag,
  Spin,
  Typography,
  Empty,
} from "antd";
import {
  FundProjectionScreenOutlined,
  RiseOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  PercentageOutlined,
  RightOutlined,
  FundOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  total_leads: number;
  total_agents: number;
};

type Stats = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  totalInterested: number;
  conversionPct: number;
};

export default function TeamLeaderDashboardPage() {
  const router = useRouter();
  const { hasRole, isInitialized, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, campaignsRes] = await Promise.all([
        fetch("/api/tl/campaigns/stats", { credentials: "include" }),
        fetch("/api/tl/campaigns", { credentials: "include" }),
      ]);
      const statsData = await statsRes.json();
      const campaignsData = await campaignsRes.json();
      if (statsRes.ok) setStats(statsData);
      if (campaignsRes.ok) {
        const all = campaignsData.campaigns ?? [];
        setRecentCampaigns(all.slice(0, 5));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("team_leader") && !hasRole("tl")) {
      router.replace("/no-access");
      return;
    }
    fetchData();
  }, [isInitialized, hasRole, router, fetchData]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("team_leader") && !hasRole("tl")) {
    return null;
  }

  const statusColors: Record<string, string> = {
    draft: "default",
    active: "green",
    paused: "orange",
    completed: "blue",
  };

  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Welcome back, {profile?.full_name || "Team Leader"}
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 15 }}>
          Here&apos;s your overview. Manage campaigns, team, and pipeline from the sidebar.
        </Typography.Text>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
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
            <Col xs={24} sm={12} lg={12}>
              <Card size="small">
                <Statistic
                  title="Interested Leads"
                  value={stats?.totalInterested ?? 0}
                  prefix={<CheckCircleOutlined style={{ color: "#fa8c16" }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={12}>
              <Card size="small">
                <Statistic
                  title="Conversion Rate"
                  value={stats?.conversionPct ?? 0}
                  suffix="%"
                  prefix={<PercentageOutlined style={{ color: "#13c2c2" }} />}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card
                title={
                  <span>
                    <FundOutlined style={{ marginRight: 8 }} />
                    Quick Actions
                  </span>
                }
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={() => router.push("/tl/campaigns")}
                    style={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    Manage Campaigns
                    <RightOutlined />
                  </Button>
                  <Button
                    size="large"
                    block
                    onClick={() => router.push("/tl/team")}
                    style={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    View Team
                    <RightOutlined />
                  </Button>
                  <Button
                    size="large"
                    block
                    onClick={() => router.push("/tl/pipeline")}
                    style={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    Pipeline
                    <RightOutlined />
                  </Button>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                title={
                  <span>
                    <FilterOutlined style={{ marginRight: 8 }} />
                    Recent Campaigns
                  </span>
                }
                extra={
                  recentCampaigns.length > 0 ? (
                    <Link href="/tl/campaigns">View all</Link>
                  ) : null
                }
              >
                {recentCampaigns.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No campaigns yet"
                  >
                    <Button type="primary" onClick={() => router.push("/tl/campaigns/create")}>
                      Create Campaign
                    </Button>
                  </Empty>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {recentCampaigns.map((c) => (
                      <Link
                        key={c.id}
                        href={`/tl/campaigns/${c.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          background: "#fafafa",
                          borderRadius: 8,
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600 }}>{c.name}</span>
                          <Tag color={statusColors[c.status] ?? "default"} style={{ marginLeft: 8 }}>
                            {c.status}
                          </Tag>
                        </div>
                        <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                          {c.total_leads} leads · {c.total_agents} agents
                        </div>
                      </Link>
                    ))}
                    <Button
                      type="link"
                      block
                      onClick={() => router.push("/tl/campaigns")}
                      style={{ marginTop: 8 }}
                    >
                      View all campaigns →
                    </Button>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </>
  );
}

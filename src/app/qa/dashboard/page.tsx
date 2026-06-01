"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardGreeting from "@/components/Dashboard/DashboardGreeting";
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Table,
  Button,
  Empty,
  message,
} from "antd";
import {
  FundProjectionScreenOutlined,
  RiseOutlined,
  TeamOutlined,
  AuditOutlined,
  ArrowUpOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { useQADashboard } from "@/hooks/useQADashboard";
import {
  StatCardsRowSkeleton,
  TableSkeleton,
} from "@/components/Dashboard/DashboardSkeletons";
import {
  QAStatusPieChart,
  QAReviewTrendChart,
  QACampaignReviewChart,
} from "@/components/Dashboard/QADashboardCharts";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import dayjs from "dayjs";

const { Text } = Typography;

type CampaignPendingRow = {
  id: string;
  name: string;
  campaign_code: string | null;
  pending: number;
  todayLeads: number;
  total: number;
};

function isLeadCreatedToday(createdAt: string | null | undefined, todayKey: string): boolean {
  if (!createdAt) return false;
  return dayjs(createdAt).format("YYYY-MM-DD") === todayKey;
}

const cardStyle = {
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  border: "1px solid #f0f0f0",
  transition: "all 0.3s ease",
  cursor: "pointer" as const,
};

const statCardHover = (e: React.MouseEvent<HTMLDivElement>, enter: boolean) => {
  const el = e.currentTarget;
  el.style.boxShadow = enter ? "0 4px 16px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.04)";
  el.style.transform = enter ? "translateY(-2px)" : "translateY(0)";
};

export default function QADashboardPage() {
  const { profile } = useAuth();
  const { status } = useRoleGuard(["qa", "admin"]);
  const [isOffline, setIsOffline] = useState(false);

  const enabled = status === "authorized";
  const { dashboard, stats, refetch } = useQADashboard(enabled);

  useEffect(() => {
    if (dashboard.error) {
      message.error("Failed to load dashboard");
    }
  }, [dashboard.error]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setIsOffline(false);
      refetch();
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refetch]);

  const campaigns = useMemo(() => dashboard.data?.campaigns ?? [], [dashboard.data?.campaigns]);
  const statsData = stats.data;

  const pendingQaCount = useMemo(
    () =>
      campaigns.reduce(
        (sum, c) =>
          sum + (c.leads?.filter((l) => !l.qa_status || String(l.qa_status).trim() === "").length ?? 0),
        0
      ),
    [campaigns]
  );

  const campaignsWithPending = useMemo((): CampaignPendingRow[] => {
    const todayKey = dayjs().format("YYYY-MM-DD");
    return campaigns
      .map((c) => {
        const leads = c.leads ?? [];
        const pending = leads.filter((l) => !l.qa_status || String(l.qa_status).trim() === "").length;
        const todayLeads = leads.filter((l) => isLeadCreatedToday(l.created_at, todayKey)).length;
        return {
          id: c.id,
          name: c.name ?? `Campaign ${c.id.slice(0, 8)}`,
          campaign_code: c.campaign_code ?? null,
          pending,
          todayLeads,
          total: leads.length,
        };
      })
      .filter((c) => c.pending > 0)
      .sort((a, b) => {
        if (b.todayLeads !== a.todayLeads) return b.todayLeads - a.todayLeads;
        if (b.pending !== a.pending) return b.pending - a.pending;
        return a.name.localeCompare(b.name);
      });
  }, [campaigns]);

  const statsCards = useMemo(() => {
    const s = statsData ?? {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalLeads: 0,
      conversionPct: 0,
    };
    return [
      {
        title: "Total Campaigns",
        value: String(s.totalCampaigns),
        change: "All campaigns",
        trend: "neutral" as const,
        icon: <FundProjectionScreenOutlined />,
        color: "#1890ff",
        bgColor: "#e6f4ff",
      },
      {
        title: "Active Campaigns",
        value: String(s.activeCampaigns),
        change: "Running",
        trend: "up" as const,
        icon: <RiseOutlined />,
        color: "#52c41a",
        bgColor: "#f6ffed",
      },
      {
        title: "Total Leads",
        value: String(s.totalLeads),
        change: "Across campaigns",
        trend: "neutral" as const,
        icon: <TeamOutlined />,
        color: "#722ed1",
        bgColor: "#f9f0ff",
      },
      {
        title: "Pending QA Review",
        value: String(pendingQaCount),
        change: `${s.conversionPct ?? 0}% conversion`,
        trend: pendingQaCount > 0 ? ("up" as const) : ("neutral" as const),
        icon: <AuditOutlined />,
        color: "#eb2f96",
        bgColor: "#fff0f6",
      },
    ];
  }, [statsData, pendingQaCount]);

  const qaStatusFromCampaigns = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    campaigns.forEach((c) => {
      c.leads?.forEach((l) => {
        const s = String(l.qa_status ?? "").trim().toLowerCase();
        if (!s) pending++;
        else if (s === "approved" || s === "pass") approved++;
        else rejected++;
      });
    });
    const out: { name: string; value: number; color: string }[] = [];
    if (approved > 0) out.push({ name: "Approved", value: approved, color: "#52c41a" });
    if (rejected > 0) out.push({ name: "Rejected", value: rejected, color: "#ff4d4f" });
    if (pending > 0) out.push({ name: "Pending", value: pending, color: "#faad14" });
    return out.length > 0 ? out : [{ name: "No data", value: 1, color: "#d9d9d9" }];
  }, [campaigns]);

  const campaignReviewData = useMemo(
    () =>
      campaigns
        .map((c) => {
          const leads = c.leads ?? [];
          const reviewed = leads.filter((l) => {
            const s = String(l.qa_status ?? "").trim().toLowerCase();
            return s && s !== "";
          }).length;
          const pending = leads.filter((l) => {
            const s = String(l.qa_status ?? "").trim();
            return !s;
          }).length;
          return {
            campaign: (c as { name?: string }).name ?? `Campaign ${c.id.slice(0, 8)}`,
            reviewed,
            pending,
          };
        })
        .filter((r) => r.reviewed > 0 || r.pending > 0),
    [campaigns]
  );

  if (status !== "authorized") {
    return null;
  }

  const statsReady = Boolean(statsData);
  const dashboardReady = dashboard.isSuccess;

  return (
    <div style={{ padding: "0 4px", maxWidth: 1600, margin: "0 auto" }}>
      <DashboardGreeting />

      {isOffline && (
        <div style={{ marginBottom: 24 }}>
          <Text type="danger" style={{ fontSize: 14 }}>
            You appear to be offline. Data will reload when back online, or{" "}
            <a onClick={(e) => { e.preventDefault(); refetch(); }}>retry now</a>.
          </Text>
        </div>
      )}

      {!statsReady ? (
        <StatCardsRowSkeleton />
      ) : (
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          {statsCards.map((stat, index) => (
            <Col xs={24} sm={12} xl={6} key={index}>
              <Card
                bordered={false}
                style={{ ...cardStyle, height: "100%" }}
                styles={{ body: { padding: "24px" } }}
                onMouseEnter={(e) => statCardHover(e, true)}
                onMouseLeave={(e) => statCardHover(e, false)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                      {stat.title}
                    </Text>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#1f1f1f", lineHeight: 1, marginBottom: 12 }}>
                      {stat.value}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {stat.trend === "up" && <ArrowUpOutlined style={{ color: "#52c41a", fontSize: 12 }} />}
                      <Text style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>{stat.change}</Text>
                    </div>
                  </div>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: stat.bgColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} xl={8}>
          <QAStatusPieChart data={qaStatusFromCampaigns} />
        </Col>
        <Col xs={24} xl={8}>
          <QAReviewTrendChart />
        </Col>
        <Col xs={24} xl={8}>
          <QACampaignReviewChart data={campaignReviewData} />
        </Col>
      </Row>

      {!dashboardReady ? (
        <TableSkeleton rows={5} />
      ) : (
        <Row gutter={[20, 20]}>
          <Col xs={24}>
            <Card
              title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text strong style={{ fontSize: 16 }}>
                    Campaigns with Pending QA
                  </Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Review these leads
                  </Text>
                </div>
              }
              bordered={false}
              style={cardStyle}
            >
              {campaignsWithPending.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No pending QA reviews. All leads are up to date."
                />
              ) : (
                <Table
                  className="table-single-line"
                  dataSource={campaignsWithPending}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  scroll={{ x: "max-content" }}
                  columns={[
                    {
                      title: "Campaign Code",
                      dataIndex: "campaign_code",
                      key: "campaign_code",
                      width: 130,
                      render: (val: string | null) => (
                        <Tag color="blue" style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {val || "—"}
                        </Tag>
                      ),
                    },
                    {
                      title: "Campaign",
                      key: "name",
                      render: (_, r) => (
                        <Link href={`/qa/campaigns/${r.id}`} style={{ fontWeight: 600, fontSize: 14 }}>
                          {r.name}
                        </Link>
                      ),
                    },
                    {
                      title: "Pending",
                      dataIndex: "pending",
                      key: "pending",
                      width: 100,
                      sorter: (a: CampaignPendingRow, b: CampaignPendingRow) => a.pending - b.pending,
                      render: (v: number) => (
                        <Tag color="orange">
                          {v} leads
                        </Tag>
                      ),
                    },
                    {
                      title: (
                        <span style={{ whiteSpace: "nowrap" }}>Today&apos;s Leads</span>
                      ),
                      dataIndex: "todayLeads",
                      key: "todayLeads",
                      width: 132,
                      className: "table-col-todays-leads",
                      defaultSortOrder: "descend",
                      onHeaderCell: () => ({
                        style: { whiteSpace: "nowrap", minWidth: 132 },
                      }),
                      onCell: () => ({ style: { whiteSpace: "nowrap" } }),
                      sorter: (a: CampaignPendingRow, b: CampaignPendingRow) =>
                        a.todayLeads - b.todayLeads,
                      render: (v: number) =>
                        v > 0 ? (
                          <Tag color="green">{v}</Tag>
                        ) : (
                          <Text type="secondary">0</Text>
                        ),
                    },
                    {
                      title: "Total Leads",
                      dataIndex: "total",
                      key: "total",
                      width: 110,
                      sorter: (a: CampaignPendingRow, b: CampaignPendingRow) => a.total - b.total,
                    },
                    {
                      title: "",
                      key: "action",
                      render: (_, r) => (
                        <Link href={`/qa/campaigns/${r.id}`}>
                          <Button type="primary" size="small" icon={<RightOutlined />}>
                            Review
                          </Button>
                        </Link>
                      ),
                    },
                  ]}
                />
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

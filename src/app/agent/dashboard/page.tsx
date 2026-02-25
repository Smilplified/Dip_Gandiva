"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Table,
  Tag,
  Row,
  Col,
  Statistic,
  Button,
  Spin,
  Typography,
  message,
} from "antd";
import {
  FundProjectionScreenOutlined,
  RiseOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type AgentCampaignRow = {
  id: string;
  name: string;
  client_name: string | null;
  industry: string | null;
  geography: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  region: string | null;
  created_at: string;
  total_leads: number;
  active_leads: number;
  won_leads: number;
};

export default function AgentDashboardPage() {
  const router = useRouter();
  const { hasRole, isInitialized, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<AgentCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("agent")) {
      router.replace("/login");
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/agent/campaigns", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load campaigns");
        setCampaigns(data.campaigns ?? []);
      } catch (err) {
        message.error(
          err instanceof Error ? err.message : "Failed to load assigned campaigns"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isInitialized, hasRole, router]);

  const totals = useMemo(() => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.total_leads ?? 0), 0);
    const activeLeads = campaigns.reduce((sum, c) => sum + (c.active_leads ?? 0), 0);
    const wonLeads = campaigns.reduce((sum, c) => sum + (c.won_leads ?? 0), 0);
    const conversionPct =
      totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
    return { totalCampaigns, activeCampaigns, totalLeads, activeLeads, conversionPct };
  }, [campaigns]);

  const statusColors: Record<string, string> = {
    draft: "default",
    active: "green",
    paused: "orange",
    completed: "blue",
  };

  const columns = [
    {
      title: "Campaign",
      dataIndex: "name",
      key: "name",
      render: (val: string, r: AgentCampaignRow) => (
        <Link href={`/agent/campaigns/${r.id}`} style={{ fontWeight: 600 }}>
          {val}
        </Link>
      ),
    },
    {
      title: "Client",
      dataIndex: "client_name",
      key: "client_name",
      render: (v: string | null) => v || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (val: string) => (
        <Tag color={statusColors[val] ?? "default"} style={{ textTransform: "capitalize" }}>
          {val}
        </Tag>
      ),
    },
    {
      title: "Region",
      dataIndex: "region",
      key: "region",
      render: (v: string | null) => v || "—",
    },
    {
      title: "My Leads",
      dataIndex: "total_leads",
      key: "total_leads",
      width: 110,
    },
    {
      title: "Active",
      dataIndex: "active_leads",
      key: "active_leads",
      width: 90,
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, r: AgentCampaignRow) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/agent/campaigns/${r.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasRole("agent")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Welcome back, {profile?.full_name || "Agent"}
          </Typography.Title>
          <Typography.Text type="secondary">
            Here are the campaigns assigned to you and your lead progress.
          </Typography.Text>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Statistic
                    title="Assigned Campaigns"
                    value={totals.totalCampaigns}
                    prefix={<FundProjectionScreenOutlined style={{ color: "#1677ff" }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Statistic
                    title="Active Campaigns"
                    value={totals.activeCampaigns}
                    prefix={<RiseOutlined style={{ color: "#52c41a" }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Statistic
                    title="My Leads"
                    value={totals.totalLeads}
                    prefix={<TeamOutlined style={{ color: "#722ed1" }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small">
                  <Statistic
                    title="My Conversion %"
                    value={totals.conversionPct}
                    suffix="%"
                    prefix={<CheckCircleOutlined style={{ color: "#fa8c16" }} />}
                  />
                </Card>
              </Col>
            </Row>

            <Card title="My Assigned Campaigns">
              <Table
                className="table-single-line"
                columns={columns}
                dataSource={campaigns}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (t) => `Total ${t} campaigns`,
                }}
                locale={{
                  emptyText:
                    "No campaigns assigned yet. Your Team Leader can assign you to campaigns.",
                }}
              />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}


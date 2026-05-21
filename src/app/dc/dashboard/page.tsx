"use client";

import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Skeleton, Typography, Button } from "antd";
import {
  FundProjectionScreenOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  SendOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

interface DashboardStats {
  totalCampaigns: number;
  totalLeads: number;
  qualifiedLeads: number;
  deliveredLeads: number;
  deliveredToday: number;
}

const cardStyle = {
  borderRadius: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  border: "1px solid #f0f0f0",
};

const statCards = [
  {
    key: "totalCampaigns" as const,
    title: "Total Campaigns",
    icon: <FundProjectionScreenOutlined />,
    color: "#1890ff",
    bg: "#e6f4ff",
  },
  {
    key: "totalLeads" as const,
    title: "Total Leads",
    icon: <TeamOutlined />,
    color: "#722ed1",
    bg: "#f9f0ff",
  },
  {
    key: "qualifiedLeads" as const,
    title: "Qualified Leads",
    icon: <CheckCircleOutlined />,
    color: "#52c41a",
    bg: "#f6ffed",
  },
  {
    key: "deliveredToday" as const,
    title: "Delivered Today",
    icon: <SendOutlined />,
    color: "#faad14",
    bg: "#fffbe6",
  },
];

export default function DCDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    fetch("/api/dc/campaigns/dashboard")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            DC campaign overview &amp; delivery stats
          </Text>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<ReloadOutlined />}
            size="middle"
            onClick={fetchStats}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<FundProjectionScreenOutlined />}
            size="middle"
            onClick={() => router.push("/dc/campaigns")}
          >
            View Campaigns
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {statCards.map((stat) => (
          <Col xs={12} sm={6} key={stat.key}>
            <Card
              bordered
              style={{ ...cardStyle, cursor: "default" }}
              styles={{ body: { padding: "16px 20px" } }}
            >
              {loading ? (
                <Skeleton active title={{ width: "60%" }} paragraph={false} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: stat.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      color: stat.color,
                      flexShrink: 0,
                    }}
                  >
                    {stat.icon}
                  </div>
                  <Statistic
                    title={<Text style={{ fontSize: 12 }}>{stat.title}</Text>}
                    value={stats?.[stat.key] ?? 0}
                    valueStyle={{ fontSize: 22, fontWeight: 700, color: stat.color }}
                  />
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

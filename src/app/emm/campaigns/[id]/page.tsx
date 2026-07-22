"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  Col,
  Row,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { ExpandableText, renderExpandableOverviewValue } from "@/components/ExpandableText";
import { campaignHeaderDisplayCode } from "@/lib/campaign-display";
import { formatEarnedRevenue } from "@/lib/campaign-revenue-metrics";

const { Title, Text } = Typography;

type Campaign = {
  id: string;
  campaign_id?: string | null;
  campaign_code?: string | null;
  name: string;
  description: string | null;
  industry: string | null;
  geography: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  lead_type: string | null;
  total_allocation: number | null;
  post_qa: number | null;
  achieved: number | null;
  pending_allocation: number | null;
  cpl: number | null;
  revenue: number | null;
  booked: number | null;
  client_name: string | null;
};

const statusColors: Record<string, string> = {
  draft: "default",
  active: "green",
  paused: "orange",
  completed: "success",
};

const overviewRowStyle = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: 16,
  padding: "10px 0",
  borderBottom: "1px solid #f0f0f0",
  alignItems: "start",
} as const;

const overviewValueStyle = { fontSize: 14, color: "#111827", wordBreak: "break-word" as const };

function OverviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={overviewRowStyle}>
      <Text type="secondary">{label}</Text>
      <span style={overviewValueStyle}>{renderExpandableOverviewValue(value, overviewValueStyle)}</span>
    </div>
  );
}

/** Same campaign access as QA — loads via `/api/qa/campaigns/[id]`. */
export default function EmmCampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = typeof params?.id === "string" ? params.id : "";
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/qa/campaigns/${campaignId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load campaign");
      setCampaign(data.campaign as Campaign);
      setLeadCount(Array.isArray(data.leads) ? data.leads.length : 0);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to load campaign");
      router.replace("/emm/campaigns");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!campaign) return null;

  const headerCode = campaignHeaderDisplayCode(campaign);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/emm/campaigns")}
          style={{ paddingLeft: 0 }}
        >
          Back to Campaigns
        </Button>
      </div>

      <Card
        style={{ borderRadius: 12, border: "1px solid #f0f0f0", marginBottom: 16 }}
        title={
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <Title level={4} style={{ margin: 0 }}>
              {campaign.name}
            </Title>
            <Tag color={statusColors[campaign.status] ?? "default"}>{campaign.status}</Tag>
            {headerCode ? (
              <Text
                type="secondary"
                style={{
                  fontFamily: headerCode.isStructuredCode ? "monospace" : undefined,
                  fontSize: 12,
                }}
              >
                {headerCode.text}
              </Text>
            ) : null}
          </div>
        }
        extra={
          <Link href="/emm/leads">
            <Button type="primary">View Leads</Button>
          </Link>
        }
      >
        <Row gutter={[24, 8]}>
          <Col xs={24} md={12}>
            <OverviewRow label="Client" value={campaign.client_name} />
            <OverviewRow label="Lead Type" value={campaign.lead_type} />
            <OverviewRow label="Industry" value={campaign.industry} />
            <OverviewRow label="Geography" value={campaign.geography} />
            <OverviewRow
              label="Dates"
              value={
                [campaign.start_date, campaign.end_date].filter(Boolean).join(" → ") || "—"
              }
            />
            <OverviewRow label="Scored Leads" value={leadCount.toLocaleString()} />
          </Col>
          <Col xs={24} md={12}>
            <OverviewRow label="CPL" value={campaign.cpl != null ? `$${campaign.cpl}` : "—"} />
            <OverviewRow
              label="Revenue"
              value={formatEarnedRevenue(campaign.cpl, campaign.achieved)}
            />
            <OverviewRow label="Total Allocation" value={campaign.total_allocation} />
            <OverviewRow label="Post QA" value={campaign.post_qa} />
            <OverviewRow label="Achieved" value={campaign.achieved} />
            <OverviewRow label="Pending Allocation" value={campaign.pending_allocation} />
          </Col>
        </Row>

        {campaign.description?.trim() ? (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
              Overview (Description)
            </Text>
            <ExpandableText text={campaign.description} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Spin,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";

type Campaign = {
  id: string;
  name: string;
  client_name: string | null;
  description: string | null;
  industry: string | null;
  geography: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

type Lead = {
  id: string;
  name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: string;
  followup_date: string | null;
  notes: string | null;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "followup", label: "Follow-up" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

export default function AgentCampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const { hasRole, isInitialized } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!id) {
      router.replace("/agent/dashboard");
      return;
    }
    if (!isInitialized) return;
    if (!hasRole("agent")) {
      router.replace("/no-access");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Reuse TL campaign API for metadata (RLS ensures only assigned campaigns are visible)
        const [campaignRes, leadsRes] = await Promise.all([
          fetch(`/api/tl/campaigns/${id}`, { credentials: "include" }),
          fetch(`/api/agent/campaigns/${id}/leads`, { credentials: "include" }),
        ]);

        const campaignJson = await campaignRes.json();
        const leadsJson = await leadsRes.json();

        if (!campaignRes.ok) throw new Error(campaignJson.error || "Failed to load campaign");
        if (!leadsRes.ok) throw new Error(leadsJson.error || "Failed to load leads");

        setCampaign({
          id: campaignJson.campaign.id,
          name: campaignJson.campaign.name,
          client_name: campaignJson.campaign.client_name,
          description: campaignJson.campaign.description,
          industry: campaignJson.campaign.industry,
          geography: campaignJson.campaign.geography,
          status: campaignJson.campaign.status,
          start_date: campaignJson.campaign.start_date,
          end_date: campaignJson.campaign.end_date,
        });
        setLeads(leadsJson.leads ?? []);
      } catch (err) {
        message.error(
          err instanceof Error ? err.message : "Failed to load campaign details"
        );
        router.replace("/agent/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isInitialized, hasRole, router]);

  const openLeadModal = () => {
    form.resetFields();
    setLeadModalOpen(true);
  };

  const handleCreateLead = async () => {
    if (!id) return;
    try {
      const values = await form.validateFields();
      setCreatingLead(true);
      const res = await fetch(`/api/agent/campaigns/${id}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: values.name || null,
          company_name: values.company_name || null,
          phone: values.phone || null,
          email: values.email || null,
          city: values.city || null,
          status: values.status || "new",
          followup_date: values.followup_date
            ? values.followup_date.format("YYYY-MM-DD")
            : null,
          notes: values.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create lead");

      message.success("Lead created");
      setLeadModalOpen(false);

      // Refresh leads
      const leadsRes = await fetch(`/api/agent/campaigns/${id}/leads`, {
        credentials: "include",
      });
      const leadsJson = await leadsRes.json();
      if (leadsRes.ok) setLeads(leadsJson.leads ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setCreatingLead(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (loading && !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const statusColors: Record<string, string> = {
    new: "default",
    contacted: "processing",
    interested: "green",
    followup: "gold",
    closed_won: "blue",
    closed_lost: "red",
  };

  const leadColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (v: string | null) => v || "—",
    },
    {
      title: "Company",
      dataIndex: "company_name",
      key: "company_name",
      render: (v: string | null) => v || "—",
    },
    {
      title: "Contact",
      key: "contact",
      render: (_: unknown, r: Lead) => (
        <span>
          {r.email || "—"}
          {r.phone ? ` • ${r.phone}` : ""}
        </span>
      ),
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      render: (v: string | null) => v || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => (
        <Tag color={statusColors[v] ?? "default"} style={{ textTransform: "capitalize" }}>
          {v.replace("_", " ")}
        </Tag>
      ),
    },
    {
      title: "Follow-up",
      dataIndex: "followup_date",
      key: "followup_date",
      render: (v: string | null) =>
        v ? new Date(v).toLocaleDateString() : <span style={{ color: "#8c8c8c" }}>—</span>,
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/agent/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <ArrowLeftOutlined /> Back to Dashboard
          </Link>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {campaign.name}
          </Typography.Title>
          <Typography.Text type="secondary">
            {campaign.client_name || "Campaign"} •{" "}
            {campaign.industry || "—"} • {campaign.geography || "—"}
          </Typography.Text>
        </div>

        <Card
          title="Campaign Details"
          style={{ marginBottom: 24 }}
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={openLeadModal}>
              Add Lead
            </Button>
          }
        >
          <p>
            <strong>Status:</strong>{" "}
            <Tag style={{ textTransform: "capitalize" }}>{campaign.status}</Tag>
          </p>
          <p>
            <strong>Start Date:</strong>{" "}
            {campaign.start_date
              ? new Date(campaign.start_date).toLocaleDateString()
              : "—"}
          </p>
          <p>
            <strong>End Date:</strong>{" "}
            {campaign.end_date
              ? new Date(campaign.end_date).toLocaleDateString()
              : "—"}
          </p>
          <p>
            <strong>Description:</strong> {campaign.description || "—"}
          </p>
        </Card>

        <Card title={`My Leads (${leads.length})`}>
          <Table
            className="table-single-line"
            columns={leadColumns}
            dataSource={leads}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "No leads yet. Use 'Add Lead' to create one." }}
          />
        </Card>

        <Modal
          title="Add Lead"
          open={leadModalOpen}
          onCancel={() => setLeadModalOpen(false)}
          onOk={handleCreateLead}
          confirmLoading={creatingLead}
          okText="Create Lead"
        >
          <Form form={form} layout="vertical">
            <Form.Item label="Name" name="name">
              <Input placeholder="Lead name" />
            </Form.Item>
            <Form.Item label="Company" name="company_name">
              <Input placeholder="Company name" />
            </Form.Item>
            <Form.Item label="Email" name="email">
              <Input placeholder="email@example.com" type="email" />
            </Form.Item>
            <Form.Item label="Phone" name="phone">
              <Input placeholder="+1 555 123 4567" />
            </Form.Item>
            <Form.Item label="City" name="city">
              <Input placeholder="City" />
            </Form.Item>
            <Form.Item label="Status" name="status" initialValue="new">
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item label="Follow-up Date" name="followup_date">
              <DatePicker
                style={{ width: "100%" }}
                disabledDate={(d) => d && d < dayjs().startOf("day")}
              />
            </Form.Item>
            <Form.Item label="Notes" name="notes">
              <Input.TextArea rows={3} placeholder="Notes, context, objections..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}


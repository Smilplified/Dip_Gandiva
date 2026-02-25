"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Table,
  Tag,
  Button,
  Drawer,
  Form,
  Input,
  DatePicker,
  Select,
  Spin,
  Typography,
  message,
  Row,
  Col,
  Divider,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  FileOutlined,
  DownloadOutlined,
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
  lead_type: string | null;
  total_allocation: number | null;
  post_qa: number | null;
  achieved: number | null;
  pending_allocation: number | null;
  region: string | null;
  additional_comments: string | null;
};

type Lead = {
  id: string;
  lead_id: string | null;
  name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: string;
  followup_date: string | null;
  notes: string | null;
  assigned_agent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_agent_name: string | null;
  created_by_name: string | null;
};

type CampaignFile = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  download_url: string | null;
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
  const [files, setFiles] = useState<CampaignFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!id) {
      router.replace("/agent/dashboard");
      return;
    }
    if (!isInitialized) return;
    if (!hasRole("agent")) {
      router.replace("/login");
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
          lead_type: campaignJson.campaign.lead_type ?? null,
          total_allocation: campaignJson.campaign.total_allocation ?? null,
          post_qa: campaignJson.campaign.post_qa ?? null,
          achieved: campaignJson.campaign.achieved ?? null,
          pending_allocation: campaignJson.campaign.pending_allocation ?? null,
          region: campaignJson.campaign.region ?? null,
          additional_comments: campaignJson.campaign.additional_comments ?? null,
        });
        setLeads(leadsJson.leads ?? []);
        setFiles(campaignJson.files ?? []);
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

  const openLeadDrawer = () => {
    form.resetFields();
    setLeadDrawerOpen(true);
  };

  const closeLeadDrawer = () => {
    setLeadDrawerOpen(false);
    form.resetFields();
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

      message.success("Lead added. Add another below or close when done.");
      form.resetFields();

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
    { title: "Sr. No.", key: "sr", width: 72, fixed: "left" as const, render: (_: unknown, __: Lead, index: number) => index + 1 },
    { title: "Lead ID", dataIndex: "lead_id", key: "lead_id", width: 160, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Name", dataIndex: "name", key: "name", width: 120, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Company", dataIndex: "company_name", key: "company_name", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Phone", dataIndex: "phone", key: "phone", width: 120, render: (v: string | null) => v || "—" },
    { title: "Email", dataIndex: "email", key: "email", width: 160, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "City", dataIndex: "city", key: "city", width: 100, render: (v: string | null) => v || "—" },
    { title: "Status", dataIndex: "status", key: "status", width: 110, render: (v: string) => <Tag color={statusColors[v] ?? "default"} style={{ textTransform: "capitalize" }}>{v?.replace("_", " ")}</Tag> },
    { title: "Follow-up", dataIndex: "followup_date", key: "followup_date", width: 100, render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—") },
    { title: "Notes", dataIndex: "notes", key: "notes", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Created By (Agent)", dataIndex: "created_by_name", key: "created_by_name", width: 140, ellipsis: true, render: (v: string | null) => v || "—" },
    { title: "Created", dataIndex: "created_at", key: "created_at", width: 110, render: (v: string) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—") },
  ];

  const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ marginBottom: 12 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>
        {label}
      </Typography.Text>
      <Typography.Text style={{ fontSize: 14 }}>{value ?? "—"}</Typography.Text>
    </div>
  );

  return (
    <div style={{ width: "100%", padding: "0 24px 32px" }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/agent/dashboard"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "#1677ff", textDecoration: "none", marginBottom: 16 }}
        >
          <ArrowLeftOutlined /> Back to Dashboard
        </Link>
      </div>

      <Card
        style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
        bodyStyle={{ padding: "24px 28px" }}
      >
        <Row gutter={24} align="middle" justify="space-between" wrap>
          <Col flex="1" style={{ minWidth: 0 }}>
            <Typography.Title level={3} style={{ margin: 0, marginBottom: 8, fontWeight: 600 }}>
              {campaign.name}
            </Typography.Title>
            <Space size="small" wrap>
              <Tag color={statusColors[campaign.status] ?? "default"} style={{ textTransform: "capitalize", margin: 0 }}>
                {campaign.status}
              </Tag>
              {campaign.lead_type && <Tag style={{ margin: 0 }}>{campaign.lead_type}</Tag>}
              {(campaign.industry || campaign.geography) && (
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {[campaign.industry, campaign.geography].filter(Boolean).join(" · ")}
                </Typography.Text>
              )}
            </Space>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={openLeadDrawer}>
              Add Lead
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card
            title="Campaign Details"
            style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
            bodyStyle={{ padding: "24px 28px" }}
          >
            {(campaign.description || campaign.additional_comments) && (
              <>
                {campaign.description && <DetailItem label="Description" value={campaign.description} />}
                {campaign.additional_comments && <DetailItem label="Additional Comments" value={campaign.additional_comments} />}
                <Divider style={{ margin: "16px 0" }} />
              </>
            )}
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <DetailItem label="Lead Type" value={campaign.lead_type} />
                <DetailItem label="Start Date" value={campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : null} />
                <DetailItem label="End Date" value={campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : null} />
                <DetailItem label="Region" value={campaign.region} />
                <DetailItem label="Total Allocation" value={campaign.total_allocation} />
              </Col>
              <Col xs={24} sm={12}>
                <DetailItem label="Post QA" value={campaign.post_qa} />
                <DetailItem label="Achieved" value={campaign.achieved} />
                <DetailItem label="Pending Allocation" value={campaign.pending_allocation} />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <FileOutlined />
                <span>Files</span>
                <Tag style={{ marginLeft: 4 }}>{files.length}</Tag>
              </Space>
            }
            style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
            bodyStyle={{ padding: "24px 28px" }}
          >
            {files.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "#8c8c8c", fontSize: 14 }}>
                <FileOutlined style={{ fontSize: 40, marginBottom: 12, display: "block", color: "#d9d9d9" }} />
                No files uploaded for this campaign.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {files.map((f, idx) => (
                  <div
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: idx < files.length - 1 ? "1px solid #f5f5f5" : "none",
                      gap: 12,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                      <FileOutlined style={{ color: "#8c8c8c", flexShrink: 0 }} />
                      <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file_name}</span>
                      {f.file_size != null && (
                        <Typography.Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                          {(f.file_size / 1024).toFixed(1)} KB
                        </Typography.Text>
                      )}
                    </span>
                    {f.download_url && (
                      <Button type="link" size="small" icon={<DownloadOutlined />} href={f.download_url} target="_blank" rel="noopener noreferrer" style={{ padding: "0 4px", flexShrink: 0 }}>
                        Download
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title={`My Leads (${leads.length})`}
        style={{ borderRadius: 8, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
        bodyStyle={{ padding: "24px 28px" }}
      >
        <Table
          className="table-single-line"
          columns={leadColumns}
          dataSource={leads}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} leads` }}
          locale={{ emptyText: "No leads yet. Use 'Add Lead' to create one." }}
          size="middle"
        />
      </Card>

      <Drawer
        title="Add Lead"
        placement="right"
        width="50%"
        open={leadDrawerOpen}
        onClose={closeLeadDrawer}
        destroyOnClose
        styles={{ body: { paddingBottom: 80 } }}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Button onClick={closeLeadDrawer}>Done</Button>
            <Button type="primary" loading={creatingLead} onClick={handleCreateLead} icon={<PlusOutlined />}>
              Create Lead
            </Button>
          </div>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 20, fontSize: 13 }}>
          Add a new lead to this campaign. After saving, the form will reset so you can add another. Close when finished.
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="Name" name="name">
                <Input placeholder="Lead name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Company" name="company_name">
                <Input placeholder="Company name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Email" name="email">
                <Input placeholder="email@example.com" type="email" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="+1 555 123 4567" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="City" name="city">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Status" name="status" initialValue="new">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Follow-up Date" name="followup_date">
                <DatePicker
                  style={{ width: "100%" }}
                  disabledDate={(d) => d && d < dayjs().startOf("day")}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} placeholder="Notes, context, objections..." />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}


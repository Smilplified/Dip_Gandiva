"use client";

import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  message,
  Spin,
  Typography,
  Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

const { TextArea } = Input;

type Campaign = {
  id: string;
  name: string;
  client_name: string | null;
  description: string | null;
  industry: string | null;
  geography: string | null;
  target_designation: string | null;
  lead_type: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  cpl: number | null;
  revenue: number | null;
  booked: number | null;
  total_allocation: number | null;
  post_qa: number | null;
  achieved: number | null;
  pending_allocation: number | null;
  region: string | null;
  weekly_call: string | null;
  weekly_report: string | null;
  additional_comments: string | null;
  assigned_team_leader_id: string | null;
};

type Lead = {
  id: string;
  name: string | null;
  company_name: string | null;
  email: string | null;
  status: string;
  followup_date: string | null;
};

export default function SalesCampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;
  const { hasRole, isInitialized } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leadTypeOptions, setLeadTypeOptions] = useState([
    { value: "B2B", label: "B2B" },
    { value: "B2C", label: "B2C" },
    { value: "Enterprise", label: "Enterprise" },
    { value: "SMB", label: "SMB" },
    { value: "Other", label: "Other" },
  ]);
  const [teamLeaders, setTeamLeaders] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id && (hasRole("sales") || hasRole("admin"))) {
      fetch("/api/tl/team-leaders", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) return;
          setTeamLeaders(data.team_leaders ?? []);
        })
        .catch(() => {});
    }
  }, [id, hasRole]);

  const fetchCampaign = useCallback(async (campaignId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tl/campaigns/${campaignId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCampaign(data.campaign);
      setLeads(data.leads ?? []);
    } catch {
      message.error("Failed to load campaign");
      router.replace("/sales/campaigns");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!id) {
      router.replace("/sales/campaigns");
      return;
    }
    if (!isInitialized) return;
    if (!hasRole("sales") && !hasRole("admin")) {
      router.replace("/no-access");
      return;
    }
    fetchCampaign(id);
  }, [id, isInitialized, hasRole, router, fetchCampaign]);

  useEffect(() => {
    if (searchParams.get("edit") === "1" && campaign) {
      setEditModalOpen(true);
    }
  }, [searchParams, campaign]);

  useEffect(() => {
    if (campaign && editModalOpen) {
      if (campaign.lead_type && !leadTypeOptions.some((o) => o.value === campaign.lead_type)) {
        setLeadTypeOptions((prev) => [...prev, { value: campaign.lead_type!, label: campaign.lead_type! }]);
      }
      form.setFieldsValue({
        client_name: campaign.client_name ?? "",
        name: campaign.name,
        lead_type: campaign.lead_type ?? undefined,
        description: campaign.description ?? "",
        industry: campaign.industry ?? "",
        geography: campaign.geography ?? "",
        target_designation: campaign.target_designation ?? "",
        start_date: campaign.start_date ? dayjs(campaign.start_date) : null,
        end_date: campaign.end_date ? dayjs(campaign.end_date) : null,
        status: campaign.status,
        cpl: campaign.cpl,
        revenue: campaign.revenue,
        booked: campaign.booked,
        total_allocation: campaign.total_allocation,
        post_qa: campaign.post_qa,
        achieved: campaign.achieved,
        pending_allocation: campaign.pending_allocation,
        region: campaign.region ?? "",
        weekly_call: campaign.weekly_call ?? "",
        weekly_report: campaign.weekly_report ?? "",
        additional_comments: campaign.additional_comments ?? "",
        assigned_team_leader_id: campaign.assigned_team_leader_id ?? undefined,
      });
    }
  }, [campaign, editModalOpen, form]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/tl/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      message.success("Campaign updated");
      fetchCampaign(id);
    } catch {
      message.error("Failed to update campaign");
    }
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await fetch(`/api/tl/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          client_name: values.client_name || null,
          name: values.name,
          lead_type: values.lead_type || null,
          description: values.description || null,
          industry: values.industry || null,
          geography: values.geography || null,
          target_designation: values.target_designation || null,
          start_date: values.start_date?.format?.("YYYY-MM-DD") ?? null,
          end_date: values.end_date?.format?.("YYYY-MM-DD") ?? null,
          status: values.status,
          cpl: values.cpl,
          revenue: values.revenue,
          booked: values.booked,
          total_allocation: values.total_allocation,
          post_qa: values.post_qa,
          achieved: values.achieved,
          pending_allocation: values.pending_allocation,
          region: values.region || null,
          weekly_call: values.weekly_call || null,
          weekly_report: values.weekly_report || null,
          additional_comments: values.additional_comments || null,
          assigned_team_leader_id: values.assigned_team_leader_id || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      message.success("Campaign updated");
      setEditModalOpen(false);
      fetchCampaign(id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to update campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/tl/campaigns/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      message.success("Campaign deleted");
      router.replace("/sales/campaigns");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to delete campaign");
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

  if (!campaign) return null;

  const statusColors: Record<string, string> = {
    draft: "default",
    active: "green",
    paused: "orange",
    completed: "blue",
  };

  const leadColumns = [
    { title: "Name", dataIndex: "name", key: "name", render: (v: string | null) => v || "—" },
    { title: "Company", dataIndex: "company_name", key: "company_name", render: (v: string | null) => v || "—" },
    { title: "Email", dataIndex: "email", key: "email", render: (v: string | null) => v || "—" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: "Follow-up",
      dataIndex: "followup_date",
      key: "followup_date",
      render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—"),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link href="/sales/campaigns" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <ArrowLeftOutlined /> Back to Campaigns
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {campaign.name}
            </Typography.Title>
            {campaign.client_name && <Typography.Text type="secondary" style={{ display: "block" }}>{campaign.client_name}</Typography.Text>}
            <Tag color={statusColors[campaign.status] ?? "default"}>{campaign.status}</Tag>
            {campaign.lead_type && <Tag style={{ marginLeft: 4 }}>{campaign.lead_type}</Tag>}
            {campaign.industry && <span style={{ marginLeft: 8, color: "#8c8c8c" }}>{campaign.industry}</span>}
            {campaign.geography && <span style={{ marginLeft: 8, color: "#8c8c8c" }}>{" | "}{campaign.geography}</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button icon={<EditOutlined />} onClick={() => setEditModalOpen(true)}>
              Edit
            </Button>
            {(campaign.status === "draft" || campaign.status === "paused") && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStatusChange("active")}>
                Activate
              </Button>
            )}
            {campaign.status === "active" && (
              <Button icon={<PauseCircleOutlined />} onClick={() => handleStatusChange("paused")}>
                Pause
              </Button>
            )}
            <Popconfirm
              title="Delete campaign?"
              description="This action cannot be undone."
              onConfirm={handleDelete}
              okText="Delete"
              okType="danger"
            >
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </div>
        </div>
      </div>

      <Card title="Campaign Details" style={{ marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          <p>
            <strong>Campaign ID:</strong>{" "}
            <code style={{ fontSize: 12, padding: "2px 6px", background: "#f5f5f5", borderRadius: 4 }}>{campaign.id}</code>
            {" "}
            <Button
              type="link"
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(campaign.id);
                message.success("Campaign ID copied to clipboard");
              }}
            >
              Copy
            </Button>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>Auto-generated unique identifier</Typography.Text>
          </p>
          <p><strong>Client Name:</strong> {campaign.client_name || "—"}</p>
          <p><strong>Campaign Name:</strong> {campaign.name}</p>
          <p><strong>Lead Type:</strong> {campaign.lead_type || "—"}</p>
          <p><strong>Start Date:</strong> {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "—"}</p>
          <p><strong>End Date:</strong> {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : "—"}</p>
          <p><strong>Status:</strong> {campaign.status}</p>
          <p><strong>CPL:</strong> {campaign.cpl != null ? `$${campaign.cpl}` : "—"}</p>
          <p><strong>Revenue:</strong> {campaign.revenue != null ? `$${Number(campaign.revenue).toLocaleString()}` : "—"}</p>
          <p><strong>Booked:</strong> {campaign.booked != null ? `$${Number(campaign.booked).toLocaleString()}` : "—"}</p>
          <p><strong>Total Allocation:</strong> {campaign.total_allocation ?? "—"}</p>
          <p><strong>Post QA:</strong> {campaign.post_qa ?? "—"}</p>
          <p><strong>Achieved:</strong> {campaign.achieved ?? "—"}</p>
          <p><strong>Pending Allocation:</strong> {campaign.pending_allocation ?? "—"}</p>
          <p><strong>Region:</strong> {campaign.region || "—"}</p>
          <p><strong>Weekly Call:</strong> {campaign.weekly_call || "—"}</p>
          <p><strong>Weekly Report:</strong> {campaign.weekly_report || "—"}</p>
          <p><strong>Assigned Team Leader:</strong> {campaign.assigned_team_leader_id ? (teamLeaders.find((tl) => tl.id === campaign.assigned_team_leader_id)?.full_name || teamLeaders.find((tl) => tl.id === campaign.assigned_team_leader_id)?.email || "—") : "—"}</p>
        </div>
        <p style={{ marginTop: 16 }}><strong>Description:</strong> {campaign.description || "—"}</p>
        <p><strong>Target Designation:</strong> {campaign.target_designation || "—"}</p>
        {campaign.additional_comments && <p><strong>Additional Comments:</strong> {campaign.additional_comments}</p>}
      </Card>

      <Card title={`Leads (${leads.length})`}>
        <Table
          className="table-single-line"
          columns={leadColumns}
          dataSource={leads}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "No leads yet" }}
        />
      </Card>

      <Modal
        title="Edit Campaign"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSaveEdit}
        confirmLoading={saving}
        okText="Save"
        width={640}
        style={{ top: 24 }}
      >
        <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}>
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="client_name" label="Client Name">
              <Input placeholder="Client name" />
            </Form.Item>
            <Form.Item name="name" label="Campaign Name" rules={[{ required: true }]}>
              <Input placeholder="Campaign name" />
            </Form.Item>
            <Form.Item
              name="lead_type"
              label="Lead Type"
              getValueFromEvent={(vals) => {
                const v = Array.isArray(vals) && vals.length ? vals[vals.length - 1] : undefined;
                if (v && !leadTypeOptions.some((o) => o.value === v)) {
                  setLeadTypeOptions((prev) => [...prev, { value: v, label: v }]);
                }
                return v;
              }}
              getValueProps={(v) => ({ value: v ? [v] : [] })}
            >
              <Select
                mode="tags"
                maxTagCount={1}
                placeholder="Select or type new lead type and press Enter"
                allowClear
                options={leadTypeOptions}
                tokenSeparators={[","]}
              />
            </Form.Item>
            <Form.Item name="start_date" label="Start Date">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="end_date" label="End Date">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "active", label: "Active" },
                  { value: "paused", label: "Paused" },
                  { value: "completed", label: "Completed" },
                ]}
              />
            </Form.Item>
            <Form.Item name="assigned_team_leader_id" label="Assign Team Leader">
              <Select
                placeholder="Select Team Leader"
                allowClear
                showSearch
                optionFilterProp="label"
                options={teamLeaders.map((tl) => ({
                  value: tl.id,
                  label: tl.full_name || tl.email || tl.id,
                }))}
                notFoundContent={teamLeaders.length === 0 ? "No Team Leaders found" : undefined}
              />
            </Form.Item>
            <Form.Item name="cpl" label="CPL">
              <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
            </Form.Item>
            <Form.Item name="revenue" label="Revenue">
              <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
            </Form.Item>
            <Form.Item name="booked" label="Booked">
              <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
            </Form.Item>
            <Form.Item name="total_allocation" label="Total Allocation">
              <InputNumber style={{ width: "100%" }} min={0} precision={0} />
            </Form.Item>
            <Form.Item name="post_qa" label="Post QA">
              <InputNumber style={{ width: "100%" }} min={0} precision={0} />
            </Form.Item>
            <Form.Item name="achieved" label="Achieved">
              <InputNumber style={{ width: "100%" }} min={0} precision={0} />
            </Form.Item>
            <Form.Item name="pending_allocation" label="Pending Allocation">
              <InputNumber style={{ width: "100%" }} min={0} precision={0} />
            </Form.Item>
            <Form.Item name="region" label="Region">
              <Input placeholder="e.g. North America, APAC" />
            </Form.Item>
            <Form.Item name="weekly_call" label="Weekly Call">
              <Input placeholder="e.g. Monday 10:00 AM" />
            </Form.Item>
            <Form.Item name="weekly_report" label="Weekly Report">
              <Input placeholder="e.g. Friday EOD" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <TextArea rows={2} placeholder="Campaign description" />
            </Form.Item>
            <Form.Item name="target_designation" label="Target Designation">
              <Input placeholder="e.g. CTO, Sales Manager" />
            </Form.Item>
            <Form.Item name="industry" label="Industry">
              <Input placeholder="e.g. Technology, Healthcare" />
            </Form.Item>
            <Form.Item name="geography" label="Geography">
              <Input placeholder="e.g. North America, APAC" />
            </Form.Item>
            <Form.Item name="additional_comments" label="Additional Comments">
              <TextArea rows={3} placeholder="Additional notes" />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </>
  );
}

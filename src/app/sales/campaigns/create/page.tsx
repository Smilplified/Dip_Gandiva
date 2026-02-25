"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Form, Input, DatePicker, Select, Button, message, InputNumber, Row, Col, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";
import type { UploadFile } from "antd";

const { TextArea } = Input;
const { Dragger } = Upload;

const ACCEPT_FILE_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip,.jpg,.jpeg,.png,.gif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,image/*";

const DEFAULT_LEAD_TYPES = [
  { value: "B2B", label: "B2B" },
  { value: "B2C", label: "B2C" },
  { value: "Enterprise", label: "Enterprise" },
  { value: "SMB", label: "SMB" },
  { value: "Other", label: "Other" },
];

export default function SalesCreateCampaignPage() {
  const router = useRouter();
  const { hasRole, isInitialized } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leadTypeOptions, setLeadTypeOptions] = useState(DEFAULT_LEAD_TYPES);
  const [teamLeaders, setTeamLeaders] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("sales") && !hasRole("admin")) return;
    fetch("/api/tl/team-leaders", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          message.warning("Could not load Team Leaders: " + (data.error || "Unknown error"));
          return;
        }
        setTeamLeaders(data.team_leaders ?? []);
      })
      .catch(() => message.warning("Could not load Team Leaders"));
  }, [isInitialized, hasRole]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!hasRole("sales") && !hasRole("admin")) {
      router.replace("/login");
      return;
    }
  }, [isInitialized, hasRole, router]);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const res = await fetch("/api/tl/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          client_name: values.client_name,
          name: values.name,
          lead_type: Array.isArray(values.lead_type) ? values.lead_type[0] : values.lead_type,
          start_date: values.start_date?.format?.("YYYY-MM-DD") ?? null,
          end_date: values.end_date?.format?.("YYYY-MM-DD") ?? null,
          status: values.status ?? "draft",
          cpl: values.cpl,
          revenue: values.revenue,
          booked: values.booked,
          total_allocation: values.total_allocation,
          post_qa: values.post_qa,
          achieved: values.achieved,
          pending_allocation: values.pending_allocation,
          region: values.region,
          weekly_call: values.weekly_call,
          weekly_report: values.weekly_report,
          additional_comments: values.additional_comments,
          assigned_team_leader_id: values.assigned_team_leader_id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

      const campaignId = data.campaign_id as string;
      const filesToUpload = fileList.filter((f) => f.originFileObj);

      if (filesToUpload.length > 0) {
        const formData = new FormData();
        filesToUpload.forEach((f) => {
          if (f.originFileObj) formData.append("files", f.originFileObj);
        });
        const uploadRes = await fetch(`/api/tl/campaigns/${campaignId}/files`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          message.warning(uploadData.error || "Campaign created but some files failed to upload.");
        } else if (uploadData.errors?.length) {
          message.warning(`Campaign created. ${uploadData.errors.join(" ")}`);
        }
      }

      message.success("Campaign created");
      router.replace(`/sales/campaigns/${campaignId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: "0 24px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <Card title="Create Campaign" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" initialValues={{ status: "draft" }}>
          <Row gutter={24}>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="client_name" label="Client Name" rules={[{ required: true, message: "Client Name is required" }]}>
                <Input placeholder="Enter client name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="name" label="Campaign Name" rules={[{ required: true, message: "Campaign Name is required" }]}>
                <Input placeholder="Enter campaign name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
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
                  placeholder="Select or type new lead type"
                  allowClear
                  options={leadTypeOptions}
                  tokenSeparators={[","]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="start_date" label="Start Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="end_date" label="End Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
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
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="cpl" label="CPL (Cost Per Lead)">
                <InputNumber style={{ width: "100%" }} placeholder="e.g. 25.00" min={0} step={0.01} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="revenue" label="Revenue">
                <InputNumber style={{ width: "100%" }} placeholder="e.g. 10000" min={0} step={0.01} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="booked" label="Booked">
                <InputNumber style={{ width: "100%" }} placeholder="e.g. 5000" min={0} step={0.01} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="total_allocation" label="Total Allocation">
                <InputNumber style={{ width: "100%" }} placeholder="e.g. 1000" min={0} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="post_qa" label="Post QA">
                <InputNumber style={{ width: "100%" }} placeholder="e.g. 800" min={0} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="achieved" label="Achieved">
                <InputNumber style={{ width: "100%" }} placeholder="e.g. 750" min={0} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="pending_allocation" label="Pending Allocation">
                <InputNumber style={{ width: "100%" }} placeholder="e.g. 250" min={0} precision={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12} lg={8}>
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
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="region" label="Region">
                <Input placeholder="e.g. North America, APAC, EMEA" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item name="weekly_call" label="Weekly Call">
                <Input placeholder="e.g. Monday 10:00 AM" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="weekly_report" label="Weekly Report">
                <Input placeholder="e.g. Friday EOD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                label="Upload Files"
                tooltip="PDF, Word, Excel, PowerPoint, CSV, images, ZIP, etc. Max 50MB per file."
              >
                <Dragger
                  multiple
                  fileList={fileList}
                  accept={ACCEPT_FILE_TYPES}
                  beforeUpload={() => false}
                  onRemove={(file) => setFileList((prev) => prev.filter((f) => f.uid !== file.uid))}
                  onChange={({ fileList: next }) => setFileList(next)}
                  maxCount={20}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ fontSize: 48, color: "#1677ff" }} />
                  </p>
                  <p className="ant-upload-text">Click or drag files to upload</p>
                  <p className="ant-upload-hint">
                    PDF, Word (.doc, .docx), Excel (.xls, .xlsx), CSV, PowerPoint (.ppt, .pptx), text, images, ZIP. Multiple files allowed.
                  </p>
                </Dragger>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={24}>
              <Form.Item name="additional_comments" label="Additional Comments">
                <TextArea rows={4} placeholder="Any additional notes or comments" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button type="primary" size="large" loading={loading} onClick={submit}>
              Create Campaign
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

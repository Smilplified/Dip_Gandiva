"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  message,
  Row,
  Col,
  Divider,
  Upload,
  Typography,
  Space,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { parseLeadsCsv, parseLeadsExcel } from "@/lib/leadsImport";
import { downloadCampaignLeadsImportTemplate } from "@/lib/leadsImportTemplate";

interface CampaignFormValues {
  campaign_id: string;
  name: string;
  description?: string | null;
  industry?: string | null;
  geography?: string | null;
  lead_type?: string | null;
  client_name?: string | null;
  client_id?: string | null;
  start_date?: string | Dayjs | null;
  end_date?: string | Dayjs | null;
  status?: string;
  cpl?: number | null;
  revenue?: number | null;
  total_allocation?: number | null;
  sponsor_name?: string | null;
  total_leads_allocated?: number | null;
  total_campaign_spend?: number | null;
  total_leads_delivered?: number | null;
  daily_reporting?: string | null;
  channel_split?: string | null;
  deficit_leads?: number | null;
  lead_increment?: number | null;
  lead_replace?: number | null;
  imported_leads_file?: UploadFile[];
}

interface CampaignFormProps {
  initialValues?: Partial<CampaignFormValues>;
  campaignId?: string;
  onSuccess?: (campaign: Record<string, unknown>) => void;
  onCancel?: () => void;
}

const INDUSTRIES = [
  "Technology", "Healthcare", "Finance", "Education", "Manufacturing",
  "Retail", "Real Estate", "Media", "Consulting", "Other",
];

const LEAD_TYPES = [
  "B2B", "B2C", "HQL", "MQL", "SQL", "ICP", "ABM",
];

export default function CampaignForm({
  initialValues,
  campaignId,
  onSuccess,
  onCancel,
}: CampaignFormProps) {
  const [form] = Form.useForm<CampaignFormValues>();
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientOptions, setClientOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [parsedLeads, setParsedLeads] = useState<Record<string, unknown>[]>([]);
  const isEdit = Boolean(campaignId);

  const normalizedInitialValues = useMemo(() => {
    if (!initialValues) return initialValues;
    return {
      ...initialValues,
      start_date: initialValues.start_date ? dayjs(initialValues.start_date as string) : null,
      end_date: initialValues.end_date ? dayjs(initialValues.end_date as string) : null,
      daily_reporting:
        typeof initialValues.daily_reporting === "object" && initialValues.daily_reporting !== null
          ? JSON.stringify(initialValues.daily_reporting, null, 2)
          : (initialValues.daily_reporting as string | null | undefined),
      channel_split:
        typeof initialValues.channel_split === "object" && initialValues.channel_split !== null
          ? JSON.stringify(initialValues.channel_split, null, 2)
          : (initialValues.channel_split as string | null | undefined),
    };
  }, [initialValues]);

  useEffect(() => {
    const loadClients = async () => {
      setClientsLoading(true);
      try {
        const res = await fetch("/api/sales/clients");
        const data = (await res.json()) as {
          clients?: Array<{ id: string; company_name?: string | null }>;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load clients");
        setClientOptions(
          (data.clients ?? []).map((c) => ({
            value: c.id,
            label: c.company_name ?? c.id,
          }))
        );
      } catch {
        message.error("Failed to load client list");
      } finally {
        setClientsLoading(false);
      }
    };
    void loadClients();
  }, []);

  const handleSubmit = async (values: CampaignFormValues) => {
    setLoading(true);
    try {
      const parsedDailyReporting =
        values.daily_reporting && values.daily_reporting.trim()
          ? JSON.parse(values.daily_reporting)
          : undefined;
      const parsedChannelSplit =
        values.channel_split && values.channel_split.trim()
          ? JSON.parse(values.channel_split)
          : undefined;

      const payload = {
        ...values,
        leads: parsedLeads,
        daily_reporting: parsedDailyReporting,
        channel_split: parsedChannelSplit,
        start_date: values.start_date
          ? dayjs.isDayjs(values.start_date)
            ? values.start_date.format("YYYY-MM-DD")
            : dayjs(values.start_date).format("YYYY-MM-DD")
          : undefined,
        end_date: values.end_date
          ? dayjs.isDayjs(values.end_date)
            ? values.end_date.format("YYYY-MM-DD")
            : dayjs(values.end_date).format("YYYY-MM-DD")
          : undefined,
      };

      const url = isEdit
        ? `/api/command/campaigns/${campaignId}`
        : "/api/command/campaigns";

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { campaign?: Record<string, unknown>; error?: string };

      if (!res.ok) {
        message.error(data.error ?? "Failed to save campaign");
        return;
      }

      message.success(isEdit ? "Campaign updated" : "Campaign created");
      onSuccess?.(data.campaign ?? {});
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleLeadsFileUpload = async (file: File) => {
    try {
      const lower = file.name.toLowerCase();
      let leads: Record<string, unknown>[] = [];
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        leads = parseLeadsExcel(buffer);
      } else if (lower.endsWith(".csv")) {
        const text = await file.text();
        leads = parseLeadsCsv(text);
      } else {
        message.error("Only .xlsx, .xls, or .csv files are supported");
        return Upload.LIST_IGNORE;
      }

      setParsedLeads(leads);
      form.setFieldValue("total_leads_delivered", leads.length);
      message.success(`Parsed ${leads.length} leads from file`);
      return false;
    } catch {
      message.error("Failed to parse file");
      return Upload.LIST_IGNORE;
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={normalizedInitialValues}
      onFinish={handleSubmit}
      size="middle"
      style={{ maxWidth: 800 }}
    >
      <Divider orientation="left" style={{ fontSize: 13, color: "#8c8c8c" }}>
        Campaign Identity
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="campaign_id"
            label="Campaign ID"
            rules={[{ required: !isEdit, message: "Campaign ID is required" }]}
          >
            <Input placeholder="e.g. CMP-2026-001" disabled={isEdit} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="name"
            label="Campaign Name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Campaign display name" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="client_id" label="Client" rules={[{ required: true, message: "Please select a client" }]}>
            <Select
              placeholder="Select client"
              loading={clientsLoading}
              showSearch
              allowClear
              options={clientOptions}
              optionFilterProp="label"
              onChange={(value) => {
                const selected = clientOptions.find((o) => o.value === value);
                form.setFieldValue("client_name", selected?.label ?? null);
              }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="status" label="Status" initialValue="active">
            <Select>
              <Select.Option value="draft">Draft</Select.Option>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="paused">Paused</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="description" label="Description">
        <Input.TextArea rows={2} placeholder="Campaign objective / brief" />
      </Form.Item>

      <Divider orientation="left" style={{ fontSize: 13, color: "#8c8c8c" }}>
        Targeting
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="industry" label="Industry">
            <Select placeholder="Select industry" allowClear showSearch>
              {INDUSTRIES.map((i) => (
                <Select.Option key={i} value={i}>{i}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="geography" label="Geography">
            <Input placeholder="e.g. India, APAC, Global" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="lead_type" label="Lead Type">
            <Select placeholder="Lead type" allowClear>
              {LEAD_TYPES.map((t) => (
                <Select.Option key={t} value={t}>{t}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" style={{ fontSize: 13, color: "#8c8c8c" }}>
        Timeline &amp; Budget
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="start_date" label="Start Date">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="end_date" label="End Date">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="cpl" label="CPL (₹)">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              placeholder="Cost per lead"
              formatter={(v) => `₹ ${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="revenue" label="Revenue (₹)">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              formatter={(v) => `₹ ${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="total_allocation" label="Total Allocation">
            <InputNumber style={{ width: "100%" }} min={0} placeholder="Lead quota" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" style={{ fontSize: 13, color: "#8c8c8c" }}>
        Metrics Targets
      </Divider>

      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            name="imported_leads_file"
            label="Upload Leads File (Excel/CSV)"
            extra={
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
                Upload .xlsx / .xls / .csv to auto-count Total Leads Delivered and import leads on campaign
                create. Use the templates so column names match what the importer expects (first row = headers).
              </Typography.Paragraph>
            }
          >
            <Space wrap align="center" size="middle">
              <Upload
                maxCount={1}
                beforeUpload={(file) => handleLeadsFileUpload(file)}
                accept=".xlsx,.xls,.csv"
              >
                <Button icon={<UploadOutlined />}>Upload file</Button>
              </Upload>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => downloadCampaignLeadsImportTemplate("csv")}
                style={{ paddingInline: 0 }}
              >
                Download CSV template
              </Button>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => downloadCampaignLeadsImportTemplate("xlsx")}
                style={{ paddingInline: 0 }}
              >
                Download Excel template
              </Button>
            </Space>
          </Form.Item>
          {parsedLeads.length > 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Parsed leads ready for import: {parsedLeads.length}
            </Typography.Text>
          )}
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="sponsor_name" label="Sponsor Name">
            <Input placeholder="Sponsor / partner name" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="total_leads_allocated" label="Leads Allocated (Budget)">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="total_campaign_spend" label="Campaign Spend Budget (₹)">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              formatter={(v) => `₹ ${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="total_leads_delivered" label="Total Leads Delivered">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="deficit_leads" label="Deficit Leads">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="lead_increment" label="Lead Increment">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="lead_replace" label="Lead Replace">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item
            name="daily_reporting"
            label="Daily Reporting (JSON)"
            extra='Example: {"2026-04-08":{"allocated":120,"delivered":95}}'
            rules={[
              {
                validator: (_, value) => {
                  if (!value || String(value).trim() === "") return Promise.resolve();
                  try {
                    JSON.parse(String(value));
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error("Invalid JSON in Daily Reporting"));
                  }
                },
              },
            ]}
          >
            <Input.TextArea rows={4} placeholder='{"2026-04-08":{"allocated":120,"delivered":95}}' />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item
            name="channel_split"
            label="Channel Split (JSON)"
            extra='Example: {"email":70,"telemarketing":30}'
            rules={[
              {
                validator: (_, value) => {
                  if (!value || String(value).trim() === "") return Promise.resolve();
                  try {
                    JSON.parse(String(value));
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error("Invalid JSON in Channel Split"));
                  }
                },
              },
            ]}
          >
            <Input.TextArea rows={3} placeholder='{"email":70,"telemarketing":30}' />
          </Form.Item>
        </Col>
      </Row>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 8 }}>
        {onCancel && (
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="primary" htmlType="submit" loading={loading}>
          {isEdit ? "Save Changes" : "Create Campaign"}
        </Button>
      </div>
    </Form>
  );
}

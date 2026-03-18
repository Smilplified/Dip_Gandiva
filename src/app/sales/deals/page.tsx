"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

type DealRow = {
  id: string;
  deal_name: string;
  account_id: string | null;
  account_name: string | null;
  contact_id: string | null;
  contact_name: string | null;
  value: number | null;
  stage: string;
  owner_id: string | null;
  owner_name: string | null;
  expected_close_date: string | null;
  created_at: string;
};

const { Title, Text } = Typography;

const STAGES = [
  { value: "qualification", label: "Qualification", color: "blue" },
  { value: "discovery", label: "Discovery", color: "cyan" },
  { value: "proposal", label: "Proposal", color: "gold" },
  { value: "negotiation", label: "Negotiation", color: "purple" },
  { value: "closed_won", label: "Closed Won", color: "green" },
  { value: "closed_lost", label: "Closed Lost", color: "red" },
] as const;

const stageLabel = (v: string) => STAGES.find((s) => s.value === v)?.label ?? v;
const stageColor = (v: string) => STAGES.find((s) => s.value === v)?.color ?? "default";

export default function SalesDealsPage() {
  const [view, setView] = useState<"Pipeline" | "List">("Pipeline");
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; company_name: string | null }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; contact_name: string | null }[]>([]);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales/deals", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load deals");
      setDeals(json.deals ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchLookups = useCallback(async () => {
    try {
      const [accountsRes, contactsRes] = await Promise.all([
        fetch("/api/sales/accounts", { credentials: "include" }),
        fetch("/api/sales/contacts", { credentials: "include" }),
      ]);
      const accountsJson = await accountsRes.json().catch(() => ({}));
      const contactsJson = await contactsRes.json().catch(() => ({}));

      if (accountsRes.ok) {
        setAccounts(
          (accountsJson.accounts ?? []).map((a: any) => ({
            id: a.id as string,
            company_name: (a.company_name as string | null) ?? null,
          }))
        );
      }
      if (contactsRes.ok) {
        setContacts(
          (contactsJson.contacts ?? []).map((c: any) => ({
            id: c.id as string,
            contact_name: (c.contact_name as string | null) ?? null,
          }))
        );
      }
    } catch {
      // Non-blocking: deals can still load
    }
  }, []);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((d) => {
      const matchesSearch =
        !q ||
        d.deal_name.toLowerCase().includes(q) ||
        (d.account_name ?? "").toLowerCase().includes(q) ||
        (d.contact_name ?? "").toLowerCase().includes(q) ||
        (d.owner_name ?? "").toLowerCase().includes(q);
      const matchesStage = !stageFilter || d.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [deals, search, stageFilter]);

  const totals = useMemo(() => {
    const pipelineValue = filteredDeals
      .filter((d) => d.stage !== "closed_lost")
      .reduce((sum, d) => sum + (d.value ?? 0), 0);
    const wonValue = filteredDeals
      .filter((d) => d.stage === "closed_won")
      .reduce((sum, d) => sum + (d.value ?? 0), 0);
    const openCount = filteredDeals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage)).length;
    return { pipelineValue, wonValue, openCount };
  }, [filteredDeals]);

  const byStage = useMemo(() => {
    const buckets: Record<string, DealRow[]> = {};
    STAGES.forEach((s) => (buckets[s.value] = []));
    filteredDeals.forEach((d) => {
      (buckets[d.stage] ?? (buckets[d.stage] = [])).push(d);
    });
    return buckets;
  }, [filteredDeals]);

  const updateStage = async (dealId: string, stage: string) => {
    try {
      const res = await fetch(`/api/sales/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update stage");
      message.success("Stage updated");
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to update stage");
    }
  };

  const columns: ColumnsType<DealRow> = [
    { title: "Deal", dataIndex: "deal_name", key: "deal_name", width: 220, ellipsis: true },
    {
      title: "Account",
      dataIndex: "account_name",
      key: "account_name",
      width: 200,
      ellipsis: true,
      render: (_: unknown, r) => (
        <Tooltip title={r.account_id ? `Account ID: ${r.account_id}` : undefined}>
          <span>{r.account_name || "—"}</span>
        </Tooltip>
      ),
    },
    {
      title: "Contact",
      dataIndex: "contact_name",
      key: "contact_name",
      width: 200,
      ellipsis: true,
      render: (_: unknown, r) => (
        <Tooltip title={r.contact_id ? `Contact ID: ${r.contact_id}` : undefined}>
          <span>{r.contact_name || "—"}</span>
        </Tooltip>
      ),
    },
    {
      title: "Account ID",
      dataIndex: "account_id",
      key: "account_id",
      width: 130,
      ellipsis: true,
      render: (v: string | null) => (v ? <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v.slice(0, 8)}</span> : "—"),
    },
    {
      title: "Contact ID",
      dataIndex: "contact_id",
      key: "contact_id",
      width: 130,
      ellipsis: true,
      render: (v: string | null) => (v ? <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v.slice(0, 8)}</span> : "—"),
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      width: 140,
      render: (v: number | null) => (v != null ? `₹${Number(v).toLocaleString()}` : "—"),
    },
    {
      title: "Stage",
      dataIndex: "stage",
      key: "stage",
      width: 190,
      render: (v: string, r: DealRow) => (
        <Select
          value={v}
          onChange={(next) => updateStage(r.id, next)}
          style={{ width: "100%" }}
          options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
        />
      ),
    },
    { title: "Owner", dataIndex: "owner_name", key: "owner_name", width: 180, ellipsis: true, render: (v) => v || "—" },
    {
      title: "Expected Close",
      dataIndex: "expected_close_date",
      key: "expected_close_date",
      width: 150,
      render: (v: string | null) => (v ? dayjs(v).format("DD MMM YYYY") : "—"),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 130,
      render: (v: string) => dayjs(v).format("DD MMM YYYY"),
    },
  ];

  const submitNewDeal = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        deal_name: values.deal_name,
        account_id: values.account_id || null,
        contact_id: values.contact_id || null,
        value: typeof values.value === "number" ? values.value : null,
        stage: values.stage || "qualification",
        expected_close_date: values.expected_close_date ? dayjs(values.expected_close_date).toISOString() : null,
      };

      const res = await fetch("/api/sales/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create deal");
      message.success("Deal created");
      setDrawerOpen(false);
      form.resetFields();
      fetchData();
    } catch (err) {
      if (err instanceof Error && err.message) message.error(err.message);
    }
  };

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 26 }}>
            Deals / Opportunities
          </Title>
          <Text type="secondary">Track pipeline stages, update progress, and monitor revenue.</Text>
        </div>
        <Space>
          <Segmented value={view} onChange={(v) => setView(v as any)} options={["Pipeline", "List"]} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
            New Deal
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
            <Statistic title="Pipeline Value" value={totals.pipelineValue} prefix="₹" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
            <Statistic title="Won Revenue" value={totals.wonValue} prefix="₹" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
            <Statistic title="Open Deals" value={totals.openCount} />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 16, boxShadow: "0 2px 8px rgba(15,23,42,0.06)", marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Input
              allowClear
              placeholder="Search deals, accounts, contacts, owners..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} md={12}>
            <Select
              allowClear
              placeholder="Filter by stage"
              style={{ width: "100%" }}
              value={stageFilter}
              onChange={setStageFilter}
              options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
            />
          </Col>
        </Row>
      </Card>

      {view === "List" ? (
        <Card style={{ borderRadius: 16, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }} styles={{ body: { padding: 0 } }}>
          <Table
            columns={columns}
            dataSource={filteredDeals}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1200, y: 520 }}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} deals` }}
            size="middle"
          />
        </Card>
      ) : (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
          {STAGES.map((s) => {
            const list = byStage[s.value] ?? [];
            const totalValue = list.reduce((sum, d) => sum + (d.value ?? 0), 0);
            return (
              <div key={s.value} style={{ minWidth: 300, flex: "0 0 300px" }}>
                <Card
                  title={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700 }}>{s.label}</span>
                      <Badge count={list.length} />
                    </div>
                  }
                  extra={<Text type="secondary">₹{Number(totalValue).toLocaleString()}</Text>}
                  style={{ borderRadius: 16, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}
                  styles={{ body: { padding: 12 } }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {list.length === 0 ? (
                      <Text type="secondary">No deals</Text>
                    ) : (
                      list.map((d) => (
                        <Card
                          key={d.id}
                          size="small"
                          style={{ borderRadius: 14, border: "1px solid rgba(15,23,42,0.08)" }}
                          styles={{ body: { padding: 12 } }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {d.deal_name}
                              </div>
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {d.account_name || "—"} {d.contact_name ? `• ${d.contact_name}` : ""}
                                </Text>
                              </div>
                            </div>
                            <Tag color={stageColor(d.stage)} style={{ margin: 0 }}>
                              {stageLabel(d.stage)}
                            </Tag>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                            <Text style={{ fontWeight: 700 }}>
                              {d.value != null ? `₹${Number(d.value).toLocaleString()}` : "—"}
                            </Text>
                            <Select
                              size="small"
                              value={d.stage}
                              onChange={(next) => updateStage(d.id, next)}
                              options={STAGES.map((x) => ({ value: x.value, label: x.label }))}
                              style={{ width: 150 }}
                            />
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Drawer
        title="New Deal"
        placement="right"
        width={440}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          form.resetFields();
        }}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => { setDrawerOpen(false); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" onClick={submitNewDeal}>Create deal</Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ stage: "qualification" }}
        >
          <Form.Item name="deal_name" label="Deal Name" rules={[{ required: true, message: "Please enter deal name" }]}>
            <Input placeholder="e.g. Q2 Renewal - Acme" />
          </Form.Item>
          <Form.Item name="account_id" label="Account">
            <Select
              allowClear
              showSearch
              placeholder="Select account (optional)"
              optionFilterProp="label"
              options={accounts.map((a) => ({
                value: a.id,
                label: a.company_name || a.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="contact_id" label="Contact">
            <Select
              allowClear
              showSearch
              placeholder="Select contact (optional)"
              optionFilterProp="label"
              options={contacts.map((c) => ({
                value: c.id,
                label: c.contact_name || c.id,
              }))}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="value" label="Deal Value">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stage" label="Stage">
                <Select options={STAGES.map((s) => ({ value: s.value, label: s.label }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="expected_close_date" label="Expected Close Date">
            <Input placeholder="YYYY-MM-DD (optional)" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}


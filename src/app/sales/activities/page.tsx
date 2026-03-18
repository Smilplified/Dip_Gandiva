"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

type ActivityRow = {
  id: string;
  activity_type: "call" | "meeting" | "email" | "demo";
  related_to_type: "lead" | "contact" | "deal";
  related_to_id: string;
  related_to_name: string | null;
  notes: string | null;
  activity_date: string;
  owner_id: string | null;
  owner_name: string | null;
  created_at: string;
};

type LookupItem = { id: string; label: string };

const { Title, Text } = Typography;

const TYPE_COLORS: Record<string, string> = {
  call: "blue",
  meeting: "purple",
  email: "cyan",
  demo: "gold",
};

export default function SalesActivitiesPage() {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [relatedFilter, setRelatedFilter] = useState<string | undefined>();

  const [leads, setLeads] = useState<LookupItem[]>([]);
  const [contacts, setContacts] = useState<LookupItem[]>([]);
  const [deals, setDeals] = useState<LookupItem[]>([]);

  const [form] = Form.useForm();

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (relatedFilter) params.set("related_to_type", relatedFilter);
      const res = await fetch(`/api/sales/activities?${params.toString()}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load activities");
      setActivities(json.activities ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setLoading(false);
    }
  }, [relatedFilter]);

  const fetchLookups = useCallback(async () => {
    try {
      const [leadsRes, contactsRes, dealsRes] = await Promise.all([
        fetch("/api/sales/leads", { credentials: "include" }),
        fetch("/api/sales/contacts", { credentials: "include" }),
        fetch("/api/sales/deals", { credentials: "include" }),
      ]);

      const leadsJson = await leadsRes.json().catch(() => ({}));
      const contactsJson = await contactsRes.json().catch(() => ({}));
      const dealsJson = await dealsRes.json().catch(() => ({}));

      if (leadsRes.ok) {
        setLeads(
          (leadsJson.leads ?? []).map((l: any) => ({
            id: l.id as string,
            label: (l.lead_name as string | null) || "Unnamed lead",
          }))
        );
      }
      if (contactsRes.ok) {
        setContacts(
          (contactsJson.contacts ?? []).map((c: any) => ({
            id: c.id as string,
            label: (c.contact_name as string | null) || "Unnamed contact",
          }))
        );
      }
      if (dealsRes.ok) {
        setDeals(
          (dealsJson.deals ?? []).map((d: any) => ({
            id: d.id as string,
            label: (d.deal_name as string | null) || "Unnamed deal",
          }))
        );
      }
    } catch {
      // ignore lookups failures
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((a) => {
      const matchesType = !typeFilter || a.activity_type === typeFilter;
      const matchesSearch =
        !q ||
        (a.notes ?? "").toLowerCase().includes(q) ||
        (a.owner_name ?? "").toLowerCase().includes(q) ||
        (a.related_to_name ?? "").toLowerCase().includes(q) ||
        a.related_to_type.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [activities, search, typeFilter]);

  const counts = useMemo(() => {
    const byType: Record<string, number> = { call: 0, meeting: 0, email: 0, demo: 0 };
    filtered.forEach((a) => {
      byType[a.activity_type] = (byType[a.activity_type] ?? 0) + 1;
    });
    return byType;
  }, [filtered]);

  const relatedOptions = useMemo(() => {
    const type = form.getFieldValue("related_to_type") as "lead" | "contact" | "deal" | undefined;
    if (type === "lead") return leads;
    if (type === "contact") return contacts;
    if (type === "deal") return deals;
    return [];
  }, [leads, contacts, deals, form]);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        activity_type: values.activity_type,
        related_to_type: values.related_to_type,
        related_to_id: values.related_to_id,
        notes: values.notes || null,
        activity_date: values.activity_date ? dayjs(values.activity_date).toISOString() : null,
      };

      const res = await fetch("/api/sales/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create activity");

      message.success("Activity logged");
      setDrawerOpen(false);
      form.resetFields();
      fetchActivities();
    } catch (err) {
      if (err instanceof Error && err.message) message.error(err.message);
    }
  };

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 26 }}>
            Activities
          </Title>
          <Text type="secondary">Track calls, meetings, emails, and demos across leads, contacts and deals.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
          New Activity
        </Button>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {(["call", "meeting", "email", "demo"] as const).map((t) => (
          <Col xs={12} md={6} key={t}>
            <Card style={{ borderRadius: 16, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
              <Space>
                <Tag color={TYPE_COLORS[t]} style={{ margin: 0, textTransform: "capitalize" }}>
                  {t}
                </Tag>
                <Badge count={counts[t] ?? 0} />
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ borderRadius: 16, boxShadow: "0 2px 8px rgba(15,23,42,0.06)", marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Input
              allowClear
              placeholder="Search notes, owner, related record..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              allowClear
              placeholder="Filter by type"
              style={{ width: "100%" }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "call", label: "Call" },
                { value: "meeting", label: "Meeting" },
                { value: "email", label: "Email" },
                { value: "demo", label: "Demo" },
              ]}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              allowClear
              placeholder="Related: lead/contact/deal"
              style={{ width: "100%" }}
              value={relatedFilter}
              onChange={setRelatedFilter}
              options={[
                { value: "lead", label: "Lead" },
                { value: "contact", label: "Contact" },
                { value: "deal", label: "Deal" },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 16, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }} styles={{ body: { padding: 16 } }}>
        {loading ? (
          <Text type="secondary">Loading timeline…</Text>
        ) : filtered.length === 0 ? (
          <Empty description="No activities logged yet" />
        ) : (
          <Timeline
            items={filtered.map((a) => ({
              color: TYPE_COLORS[a.activity_type] || "gray",
              children: (
                <div style={{ paddingBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <Space wrap size={8}>
                      <Tag color={TYPE_COLORS[a.activity_type]} style={{ textTransform: "capitalize", margin: 0 }}>
                        {a.activity_type}
                      </Tag>
                      <Text strong>{a.related_to_name || `${a.related_to_type} • ${a.related_to_id.slice(0, 8)}`}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {a.owner_name ? `Owner: ${a.owner_name}` : null}
                      </Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(a.activity_date).format("DD MMM YYYY, hh:mm A")}
                    </Text>
                  </div>
                  {a.notes ? (
                    <div style={{ marginTop: 8 }}>
                      <Text>{a.notes}</Text>
                    </div>
                  ) : null}
                </div>
              ),
            }))}
          />
        )}
      </Card>

      <Drawer
        title="New Activity"
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
            <Button type="primary" onClick={submit}>Log activity</Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ activity_type: "call", related_to_type: "lead" }}
          onValuesChange={(changed) => {
            if (changed.related_to_type) {
              form.setFieldValue("related_to_id", undefined);
            }
          }}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="activity_type" label="Activity Type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "call", label: "Call" },
                    { value: "meeting", label: "Meeting" },
                    { value: "email", label: "Email" },
                    { value: "demo", label: "Demo" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="related_to_type" label="Related To" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "lead", label: "Lead" },
                    { value: "contact", label: "Contact" },
                    { value: "deal", label: "Deal" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="related_to_id" label="Select Record" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Choose related record"
              optionFilterProp="label"
              options={relatedOptions.map((x) => ({ value: x.id, label: x.label }))}
            />
          </Form.Item>

          <Form.Item name="activity_date" label="Activity Date">
            <Input placeholder="Leave empty for now()" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={4} placeholder="Write what happened, next steps, outcomes…" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}


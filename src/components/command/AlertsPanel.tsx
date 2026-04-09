"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  Modal,
  message,
  Badge,
  Space,
  Tooltip,
  Select,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

interface AlertItem {
  id: string;
  alert_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_note: string | null;
  campaign_id: string | null;
  lead_id: string | null;
  created_at: string;
  campaigns?: { name: string } | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "green",
  medium: "orange",
  high: "red",
  critical: "purple",
};

interface AlertsPanelProps {
  campaignId?: string;
}

export default function AlertsPanel({ campaignId }: AlertsPanelProps) {
  const { hasRole } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");
  const [severityFilter, setSeverityFilter] = useState<string>("");

  const canResolve =
    hasRole("internal_operator") ||
    hasRole("internal_admin") ||
    hasRole("admin");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (campaignId) params.set("campaign_id", campaignId);
      if (filter === "unresolved") params.set("resolved", "false");
      if (filter === "resolved") params.set("resolved", "true");
      if (severityFilter) params.set("severity", severityFilter);

      const res = await fetch(`/api/command/alerts?${params.toString()}`);
      const data = await res.json() as { alerts?: AlertItem[] };
      setAlerts(data.alerts ?? []);
    } catch {
      message.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [campaignId, filter, severityFilter]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const handleResolve = async () => {
    if (!resolveModal) return;
    setResolveLoading(true);
    try {
      const res = await fetch(`/api/command/alerts/${resolveModal}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_note: resolveNote }),
      });

      if (res.ok) {
        message.success("Alert resolved");
        setResolveModal(null);
        setResolveNote("");
        void fetchAlerts();
      } else {
        const d = await res.json() as { error?: string };
        message.error(d.error ?? "Failed to resolve alert");
      }
    } catch {
      message.error("Network error");
    } finally {
      setResolveLoading(false);
    }
  };

  const unresolvedCount = alerts.filter((a) => !a.is_resolved).length;
  const criticalCount = alerts.filter(
    (a) => !a.is_resolved && a.severity === "critical"
  ).length;

  const columns: ColumnsType<AlertItem> = [
    {
      title: "Severity",
      dataIndex: "severity",
      width: 90,
      render: (s: string) => (
        <Tag color={SEVERITY_COLORS[s] ?? "default"} style={{ fontWeight: 600 }}>
          {s.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Title",
      key: "title",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{row.title}</div>
          {row.message && (
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>{row.message}</div>
          )}
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "alert_type",
      width: 130,
      render: (t: string) => (
        <Tag>{t.replace(/_/g, " ")}</Tag>
      ),
    },
    {
      title: "Campaign",
      key: "campaign",
      width: 140,
      render: (_, row) =>
        row.campaigns?.name ? (
          <span style={{ fontSize: 12 }}>{row.campaigns.name}</span>
        ) : (
          <span style={{ color: "#8c8c8c" }}>—</span>
        ),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, row) =>
        row.is_resolved ? (
          <Badge status="success" text="Resolved" />
        ) : (
          <Badge status="error" text="Open" />
        ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      width: 130,
      render: (ts: string) => (
        <span style={{ fontSize: 12 }}>
          {new Date(ts).toLocaleDateString()}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      fixed: "right" as const,
      render: (_, row) =>
        !row.is_resolved && canResolve ? (
          <Tooltip title="Resolve alert">
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => setResolveModal(row.id)}
            >
              Resolve
            </Button>
          </Tooltip>
        ) : row.is_resolved ? (
          <span style={{ fontSize: 12, color: "#8c8c8c" }}>
            {row.resolved_at
              ? new Date(row.resolved_at).toLocaleDateString()
              : "—"}
          </span>
        ) : null,
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Space>
          <Badge count={criticalCount} style={{ backgroundColor: "#722ed1" }}>
            <Tag color="red" style={{ fontSize: 13, padding: "4px 10px" }}>
              {unresolvedCount} Open Alerts
            </Tag>
          </Badge>
        </Space>

        <Space wrap>
          <Select
            value={filter}
            onChange={setFilter}
            size="small"
            style={{ width: 130 }}
          >
            <Select.Option value="all">All Alerts</Select.Option>
            <Select.Option value="unresolved">Open Only</Select.Option>
            <Select.Option value="resolved">Resolved</Select.Option>
          </Select>

          <Select
            value={severityFilter || undefined}
            onChange={setSeverityFilter}
            size="small"
            style={{ width: 120 }}
            placeholder="All severities"
            allowClear
          >
            {["low", "medium", "high", "critical"].map((s) => (
              <Select.Option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Select.Option>
            ))}
          </Select>

          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => void fetchAlerts()}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={alerts}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 15, showTotal: (t) => `${t} alerts` }}
        scroll={{ x: 800 }}
        rowClassName={(row) => (row.severity === "critical" ? "bg-red-50" : "")}
      />

      <Modal
        title="Resolve Alert"
        open={Boolean(resolveModal)}
        onCancel={() => {
          setResolveModal(null);
          setResolveNote("");
        }}
        onOk={handleResolve}
        okButtonProps={{ loading: resolveLoading }}
        okText="Mark as Resolved"
      >
        <p style={{ marginBottom: 12, fontSize: 13, color: "#595959" }}>
          Add a resolution note (optional but recommended).
        </p>
        <Input.TextArea
          rows={3}
          value={resolveNote}
          onChange={(e) => setResolveNote(e.target.value)}
          placeholder="Describe what action was taken to resolve this alert…"
        />
      </Modal>
    </div>
  );
}

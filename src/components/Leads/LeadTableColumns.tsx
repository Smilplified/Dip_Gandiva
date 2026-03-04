"use client";

import React from "react";
import { Table, Tag, Button, message } from "antd";
import type { TableProps } from "antd";
import { EditOutlined, CopyOutlined } from "@ant-design/icons";
import type { Lead } from "@/types/lead.types";

const STATUS_COLORS: Record<string, string> = {
  new: "default",
  contacted: "processing",
  interested: "green",
  followup: "gold",
  closed_won: "blue",
  closed_lost: "red",
};

type ColumnConfig = {
  showActions?: boolean;
  onEdit?: (lead: Lead) => void;
};

export function getLeadTableColumns(config: ColumnConfig = {}) {
  const { showActions = true, onEdit } = config;

  const baseColumns: NonNullable<TableProps<Lead>["columns"]> = [
    {
      title: "Sr. No.",
      key: "sr",
      width: 72,
      fixed: "left" as const,
      render: (_: unknown, __: Lead, index: number) => index + 1,
    },
    {
      title: "Lead ID",
      dataIndex: "lead_id",
      key: "lead_id",
      width: 160,
      fixed: "left" as const,
      render: (v: string | null) => {
        const id = v || "";
        if (!id) return "—";
        const copy = (e: React.MouseEvent) => {
          e.stopPropagation();
          navigator.clipboard.writeText(id).then(
            () => message.success("Lead ID copied"),
            () => message.error("Failed to copy")
          );
        };
        return (
          <span className="lead-id-cell" style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{id}</span>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined style={{ fontSize: 12 }} />}
              onClick={copy}
              className="lead-id-copy-btn"
              style={{ padding: "0 4px", minWidth: 24, height: 22, flexShrink: 0 }}
              title="Copy Lead ID"
            />
          </span>
        );
      },
    },
    {
      title: "Name",
      key: "name",
      width: 160,
      ellipsis: true,
      render: (_: unknown, r: Lead) =>
        [r.first_name, r.last_name].filter(Boolean).join(" ") || r.name || "—",
    },
    {
      title: "Company",
      dataIndex: "company_name",
      key: "company_name",
      width: 160,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 180,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 120,
      render: (v: string | null) => (
        <span className="lead-phone-cell" data-no-dialer="true">{v || "—"}</span>
      ),
    },
    {
      title: "Job Title",
      dataIndex: "job_title",
      key: "job_title",
      width: 140,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Industry",
      dataIndex: "industry",
      key: "industry",
      width: 120,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string) => (
        <Tag color={STATUS_COLORS[v] ?? "default"} style={{ textTransform: "capitalize" }}>
          {v?.replace("_", " ")}
        </Tag>
      ),
    },
    {
      title: "QA Status",
      dataIndex: "qa_status",
      key: "qa_status",
      width: 110,
      render: (v: string | null | undefined) =>
        v ? (
          <Tag
            color={
              v === "qualified" ? "green" : v === "disqualified" ? "red" : "blue"
            }
          >
            {v}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Follow-up",
      dataIndex: "followup_date",
      key: "followup_date",
      width: 110,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleDateString() : "—",
    },
    {
      title: "Created By",
      dataIndex: "created_by_name",
      key: "created_by_name",
      width: 140,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 140,
      render: (v: string) =>
        v
          ? new Date(v).toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "—",
    },
  ];

  const extendedColumns = [
    ...baseColumns.slice(0, 4),
    {
      title: "Direct Number",
      dataIndex: "direct_number",
      key: "direct_number",
      width: 120,
      render: (v: string | null) => (
        <span className="lead-phone-cell" data-no-dialer="true">{v || "—"}</span>
      ),
    },
    ...baseColumns.slice(4, 6),
    {
      title: "Corporate Number",
      dataIndex: "company_number",
      key: "company_number",
      width: 120,
      render: (v: string | null) => (
        <span className="lead-phone-cell" data-no-dialer="true">{v || "—"}</span>
      ),
    },
    ...baseColumns.slice(6, 8),
    {
      title: "Employee Size",
      dataIndex: "employee_size",
      key: "employee_size",
      width: 120,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      width: 180,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      width: 100,
      render: (v: string | null) => v || "—",
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      width: 100,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Country",
      dataIndex: "country",
      key: "country",
      width: 100,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Zip",
      dataIndex: "zip_code",
      key: "zip_code",
      width: 90,
      render: (v: string | null) => v || "—",
    },
    ...baseColumns.slice(8),
  ];

  if (showActions && onEdit) {
    extendedColumns.push({
      title: "",
      key: "actions",
      width: 60,
      fixed: "right" as const,
      render: (_: unknown, record: Lead) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(record);
          }}
        />
      ),
    } as never);
  }

  return extendedColumns;
}

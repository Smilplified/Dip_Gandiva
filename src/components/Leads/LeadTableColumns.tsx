"use client";

import React from "react";
import type { HTMLAttributes } from "react";
import { Table, Tag, Button, message, Select } from "antd";
import type { TableProps } from "antd";
import type { ColumnsType, ColumnType } from "antd/es/table";
import { EditOutlined, CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Lead } from "@/types/lead.types";
import { tableSerialNumber } from "@/lib/table-pagination";
import { useAuth } from "@/context/AuthContext";
import { generateLhoPdf, type LhoData } from "@/lib/generateLhoPdf";
import { normalizeRoleName } from "@/lib/auth/config";

const NON_CLIENT_VIEWER_ROLES = new Set([
  "agent",
  "team_leader",
  "tl",
  "operations_manager",
  "admin",
  "qa",
  "mis",
  "sales",
  "sales_manager",
  "dc",
  "internal_operator",
  "internal_admin",
]);

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
  showDeliveryStatus?: boolean;
  /** When false, shows Appointment (timestamptz) instead of QA Status. */
  showQaStatus?: boolean;
  /** Download LHO file column (beside Appointment); uses command LHO API. */
  showLhoFile?: boolean;
  /** API prefix for LHO list, e.g. `/api/command/leads`. */
  lhoApiPrefix?: string;
  onMarkDelivered?: (lead: Lead) => void;
  markingDeliveredLeadId?: string | null;
  /** Pass when the table uses pagination so Sr. No. continues across pages. */
  pagination?: { current: number; pageSize: number };
  /** Hide the Follow-up date column (default: shown). Pass false for Agent role. */
  showFollowupDate?: boolean;
};

function formatLeadAppointment(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const d = dayjs(value);
  if (!d.isValid()) return "—";
  return d.format("MMM D, YYYY, h:mm A");
}

function leadDisplayNameForFile(lead: Lead): string {
  const full = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  const name = lead.name?.trim();
  if (name) return name;
  const company = lead.company_name?.trim();
  if (company) return company;
  return lead.lead_id?.trim() || lead.id;
}

function sanitizeDownloadFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-\s]/g, "_").replace(/\s+/g, " ").trim().slice(0, 200);
}

function fileExtensionFromStorageName(storageName: string): string {
  const base = storageName.includes("/") ? storageName.split("/").pop()! : storageName;
  const stripped = base.replace(/^[0-9a-f-]{36}_/i, "");
  const dot = stripped.lastIndexOf(".");
  return dot >= 0 ? stripped.slice(dot) : "";
}

async function downloadLeadLhoFile(
  lead: Lead,
  apiPrefix: string
): Promise<void> {
  const hide = message.loading("Preparing download…", 0);
  try {
    const res = await fetch(`${apiPrefix}/${lead.id}/lho`);
    const json = (await res.json()) as {
      error?: string;
      files?: { name: string; url: string | null }[];
    };
    if (!res.ok) {
      message.error(json.error ?? "Failed to load LHO file");
      return;
    }
    const file = json.files?.find((f) => f.url);
    if (!file?.url) {
      message.warning("No LHO file uploaded for this lead");
      return;
    }
    const blobRes = await fetch(file.url);
    if (!blobRes.ok) {
      message.error("Failed to download LHO file");
      return;
    }
    const blob = await blobRes.blob();
    const ext = fileExtensionFromStorageName(file.name);
    const base = sanitizeDownloadFileName(leadDisplayNameForFile(lead)) || "lead";
    const filename = ext ? `${base}${ext}` : base;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    message.error("Failed to download LHO file");
  } finally {
    hide();
  }
}

function str(val: unknown): string {
  return val != null ? String(val).trim() : "";
}

function formatDateTimeWithTzFromLead(val: unknown, tz: unknown): string {
  const s = str(val);
  if (!s) return "";
  const d = dayjs(s);
  if (!d.isValid()) return "";
  const wall = d.format("YYYY-MM-DD HH:mm");
  const tzLabel = str(tz);
  return tzLabel ? `${wall} (${tzLabel})` : wall;
}

function normalizeExtraCqMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const v = str(value);
    if (v) out[key] = v;
  }
  return out;
}

function toLhoDataFromLeadRecord(raw: Record<string, unknown>): LhoData {
  return {
    salutation: str(raw.salutation),
    firstName: str(raw.first_name),
    lastName: str(raw.last_name),
    email: str(raw.email),
    phone: str(raw.phone),
    directNumber: str(raw.direct_number),
    jobTitle: str(raw.job_title),
    jobLevel: str(raw.job_level),
    department: str(raw.department),
    jobFunction: str(raw.job_function),
    jobTitleLink: str(raw.job_title_link),
    contactLinkedIn: str(raw.contact_linkedin_url),
    companyName: str(raw.company_name),
    domain: str(raw.domain),
    companyNumber: str(raw.company_number),
    address: str(raw.address),
    city: str(raw.city),
    state: str(raw.state),
    country: str(raw.country),
    zipCode: str(raw.zip_code),
    employeeSize: str(raw.employee_size),
    seeAllEmployees: str(raw.see_all_employees),
    industry: str(raw.industry),
    employeeSizeLink: str(raw.employee_size_link),
    companyWebsite: str(raw.company_website_link),
    companyLinkedIn: str(raw.company_linkedin_url),
    revenueRange: str(raw.revenue_range),
    revenueLink: str(raw.revenue_link),
    sicCode: str(raw.sic_code),
    sicCodeLink: str(raw.sic_code_link),
    naicsCode: str(raw.naics_code),
    naicsCodeLink: str(raw.naics_code_link),
    foundedYears: str(raw.founded_years),
    foundedYearsLink: str(raw.founded_years_link),
    callBack: str(raw.call_back),
    callNotes: str(raw.call_notes),
    cq1: str(raw.cq1),
    cq2: str(raw.cq2),
    cq3: str(raw.cq3),
    cq4: str(raw.cq4),
    cq5: str(raw.cq5),
    extraCq: normalizeExtraCqMap(raw.extra_cq),
    leadStatus: str(raw.status),
    leadTagging: str(raw.lead_tagging),
    assetTitle: str(raw.asset_title),
    status: str(raw.status),
    qaStatus: str(raw.qa_status),
    auditDate: str(raw.audit_date),
    qaName: str(raw.qa_name),
    tenurity: str(raw.tenurity),
    vvStatus: str(raw.vv_status),
    emailStatus: str(raw.email_status),
    evTool: str(raw.ev_tool),
    primaryReason: str(raw.primary_reason),
    secondaryReason: str(raw.secondary_reason),
    qaComments: str(raw.qa_comments),
    scored: formatDateTimeWithTzFromLead(raw.scored, raw.scored_timezone),
    appointment: formatDateTimeWithTzFromLead(raw.appointment, raw.appointment_timezone),
    raComment: str(raw.ra_comment),
    specialComments: str(raw.special_comments),
    notes: str(raw.notes),
  };
}

function LeadLhoDownloadButton({
  lead,
  apiPrefix,
}: {
  lead: Lead;
  apiPrefix: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const { roles, profile } = useAuth();
  return (
    <Button
      type="text"
      size="small"
      icon={<DownloadOutlined />}
      loading={loading}
      title="Download LHO file"
      aria-label="Download LHO file"
      onClick={async () => {
        setLoading(true);
        try {
          const normalizedRoles = roles.map((r) => normalizeRoleName(r.role_name));
          const hasClientViewerRole = normalizedRoles.includes("client_viewer");
          const hasNonClientViewerBusinessRole = normalizedRoles.some((r) =>
            NON_CLIENT_VIEWER_ROLES.has(r)
          );
          const shouldUseClientLogo = hasClientViewerRole && !hasNonClientViewerBusinessRole;
          const clientLogoUrl =
            (profile as { client_logo_url?: string | null } | null)?.client_logo_url ?? null;

          // Client viewers get a freshly generated LHO PDF with client logo.
          // (Storage file download may contain old logo from previous uploads.)
          if (shouldUseClientLogo) {
            const res = await fetch(`${apiPrefix}/${lead.id}`, { credentials: "include" });
            const json = (await res.json().catch(() => ({}))) as {
              error?: string;
              lead?: Record<string, unknown>;
            };
            if (!res.ok || !json.lead) {
              message.error(json.error ?? "Failed to load lead details for LHO");
              return;
            }
            const lhoData = toLhoDataFromLeadRecord(json.lead);
            await generateLhoPdf(lhoData, { logoSrc: clientLogoUrl });
            message.success("LHO PDF downloaded successfully");
            return;
          }

          await downloadLeadLhoFile(lead, apiPrefix);
        } finally {
          setLoading(false);
        }
      }}
    />
  );
}

/** Keeps column titles on one line (use with `table-single-line` on Table). */
export function applyLeadTableHeaderCells<T extends object>(columns: ColumnsType<T>): ColumnsType<T> {
  return columns.map((col) => {
    if (!col || typeof col !== "object") return col;
    const typed = col as ColumnType<T>;
    const width = typeof typed.width === "number" ? typed.width : undefined;
    const prevOnHeaderCell = typed.onHeaderCell;
    return {
      ...typed,
      onHeaderCell: (...args: Parameters<NonNullable<ColumnType<T>["onHeaderCell"]>>) => {
        const prev =
          typeof prevOnHeaderCell === "function"
            ? (prevOnHeaderCell(...args) as HTMLAttributes<HTMLTableCellElement>)
            : {};
        return {
          ...prev,
          style: {
            whiteSpace: "nowrap",
            ...(width != null ? { minWidth: width } : {}),
            ...prev.style,
          },
        };
      },
    };
  });
}

export function getLeadTableColumns(config: ColumnConfig = {}) {
  const {
    showActions = true,
    onEdit,
    showDeliveryStatus = false,
    showQaStatus = true,
    showLhoFile = false,
    lhoApiPrefix = "/api/command/leads",
    onMarkDelivered,
    markingDeliveredLeadId,
    pagination,
    showFollowupDate = true,
  } = config;

  const page = pagination?.current ?? 1;
  const pageSize = pagination?.pageSize ?? 10;

  const baseColumns: NonNullable<TableProps<Lead>["columns"]> = [
    {
      title: "Sr. No.",
      key: "sr",
      width: 72,
      fixed: "left" as const,
      render: (_: unknown, __: Lead, index: number) =>
        tableSerialNumber(page, pageSize, index),
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
          <span
            className="lead-id-cell"
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", minWidth: 0 }}
          >
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {id}
            </span>
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
      title: "Channel",
      dataIndex: "channel",
      key: "channel",
      width: 190,
      ellipsis: true,
      render: (v: string | null | undefined) => v || "—",
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
    ...(showDeliveryStatus
      ? [
          {
            title: "Delivery",
            dataIndex: "delivery_status",
            key: "delivery_status",
            width: 220,
            fixed: "right" as const,
            filters: [
              { text: "Delivered", value: "delivered" },
              { text: "Not Delivered", value: "not_delivered" },
            ],
            onFilter: (value, record) =>
              (record.delivery_status ?? "not_delivered") === String(value),
            render: (v: Lead["delivery_status"], record: Lead) => {
              const status = (v ?? "not_delivered") as "not_delivered" | "delivered";
              const delivered = status === "delivered";
              const deliveredAt = record.delivered_at
                ? dayjs(record.delivered_at).format("MMM D, YYYY h:mm A")
                : null;
              // Allow re-clicking if delivered but delivered_at was never recorded (legacy)
              const canRedeliver = delivered && !record.delivered_at;
              return (
                <span
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                    <Tag color={delivered ? "green" : "default"} style={{ margin: 0 }}>
                      {delivered ? "Delivered" : "Not Delivered"}
                    </Tag>
                    {(!delivered || canRedeliver) && onMarkDelivered ? (
                      <Button
                        type="link"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkDelivered(record);
                        }}
                        loading={markingDeliveredLeadId === record.id}
                        style={{ paddingInline: 0, height: "auto" }}
                      >
                        {canRedeliver ? "Set Delivery Date" : "Mark as Delivered"}
                      </Button>
                    ) : null}
                  </span>
                  {delivered && deliveredAt && (
                    <span style={{ fontSize: 11, color: "#8c8c8c" }}>{deliveredAt}</span>
                  )}
                  {delivered && !deliveredAt && (
                    <span style={{ fontSize: 11, color: "#faad14" }}>Date not recorded</span>
                  )}
                </span>
              );
            },
          } as NonNullable<TableProps<Lead>["columns"]>[number],
        ]
      : []),
    ...(showQaStatus
      ? [
          {
            title: "QA Status",
            dataIndex: "qa_status",
            key: "qa_status",
            width: 110,
            fixed: "right" as const,
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
              <div style={{ padding: 8 }}>
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="Filter QA status"
                  style={{ width: 180, marginBottom: 8, display: "block" }}
                  value={(selectedKeys as string[]) ?? []}
                  options={[
                    { value: "qualified", label: "Qualified" },
                    { value: "disqualified", label: "Disqualified" },
                    { value: "rectified", label: "Rectified" },
                  ]}
                  onChange={(values) => {
                    if (values && values.length > 0) {
                      setSelectedKeys(values);
                    } else {
                      setSelectedKeys([]);
                    }
                    confirm({ closeDropdown: false });
                  }}
                />
                {clearFilters && (
                  <Button
                    onClick={() => {
                      clearFilters();
                      confirm({ closeDropdown: false });
                    }}
                    size="small"
                    style={{ width: "100%" }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            ),
            onFilter: (value, record) =>
              (record.qa_status ?? "").toLowerCase() === String(value).toLowerCase(),
            render: (v: string | null | undefined) =>
              v ? (
                <Tag
                  color={
                    v === "qualified" ? "green" : v === "disqualified" ? "red" : "blue"
                  }
                >
                  {v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()}
                </Tag>
              ) : (
                "—"
              ),
          } as NonNullable<TableProps<Lead>["columns"]>[number],
        ]
      : [
          {
            title: "Appointment",
            dataIndex: "appointment",
            key: "appointment",
            width: 172,
            fixed: "right" as const,
            sorter: true,
            render: (v: string | null | undefined) => {
              const text = formatLeadAppointment(v);
              return (
                <span className="table-text-ellipsis" style={{ whiteSpace: "nowrap" }} title={text}>
                  {text}
                </span>
              );
            },
          } as NonNullable<TableProps<Lead>["columns"]>[number],
          ...(showLhoFile
            ? [
                {
                  title: "LHO file",
                  key: "lho_file",
                  width: 88,
                  fixed: "right" as const,
                  align: "center" as const,
                  render: (_: unknown, record: Lead) => (
                    <LeadLhoDownloadButton lead={record} apiPrefix={lhoApiPrefix} />
                  ),
                } as NonNullable<TableProps<Lead>["columns"]>[number],
              ]
            : []),
        ]),
    ...(showFollowupDate
      ? [
          {
            title: "Follow-up",
            dataIndex: "followup_date",
            key: "followup_date",
            width: 110,
            render: (v: string | null) =>
              v ? new Date(v).toLocaleDateString() : "—",
          } as NonNullable<TableProps<Lead>["columns"]>[number],
        ]
      : []),
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
      filters: [
        { text: "Today", value: "today" },
        { text: "Last 7 days", value: "last7" },
        { text: "Last 30 days", value: "last30" },
        { text: "This month", value: "month" },
        { text: "This quarter", value: "quarter" },
      ],
      onFilter: (value, record) => {
        const created = record.created_at ? dayjs(record.created_at) : null;
        if (!created) return false;
        const now = dayjs();
        switch (value) {
          case "today":
            return created.isSame(now, "day");
          case "last7":
            return created.isAfter(now.subtract(7, "day"));
          case "last30":
            return created.isAfter(now.subtract(30, "day"));
          case "month":
            return created.isSame(now, "month");
          case "quarter":
            return created.year() === now.year() && Math.floor(created.month() / 3) === Math.floor(now.month() / 3);
          default:
            return true;
        }
      },
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
      width: 128,
      render: (v: string | null) => (
        <span className="lead-phone-cell" data-no-dialer="true">{v || "—"}</span>
      ),
    },
    ...baseColumns.slice(4, 6),
    {
      title: "Corporate Number",
      dataIndex: "company_number",
      key: "company_number",
      width: 148,
      render: (v: string | null) => (
        <span className="lead-phone-cell" data-no-dialer="true">{v || "—"}</span>
      ),
    },
    ...baseColumns.slice(6, 8),
    {
      title: "Employee Size",
      dataIndex: "employee_size",
      key: "employee_size",
      width: 150,
      ellipsis: true,
      render: (v: string | null) => (
        <span className="table-text-ellipsis" title={v || "—"}>
          {v || "—"}
        </span>
      ),
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      width: 240,
      ellipsis: true,
      render: (v: string | null) => (
        <span className="table-text-ellipsis" title={v || "—"}>
          {v || "—"}
        </span>
      ),
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      width: 100,
      ellipsis: true,
      render: (v: string | null) => (
        <span className="table-text-ellipsis" title={v || "—"}>
          {v || "—"}
        </span>
      ),
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      width: 100,
      ellipsis: true,
      render: (v: string | null) => (
        <span className="table-text-ellipsis" title={v || "—"}>
          {v || "—"}
        </span>
      ),
    },
    {
      title: "Country",
      dataIndex: "country",
      key: "country",
      width: 100,
      ellipsis: true,
      render: (v: string | null) => (
        <span className="table-text-ellipsis" title={v || "—"}>
          {v || "—"}
        </span>
      ),
    },
    {
      title: "Zip",
      dataIndex: "zip_code",
      key: "zip_code",
      width: 90,
      ellipsis: true,
      render: (v: string | null) => (
        <span className="table-text-ellipsis" title={v || "—"}>
          {v || "—"}
        </span>
      ),
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

  return applyLeadTableHeaderCells(extendedColumns);
}

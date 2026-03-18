"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  DatePicker,
  InputNumber,
  Modal,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  EditOutlined,
  UserSwitchOutlined,
  SwapOutlined,
  SearchOutlined,
} from "@ant-design/icons";

type LeadRow = {
  id: string;
  lead_name: string | null;
  // Contact
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  job_title: string | null;
  linkedin: string | null;
  department: string | null;
  // Company
  company: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  annual_revenue: string | null;
  business_type: string | null;
  gst_number: string | null;
  pan_number: string | null;
  // Address
  country: string | null;
  state: string | null;
  city: string | null;
  zip: string | null;
  address: string | null;
  // Qualification
  budget: string | null;
  decision_maker: string | null;
  purchase_timeline: string | null;
  current_solution: string | null;
  pain_points: string | null;
  requirements: string | null;
  // Source & tracking
  lead_source: string | null;
  source_type: string | null;
  source_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  // Pipeline
  lead_score: number | null;
  deal_stage: string | null;
  deal_value: string | null;
  probability: number | null;
  expected_close_date: string | null;
  product_interest: string | null;
  // Activity
  last_contacted: string | null;
  next_followup: string | null;
  followup_type: string | null;
  interaction_notes: string | null;
  // Qualification & QA
  qualification_status: string | null;
  qa_status: string | null;
  disqualification_reason: string | null;
  rectified_reason: string | null;
  // Ownership & audit
  status: string;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  created_at: string;
  created_by_name?: string | null;
  updated_at?: string | null;
  // Tags
  tags?: string[] | null;
};

type AgentOption = {
  id: string;
  name: string;
  department: string | null;
};

dayjs.extend(quarterOfYear);

type DateRangeKey =
  | "search"
  | "today"
  | "all_today"
  | "yesterday"
  | "tomorrow"
  | "this_week"
  | "this_week_so_far"
  | "last_week"
  | "next_week"
  | "this_month"
  | "this_month_so_far"
  | "last_month"
  | "next_month"
  | "this_quarter"
  | "this_fiscal_quarter"
  | "this_quarter_so_far"
  | "this_fiscal_quarter_so_far"
  | "last_quarter"
  | "last_fiscal_quarter"
  | "next_quarter"
  | "next_fiscal_quarter"
  | "this_year"
  | "this_fiscal_year"
  | "this_year_so_far"
  | "this_fiscal_year_so_far"
  | "last_year"
  | "last_fiscal_year"
  | "next_year"
  | "next_fiscal_year"
  | "last_7_days"
  | "last_14_days"
  | "last_30_days"
  | "last_60_days"
  | "last_90_days"
  | "last_180_days"
  | "last_365_days";

const CREATED_DATE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: "search", label: "Search" },
  { value: "today", label: "Today" },
  { value: "all_today", label: "All of today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this_week", label: "This week" },
  { value: "this_week_so_far", label: "This week so far" },
  { value: "last_week", label: "Last week" },
  { value: "next_week", label: "Next week" },
  { value: "this_month", label: "This month" },
  { value: "this_month_so_far", label: "This month so far" },
  { value: "last_month", label: "Last month" },
  { value: "next_month", label: "Next month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "this_fiscal_quarter", label: "This fiscal quarter" },
  { value: "this_quarter_so_far", label: "This quarter so far" },
  { value: "this_fiscal_quarter_so_far", label: "This fiscal quarter so far" },
  { value: "last_quarter", label: "Last quarter" },
  { value: "last_fiscal_quarter", label: "Last fiscal quarter" },
  { value: "next_quarter", label: "Next quarter" },
  { value: "next_fiscal_quarter", label: "Next fiscal quarter" },
  { value: "this_year", label: "This year" },
  { value: "this_fiscal_year", label: "This fiscal year" },
  { value: "this_year_so_far", label: "This year so far" },
  { value: "this_fiscal_year_so_far", label: "This fiscal year so far" },
  { value: "last_year", label: "Last year" },
  { value: "last_fiscal_year", label: "Last fiscal year" },
  { value: "next_year", label: "Next year" },
  { value: "next_fiscal_year", label: "Next fiscal year" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_14_days", label: "Last 14 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_60_days", label: "Last 60 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "last_180_days", label: "Last 180 days" },
  { value: "last_365_days", label: "Last 365 days" },
];

function startOfWeekMonday(d: dayjs.Dayjs) {
  const dow = d.day(); // 0 Sun .. 6 Sat
  const diff = (dow + 6) % 7; // Mon=0 ... Sun=6
  return d.subtract(diff, "day").startOf("day");
}

function endOfWeekSunday(d: dayjs.Dayjs) {
  return startOfWeekMonday(d).add(6, "day").endOf("day");
}

function getFiscalYearStart(d: dayjs.Dayjs) {
  // Fiscal year: Apr 1 -> Mar 31
  const fiscalStartMonth = 3; // 0-based: 3 = April
  const y = d.month() >= fiscalStartMonth ? d.year() : d.year() - 1;
  return dayjs(new Date(y, fiscalStartMonth, 1)).startOf("day");
}

function getFiscalQuarterStart(d: dayjs.Dayjs) {
  const fyStart = getFiscalYearStart(d); // Apr 1
  const monthsSince = d.diff(fyStart, "month");
  const qIndex = Math.floor(monthsSince / 3);
  return fyStart.add(qIndex * 3, "month").startOf("day");
}

function rangeForCreatedDate(key: DateRangeKey, now = dayjs()): [dayjs.Dayjs, dayjs.Dayjs] | null {
  const todayStart = now.startOf("day");
  const todayEnd = now.endOf("day");
  const yesterdayStart = todayStart.subtract(1, "day");
  const yesterdayEnd = todayEnd.subtract(1, "day");
  const tomorrowStart = todayStart.add(1, "day");
  const tomorrowEnd = todayEnd.add(1, "day");

  switch (key) {
    case "search":
      return null;
    case "today":
    case "all_today":
      return [todayStart, todayEnd];
    case "yesterday":
      return [yesterdayStart, yesterdayEnd];
    case "tomorrow":
      return [tomorrowStart, tomorrowEnd];
    case "this_week": {
      const s = startOfWeekMonday(now);
      return [s, endOfWeekSunday(s)];
    }
    case "this_week_so_far": {
      const s = startOfWeekMonday(now);
      return [s, now.endOf("day")];
    }
    case "last_week": {
      const s = startOfWeekMonday(now).subtract(7, "day");
      return [s, endOfWeekSunday(s)];
    }
    case "next_week": {
      const s = startOfWeekMonday(now).add(7, "day");
      return [s, endOfWeekSunday(s)];
    }
    case "this_month":
      return [now.startOf("month").startOf("day"), now.endOf("month").endOf("day")];
    case "this_month_so_far":
      return [now.startOf("month").startOf("day"), now.endOf("day")];
    case "last_month": {
      const d = now.subtract(1, "month");
      return [d.startOf("month").startOf("day"), d.endOf("month").endOf("day")];
    }
    case "next_month": {
      const d = now.add(1, "month");
      return [d.startOf("month").startOf("day"), d.endOf("month").endOf("day")];
    }
    case "this_quarter":
      return [now.startOf("quarter").startOf("day"), now.endOf("quarter").endOf("day")];
    case "this_quarter_so_far":
      return [now.startOf("quarter").startOf("day"), now.endOf("day")];
    case "last_quarter": {
      const d = now.subtract(1, "quarter");
      return [d.startOf("quarter").startOf("day"), d.endOf("quarter").endOf("day")];
    }
    case "next_quarter": {
      const d = now.add(1, "quarter");
      return [d.startOf("quarter").startOf("day"), d.endOf("quarter").endOf("day")];
    }
    case "this_year":
      return [now.startOf("year").startOf("day"), now.endOf("year").endOf("day")];
    case "this_year_so_far":
      return [now.startOf("year").startOf("day"), now.endOf("day")];
    case "last_year": {
      const d = now.subtract(1, "year");
      return [d.startOf("year").startOf("day"), d.endOf("year").endOf("day")];
    }
    case "next_year": {
      const d = now.add(1, "year");
      return [d.startOf("year").startOf("day"), d.endOf("year").endOf("day")];
    }
    case "this_fiscal_year": {
      const s = getFiscalYearStart(now);
      return [s, s.add(1, "year").subtract(1, "day").endOf("day")];
    }
    case "this_fiscal_year_so_far": {
      const s = getFiscalYearStart(now);
      return [s, now.endOf("day")];
    }
    case "last_fiscal_year": {
      const s = getFiscalYearStart(now).subtract(1, "year");
      return [s, s.add(1, "year").subtract(1, "day").endOf("day")];
    }
    case "next_fiscal_year": {
      const s = getFiscalYearStart(now).add(1, "year");
      return [s, s.add(1, "year").subtract(1, "day").endOf("day")];
    }
    case "this_fiscal_quarter": {
      const s = getFiscalQuarterStart(now);
      return [s, s.add(3, "month").subtract(1, "day").endOf("day")];
    }
    case "this_fiscal_quarter_so_far": {
      const s = getFiscalQuarterStart(now);
      return [s, now.endOf("day")];
    }
    case "last_fiscal_quarter": {
      const s = getFiscalQuarterStart(now).subtract(3, "month");
      return [s, s.add(3, "month").subtract(1, "day").endOf("day")];
    }
    case "next_fiscal_quarter": {
      const s = getFiscalQuarterStart(now).add(3, "month");
      return [s, s.add(3, "month").subtract(1, "day").endOf("day")];
    }
    case "last_7_days":
      return [todayStart.subtract(7, "day"), yesterdayEnd];
    case "last_14_days":
      return [todayStart.subtract(14, "day"), yesterdayEnd];
    case "last_30_days":
      return [todayStart.subtract(30, "day"), yesterdayEnd];
    case "last_60_days":
      return [todayStart.subtract(60, "day"), yesterdayEnd];
    case "last_90_days":
      return [todayStart.subtract(90, "day"), yesterdayEnd];
    case "last_180_days":
      return [todayStart.subtract(180, "day"), yesterdayEnd];
    case "last_365_days":
      return [todayStart.subtract(365, "day"), yesterdayEnd];
    default:
      return null;
  }
}

// Values must match allowed DB status values on leads.status
// Labels are user-friendly names for the UI.
const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Qualified" }, // mapped to DB status "interested"
  { value: "closed_lost", label: "Lost" },     // mapped to DB status "closed_lost"
];

const STATUS_COLORS: Record<string, string> = {
  new: "blue",
  contacted: "gold",
  interested: "green",
  closed_lost: "red",
};

const { Title, Text } = Typography;

export default function SalesLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string | undefined>();
  const [createdPreset, setCreatedPreset] = useState<DateRangeKey | undefined>();
  const [createdRange, setCreatedRange] = useState<[any, any] | null>(null); // used only when createdPreset === "search"
  const [lastActivityRange, setLastActivityRange] = useState<[any, any] | null>(null);
  const [lastActivityByLeadId, setLastActivityByLeadId] = useState<Record<string, string>>({});

  const [editingLead, setEditingLead] = useState<LeadRow | null>(null);
  const [assigningLead, setAssigningLead] = useState<LeadRow | null>(null);
  const [convertingLead, setConvertingLead] = useState<LeadRow | null>(null);
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);

  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, actRes] = await Promise.all([
        fetch("/api/sales/leads", { credentials: "include" }),
        fetch("/api/sales/activities?related_to_type=lead", { credentials: "include" }),
      ]);
      const json = await res.json();
      const actJson = await actRes.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to load leads");
      }
      setLeads(json.leads ?? []);
      setAgents(json.agents ?? []);

      if (actRes.ok) {
        const map: Record<string, string> = {};
        ((actJson.activities ?? []) as { related_to_id: string; activity_date: string }[]).forEach((a) => {
          const prev = map[a.related_to_id];
          if (!prev || new Date(a.activity_date) > new Date(prev)) {
            map[a.related_to_id] = a.activity_date;
          }
        });
        setLastActivityByLeadId(map);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateDrawer = () => {
    setEditingLead(null);
    form.resetFields();
    setLeadDrawerOpen(true);
  };

  const handleEdit = (lead: LeadRow) => {
    setEditingLead(lead);
    const fullName = lead.lead_name ?? "";
    const [firstName, ...lastParts] = fullName.trim().split(" ");
    const lastName = lastParts.join(" ");
    form.setFieldsValue({
      // Basic identity
      lead_name: lead.lead_name ?? "",
      first_name: firstName || "",
      last_name: lastName || "",
      // Contact
      company: lead.company ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      alt_phone: lead.alt_phone ?? "",
      job_title: lead.job_title ?? "",
      linkedin: lead.linkedin ?? "",
      department: lead.department ?? "",
      // Lead meta
      lead_source: lead.lead_source ?? "",
      status: lead.status,
      lead_score: lead.lead_score ?? undefined,
      // Company
      website: lead.website ?? "",
      industry: lead.industry ?? "",
      company_size: lead.company_size ?? "",
      annual_revenue: lead.annual_revenue ?? "",
      business_type: lead.business_type ?? "",
      gst_number: lead.gst_number ?? "",
      pan_number: lead.pan_number ?? "",
      // Address
      country: lead.country ?? "",
      state: lead.state ?? "",
      city: lead.city ?? "",
      zip: lead.zip ?? "",
      address: lead.address ?? "",
      // Qualification
      budget: lead.budget ?? "",
      decision_maker: lead.decision_maker ?? "",
      purchase_timeline: lead.purchase_timeline ?? "",
      current_solution: lead.current_solution ?? "",
      pain_points: lead.pain_points ?? "",
      requirements: lead.requirements ?? "",
      // Source details
      source_type: lead.source_type ?? "",
      source_campaign: lead.source_campaign ?? "",
      utm_source: lead.utm_source ?? "",
      utm_medium: lead.utm_medium ?? "",
      utm_campaign: lead.utm_campaign ?? "",
      // Pipeline
      deal_stage: lead.deal_stage ?? "",
      deal_value: lead.deal_value ?? "",
      probability: lead.probability ?? undefined,
      expected_close_date: lead.expected_close_date
        ? dayjs(lead.expected_close_date)
        : null,
      product_interest: lead.product_interest ?? "",
      // Activity
      last_contacted: lead.last_contacted ? dayjs(lead.last_contacted) : null,
      next_followup: lead.next_followup ? dayjs(lead.next_followup) : null,
      followup_type: lead.followup_type ?? "",
      interaction_notes: lead.interaction_notes ?? "",
      // Qualification & QA
      qualification_status: lead.qualification_status ?? "",
      qa_status: lead.qa_status ?? "",
      disqualification_reason: lead.disqualification_reason ?? "",
      rectified_reason: lead.rectified_reason ?? "",
      // Owner / audit
      assigned_owner: lead.assigned_to_id ?? undefined,
      created_by: lead.created_by_name ?? "",
      updated_by: "",
      created_at: lead.created_at ? dayjs(lead.created_at) : null,
      updated_at: lead.updated_at ? dayjs(lead.updated_at) : null,
      lead_created_at: lead.created_at ? dayjs(lead.created_at) : null,
      // Tags
      tags: lead.tags ?? [],
    });
    setLeadDrawerOpen(true);
  };

  const handleSubmitLead = async () => {
    try {
      const values = await form.validateFields();
      const composedLeadName =
        values.lead_name ||
        [values.first_name, values.last_name].filter((p: string) => p && p.trim()).join(" ").trim() ||
        null;
      const payload = {
        lead_name: composedLeadName,
        first_name: values.first_name || null,
        last_name: values.last_name || null,
        company: values.company || null,
        email: values.email || null,
        phone: values.phone || null,
        alt_phone: values.alt_phone || null,
        job_title: values.job_title || null,
        linkedin: values.linkedin || null,
        department: values.department || null,
        lead_source: values.lead_source || null,
        status: values.status || "new",
        lead_score:
          typeof values.lead_score === "number" ? values.lead_score : null,
        website: values.website || null,
        industry: values.industry || null,
        company_size: values.company_size || null,
        annual_revenue: values.annual_revenue || null,
        business_type: values.business_type || null,
        gst_number: values.gst_number || null,
        pan_number: values.pan_number || null,
        country: values.country || null,
        state: values.state || null,
        city: values.city || null,
        zip: values.zip || null,
        address: values.address || null,
        budget: values.budget || null,
        decision_maker: values.decision_maker || null,
        purchase_timeline: values.purchase_timeline || null,
        current_solution: values.current_solution || null,
        pain_points: values.pain_points || null,
        requirements: values.requirements || null,
        source_type: values.source_type || null,
        source_campaign: values.source_campaign || null,
        utm_source: values.utm_source || null,
        utm_medium: values.utm_medium || null,
        utm_campaign: values.utm_campaign || null,
        deal_stage: values.deal_stage || null,
        deal_value: values.deal_value || null,
        probability:
          typeof values.probability === "number" ? values.probability : null,
        expected_close_date: values.expected_close_date || null,
        product_interest: values.product_interest || null,
        last_contacted: values.last_contacted || null,
        next_followup: values.next_followup || null,
        followup_type: values.followup_type || null,
        interaction_notes: values.interaction_notes || null,
        qualification_status: values.qualification_status || null,
        qa_status: values.qa_status || null,
        disqualification_reason: values.disqualification_reason || null,
        rectified_reason: values.rectified_reason || null,
        tags: values.tags || [],
      };

      if (!editingLead) {
        const res = await fetch("/api/sales/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to create lead");
        }
        message.success("Lead created");
      } else {
        const res = await fetch(`/api/sales/leads/${editingLead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to update lead");
        }
        message.success("Lead updated");
      }

      setEditingLead(null);
      setLeadDrawerOpen(false);
      form.resetFields();
      // Clear filters so the newly created/updated lead is always visible
      setSearch("");
      setStatusFilter([]);
      setOwnerFilter(undefined);
      fetchData();
    } catch (err) {
      if (err instanceof Error && err.message) {
        message.error(err.message);
      }
    }
  };

  const handleAssign = (lead: LeadRow) => {
    setAssigningLead(lead);
    assignForm.setFieldsValue({
      assigned_to_id: lead.assigned_to_id ?? undefined,
    });
  };

  const handleSubmitAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      const res = await fetch(`/api/sales/leads/${assigningLead?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          assigned_to_id: values.assigned_to_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to assign lead");
      }
      message.success("Lead assignment updated");
      setAssigningLead(null);
      assignForm.resetFields();
      fetchData();
    } catch (err) {
      if (err instanceof Error && err.message) {
        message.error(err.message);
      }
    }
  };

  const handleConvert = async (lead: LeadRow) => {
    setConvertingLead(lead);
    try {
      const res = await fetch(`/api/sales/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ convert_to_contact: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to convert lead");
      }
      message.success("Lead converted to contact & account");
      setConvertingLead(null);
      fetchData();
    } catch (err) {
      setConvertingLead(null);
      if (err instanceof Error && err.message) {
        message.error(err.message);
      }
    }
  };

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const createdPresetRange =
      createdPreset && createdPreset !== "search" ? rangeForCreatedDate(createdPreset) : null;
    const createdFrom = (createdPresetRange?.[0] ?? createdRange?.[0]) ?? null;
    const createdTo = (createdPresetRange?.[1] ?? createdRange?.[1]) ?? null;

    return leads.filter((l) => {
      const matchesSearch =
        !q ||
        (l.lead_name ?? "").toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.phone ?? "").toLowerCase().includes(q) ||
        (l.lead_source ?? "").toLowerCase().includes(q);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(l.status);
      const matchesOwner = !ownerFilter || l.assigned_to_id === ownerFilter;
      const matchesCreated =
        !createdFrom ||
        (l.created_at &&
          new Date(l.created_at) >= createdFrom.toDate() &&
          new Date(l.created_at) <= createdTo!.toDate());
      const lastAct = lastActivityByLeadId[l.id];
      const matchesLastActivity =
        !lastActivityRange ||
        (lastAct &&
          new Date(lastAct) >= lastActivityRange[0].toDate() &&
          new Date(lastAct) <= lastActivityRange[1].toDate());
      return matchesSearch && matchesStatus && matchesOwner && matchesCreated && matchesLastActivity;
    });
  }, [
    leads,
    search,
    statusFilter,
    ownerFilter,
    createdPreset,
    createdRange,
    lastActivityRange,
    lastActivityByLeadId,
  ]);

  const rowSelection = {
    preserveSelectedRowKeys: true,
  } as const;

  const columns: ColumnsType<LeadRow> = [
    {
      title: "Lead Name",
      dataIndex: "lead_name",
      key: "lead_name",
      width: 160,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Company",
      dataIndex: "company",
      key: "company",
      width: 160,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 140,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Lead Source",
      dataIndex: "lead_source",
      key: "lead_source",
      width: 140,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      filters: LEAD_STATUS_OPTIONS.map((o) => ({ text: o.label, value: o.value })),
      onFilter: (value, record) =>
        record.status === String(value),
      render: (v: string) => (
        <Tag color={STATUS_COLORS[v] ?? "default"}>
          {LEAD_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
        </Tag>
      ),
    },
    {
      title: "Assigned To",
      dataIndex: "assigned_to_name",
      key: "assigned_to_name",
      width: 180,
      ellipsis: true,
      render: (v: string | null) => v || "Unassigned",
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right" as const,
      width: 210,
      render: (_: unknown, record: LeadRow) => (
        <Space size="small">
          <Tooltip title="Edit lead">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Assign to sales agent">
            <Button
              type="text"
              size="small"
              icon={<UserSwitchOutlined />}
              onClick={() => handleAssign(record)}
            />
          </Tooltip>
          <Tooltip title="Convert to contact + account">
            <Button
              type="text"
              size="small"
              icon={<SwapOutlined />}
              onClick={() => handleConvert(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "0 4px" }}>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 26 }}>
            Leads
          </Title>
          <Text type="secondary">
            Manage and qualify leads before converting them into contacts and accounts.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateDrawer}
        >
          New Lead
        </Button>
      </div>

      <Card
        bodyStyle={{ padding: 16 }}
        style={{
          borderRadius: 16,
          boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
          marginBottom: 24,
        }}
      >
        <Row gutter={[16, 16]} wrap>
          <Col xs={24} sm={12} lg={10}>
            <Input
              allowClear
              placeholder="Search by name, company, email, phone or source..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={6} lg={7}>
            <Select
              allowClear
              mode="multiple"
              maxTagCount="responsive"
              showSearch
              optionFilterProp="label"
              placeholder="Filter by status"
              style={{ width: "100%" }}
              value={statusFilter}
              onChange={(v) => setStatusFilter((v as string[]) ?? [])}
              options={LEAD_STATUS_OPTIONS}
            />
          </Col>
          <Col xs={12} sm={6} lg={7}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Filter by owner"
              style={{ width: "100%" }}
              value={ownerFilter}
              onChange={setOwnerFilter}
              options={agents.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} lg={7}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Created date"
              style={{ width: "100%" }}
              value={createdPreset}
              onChange={(v) => {
                setCreatedPreset((v as DateRangeKey | undefined) ?? undefined);
                setCreatedRange(null);
              }}
              options={CREATED_DATE_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={12} lg={7}>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              placeholder={["Custom from", "to"]}
              disabled={createdPreset !== "search"}
              value={createdRange as any}
              onChange={(v) => setCreatedRange((v as any) ?? null)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} lg={7}>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              placeholder={["Last activity from", "to"]}
              value={lastActivityRange as any}
              onChange={(v) => setLastActivityRange((v as any) ?? null)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <Card
        bodyStyle={{ padding: 0 }}
        style={{
          borderRadius: 16,
          boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
        }}
      >
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredLeads}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200, y: 480 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t) => `Total ${t} leads`,
          }}
          size="middle"
        />
      </Card>

      <Drawer
        title={editingLead ? "Edit Lead" : "New Lead"}
        placement="right"
        width={520}
        open={leadDrawerOpen}
        onClose={() => {
          setLeadDrawerOpen(false);
          setEditingLead(null);
          form.resetFields();
        }}
        destroyOnClose
        extra={
          <Space>
            <Button
              onClick={() => {
                setLeadDrawerOpen(false);
                setEditingLead(null);
                form.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" onClick={handleSubmitLead}>
              {editingLead ? "Save changes" : "Create lead"}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: "new",
          }}
        >
          <Title level={5} style={{ marginTop: 0 }}>
            Basic Lead Information
          </Title>
          <Row gutter={12}>
            {editingLead && (
              <Col span={24}>
                <Form.Item label="Lead ID">
                  <Input value={editingLead.id.slice(0, 8)} disabled />
                </Form.Item>
              </Col>
            )}
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="status" label="Lead Status">
                <Select options={LEAD_STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lead_source" label="Lead Source">
                <Input placeholder="Website, Campaign, Referral, etc." />
              </Form.Item>
            </Col>
          </Row>
          {editingLead && (
            <Row gutter={12}>
              <Col span={24}>
                <Form.Item label="Lead Owner / Sales Agent">
                  <Select
                    allowClear
                    placeholder="Select owner"
                    options={agents.map((a) => ({
                      value: a.id,
                      label: a.name,
                    }))}
                    disabled
                  />
                </Form.Item>
              </Col>
            </Row>
          )}
          <Row gutter={12}>
            {editingLead && (
              <Col span={12}>
                <Form.Item label="Lead Created Date">
                  <DatePicker style={{ width: "100%" }} disabled />
                </Form.Item>
              </Col>
            )}
          </Row>
          <Form.Item name="lead_score" label="Lead Score">
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>

          <Title level={5} style={{ marginTop: 24 }}>
            Contact Person Details
          </Title>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="first_name" label="First Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last Name">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="job_title" label="Job Title / Designation">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email Address">
            <Input type="email" placeholder="name@company.com" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="phone" label="Mobile Number">
                <Input placeholder="+1 (555) 000-0000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="alt_phone" label="Alternate Phone Number">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="linkedin" label="LinkedIn Profile">
            <Input placeholder="https://linkedin.com/in/..." />
          </Form.Item>
          <Form.Item name="department" label="Department">
            <Input />
          </Form.Item>

          <Title level={5} style={{ marginTop: 24 }}>
            Company Information
          </Title>
          <Form.Item name="company" label="Company Name">
            <Input />
          </Form.Item>
          <Form.Item name="website" label="Company Website">
            <Input placeholder="https://company.com" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="industry" label="Industry">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="company_size" label="Company Size (Employees)">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="annual_revenue" label="Annual Revenue">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="business_type" label="Business Type">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="gst_number" label="GST Number">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="pan_number" label="PAN Number">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ marginTop: 24 }}>
            Address Details
          </Title>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="country" label="Country">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="state" label="State">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="city" label="City">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="zip" label="Zip / Postal Code">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Full Address">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Title level={5} style={{ marginTop: 24 }}>
            Sales Qualification
          </Title>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="budget" label="Budget">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="decision_maker" label="Decision Maker (Yes/No)">
                <Select
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="purchase_timeline" label="Purchase Timeline">
            <Input />
          </Form.Item>
          <Form.Item name="current_solution" label="Current Solution / Vendor">
            <Input />
          </Form.Item>
          <Form.Item name="pain_points" label="Pain Points">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="requirements" label="Requirements / Notes">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Title level={5} style={{ marginTop: 24 }}>
            Lead Source & Tracking
          </Title>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="source_type" label="Source Type">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source_campaign" label="Source Campaign">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="utm_source" label="UTM Source">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="utm_medium" label="UTM Medium">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="utm_campaign" label="UTM Campaign">
            <Input />
          </Form.Item>

          <Title level={5} style={{ marginTop: 24 }}>
            Sales Pipeline
          </Title>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="deal_stage" label="Deal Stage">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deal_value" label="Deal Value">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="probability" label="Probability (%)">
                <InputNumber min={0} max={100} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expected_close_date" label="Expected Close Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="product_interest" label="Product Interest">
            <Input />
          </Form.Item>

          <Title level={5} style={{ marginTop: 24 }}>
            Activity & Tracking
          </Title>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="last_contacted" label="Last Contacted Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="next_followup" label="Next Follow-up Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="followup_type" label="Follow-up Type">
            <Select
              options={[
                { value: "call", label: "Call" },
                { value: "email", label: "Email" },
                { value: "meeting", label: "Meeting" },
              ]}
            />
          </Form.Item>
          <Form.Item name="interaction_notes" label="Interaction Notes">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Title level={5} style={{ marginTop: 24 }}>
            Qualification & Disqualification
          </Title>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="qualification_status" label="Lead Qualification Status">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="qa_status" label="QA Status">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="disqualification_reason" label="Disqualification Reason">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="rectified_reason" label="Rectified Reason">
            <Input.TextArea rows={2} />
          </Form.Item>

          {editingLead && (
            <>
              <Title level={5} style={{ marginTop: 24 }}>
                Internal CRM Fields
              </Title>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="created_by" label="Created By">
                    <Input disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="updated_by" label="Updated By">
                    <Input disabled />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="created_at" label="Created At">
                    <DatePicker style={{ width: "100%" }} disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="updated_at" label="Updated At">
                    <DatePicker style={{ width: "100%" }} disabled />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
          <Form.Item name="tags" label="Tags / Labels">
            <Select
              mode="tags"
              tokenSeparators={[","]}
              placeholder="Add tags like: high-priority, partner, etc."
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title="Assign Lead to Sales Agent"
        open={assigningLead !== null}
        onCancel={() => {
          setAssigningLead(null);
          assignForm.resetFields();
        }}
        onOk={handleSubmitAssign}
        okText="Update assignment"
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="assigned_to_id"
            label="Sales Agent"
            rules={[{ required: false }]}
          >
            <Select
              allowClear
              placeholder="Select sales agent"
              options={agents.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


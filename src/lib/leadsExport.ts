import type { Lead } from "@/types/lead.types";

/**
 * All lead fields in export order (matches database / Lead type).
 * Header = column name in CSV; key = property on Lead.
 */
const CSV_COLUMNS: { key: keyof Lead | string; header: string }[] = [
  { key: "id", header: "id" },
  { key: "campaign_id", header: "campaign_id" },
  { key: "lead_id", header: "lead_id" },
  { key: "salutation", header: "salutation" },
  { key: "first_name", header: "first_name" },
  { key: "last_name", header: "last_name" },
  { key: "name", header: "name" },
  { key: "company_name", header: "company_name" },
  { key: "domain", header: "domain" },
  { key: "email", header: "email" },
  { key: "phone", header: "phone" },
  { key: "direct_number", header: "direct_number" },
  { key: "company_number", header: "company_number" },
  { key: "phone_number_link", header: "phone_number_link" },
  { key: "job_title", header: "job_title" },
  { key: "job_level", header: "job_level" },
  { key: "department", header: "department" },
  { key: "job_title_link", header: "job_title_link" },
  { key: "job_function", header: "job_function" },
  { key: "tenurity", header: "tenurity" },
  { key: "vv_status", header: "vv_status" },
  { key: "email_status", header: "email_status" },
  { key: "ev_tool", header: "ev_tool" },
  { key: "address", header: "address" },
  { key: "city", header: "city" },
  { key: "state", header: "state" },
  { key: "country", header: "country" },
  { key: "zip_code", header: "zip_code" },
  { key: "employee_size", header: "employee_size" },
  { key: "see_all_employees", header: "see_all_employees" },
  { key: "industry", header: "industry" },
  { key: "employee_size_link", header: "employee_size_link" },
  { key: "company_website_link", header: "company_website_link" },
  { key: "revenue_range", header: "revenue_range" },
  { key: "revenue_link", header: "revenue_link" },
  { key: "sic_code", header: "sic_code" },
  { key: "sic_code_link", header: "sic_code_link" },
  { key: "naics_code", header: "naics_code" },
  { key: "naics_code_link", header: "naics_code_link" },
  { key: "founded_years", header: "founded_years" },
  { key: "founded_years_link", header: "founded_years_link" },
  { key: "contact_linkedin_url", header: "contact_linkedin_url" },
  { key: "company_linkedin_url", header: "company_linkedin_url" },
  { key: "scored", header: "scored" },
  { key: "appointment", header: "appointment" },
  { key: "lead_tagging", header: "lead_tagging" },
  { key: "ra_comment", header: "ra_comment" },
  { key: "special_comments", header: "special_comments" },
  { key: "call_back", header: "call_back" },
  { key: "call_notes", header: "call_notes" },
  { key: "primary_reason", header: "primary_reason" },
  { key: "secondary_reason", header: "secondary_reason" },
  { key: "qa_comments", header: "qa_comments" },
  { key: "cq1", header: "cq1" },
  { key: "cq2", header: "cq2" },
  { key: "cq3", header: "cq3" },
  { key: "cq4", header: "cq4" },
  { key: "cq5", header: "cq5" },
  { key: "audit_date", header: "audit_date" },
  { key: "asset_title", header: "asset_title" },
  { key: "status", header: "status" },
  { key: "qa_status", header: "qa_status" },
  { key: "disqualification_reasons", header: "disqualification_reasons" },
  { key: "disqualification_reason", header: "disqualification_reason" },
  { key: "rectified_reason", header: "rectified_reason" },
  { key: "lead_disposition", header: "lead_disposition" },
  { key: "followup_date", header: "followup_date" },
  { key: "notes", header: "notes" },
  { key: "created_by", header: "created_by" },
  { key: "created_by_name", header: "created_by_name" },
  { key: "created_at", header: "created_at" },
  { key: "updated_at", header: "updated_at" },
];

function escapeCsvValue(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function leadsToCsv(leads: Lead[]): string {
  const headers = CSV_COLUMNS.map((c) => c.header).join(",");
  const rows = leads.map((lead) => {
    const record = lead as Record<string, unknown>;
    return CSV_COLUMNS.map((c) => escapeCsvValue(record[c.key] as string | number | null | undefined)).join(",");
  });
  return [headers, ...rows].join("\n");
}

export function downloadCsv(leads: Lead[], filename?: string): void {
  const csv = leadsToCsv(leads);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

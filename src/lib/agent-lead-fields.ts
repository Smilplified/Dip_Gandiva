/**
 * Lead fields agents must not edit via export/import/PATCH.
 * QA, MIS, and system workflows still set these on the server.
 */
export const AGENT_READONLY_LEAD_FIELDS = [
  "created_by",
  "created_by_name",
  "created_at",
  "updated_at",
  "qa_status",
  "disqualification_reasons",
  "disqualification_reason",
  "rectified_reason",
  "lead_disposition",
  "delivery_status",
  "qa_comments",
] as const;

export const AGENT_READONLY_LEAD_FIELD_SET = new Set<string>(
  AGENT_READONLY_LEAD_FIELDS
);

/** Additional columns hidden from agent downloads only (not agent-editable). */
export const AGENT_EXPORT_ONLY_HIDDEN_FIELDS = [
  "id",
  "campaign_id",
  "asset_title",
  "audit_date",
  "qa_name",
  "tenurity",
  "vv_status",
  "email_status",
  "ev_tool",
  "primary_reason",
  "secondary_reason",
  "cq1",
  "cq2",
  "cq3",
  "cq4",
  "cq5",
] as const;

export function isHiddenFromAgentExport(columnKey: string): boolean {
  return (
    AGENT_READONLY_LEAD_FIELD_SET.has(columnKey) ||
    (AGENT_EXPORT_ONLY_HIDDEN_FIELDS as readonly string[]).includes(columnKey)
  );
}

export function stripAgentReadonlyLeadFields<T extends Record<string, unknown>>(
  payload: T
): T {
  const out = { ...payload };
  for (const key of AGENT_READONLY_LEAD_FIELD_SET) {
    delete out[key];
  }
  return out;
}

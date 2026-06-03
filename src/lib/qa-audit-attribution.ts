/** Normalize person names for matching qa_name to users.full_name / email */
export function normalizePersonName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export type QaUserRef = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export function buildQaNameToIdMap(
  qaUsers: QaUserRef[],
  label: (u: QaUserRef) => string
): Map<string, string> {
  const map = new Map<string, string>();
  for (const qa of qaUsers) {
    map.set(normalizePersonName(label(qa)), qa.id);
    if (qa.full_name?.trim()) map.set(normalizePersonName(qa.full_name), qa.id);
    if (qa.email?.trim()) map.set(normalizePersonName(qa.email), qa.id);
  }
  return map;
}

export function resolveQaUserId(
  qaAuditedById: string | null | undefined,
  qaName: string | null | undefined,
  qaIds: Set<string>,
  qaNameToId: Map<string, string>
): string | null {
  if (qaAuditedById && qaIds.has(qaAuditedById)) return qaAuditedById;
  const key = normalizePersonName(qaName ?? "");
  if (!key) return null;
  return qaNameToId.get(key) ?? null;
}

const QA_AUDIT_FIELD_KEYS = [
  "qa_status",
  "qa_comments",
  "audit_date",
  "disqualification_reasons",
  "disqualification_reason",
  "rectified_reason",
] as const;

export function updatesTouchQaAudit(updates: Record<string, unknown>): boolean {
  return QA_AUDIT_FIELD_KEYS.some((k) => updates[k] !== undefined);
}

function normField(v: unknown): string {
  return String(v ?? "").trim();
}

export type ExistingLeadQaSnapshot = {
  qa_status?: string | null;
  qa_comments?: string | null;
  audit_date?: string | null;
  disqualification_reasons?: string | null;
  disqualification_reason?: string | null;
  rectified_reason?: string | null;
  qa_audited_by_id?: string | null;
};

/** True when a QA user save should record who performed the audit. */
export function shouldStampQaAuditor(
  existing: ExistingLeadQaSnapshot,
  updates: Record<string, unknown>
): boolean {
  if (!updatesTouchQaAudit(updates)) return false;

  const hadAuditor = Boolean(existing.qa_audited_by_id);
  const nextStatus = "qa_status" in updates ? normField(updates.qa_status) : normField(existing.qa_status);

  if (!hadAuditor && nextStatus) return true;

  if ("qa_status" in updates && normField(updates.qa_status) !== normField(existing.qa_status)) {
    return true;
  }
  if ("qa_comments" in updates && normField(updates.qa_comments) !== normField(existing.qa_comments)) {
    return true;
  }
  if ("audit_date" in updates && normField(updates.audit_date) !== normField(existing.audit_date)) {
    return true;
  }
  if (
    "disqualification_reasons" in updates &&
    normField(updates.disqualification_reasons) !== normField(existing.disqualification_reasons)
  ) {
    return true;
  }
  if (
    "disqualification_reason" in updates &&
    normField(updates.disqualification_reason) !== normField(existing.disqualification_reason)
  ) {
    return true;
  }
  if (
    "rectified_reason" in updates &&
    normField(updates.rectified_reason) !== normField(existing.rectified_reason)
  ) {
    return true;
  }

  return false;
}

export async function stampQaAuditorOnLeadUpdate(
  updates: Record<string, unknown>,
  auditorUserId: string,
  fetchProfile: () => Promise<{ full_name: string | null; email: string | null } | null>
): Promise<void> {
  updates.qa_audited_by_id = auditorUserId;
  updates.qa_audited_at = new Date().toISOString();
  const profile = await fetchProfile();
  updates.qa_name = profile?.full_name?.trim() || profile?.email?.trim() || null;
}

/** Lead has a QA outcome worth counting in performance summaries. */
export function leadHasQaOutcome(qaStatus: string | null | undefined): boolean {
  return normField(qaStatus).length > 0;
}

/** Bulk import row includes QA audit fields (status, comments, etc.). */
export function importRowTouchesQaAudit(fields: Record<string, unknown>): boolean {
  if (normField(fields.qa_status)) return true;
  if (normField(fields.qa_comments)) return true;
  if (normField(fields.audit_date)) return true;
  if (normField(fields.disqualification_reasons)) return true;
  if (normField(fields.disqualification_reason)) return true;
  if (normField(fields.rectified_reason)) return true;
  return false;
}

export function applyQaAuditorToImportPayload(
  payload: Record<string, unknown>,
  fields: Record<string, unknown>,
  auditorUserId: string,
  auditorLabel: string
): void {
  if (!importRowTouchesQaAudit(fields)) return;
  payload.qa_audited_by_id = auditorUserId;
  payload.qa_audited_at = new Date().toISOString();
  payload.qa_name = auditorLabel;
}

/** True only for the dedicated QA role (not agent, MIS, TL, OM, or admin). */
export function isQaRoleForAuditImport(roleNames: string[]): boolean {
  return roleNames.includes("qa");
}

/** Lead has been QA-reviewed (any non-empty qa_status). */
export function isLeadAudited(qaStatus: string | null | undefined): boolean {
  return String(qaStatus ?? "").trim().length > 0;
}

/** Lead uploaded but not yet QA-reviewed. */
export function isLeadPendingAudit(qaStatus: string | null | undefined): boolean {
  return !isLeadAudited(qaStatus);
}

export function countAuditedLeads<T extends { qa_status?: string | null }>(leads: T[]): number {
  return leads.filter((l) => isLeadAudited(l.qa_status)).length;
}

export function countPendingAuditLeads<T extends { qa_status?: string | null }>(leads: T[]): number {
  return leads.filter((l) => isLeadPendingAudit(l.qa_status)).length;
}

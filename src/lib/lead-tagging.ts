/** Canonical value stored in DB and shown in forms. */
export const LEAD_TAGGING_SCORED = "Scored";

export function isScoredLeadTagging(value: string | null | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "scored";
}

/** Normalize import/form values to canonical "Scored" when case-insensitive match. */
export function normalizeLeadTaggingValue(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  if (isScoredLeadTagging(trimmed)) return LEAD_TAGGING_SCORED;
  return trimmed;
}

type OrFilterQuery<T> = { or: (filters: string) => T };

/** PostgREST filter: lead_tagging is Scored (any common casing). */
export function applyScoredLeadTaggingFilter<T extends OrFilterQuery<T>>(query: T): T {
  return query.or("lead_tagging.eq.Scored,lead_tagging.eq.scored");
}

/** Campaign-defined custom questions mapped to lead cq1–cq5 and extra_cq. */

export type CampaignQuestion = {
  key: string;
  label: string;
};

export type CampaignQuestionFormRow = {
  label: string;
};

const CQ_KEY_RE = /^cq(\d+)$/i;

export function isStandardCqKey(key: string): boolean {
  const match = CQ_KEY_RE.exec(key);
  if (!match) return false;
  const n = Number(match[1]);
  return n >= 1 && n <= 5;
}

export function cqKeyForIndex(index1Based: number): string {
  return `cq${index1Based}`;
}

/** Ant Design Form field path for a lead answer from question key. */
export function leadAnswerFieldName(
  key: string
): string | ["extra_cq", string] {
  if (isStandardCqKey(key)) return key;
  return ["extra_cq", key.toLowerCase()];
}

/** Normalize DB/API payload into ordered questions with stable keys. */
export function normalizeCampaignQuestions(raw: unknown): CampaignQuestion[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    const out: CampaignQuestion[] = [];
    let nextIndex = 1;
    for (const item of raw) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const label = row.label != null ? String(row.label).trim() : "";
      if (!label) continue;
      let key = row.key != null ? String(row.key).trim().toLowerCase() : "";
      if (!CQ_KEY_RE.test(key)) {
        key = cqKeyForIndex(nextIndex);
        nextIndex += 1;
      } else {
        const n = Number(CQ_KEY_RE.exec(key)![1]);
        nextIndex = Math.max(nextIndex, n + 1);
      }
      if (out.some((q) => q.key === key)) {
        key = cqKeyForIndex(nextIndex);
        while (out.some((q) => q.key === key)) nextIndex += 1;
        nextIndex += 1;
      }
      out.push({ key, label });
    }
    return out;
  }

  if (typeof raw === "object") {
    const entries = Object.entries(raw as Record<string, unknown>)
      .map(([key, value]) => ({
        key: key.trim().toLowerCase(),
        label: value != null ? String(value).trim() : "",
      }))
      .filter((e) => e.label && CQ_KEY_RE.test(e.key));
    entries.sort((a, b) => Number(CQ_KEY_RE.exec(a.key)![1]) - Number(CQ_KEY_RE.exec(b.key)![1]));
    return entries;
  }

  return [];
}

export function campaignQuestionsToDbValue(questions: CampaignQuestion[]): CampaignQuestion[] {
  return normalizeCampaignQuestions(questions);
}

/** Form rows for campaign create/edit (labels only; keys assigned on save). */
export function campaignQuestionsToFormRows(
  questions: CampaignQuestion[] | null | undefined
): CampaignQuestionFormRow[] {
  const normalized = normalizeCampaignQuestions(questions ?? []);
  if (normalized.length === 0) {
    return Array.from({ length: 5 }, () => ({ label: "" }));
  }
  return normalized.map((q) => ({ label: q.label }));
}

export function formRowsToCampaignQuestions(
  rows: CampaignQuestionFormRow[] | null | undefined
): CampaignQuestion[] {
  const out: CampaignQuestion[] = [];
  let nextExtra = 6;
  for (const row of rows ?? []) {
    const label = row?.label != null ? String(row.label).trim() : "";
    if (!label) continue;
    if (out.length < 5) {
      out.push({ key: cqKeyForIndex(out.length + 1), label });
    } else {
      out.push({ key: cqKeyForIndex(nextExtra), label });
      nextExtra += 1;
    }
  }
  return out;
}

export function campaignQuestionsPayloadFromFormValues(
  values: Record<string, unknown>
): CampaignQuestion[] {
  const rows = values.campaign_question_rows as CampaignQuestionFormRow[] | undefined;
  return campaignQuestionsToDbValue(formRowsToCampaignQuestions(rows));
}

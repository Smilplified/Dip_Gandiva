import type { LhoData } from "@/lib/generateLhoPdf";
import {
  normalizeCampaignQuestions,
  type CampaignQuestion,
} from "@/lib/campaign-questions";

export type LhoCampaignQuestionRow = {
  label: string;
  answer: string;
};

function str(val: unknown): string {
  return val != null ? String(val).trim() : "";
}

function answerForKey(
  data: Pick<LhoData, "cq1" | "cq2" | "cq3" | "cq4" | "cq5" | "extraCq">,
  key: string
): string {
  const k = key.toLowerCase();
  if (k === "cq1") return data.cq1;
  if (k === "cq2") return data.cq2;
  if (k === "cq3") return data.cq3;
  if (k === "cq4") return data.cq4;
  if (k === "cq5") return data.cq5;
  return data.extraCq[k] ?? "";
}

/** Demand & Qualification Insights (campaign questions) + answers for LHO PDF. */
export function buildLhoCampaignQuestionRows(
  data: Pick<LhoData, "cq1" | "cq2" | "cq3" | "cq4" | "cq5" | "extraCq">,
  campaignQuestions?: CampaignQuestion[] | null
): LhoCampaignQuestionRow[] {
  const configured = normalizeCampaignQuestions(campaignQuestions ?? []);

  if (configured.length > 0) {
    return configured.map((q) => ({
      label: q.label,
      answer: answerForKey(data, q.key) || "—",
    }));
  }

  const legacy: LhoCampaignQuestionRow[] = [];
  for (let i = 1; i <= 5; i++) {
    const answer = answerForKey(data, `cq${i}`);
    if (answer) legacy.push({ label: `CQ${i}`, answer });
  }

  const extraKeys = Object.keys(data.extraCq).sort((a, b) => {
    const na = Number(/^cq(\d+)$/i.exec(a)?.[1] ?? 0);
    const nb = Number(/^cq(\d+)$/i.exec(b)?.[1] ?? 0);
    return na - nb;
  });
  for (const key of extraKeys) {
    legacy.push({ label: key.toUpperCase(), answer: data.extraCq[key] });
  }

  return legacy;
}

export function resolveCampaignQuestionsFromLeadRaw(
  raw: Record<string, unknown>
): CampaignQuestion[] {
  if (raw.campaign_questions != null) {
    return normalizeCampaignQuestions(raw.campaign_questions);
  }
  const campaigns = raw.campaigns;
  if (campaigns && typeof campaigns === "object" && !Array.isArray(campaigns)) {
    return normalizeCampaignQuestions(
      (campaigns as Record<string, unknown>).campaign_questions
    );
  }
  return [];
}

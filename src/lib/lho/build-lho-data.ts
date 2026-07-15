import type { LhoData } from "@/lib/generateLhoPdf";
import {
  buildLhoCampaignQuestionRows,
  resolveCampaignQuestionsFromLeadRaw,
} from "@/lib/lho/campaign-cq-pdf";
import {
  formatMeetingReportDate,
  formatMeetingReportTime,
  resolveAgentName,
  resolveClientName,
} from "@/lib/lho/meeting-report-format";
import type { CampaignQuestion } from "@/lib/campaign-questions";

function str(val: unknown): string {
  return val != null ? String(val).trim() : "";
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

function formatLegacyDateTime(val: unknown, tz: unknown): string {
  const s = str(val);
  if (!s) return "";
  const wall = s.includes("T") ? s.slice(0, 16).replace("T", " ") : s;
  const tzLabel = str(tz);
  return tzLabel ? `${wall} (${tzLabel})` : wall;
}

export function buildLhoDataFromLead(
  raw: Record<string, unknown>,
  options?: { campaignQuestions?: CampaignQuestion[] | null }
): LhoData {
  const scoredAt = str(raw.scored) || null;
  const scoredTimezone = str(raw.scored_timezone) || null;
  const appointmentAt = str(raw.appointment) || null;
  const appointmentTimezone = str(raw.appointment_timezone) || null;

  const cqFields = {
    cq1: str(raw.cq1),
    cq2: str(raw.cq2),
    cq3: str(raw.cq3),
    cq4: str(raw.cq4),
    cq5: str(raw.cq5),
    extraCq: normalizeExtraCqMap(raw.extra_cq),
  };

  const campaignQuestionConfig =
    options?.campaignQuestions ?? resolveCampaignQuestionsFromLeadRaw(raw);

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
    phoneNumberLink: str(raw.phone_number_link),
    channel: str(raw.channel),
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
    ...cqFields,
    campaignQuestions: buildLhoCampaignQuestionRows(cqFields, campaignQuestionConfig),
    leadStatus: str(raw.status),
    leadTagging: str(raw.lead_tagging),
    leadDisposition: str(raw.lead_disposition),
    assetTitle: str(raw.asset_title),
    status: str(raw.status),
    tenurity: str(raw.tenurity),
    vvStatus: str(raw.vv_status),
    emailStatus: str(raw.email_status),
    evTool: str(raw.ev_tool),
    scoredAt,
    scoredTimezone,
    appointmentAt,
    appointmentTimezone,
    scored: formatLegacyDateTime(scoredAt, scoredTimezone),
    appointment: formatLegacyDateTime(appointmentAt, appointmentTimezone),
    client: resolveClientName(raw),
    preparedBy: resolveClientName(raw),
    agentName: resolveAgentName(raw),
    meetingSetDate: formatMeetingReportDate(scoredAt, scoredTimezone),
    meetingDate: formatMeetingReportDate(appointmentAt, appointmentTimezone),
    meetingTime: formatMeetingReportTime(appointmentAt, appointmentTimezone),
    raComment: str(raw.ra_comment),
    specialComments: str(raw.special_comments),
    notes: str(raw.notes),
  };
}

/**
 * Maps parsed file rows from CampaignForm into `leads` insert payloads.
 * Used on campaign create (POST) and when importing via campaign edit (PATCH).
 */

export function parsedRowsToLeadInserts(
  rawLeads: Record<string, unknown>[],
  ctx: { organizationId: string; campaignId: string; createdBy: string }
): Record<string, unknown>[] {
  return rawLeads
    .map((row) => {
      const first = typeof row.first_name === "string" ? row.first_name.trim() : "";
      const last = typeof row.last_name === "string" ? row.last_name.trim() : "";
      const name =
        (typeof row.name === "string" && row.name.trim()) ||
        [first, last].filter(Boolean).join(" ").trim() ||
        null;
      const companyName =
        typeof row.company_name === "string" ? row.company_name.trim() || null : null;
      const email = typeof row.email === "string" ? row.email.trim() || null : null;
      const phone = typeof row.phone === "string" ? row.phone.trim() || null : null;

      if (!name && !companyName && !email && !phone) return null;

      const leadIdHuman =
        typeof row.lead_id === "string" && row.lead_id.trim() ? row.lead_id.trim() : null;
      const status =
        typeof row.status === "string" && row.status.trim() ? row.status.trim() : "new";

      return {
        organization_id: ctx.organizationId,
        campaign_id: ctx.campaignId,
        lead_id: leadIdHuman,
        name,
        first_name: first || null,
        last_name: last || null,
        company_name: companyName,
        email,
        phone,
        city: typeof row.city === "string" ? row.city.trim() || null : null,
        job_title: typeof row.job_title === "string" ? row.job_title.trim() || null : null,
        industry: typeof row.industry === "string" ? row.industry.trim() || null : null,
        status,
        created_by: ctx.createdBy,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];
}

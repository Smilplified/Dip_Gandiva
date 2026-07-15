import { NextResponse, type NextRequest } from "next/server";
import { verifyOrgAdmin } from "@/lib/devices/api-auth";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import { LEAD_LIST_COLUMNS, applyLeadFilters } from "@/lib/lead-finder/query";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const EXPORT_PAGE_SIZE = 1000;
/** Streaming keeps memory flat, but cap exports to keep responses sane. */
const EXPORT_MAX_ROWS = 100_000;

const CSV_HEADERS = [
  "first_name",
  "last_name",
  "full_name",
  "email",
  "email_status",
  "phone",
  "mobile_number",
  "job_title",
  "seniority",
  "linkedin_url",
  "company_name",
  "company_website",
  "company_industry",
  "company_size",
  "company_location",
  "contact_city",
  "contact_state",
  "contact_country",
  "batch_name",
  "created_at",
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Streamed CSV export of the filtered set — never loads 100k rows at once. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await verifyOrgAdmin();
    if ("error" in ctx && ctx.error) return ctx.error;
    const { orgId } = ctx as { orgId: string };

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const sp = request.nextUrl.searchParams;
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(CSV_HEADERS.join(",") + "\n"));

          let exported = 0;
          for (let offset = 0; exported < EXPORT_MAX_ROWS; offset += EXPORT_PAGE_SIZE) {
            let query = admin
              .from("lead_finder_leads")
              .select(LEAD_LIST_COLUMNS)
              .eq("organization_id", orgId);
            query = applyLeadFilters(query, sp);

            const { data, error } = await query
              .order("created_at", { ascending: false })
              .order("id", { ascending: true })
              .range(offset, offset + EXPORT_PAGE_SIZE - 1);

            if (error) throw new Error(error.message);
            const rows = (data ?? []) as Record<string, unknown>[];
            if (rows.length === 0) break;

            const lines = rows
              .map((row) => CSV_HEADERS.map((h) => csvEscape(row[h])).join(","))
              .join("\n");
            controller.enqueue(encoder.encode(lines + "\n"));

            exported += rows.length;
            if (rows.length < EXPORT_PAGE_SIZE) break;
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lead-finder-${ts}.csv"`,
      },
    });
  } catch (err) {
    console.error("Lead finder export error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

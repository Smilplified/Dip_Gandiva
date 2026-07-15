import { NextResponse } from "next/server";
import { verifyOrgAdmin } from "@/lib/devices/api-auth";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import { validateFilters } from "@/lib/lead-finder/types";
import { ApifyError, startActorRun } from "@/lib/lead-finder/apify";
import { estimateCostUsd } from "@/lib/lead-finder/types";
import { logAudit } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

/** Start an Apify lead-finder run and create the tracking row. Admin only. */
export async function POST(request: Request) {
  try {
    const ctx = await verifyOrgAdmin();
    if ("error" in ctx && ctx.error) return ctx.error;
    const { orgId, user } = ctx as { orgId: string; user: { id: string } };

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const body = (await request.json().catch(() => null)) as { filters?: unknown } | null;
    const validation = validateFilters(body?.filters);
    if (!validation.filters) {
      return NextResponse.json(
        { error: "Invalid filters", details: validation.errors },
        { status: 400 }
      );
    }
    const filters = validation.filters;

    let apifyRun;
    try {
      apifyRun = await startActorRun(filters as unknown as Record<string, unknown>);
    } catch (err) {
      const message =
        err instanceof ApifyError && err.status === 401
          ? "Lead engine token is invalid (check APIFY_API_TOKEN)"
          : err instanceof Error
          ? err.message
          : "Failed to start the search";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const { data: run, error } = await admin
      .from("lead_finder_runs")
      .insert({
        organization_id: orgId,
        apify_run_id: apifyRun.id,
        dataset_id: apifyRun.defaultDatasetId,
        filters: filters as never,
        batch_name: filters.file_name,
        status: "RUNNING",
        started_by: user.id,
      } as never)
      .select("id")
      .single();

    if (error || !run) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to record run" },
        { status: 500 }
      );
    }

    void logAudit({
      organizationId: orgId,
      actorId: user.id,
      category: "lead_finder",
      eventType: "lead_finder_run_started",
      description: `Started lead search "${filters.file_name}" (${filters.fetch_count.toLocaleString()} leads, ~$${estimateCostUsd(filters.fetch_count)})`,
      targetType: "lead_finder_run",
      targetId: (run as { id: string }).id,
      targetLabel: filters.file_name,
      metadata: { filters, estimated_cost_usd: estimateCostUsd(filters.fetch_count) },
      request,
    });

    return NextResponse.json(
      { run_id: (run as { id: string }).id, apify_run_id: apifyRun.id },
      { status: 201 }
    );
  } catch (err) {
    console.error("Lead finder start error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

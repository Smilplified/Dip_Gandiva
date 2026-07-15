import { NextResponse } from "next/server";
import { verifyOrgAdmin } from "@/lib/devices/api-auth";
import { getAdminClientSafe, ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/admin";
import { getActorRun, getDatasetItemCount } from "@/lib/lead-finder/apify";

export const dynamic = "force-dynamic";

type RunRow = {
  id: string;
  apify_run_id: string | null;
  dataset_id: string | null;
  status: string;
  total_found: number;
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
  progress: number;
  error_message: string | null;
  batch_name: string;
  filters: Record<string, unknown>;
  created_at: string;
  finished_at: string | null;
};

/**
 * Run status for the frontend poller. While the Apify run is RUNNING this
 * also syncs Apify's state into the row (SUCCEEDED → ready to import;
 * FAILED/ABORTED/TIMED-OUT → failed).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await verifyOrgAdmin();
    if ("error" in ctx && ctx.error) return ctx.error;
    const { orgId } = ctx as { orgId: string };

    const admin = getAdminClientSafe();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const { id } = await params;
    const { data } = await admin
      .from("lead_finder_runs")
      .select(
        "id, apify_run_id, dataset_id, status, total_found, inserted_count, updated_count, skipped_count, progress, error_message, batch_name, filters, created_at, finished_at"
      )
      .eq("id", id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    let run = data as RunRow;

    // Sync live Apify state while the actor is still running.
    let apifyStatus: string | null = null;
    if (run.status === "RUNNING" && run.apify_run_id) {
      try {
        const apifyRun = await getActorRun(run.apify_run_id);
        apifyStatus = apifyRun.status;
        const updates: Record<string, unknown> = {};

        if (!run.dataset_id && apifyRun.defaultDatasetId) {
          updates.dataset_id = apifyRun.defaultDatasetId;
        }
        if (["FAILED", "ABORTED", "TIMED-OUT"].includes(apifyRun.status)) {
          updates.status = apifyRun.status === "FAILED" ? "FAILED" : "ABORTED";
          updates.error_message = `Search run ${apifyRun.status.toLowerCase().replace("-", " ")}`;
          updates.finished_at = new Date().toISOString();
        }
        if (apifyRun.status === "SUCCEEDED" && run.total_found === 0) {
          const datasetId = (updates.dataset_id as string) ?? run.dataset_id;
          if (datasetId) {
            const itemCount = await getDatasetItemCount(datasetId);
            if (itemCount !== null) updates.total_found = itemCount;
          }
        }

        if (Object.keys(updates).length > 0) {
          const { data: updated } = await admin
            .from("lead_finder_runs")
            .update(updates as never)
            .eq("id", run.id)
            .select(
              "id, apify_run_id, dataset_id, status, total_found, inserted_count, updated_count, skipped_count, progress, error_message, batch_name, filters, created_at, finished_at"
            )
            .single();
          if (updated) run = updated as RunRow;
        }
      } catch (err) {
        console.warn("Lead finder Apify status sync failed:", err);
      }
    }

    return NextResponse.json({
      run,
      apify_status: apifyStatus,
      // Frontend triggers the import when the actor is done but import hasn't run.
      ready_to_import:
        run.status === "RUNNING" && apifyStatus === "SUCCEEDED" && Boolean(run.dataset_id),
    });
  } catch (err) {
    console.error("Lead finder run status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

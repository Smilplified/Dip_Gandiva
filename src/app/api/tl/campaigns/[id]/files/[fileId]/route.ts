import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { id: campaignId, fileId } = await params;
    if (!campaignId || !fileId) {
      return NextResponse.json({ error: "Campaign ID and file ID required" }, { status: 400 });
    }

    const { data: row, error: fetchError } = await supabase
      .from("campaign_files")
      .select("id, file_path, campaign_id, organization_id")
      .eq("id", fileId)
      .eq("campaign_id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const path = (row as { file_path: string }).file_path;
    await supabase.storage.from("campaign-files").remove([path]);

    const { error: deleteError } = await supabase
      .from("campaign_files")
      .delete()
      .eq("id", fileId)
      .eq("organization_id", orgId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete campaign file error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

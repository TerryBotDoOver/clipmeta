import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// Returns an array of clip IDs for the given project that match the requested
// status filter. Used by the Blackbox FTP flow to build per-clip batches so
// each Vercel function invocation handles exactly one clip.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectParam } = await params;
    if (!projectParam) {
      return NextResponse.json({ error: "project id required" }, { status: 400 });
    }

    // Accept either UUID or slug, matching how /api/projects/delete resolves it.
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectParam);
    const projectQuery = supabaseAdmin.from("projects").select("id, user_id");
    const { data: project, error: projectErr } = await (isUUID
      ? projectQuery.eq("id", projectParam)
      : projectQuery.eq("slug", projectParam)
    ).single();

    if (projectErr || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status"); // e.g. "complete"

    let query = supabaseAdmin
      .from("clips")
      .select("id")
      .eq("project_id", project.id);

    if (statusFilter) {
      query = query.eq("metadata_status", statusFilter);
    }

    const { data: clips, error: clipsErr } = await query.order("created_at", { ascending: true });
    if (clipsErr) {
      return NextResponse.json({ error: clipsErr.message }, { status: 500 });
    }

    const clip_ids = (clips ?? []).map((c) => c.id);
    return NextResponse.json({ clip_ids, count: clip_ids.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

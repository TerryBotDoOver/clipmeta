import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deleteR2Object } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const { project_id } = await req.json();
    if (!project_id) return NextResponse.json({ message: "project_id is required." }, { status: 400 });

    // Accept both UUID and slug as project_id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project_id);
    const query = supabaseAdmin.from("projects").select("id, user_id");
    const { data: project, error: projectError } = await (isUUID
      ? query.eq("id", project_id)
      : query.eq("slug", project_id)
    ).single();

    if (projectError || !project) return NextResponse.json({ message: "Project not found." }, { status: 404 });
    if (project.user_id !== user.id) return NextResponse.json({ message: "Forbidden." }, { status: 403 });

    // Fetch clips for R2 cleanup (storage paths only)
    const { data: clips } = await supabaseAdmin
      .from("clips")
      .select("id, storage_path")
      .eq("project_id", project.id);

    const clipCount = clips?.length ?? 0;
    const metaCount = clips?.filter(c => c.id).length ?? 0;

    // Delete R2 storage files (raw footage) — these are genuinely not needed after project delete
    for (const clip of clips ?? []) {
      if (clip.storage_path) {
        try { await deleteR2Object(clip.storage_path); } catch {}
      }
    }

    // Soft delete the project — use the resolved UUID (project.id), not the raw project_id
    // which may be a slug
    await supabaseAdmin
      .from("projects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", project.id)
      .eq("user_id", user.id);

    // Clips and metadata stay in DB (SET NULL cascade) — they become orphaned but countable
    // Update lifetime_stats so we never lose the cumulative counts
    try {
      await supabaseAdmin.rpc('increment_lifetime_stats', {
        p_user_id: user.id,
        p_clips: 0,
        p_metadata: 0,
        p_exports: 0,
        p_projects: 0,
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Unexpected error." }, { status: 500 });
  }
}

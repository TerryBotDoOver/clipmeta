import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { deleteR2Object } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const { project_id } = await req.json();
  if (!project_id) return NextResponse.json({ error: "project_id required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.status === "complete") return NextResponse.json({ ok: true, already: true });

  // Get all clips with storage paths that haven't been deleted yet
  const { data: clips } = await supabase
    .from("clips")
    .select("id, storage_path, upload_status")
    .eq("project_id", project_id)
    .neq("upload_status", "source_deleted");

  // Delete source videos from R2 (non-fatal per clip)
  await Promise.all(
    (clips ?? []).map(async (clip) => {
      if (!clip.storage_path) return;
      try {
        await deleteR2Object(clip.storage_path);
        await supabase
          .from("clips")
          .update({ upload_status: "source_deleted" })
          .eq("id", clip.id);
      } catch (e) {
        console.warn("Failed to delete R2 object for clip", clip.id, e);
      }
    })
  );

  // Mark project complete
  await supabase.from("projects").update({ status: "complete" }).eq("id", project_id);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { clip_id, is_reviewed } = await req.json();
  if (!clip_id || typeof is_reviewed !== "boolean") {
    return NextResponse.json({ error: "clip_id and is_reviewed required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership via join — user must own the project the clip belongs to
  const { data: clip } = await supabase
    .from("clips")
    .select("id, project_id, projects!inner(user_id)")
    .eq("id", clip_id)
    .eq("projects.user_id", user.id)
    .single();

  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.from("clips").update({ is_reviewed }).eq("id", clip_id);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deleteR2Object } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const { clip_ids } = await req.json();

    if (!Array.isArray(clip_ids) || clip_ids.length === 0) {
      return NextResponse.json({ message: "clip_ids array is required." }, { status: 400 });
    }

    // Fetch clips with project info for R2 cleanup and history logging
    const { data: clips, error: fetchError } = await supabaseAdmin
      .from("clips")
      .select("id, storage_path, original_filename, project_id, projects(user_id)")
      .in("id", clip_ids);

    if (fetchError) {
      return NextResponse.json({ message: "Failed to fetch clips." }, { status: 500 });
    }

    // Log deletions to clip_history before removing
    for (const clip of clips ?? []) {
      const userId = (clip as any).projects?.user_id;
      if (userId) {
        await supabaseAdmin.from("clip_history").insert({
          clip_id: clip.id,
          user_id: userId,
          project_id: clip.project_id,
          original_filename: clip.original_filename,
          action: "deleted",
        });
      }
    }

    // Delete metadata results first (foreign key)
    await supabaseAdmin
      .from("metadata_results")
      .delete()
      .in("clip_id", clip_ids);

    // Delete clip records
    const { error: deleteError } = await supabaseAdmin
      .from("clips")
      .delete()
      .in("id", clip_ids);

    if (deleteError) {
      return NextResponse.json({ message: "Failed to delete clips." }, { status: 500 });
    }

    // Delete files from R2 (best effort — don't fail if R2 cleanup fails)
    for (const clip of clips ?? []) {
      if (clip.storage_path) {
        try {
          await deleteR2Object(clip.storage_path);
        } catch (err) {
          console.warn(`Failed to delete R2 object ${clip.storage_path}:`, err);
        }
      }
    }

    return NextResponse.json({ ok: true, deleted: clip_ids.length });
  } catch {
    return NextResponse.json({ message: "Unexpected error." }, { status: 500 });
  }
}

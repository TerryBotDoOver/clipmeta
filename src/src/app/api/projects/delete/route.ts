import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deleteR2Object } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return NextResponse.json(
        { message: "project_id is required." },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, user_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { message: "Project not found." },
        { status: 404 }
      );
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { data: clips, error: clipsError } = await supabaseAdmin
      .from("clips")
      .select("id, storage_path")
      .eq("project_id", project_id);

    if (clipsError) {
      return NextResponse.json(
        { message: "Failed to fetch project clips." },
        { status: 500 }
      );
    }

    const clipIds = (clips ?? []).map((clip) => clip.id);

    if (clipIds.length > 0) {
      await supabaseAdmin
        .from("metadata_results")
        .delete()
        .in("clip_id", clipIds);

      const { error: deleteClipsError } = await supabaseAdmin
        .from("clips")
        .delete()
        .in("id", clipIds);

      if (deleteClipsError) {
        return NextResponse.json(
          { message: "Failed to delete project clips." },
          { status: 500 }
        );
      }

      for (const clip of clips ?? []) {
        if (clip.storage_path) {
          try {
            await deleteR2Object(clip.storage_path);
          } catch (err) {
            console.warn(`Failed to delete R2 object ${clip.storage_path}:`, err);
          }
        }
      }
    }

    const { error: deleteProjectError } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", project_id)
      .eq("user_id", user.id);

    if (deleteProjectError) {
      return NextResponse.json(
        { message: "Failed to delete project." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Unexpected error." }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { project_id, original_filename, storage_path, file_size_bytes } =
      await req.json();

    if (!project_id || !original_filename || !storage_path) {
      return NextResponse.json(
        { message: "project_id, original_filename, and storage_path are required." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase.from("clips").insert({
      project_id,
      original_filename,
      storage_path,
      file_size_bytes: file_size_bytes ?? null,
      duration_seconds: null,
      upload_status: "uploaded",
      metadata_status: "not_started",
    });

    if (insertError) {
      // Clean up the uploaded file if record creation fails
      await supabaseAdmin.storage
        .from("project-uploads")
        .remove([storage_path]);

      return NextResponse.json(
        { message: insertError.message || "Failed to create clip record." },
        { status: 500 }
      );
    }

    // Fetch the newly created clip to return its ID
    const { data: clip } = await supabase
      .from("clips")
      .select("id")
      .eq("project_id", project_id)
      .eq("storage_path", storage_path)
      .single();

    return NextResponse.json({ ok: true, clip_id: clip?.id ?? null });
  } catch (err) {
    return NextResponse.json(
      { message: "Unexpected error creating clip record." },
      { status: 500 }
    );
  }
}

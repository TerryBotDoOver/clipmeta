import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { project_id, filename } = await req.json();

    if (!project_id || !filename) {
      return NextResponse.json(
        { message: "project_id and filename are required." },
        { status: 400 }
      );
    }

    const safeFilename = filename
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();
    const storagePath = `${project_id}/${safeFilename}`;

    const { data, error } = await supabaseAdmin.storage
      .from("project-uploads")
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json(
        { message: error?.message || "Failed to generate upload URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      storagePath,
      token: data.token,
    });
  } catch (err) {
    return NextResponse.json(
      { message: "Unexpected error generating upload URL." },
      { status: 500 }
    );
  }
}

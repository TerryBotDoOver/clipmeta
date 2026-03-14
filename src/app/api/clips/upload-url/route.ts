import { NextRequest, NextResponse } from "next/server";
import { getR2UploadUrl } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const { project_id, filename, content_type } = await req.json();

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
    const signedUrl = await getR2UploadUrl(storagePath, content_type || "video/mp4");

    return NextResponse.json({ signedUrl, storagePath });
  } catch (err) {
    console.error("R2 upload URL error:", err);
    return NextResponse.json(
      { message: "Failed to generate upload URL." },
      { status: 500 }
    );
  }
}

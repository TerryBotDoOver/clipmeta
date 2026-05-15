import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { storage_path, upload_id } = await req.json();

    if (!storage_path || !upload_id) {
      return NextResponse.json(
        { message: "storage_path and upload_id are required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await r2.send(new AbortMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: storage_path,
      UploadId: upload_id,
    }));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Multipart abort error:", err);
    return NextResponse.json({ message: "Failed to abort multipart upload." }, { status: 500 });
  }
}

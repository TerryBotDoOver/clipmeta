import { NextRequest, NextResponse } from "next/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PLAN_FILE_SIZE_LIMITS } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const { storage_path, content_type, file_size_bytes } = await req.json();

    // Enforce per-plan file size limit server-side
    if (file_size_bytes) {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("plan")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();
        const plan = (subscription?.plan ?? "free") as string;
        const limit = PLAN_FILE_SIZE_LIMITS[plan] ?? PLAN_FILE_SIZE_LIMITS.free;
        if (file_size_bytes > limit) {
          const limitLabel = limit >= 1024 * 1024 * 1024
            ? `${(limit / (1024 * 1024 * 1024)).toFixed(0)}GB`
            : `${(limit / (1024 * 1024)).toFixed(0)}MB`;
          return NextResponse.json(
            { message: `File too large. Your ${plan} plan allows up to ${limitLabel} per file.` },
            { status: 413 }
          );
        }
      }
    }

    if (!storage_path) {
      return NextResponse.json({ message: "storage_path is required." }, { status: 400 });
    }

    const command = new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: storage_path,
      ContentType: content_type || "video/mp4",
    });

    const result = await r2.send(command);

    return NextResponse.json({
      uploadId: result.UploadId,
      storagePath: storage_path,
    });
  } catch (err) {
    console.error("Multipart start error:", err);
    return NextResponse.json({ message: "Failed to start multipart upload." }, { status: 500 });
  }
}

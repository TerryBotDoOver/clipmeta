import { NextRequest, NextResponse } from "next/server";
import { getR2UploadUrl } from "@/lib/r2";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PLAN_FILE_SIZE_LIMITS } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const { project_id, filename, content_type, file_size_bytes } = await req.json();

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

    if (!project_id || !filename) {
      return NextResponse.json(
        { message: "project_id and filename are required." },
        { status: 400 }
      );
    }

    // Server-side plan file size enforcement
    if (file_size_bytes) {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();
        const plan = sub?.plan ?? "free";
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

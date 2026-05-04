import { NextRequest, NextResponse } from "next/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PLAN_FILE_SIZE_LIMITS, entitlementPlanFromProfile } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const { storage_path, content_type, file_size_bytes } = await req.json();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // Enforce per-plan file size limit server-side.
    if (file_size_bytes) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, stripe_subscription_status, referral_pro_forever, referral_pro_until")
        .eq("id", user.id)
        .single();

      let plan = entitlementPlanFromProfile(profile?.plan, profile?.stripe_subscription_status);
      if (profile?.referral_pro_forever) plan = "pro";
      if (profile?.referral_pro_until && new Date(profile.referral_pro_until) > new Date()) plan = "pro";

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

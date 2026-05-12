import { NextRequest, NextResponse } from "next/server";
import { getR2UploadUrl } from "@/lib/r2";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLANS, PLAN_FILE_SIZE_LIMITS, entitlementPlanFromProfile, getUsagePeriodStart } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const { project_id, filename, content_type, file_size_bytes } = await req.json();

    if (!project_id || !filename) {
      return NextResponse.json(
        { message: "project_id and filename are required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // ─── Get profile for plan checks ──────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, stripe_subscription_status, bonus_clips, rollover_clips, referral_pro_forever, referral_pro_until, credits, billing_period_start")
      .eq("id", user.id)
      .maybeSingle();

    const basePlan = entitlementPlanFromProfile(profile?.plan, profile?.stripe_subscription_status);

    let plan = basePlan;
    if (profile?.referral_pro_forever) {
      plan = "pro";
    } else if (profile?.referral_pro_until && new Date(profile.referral_pro_until) > new Date()) {
      plan = "pro";
    }

    // ─── File size check ──────────────────────────────────────────────────────
    if (file_size_bytes) {
      const sizeLimit = PLAN_FILE_SIZE_LIMITS[plan] ?? PLAN_FILE_SIZE_LIMITS.free;
      if (file_size_bytes > sizeLimit) {
        const limitLabel = sizeLimit >= 1024 * 1024 * 1024
          ? `${(sizeLimit / (1024 * 1024 * 1024)).toFixed(0)}GB`
          : `${(sizeLimit / (1024 * 1024)).toFixed(0)}MB`;
        return NextResponse.json(
          { message: `File too large. Your ${plan} plan allows up to ${limitLabel} per file.` },
          { status: 413 }
        );
      }
    }

    // ─── Clip count limit check (block BEFORE upload starts) ──────────────────
    const userCredits: number = profile?.credits ?? 0;
    if (userCredits <= 0) {
      const planConfig = PLANS[plan];
      const bonusClips: number = profile?.bonus_clips ?? 0;
      const rolloverClips: number = profile?.rollover_clips ?? 0;
      const limit = planConfig.clips + rolloverClips + bonusClips;

      let used = 0;
      if (planConfig.period === 'daily') {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const { data: userProjects } = await supabase.from("projects").select("id").eq("user_id", user.id);
        const projectIds = (userProjects ?? []).map((p: { id: string }) => p.id);
        if (projectIds.length > 0) {
          const { count: usedCount } = await supabaseAdmin
            .from("clips")
            .select("id", { count: "exact", head: true })
            .in("project_id", projectIds)
            .gte("created_at", periodStart.toISOString());
          used = usedCount ?? 0;
        }
      } else {
        const billingStart = getUsagePeriodStart(profile?.plan, profile?.billing_period_start).toISOString();
        const { count: uploadCount } = await supabaseAdmin
          .from('clip_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('action', 'created')
          .gte('created_at', billingStart);
        used = uploadCount ?? 0;
      }

      if (used >= limit) {
        const remaining = 0;
        let resetMsg: string;
        if (planConfig.period === 'daily') {
          resetMsg = 'Daily clip limit reached. Free accounts get 3 clips per day.';
        } else {
          resetMsg = `Monthly limit reached. Your ${plan} plan allows ${limit} clips per month.`;
        }
        return NextResponse.json(
          {
            message: resetMsg,
            limit_reached: true,
            upgrade_url: '/pricing',
            used,
            limit,
            remaining,
          },
          { status: 429 }
        );
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const safeFilename = filename
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();

    const uploadId = crypto.randomUUID();
    const storagePath = `${project_id}/${uploadId}-${safeFilename}`;
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

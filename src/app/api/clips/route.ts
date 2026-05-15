import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PLAN_FILE_SIZE_LIMITS, PLANS, entitlementPlanFromProfile, getUsagePeriodStart } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { project_id, original_filename, storage_path, file_size_bytes, needs_worker } =
      await req.json();

    if (!project_id || !original_filename || !storage_path) {
      return NextResponse.json(
        { message: "project_id, original_filename, and storage_path are required." },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { message: "Project not found or access denied." },
        { status: 403 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, stripe_subscription_status, billing_period_start, bonus_clips, referral_pro_forever, referral_pro_until, rollover_clips, credits")
      .eq("id", user.id)
      .maybeSingle();

    const basePlan = entitlementPlanFromProfile(profile?.plan, profile?.stripe_subscription_status);

    // Referral rewards can upgrade effective plan to Pro
    let plan = basePlan;
    if (profile?.referral_pro_forever) {
      plan = "pro";
    } else if (profile?.referral_pro_until && new Date(profile.referral_pro_until) > new Date()) {
      plan = "pro";
    }

    const planConfig = PLANS[plan];
    const bonusClips: number = profile?.bonus_clips ?? 0;
    const rolloverClips: number = profile?.rollover_clips ?? 0;
    const limit = planConfig.clips + rolloverClips + bonusClips;
    const fileSize = typeof file_size_bytes === "number" ? file_size_bytes : Number(file_size_bytes ?? 0);
    const fileSizeLimit = PLAN_FILE_SIZE_LIMITS[plan] ?? PLAN_FILE_SIZE_LIMITS.free;

    if (Number.isFinite(fileSize) && fileSize > fileSizeLimit) {
      const limitLabel = fileSizeLimit >= 1024 * 1024 * 1024
        ? `${(fileSizeLimit / (1024 * 1024 * 1024)).toFixed(0)}GB`
        : `${(fileSizeLimit / (1024 * 1024)).toFixed(0)}MB`;
      return NextResponse.json(
        { message: `File too large. Your ${plan} plan allows up to ${limitLabel} per file.` },
        { status: 413 }
      );
    }

    // Free plan: daily limit (count from clips table today).
    // Paid plans: count from clip_history.created since billing_period_start (authoritative).
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
      // Paid plans: count from clip_history (includes deleted clips, excludes regens)
      const billingStart = getUsagePeriodStart(profile?.plan, profile?.billing_period_start).toISOString();
      const { count: uploadCount } = await supabaseAdmin
        .from('clip_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action', 'created')
        .gte('created_at', billingStart);
      used = uploadCount ?? 0;
    }

    const userCredits: number = profile?.credits ?? 0;
    const usingCredit = userCredits > 0;

    if (!usingCredit && used >= limit) {
      const bonusNote = bonusClips > 0 ? ` (includes ${bonusClips} bonus clips from referrals)` : "";
      let resetMsg: string;
      if (planConfig.period === 'daily') {
        resetMsg = `Your daily free clips are used up${bonusNote}. Upgrade for unlimited access.`;
      } else if (rolloverClips > 0) {
        resetMsg = `You've used all your clips this month (including ${rolloverClips} rollover clip${rolloverClips !== 1 ? 's' : ''}${bonusNote}). Upgrade or wait for next month.`;
      } else {
        resetMsg = `Monthly clip limit reached${bonusNote}. Upgrade or wait for next month.`;
      }
      return NextResponse.json(
        {
          error: "Clip limit reached",
          message: resetMsg,
          limit,
          used,
          plan,
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    const { data: clip, error: insertError } = await supabaseAdmin.from("clips").insert({
      project_id,
      original_filename,
      storage_path,
      file_size_bytes: file_size_bytes || null,
      duration_seconds: null,
      upload_status: "uploaded",
      // ProRes/incompatible codec: mark for server-side worker processing
      metadata_status: needs_worker ? "worker_pending" : "not_started",
    }).select("id").single();

    if (insertError) {
      await supabaseAdmin.storage.from("project-uploads").remove([storage_path]);

      return NextResponse.json(
        { message: insertError.message || "Failed to create clip record." },
        { status: 500 }
      );
    }

    if (usingCredit) {
      // Deduct one credit instead of counting against subscription allowance
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: user.id, credits: userCredits - 1, updated_at: new Date().toISOString() });
    }

    return NextResponse.json({
      ok: true,
      clip_id: clip?.id ?? null,
      metadata_status: needs_worker ? "worker_pending" : "not_started",
    });
  } catch (err) {
    console.error("[clips] unexpected create error:", err);
    return NextResponse.json(
      { message: "Unexpected error creating clip record." },
      { status: 500 }
    );
  }
}

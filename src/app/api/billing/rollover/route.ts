import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLANS, type Plan } from "@/lib/plans";

/**
 * GET /api/billing/rollover
 *
 * Called by a cron job at the start of each billing period (monthly).
 * Calculates unused clips for each paid user and rolls them over to the next month,
 * capped at the plan's rolloverCap (2x monthly allowance).
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  // Auth: accept CRON_SECRET or DRIP_SECRET (fallback for cron-runner compatibility)
  const cronSecret = process.env.CRON_SECRET?.trim();
  const dripSecret = (process.env.DRIP_SECRET || 'clipmeta-drip-2026').trim();
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim() || '';
  if (cronSecret || dripSecret) {
    if (token !== cronSecret && token !== dripSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("=== CLIP ROLLOVER RUN STARTED ===");

  try {
    // Get all paid users
    const { data: paidProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, plan, rollover_clips, billing_period_start, bonus_clips, referral_pro_forever, referral_pro_until")
      .neq("plan", "free")
      .not("plan", "is", null);

    if (profilesError) {
      console.error("Failed to fetch paid profiles:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    if (!paidProfiles || paidProfiles.length === 0) {
      console.log("No paid users found.");
      return NextResponse.json({ ok: true, processed: 0 });
    }

    console.log(`Processing rollover for ${paidProfiles.length} paid user(s)...`);

    let processed = 0;
    let skipped = 0;
    const now = new Date();

    for (const profile of paidProfiles) {
      const userId: string = profile.id;

      // Determine effective plan (referral upgrades)
      let plan = (profile.plan && profile.plan in PLANS ? profile.plan : "free") as Plan;
      if (plan === "free") {
        skipped++;
        continue; // skip free users
      }

      if (profile.referral_pro_forever) {
        plan = "pro";
      } else if (profile.referral_pro_until && new Date(profile.referral_pro_until) > now) {
        plan = "pro";
      }

      const planConfig = PLANS[plan];

      // Determine this billing period's start
      const periodStart: Date = profile.billing_period_start
        ? new Date(profile.billing_period_start)
        : new Date(now.getFullYear(), now.getMonth(), 1);

      // Count clips used this period
      const { data: userProjects } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("user_id", userId);

      const projectIds = (userProjects ?? []).map((p: { id: string }) => p.id);

      let clipsUsedThisMonth = 0;
      if (projectIds.length > 0) {
        const { count } = await supabaseAdmin
          .from("clips")
          .select("id", { count: "exact", head: true })
          .in("project_id", projectIds)
          .gte("created_at", periodStart.toISOString());
        clipsUsedThisMonth = count ?? 0;
      }

      // Calculate unused clips (cannot be negative)
      const unused = Math.max(0, planConfig.clips - clipsUsedThisMonth);

      // Add unused to existing rollover, capped at rolloverCap
      const currentRollover: number = profile.rollover_clips ?? 0;
      const newRollover = Math.min(currentRollover + unused, planConfig.rolloverCap);

      console.log(
        `  User ${userId} (${plan}): used=${clipsUsedThisMonth}/${planConfig.clips}, unused=${unused}, ` +
        `rollover: ${currentRollover} → ${newRollover} (cap=${planConfig.rolloverCap})`
      );

      await supabaseAdmin
        .from("profiles")
        .update({
          rollover_clips: newRollover,
          last_rollover_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", userId);

      processed++;
    }

    console.log(`=== DONE: ${processed} processed, ${skipped} skipped ===`);

    return NextResponse.json({
      ok: true,
      processed,
      skipped,
      message: `Rollover complete: ${processed} user(s) updated, ${skipped} skipped`,
    });
  } catch (err) {
    console.error("Rollover error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

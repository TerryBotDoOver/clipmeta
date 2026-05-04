import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

const ADMIN_TOKEN = process.env.ADMIN_API_SECRET || "vyzpFC5PVM7HRI4EkZsmTOd8DgJe2cAX";
const CRON_SECRET = process.env.CRON_SECRET?.trim();

/**
 * Stripe ↔ Supabase Reconciliation
 * 
 * Finds profiles where Supabase plan doesn't match Stripe subscription status
 * and auto-repairs them. Runs via cron every hour.
 * 
 * GET /api/admin/stripe-reconcile
 * Authorization: Bearer <ADMIN_API_SECRET>
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.replace(/^Bearer\s+/i, "").trim();
  if (token !== ADMIN_TOKEN && (!CRON_SECRET || token !== CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fixed: Array<{ email: string; was: string; now: string; sub_id: string }> = [];
  const errors: Array<{ email: string; error: string }> = [];

  try {
    // Get all profiles that have a stripe_customer_id but are on free plan
    // These are candidates for a missed webhook
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, pending_plan, pending_plan_effective_date")
      .not("stripe_customer_id", "is", null);

    if (!profiles?.length) {
      return NextResponse.json({ ok: true, checked: 0, fixed: [], errors: [] });
    }

    for (const profile of profiles) {
      try {
        // Internal/manual grants are intentionally detached from Stripe.
        if (profile.stripe_subscription_status === "founder") {
          continue;
        }

        // Fetch active subscriptions from Stripe for this customer
        const subs = await getStripe().subscriptions.list({
          customer: profile.stripe_customer_id!,
          status: "all",
          limit: 5,
        });

        // Find the most recent subscription that should grant paid access.
        // past_due is intentionally excluded while Stripe retries payment.
        const activeSub = subs.data.find(s =>
          s.status === "trialing" || s.status === "active"
        );

        if (!activeSub) {
          // No active sub in Stripe — if Supabase says paid, downgrade to free
          const latestSub = subs.data[0];
          const latestStatus = latestSub?.status ?? "canceled";
          if (
            profile.plan !== "free" ||
            profile.stripe_subscription_status !== latestStatus ||
            (latestSub?.id && profile.stripe_subscription_id !== latestSub.id)
          ) {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(profile.id);
            const email = user?.user?.email ?? profile.id;
            await supabaseAdmin.from("profiles").update({
              plan: "free",
              stripe_subscription_status: latestStatus,
              ...(latestSub?.id ? { stripe_subscription_id: latestSub.id } : {}),
              updated_at: new Date().toISOString(),
            }).eq("id", profile.id);

            fixed.push({
              email,
              was: `${profile.plan}/${profile.stripe_subscription_status ?? "null"}`,
              now: `free/${latestStatus}`,
              sub_id: latestSub?.id ?? "none",
            });
          }
          continue;
        }

        const stripePlan = activeSub.metadata?.plan as string | undefined;
        const stripeStatus = activeSub.status;

        if (!stripePlan) continue; // No plan metadata — skip

        // Skip reconciliation if there's a pending plan change (e.g. user has Pro access
        // during trial but Stripe is set to Starter for when trial ends)
        const hasPendingDowngrade = profile.pending_plan && profile.pending_plan_effective_date;
        const planMismatchExpected = hasPendingDowngrade && profile.pending_plan === stripePlan;

        const needsUpdate =
          (!planMismatchExpected && profile.plan !== stripePlan) ||
          profile.stripe_subscription_status !== stripeStatus ||
          profile.stripe_subscription_id !== activeSub.id;

        if (needsUpdate) {
          // Get user email for logging
          const { data: user } = await supabaseAdmin.auth.admin.getUserById(profile.id);
          const email = user?.user?.email ?? profile.id;

          await supabaseAdmin.from("profiles").update({
            // Don't override plan if there's a pending downgrade (plan is intentionally different)
            ...(planMismatchExpected ? {} : { plan: stripePlan }),
            stripe_subscription_id: activeSub.id,
            stripe_subscription_status: stripeStatus,
            had_trial: stripeStatus === "trialing" ? true : undefined,
            // Switch to paid drip track if not already
            ...(profile.plan === "free" && stripePlan !== "free" ? {
              drip_track: "paid",
              drip_track_switched_at: new Date().toISOString(),
            } : {}),
            updated_at: new Date().toISOString(),
          }).eq("id", profile.id);

          fixed.push({
            email,
            was: `${profile.plan}/${profile.stripe_subscription_status ?? "null"}`,
            now: `${stripePlan}/${stripeStatus}`,
            sub_id: activeSub.id,
          });
        }
      } catch (err) {
        errors.push({
          email: profile.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checked: profiles.length,
      fixed,
      errors,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Reconciliation failed"
    }, { status: 500 });
  }
}

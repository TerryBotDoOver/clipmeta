import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getStripe } from '@/lib/stripe';
import { PLANS, ANNUAL_PLANS, normalizePlan } from '@/lib/plans';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Plan hierarchy for determining upgrade vs downgrade
const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  starter_annual: 1,
  pro: 2,
  pro_annual: 2,
  studio: 3,
  studio_annual: 3,
};

function getPriceId(plan: string): string | null {
  if (plan in PLANS) {
    return (PLANS as Record<string, { priceId: string | null }>)[plan]?.priceId ?? null;
  }
  if (plan in ANNUAL_PLANS) {
    return (ANNUAL_PLANS as Record<string, { priceId: string }>)[plan]?.priceId ?? null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { plan } = body as { plan: string };

    if (!plan || !(plan in PLAN_ORDER)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const newPriceId = getPriceId(plan);
    if (!newPriceId) {
      return NextResponse.json({ error: 'Price not configured for this plan' }, { status: 400 });
    }

    // Get user's current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan, stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription. Use checkout for new subscriptions.' }, { status: 400 });
    }

    const currentPlanRank = PLAN_ORDER[profile.plan] ?? 0;
    const newPlanRank = PLAN_ORDER[plan] ?? 0;

    if (currentPlanRank === newPlanRank) {
      return NextResponse.json({ error: 'Already on this plan tier' }, { status: 400 });
    }

    const stripe = getStripe();
    const direction = newPlanRank > currentPlanRank ? 'upgrade' : 'downgrade';

    // Retrieve the current subscription to get the item ID
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return NextResponse.json({ error: 'Subscription is not active' }, { status: 400 });
    }

    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      return NextResponse.json({ error: 'No subscription item found' }, { status: 500 });
    }

    const cleanPriceId = newPriceId.replace(/[\r\n\s]/g, '');
    const newBasePlan = normalizePlan(plan);

    if (direction === 'upgrade') {
      // UPGRADE: Apply immediately with proration
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        items: [{ id: subscriptionItemId, price: cleanPriceId }],
        proration_behavior: 'always_invoice',
        metadata: { supabase_uid: user.id, plan, base_plan: newBasePlan },
      });

      // Update DB immediately — user gets the new plan now
      // Don't reset clip counter — user keeps their usage, but the higher plan limit
      // gives them more room (e.g. Starter 140 used → Pro 320 limit = 180 more clips)
      await supabaseAdmin.from('profiles').update({
        plan,
        pending_plan: null,
        pending_plan_effective_date: null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      return NextResponse.json({
        success: true,
        type: 'upgraded',
        plan: newBasePlan,
      });

    } else {
      // DOWNGRADE: Change Stripe subscription item now (so next invoice is lower price)
      // but keep the current plan in our DB until period end
      const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        items: [{ id: subscriptionItemId, price: cleanPriceId }],
        proration_behavior: 'none',
        metadata: { supabase_uid: user.id, plan, base_plan: newBasePlan },
      });

      // current_period_end is on the subscription object itself
      const periodEnd = (updated as typeof updated & { current_period_end?: number }).current_period_end ??
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // fallback: ~30 days
      const effectiveDate = new Date(periodEnd * 1000).toISOString();

      // Store pending downgrade — keep current plan active until period end
      await supabaseAdmin.from('profiles').update({
        pending_plan: plan,
        pending_plan_effective_date: effectiveDate,
        updated_at: new Date().toISOString(),
        // DO NOT change `plan` — user keeps current plan until period end
      }).eq('id', user.id);

      return NextResponse.json({
        success: true,
        type: 'scheduled',
        plan: newBasePlan,
        effective_date: effectiveDate,
      });
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('Change-plan error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

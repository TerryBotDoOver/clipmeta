import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getStripe, PLANS } from '@/lib/stripe';
import { ANNUAL_PLANS, normalizePlan } from '@/lib/plans';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getWelcomeRewardCouponForPlan } from '@/lib/welcome-reward';

const VALID_MONTHLY_PLANS = ['starter', 'pro', 'studio'] as const;
const VALID_ANNUAL_PLANS = ['starter_annual', 'pro_annual', 'studio_annual'] as const;

type MonthlyPlanKey = typeof VALID_MONTHLY_PLANS[number];
type AnnualPlanKey = typeof VALID_ANNUAL_PLANS[number];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const plan = body.plan as string;

    const isMonthly = (VALID_MONTHLY_PLANS as readonly string[]).includes(plan);
    const isAnnual = (VALID_ANNUAL_PLANS as readonly string[]).includes(plan);

    if (!isMonthly && !isAnnual) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    let priceId: string;
    if (isAnnual) {
      priceId = ANNUAL_PLANS[plan as AnnualPlanKey].priceId;
    } else {
      const monthlyPlan = PLANS[plan as MonthlyPlanKey];
      priceId = monthlyPlan.priceId as string;
    }

    // Belt-and-suspenders: strip any stray \r\n from env vars (Vercel CLI can inject them)
    priceId = priceId.replace(/[\r\n\s]/g, '');

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured yet' }, { status: 400 });
    }

    console.log('[checkout] priceId after clean:', JSON.stringify(priceId), 'plan:', plan);
    const basePlan = normalizePlan(plan);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://clipmeta.app').replace(/[\r\n\s]/g, '');

    // Get or create Stripe customer
    let customerId: string | undefined;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, utm_source, utm_medium, utm_campaign, utm_referrer, promo_unlocked_at')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
    }

    customerId = profile?.stripe_customer_id ?? undefined;

    // Build UTM metadata for Stripe (from profile if already synced)
    const utmMeta: Record<string, string> = {};
    if (profile?.utm_source) utmMeta.utm_source = profile.utm_source;
    if (profile?.utm_medium) utmMeta.utm_medium = profile.utm_medium;
    if (profile?.utm_campaign) utmMeta.utm_campaign = profile.utm_campaign;
    if (profile?.utm_referrer) utmMeta.utm_referrer = profile.utm_referrer;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email!,
        metadata: { supabase_uid: user.id, ...utmMeta },
      });
      customerId = customer.id;
      await supabaseAdmin.from('profiles').upsert({
        id: user.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });
    }

    // Check if this user already had a trial (don't give second trials)
    // Belt-and-suspenders: check BOTH our DB and Stripe directly to prevent race conditions
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('had_trial, stripe_subscription_id, trial_ip')
      .eq('id', user.id)
      .single();

    // Get client IP for IP-based dedup
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || null;

    // Check Stripe directly for any existing subscriptions (catches race conditions)
    let stripeHadTrial = false;
    try {
      const existingSubs = await getStripe().subscriptions.list({
        customer: customerId,
        limit: 5,
        status: 'all',
      });
      stripeHadTrial = existingSubs.data.length > 0;
    } catch {
      // Non-fatal — fall back to DB check
    }

    // Check if another account already used a trial from this IP
    let ipAlreadyUsedTrial = false;
    if (clientIp) {
      const { data: ipMatch } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('trial_ip', clientIp)
        .neq('id', user.id)
        .limit(1)
        .single();
      ipAlreadyUsedTrial = !!ipMatch;
    }

    const alreadyHadTrial = existingProfile?.had_trial
      || existingProfile?.stripe_subscription_id
      || stripeHadTrial
      || ipAlreadyUsedTrial;

    const trialDays = alreadyHadTrial ? undefined : 7;

    // Record trial IP on this user's profile before creating checkout
    if (!alreadyHadTrial && clientIp) {
      await supabaseAdmin
        .from('profiles')
        .update({ trial_ip: clientIp })
        .eq('id', user.id);
    }

    // Apply the tiered welcome reward. Monthly plans use percent-off coupons;
    // annual plans use fixed amount-off coupons so the reward is bounded.
    let welcomeDiscount: { coupon: string }[] | undefined;
    const welcomeCoupon = getWelcomeRewardCouponForPlan(plan, profile?.promo_unlocked_at);
    if (welcomeCoupon) welcomeDiscount = [{ coupon: welcomeCoupon }];

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // If welcome reward applies, use discounts instead of allow_promotion_codes
      // (Stripe doesn't allow both at the same time)
      ...(welcomeDiscount
        ? { discounts: welcomeDiscount }
        : { allow_promotion_codes: true }),
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { supabase_uid: user.id, plan, base_plan: basePlan, ...utmMeta },
      subscription_data: {
        metadata: { supabase_uid: user.id, plan, base_plan: basePlan },
        ...(trialDays ? { trial_period_days: trialDays } : {}),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('Checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

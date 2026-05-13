import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getStripe, PLANS } from '@/lib/stripe';
import { ANNUAL_PLANS, normalizePlan } from '@/lib/plans';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  ANNUAL_WELCOME_COUPONS,
  MONTHLY_WELCOME_COUPONS,
  getWelcomeRewardCouponForPlan,
} from '@/lib/welcome-reward';
import { findTrialClaimMatches, getClientIp, trialIpHash } from '@/lib/trial-claims';

const VALID_MONTHLY_PLANS = ['starter', 'pro', 'studio'] as const;
const VALID_ANNUAL_PLANS = ['starter_annual', 'pro_annual', 'studio_annual'] as const;
const TRIAL_MAX_ACCOUNT_AGE_DAYS = 14;
const TRIAL_MAX_LIFETIME_CLIPS = 9;

type MonthlyPlanKey = typeof VALID_MONTHLY_PLANS[number];
type AnnualPlanKey = typeof VALID_ANNUAL_PLANS[number];

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return null;
  return Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
}

function getTrialDeniedCouponForPlan(plan: string) {
  const annualCoupons = ANNUAL_WELCOME_COUPONS[plan as keyof typeof ANNUAL_WELCOME_COUPONS];
  if (annualCoupons) return annualCoupons.tier1;
  return MONTHLY_WELCOME_COUPONS.tier1;
}

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
      .select('plan, stripe_customer_id, stripe_subscription_id, had_trial, utm_source, utm_medium, utm_campaign, utm_referrer, promo_unlocked_at')
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

    if (!customerId && user.email) {
      const existingCustomers = await getStripe().customers.search({
        query: `email:'${user.email.replace(/'/g, "\\'")}'`,
        limit: 1,
      });
      customerId = existingCustomers.data[0]?.id;
    }

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email!,
        metadata: { supabase_uid: user.id, ...utmMeta },
      });
      customerId = customer.id;
    }

    if (customerId && customerId !== profile?.stripe_customer_id) {
      await supabaseAdmin.from('profiles').upsert({
        id: user.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });
    }

    const clientIpHash = trialIpHash(getClientIp(req.headers));

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

    const trialClaimMatches = await findTrialClaimMatches({
      email: user.email,
      stripeCustomerId: customerId,
    });

    const { count: lifetimeCreatedClips } = await supabaseAdmin
      .from('clip_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action', 'created');

    const accountAgeDays = daysSince(user.created_at);
    const lifetimeClipCount = lifetimeCreatedClips ?? 0;
    const isFreeAccount = normalizePlan(profile?.plan) === 'free';
    const hasSubscriptionHistory = !!profile?.stripe_subscription_id || stripeHadTrial;
    const accountTooOldForTrial =
      isFreeAccount &&
      !hasSubscriptionHistory &&
      accountAgeDays !== null &&
      accountAgeDays >= TRIAL_MAX_ACCOUNT_AGE_DAYS;
    const lifetimeUsageTooHighForTrial =
      isFreeAccount &&
      !hasSubscriptionHistory &&
      lifetimeClipCount > TRIAL_MAX_LIFETIME_CLIPS;

    const trialDenialReasons = [
      ...(profile?.had_trial ? ['profile_had_trial'] : []),
      ...(profile?.stripe_subscription_id ? ['profile_subscription'] : []),
      ...(stripeHadTrial ? ['stripe_subscription_history'] : []),
      ...(accountTooOldForTrial ? [`free_account_age_${accountAgeDays}_days_gte_${TRIAL_MAX_ACCOUNT_AGE_DAYS}`] : []),
      ...(lifetimeUsageTooHighForTrial ? [`lifetime_clips_${lifetimeClipCount}_gte_${TRIAL_MAX_LIFETIME_CLIPS + 1}`] : []),
      ...trialClaimMatches.map((match) => `trial_claim_${match.reason}`),
    ];

    const alreadyHadTrial = profile?.had_trial
      || profile?.stripe_subscription_id
      || stripeHadTrial
      || accountTooOldForTrial
      || lifetimeUsageTooHighForTrial
      || trialClaimMatches.length > 0;

    const trialDays = alreadyHadTrial ? undefined : 7;

    // Apply the tiered welcome reward. Monthly plans use percent-off coupons;
    // annual plans use fixed amount-off coupons so the reward is bounded.
    let welcomeDiscount: { coupon: string }[] | undefined;
    const trialDeniedCoupon =
      (accountTooOldForTrial || lifetimeUsageTooHighForTrial)
        ? getTrialDeniedCouponForPlan(plan)
        : null;
    const welcomeCoupon =
      trialDeniedCoupon || getWelcomeRewardCouponForPlan(plan, profile?.promo_unlocked_at);
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
      metadata: {
        supabase_uid: user.id,
        plan,
        base_plan: basePlan,
        trial_eligible: trialDays ? 'true' : 'false',
        trial_denial_reasons: trialDenialReasons.join(',').slice(0, 500),
        lifetime_created_clips: String(lifetimeClipCount),
        account_age_days: accountAgeDays === null ? '' : String(accountAgeDays),
        trial_fallback_coupon: trialDeniedCoupon ?? '',
        trial_ip_hash: clientIpHash ?? '',
        ...utmMeta,
      },
      subscription_data: {
        metadata: {
          supabase_uid: user.id,
          plan,
          base_plan: basePlan,
          trial_eligible: trialDays ? 'true' : 'false',
          trial_denial_reasons: trialDenialReasons.join(',').slice(0, 500),
          lifetime_created_clips: String(lifetimeClipCount),
          account_age_days: accountAgeDays === null ? '' : String(accountAgeDays),
          trial_fallback_coupon: trialDeniedCoupon ?? '',
          trial_ip_hash: clientIpHash ?? '',
        },
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

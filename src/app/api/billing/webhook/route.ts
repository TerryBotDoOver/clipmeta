import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const getUid = (obj: Stripe.Metadata | null) => obj?.supabase_uid;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = getUid(session.metadata);
        const plan = session.metadata?.plan;
        const creditsStr = session.metadata?.credits;

        if (uid && creditsStr) {
          // One-time credit pack purchase — add credits to profile
          const creditsToAdd = parseInt(creditsStr, 10);
          if (!isNaN(creditsToAdd) && creditsToAdd > 0) {
            const { data: currentProfile } = await supabaseAdmin
              .from('profiles')
              .select('credits')
              .eq('id', uid)
              .maybeSingle();
            const current = currentProfile?.credits ?? 0;
            await supabaseAdmin.from('profiles').upsert({
              id: uid,
              credits: current + creditsToAdd,
              updated_at: new Date().toISOString(),
            });
          }
        } else if (uid && plan) {
          // Subscription checkout — existing logic
          const sub = session.subscription
            ? await getStripe().subscriptions.retrieve(session.subscription as string)
            : null;
          // Only reset clip counter when trial converts to paid (not during trial upgrades)
          const isTrialing = sub?.status === 'trialing';
          await supabaseAdmin.from('profiles').upsert({
            id: uid,
            plan,
            stripe_subscription_id: session.subscription as string,
            stripe_subscription_status: sub?.status ?? 'active',
            had_trial: true,
            // Reset counter only on first paid charge, not trial plan changes
            ...(!isTrialing ? { clips_used_this_month: 0, regens_used_this_month: 0, billing_period_start: new Date().toISOString() } : {}),
            // Move user to paid drip track; drip_track_switched_at anchors the paid email schedule.
            drip_track: 'paid',
            drip_track_switched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Fires 3 days before trial ends — good for reminder emails (future)
        break;
      }

      // Fallback: fires reliably when a new subscription is created
      // Catches cases where checkout.session.completed webhook is missed
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const uid = getUid(sub.metadata);
        const plan = sub.metadata?.plan;
        if (uid && plan) {
          const isTrial = sub.status === 'trialing';
          const isActive = sub.status === 'active';
          if (isTrial || isActive) {
            // Only update if profile is still on free (don't overwrite existing paid plan)
            const { data: existing } = await supabaseAdmin
              .from('profiles')
              .select('plan')
              .eq('id', uid)
              .maybeSingle();
            if (!existing || existing.plan === 'free') {
              await supabaseAdmin.from('profiles').upsert({
                id: uid,
                plan,
                stripe_subscription_id: sub.id,
                stripe_subscription_status: sub.status,
                had_trial: isTrial ? true : undefined,
                drip_track: 'paid',
                drip_track_switched_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const uid = getUid(sub.metadata);
        if (uid) {
          const isActive = sub.status === 'active';
          const isTrial = sub.status === 'trialing';

          // Derive plan from price amount (source of truth) instead of metadata alone
          const priceAmount = sub.items?.data?.[0]?.price?.unit_amount;
          // Map both monthly and annual prices to plan names
          const planFromPrice = (priceAmount === 4900 || priceAmount === 49000) ? 'studio'
            : (priceAmount === 1900 || priceAmount === 19000) ? 'pro'
            : (priceAmount === 900 || priceAmount === 9000) ? 'starter'
            : null;
          const plan = (isActive || isTrial) ? (planFromPrice || sub.metadata?.plan || 'free') : 'free';

          // Check if there's a pending downgrade that should now apply
          const { data: currentProfile } = await supabaseAdmin
            .from('profiles')
            .select('pending_plan, pending_plan_effective_date')
            .eq('id', uid)
            .single();

          const now = new Date();
          const effectiveDate = currentProfile?.pending_plan_effective_date
            ? new Date(currentProfile.pending_plan_effective_date)
            : null;

          // If we have a pending plan and we're past the effective date, apply it
          const shouldApplyPending = currentProfile?.pending_plan && effectiveDate && now >= effectiveDate;
          const finalPlan = shouldApplyPending ? currentProfile.pending_plan : plan;

          await supabaseAdmin.from('profiles').upsert({
            id: uid,
            plan: finalPlan,
            stripe_subscription_status: sub.status,
            // Clear pending plan fields when applied
            ...(shouldApplyPending ? {
              pending_plan: null,
              pending_plan_effective_date: null,
            } : {}),
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const uid = getUid(sub.metadata);
        if (uid) {
          await supabaseAdmin.from('profiles').upsert({
            id: uid,
            plan: 'free',
            stripe_subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}


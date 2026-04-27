import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getResend } from '@/lib/resend';
import { receiptEmail } from '@/lib/emails';
import { PLANS, type Plan } from '@/lib/plans';
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
  const getSubscriptionPeriodStartIso = (sub: Stripe.Subscription) => {
    const periodStart = (sub as unknown as { current_period_start?: number }).current_period_start;
    return typeof periodStart === 'number'
      ? new Date(periodStart * 1000).toISOString()
      : null;
  };

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
            ...(!isTrialing ? { regens_used_this_month: 0, billing_period_start: new Date().toISOString() } : {}),
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

      // ── Send branded ClipMeta receipt on successful charge ──
      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;
        // Only send for non-zero charges (skip $0 trial invoices)
        if (charge.amount > 0 && charge.receipt_email) {
          try {
            const resend = getResend();
            const amount = charge.amount / 100;
            const currency = charge.currency || 'usd';

            // Figure out what they bought from the charge description or metadata
            let description = charge.description || 'ClipMeta purchase';
            // Clean up Stripe's default descriptions
            if (description.includes('Subscription creation'))
              description = `ClipMeta subscription`;
            if (description.includes('Subscription update'))
              description = `ClipMeta subscription update`;

            // Check metadata for more specific info
            const credits = charge.metadata?.credits;
            const plan = charge.metadata?.plan;
            if (credits) description = `${credits} Clip Credits`;
            if (plan && !credits) description = `ClipMeta ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`;

            // Payment method info
            let paymentMethod = '';
            if (charge.payment_method_details?.card) {
              const card = charge.payment_method_details.card;
              paymentMethod = `${card.brand?.charAt(0).toUpperCase()}${card.brand?.slice(1) || ''} ending in ${card.last4}`;
            }

            // Use Stripe receipt_number if available, fall back to charge ID
            const receiptNumber =
              (charge as Stripe.Charge & { receipt_number?: string }).receipt_number ||
              charge.id.replace('ch_', '').slice(0, 12).toUpperCase();

            const receipt = receiptEmail({
              customerEmail: charge.receipt_email,
              customerName: charge.billing_details?.name || undefined,
              amount,
              currency,
              description,
              date: new Date(charge.created * 1000).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              }),
              paymentMethod,
              receiptNumber,
              isSubscription: !credits,
              planName: plan || undefined,
            });

            await resend.emails.send({
              from: process.env.RESEND_FROM || 'ClipMeta <hello@clipmeta.app>',
              to: charge.receipt_email,
              subject: receipt.subject,
              html: receipt.html,
            });
            console.log(`[receipt] Sent to ${charge.receipt_email} — ${description} — $${amount}`);
          } catch (receiptErr) {
            // Don't fail the webhook if receipt email fails — just log
            console.error('[receipt] Failed to send:', receiptErr);
          }
        }
        break;
      }

      // Fires on every successful invoice: the first subscription charge AND every renewal.
      // On renewal (billing_reason === 'subscription_cycle') we:
      //   1. Roll unused clips from the period that just ended into rollover_clips, capped.
      //   2. Reset regens_used_this_month and billing_period_start for the new period.
      // On the first charge (subscription_create) we only reset the period — there's
      // no prior period to roll over.
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string }).subscription;
        if (!subId) break;

        const sub = await getStripe().subscriptions.retrieve(subId);
        const uid = getUid(sub.metadata);
        if (!uid) break;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('plan, rollover_clips, billing_period_start, referral_pro_forever, referral_pro_until')
          .eq('id', uid)
          .maybeSingle();
        if (!profile) break;

        let plan = (profile.plan && profile.plan in PLANS ? profile.plan : 'free') as Plan;
        if (profile.referral_pro_forever) plan = 'pro';
        if (profile.referral_pro_until && new Date(profile.referral_pro_until) > new Date()) plan = 'pro';
        if (plan === 'free') break;
        const planConfig = PLANS[plan];

        const now = new Date();
        const isRenewal = invoice.billing_reason === 'subscription_cycle';
        const subscriptionPeriodStart = getSubscriptionPeriodStartIso(sub);
        const newPeriodStartIso = subscriptionPeriodStart ?? now.toISOString();

        // Stripe can deliver both invoice.paid and invoice.payment_succeeded for
        // the same invoice. Once billing_period_start has advanced to the
        // subscription's current period start, this invoice is already applied.
        if (
          profile.billing_period_start &&
          subscriptionPeriodStart &&
          new Date(profile.billing_period_start).getTime() >= new Date(subscriptionPeriodStart).getTime()
        ) {
          break;
        }

        const updates: Record<string, unknown> = {
          regens_used_this_month: 0,
          billing_period_start: newPeriodStartIso,
          updated_at: now.toISOString(),
        };

        if (isRenewal && profile.billing_period_start) {
          // Count clips actually uploaded in the period that just ended.
          const { count: uploadCount } = await supabaseAdmin
            .from('clip_history')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('action', 'created')
            .gte('created_at', profile.billing_period_start)
            .lt('created_at', newPeriodStartIso);

          const used = uploadCount || 0;
          const unused = Math.max(0, planConfig.clips - used);
          const currentRollover = profile.rollover_clips ?? 0;
          updates.rollover_clips = Math.min(currentRollover + unused, planConfig.rolloverCap);
        }

        await supabaseAdmin.from('profiles').update(updates).eq('id', uid);
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


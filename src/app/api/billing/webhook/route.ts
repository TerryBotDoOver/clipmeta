import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getResend } from '@/lib/resend';
import { receiptEmail } from '@/lib/emails';
import { ANNUAL_PLANS, PLANS, getPlanDisplayName, normalizePlan } from '@/lib/plans';
import { DISCORD_CHANNELS, sendDiscordMessage } from '@/lib/discord';
import {
  findDuplicatePaymentTrialClaim,
  getSubscriptionPaymentFingerprint,
  recordTrialClaim,
} from '@/lib/trial-claims';
import Stripe from 'stripe';

type StripeObjectWithId = { id?: string } | null | undefined;

function stripeObjectId(value: string | StripeObjectWithId) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatPlan(plan: string | null | undefined) {
  if (!plan) return null;
  return getPlanDisplayName(plan);
}

function invoiceReasonLabel(reason: string | null | undefined, hasCredits: boolean) {
  if (hasCredits) return 'Credit pack purchase';
  switch (reason) {
    case 'subscription_create':
      return 'New subscription payment';
    case 'subscription_cycle':
      return 'Subscription renewal';
    case 'subscription_update':
      return 'Subscription change payment';
    case 'manual':
      return 'Manual invoice payment';
    default:
      return 'Payment';
  }
}

function formatStripeTimestamp(timestamp: number | null | undefined) {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatStripePrice(price: Stripe.Price | null | undefined) {
  if (!price?.unit_amount || !price.currency) return null;
  const amount = formatCurrency(price.unit_amount, price.currency);
  const interval = price.recurring?.interval;
  const intervalCount = price.recurring?.interval_count ?? 1;
  if (!interval) return amount;
  const cadence = intervalCount > 1 ? `${intervalCount} ${interval}s` : interval;
  return `${amount}/${cadence}`;
}

async function sendPaidPlanSignupDiscordNotification(sub: Stripe.Subscription) {
  const plan = sub.metadata?.plan;
  if (!plan || normalizePlan(plan) === 'free') return;
  if (!['trialing', 'active'].includes(sub.status)) return;

  const stripe = getStripe();
  const customerId = stripeObjectId(sub.customer as string | StripeObjectWithId);
  let customer: Stripe.Customer | null = null;
  if (customerId) {
    try {
      const retrieved = await stripe.customers.retrieve(customerId);
      customer = retrieved.deleted ? null : retrieved;
    } catch (error) {
      console.warn('[stripe-discord] Could not retrieve signup customer:', error);
    }
  }

  const uid = sub.metadata?.supabase_uid || customer?.metadata?.supabase_uid || null;
  let profile: {
    id: string;
    plan: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_subscription_status: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_referrer: string | null;
  } | null = null;

  if (uid) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, utm_source, utm_medium, utm_campaign, utm_referrer')
      .eq('id', uid)
      .maybeSingle();
    profile = data ?? null;
  } else if (customerId) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, utm_source, utm_medium, utm_campaign, utm_referrer')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    profile = data ?? null;
  }

  let authEmail: string | null = null;
  if (profile?.id) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      authEmail = data?.user?.email ?? null;
    } catch (error) {
      console.warn('[stripe-discord] Could not retrieve signup auth user:', error);
    }
  }

  let priorSubscriptionCount = 0;
  let priorPaidChargeCount = 0;
  if (customerId) {
    try {
      const [subscriptions, charges] = await Promise.all([
        stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 }),
        stripe.charges.list({ customer: customerId, limit: 10 }),
      ]);
      priorSubscriptionCount = subscriptions.data.filter((item) => item.id !== sub.id).length;
      priorPaidChargeCount = charges.data.filter((item) => item.amount > 0 && item.paid).length;
    } catch (error) {
      console.warn('[stripe-discord] Could not retrieve signup customer history:', error);
    }
  }

  const price = sub.items?.data?.[0]?.price ?? null;
  const trialEnd = formatStripeTimestamp(sub.trial_end);
  const nextCharge = formatStripeTimestamp(
    (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end ??
      (sub as unknown as { current_period_end?: number }).current_period_end
  );
  const customerEmail = customer?.email || authEmail || 'unknown email';
  const customerName = customer?.name || null;
  const utm = [
    profile?.utm_source ? `source=${profile.utm_source}` : null,
    profile?.utm_medium ? `medium=${profile.utm_medium}` : null,
    profile?.utm_campaign ? `campaign=${profile.utm_campaign}` : null,
    profile?.utm_referrer ? `referrer=${profile.utm_referrer}` : null,
  ].filter(Boolean).join(', ');

  const content = [
    '**ClipMeta paid plan signup**',
    `Plan: ${formatPlan(plan) ?? plan}`,
    `Status: ${sub.status}${sub.status === 'trialing' ? ' (trial)' : ''}`,
    `Price: ${formatStripePrice(price) ?? 'unknown'}`,
    sub.status === 'trialing' ? `Payment today: $0 trial signup` : null,
    trialEnd ? `Trial ends: ${trialEnd}` : null,
    nextCharge ? `Current period ends: ${nextCharge}` : null,
    `Customer: ${customerName ? `${customerName} <${customerEmail}>` : customerEmail}`,
    `Customer type: ${priorSubscriptionCount > 0 || priorPaidChargeCount > 0 ? 'Repeat Stripe customer' : 'New Stripe customer'}`,
    profile?.id || uid ? `User ID: ${profile?.id || uid}` : null,
    profile?.stripe_subscription_status ? `Previous app status: ${profile.stripe_subscription_status}` : null,
    utm ? `Attribution: ${utm}` : null,
    customerId ? `Stripe customer: ${customerId}` : null,
    `Stripe subscription: ${sub.id}`,
  ].filter(Boolean).join('\n');

  await sendDiscordMessage({
    channelId: DISCORD_CHANNELS.payments,
    content,
  });
}

async function sendStripePaymentDiscordNotification(charge: Stripe.Charge) {
  if (charge.amount <= 0) return;

  const stripe = getStripe();
  const customerId = stripeObjectId(charge.customer as string | StripeObjectWithId);
  const invoiceId = stripeObjectId(
    (charge as Stripe.Charge & { invoice?: string | StripeObjectWithId }).invoice as string | StripeObjectWithId
  );
  const creditCount = charge.metadata?.credits;

  let customer: Stripe.Customer | null = null;
  if (customerId) {
    try {
      const retrieved = await stripe.customers.retrieve(customerId);
      customer = retrieved.deleted ? null : retrieved;
    } catch (error) {
      console.warn('[stripe-discord] Could not retrieve customer:', error);
    }
  }

  let subscription: Stripe.Subscription | null = null;
  let invoiceReason: string | null = null;
  let lineDescription: string | null = null;
  if (invoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId, {
        expand: ['subscription', 'lines.data.price'],
      } as Stripe.InvoiceRetrieveParams);
      invoiceReason = invoice.billing_reason ?? null;
      lineDescription = invoice.lines?.data?.[0]?.description ?? null;
      const invoiceSubscription = (invoice as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      }).subscription;
      if (typeof invoiceSubscription === 'string') {
        subscription = await stripe.subscriptions.retrieve(invoiceSubscription);
      } else if (invoiceSubscription && 'id' in invoiceSubscription) {
        subscription = invoiceSubscription;
      }
    } catch (error) {
      console.warn('[stripe-discord] Could not retrieve invoice context:', error);
    }
  }

  const uid =
    charge.metadata?.supabase_uid ||
    subscription?.metadata?.supabase_uid ||
    customer?.metadata?.supabase_uid ||
    null;

  let profile: {
    id: string;
    plan: string | null;
    stripe_customer_id: string | null;
  } | null = null;

  if (uid) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, plan, stripe_customer_id')
      .eq('id', uid)
      .maybeSingle();
    profile = data ?? null;
  } else if (customerId) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, plan, stripe_customer_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    profile = data ?? null;
  }

  let authEmail: string | null = null;
  if (profile?.id) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      authEmail = data?.user?.email ?? null;
    } catch (error) {
      console.warn('[stripe-discord] Could not retrieve auth user:', error);
    }
  }

  let priorPaidChargeCount = 0;
  if (customerId) {
    try {
      const priorCharges = await stripe.charges.list({ customer: customerId, limit: 10 });
      priorPaidChargeCount = priorCharges.data.filter(
        (item) => item.id !== charge.id && item.amount > 0 && item.paid
      ).length;
    } catch (error) {
      console.warn('[stripe-discord] Could not retrieve prior charges:', error);
    }
  }

  const plan =
    charge.metadata?.plan ||
    subscription?.metadata?.plan ||
    profile?.plan ||
    null;

  const what = creditCount
    ? `${creditCount} ClipMeta clip credits`
    : formatPlan(plan)
    ? `${formatPlan(plan)} subscription`
    : lineDescription || charge.description || 'ClipMeta purchase';

  const paymentMethod = charge.payment_method_details?.card
    ? `${charge.payment_method_details.card.brand?.toUpperCase() || 'Card'} ending ${charge.payment_method_details.card.last4}`
    : null;

  const customerEmail =
    charge.receipt_email ||
    charge.billing_details?.email ||
    authEmail ||
    customer?.email ||
    'unknown email';
  const customerName = charge.billing_details?.name || customer?.name || null;

  const content = [
    '**ClipMeta payment received**',
    `Amount: ${formatCurrency(charge.amount, charge.currency)} ${charge.currency.toUpperCase()}`,
    `Customer: ${customerName ? `${customerName} <${customerEmail}>` : customerEmail}`,
    `Customer type: ${priorPaidChargeCount > 0 ? 'Repeat customer' : 'New paid customer'}`,
    `Transaction: ${invoiceReasonLabel(invoiceReason, !!creditCount)}`,
    `What they got: ${what}`,
    paymentMethod ? `Payment method: ${paymentMethod}` : null,
    profile?.id || uid ? `User ID: ${profile?.id || uid}` : null,
    customerId ? `Stripe customer: ${customerId}` : null,
    `Stripe charge: ${charge.id}`,
  ].filter(Boolean).join('\n');

  await sendDiscordMessage({
    channelId: DISCORD_CHANNELS.payments,
    content,
  });
}

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
  const stripeId = (value: string | Stripe.Customer | Stripe.DeletedCustomer | null) =>
    typeof value === 'string' ? value : value?.id ?? null;
  const getCustomerEmail = async (customerId: string | null) => {
    if (!customerId) return null;
    const customer = await getStripe().customers.retrieve(customerId);
    return customer.deleted ? null : customer.email;
  };
  const getSubscriptionPeriodStartIso = (sub: Stripe.Subscription) => {
    const periodStart =
      (sub.items?.data?.[0] as unknown as { current_period_start?: number } | undefined)?.current_period_start ??
      (sub as unknown as { current_period_start?: number }).current_period_start;
    return typeof periodStart === 'number'
      ? new Date(periodStart * 1000).toISOString()
      : null;
  };
  const captureTrialClaim = async (
    uid: string,
    plan: string,
    sub: Stripe.Subscription | null,
    source: string,
    metadata?: Stripe.Metadata | null
  ) => {
    if (!sub) return { duplicatePaymentTrialCanceled: false };

    const customerId = stripeId(sub.customer);
    const paymentFingerprint = await getSubscriptionPaymentFingerprint(sub);
    const paymentMatch = await findDuplicatePaymentTrialClaim(paymentFingerprint, uid, sub.id);
    const duplicatePaymentTrial =
      sub.status === 'trialing' && !!paymentMatch;

    await recordTrialClaim({
      userId: uid,
      email: await getCustomerEmail(customerId),
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      paymentFingerprint,
      ipHash: metadata?.trial_ip_hash || null,
      plan,
      source,
      metadata: {
        stripe_status: sub.status,
        duplicate_payment_trial: duplicatePaymentTrial,
      },
    });

    if (duplicatePaymentTrial) {
      await getStripe().subscriptions.cancel(sub.id, {
        invoice_now: false,
        prorate: false,
      });
      await supabaseAdmin.from('profiles').upsert({
        id: uid,
        plan: 'free',
        stripe_subscription_id: sub.id,
        stripe_subscription_status: 'canceled',
        had_trial: true,
        updated_at: new Date().toISOString(),
      });
      console.warn(`[trial-guard] Canceled duplicate trial for ${uid} on ${sub.id}`);
      return { duplicatePaymentTrialCanceled: true };
    }

    return { duplicatePaymentTrialCanceled: false };
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
          const trialClaim = await captureTrialClaim(
            uid,
            plan,
            sub,
            'checkout.session.completed',
            session.metadata
          );
          if (trialClaim.duplicatePaymentTrialCanceled) break;
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
            const trialClaim = await captureTrialClaim(
              uid,
              plan,
              sub,
              'customer.subscription.created',
              sub.metadata
            );
            if (trialClaim.duplicatePaymentTrialCanceled) break;

            try {
              await sendPaidPlanSignupDiscordNotification(sub);
            } catch (discordErr) {
              // Don't fail Stripe webhooks if Discord is down or temporarily rate-limited.
              console.error('[stripe-discord] Failed to send paid signup notification:', discordErr);
            }

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
          const priceId = sub.items?.data?.[0]?.price?.id?.replace(/[\r\n\s]/g, '');
          // Map both monthly and annual prices to plan names
          const planFromPrice = priceId === ANNUAL_PLANS.starter_annual.priceId ? 'starter_annual'
            : priceId === ANNUAL_PLANS.pro_annual.priceId ? 'pro_annual'
            : priceId === ANNUAL_PLANS.studio_annual.priceId ? 'studio_annual'
            : priceAmount === 4900 ? 'studio'
            : priceAmount === 1900 ? 'pro'
            : priceAmount === 900 ? 'starter'
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
          const billingPeriodStart = isActive ? getSubscriptionPeriodStartIso(sub) : null;
          await supabaseAdmin.from('profiles').upsert({
            id: uid,
            plan: finalPlan,
            stripe_subscription_status: sub.status,
            ...(billingPeriodStart ? { billing_period_start: billingPeriodStart } : {}),
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
        try {
          await sendStripePaymentDiscordNotification(charge);
        } catch (discordErr) {
          // Don't fail Stripe webhooks if Discord is down or temporarily rate-limited.
          console.error('[stripe-discord] Failed to send payment notification:', discordErr);
        }

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

        let plan = normalizePlan(profile.plan);
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


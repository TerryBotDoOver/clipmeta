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
        if (uid && plan) {
          await supabaseAdmin.from('profiles').upsert({
            id: uid,
            plan,
            stripe_subscription_id: session.subscription as string,
            stripe_subscription_status: 'active',
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const uid = getUid(sub.metadata);
        if (uid) {
          const isActive = sub.status === 'active';
          const plan = isActive ? (sub.metadata?.plan || 'free') : 'free';
          await supabaseAdmin.from('profiles').upsert({
            id: uid,
            plan,
            stripe_subscription_status: sub.status,
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


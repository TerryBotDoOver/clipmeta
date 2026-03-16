import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getStripe, PLANS } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const plan = body.plan as 'pro' | 'studio';
  if (plan !== 'pro' && plan !== 'studio') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const priceId = PLANS[plan].priceId;

  // Get or create Stripe customer
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { supabase_uid: user.id },
    });
    customerId = customer.id;
    await supabaseAdmin.from('profiles').upsert({ id: user.id, stripe_customer_id: customerId });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clipmeta.vercel.app';

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgraded=true`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { supabase_uid: user.id, plan },
    subscription_data: { metadata: { supabase_uid: user.id, plan } },
  });

  return NextResponse.json({ url: session.url });
}


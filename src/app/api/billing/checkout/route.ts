import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getStripe, PLANS } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const plan = body.plan as 'pro' | 'studio';
    if (plan !== 'pro' && plan !== 'studio') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = PLANS[plan].priceId;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clipmeta.vercel.app';

    // Get or create Stripe customer
    let customerId: string | undefined;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = row not found (expected for new users), anything else is real
      console.error('Profile fetch error:', profileError);
    }

    customerId = profile?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email!,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from('profiles').upsert({
        id: user.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { supabase_uid: user.id, plan },
      subscription_data: { metadata: { supabase_uid: user.id, plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}

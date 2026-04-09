import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

const CREDIT_PACKS: Record<number, number> = {
  50:  500,   // $5
  200: 1400,  // $14
  500: 2900,  // $29
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const packSize = Number(body.pack);

    if (!(packSize in CREDIT_PACKS)) {
      return NextResponse.json({ error: 'Invalid pack size. Choose 50, 200, or 500.' }, { status: 400 });
    }

    const amount = CREDIT_PACKS[packSize];
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://clipmeta.app').replace(/[\r\n\s]/g, '');

    // Get or create Stripe customer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id ?? undefined;

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
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${packSize} Clip Credits`,
            description: `${packSize} one-time clip credits for ClipMeta. Credits never expire.`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/dashboard?credits=added`,
      cancel_url: `${appUrl}/pricing#credits`,
      metadata: { supabase_uid: user.id, credits: String(packSize) },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('Buy credits error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

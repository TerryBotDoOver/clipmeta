import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = (process.env.DRIP_SECRET || 'clipmeta-drip-2026').trim();
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // List all products
  const products = await stripe.products.list({ limit: 20, active: true });

  // List all prices
  const prices = await stripe.prices.list({ limit: 50, active: true });

  // List env vars we have
  const envVars = {
    STRIPE_STARTER_PRICE_ID: process.env.STRIPE_STARTER_PRICE_ID || '(not set)',
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID || '(not set)',
    STRIPE_STUDIO_PRICE_ID: process.env.STRIPE_STUDIO_PRICE_ID || '(not set)',
    STRIPE_STARTER_ANNUAL_PRICE_ID: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || '(not set)',
    STRIPE_PRO_ANNUAL_PRICE_ID: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '(not set)',
    STRIPE_STUDIO_ANNUAL_PRICE_ID: process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID || '(not set)',
  };

  return NextResponse.json({
    products: products.data.map(p => ({ id: p.id, name: p.name, description: p.description })),
    prices: prices.data.map(p => ({
      id: p.id,
      product: p.product,
      amount: p.unit_amount,
      currency: p.currency,
      interval: p.recurring?.interval,
      nickname: p.nickname,
    })),
    envVars,
  });
}

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    });
  }
  return _stripe;
}

// Keep named export for convenience in route files
export { getStripe as stripe };

export const PLANS = {
  free:   { name: 'Free',   clips: 10,   priceId: null },
  pro:    { name: 'Pro',    clips: 320,  priceId: process.env.STRIPE_PRO_PRICE_ID! },
  studio: { name: 'Studio', clips: 2000, priceId: process.env.STRIPE_STUDIO_PRICE_ID! },
} as const;

export type Plan = keyof typeof PLANS;

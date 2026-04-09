import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY.replace(/[\r\n\s]/g, ''), {
      apiVersion: '2026-02-25.clover',
    });
  }
  return _stripe;
}

// Keep named export for convenience in route files
export { getStripe as stripe };

export { PLANS, type Plan } from './plans';

export const PLANS = {
  free:   { name: 'Free',   clips: 10,   priceId: null },
  pro:    { name: 'Pro',    clips: 320,  priceId: process.env.STRIPE_PRO_PRICE_ID ?? '' },
  studio: { name: 'Studio', clips: 2000, priceId: process.env.STRIPE_STUDIO_PRICE_ID ?? '' },
} as const;

export type Plan = keyof typeof PLANS;

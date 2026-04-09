// File size limits per plan (in bytes)
export const PLAN_FILE_SIZE_LIMITS: Record<string, number> = {
  free:    500  * 1024 * 1024,  // 500 MB  — compressed HD clips
  starter: 2   * 1024 * 1024 * 1024, // 2 GB — 4K H.264
  pro:     5   * 1024 * 1024 * 1024, // 5 GB — 4K ProRes
  studio:  10  * 1024 * 1024 * 1024, // 10 GB — no practical limit
};

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
}

// Helper: strip any accidental \r\n from env vars set via CLI
const cleanEnv = (val: string | undefined, fallback: string) =>
  (val ?? fallback).replace(/[\r\n]/g, '').trim() || fallback;

export const PLANS = {
  free:    { name: 'Free',    clips: 3,    regens: 1,   regensLabel: '1 regeneration/day',        priceId: null,  period: 'daily' as const,   rolloverCap: 0,    maxFileSizeBytes: PLAN_FILE_SIZE_LIMITS.free },
  starter: { name: 'Starter', clips: 140,  regens: 100, regensLabel: '100 regenerations/month',   priceId: cleanEnv(process.env.STRIPE_STARTER_PRICE_ID, 'price_1TDyllHwyttCVHwaGkkF3Hhu'), period: 'monthly' as const, rolloverCap: 280,  maxFileSizeBytes: PLAN_FILE_SIZE_LIMITS.starter },
  pro:     { name: 'Pro',     clips: 320,  regens: 300, regensLabel: '300 regenerations/month',   priceId: cleanEnv(process.env.STRIPE_PRO_PRICE_ID,     'price_1TBipgHwyttCVHwafvDzAemz'), period: 'monthly' as const, rolloverCap: 640,  maxFileSizeBytes: PLAN_FILE_SIZE_LIMITS.pro },
  studio:  { name: 'Studio',  clips: 2000, regens: -1,  regensLabel: 'Unlimited regenerations',   priceId: cleanEnv(process.env.STRIPE_STUDIO_PRICE_ID,  'price_1TBiphHwyttCVHwaP8k288kT'),  period: 'monthly' as const, rolloverCap: 4000, maxFileSizeBytes: PLAN_FILE_SIZE_LIMITS.studio },
} as const;

export type Plan = keyof typeof PLANS;

export const BULK_REGEN_PLANS = ['pro', 'studio', 'founder'] as const;

export const ANNUAL_PLANS = {
  starter_annual: {
    name: 'Starter Annual',
    clips: 140,
    regens: 100,
    regensLabel: '100 regenerations/month',
    priceId: cleanEnv(process.env.STRIPE_STARTER_ANNUAL_PRICE_ID, 'price_1TDyllHwyttCVHwaUGhF0GFj'),
    period: 'yearly' as const,
    monthlyEquiv: 7.50,
    savings: 18,
    rolloverCap: 150,
  },
  pro_annual: {
    name: 'Pro Annual',
    clips: 320,
    regens: 300,
    regensLabel: '300 regenerations/month',
    priceId: cleanEnv(process.env.STRIPE_PRO_ANNUAL_PRICE_ID, 'price_1TDyllHwyttCVHwaxhKSK7KL'),
    period: 'yearly' as const,
    monthlyEquiv: 15.83,
    savings: 38,
    rolloverCap: 640,
  },
  studio_annual: {
    name: 'Studio Annual',
    clips: 2000,
    regens: -1,
    regensLabel: 'Unlimited regenerations',
    priceId: cleanEnv(process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID, 'price_1TDyllHwyttCVHwaqKv9asHn'),
    period: 'yearly' as const,
    monthlyEquiv: 40.83,
    savings: 98,
    rolloverCap: 4000,
  },
} as const;

export type AnnualPlan = keyof typeof ANNUAL_PLANS;

export const CREDIT_PACKS = {
  small:  { clips: 50,  regens: 10,  price: 5,  label: '50 clips + 10 regens' },
  medium: { clips: 200, regens: 40,  price: 14, label: '200 clips + 40 regens' },
  large:  { clips: 500, regens: 100, price: 29, label: '500 clips + 100 regens' },
} as const;

export type CreditPack = keyof typeof CREDIT_PACKS;

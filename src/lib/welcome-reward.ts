export const WELCOME_TIER_1_HOURS = 24;
export const WELCOME_TIER_2_HOURS = 72;

export type WelcomeRewardTierKey = 'tier1' | 'tier2';

export type WelcomeRewardTier = {
  key: WelcomeRewardTierKey;
  monthlyLabel: string;
  annualLabel: string;
  expiresAt: number;
  nextTierAt: number | null;
  nextMonthlyLabel: string | null;
  nextAnnualLabel: string | null;
};

const TIER_LABELS: Record<WelcomeRewardTierKey, { monthlyLabel: string; annualLabel: string }> = {
  tier1: {
    monthlyLabel: '50% off first month',
    annualLabel: 'extra half month free on annual',
  },
  tier2: {
    monthlyLabel: '25% off first month',
    annualLabel: 'extra quarter month free on annual',
  },
};

export const MONTHLY_WELCOME_COUPONS: Record<WelcomeRewardTierKey, string> = {
  tier1: 'welcome_reward_50',
  tier2: 'welcome_reward_25',
};

export const ANNUAL_WELCOME_COUPONS = {
  starter_annual: {
    tier1: 'welcome_annual_starter_half_month',
    tier2: 'welcome_annual_starter_quarter_month',
  },
  pro_annual: {
    tier1: 'welcome_annual_pro_half_month',
    tier2: 'welcome_annual_pro_quarter_month',
  },
  studio_annual: {
    tier1: 'welcome_annual_studio_half_month',
    tier2: 'welcome_annual_studio_quarter_month',
  },
} as const satisfies Record<string, Record<WelcomeRewardTierKey, string>>;

function parseUnlockMs(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function getWelcomeRewardTier(
  unlockedAt: string | Date | null | undefined,
  nowMs = Date.now()
): WelcomeRewardTier | null {
  const unlockMs = parseUnlockMs(unlockedAt);
  if (unlockMs === null) return null;

  const hoursElapsed = (nowMs - unlockMs) / (1000 * 60 * 60);
  if (hoursElapsed < 0 || hoursElapsed >= WELCOME_TIER_2_HOURS) return null;

  if (hoursElapsed < WELCOME_TIER_1_HOURS) {
    return {
      key: 'tier1',
      ...TIER_LABELS.tier1,
      expiresAt: unlockMs + WELCOME_TIER_1_HOURS * 60 * 60 * 1000,
      nextTierAt: unlockMs + WELCOME_TIER_1_HOURS * 60 * 60 * 1000,
      nextMonthlyLabel: TIER_LABELS.tier2.monthlyLabel,
      nextAnnualLabel: TIER_LABELS.tier2.annualLabel,
    };
  }

  return {
    key: 'tier2',
    ...TIER_LABELS.tier2,
    expiresAt: unlockMs + WELCOME_TIER_2_HOURS * 60 * 60 * 1000,
    nextTierAt: null,
    nextMonthlyLabel: null,
    nextAnnualLabel: null,
  };
}

export function getWelcomeRewardCouponForPlan(
  plan: string,
  unlockedAt: string | Date | null | undefined,
  nowMs = Date.now()
): string | null {
  const tier = getWelcomeRewardTier(unlockedAt, nowMs);
  if (!tier) return null;

  const annualCoupons = ANNUAL_WELCOME_COUPONS[plan as keyof typeof ANNUAL_WELCOME_COUPONS];
  if (annualCoupons) return annualCoupons[tier.key];
  return MONTHLY_WELCOME_COUPONS[tier.key];
}

export function formatWelcomeCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '00:00:00';
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

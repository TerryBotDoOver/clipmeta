'use client';

import Link from 'next/link';

type RequiredPlan = 'starter' | 'pro' | 'studio';

type Props = {
  feature: string;
  description: string;
  requiredPlan: RequiredPlan;
};

const PLAN_NAMES: Record<RequiredPlan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  studio: 'Studio',
};

export function PlanGateBanner({ feature, description, requiredPlan }: Props) {
  return (
    <Link
      href="/pricing"
      className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm transition hover:border-violet-500/50 hover:bg-zinc-800/80 group"
    >
      <span className="text-base shrink-0">🔒</span>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-zinc-300">{feature}</span>
        <span className="text-zinc-500"> — {description}</span>
      </div>
      <span className="shrink-0 text-xs font-semibold text-violet-400 group-hover:text-violet-300 whitespace-nowrap">
        {PLAN_NAMES[requiredPlan]} — Upgrade →
      </span>
    </Link>
  );
}

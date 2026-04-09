'use client';

import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';

export function ClipLimitWarning() {
  const { plan, clipsUsed, clipsLimit, lifetimeClips, loading } = useProfile();

  if (loading) return null;

  // Studio/founder are unlimited
  if (plan === 'studio' || plan === ('founder' as string)) return null;

  // Free plan: show value-framed upgrade nudge if user has generated clips before
  if (plan === 'free') {
    if (lifetimeClips <= 0) return null;

    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex-wrap">
        <p className="text-sm text-amber-400">
          You've generated <span className="font-semibold">{lifetimeClips} clips</span> with ClipMeta.
          {' '}Unlock 140 clips/month for $9.
        </p>
        <Link
          href="/pricing"
          className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
        >
          See Plans →
        </Link>
      </div>
    );
  }

  // Paid plans: show warning at 80%+ monthly usage
  const pct = clipsLimit > 0 ? Math.round((clipsUsed / clipsLimit) * 100) : 0;
  if (pct < 80) return null;

  const isFull = pct >= 100;

  if (isFull) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex-wrap">
        <p className="text-sm text-red-400">
          <span className="font-semibold">Monthly limit reached</span> — you've used {clipsUsed} of {clipsLimit} clips this month.
        </p>
        <Link
          href="/pricing"
          className="shrink-0 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
        >
          Upgrade to continue →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex-wrap">
      <p className="text-sm text-amber-400">
        You've used <span className="font-semibold">{clipsUsed} of {clipsLimit}</span> clips this month.{' '}
        Upgrade to Pro for 320 clips/month.
      </p>
      <Link
        href="/pricing"
        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
      >
        Upgrade →
      </Link>
    </div>
  );
}

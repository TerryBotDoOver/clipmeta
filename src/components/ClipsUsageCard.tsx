'use client';

import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';

export function ClipsUsageCard() {
  const { plan, clipsUsed, clipsLimit, regensUsed, regensLimit, lifetimeClips, loading } = useProfile();

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 animate-pulse">
        <div className="h-3 w-24 rounded bg-muted mb-3" />
        <div className="h-7 w-16 rounded bg-muted mb-2" />
        <div className="h-1.5 w-full rounded-full bg-muted mb-3" />
        <div className="h-2.5 w-20 rounded bg-muted mb-1" />
        <div className="h-1 w-full rounded-full bg-muted" />
      </div>
    );
  }

  // Founder is the only truly unlimited plan. Studio now has caps (2000 clips, 500 regens).
  const isUnlimited = plan === ('founder' as string);
  const isFree = plan === 'free';

  if (isUnlimited) {
    return (
      <Link
        href="/pricing"
        aria-label="View plan details"
        className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 sm:p-5"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clips This Month</p>
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
            Founder
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold text-foreground">Unlimited</p>
        <p className="mt-1 text-xs text-muted-foreground">No monthly clip limit on your plan</p>
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Regenerations: <span className="text-foreground">Unlimited</span>
          </p>
        </div>
        <p className="mt-3 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
          View plan details →
        </p>
      </Link>
    );
  }

  if (isFree) {
    return (
      <Link
        href="/pricing"
        aria-label="Upgrade ClipMeta plan"
        className="group block rounded-xl border border-amber-500/30 bg-card p-4 transition-colors hover:border-amber-400/70 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-amber-400/40 sm:p-5"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clips</p>
          <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">Free</span>
        </div>
        <p className="mt-3 text-2xl font-bold text-foreground">3 <span className="text-sm font-medium text-muted-foreground">/ day</span></p>
        <p className="mt-1 text-xs text-muted-foreground">
          {lifetimeClips > 0
            ? <>{`You've generated ${lifetimeClips} clips with ClipMeta. `}<span className="font-medium text-violet-400">Unlock 140/month for $9/mo →</span></>
            : <>Free plan limit.{' '}<span className="font-medium text-violet-400">Upgrade for 140+/month →</span></>
          }
        </p>
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Regenerations: <span className="text-foreground">{regensUsed}</span> <span className="text-muted-foreground">/ 1 per day</span>
          </p>
        </div>
      </Link>
    );
  }

  const rawPct = clipsLimit > 0 ? (clipsUsed / clipsLimit) * 100 : 0;
  const pct = Math.round(rawPct);
  const isFull = clipsUsed >= clipsLimit;
  const isWarning = rawPct >= 80 && !isFull;

  const barColor = isFull ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-violet-500';
  const valueColor = isFull ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-foreground';
  const borderColor = isFull ? 'border-red-500/30' : isWarning ? 'border-amber-500/30' : 'border-border';

  return (
    <Link
      href="/pricing"
      aria-label="View ClipMeta usage and plan options"
      className={`group block rounded-xl border ${borderColor} bg-card p-4 transition-colors hover:border-primary/60 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 sm:p-5`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clips This Month</p>
        <span className={`text-xs font-semibold ${valueColor}`}>{Math.min(pct, 100)}%</span>
      </div>
      <p className={`mt-3 text-2xl font-bold ${valueColor}`}>
        {clipsUsed}{' '}
        <span className="text-sm font-medium text-muted-foreground">/ {clipsLimit}</span>
      </p>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {isFull && (
        <p className="mt-2 text-xs text-red-400">
          Monthly limit reached —{' '}
          <span className="font-semibold underline">
            Upgrade to continue →
          </span>
        </p>
      )}
      {isWarning && (
        <p className="mt-2 text-xs text-amber-400">
          Running low —{' '}
          <span className="font-semibold underline">
            Upgrade for more clips →
          </span>
        </p>
      )}
      {!isWarning && !isFull && (
        <p className="mt-1 text-xs text-muted-foreground">{clipsLimit - clipsUsed} remaining this month</p>
      )}

      {/* Regeneration usage */}
      {(() => {
        const regenPct = regensLimit > 0 ? Math.round((regensUsed / regensLimit) * 100) : 0;
        const regenWarning = regenPct >= 80 && regenPct < 100;
        const regenFull = regenPct >= 100;
        const regenBarColor = regenFull ? 'bg-red-500' : regenWarning ? 'bg-amber-500' : 'bg-violet-500/60';
        const regenTextColor = regenFull ? 'text-red-400' : regenWarning ? 'text-amber-400' : 'text-muted-foreground';
        return (
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">Regenerations</p>
              <p className={`text-[11px] font-semibold ${regenTextColor}`}>
                {regensUsed} <span className="text-muted-foreground font-normal">/ {regensLimit}/mo</span>
              </p>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${regenBarColor}`}
                style={{ width: `${Math.min(regenPct, 100)}%` }}
              />
            </div>
            {regenFull && (
              <p className="mt-1 text-[10px] text-red-400">
                Regeneration limit reached.{' '}
                <span className="font-semibold underline">Upgrade →</span>
              </p>
            )}
          </div>
        );
      })()}
      <p className="mt-3 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
        View plan details →
      </p>
    </Link>
  );
}

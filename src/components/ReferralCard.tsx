'use client';

import { useEffect, useState, useCallback } from 'react';

interface ReferralData {
  code: string;
  referralCount: number;
  pendingCount: number;
  currentTier: { name: string; label: string; reward: string } | null;
  nextTier: { threshold: number; label: string; reward: string } | null;
  clipsEarned: number;
  proForever: boolean;
  proUntil: string | null;
}

export function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referral')
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyLink = useCallback(() => {
    if (!data) return;
    const url = `https://clipmeta.app/auth?ref=${data.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
        <div className="h-3 w-32 rounded bg-muted mb-4" />
        <div className="h-8 w-48 rounded bg-muted mb-3" />
        <div className="h-1.5 w-full rounded-full bg-muted mb-3" />
        <div className="h-3 w-40 rounded bg-muted" />
      </div>
    );
  }

  if (!data) return null;

  const { code, referralCount, pendingCount, currentTier, nextTier, clipsEarned, proForever, proUntil } = data;

  // Progress to next tier
  const progressPct = nextTier
    ? Math.round((referralCount / nextTier.threshold) * 100)
    : 100;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Refer &amp; Earn</h2>
          {currentTier && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {currentTier.label}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Referral link */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Your referral link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs text-foreground font-mono truncate">
              clipmeta.app/auth?ref={code}
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {copied ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-2xl font-bold text-foreground">{referralCount}</p>
            <p className="text-[11px] text-muted-foreground">Qualified referrals</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
            <p className="text-[11px] text-muted-foreground">Pending</p>
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Next: {nextTier.label} ({nextTier.threshold} referrals)
              </p>
              <p className="text-[11px] font-semibold text-primary">
                {referralCount}/{nextTier.threshold}
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(progressPct, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Reward: {nextTier.reward}
            </p>
          </div>
        )}

        {!nextTier && referralCount > 0 && (
          <div className="rounded-lg bg-primary/10 p-3">
            <p className="text-xs font-semibold text-primary">🎉 Max tier reached!</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">You&apos;ve unlocked all referral rewards.</p>
          </div>
        )}

        {/* Rewards earned */}
        {(clipsEarned > 0 || proForever || proUntil) && (
          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Rewards earned</p>
            <div className="space-y-1">
              {clipsEarned > 0 && (
                <p className="text-xs text-foreground">
                  <span className="text-primary font-semibold">+{clipsEarned}</span> bonus clips
                </p>
              )}
              {proForever && (
                <p className="text-xs text-foreground">
                  <span className="text-primary font-semibold">Pro forever</span> 🏆
                </p>
              )}
              {proUntil && !proForever && (
                <p className="text-xs text-foreground">
                  Pro until{' '}
                  <span className="text-primary font-semibold">
                    {new Date(proUntil).toLocaleDateString()}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tier breakdown */}
        <div className="border-t border-border pt-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Reward tiers</p>
          <div className="space-y-1.5">
            {[
              { n: 1, label: '1 referral → +50 clips each' },
              { n: 3, label: '3 referrals → 1mo Pro + 50 clips' },
              { n: 5, label: '5 referrals → 3mo Pro + 100 clips' },
              { n: 10, label: '10 referrals → 6mo Pro + 200 clips' },
              { n: 20, label: '20 referrals → Pro forever + 500 clips' },
            ].map((tier) => (
              <p
                key={tier.n}
                className={`text-[11px] ${
                  referralCount >= tier.n ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                {referralCount >= tier.n ? '✓' : '○'} {tier.label}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

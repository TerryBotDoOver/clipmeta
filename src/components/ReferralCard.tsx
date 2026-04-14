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

const LAST_SEEN_BONUS_KEY = 'referral_bonus_clips_last_seen';

export function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [celebration, setCelebration] = useState<{ amount: number } | null>(null);

  useEffect(() => {
    fetch('/api/referral')
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setData(d);
          // Detect newly arrived bonus clips and celebrate
          try {
            const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_BONUS_KEY) || '0', 10);
            const current = d.clipsEarned || 0;
            if (current > lastSeen && lastSeen >= 0) {
              const delta = current - lastSeen;
              if (delta > 0 && lastSeen > 0) {
                // Only celebrate if user has seen the card before (avoids first-load spam)
                setCelebration({ amount: delta });
                setTimeout(() => setCelebration(null), 6000);
              }
            }
            localStorage.setItem(LAST_SEEN_BONUS_KEY, String(current));
          } catch {}
        }
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
      {celebration && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          aria-live="polite"
        >
          {/* Sparkles layer */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(40)].map((_, i) => (
              <span
                key={i}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  fontSize: `${14 + Math.random() * 28}px`,
                  animation: `bonus-sparkle ${1.5 + Math.random() * 2}s ease-out ${Math.random() * 1.5}s infinite`,
                }}
              >
                {["✨", "🎉", "⭐", "💫", "🎊", "🎁"][Math.floor(Math.random() * 6)]}
              </span>
            ))}
          </div>
          {/* Pill modal */}
          <div
            className="relative z-10 mx-4 max-w-md animate-in zoom-in-95 fade-in duration-500 pointer-events-auto"
            style={{
              background: "linear-gradient(135deg, #6d28d9 0%, #db2777 50%, #f59e0b 100%)",
              borderRadius: "9999px",
              padding: "36px 48px",
              boxShadow: "0 25px 60px -10px rgba(109, 40, 217, 0.5), 0 0 120px -20px rgba(245, 158, 11, 0.4)",
              textAlign: "center",
              color: "#ffffff",
            }}
          >
            <div style={{ fontSize: "44px", marginBottom: "8px" }}>🎁</div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "6px", lineHeight: 1.2 }}>
              Referral Reward!
            </h2>
            <p style={{ fontSize: "30px", fontWeight: 900, lineHeight: 1, margin: "10px 0" }}>
              +{celebration.amount} bonus clips
            </p>
            <p style={{ fontSize: "13px", opacity: 0.95, marginTop: "8px" }}>
              Thanks for spreading the word.
            </p>
          </div>
          <style jsx>{`
            @keyframes bonus-sparkle {
              0% {
                opacity: 0;
                transform: scale(0) rotate(0deg);
              }
              50% {
                opacity: 1;
                transform: scale(1.2) rotate(180deg);
              }
              100% {
                opacity: 0;
                transform: scale(0) rotate(360deg);
              }
            }
          `}</style>
        </div>
      )}
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

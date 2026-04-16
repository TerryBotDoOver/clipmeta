"use client";

import { useState, useEffect } from "react";
import ReferralTiers from "./ReferralTiers";

type ReferralData = {
  code: string;
  referralCount: number;
  pendingCount: number;
  earnedMonths: number;
};

export default function ReferralSection({ userId }: { userId: string }) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  const referralLink = data
    ? `https://clipmeta.app/sign-up?ref=${data.code}`
    : `https://clipmeta.app/sign-up?ref=${userId.slice(0, 8)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  const referralCount = data?.referralCount ?? 0;
  const pendingCount = data?.pendingCount ?? 0;
  const totalCount = referralCount + pendingCount;

  return (
    <section id="referral" className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-lg font-semibold text-foreground">Referral Program</h2>
        {totalCount > 0 && (
          <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-bold text-violet-400">
            {totalCount} referral{totalCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Share your link, earn free Pro access. Refer 10 friends and get Pro forever.
      </p>

      {/* Referral link */}
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Your Referral Link</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={referralLink}
            className="flex-1 min-w-0 rounded-lg border border-input bg-muted px-3 py-2 text-sm font-mono text-foreground outline-none"
          />
          <button
            onClick={copyLink}
            className="shrink-0 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground transition hover:border-violet-500 hover:text-violet-400"
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Tier table */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Reward Tiers</p>
        <ReferralTiers referralCount={referralCount} pendingCount={pendingCount} />
      </div>

      {/* Fine print */}
      <p className="mt-5 text-xs text-muted-foreground rounded-lg bg-muted px-4 py-3">
        ℹ️ A referral qualifies when your friend upgrades to a paid plan (trials don&apos;t count). Rewards are applied automatically — check back if yours is still pending.
      </p>
    </section>
  );
}

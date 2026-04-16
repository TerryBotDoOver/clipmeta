"use client";

type Tier = {
  referrals: number;
  youGet: string;
  theyGet: string;
  label: string;
};

const TIERS: Tier[] = [
  { referrals: 1,  label: "1 friend",    youGet: "+50 bonus clips",              theyGet: "+50 bonus clips" },
  { referrals: 3,  label: "3 friends",   youGet: "1 month Pro + 50 clips",       theyGet: "+50 bonus clips" },
  { referrals: 5,  label: "5 friends",   youGet: "3 months Pro + 100 clips",     theyGet: "+100 bonus clips" },
  { referrals: 10, label: "10 friends",  youGet: "6 months Pro + 200 clips",     theyGet: "+100 bonus clips" },
  { referrals: 20, label: "20 friends",  youGet: "1 year of Pro + 500 clips",    theyGet: "+200 bonus clips" },
];

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
    </svg>
  );
}

export default function ReferralTiers({
  referralCount,
  pendingCount = 0,
}: {
  referralCount: number;
  pendingCount?: number;
}) {
  // Find current tier index (highest unlocked)
  let currentTierIdx = -1;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (referralCount >= TIERS[i].referrals) {
      currentTierIdx = i;
      break;
    }
  }

  // Next tier
  const nextTierIdx = currentTierIdx < TIERS.length - 1 ? currentTierIdx + 1 : null;
  const nextTier = nextTierIdx !== null ? TIERS[nextTierIdx] : null;

  // Progress within next tier range
  const prevMilestone = nextTierIdx !== null && nextTierIdx > 0 ? TIERS[nextTierIdx - 1].referrals : 0;
  const nextMilestone = nextTier?.referrals ?? TIERS[TIERS.length - 1].referrals;
  const progressPct = nextTier
    ? Math.min(100, ((referralCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100)
    : 100;

  return (
    <div className="space-y-3">
      {TIERS.map((tier, idx) => {
        const isUnlocked = referralCount >= tier.referrals;
        const isCurrent = idx === currentTierIdx;
        const isNext = idx === nextTierIdx;

        return (
          <div
            key={tier.referrals}
            className={[
              "rounded-xl border px-4 py-4 transition-all",
              isCurrent
                ? "border-violet-500/60 bg-violet-500/10 shadow-[0_0_18px_rgba(139,92,246,0.18)] animate-pulse-slow"
                : isUnlocked
                ? "border-green-500/40 bg-green-500/5"
                : isNext
                ? "border-border bg-muted/50"
                : "border-border/50 bg-muted/20 opacity-60",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              {/* Status icon */}
              <div
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  isUnlocked
                    ? "bg-green-500/20 text-green-400"
                    : isCurrent
                    ? "bg-violet-500/20 text-violet-400"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {isUnlocked ? <CheckIcon /> : <LockIcon />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={[
                      "text-sm font-bold",
                      isCurrent
                        ? "text-violet-300"
                        : isUnlocked
                        ? "text-green-400"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {tier.label}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                      Current
                    </span>
                  )}
                  {isNext && !isCurrent && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Next
                    </span>
                  )}
                </div>
                <div className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">You get:</span>{" "}
                    {tier.youGet}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">They get:</span>{" "}
                    {tier.theyGet}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Progress bar toward next tier */}
      {nextTier && (
        <div className="mt-2 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress to next tier</span>
            <span>
              {referralCount} / {nextTier.referrals} referrals
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {nextTier.referrals - referralCount} more referral
            {nextTier.referrals - referralCount !== 1 ? "s" : ""} to unlock:{" "}
            <span className="font-semibold text-foreground">{nextTier.youGet}</span>
          </p>
          {(referralCount > 0 || pendingCount > 0) && (
            <p className="text-xs text-muted-foreground">
              <span className="text-green-400 font-semibold">{referralCount} qualified</span>
              {pendingCount > 0 && (
                <span className="text-yellow-500/80">, {pendingCount} pending qualification</span>
              )}
            </p>
          )}
        </div>
      )}

      {currentTierIdx === TIERS.length - 1 && (
        <div className="mt-2 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-center text-sm font-semibold text-green-400">
          🎉 You&apos;ve reached the top tier — Pro free for a year!
        </div>
      )}
    </div>
  );
}

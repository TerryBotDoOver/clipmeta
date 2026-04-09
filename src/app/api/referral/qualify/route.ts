import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ─── Constants ───────────────────────────────────────────────────────────────

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "guerrillamail.info",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "spam4.me",
  "dispostable.com",
  "fakeinbox.com",
  "maildrop.cc",
  "mailnull.com",
  "spamgourmet.com",
  "trashmail.me",
  "trashmail.net",
  "discard.email",
  "tempr.email",
  "spamcowboy.com",
  "getnada.com",
  "mailtemp.info",
  "tempinbox.com",
  "filzmail.com",
  "temp-mail.org",
  "throwam.com",
  "spambox.us",
  "crazymailing.com",
  "trbvn.com",
]);

// Referrer code is the first 8 chars of the user's UUID
// (matching the pattern in /api/referral/route.ts and /api/referral/track/route.ts)
function codeToId(code: string, profiles: Array<{ id: string }>): string | null {
  const match = profiles.find((p) => p.id.startsWith(code));
  return match?.id ?? null;
}

// Reward tiers: sorted by threshold descending so we can find the highest reached
const REWARD_TIERS = [
  {
    name: "tier5" as const,
    threshold: 20,
    referrerProForever: true,
    referrerProMonths: 0,
    referrerBonusClips: 500,
    referredBonusClips: 0,
  },
  {
    name: "tier4" as const,
    threshold: 10,
    referrerProForever: false,
    referrerProMonths: 6,
    referrerBonusClips: 200,
    referredBonusClips: 100,
  },
  {
    name: "tier3" as const,
    threshold: 5,
    referrerProForever: false,
    referrerProMonths: 3,
    referrerBonusClips: 100,
    referredBonusClips: 100,
  },
  {
    name: "tier2" as const,
    threshold: 3,
    referrerProForever: false,
    referrerProMonths: 1,
    referrerBonusClips: 50,
    referredBonusClips: 50,
  },
  {
    name: "tier1" as const,
    threshold: 1,
    referrerProForever: false,
    referrerProMonths: 0,
    referrerBonusClips: 50,
    referredBonusClips: 50,
  },
];

type TierName = "none" | "tier1" | "tier2" | "tier3" | "tier4" | "tier5";

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * GET /api/referral/qualify
 *
 * Called by a cron job (or manually). Scans all unqualified referred users,
 * checks criteria, applies rewards to referrers and referred users.
 *
 * Protected by a CRON_SECRET header to prevent public triggering.
 */
export async function GET(req: NextRequest) {
  // ── Auth: require CRON_SECRET unless running in dev without it set ──────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("=== REFERRAL QUALIFICATION RUN STARTED ===");
  console.log("\n⚠️  REMINDER: Run referral-migration.sql in Supabase if not done yet!\n");
  console.log("  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;");
  console.log("  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_qualified BOOLEAN DEFAULT false;");
  console.log("  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bonus_clips INTEGER DEFAULT 0;");
  console.log("  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_tier TEXT DEFAULT 'none';");
  console.log("  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_pro_until TIMESTAMPTZ;");
  console.log("  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_pro_forever BOOLEAN DEFAULT false;");
  console.log("");

  try {
    // Fetch all profiles that have a referral code but are NOT yet qualified
    const { data: candidates, error: candidateError } = await supabaseAdmin
      .from("profiles")
      .select("id, referred_by, created_at, email, referral_qualified, bonus_clips, plan, stripe_subscription_status")
      .not("referred_by", "is", null)
      .eq("referral_qualified", false);

    if (candidateError) {
      console.error("Failed to fetch candidates:", candidateError);
      return NextResponse.json({ error: candidateError.message }, { status: 500 });
    }

    if (!candidates || candidates.length === 0) {
      console.log("No unqualified referred users found.");
      return NextResponse.json({ ok: true, qualified: 0, skipped: 0 });
    }

    console.log(`Found ${candidates.length} unqualified referred user(s). Processing...`);

    // We need to resolve referrer codes → full IDs. Fetch all profiles once.
    const referrerCodes = [...new Set(candidates.map((c: { referred_by: string }) => c.referred_by).filter(Boolean))];
    const { data: allProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, bonus_clips, referral_tier, referral_pro_until, referral_pro_forever")
      .in("id", referrerCodes.map((code) => {
        // We can't efficiently do startsWith query for all codes in one call,
        // so fetch all and filter in memory below
        return code;
      }));

    // Actually: referrer code = first 8 chars of UUID.
    // Fetch all profiles so we can match code → id.
    const { data: profilesForCodeMatch } = await supabaseAdmin
      .from("profiles")
      .select("id, bonus_clips, referral_tier, referral_pro_until, referral_pro_forever");

    const profileMap = new Map(
      (profilesForCodeMatch ?? []).map((p: {
        id: string;
        bonus_clips: number | null;
        referral_tier: string | null;
        referral_pro_until: string | null;
        referral_pro_forever: boolean | null;
      }) => [p.id, p])
    );

    let qualified = 0;
    let skipped = 0;
    const newlyQualifiedByReferrer = new Map<string, number>(); // referrerId → count of new qualifications

    for (const candidate of candidates) {
      const userId: string = candidate.id;
      const referredByCode: string = candidate.referred_by;
      const email: string | null = candidate.email ?? null;
      const createdAt: string = candidate.created_at;

      // ── Anti-fraud: disposable email check ──────────────────────────────
      if (email) {
        const domain = email.split("@")[1]?.toLowerCase();
        if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
          console.log(`  SKIP ${userId}: disposable email domain (${domain})`);
          skipped++;
          continue;
        }
      }

      // ── Anti-fraud: cannot refer yourself ───────────────────────────────
      if (userId.startsWith(referredByCode)) {
        console.log(`  SKIP ${userId}: self-referral detected`);
        skipped++;
        continue;
      }

      // ── Criterion: must be on a paid plan (not free, not trialing) ────
      const userPlan: string = candidate.plan ?? "free";
      const subStatus: string = candidate.stripe_subscription_status ?? "";
      if (userPlan === "free" || subStatus !== "active") {
        console.log(`  SKIP ${userId}: not on paid plan (plan=${userPlan}, status=${subStatus})`);
        skipped++;
        continue;
      }

      // ── All criteria met → mark as qualified ────────────────────────────
      console.log(`  QUALIFY ${userId}: paid plan (plan=${userPlan}, status=${subStatus})`);

      // Mark as qualified (referred user bonus clips applied after tier calc below)
      await supabaseAdmin
        .from("profiles")
        .update({
          referral_qualified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      // Track for referrer reward calculation
      const referrerId = codeToId(referredByCode, profilesForCodeMatch ?? []);
      if (referrerId) {
        newlyQualifiedByReferrer.set(referrerId, (newlyQualifiedByReferrer.get(referrerId) ?? 0) + 1);
      }

      qualified++;
    }

    // ── Apply referrer rewards ─────────────────────────────────────────────
    if (newlyQualifiedByReferrer.size > 0) {
      console.log(`\nApplying rewards to ${newlyQualifiedByReferrer.size} referrer(s)...`);

      for (const [referrerId, newCount] of newlyQualifiedByReferrer) {
        // Count total qualified referrals for this referrer
        const { count: totalQualified } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("referred_by", referrerId.slice(0, 8))
          .eq("referral_qualified", true);

        const totalCount = totalQualified ?? 0;
        console.log(`  Referrer ${referrerId}: ${totalCount} total qualified referrals`);

        // Determine highest tier reached
        const reachedTier = REWARD_TIERS.find((t) => totalCount >= t.threshold);

        if (!reachedTier) {
          console.log(`  Referrer ${referrerId}: no tier reached yet (need ${REWARD_TIERS[REWARD_TIERS.length - 1].threshold})`);
          continue;
        }

        const referrerProfile = profileMap.get(referrerId);
        const currentBonusClips: number = referrerProfile?.bonus_clips ?? 0;
        const currentTier: TierName = (referrerProfile?.referral_tier as TierName) ?? "none";

        // Only escalate tier (never downgrade)
        const tierOrder: TierName[] = ["none", "tier1", "tier2", "tier3", "tier4", "tier5"];
        const newTierIdx = tierOrder.indexOf(reachedTier.name);
        const currentTierIdx = tierOrder.indexOf(currentTier);
        const effectiveTier = newTierIdx > currentTierIdx ? reachedTier.name : currentTier;

        const updates: Record<string, unknown> = {
          referral_tier: effectiveTier,
          updated_at: new Date().toISOString(),
        };

        // Apply tier-specific rewards (only if reaching new tier)
        if (newTierIdx > currentTierIdx) {
          // Always apply bonus clips for the new tier
          if (reachedTier.referrerBonusClips > 0) {
            updates.bonus_clips = currentBonusClips + reachedTier.referrerBonusClips;
            console.log(`  → Referrer ${referrerId} gets +${reachedTier.referrerBonusClips} bonus clips`);
          }

          if (reachedTier.referrerProForever) {
            updates.referral_pro_forever = true;
            console.log(`  → Referrer ${referrerId} gets Pro FOREVER (tier5)`);
          } else if (reachedTier.referrerProMonths > 0) {
            // Extend pro_until from today (or existing expiry if future)
            const existingUntil = referrerProfile?.referral_pro_until
              ? new Date(referrerProfile.referral_pro_until)
              : new Date();
            const base = existingUntil > new Date() ? existingUntil : new Date();
            base.setMonth(base.getMonth() + reachedTier.referrerProMonths);
            updates.referral_pro_until = base.toISOString();
            console.log(`  → Referrer ${referrerId} gets Pro until ${base.toISOString()} (${reachedTier.referrerProMonths} months)`);
          }

          // Apply referred user bonus clips for newly qualified users
          if (reachedTier.referredBonusClips > 0) {
            const { data: qualifiedReferred } = await supabaseAdmin
              .from("profiles")
              .select("id, bonus_clips")
              .eq("referred_by", referrerId.slice(0, 8))
              .eq("referral_qualified", true);

            for (const refUser of qualifiedReferred ?? []) {
              const refBonus: number = refUser.bonus_clips ?? 0;
              await supabaseAdmin
                .from("profiles")
                .update({
                  bonus_clips: refBonus + reachedTier.referredBonusClips,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", refUser.id);
            }
            console.log(`  → Referred users get +${reachedTier.referredBonusClips} bonus clips each`);
          }
        }

        await supabaseAdmin
          .from("profiles")
          .update(updates)
          .eq("id", referrerId);
      }
    }

    console.log(`\n=== DONE: ${qualified} newly qualified, ${skipped} skipped ===`);

    return NextResponse.json({
      ok: true,
      qualified,
      skipped,
      message: `${qualified} referral(s) newly qualified, ${skipped} skipped`,
    });
  } catch (err) {
    console.error("Referral qualify error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

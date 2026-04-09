import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Tier definitions (must match qualify/route.ts)
const TIERS = [
  { name: 'tier5', threshold: 20, label: 'Legend', reward: 'Pro forever + 500 clips' },
  { name: 'tier4', threshold: 10, label: 'Champion', reward: '6 months Pro + 200 clips' },
  { name: 'tier3', threshold: 5, label: 'Advocate', reward: '3 months Pro + 100 clips' },
  { name: 'tier2', threshold: 3, label: 'Supporter', reward: '1 month Pro + 50 clips' },
  { name: 'tier1', threshold: 1, label: 'Starter', reward: '+50 bonus clips' },
];

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const code = user.id.slice(0, 8);

    // Fetch referrer profile data
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('referral_tier, bonus_clips, referral_pro_until, referral_pro_forever')
      .eq('id', user.id)
      .single();

    // Count qualified referrals
    const { count: qualifiedCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', code)
      .eq('referral_qualified', true);

    // Count pending referrals (referred but not yet qualified)
    const { count: pendingCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', code)
      .eq('referral_qualified', false);

    const referralCount = qualifiedCount ?? 0;
    const currentTierName = profile?.referral_tier ?? 'none';

    // Find current tier info
    const currentTier = TIERS.find((t) => t.name === currentTierName) ?? null;

    // Find next tier
    const sortedAsc = [...TIERS].reverse(); // ascending by threshold
    const nextTier = sortedAsc.find((t) => t.threshold > referralCount) ?? null;

    // Calculate total clips earned from referrals
    const clipsEarned = profile?.bonus_clips ?? 0;

    return NextResponse.json({
      code,
      referralCount,
      pendingCount: pendingCount ?? 0,
      currentTier: currentTier
        ? { name: currentTier.name, label: currentTier.label, reward: currentTier.reward }
        : null,
      nextTier: nextTier
        ? { threshold: nextTier.threshold, label: nextTier.label, reward: nextTier.reward }
        : null,
      clipsEarned,
      proForever: profile?.referral_pro_forever ?? false,
      proUntil: profile?.referral_pro_until ?? null,
    });
  } catch (err) {
    console.error('Referral GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

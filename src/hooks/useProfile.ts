'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { PLANS, Plan } from '@/lib/plans';

export function useProfile() {
  const [plan, setPlan] = useState<Plan>('free');
  const [clipsUsed, setClipsUsed] = useState(0);
  const [regensUsed, setRegensUsed] = useState(0);
  const [lifetimeClips, setLifetimeClips] = useState(0);
  const [bonusClips, setBonusClips] = useState(0);
  const [rolloverClips, setRolloverClips] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      // Get plan + billing info
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, regens_used_this_month, billing_period_start, bonus_clips, rollover_clips, referral_pro_forever, referral_pro_until')
        .eq('id', user.id)
        .single();
      const basePlan = (profile?.plan as Plan) || 'free';
      const userPlan = profile?.referral_pro_forever ||
        (profile?.referral_pro_until && new Date(profile.referral_pro_until as string) > new Date())
        ? 'pro'
        : basePlan;
      setPlan(userPlan);
      setBonusClips((profile as Record<string, unknown>)?.bonus_clips as number || 0);
      setRolloverClips((profile as Record<string, unknown>)?.rollover_clips as number || 0);

      // Regen count comes directly from the dedicated counter — no derivation.
      setRegensUsed((profile as Record<string, unknown>)?.regens_used_this_month as number || 0);

      // Count clip uploads from clip_history for usage display
      const billingStart = profile?.billing_period_start
        ? new Date(profile.billing_period_start as string).toISOString()
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [{ count: historyCount }, { count: lifetimeCount }] = await Promise.all([
        supabase
          .from('clip_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('action', 'created')
          .gte('created_at', billingStart),
        supabase
          .from('clip_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('action', 'created'),
      ]);
      setClipsUsed(historyCount ?? 0);
      setLifetimeClips(lifetimeCount ?? 0);

      setLoading(false);
    });
  }, []);

  const planInfo = PLANS[plan] ?? PLANS.free;
  const extraClips = planInfo.period === 'monthly' ? bonusClips + rolloverClips : 0;
  return {
    plan,
    clipsUsed,
    clipsLimit: planInfo.clips + extraClips,
    baseClipsLimit: planInfo.clips,
    bonusClips,
    rolloverClips,
    regensUsed,
    regensLimit: planInfo.regens,
    lifetimeClips,
    loading,
  };
}

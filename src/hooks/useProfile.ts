'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { PLANS, Plan } from '@/lib/stripe';

export function useProfile() {
  const [plan, setPlan] = useState<Plan>('free');
  const [clipsUsed, setClipsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase
        .from('profiles')
        .select('plan, clips_used_this_month')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setPlan((data.plan as Plan) || 'free');
            setClipsUsed(data.clips_used_this_month || 0);
          }
          setLoading(false);
        });
    });
  }, []);

  const planInfo = PLANS[plan] ?? PLANS.free;
  return { plan, clipsUsed, clipsLimit: planInfo.clips, loading };
}

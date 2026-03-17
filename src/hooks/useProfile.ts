'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { PLANS, Plan } from '@/lib/plans';

export function useProfile() {
  const [plan, setPlan] = useState<Plan>('free');
  const [clipsUsed, setClipsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      // Get plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();
      setPlan((profile?.plan as Plan) || 'free');

      // Live clip count this month
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: projects } = await supabase.from('projects').select('id').eq('user_id', user.id);
      const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

      if (projectIds.length > 0) {
        const { count } = await supabase
          .from('clips')
          .select('id', { count: 'exact', head: true })
          .in('project_id', projectIds)
          .gte('created_at', startOfMonth);
        setClipsUsed(count ?? 0);
      }

      setLoading(false);
    });
  }, []);

  const planInfo = PLANS[plan] ?? PLANS.free;
  return { plan, clipsUsed, clipsLimit: planInfo.clips, loading };
}

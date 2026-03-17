'use client';
import { useProfile } from '@/hooks/useProfile';

import { useRouter } from 'next/navigation';

export function PlanBadge() {
  const { plan, clipsUsed, clipsLimit, loading } = useProfile();
  const router = useRouter();

  if (loading) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
        plan === 'studio' ? 'bg-violet-500 text-white' :
        plan === 'pro'    ? 'bg-blue-500 text-white' :
                            'bg-zinc-700 text-zinc-300'
      }`}>
        {plan}
      </span>
      <span className="text-zinc-400 text-xs">{clipsUsed} / {clipsLimit} clips</span>
      {plan === 'free' && (
        <button
          onClick={() => router.push('/pricing')}
          className="text-violet-400 hover:text-violet-300 text-xs underline"
        >
          Upgrade
        </button>
      )}
    </div>
  );
}

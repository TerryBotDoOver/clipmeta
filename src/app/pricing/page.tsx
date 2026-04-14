'use client';
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fbEvent } from "@/components/MetaPixel";

function getPlanButtonLabel(targetPlan: string, currentPlan: string, isLoggedIn: boolean | null): string {
  if (!isLoggedIn) return targetPlan === 'free' ? 'Get started free' : 'Start free trial';
  const planOrder = ['free', 'starter', 'pro', 'studio'];
  const current = planOrder.indexOf(currentPlan);
  const target = planOrder.indexOf(targetPlan);
  if (current === target) return 'Current plan';
  if (target > current) return 'Upgrade';
  return 'Downgrade';
}

const PLAN_ORDER: Record<string, number> = {
  free: 0, trial: 0,
  starter: 1, starter_annual: 1,
  pro: 2, pro_annual: 2,
  studio: 3, studio_annual: 3,
};

function getDirection(currentPlan: string, targetPlan: string): 'upgrade' | 'downgrade' | 'same' {
  const current = PLAN_ORDER[currentPlan] ?? 0;
  const target = PLAN_ORDER[targetPlan] ?? 0;
  if (target > current) return 'upgrade';
  if (target < current) return 'downgrade';
  return 'same';
}

// Plans that mean the user has NO active paid subscription
const NO_SUB_PLANS = ['free', 'trial'];

async function handleCheckout(
  plan: string,
  setLoading: (v: string | null) => void,
  router: ReturnType<typeof useRouter>
) {
  setLoading(plan);
  try {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    if (res.status === 401) {
      sessionStorage.setItem('intended_plan', plan);
      router.push('/auth?ref=pricing&mode=signup');
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      let errMsg = 'Checkout failed';
      try { errMsg = JSON.parse(text)?.error || errMsg; } catch {}
      alert('Error: ' + errMsg);
      return;
    }

    const { url, error } = await res.json();
    if (url && url.startsWith('http')) {
      window.location.assign(url);
      return;
    }
    alert('Checkout error: ' + (error || 'No redirect URL returned'));
  } catch (error) {
    alert('Checkout failed � check your connection and try again.');
    console.error('Checkout request failed:', error);
  } finally {
    setLoading(null);
  }
}

async function handleBuyCredits(
  pack: number,
  setLoading: (v: string | null) => void,
) {
  setLoading(`credits-${pack}`);
  try {
    const res = await fetch('/api/billing/buy-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack }),
    });

    if (res.status === 401) {
      window.location.href = '/auth?ref=pricing&mode=signup';
      return;
    }

    const { url, error } = await res.json();
    if (url && url.startsWith('http')) {
      window.location.assign(url);
      return;
    }
    alert('Error: ' + (error || 'No redirect URL returned'));
  } catch {
    alert('Failed to start checkout. Please try again.');
  } finally {
    setLoading(null);
  }
}

async function handlePlanChange(
  plan: string,
  setLoading: (v: string | null) => void,
): Promise<{ success: boolean; type?: string; effective_date?: string; error?: string }> {
  setLoading(plan);
  try {
    const res = await fetch('/api/billing/change-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Plan change failed' };
    }
    return data;
  } catch (error) {
    console.error('Plan change failed:', error);
    return { success: false, error: 'Network error � check your connection' };
  } finally {
    setLoading(null);
  }
}

type ConfirmModal = {
  plan: string;
  planKey: string;
  direction: 'upgrade' | 'downgrade';
} | null;

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [hasSubscription, setHasSubscription] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showOnboardingNudge, setShowOnboardingNudge] = useState(false);
  const router = useRouter();

  // Track pricing page view for Meta Pixel retargeting
  useEffect(() => {
    fbEvent('ViewContent', { content_name: 'Pricing Page', content_type: 'product_group' });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    import('@/lib/supabase-browser').then(async ({ createSupabaseBrowserClient }) => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, stripe_subscription_id, stripe_subscription_status, onboarding_complete, promo_unlocked_at')
          .eq('id', user.id)
          .single();
        setUserPlan(profile?.plan ?? 'free');
        // Check if user hasn't completed onboarding yet — show nudge to unlock discount
        if (!profile?.onboarding_complete && !profile?.promo_unlocked_at && profile?.plan === 'free') {
          setShowOnboardingNudge(true);
        }
        // User has an active paid subscription if they have a sub ID and it's active/trialing
        const hasSub = !!(profile?.stripe_subscription_id &&
          ['active', 'trialing', 'founder'].includes(profile?.stripe_subscription_status ?? ''));
        setHasSubscription(hasSub);
      } else {
        setIsLoggedIn(false);
      }
    });
  }, []);
  const Check = () => <span className="text-emerald-400">&#10003;</span>;
  const Dash = () => <span className="text-zinc-600">&#8212;</span>;

  const starterPlanKey = annual ? 'starter_annual' : 'starter';
  const proPlanKey = annual ? 'pro_annual' : 'pro';
  const studioPlanKey = annual ? 'studio_annual' : 'studio';

  // Centralized plan action handler
  function handlePlanAction(planKey: string, basePlan: string) {
    if (!isLoggedIn) {
      // Not logged in � send to checkout (which will redirect to auth)
      handleCheckout(planKey, setLoadingPlan, router);
      return;
    }

    const direction = getDirection(userPlan, planKey);
    if (direction === 'same') return;

    // Free/trial users with no subscription ? Stripe Checkout
    if (NO_SUB_PLANS.includes(userPlan) || !hasSubscription) {
      handleCheckout(planKey, setLoadingPlan, router);
      return;
    }

    // Existing subscriber ? show confirmation modal
    setConfirmModal({ plan: basePlan, planKey, direction });
  }

  async function confirmPlanChange() {
    if (!confirmModal) return;
    const { planKey, direction, plan } = confirmModal;
    setConfirmModal(null);

    const result = await handlePlanChange(planKey, setLoadingPlan);

    if (!result.success) {
      setToast({ message: result.error || 'Plan change failed', type: 'error' });
      return;
    }

    if (direction === 'upgrade') {
      setUserPlan(plan);
      setToast({ message: `Upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)}! Prorated charge applied.`, type: 'success' });
    } else {
      const date = result.effective_date ? new Date(result.effective_date).toLocaleDateString() : 'end of billing period';
      setToast({ message: `Downgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)} scheduled for ${date}. You keep your current plan until then.`, type: 'success' });
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-6 py-3 text-sm font-medium shadow-lg backdrop-blur transition-all ${
          toast.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
            : 'border-red-500/30 bg-red-500/15 text-red-300'
        }`}>
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-3 text-xs opacity-60 hover:opacity-100">?</button>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-[#27272a] bg-[#18181b] p-8 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              {confirmModal.direction === 'upgrade' ? 'Confirm Upgrade' : 'Confirm Downgrade'}
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {confirmModal.direction === 'upgrade'
                ? `You'll be upgraded to ${confirmModal.plan.charAt(0).toUpperCase() + confirmModal.plan.slice(1)} immediately. You'll be charged the prorated difference for the remaining days in your billing period.`
                : `You'll be downgraded to ${confirmModal.plan.charAt(0).toUpperCase() + confirmModal.plan.slice(1)} at the end of your current billing period. You'll keep your current plan until then.`
              }
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 rounded-xl border border-[#27272a] bg-[#09090b] py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmPlanChange}
                disabled={!!loadingPlan}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                  confirmModal.direction === 'upgrade'
                    ? 'bg-violet-500 text-white hover:bg-violet-400'
                    : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
                }`}
              >
                {loadingPlan ? 'Processing�' : confirmModal.direction === 'upgrade' ? 'Upgrade Now' : 'Schedule Downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-[24rem] w-[24rem] rounded-full bg-fuchsia-500/5 blur-3xl" />
        <div className="absolute left-0 top-96 h-[20rem] w-[20rem] rounded-full bg-violet-400/5 blur-3xl" />
      </div>

      <nav className="border-b border-[#27272a]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
            <img src="/logo-icon.svg" className="h-7 w-7" alt="ClipMeta" />
            ClipMeta
          </Link>
          {isLoggedIn === true ? (
            <Link
              href="/dashboard"
              className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20"
            >
              Dashboard ?
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth"
                className="px-4 py-2 text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/auth?mode=signup"
                className="rounded-xl border border-[#27272a] bg-[#18181b] px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-violet-500/50 hover:bg-zinc-900"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Show banner when not logged in */}
      {isLoggedIn === false && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-center text-sm text-amber-300">
          You&apos;re not signed in.{" "}
          <Link href="/auth?ref=pricing&mode=signup" className="font-semibold underline text-amber-200">
            Create an account
          </Link>
          {" "}or{" "}
          <Link href="/auth" className="font-semibold underline text-amber-200">
            sign in
          </Link>
          {" "}to start your free trial.
        </div>
      )}

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-20 text-center">
        <div className="mx-auto inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
          Pricing
        </div>
        <h1 className="mx-auto mt-8 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
          Premium pricing for creators who want to scale faster
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-400 md:text-lg md:text-xl">
          Start free, upgrade when you need more volume, and unlock powerful workflows for clip metadata generation.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 sm:w-auto"
          >
            Get started free
          </Link>
          <a
            href="#compare"
            className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-violet-500/50 hover:bg-zinc-900 sm:w-auto"
          >
            Compare plans
          </a>
        </div>
      </section>

      {/* Onboarding discount nudge — shown to free users who haven't completed the setup steps */}
      {showOnboardingNudge && (
        <div className="mx-auto max-w-3xl px-6 mb-8">
          <div className="relative rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-pink-500/10 to-amber-500/10 p-5 text-center">
            <div className="text-lg font-bold text-white mb-1">🎁 Unlock up to 50% off your first month</div>
            <p className="text-sm text-zinc-400 mb-3">
              Complete the free setup steps on your dashboard — create a project, upload a clip, and generate metadata — to unlock your welcome discount before subscribing.
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Complete Setup Steps →
            </Link>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-6 pb-16">
        {/* Monthly / Annual Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-zinc-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual((a) => !a)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${annual ? 'bg-violet-500' : 'bg-zinc-700'}`}
            aria-label="Toggle annual billing"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-zinc-500'}`}>
            Annual
            {annual && <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">Save up to $98/yr</span>}
          </span>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
          {/* Free */}
          <div className="relative rounded-3xl border border-[#27272a] bg-[#18181b] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Free</p>
              <div className="mt-5 flex items-end gap-2">
                <p className="text-5xl font-semibold tracking-tight text-white">$0</p>
                <p className="pb-1 text-sm text-zinc-500">Forever free</p>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                Try it free every day. 3 clips per day, no credit card required.
              </p>
            </div>

            <div className="rounded-2xl border border-[#27272a] bg-[#09090b]/50 p-5">
              <ul className="space-y-3 text-sm text-zinc-300">
               <li className="flex items-center gap-3"><Check /> 3 clips/day — resets daily</li>
                <li className="flex items-center gap-3"><Check /> 1 regeneration/day</li>
               <li className="flex items-center gap-3"><Check /> 1 project</li>
                <li className="flex items-center gap-3"><Check /> AI metadata generation</li>
                <li className="flex items-center gap-3"><Check /> CSV export</li>
                <li className="flex items-center gap-3"><Check /> Up to 500MB per file</li>
                <li className="flex items-center gap-3"><Dash /> Bulk generation</li>
                <li className="flex items-center gap-3"><Dash /> FTP transfer to Blackbox</li>
                <li className="flex items-center gap-3"><Dash /> Priority support</li>
              </ul>
            </div>

            {(() => {
              const label = getPlanButtonLabel('free', userPlan, isLoggedIn);
              const isCurrentPlan = label === 'Current plan';
              if (isCurrentPlan) {
                return (
                  <button
                    disabled
                    className="mt-8 block w-full rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-center text-sm font-semibold text-zinc-500 cursor-not-allowed sm:inline-block"
                  >
                    Current plan
                  </button>
                );
              }
              return (
                <Link
                  href="/sign-up"
                  className="mt-8 block w-full rounded-xl border border-[#27272a] bg-[#09090b] py-3 text-center text-sm font-semibold text-white transition hover:border-violet-500/40 hover:bg-zinc-900 sm:inline-block"
                >
                  {label}
                </Link>
              );
            })()}
          </div>

          {/* Starter */}
          <div className="relative rounded-3xl border border-[#27272a] bg-[#18181b] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">Starter</p>
              <div className="mt-5 flex items-end gap-2">
                {annual ? (
                  <>
                    <p className="text-5xl font-semibold tracking-tight text-white">$90</p>
                    <p className="pb-1 text-sm text-zinc-500">per year</p>
                  </>
                ) : (
                  <>
                    <p className="text-5xl font-semibold tracking-tight text-white">$9</p>
                    <p className="pb-1 text-sm text-zinc-500">per month</p>
                  </>
                )}
              </div>
              {annual && (
                <p className="mt-1 text-xs text-sky-400 font-semibold">$7.50/mo � Save $18/yr</p>
              )}
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                For part-time creators who need serious volume without the full commitment.
              </p>
            </div>

            <div className="rounded-2xl border border-[#27272a] bg-[#09090b]/50 p-5">
              <ul className="space-y-3 text-sm text-zinc-300">
               <li className="flex items-center gap-3"><Check /> 140 clips/month</li>
                <li className="flex items-center gap-3"><Check /> 100 regenerations/month</li>
               <li className="flex items-center gap-3"><Check /> Unused clips roll over (up to 2 months)</li>
                <li className="flex items-center gap-3"><Check /> 3 projects</li>
                <li className="flex items-center gap-3"><Check /> AI metadata generation</li>
                <li className="flex items-center gap-3"><Check /> CSV export</li>
                <li className="flex items-center gap-3"><Check /> Up to 2GB per file</li>
                <li className="flex items-center gap-3"><Check /> Bulk generation</li>
                <li className="flex items-center gap-3"><Dash /> FTP transfer to Blackbox</li>
                <li className="flex items-center gap-3"><Dash /> Priority support</li>
              </ul>
            </div>

            {(() => {
              const label = getPlanButtonLabel('starter', userPlan, isLoggedIn);
              const isCurrentPlan = label === 'Current plan';
              const isDowngrade = label === 'Downgrade';
              return (
                <button
                  onClick={() => !isCurrentPlan && handlePlanAction(starterPlanKey, 'starter')}
                  disabled={isCurrentPlan || loadingPlan === starterPlanKey}
                  className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition disabled:cursor-not-allowed ${
                    isCurrentPlan
                      ? 'border border-zinc-700 bg-zinc-800 text-zinc-500'
                      : isDowngrade
                      ? 'border border-zinc-600 bg-transparent text-zinc-300 hover:border-zinc-400 hover:bg-zinc-800'
                      : 'border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 disabled:opacity-60'
                  }`}
                >
                  {loadingPlan === starterPlanKey ? 'Loading�' : label}
                </button>
              );
            })()}
          </div>

          {/* Pro */}
          <div className="relative rounded-3xl border border-violet-500/60 bg-gradient-to-b from-violet-500/10 via-[#18181b] to-[#18181b] p-8 shadow-[0_0_0_1px_rgba(139,92,246,0.25),0_0_40px_rgba(139,92,246,0.12)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-violet-400/30 bg-violet-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Most Popular
            </div>

            <div className="mb-8 pt-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-200">Pro</p>
              <div className="mt-5 flex items-end gap-2">
                {annual ? (
                  <>
                    <p className="text-5xl font-semibold tracking-tight text-white">$190</p>
                    <p className="pb-1 text-sm text-violet-200/80">per year</p>
                  </>
                ) : (
                  <>
                    <p className="text-5xl font-semibold tracking-tight text-white">$19</p>
                    <p className="pb-1 text-sm text-violet-200/80">per month</p>
                  </>
                )}
              </div>
              {annual && (
                <p className="mt-1 text-xs text-violet-300 font-semibold">$15.83/mo � Save $38/yr</p>
              )}
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                Built for serious creators who need speed, scale, and a more efficient publishing workflow.
              </p>
            </div>

            <div className="rounded-2xl border border-violet-500/20 bg-black/20 p-5">
              <ul className="space-y-3 text-sm text-zinc-100">
               <li className="flex items-center gap-3"><Check /> 320 clips/month</li>
                <li className="flex items-center gap-3"><Check /> 300 regenerations/month</li>
               <li className="flex items-center gap-3"><Check /> Unused clips roll over (up to 2 months)</li>
                <li className="flex items-center gap-3"><Check /> Unlimited projects</li>
                <li className="flex items-center gap-3"><Check /> AI metadata generation</li>
                <li className="flex items-center gap-3"><Check /> CSV export — all platforms</li>
                <li className="flex items-center gap-3"><Check /> Up to 5GB per file</li>
                <li className="flex items-center gap-3"><Check /> Bulk generation &amp; bulk regenerate</li>
                <li className="flex items-center gap-3"><Check /> FTP transfer to Blackbox</li>
                <li className="flex items-center gap-3"><Check /> Apple ProRes FTP transfer</li>
                <li className="flex items-center gap-3"><Check /> Priority support</li>
              </ul>
            </div>

            {(() => {
              const label = getPlanButtonLabel('pro', userPlan, isLoggedIn);
              const isCurrentPlan = label === 'Current plan';
              const isDowngrade = label === 'Downgrade';
              return (
                <button
                  onClick={() => !isCurrentPlan && handlePlanAction(proPlanKey, 'pro')}
                  disabled={isCurrentPlan || loadingPlan === proPlanKey}
                  className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition disabled:cursor-not-allowed ${
                    isCurrentPlan
                      ? 'border border-zinc-700 bg-zinc-800 text-zinc-500'
                      : isDowngrade
                      ? 'border border-zinc-600 bg-transparent text-zinc-300 hover:border-zinc-400 hover:bg-zinc-800'
                      : 'bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-60'
                  }`}
                >
                  {loadingPlan === proPlanKey ? 'Loading�' : label}
                </button>
              );
            })()}
          </div>

          {/* Studio */}
          <div className="relative rounded-3xl border border-[#27272a] bg-[#18181b] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">Studio</p>
              <div className="mt-5 flex items-end gap-2">
                {annual ? (
                  <>
                    <p className="text-5xl font-semibold tracking-tight text-white">$490</p>
                    <p className="pb-1 text-sm text-zinc-500">per year</p>
                  </>
                ) : (
                  <>
                    <p className="text-5xl font-semibold tracking-tight text-white">$49</p>
                    <p className="pb-1 text-sm text-zinc-500">per month</p>
                  </>
                )}
              </div>
              {annual && (
                <p className="mt-1 text-xs text-amber-400 font-semibold">$40.83/mo � Save $98/yr</p>
              )}
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                For teams and high-volume workflows that need maximum output and room to grow.
              </p>
            </div>

            <div className="rounded-2xl border border-[#27272a] bg-[#09090b]/50 p-5">
              <ul className="space-y-3 text-sm text-zinc-300">
               <li className="flex items-center gap-3"><Check /> 2,000 clips/month</li>
                <li className="flex items-center gap-3"><Check /> 500 regenerations/month</li>
               <li className="flex items-center gap-3"><Check /> Unused clips roll over (up to 2 months)</li>
                <li className="flex items-center gap-3"><Check /> Unlimited projects</li>
                <li className="flex items-center gap-3"><Check /> AI metadata generation</li>
                <li className="flex items-center gap-3"><Check /> CSV export</li>
                <li className="flex items-center gap-3"><Check /> Up to 10GB per file</li>
                <li className="flex items-center gap-3"><Check /> Bulk generation &amp; bulk regenerate</li>
                <li className="flex items-center gap-3"><Check /> FTP transfer to Blackbox</li>
                <li className="flex items-center gap-3"><Check /> Apple ProRes FTP transfer</li>
                <li className="flex items-center gap-3"><Check /> Team access (coming soon)</li>
              </ul>
            </div>

            {(() => {
              const label = getPlanButtonLabel('studio', userPlan, isLoggedIn);
              const isCurrentPlan = label === 'Current plan';
              const isDowngrade = label === 'Downgrade';
              return (
                <button
                  onClick={() => !isCurrentPlan && handlePlanAction(studioPlanKey, 'studio')}
                  disabled={isCurrentPlan || loadingPlan === studioPlanKey}
                  className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition disabled:cursor-not-allowed ${
                    isCurrentPlan
                      ? 'border border-zinc-700 bg-zinc-800 text-zinc-500'
                      : isDowngrade
                      ? 'border border-zinc-600 bg-transparent text-zinc-300 hover:border-zinc-400 hover:bg-zinc-800'
                      : 'border border-[#27272a] bg-[#09090b] text-white hover:border-violet-500/40 hover:bg-zinc-900 disabled:opacity-60'
                  }`}
                >
                  {loadingPlan === studioPlanKey ? 'Loading�' : label}
                </button>
              );
            })()}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-zinc-500">
          All paid plans include a 7-day free trial. Card required ? you won&apos;t be charged until day 8.
        </div>
      </section>

      <section id="compare" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">Compare plans</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Everything you need, clearly compared
          </h2>
          <p className="mt-3 max-w-2xl text-base text-zinc-400">
            Choose the plan that matches your clip volume and workflow complexity.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-[#27272a] bg-[#18181b]">
          <div className="min-w-[600px]">
          <div className="grid grid-cols-5 border-b border-[#27272a] bg-[#121214] text-sm">
            <div className="px-6 py-4 font-medium text-zinc-400">Features</div>
            <div className="px-6 py-4 text-center font-semibold text-white">Free</div>
            <div className="px-6 py-4 text-center font-semibold text-sky-300">Starter</div>
            <div className="bg-violet-500/10 px-6 py-4 text-center font-semibold text-violet-200">Pro</div>
            <div className="px-6 py-4 text-center font-semibold text-amber-300">Studio</div>
          </div>

          {([
            {f: 'Projects',              v: ['1 project', '3 projects', 'Unlimited', 'Unlimited'] as (boolean|string)[]},
           {f: 'Clip volume',            v: ['3/day', '140/month', '320/month', '2,000/month'] as (boolean|string)[]},
            {f: 'Regenerations',          v: ['1/day', '100/mo', '300/mo', '500/mo'] as (boolean|string)[]},
           {f: 'Max file size',          v: ['500MB', '2GB', '5GB', '10GB'] as (boolean|string)[]},
            {f: 'Clip rollover',          v: [false, true, true, true] as (boolean|string)[]},
            {f: 'AI metadata generation', v: [true, true, true, true] as (boolean|string)[]},
            {f: 'CSV export',             v: [true, true, true, true] as (boolean|string)[]},
            {f: 'Bulk generation',        v: [false, true, true, true] as (boolean|string)[]},
            {f: 'Bulk regenerate',        v: [false, false, true, true] as (boolean|string)[]},
            {f: 'FTP transfer to Blackbox', v: [false, false, true, true] as (boolean|string)[]},
            {f: 'Apple ProRes FTP',       v: [false, false, true, true] as (boolean|string)[]},
            {f: 'Priority support',       v: [false, false, true, true] as (boolean|string)[]},
            {f: 'Team access',            v: [false, false, false, 'Coming soon'] as (boolean|string)[]},
          ] as {f: string; v: (boolean|string)[]}[]).map(({f, v}) => {
            const Cell = ({val, highlight}: {val: boolean|string; highlight?: boolean}) => (
              <div className={`px-6 py-4 text-center text-sm${highlight ? ' bg-violet-500/5 text-zinc-100' : ' text-zinc-400'}`}>
                {val === true ? <span className="text-emerald-400">&#10003;</span>
                  : val === false ? <span className="text-zinc-700">&#10007;</span>
                  : <span className="text-amber-300 text-xs font-medium">{val as string}</span>}
              </div>
            );
            return (
              <div key={f} className="grid grid-cols-5 border-b border-[#27272a] last:border-b-0">
                <div className="px-6 py-4 text-sm font-medium text-zinc-300">{f}</div>
                <Cell val={v[0]} />
                <Cell val={v[1]} />
                <Cell val={v[2]} highlight />
                <Cell val={v[3]} />
              </div>
            );
          })}
          </div>
        </div>
      </section>

      {/* Referral CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-3xl border border-violet-500/20 bg-violet-500/5 px-8 py-10 text-center">
          <span className="inline-block rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300 mb-5">
            Referral Program
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Share ClipMeta, Earn Free Months
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-zinc-400">
            Refer friends and unlock free Pro access. Refer 10 friends and get Pro forever.
          </p>
          <Link
            href="/settings#referral"
            className="mt-6 inline-block rounded-xl border border-violet-500/40 bg-violet-500/10 px-6 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20 hover:border-violet-400"
          >
            Learn More ?
          </Link>
        </div>
      </section>

      {/* Credit Packs */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">One-Time Credits</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Need more clips this month?
          </h2>
          <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
            Buy a clip credit pack instead of upgrading your plan. Credits never expire and stack on top of your monthly allowance.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { pack: 50, price: 5, label: "Starter Pack", perClip: "$0.10/clip", highlight: false, bonusRegens: 10 },
            { pack: 200, price: 14, label: "Creator Pack", perClip: "$0.07/clip", highlight: false, bonusRegens: 40 },
            { pack: 500, price: 29, label: "Pro Pack", perClip: "$0.058/clip", highlight: true, bonusRegens: 100 },
          ].map(({ pack, price, label, perClip, highlight, bonusRegens }) => (
            <div
              key={pack}
              className={`rounded-2xl border p-6 flex flex-col ${
                highlight
                  ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                  : 'border-[#27272a] bg-[#18181b]'
              }`}
            >
              {highlight && (
                <div className="mb-4">
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-400">Best value</span>
                </div>
              )}
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-semibold text-white">${price}</span>
                <span className="mb-1 text-zinc-500 text-sm">one-time</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{pack} clips</p>
              <p className="mt-1 text-xs text-zinc-500">{perClip} � never expire</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-400 flex-1">
                <li className="flex items-center gap-2"><span className="text-amber-400">&#10003;</span> One-time charge</li>
                <li className="flex items-center gap-2"><span className="text-amber-400">&#10003;</span> Credits never expire</li>
               <li className="flex items-center gap-2"><span className="text-amber-400">&#10003;</span> Stack with monthly plan</li>
                {bonusRegens && (
                  <li className="flex items-center gap-2"><span className="text-amber-400">&#10003;</span> + {bonusRegens} bonus regenerations</li>
                )}
             </ul>
              <button
                onClick={() => handleBuyCredits(pack, setLoadingPlan)}
                disabled={loadingPlan === `credits-${pack}`}
                className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold transition disabled:opacity-50 ${
                  highlight
                    ? 'bg-amber-500 text-black hover:bg-amber-400'
                    : 'border border-[#27272a] bg-[#09090b] text-white hover:border-amber-500/40 hover:bg-zinc-900'
                }`}
              >
                {loadingPlan === `credits-${pack}` ? 'Loading�' : `Buy ${pack} Credits � $${price}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Common billing questions
          </h2>
          <p className="mt-3 text-zinc-400">
            Straightforward answers about trials, billing, and cancellations.
          </p>
        </div>

        <div id="credits" className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6">
            <h3 className="text-base font-semibold text-white">Do paid plans include a free trial?</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Yes. All paid plans include a 7-day free trial so you can test the full experience before committing.
            </p>
          </div>

          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6">
            <h3 className="text-base font-semibold text-white">Can I cancel anytime?</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Absolutely. You can cancel your subscription at any time, and your plan will remain active until the end of your billing period.
            </p>
          </div>

          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6">
            <h3 className="text-base font-semibold text-white">What happens if I hit my monthly clip limit?</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              If you outgrow your current plan, you can upgrade to a higher tier for more monthly clip capacity and expanded workflow features.
            </p>
          </div>

          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6">
            <h3 className="text-base font-semibold text-white">Can I switch plans later?</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Yes. You can move between plans as your needs change, whether you are starting solo or scaling up for a larger team workflow.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#27272a] py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-6 px-6 text-sm text-zinc-500">
          <span className="flex items-center gap-1.5">
            <img src="/logo-icon.svg" className="h-4 w-4" alt="" />
            � 2026 ClipMeta
          </span>
          <Link href="/legal/terms" className="transition-colors hover:text-white">Terms of Service</Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
        </div>
      </footer>
    </main>
  );
}


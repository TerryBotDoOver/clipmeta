'use client';
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function handleUpgrade(
  plan: 'pro' | 'studio',
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
      router.push('/auth');
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error('Checkout error:', text);
      return;
    }

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const { url, error } = await res.json();
      if (url) {
        window.location.assign(url);
        return;
      }
      alert(`Checkout error: ${error}`);
      return;
    }

    const url = await res.text();
    if (url) {
      window.location.assign(url);
      return;
    }

    alert('Checkout error: No redirect URL returned. Check console.');
  } catch (error) {
    console.error('Checkout request failed:', error);
  } finally {
    setLoading(null);
  }
}

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();
  const Check = () => <span className="text-emerald-400">✓</span>;
  const Dash = () => <span className="text-zinc-600">–</span>;

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-[24rem] w-[24rem] rounded-full bg-fuchsia-500/5 blur-3xl" />
        <div className="absolute left-0 top-96 h-[20rem] w-[20rem] rounded-full bg-violet-400/5 blur-3xl" />
      </div>

      <nav className="border-b border-[#27272a]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            ClipMeta
          </Link>
          <Link
            href="/auth"
            className="rounded-xl border border-[#27272a] bg-[#18181b] px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-violet-500/50 hover:bg-zinc-900"
          >
            Sign In
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-20 text-center">
        <div className="mx-auto inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
          Pricing
        </div>
        <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
          Premium pricing for creators who want to scale faster
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400 md:text-xl">
          Start free, upgrade when you need more volume, and unlock powerful workflows for clip metadata generation.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Get started free
          </Link>
          <a
            href="#compare"
            className="rounded-xl border border-[#27272a] bg-[#18181b] px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-violet-500/50 hover:bg-zinc-900"
          >
            Compare plans
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="relative rounded-3xl border border-[#27272a] bg-[#18181b] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Free</p>
              <div className="mt-5 flex items-end gap-2">
                <p className="text-5xl font-semibold tracking-tight text-white">$0</p>
                <p className="pb-1 text-sm text-zinc-500">Forever free</p>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                Perfect for testing the workflow and shipping your first projects.
              </p>
            </div>

            <div className="rounded-2xl border border-[#27272a] bg-[#09090b]/50 p-5">
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-3"><Check /> 1 project</li>
                <li className="flex items-center gap-3"><Check /> Up to 10 clips/month</li>
                <li className="flex items-center gap-3"><Check /> AI metadata generation</li>
                <li className="flex items-center gap-3"><Check /> CSV export</li>
                <li className="flex items-center gap-3"><Dash /> Bulk generation</li>
                <li className="flex items-center gap-3"><Dash /> Priority support</li>
              </ul>
            </div>

            <Link
              href="/sign-up"
              className="mt-8 block w-full rounded-xl border border-[#27272a] bg-[#09090b] py-3 text-center text-sm font-semibold text-white transition hover:border-violet-500/40 hover:bg-zinc-900"
            >
              Get started free
            </Link>
          </div>

          <div className="relative rounded-3xl border border-violet-500/60 bg-gradient-to-b from-violet-500/15 via-[#18181b] to-[#18181b] p-8 shadow-[0_0_0_1px_rgba(139,92,246,0.25),0_0_40px_rgba(139,92,246,0.18)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-violet-400/30 bg-violet-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Most Popular
            </div>

            <div className="mb-8 pt-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-200">Pro</p>
              <div className="mt-5 flex items-end gap-2">
                <p className="text-5xl font-semibold tracking-tight text-white">$19</p>
                <p className="pb-1 text-sm text-violet-200/80">per month</p>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                Built for serious creators who need speed, scale, and a more efficient publishing workflow.
              </p>
            </div>

            <div className="rounded-2xl border border-violet-500/20 bg-black/20 p-5">
              <ul className="space-y-3 text-sm text-zinc-100">
                <li className="flex items-center gap-3"><span className="text-emerald-300">✓</span> Unlimited projects</li>
                <li className="flex items-center gap-3"><span className="text-emerald-300">✓</span> 320 clips/month</li>
                <li className="flex items-center gap-3"><span className="text-emerald-300">✓</span> AI metadata generation</li>
                <li className="flex items-center gap-3"><span className="text-emerald-300">✓</span> CSV export</li>
                <li className="flex items-center gap-3"><span className="text-emerald-300">✓</span> Bulk generation</li>
                <li className="flex items-center gap-3"><span className="text-emerald-300">✓</span> Priority support</li>
              </ul>
            </div>

            <button
              onClick={() => handleUpgrade('pro', setLoadingPlan, router)}
              disabled={loadingPlan === 'pro'}
              className="mt-8 block w-full rounded-xl bg-violet-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingPlan === 'pro' ? 'Loading…' : 'Start free trial'}
            </button>
          </div>

          <div className="relative rounded-3xl border border-[#27272a] bg-[#18181b] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Studio</p>
              <div className="mt-5 flex items-end gap-2">
                <p className="text-5xl font-semibold tracking-tight text-white">$49</p>
                <p className="pb-1 text-sm text-zinc-500">per month</p>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                For teams and high-volume workflows that need maximum output and room to grow.
              </p>
            </div>

            <div className="rounded-2xl border border-[#27272a] bg-[#09090b]/50 p-5">
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-3"><Check /> Unlimited projects</li>
                <li className="flex items-center gap-3"><Check /> 2,000 clips/month</li>
                <li className="flex items-center gap-3"><Check /> AI metadata generation</li>
                <li className="flex items-center gap-3"><Check /> CSV export</li>
                <li className="flex items-center gap-3"><Check /> Bulk generation</li>
                <li className="flex items-center gap-3"><Check /> Team access (coming soon)</li>
              </ul>
            </div>

            <button
              onClick={() => handleUpgrade('studio', setLoadingPlan, router)}
              disabled={loadingPlan === 'studio'}
              className="mt-8 block w-full rounded-xl border border-[#27272a] bg-[#09090b] py-3 text-center text-sm font-semibold text-white transition hover:border-violet-500/40 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingPlan === 'studio' ? 'Loading…' : 'Get Studio'}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-zinc-500">
          All paid plans include a 7-day free trial. No credit card required to start.
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

        <div className="overflow-hidden rounded-3xl border border-[#27272a] bg-[#18181b]">
          <div className="grid grid-cols-4 border-b border-[#27272a] bg-[#121214] text-sm">
            <div className="px-6 py-4 font-medium text-zinc-400">Features</div>
            <div className="px-6 py-4 text-center font-semibold text-white">Free</div>
            <div className="bg-violet-500/10 px-6 py-4 text-center font-semibold text-violet-200">Pro</div>
            <div className="px-6 py-4 text-center font-semibold text-white">Studio</div>
          </div>

          {[
            ['Projects', '1 project', 'Unlimited', 'Unlimited'],
            ['Clip volume', '10/month', '320/month', '2,000/month'],
            ['AI metadata generation', 'Included', 'Included', 'Included'],
            ['CSV export', 'Included', 'Included', 'Included'],
            ['Bulk generation', '—', 'Included', 'Included'],
            ['Priority support', '—', 'Included', 'Included'],
            ['Team access', '—', '—', 'Coming soon'],
          ].map((row) => (
            <div key={row[0]} className="grid grid-cols-4 border-b border-[#27272a] last:border-b-0">
              <div className="px-6 py-4 text-sm font-medium text-zinc-300">{row[0]}</div>
              <div className="px-6 py-4 text-center text-sm text-zinc-400">{row[1]}</div>
              <div className="bg-violet-500/5 px-6 py-4 text-center text-sm text-zinc-100">{row[2]}</div>
              <div className="px-6 py-4 text-center text-sm text-zinc-400">{row[3]}</div>
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

        <div className="grid gap-4 md:grid-cols-2">
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
          <span>© 2026 ClipMeta</span>
          <Link href="/legal/terms" className="transition-colors hover:text-white">Terms of Service</Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
        </div>
      </footer>
    </main>
  );
}
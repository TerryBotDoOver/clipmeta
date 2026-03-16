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
  const Check = () => <span className="text-green-500">✓</span>;
  const Dash = () => <span className="text-muted-foreground/40">–</span>;

  return (
    <main className="min-h-screen bg-background">

      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-foreground">ClipMeta</Link>
          <Link href="/auth" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
            Sign In
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Pricing</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-2xl border border-border bg-card p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Free</p>
            <p className="mt-4 text-4xl font-bold text-foreground">$0</p>
            <p className="mt-1 text-sm text-muted-foreground">Forever free</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Check /> 1 project</li>
              <li className="flex items-center gap-2"><Check /> Up to 10 clips/month</li>
              <li className="flex items-center gap-2"><Check /> AI metadata generation</li>
              <li className="flex items-center gap-2"><Check /> CSV export</li>
              <li className="flex items-center gap-2"><Dash /> Bulk generation</li>
              <li className="flex items-center gap-2"><Dash /> Priority support</li>
            </ul>
            <Link
              href="/sign-up"
              className="mt-8 block w-full rounded-lg border border-border py-3 text-center text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Get started free
            </Link>
          </div>

          <div className="rounded-2xl border-2 border-primary bg-primary p-8 shadow-lg shadow-primary/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Pro</p>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">Most popular</span>
            </div>
            <p className="mt-4 text-4xl font-bold text-white">$19</p>
            <p className="mt-1 text-sm text-white/70">per month</p>
            <ul className="mt-6 space-y-3 text-sm text-white/90">
              <li className="flex items-center gap-2"><span className="text-green-300">✓</span> Unlimited projects</li>
              <li className="flex items-center gap-2"><span className="text-green-300">✓</span> 320 clips/month</li>
              <li className="flex items-center gap-2"><span className="text-green-300">✓</span> AI metadata generation</li>
              <li className="flex items-center gap-2"><span className="text-green-300">✓</span> CSV export</li>
              <li className="flex items-center gap-2"><span className="text-green-300">✓</span> Bulk generation</li>
              <li className="flex items-center gap-2"><span className="text-green-300">✓</span> Priority support</li>
            </ul>
            <button
              onClick={() => handleUpgrade('pro', setLoadingPlan, router)}
              disabled={loadingPlan === 'pro'}
              className="mt-8 block w-full rounded-lg bg-white py-3 text-center text-sm font-semibold text-primary transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingPlan === 'pro' ? 'Loading…' : 'Start free trial'}
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Studio</p>
            <p className="mt-4 text-4xl font-bold text-foreground">$49</p>
            <p className="mt-1 text-sm text-muted-foreground">per month</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Check /> Unlimited projects</li>
              <li className="flex items-center gap-2"><Check /> 2,000 clips/month</li>
              <li className="flex items-center gap-2"><Check /> AI metadata generation</li>
              <li className="flex items-center gap-2"><Check /> CSV export</li>
              <li className="flex items-center gap-2"><Check /> Bulk generation</li>
              <li className="flex items-center gap-2"><Check /> Team access (coming soon)</li>
            </ul>
            <button
              onClick={() => handleUpgrade('studio', setLoadingPlan, router)}
              disabled={loadingPlan === 'studio'}
              className="mt-8 block w-full rounded-lg border border-border py-3 text-center text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingPlan === 'studio' ? 'Loading…' : 'Get Studio'}
            </button>
          </div>

        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          All plans include a 7-day free trial. No credit card required to start.
        </p>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-6 text-sm text-muted-foreground">
          <span>© 2026 ClipMeta</span>
          <Link href="/legal/terms" className="transition-colors hover:text-foreground">Terms of Service</Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
        </div>
      </footer>
    </main>
  );
}
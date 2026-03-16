import Link from "next/link";

export default function PricingPage() {
  const Check = () => <span className="text-green-500">✓</span>;
  const Dash  = () => <span className="text-muted-foreground/40">–</span>;

  return (
    <main className="min-h-screen bg-background">

      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-foreground">ClipMeta</Link>
          <Link href="/auth" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Pricing</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Free */}
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

          {/* Pro — highlighted */}
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
            <Link
              href="/sign-up"
              className="mt-8 block w-full rounded-lg bg-white py-3 text-center text-sm font-semibold text-primary transition hover:bg-white/90"
            >
              Start free trial
            </Link>
          </div>

          {/* Studio */}
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
            <Link
              href="/sign-up"
              className="mt-8 block w-full rounded-lg border border-border py-3 text-center text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Contact us
            </Link>
          </div>

        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          All plans include a 7-day free trial. No credit card required to start.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-6 text-sm text-muted-foreground">
          <span>© 2026 ClipMeta</span>
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </main>
  );
}

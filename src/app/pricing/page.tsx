import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">

      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-foreground">ClipMeta</Link>
          <Link href="/auth" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Pricing</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          {/* Free */}
          <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free</p>
            <p className="mt-4 text-4xl font-bold text-foreground">$0</p>
            <p className="mt-1 text-sm text-muted-foreground">Forever free</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-green-500">✓</span> 1 project</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> Up to 10 clips/month</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> AI metadata generation</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> CSV export</li>
              <li className="flex gap-2"><span className="text-slate-300">✗</span> Bulk generation</li>
              <li className="flex gap-2"><span className="text-slate-300">✗</span> Priority support</li>
            </ul>
            <Link
              href="/sign-up"
              className="mt-8 block w-full rounded-lg border border-slate-300 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Get started free
            </Link>
          </div>

          {/* Pro — highlighted */}
          <div className="rounded-2xl border-2 border-slate-900 bg-slate-900 p-8 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">Pro</p>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">Most popular</span>
            </div>
            <p className="mt-4 text-4xl font-bold">$19</p>
            <p className="mt-1 text-sm text-slate-400">per month</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li className="flex gap-2"><span className="text-green-400">✓</span> Unlimited projects</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> 200 clips/month</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> AI metadata generation</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> CSV export</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Bulk generation</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Priority support</li>
            </ul>
            <Link
              href="/sign-up"
              className="mt-8 block w-full rounded-lg bg-card py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-muted"
            >
              Start free trial
            </Link>
          </div>

          {/* Studio */}
          <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Studio</p>
            <p className="mt-4 text-4xl font-bold text-foreground">$49</p>
            <p className="mt-1 text-sm text-muted-foreground">per month</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-green-500">✓</span> Unlimited projects</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> Unlimited clips</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> AI metadata generation</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> CSV export</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> Bulk generation</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> Team access (coming soon)</li>
            </ul>
            <Link
              href="/sign-up"
              className="mt-8 block w-full rounded-lg border border-slate-300 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-6 text-sm text-muted-foreground">
          <span>© 2026 ClipMeta</span>
          <Link href="/legal/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy Policy</Link>
        </div>
      </footer>
    </main>
  );
}

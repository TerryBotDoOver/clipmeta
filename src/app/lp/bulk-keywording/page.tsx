import Link from "next/link";
import { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Bulk Keyword Stock Footage with AI — ClipMeta",
  description:
    "Keyword 50, 500, or 5000 stock footage clips in minutes. ClipMeta generates titles, descriptions, and keywords for every clip automatically. Review, export CSV, done.",
};

export default function BulkKeywordingPage() {
  return (
    <main className="min-h-screen bg-background">

      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
            <img src="/logo-icon.svg" className="h-7 w-7" alt="ClipMeta" />
            ClipMeta
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Bulk keywording stock footage
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
          Bulk Keyword Your Stock Footage in Minutes, Not Hours
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Got 50, 500, or 5000 clips to keyword? ClipMeta generates titles, descriptions,
          and keywords for every clip automatically. Review batch, export CSV, done.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Get Started Free
          </Link>
          <Link
            href="/auth"
            className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-muted"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Pain vs Solution */}
      <section className="border-t border-slate-100 bg-muted/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-slate-900">
            Keywording at scale shouldn't take a week
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-8">
              <h3 className="mb-4 text-lg font-semibold text-red-800">Without ClipMeta</h3>
              <ul className="space-y-3 text-sm leading-6 text-red-700">
                <li className="flex items-start gap-2"><span>✗</span> Keyworiding 500 clips manually takes days</li>
                <li className="flex items-start gap-2"><span>✗</span> Keyword quality degrades as fatigue sets in</li>
                <li className="flex items-start gap-2"><span>✗</span> Inconsistent tagging hurts discoverability</li>
                <li className="flex items-start gap-2"><span>✗</span> Time spent on admin, not shooting</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 p-8">
              <h3 className="mb-4 text-lg font-semibold text-green-800">With ClipMeta</h3>
              <ul className="space-y-3 text-sm leading-6 text-green-700">
                <li className="flex items-start gap-2"><span>✓</span> AI keywords entire batches automatically</li>
                <li className="flex items-start gap-2"><span>✓</span> Consistent quality across every clip</li>
                <li className="flex items-start gap-2"><span>✓</span> Review and edit inline before export</li>
                <li className="flex items-start gap-2"><span>✓</span> One CSV export for the whole batch</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-slate-900">
            How it works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm text-center">
              <div className="text-4xl">📤</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Step 1</div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Upload your batch</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Create a project and upload your entire batch of clips at once.
                ClipMeta handles large volumes with ease.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm text-center">
              <div className="text-4xl">🤖</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Step 2</div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">AI keywords everything</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                ClipMeta generates titles, descriptions, and keyword sets for
                every clip in your batch automatically.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm text-center">
              <div className="text-4xl">📋</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Step 3</div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Review, edit, export CSV</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Review the batch inline, make any edits, then export a single CSV
                file ready for platform upload.
              </p>
            </div>
          </div>
        </div>
      </section>

      <EmailCapture source="seo-bulk" />

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-900 py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Stop keyworiding one clip at a time
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Free plan available. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-slate-900">
            Frequently asked questions
          </h2>
          <div className="space-y-8">
            <div className="border-b border-slate-100 pb-8">
              <h3 className="text-base font-semibold text-foreground">How many clips can I process at once?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                It depends on your plan. The Pro plan handles large batches. Check the pricing page
                for current limits.
              </p>
            </div>
            <div className="border-b border-slate-100 pb-8">
              <h3 className="text-base font-semibold text-foreground">Can I edit keywords after they're generated?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Yes — full inline editing on every clip. Add, remove, or reorder keywords before
                you export.
              </p>
            </div>
            <div className="border-b border-slate-100 pb-8">
              <h3 className="text-base font-semibold text-foreground">Does it work for video and photo?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ClipMeta is optimized for video stock footage. Photo support may vary — check the
                latest feature list in the app.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">What's the export format?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                CSV, ready for direct platform upload to Blackbox.global, Pond5, Adobe Stock,
                and Shutterstock.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <img src="/logo-icon.svg" className="h-4 w-4" alt="" />
            © 2026 ClipMeta
          </span>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
        </div>
      </footer>

    </main>
  );
}

import Link from "next/link";
import { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Stock Footage Metadata Tool — ClipMeta",
  description:
    "Generate stock-ready titles, descriptions, and keywords for every clip automatically. Review inline, export CSV. Works with Blackbox.global, Pond5, Adobe Stock, and Shutterstock.",
};

export default function StockFootageMetadataPage() {
  return (
    <main className="min-h-screen bg-background">

      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-foreground">ClipMeta</Link>
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
          Stock footage metadata tool
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
          The Fastest Way to Generate Stock Footage Metadata
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Stop writing titles and keywords by hand. ClipMeta uses AI to generate
          stock-ready metadata for every clip — then you review, edit, and export CSV.
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
            Manual metadata is killing your workflow
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-8">
              <h3 className="mb-4 text-lg font-semibold text-red-800">The old way</h3>
              <ul className="space-y-3 text-sm leading-6 text-red-700">
                <li className="flex items-start gap-2"><span>✗</span> Writing titles for every single clip by hand</li>
                <li className="flex items-start gap-2"><span>✗</span> Guessing which keywords buyers actually search</li>
                <li className="flex items-start gap-2"><span>✗</span> Copy-pasting data into spreadsheets clip by clip</li>
                <li className="flex items-start gap-2"><span>✗</span> Inconsistent descriptions across your portfolio</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 p-8">
              <h3 className="mb-4 text-lg font-semibold text-green-800">With ClipMeta</h3>
              <ul className="space-y-3 text-sm leading-6 text-green-700">
                <li className="flex items-start gap-2"><span>✓</span> AI generates titles, descriptions, and keywords instantly</li>
                <li className="flex items-start gap-2"><span>✓</span> Keywords trained on what stock platforms expect</li>
                <li className="flex items-start gap-2"><span>✓</span> Review and edit everything inline before export</li>
                <li className="flex items-start gap-2"><span>✓</span> One-click CSV export ready for platform upload</li>
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
              <h3 className="mt-2 text-lg font-semibold text-foreground">Upload clips</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Create a project and upload your footage. ClipMeta extracts frames
                and prepares each clip for analysis.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm text-center">
              <div className="text-4xl">🤖</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Step 2</div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">AI generates metadata</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                ClipMeta automatically writes titles, descriptions, keywords,
                categories, and location for every clip.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm text-center">
              <div className="text-4xl">📋</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Step 3</div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Review, edit, export CSV</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Edit any field inline. When you're happy, export a clean CSV
                ready for stock platform submission.
              </p>
            </div>
          </div>
        </div>
      </section>

      <EmailCapture source="seo-metadata" />

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-900 py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Start generating metadata today
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
              <h3 className="text-base font-semibold text-foreground">What platforms does ClipMeta support?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ClipMeta exports CSV files compatible with Blackbox.global, Pond5, Adobe Stock, and Shutterstock.
                The metadata fields are mapped to each platform's upload template.
              </p>
            </div>
            <div className="border-b border-slate-100 pb-8">
              <h3 className="text-base font-semibold text-foreground">Can I review and edit metadata before I export?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Yes — every field is editable inline before you export. You stay in control of what
                gets submitted to platforms.
              </p>
            </div>
            <div className="border-b border-slate-100 pb-8">
              <h3 className="text-base font-semibold text-foreground">How accurate is the AI metadata?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Better than starting from blank. ClipMeta is trained specifically for stock platform
                requirements and generates relevant keywords and descriptions. You review everything
                before it ships.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Is there a free plan?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Yes. ClipMeta has a free plan so you can try it before committing. No credit card required
                to get started.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-6 text-sm text-muted-foreground">
          <span>© 2026 ClipMeta</span>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
        </div>
      </footer>

    </main>
  );
}

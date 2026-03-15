import Link from "next/link";
import { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Upload to Blackbox Faster — ClipMeta",
  description:
    "ClipMeta generates titles, descriptions, keywords, categories, and location for your stock clips — then exports a CSV that maps directly to Blackbox.global's upload template.",
};

export default function BlackboxUploadPage() {
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
          Blackbox.global metadata upload
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
          Upload to Blackbox.global Faster With AI Metadata
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          ClipMeta generates your titles, descriptions, keywords, categories, and location —
          then exports a CSV that maps directly to Blackbox.global's upload template.
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
            Blackbox submissions shouldn't slow you down
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-8">
              <h3 className="mb-4 text-lg font-semibold text-red-800">Doing it manually</h3>
              <ul className="space-y-3 text-sm leading-6 text-red-700">
                <li className="flex items-start gap-2"><span>✗</span> Building the spreadsheet from scratch every batch</li>
                <li className="flex items-start gap-2"><span>✗</span> Getting column names wrong and re-uploading</li>
                <li className="flex items-start gap-2"><span>✗</span> Writing titles, keywords, and categories by hand</li>
                <li className="flex items-start gap-2"><span>✗</span> Missing fields like location or category</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 p-8">
              <h3 className="mb-4 text-lg font-semibold text-green-800">With ClipMeta</h3>
              <ul className="space-y-3 text-sm leading-6 text-green-700">
                <li className="flex items-start gap-2"><span>✓</span> AI fills every required Blackbox metadata field</li>
                <li className="flex items-start gap-2"><span>✓</span> CSV columns match the Blackbox upload template</li>
                <li className="flex items-start gap-2"><span>✓</span> Title, description, keywords, category, location — all covered</li>
                <li className="flex items-start gap-2"><span>✓</span> Review and edit before you export</li>
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
                Create a project in ClipMeta and upload your footage.
                ClipMeta extracts frames and prepares each clip for analysis.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm text-center">
              <div className="text-4xl">🤖</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Step 2</div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">AI generates metadata</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                ClipMeta automatically generates titles, descriptions, keywords,
                categories, and location for every clip — Blackbox-ready.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-card p-8 shadow-sm text-center">
              <div className="text-4xl">📋</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Step 3</div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Export Blackbox CSV</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Review everything inline, then export a CSV mapped directly to
                Blackbox.global's upload template. Upload and you're done.
              </p>
            </div>
          </div>
        </div>
      </section>

      <EmailCapture source="seo-blackbox" />

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-900 py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Ready to submit to Blackbox faster?
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
              <h3 className="text-base font-semibold text-foreground">Does the CSV export match the Blackbox.global format?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Yes. The exported CSV is mapped to match Blackbox.global's upload template columns,
                so you can import it directly without reformatting.
              </p>
            </div>
            <div className="border-b border-slate-100 pb-8">
              <h3 className="text-base font-semibold text-foreground">Can I also export for other platforms?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Yes. ClipMeta also supports CSV exports for Pond5, Adobe Stock, and Shutterstock
                from the same project.
              </p>
            </div>
            <div className="border-b border-slate-100 pb-8">
              <h3 className="text-base font-semibold text-foreground">Do I need a Blackbox.global account to use ClipMeta?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                No. ClipMeta is an independent tool. You use it to prepare your metadata,
                then upload to Blackbox separately using their standard process.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">How fast is the metadata generation?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Under a minute per clip in most cases. You can submit a batch and review
                results as they come in.
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

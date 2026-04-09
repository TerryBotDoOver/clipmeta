import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Stock Footage Metadata Grader — ClipMeta",
  description:
    "Paste one title, description, and keyword set. Score it against 1,000 real stock-footage patterns, see what is weak, then unlock the full rewrite inside ClipMeta.",
};

export default function StockFootageMetadataPage() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
            <img src="/logo-icon.svg" className="h-7 w-7" alt="ClipMeta" />
            ClipMeta
          </Link>
          <Link
            href="/auth?mode=signup"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Start Free
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
            New free top-of-funnel tool
          </p>
          <h1 className="mt-5 text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Free Stock Footage Metadata Grader
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Contributors paste one title, one description, and one keyword list. ClipMeta grades it against 1,000 real-stock patterns, surfaces weak spots instantly, and gates the full rewrite behind email capture plus a free-trial CTA.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/tools/metadata-grader"
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open the grader
            </Link>
            <Link
              href="/auth?mode=signup"
              className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-muted"
            >
              Try ClipMeta free
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
            <div className="text-3xl">1️⃣</div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">Paste one metadata set</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              One title, one description, and one keyword list. No signup required to get the first score.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
            <div className="text-3xl">2️⃣</div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">See exactly what is weak</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Generic phrasing, short descriptions, duplicate keywords, weak keyword ordering, and overused stock filler get called out clearly.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
            <div className="text-3xl">3️⃣</div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">Unlock the rewrite</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Gate the full rewrite behind email capture, then push the visitor into ClipMeta’s free trial for the conversion step.
            </p>
          </div>
        </div>

        <div className="mt-16 rounded-3xl border border-violet-200 bg-violet-50 p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Built for Blackbox, Adobe Stock, Pond5, and Shutterstock contributors
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
                This is a cleaner top-of-funnel than generic blog SEO because it speaks directly to active stock contributors and gives them immediate value before the trial pitch.
              </p>
            </div>
            <Link
              href="/tools/metadata-grader"
              className="inline-flex rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Launch MVP
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";
import { FlightDeckShell } from "@/components/landing/FlightDeckShell";

export const metadata: Metadata = {
  title: "Bulk Keyword Stock Footage with AI — ClipMeta",
  description:
    "Keyword 50, 500, or 5000 stock footage clips in minutes. ClipMeta generates titles, descriptions, and keywords for every clip automatically. Review, export CSV, done.",
};

export default function BulkKeywordingPage() {
  return (
    <FlightDeckShell>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="hud-chip mx-auto mb-4 inline-flex">
          Bulk keywording stock footage
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-white md:text-6xl">
          Bulk Keyword Your Stock Footage in <span className="gradient-text">Minutes, Not Hours</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
          Got 50, 500, or 5000 clips to keyword? ClipMeta generates titles, descriptions,
          and keywords for every clip automatically. Review batch, export CSV, done.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
          >
            Get Started Free
          </Link>
          <Link
            href="/auth"
            className="rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/5"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Pain vs Solution */}
      <section className="relative border-t border-white/10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white">
            Keywording at scale shouldn't take a week
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-8">
              <h3 className="mb-4 text-lg font-semibold text-red-200">Without ClipMeta</h3>
              <ul className="space-y-3 text-sm leading-6 text-red-100/80">
                <li className="flex items-start gap-2"><span>✗</span> Keyworiding 500 clips manually takes days</li>
                <li className="flex items-start gap-2"><span>✗</span> Keyword quality degrades as fatigue sets in</li>
                <li className="flex items-start gap-2"><span>✗</span> Inconsistent tagging hurts discoverability</li>
                <li className="flex items-start gap-2"><span>✗</span> Time spent on admin, not shooting</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-green-400/30 bg-green-500/10 p-8">
              <h3 className="mb-4 text-lg font-semibold text-green-200">With ClipMeta</h3>
              <ul className="space-y-3 text-sm leading-6 text-green-100/80">
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
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white">
            How it works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="glass-card p-8 text-center">
              <div className="text-4xl">📤</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-white/60">Step 1</div>
              <h3 className="mt-2 text-lg font-semibold text-white">Upload your batch</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Create a project and upload your entire batch of clips at once.
                ClipMeta handles large volumes with ease.
              </p>
            </div>
            <div className="glass-card p-8 text-center">
              <div className="text-4xl">🤖</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-white/60">Step 2</div>
              <h3 className="mt-2 text-lg font-semibold text-white">AI keywords everything</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                ClipMeta generates titles, descriptions, and keyword sets for
                every clip in your batch automatically.
              </p>
            </div>
            <div className="glass-card p-8 text-center">
              <div className="text-4xl">📋</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-white/60">Step 3</div>
              <h3 className="mt-2 text-lg font-semibold text-white">Review, edit, export CSV</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Review the batch inline, make any edits, then export a single CSV
                file ready for platform upload.
              </p>
            </div>
          </div>
        </div>
      </section>

      <EmailCapture source="seo-bulk" />

      {/* CTA */}
      <section className="relative border-t border-white/10 py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Stop keyworiding one clip at a time
          </h2>
          <p className="mt-4 text-lg text-white/65">
            Free plan available. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-block rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white">
            Frequently asked questions
          </h2>
          <div className="space-y-8">
            <div className="border-b border-white/10 pb-8">
              <h3 className="text-base font-semibold text-white">How many clips can I process at once?</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                It depends on your plan. The Pro plan handles large batches. Check the pricing page
                for current limits.
              </p>
            </div>
            <div className="border-b border-white/10 pb-8">
              <h3 className="text-base font-semibold text-white">Can I edit keywords after they're generated?</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Yes — full inline editing on every clip. Add, remove, or reorder keywords before
                you export.
              </p>
            </div>
            <div className="border-b border-white/10 pb-8">
              <h3 className="text-base font-semibold text-white">Does it work for video and photo?</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                ClipMeta is optimized for video stock footage. Photo support may vary — check the
                latest feature list in the app.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">What's the export format?</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                CSV, ready for direct platform upload to Blackbox.global, Pond5, Adobe Stock,
                and Shutterstock.
              </p>
            </div>
          </div>
        </div>
      </section>

    </FlightDeckShell>
  );
}

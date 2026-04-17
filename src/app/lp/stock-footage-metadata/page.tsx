import Link from "next/link";
import { Metadata } from "next";
import { FlightDeckShell } from "@/components/landing/FlightDeckShell";

export const metadata: Metadata = {
  title: "Free Stock Footage Metadata Grader — ClipMeta",
  description:
    "Paste one title, description, and keyword set. Score it against 1,000 real stock-footage patterns, see what is weak, then unlock the full rewrite inside ClipMeta.",
};

export default function StockFootageMetadataPage() {
  return (
    <FlightDeckShell>
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="hud-chip mb-4 inline-flex">
            New free top-of-funnel tool
          </p>
          <h1 className="mt-5 text-5xl font-bold tracking-tight text-white md:text-6xl">
            Free Stock Footage <span className="gradient-text">Metadata Grader</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-white/60">
            Contributors paste one title, one description, and one keyword list. ClipMeta grades it against 1,000 real-stock patterns, surfaces weak spots instantly, and gates the full rewrite behind email capture plus a free-trial CTA.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/tools/metadata-grader"
              className="rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
            >
              Open the grader
            </Link>
            <Link
              href="/auth?mode=signup"
              className="rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/5"
            >
              Try ClipMeta free
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="glass-card p-6">
            <div className="text-3xl">1️⃣</div>
            <h2 className="mt-4 text-lg font-semibold text-white">Paste one metadata set</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              One title, one description, and one keyword list. No signup required to get the first score.
            </p>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl">2️⃣</div>
            <h2 className="mt-4 text-lg font-semibold text-white">See exactly what is weak</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Generic phrasing, short descriptions, duplicate keywords, weak keyword ordering, and overused stock filler get called out clearly.
            </p>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl">3️⃣</div>
            <h2 className="mt-4 text-lg font-semibold text-white">Unlock the rewrite</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Gate the full rewrite behind email capture, then push the visitor into ClipMeta’s free trial for the conversion step.
            </p>
          </div>
        </div>

        <div className="mt-16 rounded-3xl border border-violet-400/30 bg-violet-500/10 p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Built for Blackbox, Adobe Stock, Pond5, and Shutterstock contributors
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/75">
                This is a cleaner top-of-funnel than generic blog SEO because it speaks directly to active stock contributors and gives them immediate value before the trial pitch.
              </p>
            </div>
            <Link
              href="/tools/metadata-grader"
              className="inline-flex rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
            >
              Launch MVP
            </Link>
          </div>
        </div>
      </section>
    </FlightDeckShell>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";
import { FlightDeckShell } from "@/components/landing/FlightDeckShell";

export const metadata: Metadata = {
  title: "Stop Spending Hours on Stock Footage Keywords | ClipMeta",
  description:
    "AI generates titles, descriptions, and keywords for your stock clips. Upload, review, export CSV — done. Free to start.",
};

export default function RedditLandingPage() {
  return (
    <FlightDeckShell>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="inline-block rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-200">
          For stock footage contributors — Blackbox, Pond5, Adobe Stock, Shutterstock
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
          Keywording clips is the worst part.
          <br />
          <span className="gradient-text">We fixed that.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
          Upload your clips, get AI-generated titles, descriptions, and keywords in seconds.
          Review and edit anything, then export a CSV ready for submission. No more
          staring at a blank keyword field for 10 minutes per clip.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
          >
            Start Free — No Credit Card
          </Link>
        </div>
        <p className="mt-4 text-sm text-white/60">
          Takes about 2 minutes to set up your first project.
        </p>
      </section>

      {/* Pain / Agitation */}
      <section className="relative border-t border-white/10 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-white">
            If you&rsquo;ve ever uploaded to stock platforms, you know the drill
          </h2>
          <div className="mt-10 space-y-4">
            {[
              "You shoot a 4-hour trip and come home with 200 clips",
              "Each one needs a title, description, and 30–50 keywords",
              "You keyword the first 10 clips, hate your life, and leave the rest in a folder",
              "Months later, your portfolio is 12 clips and you wonder why earnings are low",
            ].map((item, i) => (
              <div key={i} className="glass-card flex items-start gap-3 p-4">
                <span className="mt-0.5 text-xl">😩</span>
                <p className="text-white/75">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-white">
            Here&rsquo;s what actually happens with ClipMeta
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                icon: "📤",
                title: "Upload your clips",
                body: "Create a project, drag in your clips. We extract frames automatically — no manual screenshots needed.",
              },
              {
                step: "2",
                icon: "🤖",
                title: "AI writes the metadata",
                body: "Titles, descriptions, keywords, categories, location. Built for stock platforms, not generic SEO fluff.",
              },
              {
                step: "3",
                icon: "📋",
                title: "Review, edit, export",
                body: "Edit anything inline before it ships. One click exports a CSV ready for Blackbox, Pond5, Adobe Stock, or Shutterstock.",
              },
            ].map((item) => (
              <div key={item.step} className="glass-card relative p-8">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-sm font-bold text-white shadow-lg shadow-violet-500/30">
                  {item.step}
                </div>
                <div className="mt-2 text-3xl">{item.icon}</div>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <EmailCapture source="reddit" />

      {/* Social proof / specifics */}
      <section className="relative border-t border-white/10 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">Designed specifically for stock contributors</h2>
          <p className="mt-4 text-white/60">
            Not a generic AI tool that writes keywords like &ldquo;beautiful nature background.&rdquo;
            ClipMeta knows what stock platforms want.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {[
              { icon: "🎯", title: "Platform-aware keywords", body: "Keywords scored for quality and relevance to actual buyer searches on stock platforms." },
              { icon: "✏️", title: "Always editable", body: "Every field is inline-editable. You're always in control before anything gets exported." },
              { icon: "📊", title: "CSV export for any platform", body: "One-click export in the exact format each platform expects. Blackbox, Pond5, Adobe Stock, Shutterstock." },
              { icon: "⚡", title: "Batch processing", body: "Generate metadata for an entire project at once. Don't babysit each clip individually." },
            ].map((item) => (
              <div key={item.title} className="glass-card p-6 text-left">
                <div className="text-2xl">{item.icon}</div>
                <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-white/60">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Your clips are sitting in a folder doing nothing.
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Get them keyworded and submitted. It&rsquo;s free to start.
          </p>
          <div className="mt-8">
            <Link
              href="/sign-up"
              className="inline-block rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
            >
              Create Your Free Account
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/60">
            No credit card required. Start with your first project today.
          </p>
        </div>
      </section>

    </FlightDeckShell>
  );
}

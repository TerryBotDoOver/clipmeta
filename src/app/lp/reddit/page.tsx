import Link from "next/link";
import type { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Stop Spending Hours on Stock Footage Keywords | ClipMeta",
  description:
    "AI generates titles, descriptions, and keywords for your stock clips. Upload, review, export CSV — done. Free to start.",
};

export default function RedditLandingPage() {
  return (
    <main className="min-h-screen bg-background">

      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-foreground">ClipMeta</span>
          <Link
            href="/sign-up"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Try Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="inline-block rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800">
          For stock footage contributors — Blackbox, Pond5, Adobe Stock, Shutterstock
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
          Keywording clips is the worst part.
          <br />
          <span className="text-slate-500">We fixed that.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Upload your clips, get AI-generated titles, descriptions, and keywords in seconds.
          Review and edit anything, then export a CSV ready for submission. No more
          staring at a blank keyword field for 10 minutes per clip.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-lg bg-slate-900 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-slate-700"
          >
            Start Free — No Credit Card
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Takes about 2 minutes to set up your first project.
        </p>
      </section>

      {/* Pain / Agitation */}
      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            If you&rsquo;ve ever uploaded to stock platforms, you know the drill
          </h2>
          <div className="mt-10 space-y-4">
            {[
              "You shoot a 4-hour trip and come home with 200 clips",
              "Each one needs a title, description, and 30–50 keywords",
              "You keyword the first 10 clips, hate your life, and leave the rest in a folder",
              "Months later, your portfolio is 12 clips and you wonder why earnings are low",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="mt-0.5 text-xl">😩</span>
                <p className="text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">
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
              <div key={item.step} className="relative rounded-2xl border border-slate-200 bg-card p-8 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {item.step}
                </div>
                <div className="mt-2 text-3xl">{item.icon}</div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <EmailCapture source="reddit" />

      {/* Social proof / specifics */}
      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Designed specifically for stock contributors</h2>
          <p className="mt-4 text-muted-foreground">
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
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm">
                <div className="text-2xl">{item.icon}</div>
                <h3 className="mt-3 font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Your clips are sitting in a folder doing nothing.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get them keyworded and submitted. It&rsquo;s free to start.
          </p>
          <div className="mt-8">
            <Link
              href="/sign-up"
              className="inline-block rounded-lg bg-slate-900 px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-700"
            >
              Create Your Free Account
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. Start with your first project today.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-6 px-6 text-sm text-muted-foreground">
          <span>© 2026 ClipMeta</span>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
        </div>
      </footer>

    </main>
  );
}

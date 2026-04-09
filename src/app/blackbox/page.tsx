import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ClipMeta for Blackbox.global | AI Metadata + Direct CSV Export",
  description:
    "AI metadata tool with direct Blackbox.global CSV support. Generate titles, descriptions, keywords, and categories from your footage. Export and upload in minutes.",
  alternates: {
    canonical: "https://clipmeta.app/blackbox",
  },
  openGraph: {
    title: "ClipMeta for Blackbox.global | AI Metadata + Direct CSV Export",
    description:
      "AI metadata tool with direct Blackbox.global CSV support. Generate titles, descriptions, keywords, and categories from your footage. Export and upload in minutes.",
    url: "https://clipmeta.app/blackbox",
    siteName: "ClipMeta",
    type: "website",
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ClipMeta",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI metadata generation tool for Blackbox.global stock footage contributors. Generates titles, descriptions, keywords, and categories from video frames.",
  url: "https://clipmeta.app/blackbox",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier: 3 clips per day",
  },
};

export default function BlackboxPage() {
  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Nav */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
            <img src="/logo-icon.svg" className="h-7 w-7" alt="ClipMeta" />
            ClipMeta
          </Link>
          <div className="hidden sm:flex items-center">
            <Link
              href="/pricing"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center md:py-28">
        <div className="inline-block rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-sm font-medium text-violet-400 mb-6">
          Built for Blackbox.global contributors
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Stop spending hours on metadata.
          <br className="hidden sm:block" />
          <span className="text-primary"> Start uploading to Blackbox.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          ClipMeta generates your titles, descriptions, keywords, and categories from actual video frames. Export a ready-to-upload CSV in Blackbox&apos;s exact format.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            Start Free — No Credit Card
          </Link>
          <a
            href="#how-it-works"
            className="rounded-lg border border-border px-7 py-3.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            See How It Works
          </a>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          3 clips free every day. No credit card required.
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">How it works</h2>
            <p className="mt-3 text-muted-foreground">Three steps from footage to Blackbox upload</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl">
                📤
              </div>
              <div className="text-5xl font-bold text-primary/20">1</div>
              <h3 className="font-semibold text-foreground">Upload your clips</h3>
              <p className="text-sm text-muted-foreground">Any format, any size. Batch upload your whole shoot at once.</p>
            </div>
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/40 bg-card p-8 text-center shadow-md shadow-primary/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl">
                🤖
              </div>
              <div className="text-5xl font-bold text-primary/20">2</div>
              <h3 className="font-semibold text-foreground">AI generates metadata</h3>
              <p className="text-sm text-muted-foreground">Titles, descriptions, 35+ keywords, and real Blackbox categories. Generated from actual frames, not filenames.</p>
            </div>
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl">
                📋
              </div>
              <div className="text-5xl font-bold text-primary/20">3</div>
              <h3 className="font-semibold text-foreground">Export Blackbox CSV</h3>
              <p className="text-sm text-muted-foreground">Download and upload directly to Blackbox.global. No reformatting, no spreadsheet wrangling.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Sound familiar?</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="text-2xl mb-4">😩</div>
              <h3 className="text-base font-semibold text-foreground mb-3">The old way</h3>
              <p className="text-sm text-muted-foreground leading-7">
                Shoot 50 clips. Spend 8 hours writing metadata. Manually format the CSV. Hope you picked the right categories. Realize you used the wrong column names. Start over.
              </p>
            </div>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-8">
              <div className="text-2xl mb-4">⚡</div>
              <h3 className="text-base font-semibold text-foreground mb-3">The ClipMeta way</h3>
              <p className="text-sm text-muted-foreground leading-7">
                Upload your batch. AI watches every clip. Review the metadata. Download the CSV. Upload to Blackbox. Done in minutes, not hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Everything you need for Blackbox
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built specifically for Blackbox contributors, not bolted on as an afterthought
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-border bg-card p-7 hover:border-violet-500/30 transition">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="text-base font-semibold text-foreground mb-2">Blackbox CSV Format</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Exact column names and structure that Blackbox expects. No manual reformatting, no import errors, no wasted time.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7 hover:border-violet-500/30 transition">
              <div className="text-3xl mb-4">🏷️</div>
              <h3 className="text-base font-semibold text-foreground mb-2">Real Category Matching</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                AI picks from Blackbox&apos;s actual category taxonomy. No guessing, no looking up codes. The right category every time.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7 hover:border-violet-500/30 transition">
              <div className="text-3xl mb-4">📦</div>
              <h3 className="text-base font-semibold text-foreground mb-2">Bulk Generation</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Process your entire batch at once, not one clip at a time. Upload 50 clips, come back to 50 finished metadata sets.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7 hover:border-violet-500/30 transition">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="text-base font-semibold text-foreground mb-2">Review Before Export</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Thumbnail preview, inline editing, keyword quality tools, and dedup finder. Nothing ships that you have not approved.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Other platforms */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-xl font-bold text-foreground mb-3">
            Also works with other platforms
          </h2>
          <p className="text-muted-foreground mb-8 text-sm max-w-xl mx-auto">
            Blackbox is your focus, but your clips can sell everywhere. Each platform gets its own CSV format. No reformatting needed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {["Shutterstock", "Adobe Stock", "Pond5"].map((platform) => (
              <div
                key={platform}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 shadow-sm"
              >
                <span className="text-primary font-bold">✓</span>
                <span className="text-sm font-medium text-foreground">{platform}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Start free. Scale as you grow.</h2>
          <p className="text-muted-foreground mb-10 text-sm">
            Use code{" "}
            <span className="font-mono font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
              FOUNDING50
            </span>{" "}
            for 50% off your first 3 months.{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              View full pricing
            </Link>
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-2xl mx-auto">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="text-sm font-semibold text-foreground">Free</div>
              <div className="mt-2 text-2xl font-bold text-foreground">$0</div>
              <div className="mt-1 text-xs text-muted-foreground">3 clips per day</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="text-sm font-semibold text-foreground">Starter</div>
              <div className="mt-2 text-2xl font-bold text-foreground">$9<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <div className="mt-1 text-xs text-muted-foreground">140 clips per month</div>
            </div>
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 text-center shadow-md shadow-primary/10">
              <div className="text-sm font-semibold text-foreground">Pro</div>
              <div className="mt-2 text-2xl font-bold text-primary">$19<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <div className="mt-1 text-xs text-muted-foreground">320 clips per month</div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to upload faster?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Try ClipMeta free today. No credit card, no commitment. See the quality for yourself on real footage.
          </p>
          <div className="mt-8">
            <Link
              href="/sign-up"
              className="inline-block rounded-lg bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 shadow-lg shadow-primary/25"
            >
              Start Free — 3 Clips/Day
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required. Cancel any time.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <img src="/logo-icon.svg" className="h-4 w-4" alt="" />
            © 2026 ClipMeta
          </span>
          <Link href="/pricing" className="hover:text-foreground transition">Pricing</Link>
          <Link href="/legal/terms" className="hover:text-foreground transition">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-foreground transition">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}

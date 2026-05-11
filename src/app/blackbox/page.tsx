import Link from "next/link";
import type { Metadata } from "next";
import { FlightDeckShell } from "@/components/landing/FlightDeckShell";

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
    images: [
      {
        url: "https://clipmeta.app/logo-full.png",
        width: 1200,
        height: 630,
        alt: "ClipMeta for Blackbox.global",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipMeta for Blackbox.global | AI Metadata + Direct CSV Export",
    description:
      "AI metadata tool with direct Blackbox.global CSV support. Generate titles, descriptions, keywords, and categories from your footage.",
    images: ["https://clipmeta.app/logo-full.png"],
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
    <FlightDeckShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 py-16 text-center md:py-28">
        <p className="hud-chip mx-auto mb-6 inline-flex">BUILT FOR BLACKBOX.GLOBAL</p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Stop spending hours on metadata.
          <br className="hidden sm:block" />
          <span className="gradient-text"> Start uploading to Blackbox.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
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
            className="rounded-lg border border-border px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-muted"
          >
            See How It Works
          </a>
        </div>
        <p className="mt-6 text-sm text-white/60">
          3 clips free every day. No credit card required.
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">How it works</h2>
            <p className="mt-3 text-white/60">Three steps from footage to Blackbox upload</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            <div className="flex flex-col items-center gap-4 glass-card p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl">
                📤
              </div>
              <div className="text-5xl font-bold text-primary/20">1</div>
              <h3 className="font-semibold text-white">Upload your clips</h3>
              <p className="text-sm text-white/60">Any format, any size. Batch upload your whole shoot at once.</p>
            </div>
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/40 bg-card p-8 text-center shadow-md shadow-primary/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl">
                🤖
              </div>
              <div className="text-5xl font-bold text-primary/20">2</div>
              <h3 className="font-semibold text-white">AI generates metadata</h3>
              <p className="text-sm text-white/60">Titles, descriptions, 35+ keywords, and real Blackbox categories. Generated from actual frames, not filenames.</p>
            </div>
            <div className="flex flex-col items-center gap-4 glass-card p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl">
                📋
              </div>
              <div className="text-5xl font-bold text-primary/20">3</div>
              <h3 className="font-semibold text-white">Export Blackbox CSV</h3>
              <p className="text-sm text-white/60">Download and upload directly to Blackbox.global. No reformatting, no spreadsheet wrangling.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="border-t border-white/5 bg-transparent py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Sound familiar?</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="glass-card p-8">
              <div className="text-2xl mb-4">😩</div>
              <h3 className="text-base font-semibold text-white mb-3">The old way</h3>
              <p className="text-sm text-white/60 leading-7">
                Shoot 50 clips. Spend 8 hours writing metadata. Manually format the CSV. Hope you picked the right categories. Realize you used the wrong column names. Start over.
              </p>
            </div>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-8">
              <div className="text-2xl mb-4">⚡</div>
              <h3 className="text-base font-semibold text-white mb-3">The ClipMeta way</h3>
              <p className="text-sm text-white/60 leading-7">
                Upload your batch. AI watches every clip. Review the metadata. Download the CSV. Upload to Blackbox. Done in minutes, not hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Everything you need for Blackbox
            </h2>
            <p className="mt-3 text-white/60">
              Built specifically for Blackbox contributors, not bolted on as an afterthought
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
            <div className="glass-card p-7 hover:border-violet-500/30 transition">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="text-base font-semibold text-white mb-2">Blackbox CSV Format</h3>
              <p className="text-sm leading-6 text-white/60">
                Exact column names and structure that Blackbox expects. No manual reformatting, no import errors, no wasted time.
              </p>
            </div>
            <div className="glass-card p-7 hover:border-violet-500/30 transition">
              <div className="text-3xl mb-4">🏷️</div>
              <h3 className="text-base font-semibold text-white mb-2">Real Category Matching</h3>
              <p className="text-sm leading-6 text-white/60">
                AI picks from Blackbox&apos;s actual category taxonomy. No guessing, no looking up codes. The right category every time.
              </p>
            </div>
            <div className="glass-card p-7 hover:border-violet-500/30 transition">
              <div className="text-3xl mb-4">📦</div>
              <h3 className="text-base font-semibold text-white mb-2">Bulk Generation</h3>
              <p className="text-sm leading-6 text-white/60">
                Process your entire batch at once, not one clip at a time. Upload 50 clips, come back to 50 finished metadata sets.
              </p>
            </div>
            <div className="glass-card p-7 hover:border-violet-500/30 transition">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="text-base font-semibold text-white mb-2">Review Before Export</h3>
              <p className="text-sm leading-6 text-white/60">
                Thumbnail preview, inline editing, keyword quality tools, and dedup finder. Nothing ships that you have not approved.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Other platforms */}
      <section className="border-t border-white/5 bg-transparent py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-xl font-bold text-white mb-3">
            Also works with other platforms
          </h2>
          <p className="text-white/60 mb-8 text-sm max-w-xl mx-auto">
            Blackbox is your focus, but your clips can sell everywhere. Each platform gets its own CSV format. No reformatting needed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {["Shutterstock", "Adobe Stock", "Pond5"].map((platform) => (
              <div
                key={platform}
                className="flex items-center gap-2 glass-card px-5 py-3 shadow-sm"
              >
                <span className="text-primary font-bold">✓</span>
                <span className="text-sm font-medium text-white">{platform}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Start free. Scale as you grow.</h2>
          <p className="text-white/60 mb-10 text-sm">
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
            <div className="glass-card p-6 text-center">
              <div className="text-sm font-semibold text-white">Free</div>
              <div className="mt-2 text-2xl font-bold text-white">$0</div>
              <div className="mt-1 text-xs text-white/60">3 clips per day</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-sm font-semibold text-white">Starter</div>
              <div className="mt-2 text-2xl font-bold text-white">$9<span className="text-sm font-normal text-white/60">/mo</span></div>
              <div className="mt-1 text-xs text-white/60">140 clips per month</div>
            </div>
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 text-center shadow-md shadow-primary/10">
              <div className="text-sm font-semibold text-white">Pro</div>
              <div className="mt-2 text-2xl font-bold text-primary">$19<span className="text-sm font-normal text-white/60">/mo</span></div>
              <div className="mt-1 text-xs text-white/60">320 clips per month</div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-white/5 bg-transparent py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to upload faster?
          </h2>
          <p className="mt-4 text-lg text-white/60">
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
          <p className="mt-4 text-xs text-white/60">No credit card required. Cancel any time.</p>
        </div>
      </section>

    </FlightDeckShell>
  );
}

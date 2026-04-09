import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";
import { ArcadeDemo } from "@/components/ArcadeDemo";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">

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
              href="/auth?mode=signup"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Sign In
            </Link>
            <Link
              href="/auth?mode=signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center md:py-28">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">
          Built for the Blackbox.global community
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          Stop spending hours on metadata.
          <br className="hidden sm:block" />
          <span className="text-primary"> Start selling.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Upload your clips, let AI generate titles, descriptions, and keywords from actual video frames, then review, edit, and export a platform-ready CSV in minutes.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/auth?mode=signup"
            className="rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            Start Free — No Credit Card
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-border px-7 py-3.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            See Pricing
          </Link>
        </div>
        {/* Platform trust strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Works with:</span>
          {["Blackbox.global", "Shutterstock", "Adobe Stock", "Pond5"].map((p) => (
            <span key={p} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {p}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Join stock footage contributors saving hours on every batch
        </p>

        {/* How it works */}
        <div className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
              📤
            </div>
            <div className="text-4xl font-bold text-primary/30">1</div>
            <h3 className="font-semibold text-foreground">Upload</h3>
            <p className="text-sm text-muted-foreground text-center">Add your clips — any size, single file or large batch</p>
          </div>
          <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-primary/40 bg-card p-6 shadow-md shadow-primary/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
              🤖
            </div>
            <div className="text-4xl font-bold text-primary/30">2</div>
            <h3 className="font-semibold text-foreground">AI Generates</h3>
            <p className="text-sm text-muted-foreground text-center">Advanced vision AI analyzes your footage and writes professional metadata</p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
              📋
            </div>
            <div className="text-4xl font-bold text-primary/30">3</div>
            <h3 className="font-semibold text-foreground">Export and Sell</h3>
            <p className="text-sm text-muted-foreground text-center">Review, edit inline, export the right CSV for your platform</p>
          </div>
        </div>
      </section>

      {/* Arcade Demo — lazy loaded on click to protect LCP */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              See ClipMeta in Action
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Watch how stock footage creators go from raw clips to platform-ready metadata in minutes.
            </p>
          </div>
          <ArcadeDemo />
        </div>
      </section>

      {/* Differentiators */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Built for contributors, not just anyone
            </h2>
            <p className="mt-3 text-muted-foreground">
              Generic AI tools don't know your platforms. ClipMeta does.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-7 shadow-sm hover:border-primary/30 transition">
              <div className="text-3xl mb-4">🎬</div>
              <h3 className="text-base font-semibold text-foreground mb-2">Video-first AI</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Actually watches your footage, not just the filename. GPT-4o analyzes real frames to write context-aware titles, descriptions, keywords, categories, and location.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7 shadow-sm hover:border-primary/30 transition">
              <div className="text-3xl mb-4">🏪</div>
              <h3 className="text-base font-semibold text-foreground mb-2">Platform-specific exports</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Blackbox.global, Shutterstock, Adobe Stock, Pond5. Right format, right column names, right keyword counts, every time. Blackbox CSV support that nobody else offers.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7 shadow-sm hover:border-primary/30 transition">
              <div className="text-3xl mb-4">📦</div>
              <h3 className="text-base font-semibold text-foreground mb-2">Clips roll over</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Unused clips carry into next month on paid plans (up to 2 months). No wasted budget when you have a slow week.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7 shadow-sm hover:border-primary/30 transition">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="text-base font-semibold text-foreground mb-2">Review before you export</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Thumbnail previews on every clip, inline editing, keyword dedup finder, quality scoring, and top keyword analysis. Nothing ships that you haven't approved.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7 shadow-sm hover:border-primary/30 transition">
              <div className="text-3xl mb-4">🆓</div>
              <h3 className="text-base font-semibold text-foreground mb-2">Actually free to start</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                3 clips per day free, no credit card required. Try it on real footage before you spend a dime. See the quality yourself.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-7 shadow-sm hover:border-primary/30 transition">
              <div className="text-3xl mb-4">🤝</div>
              <h3 className="text-base font-semibold text-foreground mb-2">Refer and earn</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Share ClipMeta with other contributors and earn free months. Refer 10 friends and get Pro free forever.
              </p>
            </div>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-7 shadow-sm hover:border-violet-500/50 transition col-span-full sm:col-span-2 lg:col-span-1">
              <div className="text-3xl mb-4">⚡</div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-semibold text-foreground">Direct FTP to Blackbox</h3>
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-400 uppercase tracking-wide">Exclusive</span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Upload once to ClipMeta, send directly to your Blackbox.global account via FTP. No FileZilla, no manual transfers. Your clips arrive ready to process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FTP Feature Spotlight */}
      <section className="py-20 border-t border-border bg-muted/20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-3xl">
                ⚡
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl font-bold text-foreground">Upload once. Send everywhere.</h2>
                  <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-400 uppercase tracking-wide">Exclusive</span>
                </div>
                <p className="text-muted-foreground leading-7 mb-6">
                  ClipMeta is the <strong className="text-foreground">only metadata tool</strong> that can send your clips directly to Blackbox.global via FTP. Upload your footage to ClipMeta once — AI generates the metadata, you review it, then hit one button to transfer everything straight to your Blackbox account. No FileZilla. No manual uploads. Just done.
                </p>
                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { step: "1", label: "Upload to ClipMeta", desc: "Clips go into ClipMeta storage once" },
                    { step: "2", label: "AI writes metadata", desc: "Titles, keywords, descriptions — reviewed and ready" },
                    { step: "3", label: "Send to Blackbox", desc: "One click FTP transfer, clips appear in your Workspace" },
                  ].map(({ step, label, desc }) => (
                    <div key={step} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                      <div className="text-2xl font-bold text-violet-500/40 mb-1">{step}</div>
                      <div className="text-sm font-semibold text-foreground">{label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                    </div>
                  ))}
                </div>
                <a href="/auth?mode=signup" className="inline-block rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 shadow-lg shadow-violet-500/20">
                  Try It Free — No Credit Card
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform logos */}
      <section className="border-t border-border py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Export ready for your platforms
          </h2>
          <p className="text-sm text-muted-foreground mb-10">
            The right CSV format for each marketplace, out of the box
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { name: "Blackbox.global", note: "Direct CSV" },
              { name: "Shutterstock", note: "" },
              { name: "Adobe Stock", note: "" },
              { name: "Pond5", note: "" },
            ].map(({ name, note }) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 shadow-sm"
              >
                <span className="text-primary font-bold text-lg">✓</span>
                <span className="text-sm font-medium text-foreground">{name}</span>
                {note && (
                  <span className="text-xs text-primary bg-primary/10 rounded-full px-2 py-0.5">{note}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blackbox.global Spotlight */}
      <section className="py-20 border-t border-border">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="inline-block rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-sm font-medium text-violet-400 mb-6">
            Exclusive
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for Blackbox.global contributors
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Export your metadata in Blackbox&apos;s exact CSV format. Right columns, right categories, ready to upload. No more reformatting spreadsheets.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border bg-card p-6 text-left">
              <div className="text-2xl mb-3">📋</div>
              <h3 className="text-sm font-semibold text-foreground">Exact CSV Format</h3>
              <p className="mt-2 text-sm text-muted-foreground">Filename, title, description, keywords, category. Matches Blackbox&apos;s import template perfectly.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-left">
              <div className="text-2xl mb-3">🏷️</div>
              <h3 className="text-sm font-semibold text-foreground">Real Categories</h3>
              <p className="mt-2 text-sm text-muted-foreground">AI picks from Blackbox&apos;s actual category list. No more guessing or looking up category codes.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-left">
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="text-sm font-semibold text-foreground">Upload Ready</h3>
              <p className="mt-2 text-sm text-muted-foreground">Download the CSV, upload to Blackbox. Done. The whole process takes minutes, not hours.</p>
            </div>
          </div>
          <div className="mt-8">
            <a href="/auth?mode=signup" className="inline-block rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 shadow-lg shadow-primary/25">
              Try It Free with Blackbox
            </a>
            <p className="mt-3 text-xs text-muted-foreground">3 clips free every day. No credit card required.</p>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Simple pricing</h2>
          <p className="text-muted-foreground mb-10 text-sm">
            Pay-as-you-go credits and annual plans also available.{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              View full pricing
            </Link>
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-2xl mx-auto">
            {[
              { name: "Free", price: "3 clips/day", highlight: false },
              { name: "Starter", price: "$9/mo", highlight: false },
              { name: "Pro", price: "$19/mo", highlight: true },
              { name: "Studio", price: "$49/mo", highlight: false },
            ].map(({ name, price, highlight }) => (
              <div
                key={name}
                className={`rounded-xl border p-5 text-center transition ${
                  highlight
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="text-sm font-semibold text-foreground">{name}</div>
                <div className={`mt-1 text-lg font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
                  {price}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/auth?mode=signup"
              className="inline-block rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Start Free — No Credit Card
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section - AEO */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Frequently Asked Questions</h2>
            <p className="mt-3 text-muted-foreground">Everything you need to know about ClipMeta</p>
          </div>
          <div className="space-y-4">
            {[
              { q: "What is ClipMeta?", a: "ClipMeta is an AI-powered metadata workflow tool for stock footage contributors. You upload video clips, our AI analyzes actual video frames using GPT-4o, and generates titles, descriptions, keywords, and categories. You review, edit inline, and export a platform-ready CSV." },
              { q: "Which stock footage platforms does ClipMeta support?", a: "ClipMeta supports Blackbox.global, Shutterstock, Adobe Stock, and Pond5 with platform-specific CSV export formats. Each export matches the exact column names, keyword counts, and formatting required by each platform." },
              { q: "How accurate is the AI-generated metadata?", a: "ClipMeta uses GPT-4o to analyze actual video frames from your clips — not just the filename. This produces highly contextual metadata. You always review and edit before exporting, so you stay in control of quality." },
              { q: "Is there a free plan?", a: "Yes. The free plan includes 3 clips per day with no credit card required. Paid plans start at $9/month for Starter (100 clips/month), $19/month for Pro (300 clips/month), and $49/month for Studio (1000 clips/month). All paid plans include a 7-day free trial." },
              { q: "Do unused clips roll over?", a: "Yes, on paid plans unused clips carry forward up to 2 months. If you have a slow week, you don't lose your budget." },
              { q: "Does ClipMeta support Blackbox.global?", a: "Yes — ClipMeta is the only metadata tool with native Blackbox.global CSV support. The export matches Blackbox's exact import template including the correct category taxonomy, column order, and formatting." },
              { q: "How does ClipMeta handle my video files?", a: "Your video clips are uploaded to secure Cloudflare R2 storage. After metadata generation, the source video is automatically deleted to protect your content and minimize storage costs. Only metadata and thumbnails are retained." },
              { q: "Can I edit the metadata before exporting?", a: "Yes. ClipMeta has a full review interface where you can edit titles, descriptions, and keywords inline, add or remove keywords, check for duplicates, and see quality scores before you export anything." },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-border bg-card p-6 cursor-pointer">
                <summary className="flex items-center justify-between font-semibold text-foreground list-none select-none">
                  {q}
                  <span className="ml-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 flex-shrink-0">▾</span>
                </summary>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "What is ClipMeta?", "acceptedAnswer": { "@type": "Answer", "text": "ClipMeta is an AI-powered metadata workflow tool for stock footage contributors. You upload video clips, our AI analyzes actual video frames using GPT-4o, and generates titles, descriptions, keywords, and categories. You review, edit inline, and export a platform-ready CSV." }},
              { "@type": "Question", "name": "Which stock footage platforms does ClipMeta support?", "acceptedAnswer": { "@type": "Answer", "text": "ClipMeta supports Blackbox.global, Shutterstock, Adobe Stock, and Pond5 with platform-specific CSV export formats. Each export matches the exact column names, keyword counts, and formatting required by each platform." }},
              { "@type": "Question", "name": "How accurate is the AI-generated metadata?", "acceptedAnswer": { "@type": "Answer", "text": "ClipMeta uses GPT-4o to analyze actual video frames from your clips — not just the filename. This produces highly contextual metadata. You always review and edit before exporting, so you stay in control of quality." }},
              { "@type": "Question", "name": "Is there a free plan?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The free plan includes 3 clips per day with no credit card required. Paid plans start at $9/month for Starter (100 clips/month), $19/month for Pro (300 clips/month), and $49/month for Studio (1000 clips/month). All paid plans include a 7-day free trial." }},
              { "@type": "Question", "name": "Do unused clips roll over?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, on paid plans unused clips carry forward up to 2 months. If you have a slow week, you don't lose your budget." }},
              { "@type": "Question", "name": "Does ClipMeta support Blackbox.global?", "acceptedAnswer": { "@type": "Answer", "text": "Yes — ClipMeta is the only metadata tool with native Blackbox.global CSV support. The export matches Blackbox's exact import template including the correct category taxonomy, column order, and formatting." }},
              { "@type": "Question", "name": "How does ClipMeta handle my video files?", "acceptedAnswer": { "@type": "Answer", "text": "Your video clips are uploaded to secure Cloudflare R2 storage. After metadata generation, the source video is automatically deleted to protect your content and minimize storage costs. Only metadata and thumbnails are retained." }},
              { "@type": "Question", "name": "Can I edit the metadata before exporting?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. ClipMeta has a full review interface where you can edit titles, descriptions, and keywords inline, add or remove keywords, check for duplicates, and see quality scores before you export anything." }},
            ]
          })}}
        />
      </section>

      <EmailCapture source="homepage" headline="Stay in the loop" />

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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              "name": "ClipMeta",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "url": "https://clipmeta.app",
              "description": "AI-powered metadata workflow tool for stock footage contributors. Generate titles, descriptions, and keywords from video frames. Export platform-ready CSVs for Blackbox.global, Shutterstock, Adobe Stock, and Pond5.",
              "offers": [
                { "@type": "Offer", "price": "0", "priceCurrency": "USD", "name": "Free Plan — 3 clips/day" },
                { "@type": "Offer", "price": "9", "priceCurrency": "USD", "billingIncrement": "monthly", "name": "Starter — 100 clips/month" },
                { "@type": "Offer", "price": "19", "priceCurrency": "USD", "billingIncrement": "monthly", "name": "Pro — 300 clips/month" },
                { "@type": "Offer", "price": "49", "priceCurrency": "USD", "billingIncrement": "monthly", "name": "Studio — 1000 clips/month" }
              ]
            },
            {
              "@type": "Organization",
              "name": "ClipMeta",
              "url": "https://clipmeta.app",
              "logo": "https://clipmeta.app/logo-full.png",
              "contactPoint": { "@type": "ContactPoint", "email": "hello@clipmeta.app", "contactType": "customer support" }
            },
            {
              "@type": "WebSite",
              "name": "ClipMeta",
              "url": "https://clipmeta.app"
            }
          ]
        })}}
      />
    </main>
  );
}
